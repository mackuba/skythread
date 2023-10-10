function init() {
  window.dateLocale = localStorage.getItem('locale') || undefined;

  document.querySelector('#login .info a').addEventListener('click', (e) => {
    e.preventDefault();
    toggleLoginInfo();
  });

  document.querySelector('#login form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitLogin();
  });

  document.querySelector('#search form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitSearch();
  });

  document.querySelector('#search input').addEventListener('mousedown', (e) => {
    e.target.classList.add('click');
  });

  document.querySelector('#search input').addEventListener('blur', (e) => {
    e.target.classList.remove('click');
  });

  window.appView = new BlueskyAPI('api.bsky.app', false);

  let params = new URLSearchParams(location.search);
  if (params.get('_u') == '1') {
    window.unauthed = true;
    window.api = window.appView;
  } else {
    window.api = new BlueskyAPI('bsky.social', true);
  }

  if (api.isLoggedIn || window.unauthed) {
    parseQueryParams();
  } else {
    showLogin();
  }
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
    let element = new PostComponent(post).buildElement();
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
}

function hideSearch() {
  $id('search').style.visibility = 'hidden';
}

function showLogin() {
  $id('login').style.visibility = 'visible';
}

function hideLogin() {
  $id('login').style.visibility = 'hidden';
}

function toggleLoginInfo(event) {
  $id('login').classList.toggle('expanded');
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

  api.logIn(handle.value, password.value).then(() => {
    hideLogin();
    parseQueryParams();
  }).catch((error) => {
    submit.style.display = 'inline';
    cloudy.style.display = 'none';
    console.log(error);
    alert(error);
  });
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

function loadThread(url, postId, nodeToUpdate) {
  let load = postId ? api.loadThreadById(url, postId) : api.loadThreadByURL(url);

  load.then(json => {
    let root = Post.parse(json.thread);
    window.root = root;

    if (root.parent && !nodeToUpdate) {
      let p = buildParentLink(root.parent);
      document.body.appendChild(p);
    }

    let list = new PostComponent(root).buildElement();
    hideLoader();

    if (nodeToUpdate) {
      nodeToUpdate.querySelector('.content').replaceWith(list.querySelector('.content'));
    } else {
      document.body.appendChild(list);      
    }
  }).catch(error => {
    hideLoader();
    console.log(error);
    alert(error);
  });
}
