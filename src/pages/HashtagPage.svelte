<script lang="ts">
  import { Post } from '../models/posts.js';
  import * as paginator from '../utils/paginator.js';
  import MainLoader from '../components/MainLoader.svelte';
  import PostComponent from '../components/posts/PostComponent.svelte';

  let { hashtag }: { hashtag: string } = $props();
  hashtag = hashtag.replace(/^\#/, '');

  let posts: Post[] = $state([]);
  let firstPageLoaded = $state(false);
  let loadingFailed = $state(false);

  let isLoading = false;
  let finished = false;
  let cursor: string | undefined;

  paginator.loadInPages(async () => {
    if (isLoading || finished) { return }
    isLoading = true;

    try {
      let data = await api.getHashtagFeed(hashtag, cursor);
      let batch = data.posts.map(j => new Post(j)) as Post[];
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
</script>

<svelte:head>
  <title>#{hashtag} - Skythread</title>
</svelte:head>

{#if firstPageLoaded}
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
{:else if !loadingFailed}
  <MainLoader />
{/if}
