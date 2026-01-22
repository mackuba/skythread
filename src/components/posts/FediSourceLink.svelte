<script lang="ts">
  let { url }: { url: string } = $props();

  let hostname = $derived(new URL(url).hostname);
</script>

<a class="fedi-link" href={url} target="_blank">
  <div>
    <i class="fa-solid fa-arrow-up-right-from-square fa-sm"></i> View on {hostname}
  </div>
</a>

<style>
  .fedi-link {
    display: inline-block;
    margin-bottom: 6px;
    margin-top: 2px;
  }

  .fedi-link:hover {
    text-decoration: none;
  }

  div {
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    padding: 5px 9px;
    color: #555;
    font-size: 10pt;
  }

  i {
    margin-right: 3px;
  }

  .fedi-link:hover div {
    background-color: #f6f7f8;
    border: 1px solid #c8c8c8;
  }

  @media (prefers-color-scheme: dark) {
    div {
      border-color: #606060;
      color: #909090;
    }

    .fedi-link:hover div {
      background-color: #444;
      border-color: #909090;
    }
  }
</style>
