<script>
  import { Post, BlockedPost, MissingPost } from '../../models/posts.js';
  import PostComponent from './PostComponent.svelte';
  import { linkToPostThread } from '../../router.js';

  let { post } = $props();
</script>

{#if post instanceof BlockedPost}
  <PostComponent {post} context="parent" replaceClass="back" />

  <!-- TODO
    let span = $(element.querySelector('p.blocked-header span'));
    span.innerText = 'Parent post blocked';
    -->

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
