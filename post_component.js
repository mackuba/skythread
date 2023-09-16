class PostComponent {
  constructor(post, root) {
    this.post = post;
    this.root = root ?? post;
    this.isRoot = (this.post === this.root);
  }

  get linkToAuthor() {
    return 'https://bsky.app/profile/' + this.post.author.handle;
  }

  get linkToPost() {
    return this.linkToAuthor + '/post/' + this.post.rkey;
  }

  get didLinkToAuthor() {
    let { repo } = atURI(this.post.uri);
    return `https://bsky.app/profile/${repo}`;
  }

  get didLinkToPost() {
    let { repo, rkey } = atURI(this.post.uri);
    return `https://bsky.app/profile/${repo}/post/${rkey}`;
  }

  get authorName() {
    if (this.post.author.displayName) {
      return this.post.author.displayName;
    } else if (this.post.author.handle.endsWith('.bsky.social')) {
      return this.post.author.handle.replace(/\.bsky\.social$/, '');
    } else {
      return this.post.author.handle;
    }
  }

  get timeFormatForTimestamp() {
    if (this.isRoot) {
      return { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' };
    } else if (!sameDay(this.post.createdAt, this.root.createdAt)) {
      return { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric' };
    } else {
      return { hour: 'numeric', minute: 'numeric' };
    }
  }

  buildElement() {
    let div = document.createElement('div');
    div.className = 'post';

    if (this.post.muted) {
      div.classList.add('muted');
    }

    if (this.post.missing) {
      this.buildBlockedPostElement(div);
      return div;
    }

    let header = this.buildPostHeader();
    div.appendChild(header);

    let content = document.createElement('div');
    content.className = 'content';

    if (!this.isRoot) {
      let edge = document.createElement('div');
      edge.className = 'edge';
      div.appendChild(edge);

      let line = document.createElement('div');
      line.className = 'line';
      edge.appendChild(line);

      let plus = document.createElement('img');
      plus.className = 'plus';
      plus.src = 'icons/subtract-square.png';
      div.appendChild(plus);

      for (let element of [edge, plus]) {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleSectionFold(div);
        });
      }
    }

    let wrapper;

    if (this.post.muted) {
      let details = document.createElement('details');
      let summary = document.createElement('summary');

      if (this.post.muteList) {
        summary.innerText = `Muted (${this.post.muteList})`;
      } else {
        summary.innerText = 'Muted - click to show';
      }

      details.appendChild(summary);
      content.appendChild(details);
      wrapper = details;
    } else {
      wrapper = content;
    }

    let p = document.createElement('p');
    p.innerText = this.post.text;
    wrapper.appendChild(p);

    if (this.post.embed) {
      let embed = new EmbedComponent(this.post, this.post.embed).buildElement();
      wrapper.appendChild(embed);
    }

    if (this.post.likeCount !== undefined && this.post.repostCount !== undefined) {
      let stats = this.buildStatsFooter();
      wrapper.appendChild(stats);      
    }

    if (this.post.replies.length == 1 && this.post.replies[0].author?.did == this.post.author.did) {
      let component = new PostComponent(this.post.replies[0], this.root);
      let element = component.buildElement();
      element.classList.add('flat');
      content.appendChild(element);
    } else {
      for (let reply of this.post.replies) {
        let component = new PostComponent(reply, this.root);
        content.appendChild(component.buildElement());
      }
    }

    if (this.post.hasMoreReplies) {
      let loadMore = this.buildLoadMoreLink()
      content.appendChild(loadMore);
    }

    div.appendChild(content);

    return div;
  }

  buildPostHeader() {
    let timeFormat = this.timeFormatForTimestamp;
    let formattedTime = this.post.createdAt.toLocaleString(window.dateLocale, timeFormat);
    let isoTime = this.post.createdAt.toISOString();

    let h = document.createElement('h2');

    h.innerHTML = `${this.authorName} ` +
      `<a class="handle" href="${this.linkToAuthor}" target="_blank">@${this.post.author.handle}</a> ` +
      `<span class="separator">&bull;</span> ` +
      `<a class="time" href="${this.linkToPost}" target="_blank" title="${isoTime}">${formattedTime}</a> `;

    if (this.post.replyCount > 0 && !this.isRoot || this.post.isEmbed) {
      h.innerHTML +=
        `<span class="separator">&bull;</span> ` +
        `<a href="${linkToPostThread(this.post)}" class="action" title="Load this subtree">` +
        `<i class="fa-solid fa-arrows-split-up-and-left fa-rotate-180"></i></a> `;
    }

    if (this.post.muted) {
      let muted = document.createElement('i');
      muted.className = 'missing fa-regular fa-circle-user fa-2x';
      h.prepend(muted);
    } else if (this.post.author.avatar) {
      let avatar = document.createElement('img');
      avatar.src = this.post.author.avatar;
      avatar.className = 'avatar';
      h.prepend(avatar);
    } else {
      let missing = document.createElement('i');
      missing.className = 'missing fa-regular fa-face-smile fa-2x';
      h.prepend(missing);
    }

    return h;
  }

  buildStatsFooter() {
    let stats = document.createElement('p');
    stats.className = 'stats';

    let span = document.createElement('span');
    let heart = document.createElement('i');
    heart.className = 'fa-solid fa-heart ' + (this.post.liked ? 'liked' : '');
    heart.addEventListener('click', (e) => this.onHeartClick(heart));
    span.append(heart);
    span.append(' ');

    let count = document.createElement('output');
    count.innerText = this.post.likeCount;
    span.append(count);
    stats.append(span);

    if (this.post.repostCount > 0) {
      let span = document.createElement('span');
      span.innerHTML = `<i class="fa-solid fa-retweet"></i> ${this.post.repostCount}`;
      stats.append(span);
    }

    return stats;
  }

  buildLoadMoreLink() {
    let loadMore = document.createElement('p');
    let link = document.createElement('a');
    link.innerText = "Load more replies…";
    link.href = linkToPostThread(this.post);

    link.addEventListener('click', (e) => {
      e.preventDefault();
      link.innerHTML = `<img class="loader" src="icons/sunny.png">`;
      loadThread(this.post.author.handle, this.post.rkey, loadMore.parentNode.parentNode);
    });

    loadMore.appendChild(link);
    return loadMore;
  }

  buildBlockedPostElement(div) {
    let p = document.createElement('p');
    p.className = 'blocked-header';
    p.innerHTML = `<i class="fa-solid fa-ban"></i> Blocked post ` +
      `(<a href="${this.didLinkToAuthor}" target="_blank">see author</a>) `;
    div.appendChild(p);

    let authorLink = p.querySelector('a');
    let did = atURI(this.post.uri).repo;
    let cachedHandle = api.findHandleByDid(did);
    let blockStatus = this.post.blockedByUser ? 'has blocked you' : this.post.blocksUser ? 'blocked by you' : '';

    if (cachedHandle) {
      this.post.author.handle = cachedHandle;
      authorLink.href = this.linkToAuthor;
      authorLink.innerText = `@${cachedHandle}`;
      if (blockStatus) {
        authorLink.after(`, ${blockStatus}`);
      }
    } else {
      api.loadRawProfileRecord(did).then((author) => {
        this.post.author = author;
        authorLink.href = this.linkToAuthor;
        authorLink.innerText = `@${author.handle}`;
        if (blockStatus) {
          authorLink.after(`, ${blockStatus}`);
        }
      });      
    }

    let loadPost = document.createElement('p');
    loadPost.className = 'load-post';
    let a = document.createElement('a');
    a.innerText = "Load post…";
    a.href = '#';

    a.addEventListener('click', (e) => {
      e.preventDefault();
      loadPost.innerHTML = '&nbsp;';
      this.loadBlockedPost(this.post.uri, div);
    });

    loadPost.appendChild(a);
    div.appendChild(loadPost);
    div.classList.add('blocked');
    return div;
  }

  async loadBlockedPost(uri, div) {
    let record = await api.loadRawPostRecord(this.post.uri);
    this.post = new Post(record);

    div.querySelector('p.load-post').remove();

    if (this.isRoot && this.post.parentReference) {
      let p = document.createElement('p');
      p.className = 'back';

      let { repo, rkey } = atURI(this.post.parentReference.uri);
      let url = linkToPostById(repo, rkey);

      p.innerHTML = `<i class="fa-solid fa-reply"></i><a href="${url}">See parent post</a>`;
      div.appendChild(p);
    }

    let p = document.createElement('p');
    p.innerText = this.post.text;
    div.appendChild(p);
  }

  toggleSectionFold(div) {
    let plus = div.querySelector('.plus');

    if (div.classList.contains('collapsed')) {
      div.classList.remove('collapsed');
      plus.src = 'icons/subtract-square.png'
    } else {
      div.classList.add('collapsed');
      plus.src = 'icons/add-square.png'
    }
  }

  onHeartClick(heart) {
    let count = heart.nextElementSibling;

    if (!heart.classList.contains('liked')) {
      api.likePost(this.post).then((like) => {
        this.post.viewerLike = like.uri;
        heart.classList.add('liked');
        count.innerText = parseInt(count.innerText, 10) + 1;
      }).catch((error) => {
        console.log(error);
        alert(error);
      });
    } else {
      api.removeLike(this.post.viewerLike).then(() => {
        this.post.viewerLike = undefined;
        heart.classList.remove('liked');
        count.innerText = parseInt(count.innerText, 10) - 1;
      }).catch((error) => {
        console.log(error);
        alert(error);
      });
    }
  }
}
