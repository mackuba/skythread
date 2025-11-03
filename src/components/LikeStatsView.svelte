<script>
  import LikeStatsTable from './LikeStatsTable.svelte';
  import { LikeStats } from '../tools/like_stats.js';

  let timeRangeDays = $state(7);
  let progress = $state();
  let scanInProgress = $derived(progress !== undefined);
  let givenLikesUsers = $state();
  let receivedLikesUsers = $state();

  let likeStats = new LikeStats();

  async function startScan(e) {
    e.preventDefault();

    if (!scanInProgress) {
      givenLikesUsers = undefined;
      receivedLikesUsers = undefined;

      let result = await likeStats.findLikes(timeRangeDays, (p) => { progress = p });

      givenLikesUsers = result.givenLikes;
      receivedLikesUsers = result.receivedLikes;
      progress = undefined;
    } else {
      likeStats.stopScan();
      progress = undefined;
    }
  }
</script>

<h2>Like statistics</h2>

<form onsubmit={startScan}>
  <p>
    Time range: <input id="like_stats_range" type="range" min="1" max="60" bind:value={timeRangeDays}>
    <label for="like_stats_range">{timeRangeDays} {timeRangeDays == 1 ? 'day' : 'days'}</label>
  </p>

  <p>
    <input type="submit" value="{scanInProgress ? 'Cancel' : 'Start scan'}">

    {#if scanInProgress}
      <progress value={progress} style="display: inline;"></progress>
    {/if}
  </p>
</form>

{#if givenLikesUsers}
  <LikeStatsTable cssClass="given-likes" header="❤️ Likes from you:" users={givenLikesUsers} />
  <LikeStatsTable cssClass="received-likes" header="💛 Likes on your posts:" users={receivedLikesUsers} />
{/if}

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

  :global(.scan-result.given-likes) {
    margin-right: 100px;
  }
</style>
