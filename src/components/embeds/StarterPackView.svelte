<script lang="ts">
  import { linkToBluesky } from '../../linker.js';
  import { atURI } from '../../utils.js';
  import { StarterPackRecord } from '../../models/records.js';

  let { starterPack }: { starterPack: StarterPackRecord } = $props();

  function linkToStarterPack(starterPack: StarterPackRecord) {
    let { repo, rkey } = atURI(starterPack.uri);
    return linkToBluesky(`/starter-pack/${repo}/${rkey}`);
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
