import * as svelte from 'svelte';
import AccountMenu from './components/AccountMenu.svelte';
import BiohazardDialog from './components/BiohazardDialog.svelte';
import HomeSearch from './components/HomeSearch.svelte';
import LoginDialog from './components/LoginDialog.svelte';
import LikeStatsPage from './pages/LikeStatsPage.svelte';
import LycanSearchPage from './pages/LycanSearchPage.svelte';
import PostingStatsPage from './pages/PostingStatsPage.svelte';
import TimelineSearchPage from './pages/TimelineSearchPage.svelte';

import { $, $id } from './utils.js';
import { $tag } from './utils_ts.js';
import * as paginator from './utils/paginator.js';
import { BlueskyAPI } from './api/api.js';
import { account } from './models/account.svelte.js';
import { Post } from './models/posts.js';
import { PostComponent } from './post_component.js';
import { ThreadPage } from './thread_page.js';
import { NotificationsPage } from './notifications_page.js';
import { Lycan, DevLycan } from './services/lycan.js';

/** @type {Record<string, any> | undefined} */
let loginDialog;

/** @type {Record<string, any> | undefined} */
let biohazardDialog;

/** @type {ThreadPage} */
let threadPage;

/** @type {NotificationsPage} */
let notificationsPage;


function init() {
  window.dateLocale = localStorage.getItem('locale') || undefined;
  window.avatarPreloader = buildAvatarPreloader();

  svelte.mount(AccountMenu, { target: $id('account_menu_wrap') });

  threadPage = new ThreadPage();
  notificationsPage = new NotificationsPage();

  for (let dialog of document.querySelectorAll('.dialog')) {
    let close = $(dialog.querySelector('.close'));

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

  window.appView = new BlueskyAPI('api.bsky.app', false);
  window.blueAPI = new BlueskyAPI('blue.mackuba.eu', false);
  window.accountAPI = new BlueskyAPI(undefined, true);

  if (accountAPI.isLoggedIn) {
    accountAPI.host = accountAPI.user.pdsEndpoint;

    if (!account.isIncognito) {
      window.api = accountAPI;
    } else {
      window.api = appView;
    }
  } else {
    window.api = appView;
  }

  parseQueryParams();
}

function parseQueryParams() {
  let params = new URLSearchParams(location.search);
  let { q, author, post, quotes, hash, page } = Object.fromEntries(params);

  if (quotes) {
    showLoader();
    loadQuotesPage(decodeURIComponent(quotes));
  } else if (hash) {
    showLoader();
    loadHashtagPage(decodeURIComponent(hash));
  } else if (q) {
    showLoader();
    threadPage.loadThreadByURL(decodeURIComponent(q));
  } else if (author && post) {
    showLoader();
    threadPage.loadThreadById(decodeURIComponent(author), decodeURIComponent(post));
  } else if (page) {
    openPage(page);
  } else {
    showSearch();
  }
}

/** @returns {IntersectionObserver} */

function buildAvatarPreloader() {
  return new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.removeAttribute('lazy');
        observer.unobserve(img);
      }
    }
  }, {
    rootMargin: '1000px 0px'
  });
}

function showLoader() {
  $id('loader').style.display = 'block';
}

function hideLoader() {
  $id('loader').style.display = 'none';
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
    notificationsPage.show();
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

/** @param {Post} post */

function setPageTitle(post) {
  document.title = `${post.author.displayName}: "${post.text}" - Skythread`;
}

/** @param {string} hashtag */

function loadHashtagPage(hashtag) {
  hashtag = hashtag.replace(/^\#/, '');
  document.title = `#${hashtag} - Skythread`;

  let isLoading = false;
  let firstPageLoaded = false;
  let finished = false;
  let cursor;

  paginator.loadInPages(() => {
    if (isLoading || finished) { return; }
    isLoading = true;

    api.getHashtagFeed(hashtag, cursor).then(data => {
      let posts = data.posts.map(j => new Post(j));

      if (!firstPageLoaded) {
        hideLoader();

        let header = $tag('header');
        let h2 = $tag('h2', {
          text: (posts.length > 0) ? `Posts tagged: #${hashtag}` : `No posts tagged #${hashtag}.`
        });
        header.append(h2);

        $id('thread').appendChild(header);
        $id('thread').classList.add('hashtag');
      }

      for (let post of posts) {
        let postView = new PostComponent(post, 'feed').buildElement();
        $id('thread').appendChild(postView);
      }

      isLoading = false;
      firstPageLoaded = true;
      cursor = data.cursor;

      if (!cursor || posts.length == 0) {
        finished = true;
      }
    }).catch(error => {
      hideLoader();
      console.log(error);
      isLoading = false;
    });
  });
}

/** @param {string} url */

function loadQuotesPage(url) {
  let isLoading = false;
  let firstPageLoaded = false;
  let cursor;
  let finished = false;

  paginator.loadInPages(() => {
    if (isLoading || finished) { return; }
    isLoading = true;

    blueAPI.getQuotes(url, cursor).then(data => {
      api.loadPosts(data.posts).then(jsons => {
        let posts = jsons.map(j => new Post(j));

        if (!firstPageLoaded) {
          hideLoader();

          let header = $tag('header');
          let h2;

          if (data.quoteCount > 1) {
            h2 = $tag('h2', { text: `${data.quoteCount} quotes:` });
          } else if (data.quoteCount == 1) {
            h2 = $tag('h2', { text: '1 quote:' });
          } else {
            h2 = $tag('h2', { text: 'No quotes found.' });
          }

          header.append(h2);
          $id('thread').appendChild(header);
          $id('thread').classList.add('quotes');
        }

        for (let post of posts) {
          let postView = new PostComponent(post, 'quotes').buildElement();
          $id('thread').appendChild(postView);
        }

        isLoading = false;
        firstPageLoaded = true;
        cursor = data.cursor;

        if (!cursor || posts.length == 0) {
          finished = true;
        }
      }).catch(error => {
        hideLoader();
        console.log(error);
        isLoading = false;
      })
    }).catch(error => {
      hideLoader();
      console.log(error);
      isLoading = false;
    });
  });
}

window.init = init;
window.BlueskyAPI = BlueskyAPI;

export { setPageTitle, showLoginDialog, showBiohazardDialog, showLoader, hideLoader, submitLogin };
