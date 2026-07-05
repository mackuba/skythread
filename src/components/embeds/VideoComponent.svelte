<script lang="ts">
  import { getPostContext } from '../posts/PostComponent.svelte';
  import { InlineVideoEmbed, RawVideoEmbed } from '../../models/embeds';
  import { isValidURL } from '../../utils.js';

  let { embed }: { embed: InlineVideoEmbed | RawVideoEmbed } = $props();
  let { post } = getPostContext();

  function buildRawVideoURL(video: json): string {
    let cid = video.ref['$link'];
    return `https://video.bsky.app/watch/${post.author.did}/${cid}/playlist.m3u8`;
  }
</script>

<div>
  {#if embed instanceof RawVideoEmbed}
    {#if embed.video}
      <p>[<a href={buildRawVideoURL(embed.video)}>Video</a>]</p>
    {/if}
  {:else}
    {#if embed.playlistURL && isValidURL(embed.playlistURL)}
      <p>[<a href={embed.playlistURL}>Video</a>]</p>
    {:else}
      <p>[{embed.playlistURL}]</p>
    {/if}
  {/if}

  {#if embed.alt}
    <details class="image-alt">
      <summary>Show alt</summary>
      {embed.alt}
    </details>
  {/if}
</div>
