<script lang="ts">
  import LikeStatsTable from '../components/LikeStatsTable.svelte';
  import { LikeStats, type LikeStat } from '../services/like_stats.js';
  import { numberOfDays } from '../utils.js';

  let timeRangeDays = $state(7);
  let progress: number | undefined = $state();
  let scanInProgress = $derived(progress !== undefined);
  let givenLikesUsers: LikeStat[] | undefined = $state();
  let receivedLikesUsers: LikeStat[] | undefined = $state();
  let showLoadMore = $state(false);

  let likeStats = new LikeStats();

  async function startScan(e: Event) {
    e.preventDefault();

    try {
      if (!scanInProgress) {
        givenLikesUsers = undefined;
        receivedLikesUsers = undefined;

        let result = await likeStats.findLikes(timeRangeDays, (p) => { progress = p });

        givenLikesUsers = result.givenLikes;
        receivedLikesUsers = result.receivedLikes;
        showLoadMore = (result.total > givenLikesUsers.length);
        progress = undefined;
      } else {
        likeStats.abortScan();
        progress = undefined;
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
  }

  async function loadMore(e: Event) {
    e.preventDefault();

    if (!(givenLikesUsers && receivedLikesUsers)) { return }

    showLoadMore = false;
    let result = await likeStats.loadMore();

    givenLikesUsers.push(...result.givenLikes);
    receivedLikesUsers.push(...result.receivedLikes);
    showLoadMore = (result.total > givenLikesUsers.length);
  }
</script>

<main>
  <h2>Like statistics</h2>

  <form onsubmit={startScan}>
    <p>
      Time range: <input id="like_stats_range" type="range" min="1" max="60" bind:value={timeRangeDays}>
      <label for="like_stats_range">{numberOfDays(timeRangeDays)}</label>
    </p>

    <p>
      <input type="submit" value="{scanInProgress ? 'Cancel' : 'Start scan'}">

      {#if scanInProgress}
        <progress value={progress} style="display: inline;"></progress>
      {/if}
    </p>
  </form>

  {#if givenLikesUsers && receivedLikesUsers}
    <div class="like-stats-results">
      <div class="table-pane">
        <LikeStatsTable cssClass="given-likes" header="❤️ Likes from you:" users={givenLikesUsers} />
      </div>
      <div class="table-pane">
        <LikeStatsTable cssClass="received-likes" header="💛 Likes on your posts:" users={receivedLikesUsers} />
      </div>
    </div>

    <p class="load-more" style:visibility={showLoadMore ? 'visible' : 'hidden'}>
      <a href="#" onclick={loadMore}>Load more</a>
    </p>
  {/if}
</main>

<style>
  input[type="range"] {
    width: 250px;
    vertical-align: middle;
  }

  input[type="submit"] {
    font-size: 12pt;
    margin: 5px 0px;
    padding: 5px 10px;
  }

  progress {
    width: 300px;
    margin-left: 10px;
    vertical-align: middle;
    display: none;
  }

  .like-stats-results {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 100px;
    width: 100%;
  }

  .table-pane {
    min-width: 0;
  }

  .load-more {
    text-align: center;
  }
</style>
