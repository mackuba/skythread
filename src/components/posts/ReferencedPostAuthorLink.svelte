<script lang="ts">
  import { getContext } from 'svelte';
  import { Post } from '../../models/posts.js';
  import { atURI } from '../../utils.js';

  let { status = undefined }: { status?: string | undefined } = $props();
  let { post }: { post: Post } = getContext('post');

  let handle: string | undefined = $state();

  $effect(() => {
    loadAuthorHandle(post);
  });

  async function loadAuthorHandle(post: Post) {
    let did = atURI(post.uri).repo;
    let loadedHandle = await api.fetchHandleForDid(did);

    if (post.author) {
      post.author.handle = loadedHandle;
    } else {
      post.author = { did: did, handle: loadedHandle };
    }

    handle = loadedHandle;
  }
</script>

{#if status}
  (<a href="{post.didLinkToAuthor}" target="_blank">{handle ?? 'see author'}</a>, {status})
{:else}
  (<a href="{post.didLinkToAuthor}" target="_blank">{handle ?? 'see author'}</a>)
{/if}
