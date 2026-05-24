<script lang="ts">
  import { api } from '../../api.js';
  import { showBiohazardDialog } from '../Dialogs.svelte';
  import { settings } from '../../models/settings.svelte.js';
  import { parseThreadPost } from '../../models/posts.js';
  import { linkToPostThread } from '../../router.js';
  import { getPostContext } from './PostComponent.svelte';
  import { atURI } from '../../utils.js';

  type Props = {
    onLoad: (posts: AnyPost[], missing: [string, json][]) => void,
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

  function threadsFromPromises(responses: PromiseSettledResult<json>[]): AnyPost[] {
    return responses.flatMap(r => {
      if (r.status == 'fulfilled') {
        let json = r.value;
        let subthread = parseThreadPost(json.thread, post.pageRoot, 1, post.absoluteLevel + 1);
        subthread.isHiddenReply = true;
        return [subthread];
      } else {
        return [];
      }
    });
  }

  async function loadHiddenReplies() {
    loading = true;

    try {
      let missingReplyURIs = await api.loadHiddenReplyURIs(post);

      let promises = missingReplyURIs.map(uri => api.loadThreadByAtURI(uri));
      let responses = await Promise.allSettled(promises);
      let replies = threadsFromPromises(responses);

      let unavailableURIs = missingReplyURIs.filter(x => !replies.find(r => r.uri == x));
      let unavailablePromises = unavailableURIs.map(uri => api.loadMiniDocWithStatus(atURI(uri).repo));
      let unavailableResponses = await Promise.all(unavailablePromises);

      loading = false;
      onLoad(replies, unavailableResponses.map((v, i) => [unavailableURIs[i], v]));
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

<style>
  .hidden-replies {
    margin-top: 20px;
    font-size: 11pt;
  }

  .hidden-replies a {
    font-size: 12pt;
    color: saddlebrown;
  }

  @media (prefers-color-scheme: dark) {
    .hidden-replies a {
      color: hsl(25, 80%, 35%);
    }
  }
</style>
