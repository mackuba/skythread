<script lang="ts">
  let { url }: { url: string } = $props();

  let hostname = $derived(new URL(url).hostname);
</script>

<a class="fedi-link" href={url} target="_blank">
  <div>
    <i class="fa-solid fa-arrow-up-right-from-square fa-sm"></i> View on {hostname}
  </div>
</a>
