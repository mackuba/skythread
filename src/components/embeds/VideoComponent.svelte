<script>
  import { getContext } from 'svelte';

  let { embed } = $props();
  let { post } = getContext('post');

  function videoURL(embed) {
    if (embed.playlistURL) {
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
