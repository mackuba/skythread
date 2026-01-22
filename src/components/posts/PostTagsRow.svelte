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

<style>
  a {
    background-color: hsl(210, 90%, 97%);
    border: 1px solid hsl(215, 90%, 85%);
    border-radius: 6px;
    padding: 3px 7px;
    margin-right: 5px;
    font-size: 10pt;
    color: #333;
  }

  a:hover {
    text-decoration: none;
    background-color: hsl(210, 90%, 93%);
  }
</style>