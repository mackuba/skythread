<script>
  import { getContext } from 'svelte';
  import { sanitizeHTML } from '../../utils.js';
  import RichTextFromFacets from '../RichTextFromFacets.svelte';

  let { post } = getContext('post');
</script>

{#if post.originalFediContent}
  <div class="body">
    {@html sanitizeHTML(post.originalFediContent)}
  </div>
{:else}
  <p class="body"><RichTextFromFacets text={post.text} facets={post.facets} /></p>
{/if}
