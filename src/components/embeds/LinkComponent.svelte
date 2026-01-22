<script lang="ts">
  import { getPostContext } from '../posts/PostComponent.svelte';
  import { isValidURL, truncateText } from '../../utils.js';
  import GIFPlayer from './GIFPlayer.svelte';
  import { InlineLinkEmbed, RawLinkEmbed } from '../../models/embeds.js';

  let { embed }: { embed: InlineLinkEmbed | RawLinkEmbed } = $props();
  let { post } = getPostContext();

  let showingGIF = $state(false);

  let hostname = $derived(new URL(embed.url).hostname);
  let isTenorGIF = $derived(hostname == 'media.tenor.com');
  let onclick = $derived(isTenorGIF ? playGIF : undefined);

  function playGIF(e: Event) {
    e.preventDefault();
    showingGIF = true;
  }

  function thumbnailURL() {
    if (typeof embed.thumb == 'string') {
      return embed.thumb;
    } else {
      return `https://cdn.bsky.app/img/avatar/feed_thumbnail/${post.author.did}/${embed.thumb.ref.$link}@jpeg`;
    }
  }
</script>

{#if showingGIF}
  <GIFPlayer gifURL={embed.url} staticURL={thumbnailURL()} alt={embed.title} />
{:else}
  {#if isValidURL(embed.url)}
    <a class="link-card" href={embed.url} target="_blank" {onclick}>
      <div>
        <p class="domain">{hostname}</p>
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
