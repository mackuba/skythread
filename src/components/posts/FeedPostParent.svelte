<script lang="ts">
  import { accountAPI, api } from '../../api.js';
  import { linkToPostById } from '../../router.js';
  import { atURI } from '../../utils.js';

  let { uri }: { uri: string } = $props();
  let { repo, rkey } = $derived(atURI(uri));
</script>

<p class="back">
  <i class="fa-solid fa-reply"></i>

  {#if accountAPI && repo == accountAPI.user.did}
    <a href="{linkToPostById(repo, rkey)}">Reply to you</a>
  {:else}
    {#await api.fetchHandleForDid(repo)}
      <a href="{linkToPostById(repo, rkey)}">Reply</a>
    {:then handle}
      <a href="{linkToPostById(handle, rkey)}">Reply to @{handle}</a>
    {:catch error}
      <a href="{linkToPostById(repo, rkey)}">Reply to {repo}</a>
    {/await}
  {/if}
</p>
