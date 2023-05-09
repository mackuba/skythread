window.dateLocale = localStorage.getItem('locale') || undefined;

function parsePost(json) {
  let post = json.post;

  return {
    author: post.author,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
    repostCount: post.repostCount,
    uri: post.uri,
    cid: post.cid,
    createdAt: new Date(post.record.createdAt),
    text: post.record.text,
    like: post.viewer.like,
    replies: []
  };
}

function buildPostSubtree(json) {
  let post = parsePost(json);

  if (json.parent) {
    post.parent = parsePost(json.parent);
  }

  if (json.replies) {
    post.replies = json.replies.reverse().map(x => buildPostSubtree(x));
  }

  return post;
}

function buildElementForTree(post, root) {
  let div = document.createElement('div');
  div.className = 'post';

  let timeFormat;

  if (post === root) {
    timeFormat = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' };
  } else if (!sameDay(post.createdAt, root.createdAt)) {
    timeFormat = { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric' };
  } else {
    timeFormat = { hour: 'numeric', minute: 'numeric' };
  }

  let formattedTime = post.createdAt.toLocaleString(window.dateLocale, timeFormat);
  let isoTime = post.createdAt.toISOString();
  let profileURL = 'https://staging.bsky.app/profile/' + post.author.handle;
  let postURL = profileURL + '/post/' + lastPathComponent(post.uri);

  let h = document.createElement('h2');
  h.innerHTML = `${post.author.displayName} ` +
    `<a class="handle" href="${profileURL}" target="_blank">@${post.author.handle}</a> ` +
    `<span class="separator">&bull;</span> ` +
    `<a class="time" href="${postURL}" target="_blank" title="${isoTime}">${formattedTime}</a> `;

  if (post.replyCount > 0) {
    let threadURL = getLocation() + '?q=' + encodeURIComponent(post.uri);
    h.innerHTML +=
      `<span class="separator">&bull;</span> <a href="${threadURL}" class="action" title="Load this subtree">` +
      `<i class="fa-solid fa-arrows-split-up-and-left fa-rotate-180"></i></a> `;
  }

  div.appendChild(h);

  if (post.author.avatar) {
    let avatar = document.createElement('img');
    avatar.src = post.author.avatar;
    avatar.className = 'avatar';
    h.prepend(avatar);    
  } else {
    let missing = document.createElement('i');
    missing.className = 'missing fa-regular fa-face-smile fa-2x';
    h.prepend(missing);
  }

  let p = document.createElement('p');
  p.innerText = post.text;
  div.appendChild(p);

  let stats = document.createElement('p');
  stats.className = 'stats';

  let span = document.createElement('span');
  let heart = document.createElement('i');
  heart.className = 'fa-solid fa-heart ' + (post.like ? 'liked' : '');
  heart.addEventListener('click', (e) => onHeartClick(heart, post));
  span.append(heart);
  span.append(` ${post.likeCount}`);
  stats.append(span);

  if (post.repostCount > 0) {
    let span = document.createElement('span');
    span.innerHTML = `<i class="fa-solid fa-retweet"></i> ${post.repostCount}`;
    stats.append(span);
  }

  div.appendChild(stats);

  for (let reply of post.replies) {
    let subdiv = buildElementForTree(reply, root);
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

function onHeartClick(heart, post) {
  let api = new BlueskyAPI();

  if (!heart.classList.contains('liked')) {
    api.likePost(post.uri, post.cid).then((like) => {
      post.like = like.uri;
      heart.classList.add('liked');
    }).catch((error) => {
      console.log(error);
    });
  } else {
    api.removeLike(post.like).then(() => {
      heart.classList.remove('liked');
    }).catch((error) => {
      console.log(error);
    });
  }
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

function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

function loadThread(url) {
  let api = new BlueskyAPI();

  api.loadThreadJSON(url).then(json => {
    let tree = buildPostSubtree(json.thread);
    console.log(json);
    console.log(tree);
    window.json = json;

    if (tree.parent) {
      let p = buildParentLink(tree.parent);
      document.body.appendChild(p);
    }

    let list = buildElementForTree(tree, tree);
    hideLoader();
    document.body.appendChild(list);
  }).catch(error => {
    if (error instanceof APIError) {
      console.log('Refreshing access token...');
      api.refreshAccessToken().then(() => {
        loadThread(url);
      }).catch((error) => {
        console.log(error);
      });
    } else {
      hideLoader();
      console.log(error);      
    }
  });
}
