<script lang="ts">
  import { Post, BlockedPost, MissingPost } from '../../models/posts.js';
  import { linkToPostThread } from '../../router.js';
  import BlockedPostView from './BlockedPostView.svelte';

  let { post }: { post: AnyPost } = $props();
</script>

{#if post instanceof BlockedPost}
  <div class="back">
    <BlockedPostView {post} context="parent" reason="Parent post blocked" />
  </div>
{:else if post instanceof MissingPost}
  <p class="back">
    <i class="fa-solid fa-ban"></i> parent post has been deleted
  </p>
{:else}
  <p class="back">
    <i class="fa-solid fa-reply"></i>
    <a href={linkToPostThread(post)}>See parent post (@{post.author.handle})</a>
  </p>
{/if}
