<script lang="ts">
  import { type PostingStatsResult } from "../services/posting_stats";

  interface Props extends PostingStatsResult {
    showReposts?: boolean,
    showPercentages?: boolean,
    showTotal?: boolean
  };

  let { users, sums, daysBack, showReposts = true, showPercentages = true, showTotal = true }: Props = $props();

  function format(value: number): string {
    return (value > 0) ? value.toFixed(1) : '–';
  }
</script>

<table class="scan-result">
  <thead>
    <tr>
      <th>#</th>
      <th>Handle</th>

      {#if showReposts}
        <th>All posts /d</th>
        <th>Own posts /d</th>
        <th>Reposts /d</th>
      {:else}
        <th>Posts /d</th>
      {/if}

      {#if showPercentages}
        <th>% of timeline</th>
      {/if}
    </tr>
  </thead>
  <tbody>
    {#if showTotal}
      <tr class="total">
        <td class="no"></td>
        <td class="handle">Total:</td>

        {#if showReposts}
          <td>{format(sums.all / daysBack)}</td>
        {/if}

        <td>{format(sums.own / daysBack)}</td>

        {#if showReposts}
          <td>{format(sums.reposts / daysBack)}</td>
        {/if}

        {#if showPercentages}
          <td class="percent"></td>
        {/if}
      </tr>
    {/if}

    {#each users as user, i}
      <tr>
        <td class="no">{i + 1}</td>
        <td class="handle">
          <img class="avatar" alt="Avatar" src="{user.avatar}">
          <a href="https://bsky.app/profile/{user.handle}" target="_blank">{user.handle}</a>
        </td>

        {#if showReposts}
          <td>{format(user.all / daysBack)}</td>
        {/if}

        <td>{format(user.own / daysBack)}</td>

        {#if showReposts}
          <td>{format(user.reposts / daysBack)}</td>
        {/if}

        {#if showPercentages}
          <td class="percent">{format(user.all * 100 / sums.all)}%</td>
        {/if}
      </tr>
    {/each}
  </tbody>
</table>
