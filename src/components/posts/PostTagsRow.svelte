<script lang="ts">
  import { getContext } from 'svelte';
  import { Post } from '../../models/posts.js';
  import { linkToHashtagPage } from '../../router.js';

  let { post }: { post: Post } = getContext('post');
</script>

<p class="tags">
  {#each post.tags as tag}
    <a href="{linkToHashtagPage(tag)}"># {tag}</a>
  {/each}
</p>
