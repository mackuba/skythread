<script>
  import {
    RawRecordEmbed, RawRecordWithMediaEmbed, RawImageEmbed, RawLinkEmbed, RawVideoEmbed,
    InlineRecordEmbed, InlineRecordWithMediaEmbed, InlineImageEmbed, InlineLinkEmbed, InlineVideoEmbed
  } from '../../models/embeds.js';

  import EmbedComponent from './EmbedComponent.svelte';
  import ImagesComponent from './ImagesComponent.svelte';
  import LinkComponent from './LinkComponent.svelte';
  import QuoteComponent from './QuoteComponent.svelte';
  import VideoComponent from './VideoComponent.svelte';

  let { embed } = $props();
</script>

{#if embed instanceof RawRecordEmbed || embed instanceof InlineRecordEmbed}
  <QuoteComponent record={embed.record} />

{:else if embed instanceof RawRecordWithMediaEmbed || embed instanceof InlineRecordWithMediaEmbed}
  <div>
    <EmbedComponent embed={embed.media} />
    <QuoteComponent record={embed.record} />
  </div>

{:else if embed instanceof RawImageEmbed || embed instanceof InlineImageEmbed}
  <ImagesComponent {embed} />

{:else if embed instanceof RawLinkEmbed || embed instanceof InlineLinkEmbed}
  <LinkComponent {embed} />

{:else if embed instanceof RawVideoEmbed || embed instanceof InlineVideoEmbed}
  <VideoComponent {embed} />

{:else}
  <p>[{embed.type}]</p>
{/if}
