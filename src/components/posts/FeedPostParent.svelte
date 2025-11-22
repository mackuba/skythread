<script>
  import { linkToPostById } from '../../router.js';
  import { atURI } from '../../utils.js';

  let { uri } = $props();
  let { repo, rkey } = $derived(atURI(uri));
</script>

<p class="back">
  <i class="fa-solid fa-reply"></i>
  <a href="{linkToPostById(repo, rkey)}">
    {#if accountAPI && repo == accountAPI.user.did}
      Reply to you
    {:else}
      {#await api.fetchHandleForDid(repo)}
        Reply
      {:then handle}
        Reply to @{handle}
      {:catch error}
        Reply to {repo}
      {/await}
    {/if}
  </a>
</p>
