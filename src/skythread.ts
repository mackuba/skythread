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

import { BlueskyAPI, accountAPI } from './api.js';
import { account } from './models/account.svelte.js';
import { Lycan, DevLycan } from './services/lycan.js';

let loginDialog: Record<string, any> | undefined;
let biohazardDialog: Record<string, any> | undefined;


function init() {
  svelte.mount(AccountMenu, { target: document.getElementById('account_menu_wrap')! });

  for (let dialog of document.querySelectorAll('.dialog')) {
    let close = dialog.querySelector('.close') as HTMLElement;

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
    svelte.mount(ThreadPage, { target: document.getElementById('thread')!, props: { url: q }});
  } else if (author && post) {
    svelte.mount(ThreadPage, { target: document.getElementById('thread')!, props: { author: author, rkey: post }});
  } else if (page) {
    openPage(page);
  } else {
    showSearch();
  }
}

function showSearch() {
  let search = document.getElementById('search')!
  svelte.mount(HomeSearch, { target: search });
  search.style.visibility = 'visible';
}

function hideDialog(dialog) {
  dialog.style.visibility = 'hidden';
  dialog.classList.remove('expanded');
  document.getElementById('thread')!.classList.remove('overlay');

  for (let field of dialog.querySelectorAll('input[type=text]')) {
    field.value = '';
  }
}

function showLoginDialog(showClose: boolean = true) {
  if (loginDialog) {
    return;
  }

  let dialog = document.getElementById('login')!

  let props = {
    onClose: showClose ? hideLoginDialog : undefined
  };

  dialog.addEventListener('click', (e) => {
    if (e.target === e.currentTarget && showClose) {
      hideLoginDialog();
    } else {
      e.stopPropagation();
    }
  });

  loginDialog = svelte.mount(LoginDialog, { target: dialog, props });

  dialog.style.visibility = 'visible';
  document.getElementById('thread')!.classList.add('overlay');
}

function hideLoginDialog() {
  if (loginDialog) {
    svelte.unmount(loginDialog);
    loginDialog = undefined;

    document.getElementById('login')!.style.visibility = 'hidden';
    document.getElementById('thread')!.classList.remove('overlay');
  }
}

function showBiohazardDialog(onConfirm?: () => void) {
  if (biohazardDialog) {
    return;
  }

  let dialog = document.getElementById('biohazard_dialog')!

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
      onClose: hideBiohazardDialog
    }
  });

  dialog.style.visibility = 'visible';
  document.getElementById('thread')!.classList.add('overlay');
}

function hideBiohazardDialog() {
  if (biohazardDialog) {
    svelte.unmount(biohazardDialog);
    biohazardDialog = undefined;

    document.getElementById('biohazard_dialog')!.style.visibility = 'hidden';
    document.getElementById('thread')!.classList.remove('overlay');
  }
}

async function submitLogin(identifier: string, password: string) {
  await account.logIn(identifier, password);

  hideLoginDialog();

  let params = new URLSearchParams(location.search);
  let page = params.get('page');
  if (page) {
    openPage(page);
  }
}

function openPage(page: string) {
  if (!accountAPI.isLoggedIn) {
    showLoginDialog(false);
    return;
  }

  if (page == 'notif') {
    let div = document.getElementById('thread')!
    div.classList.add('notifications');
    svelte.mount(NotificationsPage, { target: div });
  } else if (page == 'posting_stats') {
    let div = document.getElementById('posting_stats_page')!
    svelte.mount(PostingStatsPage, { target: div });
    div.style.display = 'block';
  } else if (page == 'like_stats') {
    let div = document.getElementById('like_stats_page')!
    svelte.mount(LikeStatsPage, { target: div });
    div.style.display = 'block';
  } else if (page == 'search') {
    let params = new URLSearchParams(location.search);
    let div = document.getElementById('private_search_page')!

    if (params.get('mode') == 'likes') {
      let lycan = (params.get('lycan') == 'local') ? new DevLycan() : new Lycan();
      svelte.mount(LycanSearchPage, { target: div, props: { lycan }});
    } else {
      svelte.mount(TimelineSearchPage, { target: div });
    }

    div.style.display = 'block';
  }
}

function loadHashtagPage(hashtag: string) {
  let div = document.getElementById('thread')!
  div.classList.add('hashtag');

  svelte.mount(HashtagPage, { target: div, props: { hashtag }});
}

function loadQuotesPage(postURL: string) {
  let div = document.getElementById('thread')!
  div.classList.add('quotes');

  svelte.mount(QuotesPage, { target: div, props: { postURL }});
}

window.init = init;
window.BlueskyAPI = BlueskyAPI;

export { showLoginDialog, showBiohazardDialog, submitLogin };
