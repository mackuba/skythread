<script lang="ts">
  import PostComponent from '../components/posts/PostComponent.svelte';
  import { Post } from '../models/posts';
  import { TimelineSearch } from '../services/timeline_search.js';
  import { numberOfDays } from '../utils.js';

  let timeRangeDays = $state(7);
  let progressMax: number | undefined = $state();
  let progress: number | undefined = $state();
  let fetchInProgress = $derived(progress !== undefined);
  let daysFetched: number | undefined = $state();

  let query = $state('');
  let results: Post[] = $state([]);

  let timelineSearch = new TimelineSearch();

  async function startScan(e: Event) {
    e.preventDefault();

    if (!fetchInProgress) {
      progressMax = timeRangeDays;
      progress = 0;

      await timelineSearch.fetchTimeline(timeRangeDays, (p) => { progress = p });

      daysFetched = progress;
      progress = undefined;
    } else {
      progress = undefined;
      timelineSearch.stopFetch();
    }
  }

  function onKeyPress(e: KeyboardEvent) {
    if (e.key == 'Enter') {
      e.preventDefault();

      let q = query.trim().toLowerCase();
      results = timelineSearch.searchPosts(q);
    }
  }
</script>

<h2>Timeline search</h2>

<div class="timeline-search">
  <form onsubmit={startScan}>
    <p>
      Fetch timeline posts: <input id="timeline_search_range" type="range" min="1" max="60" bind:value={timeRangeDays}>
      <label for="timeline_search_range">{numberOfDays(timeRangeDays)}</label>
    </p>

    <p>
      <input type="submit" value="{fetchInProgress ? 'Cancel' : 'Fetch timeline'}">

      {#if fetchInProgress}
        <progress max={progressMax} value={progress}></progress>
      {/if}
    </p>
  </form>

  {#if daysFetched}
    <p class="archive-status">
      Timeline archive fetched: {numberOfDays(Math.round(daysFetched))}
    </p>
  {/if}

  <hr>
</div>

{#if daysFetched}
  <form class="search-form">
    <p class="search">
      Search:
      <input type="text" class="search-query" autocomplete="off" onkeydown={onKeyPress} bind:value={query}>
    </p>
  </form>

  <div class="results">
    {#each results as post (post.uri)}
      <PostComponent {post} placement="feed" />
    {/each}
  </div>
{/if}
