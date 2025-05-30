function init() {
  window.dateLocale = localStorage.getItem('locale') || undefined;
  window.isIncognito = !!localStorage.getItem('incognito');
  window.biohazardEnabled = JSON.parse(localStorage.getItem('biohazard') ?? 'null');

  window.loginDialog = $(document.querySelector('#login'));

  window.avatarPreloader = buildAvatarPreloader();

  window.accountMenu = new Menu();
  window.threadPage = new ThreadPage();
  window.postingStatsPage = new PostingStatsPage();
  window.likeStatsPage = new LikeStatsPage();
  window.notificationsPage = new NotificationsPage();

  $(document.querySelector('#search form')).addEventListener('submit', (e) => {
    e.preventDefault();
    submitSearch();
  });

  for (let dialog of document.querySelectorAll('.dialog')) {
    dialog.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        hideDialog(dialog);
      } else {
        e.stopPropagation();
      }
    });

    dialog.querySelector('.close')?.addEventListener('click', (e) => {
      hideDialog(dialog);
    });
  }

  $(document.querySelector('#login .info a')).addEventListener('click', (e) => {
    e.preventDefault();
    toggleLoginInfo();
  });

  $(document.querySelector('#login form')).addEventListener('submit', (e) => {
    e.preventDefault();
    submitLogin();
  });

  $(document.querySelector('#biohazard_show')).addEventListener('click', (e) => {
    e.preventDefault();

    window.biohazardEnabled = true;
    localStorage.setItem('biohazard', 'true');

    if (window.loadInfohazard) {
      window.loadInfohazard();
      window.loadInfohazard = undefined;
    }

    let target = $(e.target);

    hideDialog(target.closest('.dialog'));
  });

  $(document.querySelector('#biohazard_hide')).addEventListener('click', (e) => {
    e.preventDefault();

    window.biohazardEnabled = false;
    localStorage.setItem('biohazard', 'false');
    accountMenu.toggleMenuButtonCheck('biohazard', false);

    for (let p of document.querySelectorAll('p.hidden-replies, .content > .post.blocked, .blocked > .load-post')) {
      $(p).style.display = 'none';
    }

    let target = $(e.target);

    hideDialog(target.closest('.dialog'));
  });

  window.appView = new BlueskyAPI('api.bsky.app', false);
  window.blueAPI = new BlueskyAPI('blue.mackuba.eu', false);
  window.accountAPI = new BlueskyAPI(undefined, true);

  if (accountAPI.isLoggedIn) {
    accountAPI.host = accountAPI.user.pdsEndpoint;
    accountMenu.hideMenuButton('login');

    if (!isIncognito) {
      window.api = accountAPI;
      accountMenu.showLoggedInStatus(true, api.user.avatar);
    } else {
      window.api = appView;
      accountMenu.showLoggedInStatus('incognito');
      accountMenu.toggleMenuButtonCheck('incognito', true);
    }
  } else {
    window.api = appView;
    accountMenu.hideMenuButton('logout');
    accountMenu.hideMenuButton('incognito');
  }

  accountMenu.toggleMenuButtonCheck('biohazard', window.biohazardEnabled !== false);

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
  let searchField = $(search.querySelector('input[type=text]'));

  search.style.visibility = 'visible';
  searchField.focus();
}

function hideSearch() {
  $id('search').style.visibility = 'hidden';
}

function showDialog(dialog) {
  dialog.style.visibility = 'visible';
  $id('thread').classList.add('overlay');

  dialog.querySelector('input[type=text]')?.focus();
}

function hideDialog(dialog) {
  dialog.style.visibility = 'hidden';
  dialog.classList.remove('expanded');
  $id('thread').classList.remove('overlay');

  for (let field of dialog.querySelectorAll('input[type=text]')) {
    field.value = '';
  }
}

function toggleDialog(dialog) {
  if (dialog.style.visibility == 'visible') {
    hideDialog(dialog);
  } else {
    showDialog(dialog);
  }
}

function toggleLoginInfo(event) {
  $id('login').classList.toggle('expanded');
}

function submitLogin() {
  let handleField = $id('login_handle', HTMLInputElement);
  let passwordField = $id('login_password', HTMLInputElement);
  let submit = $id('login_submit');
  let cloudy = $id('cloudy');

  if (submit.style.display == 'none') { return }

  handleField.blur();
  passwordField.blur();

  submit.style.display = 'none';
  cloudy.style.display = 'inline-block';

  let handle = handleField.value.trim();
  let password = passwordField.value.trim();

  logIn(handle, password).then((pds) => {
    window.api = pds;
    window.accountAPI = pds;

    hideDialog(loginDialog);
    submit.style.display = 'inline';
    cloudy.style.display = 'none';

    accountMenu.loadCurrentUserAvatar();

    accountMenu.showMenuButton('logout');
    accountMenu.showMenuButton('incognito');
    accountMenu.hideMenuButton('login');

    let params = new URLSearchParams(location.search);
    let page = params.get('page');
    if (page) {
      openPage(page);
    }
  })
  .catch((error) => {
    submit.style.display = 'inline';
    cloudy.style.display = 'none';
    console.log(error);

    if (error.code == 401 && error.json.error == 'AuthFactorTokenRequired') {
      alert("Please log in using an \"app password\" if you have 2FA enabled.");
    } else {
      window.setTimeout(() => alert(error), 10);
    }
  });
}

/** @param {string} identifier, @param {string} password, @returns {Promise<BlueskyAPI>} */

async function logIn(identifier, password) {
  let pdsEndpoint;

  if (identifier.match(/^did:/)) {
    pdsEndpoint = await Minisky.pdsEndpointForDid(identifier);
  } else if (identifier.match(/^[^@]+@[^@]+$/)) {
    pdsEndpoint = 'bsky.social';
  } else if (identifier.match(/^@?[\w\-]+(\.[\w\-]+)+$/)) {
    identifier = identifier.replace(/^@/, '');
    let did = await appView.resolveHandle(identifier);
    pdsEndpoint = await Minisky.pdsEndpointForDid(did);
  } else {
    throw 'Please enter your handle or DID.';
  }

  let pds = new BlueskyAPI(pdsEndpoint, true);
  await pds.logIn(identifier, password);
  return pds;
}

function logOut() {
  accountAPI.resetTokens();
  localStorage.removeItem('incognito');
  location.reload();
}

function submitSearch() {
  let search = $id('search');
  let searchField = $(search.querySelector('input[name=q]'), HTMLInputElement);
  let url = searchField.value.trim();

  if (!url) { return }

  if (url.startsWith('at://')) {
    let target = new URL(getLocation());
    target.searchParams.set('q', url);
    location.assign(target.toString());
    return;
  }

  if (url.match(/^#?((\p{Letter}|\p{Number})+)$/u)) {
    let target = new URL(getLocation());
    target.searchParams.set('hash', encodeURIComponent(url.replace(/^#/, '')));
    location.assign(target.toString());
    return;
  }

  try {
    let [handle, postId] = BlueskyAPI.parsePostURL(url);

    let newURL = linkToPostById(handle, postId);
    location.assign(newURL);
  } catch (error) {
    console.log(error);
    alert(error.message || "This is not a valid URL or hashtag");
  }
}

function openPage(page) {
  if (!accountAPI.isLoggedIn) {
    toggleDialog(loginDialog);
    return;
  }

  if (page == 'notif') {
    window.notificationsPage.show();
  } else if (page == 'posting_stats') {
    window.postingStatsPage.show();
  } else if (page == 'like_stats') {
    window.likeStatsPage.show();
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

  loadInPages(() => {
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

  loadInPages(() => {
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

/** @param {Function} callback */

function loadInPages(callback) {
  let loadIfNeeded = () => {
    if (window.pageYOffset + window.innerHeight > document.body.offsetHeight - 500) {
      callback(loadIfNeeded);
    }
  };

  callback(loadIfNeeded);

  document.addEventListener('scroll', loadIfNeeded);
  const resizeObserver = new ResizeObserver(loadIfNeeded);
  resizeObserver.observe(document.body);
}
