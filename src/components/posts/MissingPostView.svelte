<script lang="ts">
  import { getContext } from 'svelte';
  import { Post } from '../../models/posts';
  import ReferencedPostAuthorLink from './ReferencedPostAuthorLink.svelte';

  let { post }: { post: Post } = getContext('post');
</script>

<p class="blocked-header">
  <i class="fa-solid fa-ban"></i> <span>Deleted post</span>
  <ReferencedPostAuthorLink />
</p>
