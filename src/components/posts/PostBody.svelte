<script lang="ts">
  import { getPostContext } from './PostComponent.svelte';
  import { sanitizeHTML } from '../../utils.js';
  import { type Facet } from '../../../lib/rich_text_lite.js';
  import RichTextFromFacets from '../RichTextFromFacets.svelte';

  const highlightID = 'search-results';

  let { post } = getPostContext();
  let { highlightedMatches = undefined }: { highlightedMatches?: string[] | undefined } = $props();

  let mainElement: HTMLElement | undefined = $state();
  let highlightedRanges: Range[] = $state([]);

  function highlightSearchResults(terms: string[]) {
    let regexp = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
    let walker = document.createTreeWalker(mainElement!, NodeFilter.SHOW_TEXT);
    let ranges: Range[] = [];

    while (walker.nextNode()) {
      let node = walker.currentNode;
      if (!node.textContent) { continue; }

      regexp.lastIndex = 0;

      for (;;) {
        let match = regexp.exec(node.textContent);
        if (match === null) break;

        let range = new Range();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        ranges.push(range);
      }
    }

    let highlight = CSS.highlights.get(highlightID) || new Highlight();
    ranges.forEach(r => highlight.add(r));
    CSS.highlights.set(highlightID, highlight);

    highlightedRanges = ranges;
  }

  function removeHighlights() {
    let highlight = CSS.highlights.get(highlightID) || new Highlight();
    highlightedRanges.forEach(r => highlight.delete(r));
    CSS.highlights.set(highlightID, highlight);

    highlightedRanges = [];
  }

  $effect(() => {
    if (highlightedMatches && highlightedMatches.length > 0) {
      highlightSearchResults(highlightedMatches);

      return () => {
        removeHighlights();
      };
    } else {
      return;
    }
  });
</script>

{#if post.originalFediContent}
  <div class="bridged-body" bind:this={mainElement}>
    {@html sanitizeHTML(post.originalFediContent)}
  </div>
{:else}
  <p class="body" bind:this={mainElement}>
    <RichTextFromFacets text={post.text} facets={post.facets as Facet[]} />
  </p>
{/if}

<style>
  .bridged-body :global(p + p) {
    margin-top: 18px;
  }

  :global(::highlight(search-results)) {
    background-color: rgba(255, 255, 0, 0.75);
  }

  @media (prefers-color-scheme: dark) {
    :global(::highlight(search-results)) {
      background-color: rgba(255, 255, 0, 0.35);
    }
  }
</style>
