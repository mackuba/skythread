<script>
  import { atURI } from '../../utils.js';

  let { feed } = $props();

  function linkToFeed(feed) {
    let { repo, rkey } = atURI(feed.uri);
    return `https://bsky.app/profile/${repo}/feed/${rkey}`;
  }
</script>

<a class="link-card record" href={linkToFeed(feed)} target="_blank">
  <div>
    {#if feed.avatar}
      <img class="avatar" alt="Avatar" src={feed.avatar}>
    {/if}

    <h2>{feed.title} <span class="handle">• Feed by @{feed.author.handle}</span></h2>

    {#if feed.description}
      <p class="description">{feed.description}</p>
    {/if}

    <p class="stats">
      <i class="fa-solid fa-heart"></i> <output>{feed.likeCount}</output>
    </p>
  </div>
</a>
