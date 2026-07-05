<script lang="ts">
  import { getPostContext } from '../posts/PostComponent.svelte';
  import { InlineGalleryEmbed, InlineImageEmbed, RawGalleryEmbed, RawImageEmbed } from '../../models/embeds';
  import { isValidURL } from '../../utils.js';

  let { embed }: { embed: InlineImageEmbed | RawImageEmbed | InlineGalleryEmbed | RawGalleryEmbed } = $props();
  let { post } = getPostContext();

  let rawMode = $derived(embed instanceof RawImageEmbed || embed instanceof RawGalleryEmbed);

  function buildRawImageURL(img: json): string {
    let cid = img.image.ref['$link'];
    return `https://cdn.bsky.app/img/feed_fullsize/plain/${post.author.did}/${cid}@jpeg`;
  }
</script>

<div>
  {#each embed.images as image}
    {#if rawMode}
      <p>[<a href={buildRawImageURL(image)}>Image</a>]</p>
    {:else}
      {#if isValidURL(image.fullsize)}
        <p>[<a href={image.fullsize}>Image</a>]</p>
      {:else}
        <p>[{image.fullsize}]</p>
      {/if}
    {/if}

    {#if image.alt}
      <details class="image-alt">
        <summary>Show alt</summary>
        {image.alt}
      </details>
    {/if}
  {/each}
</div>

<style>
  .image-alt {
    font-size: 11pt;
    color: #666;
    margin-bottom: 20px;
  }

  .image-alt summary {
    font-size: 11pt;
    color: #666;
    margin-bottom: 5px;
    user-select: none;
    -webkit-user-select: none;
    cursor: default;
  }

  @media (prefers-color-scheme: dark) {
    .image-alt, .image-alt summary { color: #999; }
  }
</style>
