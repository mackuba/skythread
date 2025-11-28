<script lang="ts">
  import { getPostContext } from '../posts/PostComponent.svelte';
  import { InlineImageEmbed, RawImageEmbed } from '../../models/embeds';

  let { embed }: { embed: InlineImageEmbed | RawImageEmbed } = $props();
  let { post } = getPostContext();

  function imageURL(img: json): string {
    if (img.fullsize) {
      return img.fullsize;
    } else {
      let cid = img.image.ref['$link'];
      return `https://cdn.bsky.app/img/feed_fullsize/plain/${post.author.did}/${cid}@jpeg`;
    }
  }
</script>

<div>
  {#each embed.images as image}
    <p>[<a href={imageURL(image)}>Image</a>]</p>

    {#if image.alt}
      <details class="image-alt">
        <summary>Show alt</summary>
        {image.alt}
      </details>
    {/if}
  {/each}
</div>
