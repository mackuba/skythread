<script>
  import { getContext } from 'svelte';
  import { linkToHashtagPage } from '../../router.js';

  let { post } = getContext('post');
</script>

<p class="tags">
  {#each post.tags as tag}
    <a href="{linkToHashtagPage(tag)}"># {tag}</a>
  {/each}
</p>
