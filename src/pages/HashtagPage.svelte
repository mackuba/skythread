<script lang="ts">
  import { api } from '../api.js';
  import { Post } from '../models/posts.js';
  import * as paginator from '../utils/paginator.js';
  import MainLoader from '../components/MainLoader.svelte';
  import PostComponent from '../components/posts/PostComponent.svelte';
  import { checkIfNotBot } from '../utils/bot_protection.js';

  let { hashtag }: { hashtag: string } = $props();
  hashtag = hashtag.replace(/^\#/, '');

  let posts: Post[] = $state([]);
  let firstPageLoaded = $state(false);
  let loadingFailed = $state(false);

  let isLoading = false;
  let finished = false;
  let cursor: string | undefined;

  async function recordAppViewRequest(kind: string, event: string | undefined) {
    event = event || 'storage';

    navigator.sendBeacon(`/_telemetry/appview?kind=${encodeURIComponent(kind)}&event=${event}`);

    await fetch(`/_telemetry/appview?fetch=true&kind=${encodeURIComponent(kind)}&event=${event}`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'omit'
    });
  }

  let paginatorInitialized = false;
  let eventName: string | undefined = undefined;

  async function initializePaginator() {
    if (paginatorInitialized) { return }
    paginatorInitialized = true;

    eventName = await checkIfNotBot();

  paginator.loadInPages(async () => {
    if (isLoading || finished) { return }
    isLoading = true;

    try {
      await recordAppViewRequest(cursor ? 'hashtag-next-page' : 'hashtag', eventName);

      let data = await api.getHashtagFeed(hashtag, cursor);
      let batch = data.posts.map((j: json) => new Post(j)) as Post[];
      firstPageLoaded = true;

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
    }
  });

  }

  $effect(() => {
    void initializePaginator();
  });
</script>

<svelte:head>
  <title>#{hashtag} - Skythread</title>
</svelte:head>

{#if firstPageLoaded}
  <main class="hashtag">
  <header>
    <h2>
      {#if posts.length > 0}
        Posts tagged: #{hashtag}
      {:else}
        No posts tagged #{hashtag}.
      {/if}
    </h2>
  </header>

  {#each posts as post (post.uri)}
    <PostComponent {post} placement="feed" />
  {/each}
  </main>
{:else if !loadingFailed}
  <MainLoader />
{/if}

<style>
  .hashtag > :global(.post) {
    padding-bottom: 10px;
    border-bottom: 1px solid #ddd;
  }
</style>
