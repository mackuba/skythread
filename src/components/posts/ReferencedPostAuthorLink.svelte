<script lang="ts">
  import { api } from '../../api.js';
  import { atURI } from '../../utils.js';

  let { post, status = undefined }: { post: AnyPost, status?: string | undefined } = $props();

  let handle: string | undefined = $state();
  let handleText = $derived(handle ? `@${handle}` : 'see author');

  $effect(() => {
    let did = atURI(post.uri).repo;

    api.fetchHandleForDid(did).then(loadedHandle => {
      handle = loadedHandle;
    });
  });
</script>

{#if status}
  (<a href="{post.didLinkToAuthor}" target="_blank">{handleText}</a>, {status})
{:else}
  (<a href="{post.didLinkToAuthor}" target="_blank">{handleText}</a>)
{/if}
