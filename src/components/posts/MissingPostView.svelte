<script>
  import { getContext } from 'svelte';
  import ReferencedPostAuthorLink from './ReferencedPostAuthorLink.svelte';

  let { post } = getContext('post');
</script>

<p class="blocked-header">
  <i class="fa-solid fa-ban"></i> <span>Deleted post</span>
  <ReferencedPostAuthorLink />
</p>
