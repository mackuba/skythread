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

function buildParentLink(post) {
  let p = document.createElement('p');
  p.className = 'back';

  let link = document.createElement('a');
  let url = linkToPostThread(post);
  link.innerHTML = `<i class="fa-solid fa-reply"></i><a href="${url}">See parent post (@${post.author.handle})</a>`;
  p.appendChild(link);

  return p;
}

function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

function loadThread(url, postId) {
  let api = new BlueskyAPI();
  let load = postId ? api.loadThreadById(url, postId) : api.loadThreadByURL(url);

  load.then(json => {
    let tree = buildPostSubtree(json.thread);
    console.log(json);
    console.log(tree);
    window.json = json;

    if (tree.parent) {
      let p = buildParentLink(tree.parent);
      document.body.appendChild(p);
    }

    let list = new PostComponent(tree, tree).buildElement();
    hideLoader();
    document.body.appendChild(list);
  }).catch(error => {
    hideLoader();
    console.log(error);      
  });
}
