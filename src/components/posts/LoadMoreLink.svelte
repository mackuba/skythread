<script lang="ts">
  import { api } from '../../api.js';
  import { Post, parseThreadPost } from '../../models/posts.js';
  import { linkToPostThread } from '../../router.js';
  import { getPostContext } from './PostComponent.svelte';

  type Props = {
    onLoad: (root: Post) => void,
    onError: (error: Error) => void
  }

  let { onLoad, onError }: Props = $props();
  let { post } = getPostContext();
  let loading = $state(false);

  async function onLinkClick(e: Event) {
    e.preventDefault();
    loading = true;

    try {
      let json = await api.loadThreadByAtURI(post.uri);
      let root = parseThreadPost(json.thread, post.pageRoot, 0, post.absoluteLevel);

      loading = false;
      window.subtreeRoot = root;
      onLoad(root as Post); // TODO
    } catch (error) {
      loading = false;
      onError(error);
    }
  }
</script>

<p>
  {#if !loading}
    <a href={linkToPostThread(post)} onclick={onLinkClick}>Load more replies…</a>
  {:else}
    <img class="loader" src="icons/sunny.png" alt="Loading...">
  {/if}
</p>
