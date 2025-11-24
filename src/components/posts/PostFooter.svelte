<script>
  import { getContext } from 'svelte';
  import { linkToPostThread, linkToQuotesPage } from '../../router.js';
  import { account } from '../../models/account.svelte.js';
  import { showLoginDialog } from '../../skythread.js';
  import { showError } from '../../utils.js';

  let { post, context } = getContext('post');
  let { quoteCount } = $props();

  let isLiked = $state(post.liked);
  let likeCount = $state(post.likeCount);
  let isUnavailableForLiking = $state(false);

  /** @returns {Promise<void>} */

  async function onHeartClick() {
    try {
      if (post.hasViewerInfo) {
        await likePost();
      } else if (account.loggedIn) {
        await checkIfCanBeLiked();
      } else {
        showLoginDialog();
      }
    } catch (error) {
      showError(error);
    }
  }

  /** @returns {Promise<void>} */

  async function checkIfCanBeLiked() {
    let data = await accountAPI.loadViewerInfo();

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

  /** @returns {Promise<void>} */

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

  {#if post.replyCount > 0 && (context == 'quotes' || context == 'feed')}
    <span>
      <i class="fa-regular fa-message"></i>
      <a href="{linkToPostThread(post)}">{post.replyCount > 1 ? `${post.replyCount} replies` : '1 reply'}</a>
    </span>
  {/if}

  {#if quoteCount && context != 'quote'}
    {#if context == 'quotes' || context == 'feed' || post.isPageRoot}
      <span>
        <i class="fa-regular fa-comments"></i>
        <a href={linkToQuotesPage(post.linkToPost)}>{quoteCount > 1 ? `${quoteCount} quotes` : '1 quote'}</a>
      </span>
    {:else}
      <a href={linkToQuotesPage(post.linkToPost)}>
        <i class="fa-regular fa-comments"></i> {quoteCount}
      </a>
    {/if}
  {/if}

  {#if context == 'thread' && post.isRestrictingReplies}
    <span><i class="fa-solid fa-ban"></i> Limited replies</span>
  {/if}

  {#if isUnavailableForLiking}
    <span class="blocked-info">🚫 Post unavailable</span>
  {/if}
</p>
