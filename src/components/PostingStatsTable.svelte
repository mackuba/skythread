<script lang="ts">
  import { type PostingStatsResult } from "../services/posting_stats";

  export interface TableOptions {
    showReposts?: boolean,
    showPercentages?: boolean,
    showTotal?: boolean
  };

  type Props = PostingStatsResult & TableOptions;

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

<style>
  .scan-result {
    border: 1px solid #333;
    border-collapse: collapse;
  }

  td, th {
    border: 1px solid #333;
  }

  td {
    text-align: right;
    padding: 5px 8px;
  }

  th {
    text-align: center;
    background-color: hsl(207, 100%, 86%);
    padding: 7px 10px;
  }

  td.handle {
    text-align: left;
    max-width: 450px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tr.total td {
    font-weight: bold;
    font-size: 11pt;
    background-color: hsla(207, 100%, 86%, 0.4);
  }

  tr.total td.handle {
    text-align: left;
    padding: 10px 12px;
  }

  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 14px;
    vertical-align: middle;
    margin-right: 2px;
    padding: 2px;
  }

  td.no {
    font-weight: bold;
  }

  td.percent {
    min-width: 70px;
  }

  @media (prefers-color-scheme: dark) {
    .scan-result, td, th {
        border-color: #888;
    }

    th {
        background-color: hsl(207, 90%, 25%);
    }

    tr.total td {
        background-color: hsla(207, 90%, 25%, 0.4);
    }
  }
</style>
