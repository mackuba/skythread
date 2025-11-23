<script>
  import { showBiohazardDialog } from '../../skythread.js';
  import { account } from '../../models/account.svelte.js';
  import { parseThreadPost } from '../../models/posts.js';
  import { linkToPostThread } from '../../router.js';
  import { getContext } from 'svelte';

  let { onLoad, onError } = $props();
  let { post } = getContext('post');
  let loading = $state(false);

  function onLinkClick(e) {
    e.preventDefault();

    if (account.biohazardEnabled === true) {
      loadHiddenReplies();
    } else {
      showBiohazardDialog(() => {
        loadHiddenReplies();
      });
    }
  }

  async function loadHiddenReplies() {
    loading = true;

    try {
      let repliesData = await api.loadHiddenReplies(post);
      let replies = repliesData.map(x => x && parseThreadPost(x.thread, post.pageRoot, 1, post.absoluteLevel + 1));
      loading = false;
      onLoad(replies);
    } catch (error) {
      loading = false;
      onError(error);
    }
  }
</script>

<p class="hidden-replies">
  {#if !loading}
    ☣️ <a href={linkToPostThread(post)} onclick={onLinkClick}>Load hidden replies…</a>
  {:else}
    <img class="loader" src="icons/sunny.png" alt="Loading...">
  {/if}
</p>
