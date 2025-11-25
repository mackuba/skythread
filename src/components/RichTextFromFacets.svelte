<script lang="ts">
  import { RichText } from '../../lib/rich_text_lite.js';
  import { linkToHashtagPage } from '../router.js';

  let { text, facets }: { text: string, facets: json[] } = $props();

  let richText = $derived(new RichText({ text, facets }));
  let segments = $derived(richText.segments());
</script>

{#each segments as segment}
  {#if segment.mention}
    <a href="https://bsky.app/profile/{segment.mention.did}">{segment.text}</a>
  {:else if segment.link}
    <a href="{segment.link.uri}">{segment.text}</a>
  {:else if segment.tag}
    <a href={linkToHashtagPage(segment.tag.tag)}>{segment.text}</a>
  {:else}
    {@const lines = segment.text.split("\n")}

    {#each lines as line, i}
      {#if i > 0}<br>{/if}
      {line}
    {/each}
  {/if}
{/each}
