<script lang="ts">
  import { linkToPostThread } from '../../router.js';
  import { Post } from '../../models/posts.js';

  let { post, title = '' }: { post: Post, title?: string } = $props();
</script>

<a href="{linkToPostThread(post)}" class="action" {title}>
  <i class="fa-solid fa-arrows-split-up-and-left fa-rotate-180"></i>
</a>
