<script lang="ts">
  import {
    Embed, RawRecordEmbed, RawRecordWithMediaEmbed, RawImageEmbed, RawLinkEmbed, RawVideoEmbed,
    InlineRecordEmbed, InlineRecordWithMediaEmbed, InlineImageEmbed, InlineLinkEmbed, InlineVideoEmbed
  } from '../../models/embeds.js';

  import EmbedComponent from './EmbedComponent.svelte';
  import ImagesComponent from './ImagesComponent.svelte';
  import LinkComponent from './LinkComponent.svelte';
  import QuoteComponent from './QuoteComponent.svelte';
  import VideoComponent from './VideoComponent.svelte';

  let { embed }: { embed: Embed } = $props();
</script>

<div class="embed">
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
</div>

<style>
  .embed :global {
    a.link-card {
      display: block;
      position: relative;
      max-width: 500px;
      margin-bottom: 12px;
    }

    a.link-card:hover {
      text-decoration: none;
    }

    a.link-card > div {
      background-color: #fcfcfd;
      border: 1px solid #d8d8d8;
      border-radius: 8px;
      padding: 11px 15px;
    }

    a.link-card:hover > div {
      background-color: #f6f7f8;
      border: 1px solid #c8c8c8;
    }

    a.link-card > div:not(:has(p.description)) {
      padding-bottom: 14px;
    }

    a.link-card p.domain {
      color: #888;
      font-size: 10pt;
      margin-top: 1px;
      margin-bottom: 5px;
    }

    a.link-card h2 {
      font-size: 12pt;
      color: #333;
      margin-top: 8px;
      margin-bottom: 0;
    }

    a.link-card p.description {
      color: #666;
      font-size: 11pt;
      margin-top: 8px;
      margin-bottom: 4px;
      line-height: 135%;
      white-space: pre-line;
    }

    a.link-card.record > div:has(.avatar) {
      padding-left: 65px;
    }

    a.link-card.record h2 {
      margin-top: 3px;
    }

    a.link-card.record .handle {
      color: #666;
      margin-left: 1px;
      font-weight: normal;
      font-size: 11pt;
      vertical-align: text-top;
    }

    a.link-card.record .avatar {
      width: 36px;
      height: 36px;
      border: 1px solid #ddd;
      border-radius: 6px;
      position: absolute;
      top: 15px;
      left: 15px;
    }

    a.link-card.record .stats {
      margin-top: 9px;
      margin-bottom: 1px;
      font-size: 10pt;
      color: #666;
    }

    a.link-card.record .stats i.fa-heart {
      font-size: 9pt;
      color: #aaa;
    }
  }

  @media (prefers-color-scheme: dark) {
    .embed :global {
      a.link-card > div {
        background-color: #303030;
        border-color: #606060;
      }

      a.link-card:hover > div {
        background-color: #383838;
        border-color: #707070;
      }

      a.link-card p.domain {
        color: #666;
      }

      a.link-card h2 {
        color: #ccc;
      }

      a.link-card p.description {
        color: #888;
      }

      a.link-card.record .handle {
        color: #666;
      }

      a.link-card.record .avatar {
        border-color: #888;
      }
    }
  }
</style>
