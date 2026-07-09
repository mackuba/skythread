<script lang="ts">
  import { getPostContext } from './PostComponent.svelte';
  import { avatarPreloader } from '../../utils/avatar_preloader.js';
  import { PostPresenter } from '../../utils/post_presenter.js';
  import PostSubtreeLink from './PostSubtreeLink.svelte';
  import ProfilePopover from '../ProfilePopover.svelte';

  let { post, placement } = getPostContext();
  let presenter = new PostPresenter(post, placement);

  let avatar: HTMLImageElement | undefined = $state();
  let activeAnchor: HTMLElement | undefined = $state();
  let anchorHovered = $state(false);

  $effect(() => {
    if (avatar) {
      avatarPreloader.observe(avatar);
    }

    return () => {
      avatar && avatarPreloader.unobserve(avatar);
    };
  });

  function showPopover(event: MouseEvent) {
    activeAnchor = event.currentTarget as HTMLElement;
    anchorHovered = true;
  }

  function hidePopover() {
    anchorHovered = false;
  }

  function unmountPopover() {
    activeAnchor = undefined;
    anchorHovered = false;
  }
</script>

<div class="post-header">
  <h2>
    <span class="avatar-wrapper" onmouseenter={showPopover} onmouseleave={hidePopover}>
      {#if post.muted}
        <i class="muted-avatar fa-regular fa-circle-user fa-2x"></i>
      {:else if post.author.avatar}
        <img class="avatar" alt="Avatar" loading="lazy" src={post.author.avatar} bind:this={avatar}>
      {:else}
        <i class="no-avatar fa-regular fa-face-smile fa-2x"></i>
      {/if}
    </span>

    {post.authorDisplayName}

    {#if post.isFediPost}
      <a class="handle" href="{post.linkToAuthor}" target="_blank" onmouseenter={showPopover} onmouseleave={hidePopover}>@{post.authorFediHandle}</a>
      <img src="icons/mastodon.svg" class="mastodon" alt="Mastodon logo">
    {:else}
      <a class="handle" href="{post.linkToAuthor}" target="_blank" onmouseenter={showPopover} onmouseleave={hidePopover}>{post.hasValidHandle ? `@${post.author.handle}` : '[invalid handle]'}</a>
      {#if post.authorIsBot}
        <i class="is-bot fa-solid fa-robot fa-sm" title="Automated account"></i>
      {/if}
    {/if}

    <span class="separator">&bull;</span>

    <a class="time" href="{post.linkToPost}" target="_blank" title="{post.createdAt.toISOString()}">{presenter.formattedTimestamp}</a>

    {#if (post.replyCount && post.replyCount > 0 && !post.isPageRoot) || ['quote', 'quotes', 'feed'].includes(placement)}
      <span class="separator">&bull;</span>

      {#if ['quote', 'quotes', 'feed'].includes(placement)}
        <PostSubtreeLink {post} title="Load thread" />
      {:else}
        <PostSubtreeLink {post} title="Load this subtree" />
      {/if}
    {/if}
  </h2>

  {#if activeAnchor}
    <ProfilePopover did={post.author.did} anchor={activeAnchor} {anchorHovered} onDismissed={unmountPopover} />
  {/if}
</div>

<style>
  .post-header {
    anchor-scope: --profile-popover-anchor;
  }

  h2 {
    font-size: 12pt;
    margin-bottom: 0;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    vertical-align: middle;
    margin-bottom: 3px;
    margin-right: 4px;
  }

  .no-avatar, .muted-avatar {
    color: #aaa;
    background-color: #eee;
    border-radius: 16px;
    vertical-align: middle;
    margin-right: 4px;
  }

  .muted-avatar {
    color: #bbb;
  }

  .handle {
    color: #888;
    font-weight: normal;
    font-size: 11pt;
    vertical-align: text-top;
  }

  .mastodon {
    width: 15px;
    position: relative;
    top: 2px;
    margin-left: 3px;
  }

  .is-bot {
    color: #888;
    vertical-align: 2px;
    margin-left: 3px;
  }

  .time {
    color: #666;
    font-weight: normal;
    font-size: 10pt;
    vertical-align: text-top;
  }

  @media (prefers-color-scheme: dark) {
    .handle { color: #888; }
    .separator { color: #888; }
    .time { color: #aaa; }
    h2 :global(.action) { color: #888; }
  }
</style>
