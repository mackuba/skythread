<script lang="ts">
  import { api } from '../../api.js';
  import { linkToPostById } from '../../router.js';
  import { atURI } from '../../utils.js';

  let { uri }: { uri: string } = $props();
  let { repo, rkey } = $derived(atURI(uri));
</script>

<p class="back">
  <i class="fa-solid fa-reply"></i>

  {#await api.fetchHandleForDid(repo)}
    <a href="{linkToPostById(repo, rkey)}">See parent post</a>
  {:then handle}
    <a href="{linkToPostById(handle, rkey)}">See parent post (@{handle})</a>
  {:catch}
    <a href="{linkToPostById(repo, rkey)}">See parent post</a>
  {/await}
</p>
