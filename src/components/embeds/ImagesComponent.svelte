<script>
  import { getContext } from 'svelte';

  let { embed } = $props();
  let { post } = getContext('post');

  function imageURL(embed) {
    if (embed.fullsize) {
      return embed.fullsize;
    } else {
      let cid = embed.image.ref['$link'];
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
