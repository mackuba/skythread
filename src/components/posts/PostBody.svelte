<script>
  import { getContext } from 'svelte';
  import { sanitizeHTML } from '../../utils.js';
  import RichTextFromFacets from '../RichTextFromFacets.svelte';

  let { post } = getContext('post');
  let { highlightedMatches = undefined } = $props();

  let bodyElement;

  /** @param {string[]} terms */

  function highlightSearchResults(terms) {
    let regexp = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
    let walker = document.createTreeWalker(bodyElement, NodeFilter.SHOW_TEXT);
    let ranges = [];

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

    let highlight = CSS.highlights.get('search-results') || new Highlight();
    ranges.forEach(r => highlight.add(r));
    CSS.highlights.set('search-results', highlight);
  }

  $effect(() => {
    if (highlightedMatches && highlightedMatches.length > 0) {
      highlightSearchResults(highlightedMatches);
    }
  });
</script>

{#if post.originalFediContent}
  <div class="body" bind:this={bodyElement}>
    {@html sanitizeHTML(post.originalFediContent)}
  </div>
{:else}
  <p class="body" bind:this={bodyElement}>
    <RichTextFromFacets text={post.text} facets={post.facets} />
  </p>
{/if}
