<script lang="ts">
  import { showLoginDialog } from './Dialogs.svelte';
  import { account } from '../models/account.svelte.js';
  import { settings } from '../models/settings.svelte.js';
  import { getBaseLocation } from '../router.js';
  import AccountMenuButton from './AccountMenuButton.svelte';
  import LoadableImage from './LoadableImage.svelte';

  let menuVisible = $state(false);

  $effect(() => {
    let html = document.body.parentNode!
    html.addEventListener('click', hideMenu);

    return () => {
      html.removeEventListener('click', hideMenu);
    };
  });

  function hideMenu() {
    menuVisible = false;
  }

  function toggleMenu(e: Event) {
    e.stopPropagation();
    menuVisible = !menuVisible;
  }

  function toggleBiohazard(e: Event) {
    e.preventDefault();

    if (settings.biohazardsEnabled === false) {
      settings.biohazardsEnabled = true;
    } else {
      settings.biohazardsEnabled = false;
    }
  }

  function toggleIncognito(e: Event) {
    e.preventDefault();
    account.toggleIncognitoMode();
  }

  function showLoginScreen(e: Event) {
    e.preventDefault();

    showLoginDialog({ showClose: true });
    menuVisible = false;
  }

  function logOut(e: Event) {
    e.preventDefault();
    account.logOut();
  }
</script>

<div id="account" onclick={toggleMenu} class={{ active: menuVisible }}>
  {#if account.isIncognito}
    <i class="fa-solid fa-user-secret fa-lg"></i>

  {:else if !account.loggedIn || account.avatarIsLoading}
    <i class="fa-regular fa-user-circle fa-xl"></i>

  {:else if account.loggedIn && account.avatarURL}
    <LoadableImage class="avatar" src={account.avatarURL}>
      {#snippet loading()}
        <i class="fa-regular fa-user-circle fa-xl"></i>
      {/snippet}
      {#snippet error()}
        <i class="fa-solid fa-user-circle fa-xl"></i>
      {/snippet}
    </LoadableImage>

  {:else}
    <i class="fa-solid fa-user-circle fa-xl"></i>
  {/if}
</div>

<div id="account_menu" style="visibility: {menuVisible ? 'visible' : 'hidden'}" onclick={(e) => e.stopPropagation()}>
  <ul>
    {#if account.loggedIn}
      <AccountMenuButton
        onclick={toggleIncognito}
        label="Incognito mode"
        title="Temporarily load threads as a logged-out user"
        showCheckmark={account.isIncognito}
      />
    {/if}

    <AccountMenuButton
      onclick={toggleBiohazard}
      label="Show infohazards"
      title="Show links to blocked and hidden comments"
      showCheckmark={settings.biohazardsEnabled !== false}
    />

    {#if !account.loggedIn}
      <AccountMenuButton onclick={showLoginScreen} label="Log in" />
    {:else}
      <AccountMenuButton onclick={logOut} label="Log out" />
    {/if}

    <li class="link"><a href={getBaseLocation()}>Home</a></li>
    <li class="link"><a href="?page=posting_stats">Posting stats</a></li>
    <li class="link"><a href="?page=like_stats">Like stats</a></li>
    <li class="link"><a href="?page=search">Timeline search</a></li>
    <li class="link"><a href="?page=search&mode=likes">Archive search</a></li>
  </ul>
</div>

<style>
  #account {
    position: fixed;
    top: 10px;
    left: 10px;
    line-height: 24px;
    z-index: 20;
    user-select: none;
    -webkit-user-select: none;
  }

  #account i {
    opacity: 0.4;
  }

  #account i:hover {
    cursor: pointer;
    opacity: 0.6;
  }

  #account :global(img.avatar) {
    width: 24px;
    height: 24px;
    border-radius: 13px;
    box-shadow: 0px 0px 2px black;
  }

  #account_menu {
    position: fixed;
    visibility: hidden;
    top: 5px;
    left: 5px;
    padding-top: 30px;
    z-index: 15;
    background: hsl(210, 33.33%, 94.0%);
    border: 1px solid #ccc;
    border-radius: 5px;
    user-select: none;
    -webkit-user-select: none;
  }

  #account_menu ul {
    list-style-type: none;
    margin: 0px 0px 10px;
    padding: 6px 11px;
  }

  #account_menu :global(li:not(.link) + li.link) {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px solid #ccc;
  }

  li.link {
    margin-top: 8px;
    margin-left: 2px;
  }

  li.link a {
    font-size: 11pt;
    color: #333;
  }

  @media (prefers-color-scheme: dark) {
    #account_menu {
      background: hsl(210, 11.81%, 24.9%);
      border-color: hsl(210, 19.61%, 40%);
    }

    li.link a {
      color: #ccc;
    }

    #account_menu :global(li:not(.link) + li.link) {
      border-top-color: hsl(210, 19.61%, 40%);
    }
  }
</style>
