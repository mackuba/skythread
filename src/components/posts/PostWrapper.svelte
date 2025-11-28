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

  let { post, context }: { post: AnyPost, context: PostContext } = $props();
</script>

{#if post instanceof Post}
  <PostComponent {post} {context} />
{:else}
  <div class="post post-{context} blocked">
    {#if post instanceof BlockedPost}
      <BlockedPostView {post} {context} reason="Blocked post" />
    {:else if post instanceof DetachedQuotePost}
      <BlockedPostView {post} {context} reason="Hidden quote" />
    {:else}
      <MissingPostView {post} />
    {/if}
  </div>
{/if}
