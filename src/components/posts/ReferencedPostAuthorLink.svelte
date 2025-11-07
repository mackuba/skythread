<script>
  import { getContext } from 'svelte';
  import { atURI } from '../../utils.js';

  let { status } = $props();
  let { post } = getContext('post');

  let handle = $state();

  $effect(async () => {
    let did = atURI(post.uri).repo;
    let loadedHandle = await api.fetchHandleForDid(did);

    if (post.author) {
      post.author.handle = loadedHandle;
    } else {
      post.author = { did: did, handle: loadedHandle };
    }

    handle = loadedHandle;
  });
</script>

{#if status}
  (<a href="{post.didLinkToAuthor}" target="_blank">{handle ?? 'see author'}</a>, {status})
{:else}
  (<a href="{post.didLinkToAuthor}" target="_blank">{handle ?? 'see author'}</a>)
{/if}
