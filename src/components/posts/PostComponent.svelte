<script module lang="ts">
  export const [getPostContext, setPostContext] = createContext<{ post: Post, placement: PostPlacement}>();
</script>

<script lang="ts">
  import { createContext } from 'svelte';
  import { HiddenRepliesError } from '../../api.js';
  import { settings } from '../../models/settings.svelte.js';
  import { Post, BlockedPost } from '../../models/posts.js';
  import { Embed, InlineLinkEmbed } from '../../models/embeds.js';
  import { isValidURL, showError } from '../../utils.js';

  import EdgeMargin from './EdgeMargin.svelte';
  import FediSourceLink from './FediSourceLink.svelte';
  import HiddenRepliesLink from './HiddenRepliesLink.svelte';
  import LoadMoreLink from './LoadMoreLink.svelte';
  import PostBody from './PostBody.svelte';
  import PostComponent from './PostComponent.svelte';
  import PostHeader from './PostHeader.svelte';
  import PostTagsRow from './PostTagsRow.svelte';
  import PostFooter from './PostFooter.svelte';
  import PostWrapper from './PostWrapper.svelte';

  import EmbedComponent from '../embeds/EmbedComponent.svelte';

  /**
    Contexts:
    - thread - a post in the thread tree
    - parent - parent reference above the thread root
    - quote - a quote embed
    - quotes - a post on the quotes page
    - feed - a post on the hashtag feed page
  */

  type Props = {
    post: Post,
    placement: PostPlacement,
    highlightedMatches?: string[] | undefined,
    class?: string | undefined
  }

  let { post, placement, highlightedMatches = undefined, ...props }: Props = $props();

  let collapsed = $state(false);
  let replies: AnyPost[] = $state(post.replies);
  let repliesLoaded = $state(false);
  let missingHiddenReplies: number | undefined = $state();
  let hiddenRepliesError: Error | undefined = $state();

  setPostContext({ post, placement });

  // TODO: make Post reactive
  let quoteCount: number | undefined = $state(post.quoteCount);

  export function setQuoteCount(x: number) {
    quoteCount = x;
  }

  function shouldRenderReply(reply: AnyPost): boolean {
    if (reply instanceof Post) {
      return true;
    } else if (reply instanceof BlockedPost) {
      return (settings.biohazardsEnabled !== false);
    } else {
      return false;
    }
  }

  function shouldRenderEmbed(embed: Embed): boolean {
    if (post.originalFediURL) {
      if (embed instanceof InlineLinkEmbed && embed.title?.startsWith('Original post on ')) {
        return false;
      }
    }

    return true;
  }

  function onMoreRepliesLoaded(newPost: Post) {
    replies = post.replies = newPost.replies;
    repliesLoaded = true;
    // TODO: more replies turning into hidden replies
  }

  function onHiddenRepliesLoaded(newReplies: (AnyPost | null)[]) {
    let okReplies = newReplies.filter(x => x !== null);
    replies.push(...okReplies);
    post.replies = replies;

    if (okReplies.length === newReplies.length && okReplies.length > 0) {
      missingHiddenReplies = undefined;
    } else {
      missingHiddenReplies = newReplies.length - okReplies.length;
    }

    repliesLoaded = true;
  }

  function onRepliesLoadingError(error: Error) {
    repliesLoaded = true;

    if (error instanceof HiddenRepliesError) {
      hiddenRepliesError = error;
    } else {
      setTimeout(() => showError(error), 1);
    }
  }
</script>

{#snippet body()}
  <PostBody {highlightedMatches} />

  {#if post.tags}
    <PostTagsRow />
  {/if}

  {#if post.embed && shouldRenderEmbed(post.embed)}
    <EmbedComponent embed={post.embed} />
  {/if}

  {#if post.originalFediURL && isValidURL(post.originalFediURL)}
    <FediSourceLink url={post.originalFediURL} />
  {/if}

  {#if post.likeCount !== undefined || post.repostCount !== undefined}
    <PostFooter {quoteCount} />
  {/if}
{/snippet}

<div class="post post-{placement} {props.class || ''}" class:muted={post.muted} class:collapsed={collapsed}>
  <PostHeader />

  {#if placement == 'thread' && !post.isPageRoot}
    <EdgeMargin bind:collapsed />
  {/if}

  <div class="content">
    {#if post.muted}
      <details>
        <summary>{post.muteList ? `Muted (${post.muteList})` : 'Muted - click to show'}</summary>

        {@render body()}
      </details>
    {:else}
      {@render body()}
    {/if}

    {#if post.replyCount == 1 && (replies[0] instanceof Post) && replies[0].author.did == post.author.did}
      <PostComponent post={replies[0]} placement="thread" class="flat" />
    {:else}
      {#each replies as reply (reply.uri)}
        {#if shouldRenderReply(reply)}
          <PostWrapper post={reply} placement="thread" />
        {/if}
      {/each}
    {/if}

    {#if placement == 'thread' && !repliesLoaded}
      {#if post.hasMoreReplies}
        <LoadMoreLink onLoad={onMoreRepliesLoaded} onError={onRepliesLoadingError} />
      {:else if post.hasHiddenReplies && settings.biohazardsEnabled !== false}
        <HiddenRepliesLink onLoad={onHiddenRepliesLoaded} onError={onRepliesLoadingError} />
      {/if}
    {/if}

    {#if missingHiddenReplies !== undefined}
      <p class="missing-replies-info">
        <i class="fa-solid fa-ban"></i>
        {#if missingHiddenReplies > 1}
          {missingHiddenReplies} replies are missing
        {:else if missingHiddenReplies == 1}
          1 reply is missing
        {:else}
          Some replies are missing
        {/if}
        (likely taken down by moderation)
      </p>
    {/if}

    {#if hiddenRepliesError}
      <p class="missing-replies-info">
        <i class="fa-solid fa-ban"></i> Hidden replies not available (post too old)
      </p>
    {/if}
  </div>
</div>

<style>
  .post {
    position: relative;
    padding-left: 21px;
    margin-top: 30px;
  }

  .post.collapsed .content {
    display: none;
  }

  .post.flat {
    padding-left: 0px;
    margin-top: 25px;
  }

  .post.muted > :global(h2) {
    opacity: 0.3;
    font-weight: 600;
  }

  .post.muted > :global(.content > details > p), .post.muted > :global(.content > details summary) {
    opacity: 0.3;
  }

  details {
    margin-top: 12px;
    margin-bottom: 10px;
  }

  summary {
    font-size: 10pt;
    user-select: none;
    -webkit-user-select: none;
    cursor: default;
  }

  .missing-replies-info {
    font-size: 11pt;
    color: darkred;
    margin-top: 25px;
  }

  .post :global(img.loader) {
    width: 24px;
    animation: rotation 3s infinite linear;
    margin-top: 5px;
  }
</style>
