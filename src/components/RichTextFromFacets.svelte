<script lang="ts">
  import { RichText, type Facet } from '../../lib/rich_text_lite.js';
  import { linkToHashtagPage } from '../router.js';
  import { isValidURL } from '../utils.js';
  import { CodeMarkupParser } from '../utils/code_markup_parser.js';
  import PlainTextWithCode from './PlainTextWithCode.svelte';

  type Props = {
    text: string;
    facets: Facet[] | undefined;
    renderCode?: boolean;
  }

  let { text, facets, renderCode = false }: Props = $props();

  let parser = $derived(new CodeMarkupParser(text));
  let filteredFacets = $derived(renderCode ? parser.removeFacetsInCodeSegments(facets) : facets);
  let richText = $derived(new RichText({ text, facets: filteredFacets }));
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
    <PlainTextWithCode text={segment.text} {renderCode} />
  {/if}
{/each}
