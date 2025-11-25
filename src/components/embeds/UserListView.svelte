<script lang="ts">
  import { atURI } from '../../utils.js';
  import { UserListRecord } from '../../models/records.js';

  let { list }: { list: UserListRecord } = $props();

  function linkToList(list: UserListRecord) {
    let { repo, rkey } = atURI(list.uri);
    return `https://bsky.app/profile/${repo}/lists/${rkey}`;
  }

  function listType(list: UserListRecord) {
    switch (list.purpose) {
    case 'app.bsky.graph.defs#curatelist':
      return "User list";
    case 'app.bsky.graph.defs#modlist':
      return "Mute list";
    default:
      return "List";
    }
  }
</script>

<a class="link-card record" href={linkToList(list)} target="_blank">
  <div>
    {#if list.avatar}
      <img class="avatar" alt="Avatar" src={list.avatar}>
    {/if}

    <h2>{list.title} <span class="handle">• {listType(list)} by @{list.author.handle}</span></h2>

    {#if list.description}
      <p class="description">{list.description}</p>
    {/if}
  </div>
</a>
