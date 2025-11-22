<script>
  import { Post } from '../models/posts.js';
  import { hideLoader } from '../skythread.js';
  import * as paginator from '../utils/paginator.js';
  import FeedPostParent from '../components/posts/FeedPostParent.svelte';
  import PostWrapper from '../components/posts/PostWrapper.svelte';

  let posts = $state([]);
  let firstPageLoaded = $state(false);

  let isLoading = false;
  let finished = false;
  let cursor;

  paginator.loadInPages(async (next) => {
    if (isLoading || finished) { return }
    isLoading = true;

    try {
      let data = await accountAPI.loadMentions(cursor);
      let batch = data.posts.map(x => new Post(x));

      if (!firstPageLoaded && batch.length > 0) {
        hideLoader();
        firstPageLoaded = true;
      }

      posts.splice(posts.length, 0, ...batch);

      isLoading = false;
      cursor = data.cursor;

      if (!cursor) {
        finished = true;
      } else if (batch.length == 0) {
        next();
      }
    } catch(error) {
      hideLoader();
      console.log(error);
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Notifications - Skythread</title>
</svelte:head>

{#if firstPageLoaded}
  <header>
    <h2>Replies & Mentions:</h2>
  </header>

  {#each posts as post}
    <!-- TODO: #if post.parent -->
    {#if post.parentReference}
      <FeedPostParent uri={post.parentReference.uri} />
    {/if}

    <PostWrapper {post} context="feed" />
  {/each}
{/if}
