<script lang="ts">
  let { gifURL, staticURL, alt }: { gifURL: string, staticURL: string, alt: string | undefined } = $props();

  let loaded = $state(false);
  let paused = $state(false);

  let maxWidth = $state(500);
  let maxHeight = $state(200);

  function onload(e: Event) {
    let img = e.target as HTMLImageElement;

    if (img.naturalWidth < img.naturalHeight) {
      maxWidth = 200;
      maxHeight = 400;
    }

    loaded = true;
  }

  function onclick() {
    paused = !paused;
  }
</script>

<div class="gif">
  <img src={paused ? staticURL : gifURL}
    class={paused ? 'static' : ''}
    alt={alt ? `Gif: ${alt}` : `Gif animation`}
    {onload}
    {onclick}
    style:opacity={loaded ? 1 : 0}
    style:max-width="{maxWidth}px"
    style:max-height="{maxHeight}px">
</div>

<style>
  .gif img {
    user-select: none;
    -webkit-user-select: none;
  }

  .gif img.static {
    opacity: 0.75;
  }
</style>
