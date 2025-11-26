<script lang="ts">
  import { getContext } from 'svelte';
  import { sanitizeHTML } from '../../utils.js';
  import { Post } from '../../models/posts.js';
  import RichTextFromFacets from '../RichTextFromFacets.svelte';

  const highlightID = 'search-results';

  let { post }: { post: Post } = getContext('post');
  let { highlightedMatches = undefined }: { highlightedMatches?: string[] } = $props();

  let bodyElement: HTMLElement | undefined = $state();

  function highlightSearchResults(terms: string[]) {
    let regexp = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
    let walker = document.createTreeWalker(bodyElement!, NodeFilter.SHOW_TEXT);
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
  }

  $effect(() => {
    if (highlightedMatches && highlightedMatches.length > 0) {
      highlightSearchResults(highlightedMatches);

      return () => {
        CSS.highlights.delete(highlightID);
      }
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
