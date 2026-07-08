<script module lang="ts">
  export const [getPostContext, setPostContext] = createContext<{ post: Post, placement: PostPlacement}>();
</script>

<script lang="ts">
  import { createContext } from 'svelte';
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
  let missingHiddenReplies: [string, json][] | undefined = $state();

  setPostContext({ post, placement });

  // TODO: make Post reactive
  let quoteCount: number | undefined = $state(post.quoteCount ?? undefined);

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
    post.updateDataFromPost(newPost);
    replies = post.replies;
  }

  function onHiddenRepliesLoaded(newReplies: AnyPost[], missingData: [string, json][]) {
    replies.push(...newReplies);
    post.replies = replies;

    if (newReplies.length > 0 && missingData.length === 0) {
      // there were some hidden replies but we loaded them, everything is ok
      missingHiddenReplies = undefined;
    } else if (newReplies.length === 0 && missingData.length === 0) {
      // we didn't get any URIs at all, something is sus
      missingHiddenReplies = [];
    } else {
      // we got some info about the unavailable replies
      missingHiddenReplies = missingData;
    }

    repliesLoaded = true;
  }

  function missingReplyStatus(data: json) {
    if (data.profile) {
      return "account is active";
    } else if (data.pdsError) {
      return "PDS unavailable";
    } else if (data.active) {
      return "account active on its PDS";
    } else if (data.status == "takendown") {
      return "account taken down";
    } else {
      return `account ${data.status}`;
    }
  }

  function onRepliesLoadingError(error: Error) {
    showError(error);
  }
</script>

{#snippet body()}
  <PostBody {highlightedMatches} />

  {#if post.tags}
    <PostTagsRow />
  {/if}

  {#if post.hasBeenEdited}
    <details class="original-text">
      <summary>Edited – show original text:</summary>
      <p class="body original-body">{post.originalText}</p>
    </details>
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

  {#if post.labelledNeedsReview}
    <p class="needs-review">⚠️ account labelled &lsquo;needs-review&rsquo;</p>
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
      {#key replies}
        {#if post.hasMoreReplies}
          <LoadMoreLink onLoad={onMoreRepliesLoaded} onError={onRepliesLoadingError} />
        {:else if post.hasHiddenReplies && settings.biohazardsEnabled !== false}
          <HiddenRepliesLink onLoad={onHiddenRepliesLoaded} onError={onRepliesLoadingError} />
        {/if}
      {/key}
    {/if}

    {#if missingHiddenReplies !== undefined}
      {#if missingHiddenReplies.length > 0}
        <p class="missing-replies-info">
          <i class="fa-solid fa-ban"></i>
          {#if missingHiddenReplies.length > 1}
            {missingHiddenReplies.length} replies are unavailable:
          {:else if missingHiddenReplies.length == 1}
            1 reply is unavailable:
          {/if}
        </p>

        <ul class="missing-replies-links">
          {#each missingHiddenReplies as [uri, data]}
            <li>&ndash; from
              <a href="https://pdsls.dev/{uri}" target="_blank">{data.handle ? `@${data.handle}` : data.did}</a>
              ({missingReplyStatus(data)})</li>
          {/each}
        </ul>
      {:else}
        <p class="missing-replies-info">
          <i class="fa-solid fa-ban"></i> Some replies are missing (might be taken down by moderation)
        </p>
      {/if}
    {/if}
  </div>
</div>

<style>
  :global(.post) {
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

  .original-text {
    margin-top: 20px;
    margin-bottom: 20px;
  }

  .original-text summary {
    font-size: 11pt;
    color: #e06000;
  }

  .original-body {
    font-size: 11pt;
  }

  .missing-replies-info {
    font-size: 11pt;
    color: darkred;
    margin-top: 25px;
  }

  .missing-replies-links {
    padding-left: 10px;
    list-style-type: none;
    font-size: 11pt;
    color: #666;
  }

  .missing-replies-links li {
    margin-block: 5px;
  }

  .needs-review {
    font-size: 11pt;
    border: 1px solid #ff8888;
    display: inline-block;
    padding: 3px 4px;
    border-radius: 8px;
    background-color: rgba(255, 0, 0, 0.1);
    margin-bottom: 0;
  }

  .post :global(img.loader) {
    width: 24px;
    animation: rotation 3s infinite linear;
    margin-top: 5px;
  }
</style>
