<script lang="ts">
  import { account } from './models/account.svelte.js';

  import AccountMenu from './components/AccountMenu.svelte';
  import HashtagPage from './pages/HashtagPage.svelte';
  import HomeSearch from './components/HomeSearch.svelte';
  import LikeStatsPage from './pages/LikeStatsPage.svelte';
  import LoginDialog from './components/LoginDialog.svelte';
  import LycanSearchPage from './pages/LycanSearchPage.svelte';
  import NotificationsPage from './pages/NotificationsPage.svelte';
  import PostingStatsPage from './pages/PostingStatsPage.svelte';
  import QuotesPage from './pages/QuotesPage.svelte';
  import ThreadPage from './pages/ThreadPage.svelte';
  import TimelineSearchPage from './pages/TimelineSearchPage.svelte';

  let { params }: { params: Record<string, string> } = $props();
</script>

<AccountMenu />

{#if params.q}
  <ThreadPage url={params.q} />
{:else if params.author && params.post}
  <ThreadPage author={params.author} rkey={params.post} />
{:else if params.quotes}
  <QuotesPage postURL={params.quotes} />
{:else if params.hash}
  <HashtagPage hashtag={params.hash} />
{:else if params.page}
  {#if account.loggedIn}
    {@render page(params.page)}
  {:else}
    <LoginDialog />
  {/if}
{:else}
  <HomeSearch />
{/if}

{#snippet page(name)}
  {#if params.page == 'notif'}
    <NotificationsPage />
  {:else if params.page == 'posting_stats'}
    <PostingStatsPage />
  {:else if params.page == 'like_stats'}
    <LikeStatsPage />
  {:else if params.page == 'search'}
    {#if params.mode == 'likes'}
      <LycanSearchPage lycan={params.lycan} />
    {:else}
      <TimelineSearchPage />
    {/if}
  {:else}
    <HomeSearch />
  {/if}
{/snippet}
