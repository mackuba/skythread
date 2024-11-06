function init() {
  let document = /** @type {AnyElement} */ (/** @type {unknown} */ (window.document));
  let html = /** @type {AnyElement} */ (/** @type {unknown} */ (window.document.body.parentNode));

  window.dateLocale = localStorage.getItem('locale') || undefined;
  window.isIncognito = !!localStorage.getItem('incognito');
  window.biohazardEnabled = JSON.parse(localStorage.getItem('biohazard') ?? 'null');

  window.loginDialog = document.querySelector('#login');

  html.addEventListener('click', (e) => {
    $id('account_menu').style.visibility = 'hidden';
  });

  document.querySelector('#search form').addEventListener('submit', (e) => {
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

  document.querySelector('#login .info a').addEventListener('click', (e) => {
    e.preventDefault();
    toggleLoginInfo();
  });

  document.querySelector('#login form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitLogin();
  });

  document.querySelector('#biohazard_show').addEventListener('click', (e) => {
    e.preventDefault();

    window.biohazardEnabled = true;
    localStorage.setItem('biohazard', 'true');

    if (window.loadInfohazard) {
      window.loadInfohazard();
      window.loadInfohazard = undefined;
    }

    hideDialog(e.target.closest('.dialog'));
  });

  document.querySelector('#biohazard_hide').addEventListener('click', (e) => {
    e.preventDefault();

    window.biohazardEnabled = false;
    localStorage.setItem('biohazard', 'false');
    toggleMenuButton('biohazard', false);

    for (let p of document.querySelectorAll('p.hidden-replies, .content > .post.blocked, .blocked > .load-post')) {
      p.style.display = 'none';
    }

    hideDialog(e.target.closest('.dialog'));
  });

  document.querySelector('#account').addEventListener('click', (e) => {
    toggleAccountMenu();
    e.stopPropagation();
  });

  document.querySelector('#account_menu').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.querySelector('#account_menu a[data-action=biohazard]').addEventListener('click', (e) => {
    e.preventDefault();

    let hazards = document.querySelectorAll('p.hidden-replies, .content > .post.blocked, .blocked > .load-post');

    if (window.biohazardEnabled === false) {
      window.biohazardEnabled = true;
      localStorage.setItem('biohazard', 'true');
      toggleMenuButton('biohazard', true);
      Array.from(hazards).forEach(p => { p.style.display = 'block' });
    } else {
      window.biohazardEnabled = false;
      localStorage.setItem('biohazard', 'false');
      toggleMenuButton('biohazard', false);
      Array.from(hazards).forEach(p => { p.style.display = 'none' });
    }
  });

  document.querySelector('#account_menu a[data-action=incognito]').addEventListener('click', (e) => {
    e.preventDefault();

    if (isIncognito) {
      localStorage.removeItem('incognito');
    } else {
      localStorage.setItem('incognito', '1');
    }

    location.reload();
  });

  document.querySelector('#account_menu a[data-action=login]').addEventListener('click', (e) => {
    e.preventDefault();
    toggleDialog(loginDialog);
    $id('account_menu').style.visibility = 'hidden';
  });

  document.querySelector('#account_menu a[data-action=logout]').addEventListener('click', (e) => {
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
    loadThreadByURL(decodeURIComponent(query));
  } else if (author && post) {
    showLoader();
    loadThreadById(decodeURIComponent(author), decodeURIComponent(post));
  } else if (page) {
    openPage(page);
  } else {
    showSearch();
  }
}

/** @param {AnyPost} post, @returns {AnyElement} */

function buildParentLink(post) {
  let p = $tag('p.back');

  if (post instanceof BlockedPost) {
    let element = new PostComponent(post, 'parent').buildElement();
    element.className = 'back';
    element.querySelector('p.blocked-header span').innerText = 'Parent post blocked';
    return element;
  } else if (post instanceof MissingPost) {
    p.innerHTML = `<i class="fa-solid fa-ban"></i> parent post has been deleted`;
  } else {
    let url = linkToPostThread(post);
    p.innerHTML = `<i class="fa-solid fa-reply"></i><a href="${url}">See parent post (@${post.author.handle})</a>`;
  }

  return p;
}

function showLoader() {
  $id('loader').style.display = 'block';
}

function hideLoader() {
  $id('loader').style.display = 'none';
}

function showSearch() {
  $id('search').style.visibility = 'visible';
  $id('search').querySelector('input[type=text]').focus();
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
  let button = document.querySelector(`#account_menu a[data-action=${buttonName}]`);
  button.parentNode.style.display = 'list-item';
}

/** @param {string} buttonName */

function hideMenuButton(buttonName) {
  let button = document.querySelector(`#account_menu a[data-action=${buttonName}]`);
  button.parentNode.style.display = 'none';
}

/** @param {string} buttonName, @param {boolean} state */

function toggleMenuButton(buttonName, state) {
  let button = document.querySelector(`#account_menu a[data-action=${buttonName}]`);
  button.querySelector('.check').style.display = (state) ? 'inline' : 'none';
}

/** @param {boolean | 'incognito'} loggedIn, @param {string | undefined | null} [avatar] */

function showLoggedInStatus(loggedIn, avatar) {
  let account = $id('account');

  if (loggedIn === true && avatar) {
    let button = account.querySelector('i');

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
  let handle = $id('login_handle');
  let password = $id('login_password');
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
  })
  .catch((error) => {
    submit.style.display = 'inline';
    cloudy.style.display = 'none';
    console.log(error);

    window.setTimeout(() => alert(error), 10);
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
  let url = $id('search').querySelector('input[name=q]').value.trim();

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
    let header = $tag('header');
    let h2 = $tag('h2', { text: "<--- Log in there & reload :)" });
    header.append(h2);
    $id('thread').appendChild(header);
    return;    
  }

  if (page == 'notif') {
    showLoader();
    showNotificationsPage();
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

    accountAPI.loadNotifications(cursor).then(data => {
      let posts = data.notifications.filter(x => x.reason == 'reply').map(x => new Post(x));

      if (posts.length > 0) {
        if (!firstPageLoaded) {
          hideLoader();
          firstPageLoaded = true;

          let header = $tag('header');
          let h2 = $tag('h2', { text: "Replies:" });
          header.append(h2);
          $id('thread').appendChild(header);
          $id('thread').classList.add('notifications');
        }

        for (let post of posts) {
          let postView = new PostComponent(post, 'feed').buildElement();
          $id('thread').appendChild(postView);
        }
      }

      isLoading = false;
      cursor = data.cursor;

      if (!cursor || data.notifications.length == 0) {
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
    if (window.pageYOffset + window.innerHeight > document.body.offsetHeight - 200) {
      callback(loadIfNeeded);
    }
  };

  callback(loadIfNeeded);

  document.addEventListener('scroll', loadIfNeeded);
  const resizeObserver = new ResizeObserver(loadIfNeeded);
  resizeObserver.observe(document.body);
}

/** @param {string} url */

function loadThreadByURL(url) {
  let loadThread = url.startsWith('at://') ? api.loadThreadByAtURI(url) : api.loadThreadByURL(url);

  loadThread.then(json => {
    displayThread(json);
  }).catch(error => {
    hideLoader();
    showError(error);
  });
}

/** @param {string} author, @param {string} rkey */

function loadThreadById(author, rkey) {
  api.loadThreadById(author, rkey).then(json => {
    displayThread(json);
  }).catch(error => {
    hideLoader();
    showError(error);
  });
}

/** @param {json} json */

function displayThread(json) {
  let root = Post.parseThreadPost(json.thread);
  window.root = root;
  window.subtreeRoot = root;

  let loadQuoteCount;

  if (root instanceof Post) {
    setPageTitle(root);
    loadQuoteCount = blueAPI.getQuoteCount(root.uri);        

    if (root.parent) {
      let p = buildParentLink(root.parent);
      $id('thread').appendChild(p);
    }
  }

  let component = new PostComponent(root, 'thread');
  let view = component.buildElement();
  hideLoader();
  $id('thread').appendChild(view);

  loadQuoteCount?.then(count => {
    if (count > 0) {
      let stats = view.querySelector(':scope > .content > p.stats');
      let q = new URL(getLocation());
      q.searchParams.set('quotes', component.linkToPost);
      stats.append($tag('i', { className: count > 1 ? 'fa-regular fa-comments' : 'fa-regular fa-comment' }));
      stats.append(" ");
      let quotes = $tag('a', {
        text: count > 1 ? `${count} quotes` : '1 quote',
        href: q.toString()
      });
      stats.append(quotes);
    }
  }).catch(error => {
    console.warn("Couldn't load quote count: " + error);
  });
}

/** @param {Post} post, @param {AnyElement} nodeToUpdate */

function loadSubtree(post, nodeToUpdate) {
  api.loadThreadByAtURI(post.uri).then(json => {
    let root = Post.parseThreadPost(json.thread, post.pageRoot, 0, post.absoluteLevel);
    post.updateDataFromPost(root);
    window.subtreeRoot = post;

    let component = new PostComponent(post, 'thread');
    let view = component.buildElement();

    nodeToUpdate.querySelector('.content').replaceWith(view.querySelector('.content'));
  }).catch(showError);
}

/** @param {Post} post, @param {AnyElement} nodeToUpdate */

function loadHiddenSubtree(post, nodeToUpdate) {
  blueAPI.getReplies(post.uri).then(replies => {
    let missingReplies = replies.filter(r => !post.replies.some(x => x.uri === r));

    Promise.allSettled(missingReplies.map(uri => api.loadThreadByAtURI(uri))).then(responses => {
      let replies = responses
        .map(r => r.status == 'fulfilled' ? r.value : undefined)
        .filter(v => v)
        .map(json => Post.parseThreadPost(json.thread, post.pageRoot, 1, post.absoluteLevel + 1));

      post.setReplies(replies);

      let content = nodeToUpdate.querySelector('.content');
      content.querySelector(':scope > .hidden-replies').remove();

      for (let reply of post.replies) {
        let component = new PostComponent(reply, 'thread');
        let view = component.buildElement();
        content.append(view);
      }
    }).catch(showError);
  }).catch(showError);
}
