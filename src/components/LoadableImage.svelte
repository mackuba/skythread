<script lang="ts">
  let { loading, error, ...props } = $props();
  let imageState: string | undefined = $state();

  function onload() {
    imageState = 'loaded';
  }

  function onerror() {
    imageState = 'error';
  }
</script>

{#if !imageState}
  {@render loading()}
  <img {...props} style="display: none" {onload} {onerror}>
{:else if imageState == 'loaded'}
  <img {...props}>
{:else}
  {@render error()}
{/if}
