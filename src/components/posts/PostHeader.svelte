<script lang="ts">
  import { getContext } from 'svelte';
  import { Post } from '../../models/posts.js';
  import { PostPresenter } from '../../utils/post_presenter.js';
  import PostSubtreeLink from './PostSubtreeLink.svelte';

  let { post, placement }: { post: Post, placement: PostPlacement } = getContext('post');
  let presenter = new PostPresenter(post, placement);

  let avatar: HTMLImageElement | undefined = $state();

  $effect(() => {
    if (avatar) {
      let av = avatar;
      window.avatarPreloader.observe(av);

      return () => {
        window.avatarPreloader.unobserve(av);
      }
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

  {#if (post.replyCount > 0 && !post.isPageRoot) || ['quote', 'quotes', 'feed'].includes(placement)}
    <span class="separator">&bull;</span>

    {#if ['quote', 'quotes', 'feed'].includes(placement)}
      <PostSubtreeLink {post} title="Load thread" />
    {:else}
      <PostSubtreeLink {post} title="Load this subtree" />
    {/if}
  {/if}
</h2>
