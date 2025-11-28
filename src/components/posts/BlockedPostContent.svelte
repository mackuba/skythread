<script lang="ts">
  import { setPostContext } from './PostComponent.svelte';
  import { Post } from '../../models/posts.js';

  import EmbedComponent from '../embeds/EmbedComponent.svelte';
  import PostBody from './PostBody.svelte';
  import ThreadRootParentRaw from './ThreadRootParentRaw.svelte';

  let { post, placement }: { post: Post, placement: PostPlacement } = $props();

  setPostContext({ post, placement });
</script>

{#if post.isPageRoot && post.parentReference}
  <ThreadRootParentRaw uri={post.parentReference.uri} />
{/if}

<PostBody />

{#if post.embed}
  <EmbedComponent embed={post.embed} />
  <!-- TODO: what embeds to show? -->
{/if}
