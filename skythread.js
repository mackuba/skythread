function init() {
  let html = $(document.body.parentNode);

  window.dateLocale = localStorage.getItem('locale') || undefined;
  window.isIncognito = !!localStorage.getItem('incognito');
  window.biohazardEnabled = JSON.parse(localStorage.getItem('biohazard') ?? 'null');

  window.loginDialog = $(document.querySelector('#login'));
  window.accountMenu = $(document.querySelector('#account_menu'));

  window.avatarPreloader = buildAvatarPreloader();

  window.threadPage = new ThreadPage();
  window.postingStatsPage = new PostingStatsPage();

  html.addEventListener('click', (e) => {
    $id('account_menu').style.visibility = 'hidden';
  });

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
    toggleMenuButton('biohazard', false);

    for (let p of document.querySelectorAll('p.hidden-replies, .content > .post.blocked, .blocked > .load-post')) {
      $(p).style.display = 'none';
    }

    let target = $(e.target);

    hideDialog(target.closest('.dialog'));
  });

  $(document.querySelector('#account')).addEventListener('click', (e) => {
    toggleAccountMenu();
    e.stopPropagation();
  });

  accountMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  $(accountMenu.querySelector('a[data-action=biohazard]')).addEventListener('click', (e) => {
    e.preventDefault();

    let hazards = document.querySelectorAll('p.hidden-replies, .content > .post.blocked, .blocked > .load-post');

    if (window.biohazardEnabled === false) {
      window.biohazardEnabled = true;
      localStorage.setItem('biohazard', 'true');
      toggleMenuButton('biohazard', true);
      Array.from(hazards).forEach(p => { $(p).style.display = 'block' });
    } else {
      window.biohazardEnabled = false;
      localStorage.setItem('biohazard', 'false');
      toggleMenuButton('biohazard', false);
      Array.from(hazards).forEach(p => { $(p).style.display = 'none' });
    }
  });

  $(accountMenu.querySelector('a[data-action=incognito]')).addEventListener('click', (e) => {
    e.preventDefault();

    if (isIncognito) {
      localStorage.removeItem('incognito');
    } else {
      localStorage.setItem('incognito', '1');
    }

    location.reload();
  });

  $(accountMenu.querySelector('a[data-action=login]')).addEventListener('click', (e) => {
    e.preventDefault();
    toggleDialog(loginDialog);
    $id('account_menu').style.visibility = 'hidden';
  });

  $(accountMenu.querySelector('a[data-action=logout]')).addEventListener('click', (e) => {
    e.preventDefault();
    logOut();
  });

  window.appView = new BlueskyAPI('api.bsky.app', false);
  window.blueAPI = new BlueskyAPI('blue.mackuba.eu', false);
  window.accountAPI = new BlueskyAPI(undefined, true);

  if (accountAPI.isLoggedIn) {
    accountAPI.host = accountAPI.user.pdsEndpoint;
    hideMenuButton('login');

    if (!isIncognito) {
      window.api = accountAPI;
      showLoggedInStatus(true, api.user.avatar);
    } else {
      window.api = appView;
      showLoggedInStatus('incognito');
      toggleMenuButton('incognito', true);
    }
  } else {
    window.api = appView;
    hideMenuButton('logout');
    hideMenuButton('incognito');
  }

  toggleMenuButton('biohazard', window.biohazardEnabled !== false);

  parseQueryParams();
}

function parseQueryParams() {
  let params = new URLSearchParams(location.search);
  let query = params.get('q');
  let author = params.get('author');
  let post = params.get('post');
  let quotes = params.get('quotes');
  let hash = params.get('hash');
  let page = params.get('page');

  if (quotes) {
    showLoader();
    loadQuotesPage(decodeURIComponent(quotes));
  } else if (hash) {
    showLoader();
    loadHashtagPage(decodeURIComponent(hash));
  } else if (query) {
    showLoader();
    threadPage.loadThreadByURL(decodeURIComponent(query));
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

function toggleAccountMenu() {
  let menu = $id('account_menu');
  menu.style.visibility = (menu.style.visibility == 'visible') ? 'hidden' : 'visible';
}

/** @param {string} buttonName */

function showMenuButton(buttonName) {
  let button = $(accountMenu.querySelector(`a[data-action=${buttonName}]`));
  let item = $(button.parentNode);
  item.style.display = 'list-item';
}

/** @param {string} buttonName */

function hideMenuButton(buttonName) {
  let button = $(accountMenu.querySelector(`a[data-action=${buttonName}]`));
  let item = $(button.parentNode);
  item.style.display = 'none';
}

/** @param {string} buttonName, @param {boolean} state */

function toggleMenuButton(buttonName, state) {
  let button = $(accountMenu.querySelector(`a[data-action=${buttonName}]`));
  let check = $(button.querySelector('.check'));
  check.style.display = (state) ? 'inline' : 'none';
}

/** @param {boolean | 'incognito'} loggedIn, @param {string | undefined | null} [avatar] */

function showLoggedInStatus(loggedIn, avatar) {
  let account = $id('account');

  if (loggedIn === true && avatar) {
    let button = $(account.querySelector('i'));

    let img = $tag('img.avatar', { src: avatar });
    img.style.display = 'none';
    img.addEventListener('load', () => {
      button.remove();
      img.style.display = 'inline';
    });
    img.addEventListener('error', () => {
      showLoggedInStatus(true, null);
    })

    account.append(img);
  } else if (loggedIn === false) {
    $id('account').innerHTML = `<i class="fa-regular fa-user-circle fa-xl"></i>`;
  } else if (loggedIn === 'incognito') {
    $id('account').innerHTML = `<i class="fa-solid fa-user-secret fa-lg"></i>`;
  } else {
    account.innerHTML = `<i class="fa-solid fa-user-circle fa-xl"></i>`;
  }
}

function submitLogin() {
  let handle = $id('login_handle', HTMLInputElement);
  let password = $id('login_password', HTMLInputElement);
  let submit = $id('login_submit');
  let cloudy = $id('cloudy');

  if (submit.style.display == 'none') { return }

  handle.blur();
  password.blur();

  submit.style.display = 'none';
  cloudy.style.display = 'inline-block';

  logIn(handle.value, password.value).then((pds) => {
    window.api = pds;
    window.accountAPI = pds;

    hideDialog(loginDialog);
    submit.style.display = 'inline';
    cloudy.style.display = 'none';

    loadCurrentUserAvatar();
    showMenuButton('logout');
    showMenuButton('incognito');
    hideMenuButton('login');

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

function loadCurrentUserAvatar() {
  api.loadCurrentUserAvatar().then((url) => {
    showLoggedInStatus(true, url);
  }).catch((error) => {
    console.log(error);
    showLoggedInStatus(true, null);
  });
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
    showLoader();
    showNotificationsPage();
  } else if (page == 'posting_stats') {
    window.postingStatsPage.show();
  }
}

function showNotificationsPage() {
  document.title = `Notifications - Skythread`;

  let isLoading = false;
  let firstPageLoaded = false;
  let finished = false;
  let cursor;

  loadInPages((next) => {
    if (isLoading || finished) { return; }
    isLoading = true;

    accountAPI.loadMentions(cursor).then(data => {
      let posts = data.posts.map(x => new Post(x));

      if (posts.length > 0) {
        if (!firstPageLoaded) {
          hideLoader();
          firstPageLoaded = true;

          let header = $tag('header');
          let h2 = $tag('h2', { text: "Replies & Mentions:" });
          header.append(h2);
          $id('thread').appendChild(header);
          $id('thread').classList.add('notifications');
        }

        for (let post of posts) {
          if (post.parentReference) {
            let p = $tag('p.back');
            p.innerHTML = `<i class="fa-solid fa-reply"></i> `;

            let { repo, rkey } = atURI(post.parentReference.uri);
            let url = linkToPostById(repo, rkey);
            let parentLink = $tag('a', { href: url });
            p.append(parentLink);

            if (repo == api.user.did) {
              parentLink.innerText = 'Reply to you';
            } else {
              parentLink.innerText = 'Reply';
              api.fetchHandleForDid(repo).then(handle => {
                parentLink.innerText = `Reply to @${handle}`;
              });
            }

            $id('thread').appendChild(p);
          }

          let postView = new PostComponent(post, 'feed').buildElement();
          $id('thread').appendChild(postView);
        }
      }

      isLoading = false;
      cursor = data.cursor;

      if (!cursor) {
        finished = true;
      } else if (posts.length == 0) {
        next();
      }
    }).catch(error => {
      hideLoader();
      console.log(error);
      isLoading = false;
    });
  });
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
