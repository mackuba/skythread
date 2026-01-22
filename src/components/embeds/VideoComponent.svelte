<script lang="ts">
  import { getPostContext } from '../posts/PostComponent.svelte';
  import { InlineVideoEmbed, RawVideoEmbed } from '../../models/embeds';

  let { embed }: { embed: InlineVideoEmbed | RawVideoEmbed } = $props();
  let { post } = getPostContext();

  function videoURL(embed: InlineVideoEmbed | RawVideoEmbed) {
    if (embed instanceof InlineVideoEmbed) {
      return embed.playlistURL;
    } else {
      let cid = embed.video.ref['$link'];
      return `https://video.bsky.app/watch/${post.author.did}/${cid}/playlist.m3u8`;
    }
  }
</script>

<div>
  <p>[<a href={videoURL(embed)}>Video</a>]</p>

  {#if embed.alt}
    <details class="image-alt">
      <summary>Show alt</summary>
      {embed.alt}
    </details>
  {/if}
</div>
