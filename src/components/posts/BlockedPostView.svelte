<script>
  import { getContext } from 'svelte';
  import { account } from '../../models/account.svelte.js';
  import ReferencedPostAuthorLink from './ReferencedPostAuthorLink.svelte';

  let { reason } = $props();
  let { post } = getContext('post');

  let biohazardEnabled = $derived(account.biohazardEnabled !== false);
  let loading = $state(false);

  function loadPost(e) {
    e.preventDefault();
    loading = true;
    // TODO this.loadBlockedPost(this.post.uri, div);
  }

  function blockStatus() {
    if (post.blockedByUser) {
      return "has blocked you";
    } else if (post.blocksUser) {
      return "you've blocked them";
    } else {
      return undefined;
    }
  }
</script>

<p class="blocked-header">
  <i class="fa-solid fa-ban"></i> <span>{reason}</span>

  {#if biohazardEnabled}
    <ReferencedPostAuthorLink status={blockStatus()} />
  {/if}
</p>

{#if biohazardEnabled}
  <p class="load-post">
    {#if !loading}
      <a href="#" onclick={loadPost}>Load post…</a>
    {:else}
      &nbsp;
    {/if}
  </p>
{/if}
