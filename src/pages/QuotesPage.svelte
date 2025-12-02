<script lang="ts">
  import { api, blueAPI } from '../api.js';
  import { Post } from '../models/posts.js';
  import { showError } from '../utils.js';
  import * as paginator from '../utils/paginator.js';
  import FeedPostParent from '../components/posts/FeedPostParent.svelte';
  import MainLoader from '../components/MainLoader.svelte';
  import PostComponent from '../components/posts/PostComponent.svelte';

  let isLoading = false;
  let cursor: string | undefined;
  let finished = false;

  let { postURL }: { postURL: string } = $props();

  let posts: Post[] = $state([]);
  let quoteCount: number | undefined = $state();
  let loadingFailed = $state(false);

  paginator.loadInPages(async () => {
    if (isLoading || finished) { return }
    isLoading = true;

    try {
      let data = await blueAPI.getQuotes(postURL, cursor);
      let jsons = await api.loadPosts(data.posts);
      let batch = jsons.map(j => new Post(j));

      if (quoteCount === undefined) {
        quoteCount = data.quoteCount;
      }

      posts.push(...batch);

      isLoading = false;
      cursor = data.cursor;

      if (!cursor || posts.length == 0) {
        finished = true;
      }
    } catch(error) {
      console.log(error);
      isLoading = false;
      loadingFailed = true;
      showError(error);
    }
  });
</script>

{#if quoteCount !== undefined}
  <main class="quotes">
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

  {#each posts as post (post.uri)}
    <!-- TODO: #if post.parent -->
    {#if post.parentReference}
      <FeedPostParent uri={post.parentReference.uri} />
    {/if}

    <PostComponent {post} placement="quotes" />
  {/each}
  </main>
{:else if !loadingFailed}
  <MainLoader />
{/if}

<style>
  .quotes :global(.post) {
    padding-bottom: 5px;
  }

  .quotes :global(.post-quote .quote-embed) {
    display: none;
  }

  .quotes :global(.post-quote p.stats) {
    display: none;
  }
</style>
