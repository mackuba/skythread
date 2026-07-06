<script lang="ts">
  type Props = {
    gifURL: string;
    staticURL: string;
    title: string | undefined;
    description: string | undefined;
  };

  let { gifURL, staticURL, title, description }: Props = $props();

  let showsPlaceholder = $state(true);
  let loaded = $state(false);
  let paused = $state(false);

  let maxWidth = $state(500);
  let maxHeight = $state(200);

  let altText = $derived.by(() => {
    if (description && description.match(/^alt: /i) && description.slice(5) != title) {
      return description.slice(5);
    } else {
      return title;
    }
  });

  function showGIF() {
    showsPlaceholder = false;
  }

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

<div class="gif-player">
  {#if showsPlaceholder || !loaded}
    <button type="button" onclick={showGIF} class="placeholder {showsPlaceholder ? '' : 'loading'}">
      <h2>GIF</h2>
      <p class="alt">{altText}</p>
    </button>
  {/if}

  {#if !showsPlaceholder}
    <button type="button" class="gif-wrapper" class:loading={!loaded} {onclick}
      aria-label={paused ? 'Play GIF' : 'Pause GIF'}>

      <img src={paused ? staticURL : gifURL}
        class={paused ? 'static' : ''}
        alt={title ? `GIF: ${title}` : "GIF animation"}
        {onload}
        style:max-width="{maxWidth}px"
        style:max-height="{maxHeight}px">
    </button>
  {/if}
</div>

<style>
  .gif-player {
    position: relative;
  }

  .placeholder {
    appearance: none;
    display: block;
    width: 250px;
    padding: 25px 20px;
    min-height: 125px;
    margin-bottom: 12px;
    cursor: pointer;
    background-color: #fcfcfd;
    border: 1px solid #d8d8d8;
    border-radius: 8px;
  }

  .placeholder:hover {
    background-color: #f6f7f8;
    border: 1px solid #c8c8c8;
  }

  .placeholder.loading {
    visibility: hidden;
  }

  .placeholder h2 {
    color: #666;
    font-size: 11pt;
    margin-top: 0;
    margin-bottom: 0;
    font-weight: 600;
  }

  .placeholder p.alt {
    color: #666;
    font-size: 11pt;
    margin-top: 8px;
    margin-bottom: 4px;
    line-height: 135%;
    white-space: pre-line;
  }

  .gif-wrapper {
    appearance: none;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
  }

  .gif-wrapper.loading {
    position: absolute;
    opacity: 0;
  }

  .gif-wrapper img {
    user-select: none;
    -webkit-user-select: none;
  }

  .gif-wrapper img.static {
    opacity: 0.8;
  }

  @media (prefers-color-scheme: dark) {
    .placeholder {
      background-color: #303030;
      border-color: #606060;
    }

    .placeholder:hover {
      background-color: #383838;
      border-color: #707070;
    }

    .placeholder h2 {
      color: #bbb;
    }

    .placeholder p.alt {
      color: #888;
    }
  }
</style>
