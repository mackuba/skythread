<script lang="ts">
  import { getPostContext } from '../posts/PostComponent.svelte';
  import { parseHTTPURL, truncateText } from '../../utils.js';
  import GIFPlayer from './GIFPlayer.svelte';
  import { InlineLinkEmbed, RawLinkEmbed } from '../../models/embeds.js';

  let { embed }: { embed: InlineLinkEmbed | RawLinkEmbed } = $props();
  let { post } = getPostContext();

  let displayedGIF: { gif: string, thumb: string} | undefined = $state();

  let parsedURL = $derived(embed.url ? parseHTTPURL(embed.url) : undefined);

  let thumbnailURL = $derived.by(() => {
    if (embed instanceof RawLinkEmbed && embed.thumb) {
      return `https://cdn.bsky.app/img/avatar/feed_thumbnail/${post.author.did}/${embed.thumb.ref.$link}@jpeg`;
    } else if (embed instanceof InlineLinkEmbed) {
      let parsedURL = embed.thumb ? parseHTTPURL(embed.thumb) : undefined;
      return parsedURL?.href;
    }

    return undefined;
  });

  function onClick(e: Event, url: URL) {
    if (url.hostname == 'media.tenor.com' && thumbnailURL) {
      e.preventDefault();
      displayedGIF = { gif: url.href, thumb: thumbnailURL };
    }
  }
</script>

{#if displayedGIF}
  <GIFPlayer gifURL={displayedGIF.gif} staticURL={displayedGIF.thumb} alt={embed.title} />
{:else}
  {#if parsedURL}
    <a class="link-card" href={parsedURL.href} target="_blank" rel="noopener" onclick={(e) => onClick(e, parsedURL)}>
      <div>
        <p class="domain">{parsedURL.hostname}</p>
        <h2>{embed.title || embed.url}</h2>

        {#if embed.description}
          <p class="description">{truncateText(embed.description, 300)}</p>
        {/if}
      </div>
    </a>
  {:else}
    <p>
      [Link: {embed.url}]
    </p>
  {/if}
{/if}
