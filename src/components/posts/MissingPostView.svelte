<script lang="ts">
  import { MissingPost } from '../../models/posts';
  import ReferencedPostAuthorLink from './ReferencedPostAuthorLink.svelte';

  let { post }: { post: MissingPost } = $props();
</script>

<p class="blocked-header">
  <i class="fa-solid fa-ban"></i> <span>Deleted post</span>
  <ReferencedPostAuthorLink {post} />
</p>
