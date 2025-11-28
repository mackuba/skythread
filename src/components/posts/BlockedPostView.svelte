<script lang="ts">
  import { account } from '../../models/account.svelte.js';
  import { BlockedPost, DetachedQuotePost, MissingPost, Post } from '../../models/posts.js';

  import BlockedPostContent from './BlockedPostContent.svelte';
  import MissingPostView from './MissingPostView.svelte';
  import PostSubtreeLink from './PostSubtreeLink.svelte';
  import ReferencedPostAuthorLink from './ReferencedPostAuthorLink.svelte';

  type Props = {
    reason: string;
    post: BlockedPost | DetachedQuotePost;
    placement: PostPlacement;
  }

  let { reason, post, placement }: Props = $props();

  let biohazardEnabled = $derived(account.biohazardEnabled !== false);
  let loading = $state(false);
  let postNotFound = $state(false);
  let reloadedPost: Post | undefined = $state();

  async function loadPost(e: Event) {
    e.preventDefault();
    loading = true;

    let result = await api.reloadBlockedPost(post.uri);

    if (result) {
      reloadedPost = result;
    } else {
      postNotFound = true;
    }
  }

  function blockStatus() {
    if (post instanceof DetachedQuotePost) {
      return undefined;
    } else if (post.blockedByUser) {
      return "has blocked you";
    } else if (post.blocksUser) {
      return "you've blocked them";
    } else {
      return undefined;
    }
  }
</script>

{#if !postNotFound && !reloadedPost}
  <p class="blocked-header">
    <i class="fa-solid fa-ban"></i> <span>{reason}</span>

    {#if biohazardEnabled}
      <ReferencedPostAuthorLink {post} status={blockStatus()} />
    {/if}
  </p>

  {#if biohazardEnabled}
    <p class="load-post">
      {#if !loading}
        <a href="#" onclick={loadPost}>Load post…</a>
      {:else}
        &nbsp;
      {/if}
    </p>
  {/if}
{:else if reloadedPost}
  <p class="blocked-header">
    <i class="fa-solid fa-ban"></i> <span>{reason}</span>

    <ReferencedPostAuthorLink {post} status={blockStatus()} />

    {#if !(reloadedPost.author.viewer.blockedBy || reloadedPost.author.viewer.blocking)}
      <span class="separator">&bull;</span>

      <PostSubtreeLink post={reloadedPost} title="Load thread" />
    {/if}
  </p>

  <BlockedPostContent post={reloadedPost} {placement} />
{:else}
  <MissingPostView post={new MissingPost(post.data)} />
{/if}
