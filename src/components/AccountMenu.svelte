<script>
  import { showLoginDialog } from '../skythread.js';
  import { account } from '../models/account.svelte.js';
  import { getBaseLocation } from '../router.js';
  import AccountMenuButton from './AccountMenuButton.svelte';
  import LoadableImage from './LoadableImage.svelte';

  let menuVisible = $state(false);

  $effect(() => {
    let html = document.body.parentNode;

    html.addEventListener('click', (e) => {
      menuVisible = false;
    });
  });

  /** @param {Event} e */
  function toggleMenu(e) {
    e.stopPropagation();
    menuVisible = !menuVisible;
  }

  /** @param {Event} e */
  function toggleBiohazard(e) {
    e.preventDefault();

    let hazards = document.querySelectorAll('p.hidden-replies, .content > .post.blocked, .blocked > .load-post');

    if (account.biohazardEnabled === false) {
      account.biohazardEnabled = true;
      Array.from(hazards).forEach(p => { p.style.display = 'block' });
    } else {
      account.biohazardEnabled = false;
      Array.from(hazards).forEach(p => { p.style.display = 'none' });
    }
  }

  /** @param {Event} e */
  function toggleIncognito(e) {
    e.preventDefault();
    account.toggleIncognitoMode();
  }

  /** @param {Event} e */
  function showLoginScreen(e) {
    e.preventDefault();

    showLoginDialog();
    menuVisible = false;
  }

  /** @param {Event} e */
  function logOut(e) {
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
      showCheckmark={account.biohazardEnabled !== false}
    />

    {#if !account.loggedIn}
      <AccountMenuButton onclick={showLoginScreen} label="Log in" />
    {:else}
      <AccountMenuButton onclick={logOut} label="Log out" />
    {/if}

    <li class="link"><a href="{getBaseLocation()}">Home</a></li>
    <li class="link"><a href="?page=posting_stats">Posting stats</a></li>
    <li class="link"><a href="?page=like_stats">Like stats</a></li>
    <li class="link"><a href="?page=search">Timeline search</a></li>
    <li class="link"><a href="?page=search&mode=likes">Archive search</a></li>
  </ul>
</div>
