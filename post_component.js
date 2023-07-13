class PostComponent {
  constructor(post, root) {
    this.post = post;
    this.root = root;
  }

  get isRoot() {
    return this.post === this.root;
  }

  get linkToAuthor() {
    return 'https://bsky.app/profile/' + this.post.author.handle;
  }

  get linkToPost() {
    return this.linkToAuthor + '/post/' + this.post.id;
  }

  get rawLinkToAuthor() {
    let parts = this.post.uri.replace('at://', '').split('/');
    return 'https://bsky.app/profile/' + parts[0];
  }

  get rawLinkToPost() {
    let parts = this.post.uri.replace('at://', '').split('/');
    return 'https://bsky.app/profile/' + parts[0] + '/post/' + parts[2];
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
      let embed = this.buildEmbedElement(this.post.embed);
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

    if (this.post.replyCount != this.post.replies.length) {
      let loadMore = this.buildLoadMoreLink()
      content.appendChild(loadMore);
    }

    div.appendChild(content);

    return div;
  }

  buildEmbedElement(embed) {
    if (embed.$type == 'app.bsky.embed.record') {
      let div = document.createElement('div');
      div.className = 'quote-embed'
      div.innerHTML = '<p class="post placeholder">Loading quoted post...</p>';

      this.loadQuotedPost(embed.record, div);
      return div;
    } else if (embed.$type == 'app.bsky.embed.recordWithMedia') {
      // TODO: load image
      let div = document.createElement('div');
      div.className = 'quote-embed'
      div.innerHTML = '<p class="post placeholder">Loading quoted post...</p>';

      this.loadQuotedPost(embed.record.record, div);
      return div;
    } else {
      let p = document.createElement('p');
      p.innerText = `[${embed.$type}]`;
      return p;
    }
  }

  async loadQuotedPost(record, div) {
    let api = new BlueskyAPI();

    let handle = record.uri.split('/')[2];
    let post = parseRawPost(await api.loadRawPostRecord(record.uri));
    post.author = await api.loadRawProfileRecord(handle);
    post.isEmbed = true;

    let postView = new PostComponent(post, post).buildElement();
    div.innerHTML = '';
    div.appendChild(postView);
  }

  buildBlockedPostElement(div) {
    let p = document.createElement('p');
    p.innerHTML = `<i class="fa-solid fa-ban"></i> ` +
      `<a href="${this.rawLinkToPost}" target="_blank">Blocked post</a> ` +
      `<a href="${this.rawLinkToAuthor}" target="_blank">(see author)</a> `;
    div.appendChild(p);

    let loadPost = document.createElement('p');
    let a = document.createElement('a');
    a.innerText = "Load post…";
    a.href = '#';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      loadPost.remove();

      let api = new BlueskyAPI();
      let loadRecord = api.loadRawPostRecord(this.post.uri);
      let loadProfile = api.loadRawProfileRecord(this.post.uri.split('/')[2]);

      Promise.all([loadRecord, loadProfile]).then((results) => {
        let [post, author] = results;
        let a = document.createElement('p');
        a.innerText = `@${author.handle}:`;
        div.appendChild(a);
        let p = document.createElement('p');
        p.innerText = post.value.text;
        div.appendChild(p);
      });
    });

    loadPost.appendChild(a);
    div.appendChild(loadPost);
    div.classList.add('blocked');
    return div;
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

  timeFormatForTimestamp() {
    if (this.isRoot) {
      return { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' };
    } else if (!sameDay(this.post.createdAt, this.root.createdAt)) {
      return { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric' };
    } else {
      return { hour: 'numeric', minute: 'numeric' };
    }
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

  buildPostHeader() {
    let timeFormat = this.timeFormatForTimestamp();
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
    heart.className = 'fa-solid fa-heart ' + (this.post.like ? 'liked' : '');
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
      loadThread(this.post.author.handle, this.post.id, loadMore.parentNode.parentNode);
    });

    loadMore.appendChild(link);
    return loadMore;
  }

  onHeartClick(heart) {
    let api = new BlueskyAPI();
    let count = heart.nextElementSibling;

    if (!heart.classList.contains('liked')) {
      api.likePost(this.post.uri, this.post.cid).then((like) => {
        this.post.like = like.uri;
        heart.classList.add('liked');
        count.innerText = parseInt(count.innerText, 10) + 1;
      }).catch((error) => {
        console.log(error);
        alert(error);
      });
    } else {
      api.removeLike(this.post.like).then(() => {
        heart.classList.remove('liked');
        count.innerText = parseInt(count.innerText, 10) - 1;
      }).catch((error) => {
        console.log(error);
        alert(error);
      });
    }
  }
}
