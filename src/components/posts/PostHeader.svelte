<script>
  import { getContext } from 'svelte';
  import { linkToPostThread } from '../../router.js';

  let { post, context, presenter } = getContext('post');

  let avatar;

  $effect(() => {
    if (avatar) {
      window.avatarPreloader.observe(avatar);
    }
  });
</script>

<h2>
  {#if post.muted}
    <i class="missing fa-regular fa-circle-user fa-2x"></i>
  {:else if post.author.avatar}
    <img class="avatar" alt="Avatar" loading="lazy" src={post.author.avatar} bind:this={avatar}>
  {:else}
    <i class="missing fa-regular fa-face-smile fa-2x"></i>
  {/if}

  {post.authorDisplayName}

  {#if post.isFediPost}
    <a class="handle" href="{post.linkToAuthor}" target="_blank">@{post.authorFediHandle}</a>
    <img src="icons/mastodon.svg" class="mastodon" alt="Mastodon logo">
  {:else}
    <a class="handle" href="{post.linkToAuthor}" target="_blank">{post.hasValidHandle ? `@${post.author.handle}` : '[invalid handle]'}</a>
  {/if}

  <span class="separator">&bull;</span>

  <a class="time" href="{post.linkToPost}" target="_blank" title="{post.createdAt.toISOString()}">{presenter.formattedTimestamp}</a>

  {#if (post.replyCount > 0 && !post.isRoot) || ['quote', 'quotes', 'feed'].includes(context)}
    <span class="separator">&bull;</span>

    <a href="{linkToPostThread(post)}" class="action" title="Load this subtree">
      <i class="fa-solid fa-arrows-split-up-and-left fa-rotate-180"></i>
    </a>
  {/if}
</h2>
