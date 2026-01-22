<script lang="ts">
  import { RichText, type Facet } from '../../lib/rich_text_lite.js';
  import { linkToHashtagPage } from '../router.js';
  import { isValidURL } from '../utils.js';

  let { text, facets }: { text: string, facets: Facet[] } = $props();

  let richText = $derived(new RichText({ text, facets }));
  let segments = $derived(richText.segments());
</script>

{#each segments as segment}
  {#if segment.mention}
    <a href="https://bsky.app/profile/{segment.mention.did}">{segment.text}</a>
  {:else if segment.link}
    {#if isValidURL(segment.link.uri)}
      <a href="{segment.link.uri}">{segment.text}</a>
    {:else}
      [{segment.text}]({segment.link.uri})
    {/if}
  {:else if segment.tag}
    <a href={linkToHashtagPage(segment.tag.tag)}>{segment.text}</a>
  {:else}
    {@const lines = segment.text.split("\n")}

    {#each lines as line, i}
      {#if i > 0}<br>{/if}{line}
    {/each}
  {/if}
{/each}
