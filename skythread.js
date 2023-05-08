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
  if (!url.startsWith('https://')) {
    console.log('invalid url');
    return;
  }

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
}

function parsePost(json) {
  let post = json.post;

  return {
    author: post.author,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
    repostCount: post.repostCount,
    uri: post.uri,
    createdAt: post.record.createdAt,
    text: post.record.text,
    liked: !!post.viewer.like
  };
}

function buildPostTree(json) {
  let root = buildPostSubtree(json.thread);
  let current = json.thread;

  while (current.parent) {
    current = current.parent;

    let newRoot = parsePost(current);
    newRoot.replies = [root];
    root = newRoot;
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

  let h = document.createElement('h2');
  h.innerHTML = `${post.author.displayName} <span class="handle">(@${post.author.handle})</span>`;
  div.appendChild(h);

  let avatar = document.createElement('img');
  avatar.src = post.author.avatar;
  avatar.className = 'avatar';
  h.prepend(avatar);

  let p = document.createElement('p');
  p.innerText = post.text;
  div.appendChild(p);

  let stats = document.createElement('p');
  stats.innerText = `${post.replyCount}`;
  if (post.replyCount != (post.replies?.length ?? 0)) {
    stats.innerText += " +++";
  }
  if (post.liked) {
    stats.innerText += " [LIKED]"
  }
  div.appendChild(stats);

  for (let reply of post.replies ?? []) {
    let subdiv = buildElementForTree(reply);
    div.appendChild(subdiv);
  }

  return div;
}

function loadThread(url) {
  loadThreadJSON(url).then(json => {
    let tree = buildPostTree(json);
    console.log(json);
    console.log(tree);
    window.json = json;
    let list = buildElementForTree(tree);
    document.body.appendChild(list);
  }).catch(error => {
    console.log(error);
  });
}
