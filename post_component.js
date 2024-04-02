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

  /**
    Contexts:
    - thread - a post in the thread tree
    - parent - parent reference above the thread root
    - quote - a quote embed
    - quotes - a post on the quotes page
    - feed - a post on the hashtag feed page
  */
  buildElement(context) {
    let div = $tag('div.post');

    if (this.post.muted) {
      div.classList.add('muted');
    }

    if (this.post.missing) {
      this.buildBlockedPostElement(div);
      return div;
    }

    let header = this.buildPostHeader(context);
    div.appendChild(header);

    let content = $tag('div.content');

    if (!this.isRoot) {
      let edge = $tag('div.edge');
      let line = $tag('div.line');
      edge.appendChild(line);
      div.appendChild(edge);

      let plus = $tag('img.plus', { src: 'icons/subtract-square.png' });
      div.appendChild(plus);

      [edge, plus].forEach(x => {
        x.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleSectionFold(div);
        });
      });
    }

    let wrapper;

    if (this.post.muted) {
      let details = $tag('details');

      let summary = $tag('summary');
      summary.innerText = this.post.muteList ? `Muted (${this.post.muteList})` : 'Muted - click to show';
      details.appendChild(summary);

      content.appendChild(details);
      wrapper = details;
    } else {
      wrapper = content;
    }

    let p = this.buildPostBody();
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
      let element = component.buildElement('thread');
      element.classList.add('flat');
      content.appendChild(element);
    } else {
      for (let reply of this.post.replies) {
        if (reply.missing && !reply.blocked) { continue }

        let component = new PostComponent(reply, this.root);
        content.appendChild(component.buildElement('thread'));
      }
    }

    if (context == 'thread' && this.post.hasMoreReplies) {
      let loadMore = this.buildLoadMoreLink()
      content.appendChild(loadMore);
    }

    div.appendChild(content);

    return div;
  }

  buildPostHeader(context) {
    let timeFormat = this.timeFormatForTimestamp;
    let formattedTime = this.post.createdAt.toLocaleString(window.dateLocale, timeFormat);
    let isoTime = this.post.createdAt.toISOString();

    let h = $tag('h2');

    h.innerHTML = `${escapeHTML(this.authorName)} ` +
      `<a class="handle" href="${this.linkToAuthor}" target="_blank">@${this.post.author.handle}</a> ` +
      `<span class="separator">&bull;</span> ` +
      `<a class="time" href="${this.linkToPost}" target="_blank" title="${isoTime}">${formattedTime}</a> `;

    if (this.post.replyCount > 0 && !this.isRoot || ['quote', 'quotes', 'feed'].includes(context)) {
      h.innerHTML +=
        `<span class="separator">&bull;</span> ` +
        `<a href="${linkToPostThread(this.post)}" class="action" title="Load this subtree">` +
        `<i class="fa-solid fa-arrows-split-up-and-left fa-rotate-180"></i></a> `;
    }

    if (this.post.muted) {
      h.prepend($tag('i', 'missing fa-regular fa-circle-user fa-2x'));
    } else if (this.post.author.avatar) {
      h.prepend(this.buildUserAvatar(this.post.author.avatar));
    } else {
      h.prepend($tag('i', 'missing fa-regular fa-face-smile fa-2x'));
    }

    return h;
  }

  buildUserAvatar(url) {
    let avatar = $tag('img.avatar', { src: url });
    let tries = 0;

    let errorHandler = function(e) {
      if (tries < 3) {
        tries++;
        setTimeout(() => { avatar.src = url }, Math.random() * 5 * tries);
      } else {
        avatar.removeEventListener('error', errorHandler);
      }
    };

    avatar.addEventListener('error', errorHandler);
    return avatar;
  }

  buildPostBody() {
    let p = $tag('p.body');
    let richText = new RichText({ text: this.post.text, facets: this.post.facets });

    for (let seg of richText.segments()) {
      if (seg.mention) {
        p.append($tag('a', { href: `https://bsky.app/profile/${seg.mention.did}`, text: seg.text }));
      } else if (seg.link) {
        p.append($tag('a', { href: seg.link.uri, text: seg.text }));
      } else if (seg.tag) {
        let url = new URL(getLocation());
        url.searchParams.set('hash', seg.tag.tag);
        p.append($tag('a', { href: url.toString(), text: seg.text }));
      } else {
        p.append(seg.text);
      }
    }

    return p;
  }

  buildStatsFooter() {
    let stats = $tag('p.stats');

    let span = $tag('span');
    let heart = $tag('i', 'fa-solid fa-heart ' + (this.post.liked ? 'liked' : ''));
    heart.addEventListener('click', (e) => this.onHeartClick(heart));

    span.append(heart, ' ', $tag('output', { text: this.post.likeCount }));
    stats.append(span);

    if (this.post.repostCount > 0) {
      let span = $tag('span', { html: `<i class="fa-solid fa-retweet"></i> ${this.post.repostCount}` });
      stats.append(span);
    }

    return stats;
  }

  buildLoadMoreLink() {
    let loadMore = $tag('p');

    let link = $tag('a', {
      href: linkToPostThread(this.post),
      text: "Load more replies…"
    });

    link.addEventListener('click', (e) => {
      e.preventDefault();
      link.innerHTML = `<img class="loader" src="icons/sunny.png">`;
      loadThread(this.post.author.handle, this.post.rkey, loadMore.parentNode.parentNode);
    });

    loadMore.appendChild(link);
    return loadMore;
  }

  buildBlockedPostElement(div) {
    let p = $tag('p.blocked-header');
    p.innerHTML = `<i class="fa-solid fa-ban"></i> <span>Blocked post</span> ` +
      `(<a href="${this.didLinkToAuthor}" target="_blank">see author</a>) `;
    div.appendChild(p);

    let authorLink = p.querySelector('a');
    let did = atURI(this.post.uri).repo;
    let cachedHandle = api.findHandleByDid(did);
    let blockStatus = this.post.blockedByUser ? 'has blocked you' : this.post.blocksUser ? "you've blocked them" : '';

    if (cachedHandle) {
      this.post.author.handle = cachedHandle;
      authorLink.href = this.linkToAuthor;
      authorLink.innerText = `@${cachedHandle}`;
      if (blockStatus) {
        authorLink.after(`, ${blockStatus}`);
      }
    } else {
      api.loadUserProfile(did).then((author) => {
        this.post.author = author;
        authorLink.href = this.linkToAuthor;
        authorLink.innerText = `@${author.handle}`;
        if (blockStatus) {
          authorLink.after(`, ${blockStatus}`);
        }
      });      
    }

    let loadPost = $tag('p.load-post');
    let a = $tag('a', { href: '#', text: "Load post…" });

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
    let record = await appView.loadPost(this.post.uri);
    this.post = new Post(record);

    div.querySelector('p.load-post').remove();

    if (this.isRoot && this.post.parentReference) {
      let { repo, rkey } = atURI(this.post.parentReference.uri);
      let url = linkToPostById(repo, rkey);

      let handle = api.findHandleByDid(repo);
      let link = handle ? `See parent post (@${handle})` : "See parent post";

      let p = $tag('p.back', { html: `<i class="fa-solid fa-reply"></i><a href="${url}">${link}</a>` });
      div.appendChild(p);
    }

    let p = $tag('p', { text: this.post.text });
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
    if (!this.post.hasViewerInfo) {
      showLogin();
      return;
    }

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
