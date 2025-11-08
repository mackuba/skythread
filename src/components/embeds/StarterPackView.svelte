<script>
  import { atURI } from '../../utils.js';

  let { starterPack } = $props();

  function linkToStarterPack(starterPack) {
    let { repo, rkey } = atURI(starterPack.uri);
    return `https://bsky.app/starter-pack/${repo}/${rkey}`;
  }
</script>

<a class="link-card record" href={linkToStarterPack(starterPack)} target="_blank">
  <div>
    <h2>{starterPack.title} <span class="handle">• Starter pack by @{starterPack.author.handle}</span></h2>

    {#if starterPack.description}
      <p class="description">{starterPack.description}</p>
    {/if}
  </div>
</a>
