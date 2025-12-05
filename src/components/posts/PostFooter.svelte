<script lang="ts">
  import { accountAPI } from '../../api.js';
  import { getPostContext } from './PostComponent.svelte';
  import { linkToPostThread, linkToQuotesPage } from '../../router.js';
  import { account } from '../../models/account.svelte.js';
  import { showLoginDialog } from '../Dialogs.svelte';
  import { showError, pluralize } from '../../utils.js';

  let { post, placement } = getPostContext();
  let { quoteCount }: { quoteCount: number | undefined } = $props();

  let isLiked = $state(post.liked);
  let likeCount = $state(post.likeCount);
  let isUnavailableForLiking = $state(false);

  async function onHeartClick() {
    try {
      if (post.hasViewerInfo) {
        await likePost();
      } else if (account.loggedIn) {
        await checkIfCanBeLiked();
      } else {
        showLoginDialog({ showClose: true });
      }
    } catch (error) {
      showError(error);
    }
  }

  async function checkIfCanBeLiked() {
    let data = await accountAPI.loadPostViewerInfo(post);

    if (data) {
      if (post.liked) {
        isLiked = true;
      } else {
        await likePost();
      }
    } else {
      isUnavailableForLiking = true;
    }
  }

  async function likePost() {
    if (!isLiked) {
      let like = await accountAPI.likePost(post);
      post.viewerLike = like.uri;

      isLiked = true;
      likeCount += 1;
    } else {
      await accountAPI.removeLike(post.viewerLike);
      post.viewerLike = undefined;

      isLiked = false;
      likeCount -= 1;
    }
  }
</script>

<p class="stats">
  <span>
    <i class="fa-solid fa-heart {isLiked ? 'liked' : ''}" onclick={onHeartClick}></i> <output>{likeCount}</output>
  </span>

  {#if post.repostCount > 0}
    <span><i class="fa-solid fa-retweet"></i> {post.repostCount}</span>
  {/if}

  {#if post.replyCount > 0 && (placement == 'quotes' || placement == 'feed')}
    <span>
      <i class="fa-regular fa-message"></i>
      <a href="{linkToPostThread(post)}">{pluralize(post.replyCount, 'reply', 'replies')}</a>
    </span>
  {/if}

  {#if quoteCount && placement != 'quote'}
    {#if placement == 'quotes' || placement == 'feed' || post.isPageRoot}
      <span>
        <i class="fa-regular fa-comments"></i>
        <a href={linkToQuotesPage(post.linkToPost)}>{pluralize(quoteCount, 'quote')}</a>
      </span>
    {:else}
      <a href={linkToQuotesPage(post.linkToPost)}>
        <i class="fa-regular fa-comments"></i> {quoteCount}
      </a>
    {/if}
  {/if}

  {#if placement == 'thread' && post.isRestrictingReplies}
    <span><i class="fa-solid fa-ban"></i> Limited replies</span>
  {/if}

  {#if isUnavailableForLiking}
    <span class="blocked-info">🚫 Post unavailable</span>
  {/if}
</p>

<style>
  .stats {
    font-size: 10pt;
    color: #666;
  }

  a {
    color: #666;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  i {
    font-size: 9pt;
    color: #888;
  }

  i.fa-heart {
    color: #aaa;
  }

  i.fa-heart.liked {
    color: #e03030;
  }

  i.fa-heart:hover {
    color: #888;
    cursor: pointer;
  }

  i.fa-heart.liked:hover {
    color: #c02020;
  }

  span {
    margin-right: 7px;
  }

  .blocked-info {
    color: #a02020;
    font-weight: bold;
    margin-left: 5px;
  }

  @media (prefers-color-scheme: dark) {
    .stats { color: #aaa; }
    i { color: #888; }
    i.fa-heart { color: #aaa; }
    i.fa-heart.liked { color: #f04040; }
    i.fa-heart:hover { color: #eee; }
    i.fa-heart.liked:hover { color: #ff7070; }
  }
</style>
