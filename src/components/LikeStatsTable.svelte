<script>
  let { cssClass, header, users } = $props();
</script>

<table class="scan-result {cssClass}" style="display: table;">
  <thead>
    <tr><th colspan="3">{header}</th></tr>
  </thead>
  <tbody>
    {#each users as user, i}
      <tr>
        <td class="no">{i + 1}</td>
        <td class="handle"><img class="avatar" src="{user.avatar}">
          <a href="https://bsky.app/profile/{user.handle}" target="_blank">{user.handle}</a>
        </td>
        <td class="count">{user.count}</td>
      </tr>
    {/each}
  </tbody>
</table>
