<script>
  import { setContext } from 'svelte';
  import { HiddenRepliesError } from '../../api/api.js';
  import { account } from '../../models/account.svelte.js';
  import { Post, BlockedPost, DetachedQuotePost } from '../../models/posts.js';
  import { InlineLinkEmbed } from '../../models/embeds.js';
  import { isValidURL, showError } from '../../utils.js';

  import BlockedPostView from './BlockedPostView.svelte';
  import EdgeMargin from './EdgeMargin.svelte';
  import FediSourceLink from './FediSourceLink.svelte';
  import HiddenRepliesLink from './HiddenRepliesLink.svelte';
  import LoadMoreLink from './LoadMoreLink.svelte';
  import MissingPostView from './MissingPostView.svelte';
  import PostBody from './PostBody.svelte';
  import PostComponent from './PostComponent.svelte';
  import PostHeader from './PostHeader.svelte';
  import PostTagsRow from './PostTagsRow.svelte';
  import PostFooter from './PostFooter.svelte';

  import EmbedComponent from '../embeds/EmbedComponent.svelte';

  /**
    Contexts:
    - thread - a post in the thread tree
    - parent - parent reference above the thread root
    - quote - a quote embed
    - quotes - a post on the quotes page
    - feed - a post on the hashtag feed page
  */

  let { post, context, highlightedMatches = undefined, ...props } = $props();

  let collapsed = $state(false);
  let replies = $state(post.replies);
  let repliesLoaded = $state(false);
  let missingHiddenReplies = $state();
  let hiddenRepliesError = $state();

  setContext('post', { post, context });

  // TODO: make Post reactive
  let quoteCount = $state(post.quoteCount);

  export function setQuoteCount(x) {
    quoteCount = x;
  }

  function shouldRenderReply(reply) {
    if (reply instanceof Post) {
      return true;
    } else if (reply instanceof BlockedPost) {
      return (account.biohazardEnabled !== false);
    } else {
      return false;
    }
  }

  function shouldRenderEmbed(embed) {
    if (post.originalFediURL) {
      if (embed instanceof InlineLinkEmbed && embed.title && embed.title.startsWith('Original post on ')) {
        return false;
      }
    }

    return true;
  }

  function onMoreRepliesLoaded(newPost) {
    replies = post.replies = newPost.replies;
    repliesLoaded = true;
  }

  function onHiddenRepliesLoaded(newReplies) {
    let okReplies = newReplies.filter(x => x);
    replies.push(...okReplies);
    post.replies = replies;

    missingHiddenReplies = newReplies.length - okReplies.length;
    repliesLoaded = true;
  }

  function onRepliesLoadingError(error) {
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

{#if post instanceof Post}
  <div class="post post-{context} {props.class || ''}" class:muted={post.muted} class:collapsed={collapsed}>
    <PostHeader />

    {#if context == 'thread' && !post.isPageRoot}
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

      {#if post.replyCount == 1 && replies[0] && replies[0].author.did == post.author.did}
        <PostComponent post={replies[0]} context="thread" class="flat" />
      {:else}
        {#each replies as reply (reply.uri)}
          {#if shouldRenderReply(reply)}
            <PostComponent post={reply} context="thread" />
          {/if}
        {/each}
      {/if}

      {#if context == 'thread' && !repliesLoaded}
        {#if post.hasMoreReplies}
          <LoadMoreLink onLoad={onMoreRepliesLoaded} onError={onRepliesLoadingError} />
        {:else if post.hasHiddenReplies && account.biohazardEnabled !== false}
          <HiddenRepliesLink onLoad={onHiddenRepliesLoaded} onError={onRepliesLoadingError} />
        {/if}
      {/if}

      {#if missingHiddenReplies}
        <p class="missing-replies-info">
          <i class="fa-solid fa-ban"></i>
          {missingHiddenReplies > 1 ? `${missingHiddenReplies} replies are missing` : '1 reply is missing'}
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
{:else}
  <div class="post post-{context} blocked">
    {#if post instanceof BlockedPost}
      <BlockedPostView reason="Blocked post" />
    {:else if post instanceof DetachedQuotePost}
      <BlockedPostView reason="Hidden quote" />
    {:else}
      <MissingPostView />
    {/if}
  </div>
{/if}
