function init() {
  /** @type {AnyElement} */
  let body = window.document.body;
  let html = body.parentNode;

  window.dateLocale = localStorage.getItem('locale') || undefined;

  html.addEventListener('click', (e) => {
    $id('account_menu').style.visibility = 'hidden';
  });

  body.querySelector('#search form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitSearch();
  });

  body.querySelector('#login').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      hideLogin();
    } else {
      e.stopPropagation();
    }
  });

  body.querySelector('#login .info a').addEventListener('click', (e) => {
    e.preventDefault();
    toggleLoginInfo();
  });

  body.querySelector('#login form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitLogin();
  });

  body.querySelector('#login .close').addEventListener('click', (e) => {
    hideLogin();
  });

  body.querySelector('#account').addEventListener('click', (e) => {
    if (api.isLoggedIn) {
      toggleAccount();
    } else {
      toggleLogin();
    }
    e.stopPropagation();
  });

  body.querySelector('#account_menu').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  body.querySelector('#account_menu a[data-action=logout]').addEventListener('click', (e) => {
    e.preventDefault();
    logOut();
  });

  window.appView = new BlueskyAPI('api.bsky.app', false);
  window.blue = new BlueskyAPI('blue.mackuba.eu', false);
  window.api = new BlueskyAPI('bsky.social', true);

  if (api.isLoggedIn) {
    showLoggedInStatus(api.user.avatar);
  } else {
    window.api = window.appView;
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

/** @param {string} [avatar] */

function showLoggedInStatus(avatar) {
  let account = $id('account');

  if (avatar) {
    let button = account.querySelector('i');

    let img = $tag('img.avatar', { src: avatar });
    img.style.display = 'none';
    img.addEventListener('load', () => {
      button.remove();
      img.style.display = 'inline';
    });
    img.addEventListener('error', () => {
      showLoggedInStatus();
    })

    account.append(img);
  } else {
    account.innerHTML = `<i class="fa-solid fa-user-circle fa-xl"></i>`;
  }
}

function showLoggedOutStatus() {
  $id('account').innerHTML = `<i class="fa-regular fa-user-circle fa-xl"></i>`;
}

function submitLogin() {
  let handle = $id('login_handle');
  let password = $id('login_password');
  let submit = $id('login_submit');
  let cloudy = $id('cloudy');

  if (submit.style.display == 'none') { return }

  let pds = new BlueskyAPI('bsky.social', true);

  handle.blur();
  password.blur();

  submit.style.display = 'none';
  cloudy.style.display = 'inline-block';

  pds.logIn(handle.value, password.value).then(() => {
    window.api = pds;

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

function loadCurrentUserAvatar() {
  api.loadCurrentUserAvatar().then(data => {
    if (data) {
      let url = `https://cdn.bsky.app/img/avatar/plain/${api.user.did}/${data.ref.$link}@jpeg`;
      api.config.user.avatar = url;
      api.config.save();
      showLoggedInStatus(url);
    } else {
      showLoggedInStatus();
    }
  }).catch((error) => {
    console.log(error);
    showLoggedInStatus();
  });
}

function logOut() {
  api.resetTokens();
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

  blue.getHashtagFeed(hashtag).then(uris => {
    let loading = true;
    let footerAdded = false;

    loadPostsInBatches(uris, jsons => {
      let posts = jsons.map(j => new Post(j));

      if (loading) {
        loading = false;
        hideLoader();

        let header = $tag('header');
        header.append($tag('h2', { text: 'Posts tagged: #' + hashtag }));
        $id('thread').appendChild(header);
        $id('thread').classList.add('hashtag');
      }

      for (let post of posts) {
        let postView = new PostComponent(post).buildElement('feed');
        $id('thread').appendChild(postView);
      }

      if (!footerAdded) {
        let footer = $tag('p.note', {
          text: "Note: at the moment, Skythread can show at most 100 recent posts and only from the last 30 days."
        });

        $id('thread').after(footer);
        footerAdded = true;
      }
    }).catch(error => {
      hideLoader();
      console.log(error);
    })
  }).catch(error => {
    hideLoader();
    console.log(error);
  });
}

/** @param {string} url */

function loadQuotesPage(url) {
  blue.getQuotes(url).then(data => {
    let uris = data.posts;
    let loading = true;
    let footerAdded = false;

    loadPostsInBatches(uris, jsons => {
      let posts = jsons.map(j => new Post(j));

      if (loading) {
        loading = false;
        hideLoader();

        let header = $tag('header');
        let h2;

        if (data.quoteCount > 1) {
          h2 = $tag('h2', { text: `${data.quoteCount} quotes:` });
        } else if (data.quoteCount == 1) {
          h2 = $tag('h2', { text: '1 quote:' });
        } else {
          h2 = $tag('h2', { text: 'No quotes found' });
        }

        header.append(h2);
        $id('thread').appendChild(header);
        $id('thread').classList.add('quotes');
      }

      for (let post of posts) {
        let postView = new PostComponent(post).buildElement('quotes');
        $id('thread').appendChild(postView);
      }

      if (!footerAdded) {
        let text;

        if (data.quoteCount >= 100) {
          text = "Note: at the moment, Skythread can show at most 100 recent quotes and only from the last 30 days.";
        } else {
          text = "Note: at the moment, Skythread can only show quotes from the last 30 days.";
        }

        let footer = $tag('p.note', { text });
        $id('thread').after(footer);
        footerAdded = true;
      }
    }).catch(error => {
      hideLoader();
      console.log(error);
    })
  }).catch(error => {
    hideLoader();
    console.log(error);
  });
}

/** @param {string[]} uris, @param {(p: object[]) => void} callback, @returns Promise<void> */

async function loadPostsInBatches(uris, callback) {
  if (uris.length > 0) {
    for (let i = 0; i < uris.length; i += 25) {
      let batch = await api.loadPosts(uris.slice(i, i + 25));
      callback(batch);
    }
  } else {
    callback([]);
  }
}

/** @param {string} url, @param {string} [postId], @param {AnyElement} [nodeToUpdate] */

function loadThread(url, postId, nodeToUpdate) {
  let load = postId ? api.loadThreadById(url, postId) : api.loadThreadByURL(url);

  load.then(json => {
    let root = Post.parseThreadPost(json.thread);
    window.root = root;

    let loadQuoteCount = blue.getQuoteCount(root.uri);

    if (!nodeToUpdate) {
      setPageTitle(root);
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

    loadQuoteCount.then(count => {
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
    });
  }).catch(error => {
    hideLoader();
    console.log(error);
    alert(error);
  });
}
