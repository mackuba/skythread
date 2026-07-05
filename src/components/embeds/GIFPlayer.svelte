<script lang="ts">
  import { truncateText } from '../../utils.js';

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

{#if !showsPlaceholder}
  <div class="gif">
    <button class="gif-toggle" type="button" aria-label={paused ? 'Play GIF' : 'Pause GIF'} {onclick}>
      <img src={paused ? staticURL : gifURL}
        class={paused ? 'static' : ''}
        alt={title ? `GIF: ${title}` : "GIF animation"}
        {onload}
        style:opacity={loaded ? 1 : 0}
        style:max-width="{maxWidth}px"
        style:max-height="{maxHeight}px">
    </button>
  </div>
{:else}
  <button class="gif-card" type="button" onclick={showGIF}>
    <div>
      <h2>{title}</h2>

      {#if description}
        <p class="description">{truncateText(description, 300)}</p>
      {/if}
    </div>
  </button>
{/if}

<style>
  .gif-toggle {
    appearance: none;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
  }

  .gif-card {
    appearance: none;
    text-align: left;
    display: block;
    background: none;
    border: 0;
    padding: 0;
    max-width: 500px;
    margin-bottom: 12px;
    cursor: pointer;
  }

  .gif-card > div {
    background-color: #fcfcfd;
    border: 1px solid #d8d8d8;
    border-radius: 8px;
    padding: 11px 15px;
  }

  .gif-card:hover > div {
    background-color: #f6f7f8;
    border: 1px solid #c8c8c8;
  }

  .gif-card > div:not(:has(p.description)) {
    padding-bottom: 14px;
  }

  .gif-card h2 {
    color: #333;
    font-size: 12pt;
    margin-top: 0;
    margin-bottom: 0;
  }

  .gif-card p.description {
    color: #666;
    font-size: 11pt;
    margin-top: 8px;
    margin-bottom: 4px;
    line-height: 135%;
    white-space: pre-line;
  }

  .gif img {
    user-select: none;
    -webkit-user-select: none;
  }

  .gif img.static {
    opacity: 0.75;
  }

  @media (prefers-color-scheme: dark) {
    .gif-card > div {
      background-color: #303030;
      border-color: #606060;
    }

    .gif-card:hover > div {
      background-color: #383838;
      border-color: #707070;
    }

    .gif-card h2 {
      color: #ccc;
    }

    .gif-card p.description {
      color: #888;
    }
  }
</style>
