function init() {
  window.dateLocale = localStorage.getItem('locale') || undefined;

  document.body.parentNode.addEventListener('click', (e) => {
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
    if (api.isLoggedIn) {
      toggleAccount();
    } else {
      toggleLogin();
    }
    e.stopPropagation();
  });

  document.querySelector('#account_menu').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  window.appView = new BlueskyAPI('api.bsky.app', false);
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

  if (query) {
    showLoader();
    loadThread(decodeURIComponent(query));
  } else if (author && post) {
    showLoader();
    loadThread(decodeURIComponent(author), decodeURIComponent(post));
  } else {
    showSearch();
  }
}

function buildParentLink(post) {
  let p = $tag('p.back');

  if (post.blocked) {
    let element = new PostComponent(post).buildElement('parent');
    element.className = 'back';
    element.querySelector('p.blocked-header span').innerText = 'Parent post blocked';
    return element;
  } else if (post.missing) {
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

  try {
    let [handle, postId] = BlueskyAPI.parsePostURL(url);

    let newURL = linkToPostById(handle, postId);
    location.assign(newURL);
  } catch (error) {
    console.log(error);
    alert(error);
  }
}

function setPageTitle(post) {
  document.title = `${post.author.displayName}: "${post.text}" - Skythread`;
}

function loadThread(url, postId, nodeToUpdate) {
  let load = postId ? api.loadThreadById(url, postId) : api.loadThreadByURL(url);

  load.then(json => {
    let root = Post.parse(json.thread);
    window.root = root;

    setPageTitle(root);

    if (root.parent && !nodeToUpdate) {
      let p = buildParentLink(root.parent);
      $id('thread').appendChild(p);
    }

    let list = new PostComponent(root).buildElement('thread');
    hideLoader();

    if (nodeToUpdate) {
      nodeToUpdate.querySelector('.content').replaceWith(list.querySelector('.content'));
    } else {
      $id('thread').appendChild(list);
    }
  }).catch(error => {
    hideLoader();
    console.log(error);
    alert(error);
  });
}
