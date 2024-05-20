function init() {
  let document = /** @type {AnyElement} */ (/** @type {unknown} */ (window.document));
  let html = /** @type {AnyElement} */ (/** @type {unknown} */ (window.document.body.parentNode));

  window.dateLocale = localStorage.getItem('locale') || undefined;
  window.isIncognito = !!localStorage.getItem('incognito');

  document.addEventListener('click', (e) => {
    $id('account_menu').style.visibility = 'hidden';
  });

  document.querySelector('#search form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitSearch();
  });

  document.querySelector('#login').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      hideLogin();
    } else {
      e.stopPropagation();
    }
  });

  document.querySelector('#login .info a').addEventListener('click', (e) => {
    e.preventDefault();
    toggleLoginInfo();
  });

  document.querySelector('#login form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitLogin();
  });

  document.querySelector('#login .close').addEventListener('click', (e) => {
    hideLogin();
  });

  document.querySelector('#account').addEventListener('click', (e) => {
    if (accountAPI.isLoggedIn) {
      toggleAccount();
    } else {
      toggleLogin();
    }
    e.stopPropagation();
  });

  document.querySelector('#account_menu').addEventListener('click', (e) => {
    e.stopPropagation();
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

  document.querySelector('#account_menu a[data-action=logout]').addEventListener('click', (e) => {
    e.preventDefault();
    logOut();
  });

  window.appView = new BlueskyAPI('api.bsky.app', false);
  window.blueAPI = new BlueskyAPI('blue.mackuba.eu', false);
  window.accountAPI = new BlueskyAPI(undefined, true);

  if (accountAPI.isLoggedIn && !isIncognito) {
    window.api = accountAPI;
    accountAPI.host = accountAPI.user.pdsEndpoint;
    showLoggedInStatus(true, api.user.avatar);
  } else if (accountAPI.isLoggedIn && isIncognito) {
    window.api = appView;
    accountAPI.host = accountAPI.user.pdsEndpoint;
    showLoggedInStatus('incognito');
    document.querySelector('#account_menu a[data-action=incognito]').innerText = '✓ Incognito mode';
  } else {
    window.api = appView;
  }

  parseQueryParams();
}

function parseQueryParams() {
  let params = new URLSearchParams(location.search);
  let query = params.get('q');
  let author = params.get('author');
  let post = params.get('post');
  let quotes = params.get('quotes');
  let hash = params.get('hash');

  if (quotes) {
    showLoader();
    loadQuotesPage(decodeURIComponent(quotes));
  } else if (hash) {
    showLoader();
    loadHashtagPage(decodeURIComponent(hash));
  } else if (query) {
    showLoader();
    loadThread(decodeURIComponent(query));
  } else if (author && post) {
    showLoader();
    loadThread(decodeURIComponent(author), decodeURIComponent(post));
  } else {
    showSearch();
  }
}

/** @param {AnyPost} post, @returns {AnyElement} */

function buildParentLink(post) {
  let p = $tag('p.back');

  if (post instanceof BlockedPost) {
    let element = new PostComponent(post).buildElement('parent');
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

function showLogin() {
  $id('login').style.visibility = 'visible';
  $id('thread').classList.add('overlay');
  $id('login_handle').focus();
}

function hideLogin() {
  $id('login').style.visibility = 'hidden';
  $id('login').classList.remove('expanded');
  $id('thread').classList.remove('overlay');
  $id('login_handle').value = '';
  $id('login_password').value = '';
}

function toggleLogin() {
  if ($id('login').style.visibility == 'visible') {
    hideLogin();
  } else {
    showLogin();
  }
}

function toggleLoginInfo(event) {
  $id('login').classList.toggle('expanded');
}

function toggleAccount() {
  let menu = $id('account_menu');
  menu.style.visibility = (menu.style.visibility == 'visible') ? 'hidden' : 'visible';
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

    hideLogin();
    submit.style.display = 'inline';
    cloudy.style.display = 'none';

    loadCurrentUserAvatar();
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
  } else if (identifier.match(/^[\w\-]+(\.[\w\-]+)+$/)) {
    let did = await appView.resolveHandle(identifier);
    pdsEndpoint = await Minisky.pdsEndpointForDid(did);
  } else {
    throw 'Please enter your handle or DID';
  }

  let pds = new BlueskyAPI(pdsEndpoint, true);
  await pds.logIn(identifier, password);
  return pds;
}

function loadCurrentUserAvatar() {
  api.loadCurrentUserAvatar().then(data => {
    if (data) {
      let url = `https://cdn.bsky.app/img/avatar/plain/${api.user.did}/${data.ref.$link}@jpeg`;
      api.config.user.avatar = url;
      api.config.save();
      showLoggedInStatus(true, url);
    } else {
      showLoggedInStatus(true, null);
    }
  }).catch((error) => {
    console.log(error);
    showLoggedInStatus(true, null);
  });
}

function logOut() {
  accountAPI.resetTokens();
  location.reload();
}

function submitSearch() {
  let url = $id('search').querySelector('input[name=q]').value.trim();

  if (!url) { return }

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
        let postView = new PostComponent(post).buildElement('feed');
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
          let postView = new PostComponent(post).buildElement('quotes');
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
  callback();

  document.addEventListener('scroll', (e) => {
    if (window.pageYOffset + window.innerHeight > document.body.offsetHeight - 200) {
      callback();
    }
  });
}

/** @param {string} url, @param {string} [postId], @param {AnyElement} [nodeToUpdate] */

function loadThread(url, postId, nodeToUpdate) {
  let load = postId ? api.loadThreadById(url, postId) : api.loadThreadByURL(url);

  load.then(json => {
    let root = Post.parseThreadPost(json.thread);
    window.root = root;

    let loadQuoteCount;

    if (!nodeToUpdate) {
      setPageTitle(root);
      loadQuoteCount = blueAPI.getQuoteCount(root.uri);
    }

    if (root.parent && !nodeToUpdate) {
      let p = buildParentLink(root.parent);
      $id('thread').appendChild(p);
    }

    let component = new PostComponent(root);
    let list = component.buildElement('thread');
    hideLoader();

    if (nodeToUpdate) {
      nodeToUpdate.querySelector('.content').replaceWith(list.querySelector('.content'));
    } else {
      $id('thread').appendChild(list);
    }

    loadQuoteCount?.then(count => {
      if (count > 0) {
        let stats = list.querySelector(':scope > .content > p.stats');
        let q = new URL(getLocation());
        q.searchParams.set('quotes', component.linkToPost);
        stats.append($tag('i', { className: count > 1 ? 'fa-regular fa-comments' : 'fa-regular fa-comment' }));
        stats.append(" ");
        let quotes = $tag('a', {
          html: count > 1 ? `${count} quotes` : '1 quote',
          href: q.toString()
        });
        stats.append(quotes);
      }
    }).catch(error => {
      console.warn("Couldn't load quote count: " + error);
    });
  }).catch(error => {
    hideLoader();
    console.log(error);
    alert(error);
  });
}
