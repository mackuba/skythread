class PostComponent {
  constructor(post, root) {
    this.post = post;
    this.root = root;
  }

  get isRoot() {
    return this.post === this.root;
  }

  get linkToAuthor() {
    return 'https://staging.bsky.app/profile/' + this.post.author.handle;
  }

  get linkToPost() {
    return this.linkToAuthor + '/post/' + lastPathComponent(this.post.uri);
  }

  buildElement() {
    let div = document.createElement('div');
    div.className = 'post';

    let header = this.buildPostHeader();
    div.appendChild(header);

    let p = document.createElement('p');
    p.innerText = this.post.text;
    div.appendChild(p);

    if (this.post.embed) {
      let embed = document.createElement('p');
      embed.innerText = `[${this.post.embed.$type}]`;
      div.appendChild(embed);
    }

    let stats = this.buildStatsFooter();
    div.appendChild(stats);

    if (this.post.replies.length == 1 && this.post.replies[0].author.did == this.post.author.did) {
      let component = new PostComponent(this.post.replies[0], this.root);
      let element = component.buildElement();
      element.classList.add('flat');
      div.appendChild(element);
    } else {
      for (let reply of this.post.replies) {
        let component = new PostComponent(reply, this.root);
        div.appendChild(component.buildElement());
      }
    }

    if (this.post.replyCount != this.post.replies.length) {
      let loadMore = this.buildLoadMoreLink()
      div.appendChild(loadMore);
    }

    return div;
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

    if (this.post.replyCount > 0 && !this.isRoot) {
      h.innerHTML +=
        `<span class="separator">&bull;</span> ` +
        `<a href="${linkToPostThread(this.post)}" class="action" title="Load this subtree">` +
        `<i class="fa-solid fa-arrows-split-up-and-left fa-rotate-180"></i></a> `;
    }

    if (this.post.author.avatar) {
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
