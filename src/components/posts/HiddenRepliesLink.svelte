<script lang="ts">
  import { api } from '../../api.js';
  import { showBiohazardDialog } from '../Dialogs.svelte';
  import { settings } from '../../models/settings.svelte.js';
  import { parseThreadPost } from '../../models/posts.js';
  import { linkToPostThread } from '../../router.js';
  import { getPostContext } from './PostComponent.svelte';

  type Props = {
    onLoad: (posts: (AnyPost | null)[]) => void,
    onError: (error: Error) => void
  }

  let { onLoad, onError }: Props = $props();
  let { post } = getPostContext();
  let loading = $state(false);

  function onLinkClick(e: Event) {
    e.preventDefault();

    if (settings.biohazardsEnabled === true) {
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
