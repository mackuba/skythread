<script>
  import { linkToPostThread } from '../../router.js';

  let { post, title = '' } = $props();
</script>

<a href="{linkToPostThread(post)}" class="action" {title}>
  <i class="fa-solid fa-arrows-split-up-and-left fa-rotate-180"></i>
</a>
