<script>
  import LikeStatsTable from './LikeStatsTable.svelte';

  let { onSubmit, state: data } = $props();

  let timeRangeDays = $state(7);
  let scanInProgress = $derived(data.progress !== undefined);

  function startScan(e) {
    e.preventDefault();
    onSubmit(timeRangeDays);
  }
</script>

<h2>Like statistics</h2>

<form onsubmit={startScan}>
  <p>
    Time range: <input type="range" min="1" max="60" bind:value={timeRangeDays}>
    <label>{timeRangeDays} {timeRangeDays == 1 ? 'day' : 'days'}</label>
  </p>

  <p>
    <input type="submit" value="{scanInProgress ? 'Cancel' : 'Start scan'}">

    {#if scanInProgress}
      <progress value={data.progress} style="display: inline;"></progress>
    {/if}
  </p>
</form>

{#if !scanInProgress && data.givenLikesUsers !== undefined}
  <LikeStatsTable cssClass="given-likes" header="❤️ Likes from you:" users={data.givenLikesUsers} />
  <LikeStatsTable cssClass="received-likes" header="💛 Likes on your posts:" users={data.receivedLikesUsers} />
{/if}
