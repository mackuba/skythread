<script lang="ts">
  import { Post, BlockedPost, DetachedQuotePost } from '../../models/posts.js';

  import BlockedPostView from './BlockedPostView.svelte';
  import MissingPostView from './MissingPostView.svelte';
  import PostComponent from './PostComponent.svelte';

  /**
    Contexts:
    - thread - a post in the thread tree
    - parent - parent reference above the thread root
    - quote - a quote embed
    - quotes - a post on the quotes page
    - feed - a post on the hashtag feed page
  */

  let { post, placement }: { post: AnyPost, placement: PostPlacement } = $props();
</script>

{#if post instanceof Post}
  <PostComponent {post} {placement} />
{:else}
  <div class="post post-{placement} blocked">
    {#if post instanceof BlockedPost}
      <BlockedPostView {post} {placement} reason="Blocked post" />
    {:else if post instanceof DetachedQuotePost}
      <BlockedPostView {post} {placement} reason="Hidden quote" />
    {:else}
      <MissingPostView {post} />
    {/if}
  </div>
{/if}

<style>
  .post.blocked :global {
    p, a {
      font-size: 11pt;
      color: #666;
    }

    @media (prefers-color-scheme: dark) {
      p, a { color: #aaa; }
    }
  }

  :global {
    .post p {
      margin-top: 10px;
    }

    .post .blocked-header i {
      margin-right: 2px;
    }

    .post h2 .separator, .post .blocked-header .separator, .blocked-header .separator {
      color: #888;
      font-weight: normal;
      font-size: 11pt;
      vertical-align: text-top;
    }

    .post h2 .action, .post .blocked-header .action, .blocked-header .action {
      color: #888;
      font-weight: normal;
      font-size: 10pt;
      vertical-align: text-top;
    }

    .post h2 .action:hover, .post .blocked-header .action:hover, .blocked-header .action:hover {
      color: #444;
    }
  }
</style>
