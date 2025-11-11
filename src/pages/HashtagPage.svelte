<script>
  import { Post } from '../models/posts.js';
  import { hideLoader } from '../skythread.js';
  import * as paginator from '../utils/paginator.js';
  import PostWrapper from '../components/posts/PostWrapper.svelte';

  let { hashtag } = $props();
  hashtag = hashtag.replace(/^\#/, '');

  let posts = $state([]);
  let firstPageLoaded = $state(false);

  let isLoading = false;
  let finished = false;
  let cursor;

  paginator.loadInPages(async () => {
    if (isLoading || finished) { return }
    isLoading = true;

    try {
      let data = await api.getHashtagFeed(hashtag, cursor);
      let batch = data.posts.map(j => new Post(j));

      if (!firstPageLoaded) {
        hideLoader();
        firstPageLoaded = true;
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

<svelte:head>
  <title>#{hashtag} - Skythread"</title>
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

  {#each posts as post}
    <PostWrapper {post} context="feed" />
  {/each}
{/if}
