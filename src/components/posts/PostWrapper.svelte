<script lang="ts">
  import { Post, BlockedPost, DetachedQuotePost } from '../../models/posts.js';

  import BlockedPostView from './BlockedPostView.svelte';
  import MissingPostView from './MissingPostView.svelte';
  import PostComponent from './PostComponent.svelte';

  /**
    Contexts:
    - thread - a post in the thread tree
    - parent - parent reference above the thread root
    - quote - a quote embed
    - quotes - a post on the quotes page
    - feed - a post on the hashtag feed page
  */

  let { post, placement }: { post: AnyPost, placement: PostPlacement } = $props();
</script>

{#if post instanceof Post}
  <PostComponent {post} {placement} />
{:else}
  <div class="post post-{placement} blocked">
    {#if post instanceof BlockedPost}
      <BlockedPostView {post} {placement} reason="Blocked post" />
    {:else if post instanceof DetachedQuotePost}
      <BlockedPostView {post} {placement} reason="Hidden quote" />
    {:else}
      <MissingPostView {post} />
    {/if}
  </div>
{/if}
