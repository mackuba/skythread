<script>
  import { Post } from '../models/posts.js';
  import { hideLoader } from '../skythread.js';
  import * as paginator from '../utils/paginator.js';
  import PostWrapper from '../components/posts/PostWrapper.svelte';

  let isLoading = false;
  let cursor;
  let finished = false;

  let { postURL } = $props();

  let posts = $state([]);
  let quoteCount = $state();
  let firstPageLoaded = $derived(quoteCount !== undefined);

  paginator.loadInPages(async () => {
    if (isLoading || finished) { return }
    isLoading = true;

    try {
      let data = await blueAPI.getQuotes(postURL, cursor);
      let jsons = await api.loadPosts(data.posts);
      let batch = jsons.map(j => new Post(j));

      if (!firstPageLoaded) {
        hideLoader();
        quoteCount = data.quoteCount;
      }

      posts.splice(posts.length, 0, ...batch);

      isLoading = false;
      cursor = data.cursor;

      if (!cursor || posts.length == 0) {
        finished = true;
      }
    } catch(error) {
      hideLoader();
      console.log(error);
      isLoading = false;
    }
  });
</script>

{#if firstPageLoaded}
  <header>
    <h2>
      {#if quoteCount > 1}
        {quoteCount} quotes:
      {:else if quoteCount == 1}
        1 quote:
      {:else}
        No quotes found.
      {/if}
    </h2>
  </header>

  {#each posts as post}
    <PostWrapper {post} context="quotes" />
  {/each}
{/if}
