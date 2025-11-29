import * as svelte from 'svelte';
import AccountMenu from './components/AccountMenu.svelte';
import BiohazardDialog from './components/BiohazardDialog.svelte';
import HashtagPage from './pages/HashtagPage.svelte';
import HomeSearch from './components/HomeSearch.svelte';
import LoginDialog from './components/LoginDialog.svelte';
import LikeStatsPage from './pages/LikeStatsPage.svelte';
import LycanSearchPage from './pages/LycanSearchPage.svelte';
import NotificationsPage from './pages/NotificationsPage.svelte';
import PostingStatsPage from './pages/PostingStatsPage.svelte';
import QuotesPage from './pages/QuotesPage.svelte';
import TimelineSearchPage from './pages/TimelineSearchPage.svelte';
import ThreadPage from './pages/ThreadPage.svelte';

import { $id } from './utils.js';
import { AuthenticatedAPI, BlueskyAPI } from './api.js';
import { account } from './models/account.svelte.js';
import { Lycan, DevLycan } from './services/lycan.js';

/** @type {Record<string, any> | undefined} */
let loginDialog;

/** @type {Record<string, any> | undefined} */
let biohazardDialog;


function init() {
  svelte.mount(AccountMenu, { target: $id('account_menu_wrap') });

  for (let dialog of document.querySelectorAll('.dialog')) {
    let close = /** @type HTMLElement */ (dialog.querySelector('.close'));

    dialog.addEventListener('click', (e) => {
      if (e.target === e.currentTarget && close && close.offsetHeight > 0) {
        hideDialog(dialog);
      } else {
        e.stopPropagation();
      }
    });

    close?.addEventListener('click', (e) => {
      hideDialog(dialog);
    });
  }

  window.appView = new BlueskyAPI('api.bsky.app');
  window.blueAPI = new BlueskyAPI('blue.mackuba.eu');
  window.accountAPI = new AuthenticatedAPI();
  window.api = (accountAPI.isLoggedIn && !account.isIncognito) ? accountAPI : appView;

  parseQueryParams();
}

function parseQueryParams() {
  let params = new URLSearchParams(location.search);
  let { q, author, post, quotes, hash, page } = Object.fromEntries(params);

  if (quotes) {
    loadQuotesPage(decodeURIComponent(quotes));
  } else if (hash) {
    loadHashtagPage(decodeURIComponent(hash));
  } else if (q) {
    svelte.mount(ThreadPage, { target: $id('thread'), props: { url: q }});
  } else if (author && post) {
    svelte.mount(ThreadPage, { target: $id('thread'), props: { author: author, rkey: post }});
  } else if (page) {
    openPage(page);
  } else {
    showSearch();
  }
}

function showSearch() {
  let search = $id('search');
  svelte.mount(HomeSearch, { target: search });
  search.style.visibility = 'visible';
}

function hideDialog(dialog) {
  dialog.style.visibility = 'hidden';
  dialog.classList.remove('expanded');
  $id('thread').classList.remove('overlay');

  for (let field of dialog.querySelectorAll('input[type=text]')) {
    field.value = '';
  }
}

/** @param {boolean} showClose */

function showLoginDialog(showClose = true) {
  if (loginDialog) {
    return;
  }

  let dialog = $id('login');
  let props = {};

  if (showClose) {
    props.onClose = (e) => {
      e.preventDefault();
      hideLoginDialog();
    };
  }

  dialog.addEventListener('click', (e) => {
    if (e.target === e.currentTarget && showClose) {
      hideLoginDialog();
    } else {
      e.stopPropagation();
    }
  });

  loginDialog = svelte.mount(LoginDialog, { target: dialog, props });

  dialog.style.visibility = 'visible';
  $id('thread').classList.add('overlay');
}

function hideLoginDialog() {
  if (loginDialog) {
    svelte.unmount(loginDialog);
    loginDialog = undefined;

    $id('login').style.visibility = 'hidden';
    $id('thread').classList.remove('overlay');
  }
}

/** @param {(() => void)=} onConfirm */

function showBiohazardDialog(onConfirm) {
  if (biohazardDialog) {
    return;
  }

  let dialog = $id('biohazard_dialog');

  dialog.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      hideBiohazardDialog();
    } else {
      e.stopPropagation();
    }
  });

  biohazardDialog = svelte.mount(BiohazardDialog, {
    target: dialog,
    props: {
      onConfirm: onConfirm,
      onClose: (e) => {
        e?.preventDefault();
        hideBiohazardDialog();
      }
    }
  });

  dialog.style.visibility = 'visible';
  $id('thread').classList.add('overlay');
}

function hideBiohazardDialog() {
  if (biohazardDialog) {
    svelte.unmount(biohazardDialog);
    biohazardDialog = undefined;

    $id('biohazard_dialog').style.visibility = 'hidden';
    $id('thread').classList.remove('overlay');
  }
}

/** @param {string} identifier, @param {string} password, @returns {Promise<void>} */

async function submitLogin(identifier, password) {
  let pds = await account.logIn(identifier, password);

  window.api = pds;
  window.accountAPI = pds;

  hideLoginDialog();

  let params = new URLSearchParams(location.search);
  let page = params.get('page');
  if (page) {
    openPage(page);
  }
}

/** @param {string} page */

function openPage(page) {
  if (!accountAPI.isLoggedIn) {
    showLoginDialog(false);
    return;
  }

  if (page == 'notif') {
    let div = $id('thread');
    div.classList.add('notifications');
    svelte.mount(NotificationsPage, { target: div });
  } else if (page == 'posting_stats') {
    let div = $id('posting_stats_page');
    svelte.mount(PostingStatsPage, { target: div });
    div.style.display = 'block';
  } else if (page == 'like_stats') {
    let div = $id('like_stats_page');
    svelte.mount(LikeStatsPage, { target: div });
    div.style.display = 'block';
  } else if (page == 'search') {
    let params = new URLSearchParams(location.search);
    let div = $id('private_search_page');

    if (params.get('mode') == 'likes') {
      let lycan = (params.get('lycan') == 'local') ? new DevLycan() : new Lycan();
      svelte.mount(LycanSearchPage, { target: div, props: { lycan }});
    } else {
      svelte.mount(TimelineSearchPage, { target: div });
    }

    div.style.display = 'block';
  }
}

/** @param {string} hashtag */

function loadHashtagPage(hashtag) {
  let div = $id('thread');
  div.classList.add('hashtag');

  svelte.mount(HashtagPage, { target: div, props: { hashtag }});
}

/** @param {string} postURL */

function loadQuotesPage(postURL) {
  let div = $id('thread');
  div.classList.add('quotes');

  svelte.mount(QuotesPage, { target: div, props: { postURL }});
}

window.init = init;
window.BlueskyAPI = BlueskyAPI;

export { showLoginDialog, showBiohazardDialog, submitLogin };
