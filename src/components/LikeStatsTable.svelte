<script lang="ts">
  import type { LikeStat } from "../services/like_stats";

  let { cssClass, header, users }: { cssClass: string, header: string, users: LikeStat[] } = $props();
</script>

<table class="scan-result {cssClass}">
  <thead>
    <tr><th colspan="3">{header}</th></tr>
  </thead>
  <tbody>
    {#each users as user, i}
      <tr>
        <td class="no">{i + 1}</td>
        <td class="handle"><div class="handle-content">
          <img class="avatar" alt="Avatar" src="{user.avatar}">
          <a class="handle-link" href="https://bsky.app/profile/{user.handle}" target="_blank">{user.handle}</a>
        </div>
        </td>
        <td class="count">{user.count}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .scan-result {
    border: 1px solid #333;
    border-collapse: collapse;
    margin: 20px auto 40px;
    width: 100%;
  }

  td, th {
    border: 1px solid #333;
    padding: 5px 10px;
  }

  th {
    text-align: center;
    background-color: hsl(207, 100%, 86%);
    padding: 12px 10px;
  }

  td.no {
    font-weight: bold;
    text-align: right;
  }

  td.handle {
  }

  td.count {
    padding: 5px 15px;
  }

  .handle-content {
    align-items: center;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    max-width: 100%;
  }

  .handle-link {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 14px;
    margin-right: 2px;
    padding: 2px;
  }

  @media (prefers-color-scheme: dark) {
    .scan-result, td, th {
      border-color: #888;
    }

    th {
      background-color: hsl(207, 90%, 25%);
    }
  }
</style>
