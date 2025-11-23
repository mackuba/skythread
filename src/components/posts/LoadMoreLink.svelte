<script>
  import { parseThreadPost } from '../../models/posts.js';
  import { linkToPostThread } from '../../router.js';
  import { getContext } from 'svelte';

  let { onLoad, onError } = $props();
  let { post } = getContext('post');
  let loading = $state(false);

  async function onLinkClick(e) {
    e.preventDefault();
    loading = true;

    try {
      let json = await api.loadThreadByAtURI(post.uri);
      let root = parseThreadPost(json.thread, post.pageRoot, 0, post.absoluteLevel);

      loading = false;
      window.subtreeRoot = root;
      onLoad(root);
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
