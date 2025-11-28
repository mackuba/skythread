<script lang="ts">
  import { getPostContext } from './PostComponent.svelte';
  import { linkToHashtagPage } from '../../router.js';

  let { post } = getPostContext();
</script>

<p class="tags">
  {#each post.tags as tag}
    <a href="{linkToHashtagPage(tag)}"># {tag}</a>
  {/each}
</p>
