window.dateLocale = localStorage.getItem('locale') || undefined;

async function getRequest(method, params) {
  let url = 'https://bsky.social/xrpc/' + method;

  if (params) {
    url += '?' + Object.entries(params).map((x) => `${x[0]}=${encodeURIComponent(x[1])}`).join('&');
  }

  let response = await fetch(url, { headers: { 'Authorization': `Bearer ${window.accessToken}` }});
  let json = await response.json();
  return json;
}

async function loadThreadJSON(url) {
  if (url.startsWith('https://')) {
    let parts = url.substring(8).split('/');

    if (parts.length < 5 || parts[0] != 'staging.bsky.app' || parts[1] != 'profile' || parts[3] != 'post') {
      console.log('invalid url');
      return;    
    }

    let handle = parts[2];
    let postId = parts[4];

    let json = await getRequest('com.atproto.identity.resolveHandle', { handle });
    let did = json['did']

    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;
    let threadJSON = await getRequest('app.bsky.feed.getPostThread', { uri: postURI });

    return threadJSON;
  } else if (url.startsWith('at://')) {
    let threadJSON = await getRequest('app.bsky.feed.getPostThread', { uri: url });
    return threadJSON;
  } else {
    console.log('invalid url');
  }
}

function parsePost(json) {
  let post = json.post;

  return {
    author: post.author,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
    repostCount: post.repostCount,
    uri: post.uri,
    createdAt: new Date(post.record.createdAt),
    text: post.record.text,
    liked: !!post.viewer.like,
    replies: []
  };
}

function buildPostTree(json) {
  let root = buildPostSubtree(json.thread);

  if (json.thread.parent) {
    root.parent = parsePost(json.thread.parent);
  }

  return root;
}

function buildPostSubtree(json) {
  let post = parsePost(json);

  if (json.replies) {
    post.replies = json.replies.map(x => buildPostSubtree(x));
  }

  return post;
}

function buildElementForTree(post) {
  let div = document.createElement('div');
  div.className = 'post';

  let formattedTime = post.createdAt.toLocaleString(window.dateLocale, {
    day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric'
  });
  let isoTime = post.createdAt.toISOString();
  let url = post.uri.replace('at://', 'https://staging.bsky.app/profile/').replace('app.bsky.feed.post', 'post');
  let profileURL = 'https://staging.bsky.app/profile/' + post.author.handle;

  let h = document.createElement('h2');
  h.innerHTML = `${post.author.displayName} ` +
    `<a class="handle" href="${profileURL}" target="_blank">@${post.author.handle}</a> ` +
    `<span class="separator">&bull;</span> ` +
    `<a class="time" href="${url}" target="_blank"><time datetime="${isoTime}">${formattedTime}</time></a>`;
  div.appendChild(h);

  let avatar = document.createElement('img');
  avatar.src = post.author.avatar;
  avatar.className = 'avatar';
  h.prepend(avatar);

  let p = document.createElement('p');
  p.innerText = post.text;
  div.appendChild(p);

  let stats = document.createElement('p');
  stats.className = 'stats';
  stats.innerHTML = `<span><i class="fa-solid fa-heart ${post.liked ? 'liked' : ''}"></i> ${post.likeCount}</span>`;
  if (post.repostCount > 0) {
    stats.innerHTML += `<span><i class="fa-solid fa-retweet"></i> ${post.repostCount}</span>`;
  }
  div.appendChild(stats);

  for (let reply of post.replies) {
    let subdiv = buildElementForTree(reply);
    div.appendChild(subdiv);
  }

  if (post.replyCount != post.replies.length) {
    let loadMore = document.createElement('p');
    let link = document.createElement('a');
    link.innerText = "Load more replies…";
    link.href = getLocation() + '?q=' + encodeURIComponent(post.uri);
    loadMore.appendChild(link);
    div.appendChild(loadMore);
  }

  return div;
}

function buildParentLink(post) {
  let p = document.createElement('p');
  p.className = 'back';

  let link = document.createElement('a');
  let url = getLocation() + '?q=' + encodeURIComponent(post.uri);
  link.innerHTML = `<i class="fa-solid fa-reply"></i><a href="${url}">See parent post (@${post.author.handle})</a>`;
  p.appendChild(link);

  return p;
}

function getLocation() {
  return location.origin + '/' + location.pathname;
}

function loadThread(url) {
  loadThreadJSON(url).then(json => {
    let tree = buildPostTree(json);
    console.log(json);
    console.log(tree);
    window.json = json;

    if (tree.parent) {
      let p = buildParentLink(tree.parent);
      document.body.appendChild(p);
    }

    let list = buildElementForTree(tree);
    document.body.appendChild(list);
  }).catch(error => {
    console.log(error);
  });
}
