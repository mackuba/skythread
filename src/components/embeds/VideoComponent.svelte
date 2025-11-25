<script lang="ts">
  import { getContext } from 'svelte';
  import { InlineVideoEmbed, RawVideoEmbed } from '../../models/embeds';
  import { Post } from '../../models/posts';

  let { embed }: { embed: InlineVideoEmbed | RawVideoEmbed } = $props();
  let { post }: { post: Post } = getContext('post');

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
