<script lang="ts">
  import { accountAPI } from '../api.js';
  import { Post } from '../models/posts.js';
  import * as paginator from '../utils/paginator.js';
  import FeedPostParent from '../components/posts/FeedPostParent.svelte';
  import MainLoader from '../components/MainLoader.svelte';
  import PostComponent from '../components/posts/PostComponent.svelte';

  let posts: Post[] = $state([]);
  let firstPageLoaded = $state(false);
  let loadingFailed = $state(false);

  let isLoading = false;
  let finished = false;
  let cursor: string | undefined;

  paginator.loadInPages(async (next) => {
    if (isLoading || finished) { return }
    isLoading = true;

    try {
      let data = await accountAPI.loadMentions(cursor);
      let batch = data.posts.map(x => new Post(x));

      if (!firstPageLoaded && batch.length > 0) {
        firstPageLoaded = true;
      }

      posts.push(...batch);

      isLoading = false;
      cursor = data.cursor;

      if (!cursor) {
        finished = true;
      } else if (batch.length == 0) {
        next();
      }
    } catch(error) {
      console.log(error);
      isLoading = false;
      loadingFailed = true;
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

  {#each posts as post (post.uri)}
    <!-- TODO: #if post.parent -->
    {#if post.parentReference}
      <FeedPostParent uri={post.parentReference.uri} />
    {/if}

    <PostComponent {post} placement="feed" />
  {/each}
{:else if !loadingFailed}
  <MainLoader />
{/if}
