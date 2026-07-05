<script lang="ts">
  import { getPostContext } from '../posts/PostComponent.svelte';
  import { parseHTTPURL, truncateText } from '../../utils.js';
  import GIFPlayer from './GIFPlayer.svelte';
  import { InlineLinkEmbed, RawLinkEmbed } from '../../models/embeds.js';

  const GIF_DOMAINS = ['media.tenor.com', 'static.klipy.com', 'media.giphy.com'];

  let { embed }: { embed: InlineLinkEmbed | RawLinkEmbed } = $props();
  let { post } = getPostContext();

  let parsedURL = $derived(embed.url ? parseHTTPURL(embed.url) : undefined);
  let isGIF = $derived(parsedURL ? GIF_DOMAINS.includes(parsedURL.hostname) : false);

  let thumbnailURL = $derived.by(() => {
    if (embed instanceof RawLinkEmbed && embed.thumb) {
      return `https://cdn.bsky.app/img/avatar/feed_thumbnail/${post.author.did}/${embed.thumb.ref.$link}@jpeg`;
    } else if (embed instanceof InlineLinkEmbed) {
      let parsedURL = embed.thumb ? parseHTTPURL(embed.thumb) : undefined;
      return parsedURL?.href;
    }

    return undefined;
  });
</script>

{#if parsedURL}
  {#if isGIF && thumbnailURL}
    <GIFPlayer gifURL={parsedURL.href} staticURL={thumbnailURL} title={embed.title} description={embed.description} />
  {:else}
    <a class="link-card" href={parsedURL.href} target="_blank" rel="noopener">
      <div>
        <p class="domain">{parsedURL.hostname}</p>
        <h2>{embed.title || embed.url}</h2>

        {#if embed.description}
          <p class="description">{truncateText(embed.description, 300)}</p>
        {/if}
      </div>
    </a>
  {/if}
{:else}
  <p>
    [Link: {embed.url}]
  </p>
{/if}
