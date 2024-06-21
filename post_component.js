/**
 * Renders a post/thread view and its subviews.
 */

class PostComponent {
  /** @param {Post} post, @param {Post} [root] */
  constructor(post, root) {
    this.post = post;
    this.root = root ?? post;
    this.isRoot = (this.post === this.root);
  }

  /** @returns {string} */
  get linkToAuthor() {
    return 'https://bsky.app/profile/' + this.post.author.handle;
  }

  /** @returns {string} */
  get linkToPost() {
    return this.linkToAuthor + '/post/' + this.post.rkey;
  }

  /** @returns {string} */
  get didLinkToAuthor() {
    let { repo } = atURI(this.post.uri);
    return `https://bsky.app/profile/${repo}`;
  }

  /** @returns {string} */
  get didLinkToPost() {
    let { repo, rkey } = atURI(this.post.uri);
    return `https://bsky.app/profile/${repo}/post/${rkey}`;
  }

  /** @returns {string} */
  get authorName() {
    if (this.post.author.displayName) {
      return this.post.author.displayName;
    } else if (this.post.author.handle.endsWith('.bsky.social')) {
      return this.post.author.handle.replace(/\.bsky\.social$/, '');
    } else {
      return this.post.author.handle;
    }
  }

  /** @returns {json} */
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

    @typedef {'thread' | 'parent' | 'quote' | 'quotes' | 'feed'} PostContext
    @param {PostContext} context
    @returns {AnyElement}
  */

  buildElement(context) {
    let div = $tag('div.post');

    if (this.post.muted) {
      div.classList.add('muted');
    }

    if (this.post instanceof BlockedPost) {
      this.buildBlockedPostElement(div);
      return div;
    } else if (this.post instanceof MissingPost) {
      this.buildMissingPostElement(div);
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
        if (reply instanceof MissingPost) { continue }

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

  /** @param {PostContext} context, @returns {AnyElement} */

  buildPostHeader(context) {
    let timeFormat = this.timeFormatForTimestamp;
    let formattedTime = this.post.createdAt.toLocaleString(window.dateLocale, timeFormat);
    let isoTime = this.post.createdAt.toISOString();

    let h = $tag('h2');

    h.innerHTML = `${escapeHTML(this.authorName)} `;

    if (this.post.isFediPost) {
      let handle = this.post.authorFediHandle;
      h.innerHTML += `<a class="handle" href="${this.linkToAuthor}" target="_blank">@${handle}</a> ` +
        `<img src="icons/mastodon.svg" class="mastodon"> `;
    } else {
      h.innerHTML += `<a class="handle" href="${this.linkToAuthor}" target="_blank">@${this.post.author.handle}</a> `;
    }

    h.innerHTML += `<span class="separator">&bull;</span> ` +
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

  /** @param {string} url, @returns {HTMLImageElement} */

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

  /** @returns {AnyElement} */

  buildPostBody() {
    if (this.post.originalFediContent) {
      return $tag('div.body', { html: sanitizeHTML(this.post.originalFediContent) });
    }

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
      } else if (seg.text.includes("\n")) {
        let span = $tag('span', { text: seg.text });
        span.innerHTML = span.innerHTML.replaceAll("\n", "<br>");
        p.append(span);
      } else {
        p.append(seg.text);
      }
    }

    if (this.post.isTruncatedFediPost) {
      if (this.post.embed && ('url' in this.post.embed) && typeof this.post.embed.url == 'string') {
        let link = this.buildLoadFediPostLink(this.post.embed.url, p);
        p.append(' ', link);
      }
    }

    return p;
  }

  /** @returns {AnyElement} */

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

  /** @param {string} originalURL, @param {HTMLElement} p, @returns {AnyElement} */

  buildLoadFediPostLink(originalURL, p) {
    let link = $tag('a', {
      href: originalURL,
      text: "(Load full post)"
    });

    link.addEventListener('click', (e) => {
      e.preventDefault();
      link.remove();

      this.loadFediPost(originalURL, p);
    });

    return link;
  }

  /** @returns {AnyElement} */

  buildLoadMoreLink() {
    let loadMore = $tag('p');

    let link = $tag('a', {
      href: linkToPostThread(this.post),
      text: "Load more replies…"
    });

    link.addEventListener('click', (e) => {
      e.preventDefault();
      link.innerHTML = `<img class="loader" src="icons/sunny.png">`;

      if (this.post.mastodonURL) {
        loadMastodonThread(this.post.mastodonURL, loadMore.parentNode.parentNode);
      } else {
        loadThread(this.post.author.handle, this.post.rkey, loadMore.parentNode.parentNode);  
      }        
    });

    loadMore.appendChild(link);
    return loadMore;
  }

  /** @param {AnyElement} div, @returns {AnyElement} */

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

  /** @param {AnyElement} div, @returns {AnyElement} */

  buildMissingPostElement(div) {
    let p = $tag('p.blocked-header');
    p.innerHTML = `<i class="fa-solid fa-ban"></i> <span>Deleted post</span>`;
    div.appendChild(p);
    div.classList.add('blocked');
    return div;
  }

  /** @param {string} uri, @param {AnyElement} div, @returns Promise<void> */

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

    let p = this.buildPostBody();
    div.appendChild(p);

    if (this.post.embed) {
      let embed = new EmbedComponent(this.post, this.post.embed).buildElement();
      div.appendChild(embed);
    }
  }

  /** @param {string} url, @param {HTMLElement} p, @returns Promise<void> */

  async loadFediPost(url, p) {
    let host = new URL(url).host;
    let postId = url.replace(/\/$/, '').split('/').reverse()[0];
    let statusURL = `https://${host}/api/v1/statuses/${postId}`;

    let response = await fetch(statusURL);
    let json = await response.json();

    if (json.content) {
      let div = $tag('div.body', { html: sanitizeHTML(json.content) });
      p.replaceWith(div);
    }
  }

  /** @param {AnyElement} div */

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

  /** @param {AnyElement} heart */

  onHeartClick(heart) {
    if (!this.post.hasViewerInfo) {
      if (accountAPI.isLoggedIn) {
        accountAPI.loadPost(this.post.uri).then(data => {
          this.post = new Post(data);

          if (this.post.liked) {
            heart.classList.add('liked');
          } else {
            this.onHeartClick(heart);
          }
        }).catch(error => {
          console.log(error);
          alert("Sorry, this post is blocked.");
        });
      } else {
        showLogin();        
      }
      return;
    }

    let count = heart.nextElementSibling;

    if (!heart.classList.contains('liked')) {
      accountAPI.likePost(this.post).then((like) => {
        this.post.viewerLike = like.uri;
        heart.classList.add('liked');
        count.innerText = String(parseInt(count.innerText, 10) + 1);
      }).catch((error) => {
        console.log(error);
        alert(error);
      });
    } else {
      accountAPI.removeLike(this.post.viewerLike).then(() => {
        this.post.viewerLike = undefined;
        heart.classList.remove('liked');
        count.innerText = String(parseInt(count.innerText, 10) - 1);
      }).catch((error) => {
        console.log(error);
        alert(error);
      });
    }
  }
}
