/**
 * Renders a post/thread view and its subviews.
 */

class PostComponent {
  /**
   * Post component's root HTML element, if built.
   * @type {HTMLElement | undefined}
   */
  _rootElement;

  /**
    Contexts:
    - thread - a post in the thread tree
    - parent - parent reference above the thread root
    - quote - a quote embed
    - quotes - a post on the quotes page
    - feed - a post on the hashtag feed page

    @typedef {'thread' | 'parent' | 'quote' | 'quotes' | 'feed'} PostContext
    @param {AnyPost} post, @param {PostContext} context
  */
  constructor(post, context) {
    this.post = /** @type {Post}, TODO */ (post);
    this.context = context;
  }

  /**
   * @returns {HTMLElement}
   */
  get rootElement() {
    if (!this._rootElement) {
      throw new Error("rootElement not initialized");
    }

    return this._rootElement;
  }

  /** @returns {boolean} */
  get isRoot() {
    return this.post.isRoot;
  }

  /** @returns {string} */
  get linkToAuthor() {
    if (this.post.author.handle != 'handle.invalid') {
      return 'https://bsky.app/profile/' + this.post.author.handle;
    } else {
      return 'https://bsky.app/profile/' + this.post.author.did;
    }
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
    if (this.context == 'quotes' || this.context == 'feed') {
      return { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' };
    } else if (this.isRoot || this.context != 'thread') {
      return { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' };
    } else if (this.post.pageRoot && !sameDay(this.post.createdAt, this.post.pageRoot.createdAt)) {
      return { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric' };
    } else {
      return { hour: 'numeric', minute: 'numeric' };
    }
  }

  /** @param {HTMLElement} nodeToUpdate */
  installIntoElement(nodeToUpdate) {
    let view = this.buildElement();

    let oldContent = $(nodeToUpdate.querySelector('.content'));
    let newContent = $(view.querySelector('.content'));
    oldContent.replaceWith(newContent);

    this._rootElement = nodeToUpdate;
  }

  /** @returns {HTMLElement} */
  buildElement() {
    if (this._rootElement) {
      return this._rootElement;
    }

    let div = $tag('div.post', `post-${this.context}`);
    this._rootElement = div;

    if (this.post.muted) {
      div.classList.add('muted');
    }

    if (this.post instanceof BlockedPost) {
      this.buildBlockedPostElement(div);
      return div;
    } else if (this.post instanceof DetachedQuotePost) {
      this.buildDetachedQuoteElement(div);
      return div;
    } else if (this.post instanceof MissingPost) {
      this.buildMissingPostElement(div);
      return div;
    }

    let header = this.buildPostHeader();
    div.appendChild(header);

    let content = $tag('div.content');

    if (this.context == 'thread' && !this.isRoot) {
      let edgeMargin = this.buildEdgeMargin();
      div.appendChild(edgeMargin);
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

    if (this.post.tags) {
      let tagsRow = this.buildTagsRow(this.post.tags);
      wrapper.appendChild(tagsRow);
    }

    if (this.post.embed) {
      let embed = new EmbedComponent(this.post, this.post.embed).buildElement();
      wrapper.appendChild(embed);

      if (this.post.originalFediURL) {
        if (this.post.embed instanceof InlineLinkEmbed && this.post.embed.title.startsWith('Original post on ')) {
          embed.remove();
        }
      }
    }

    if (this.post.originalFediURL) {
      let link = this.buildFediSourceLink(this.post.originalFediURL);
      if (link) {
        wrapper.appendChild(link);
      }
    }

    if (this.post.likeCount !== undefined && this.post.repostCount !== undefined) {
      let stats = this.buildStatsFooter();
      wrapper.appendChild(stats);
    }

    if (this.post.replyCount == 1 && this.post.replies[0]?.author?.did == this.post.author.did) {
      let component = new PostComponent(this.post.replies[0], 'thread');
      let element = component.buildElement();
      element.classList.add('flat');
      content.appendChild(element);
    } else {
      for (let reply of this.post.replies) {
        if (reply instanceof MissingPost) { continue }
        if (reply instanceof BlockedPost && window.biohazardEnabled === false) { continue }

        let component = new PostComponent(reply, 'thread');
        content.appendChild(component.buildElement());
      }
    }

    if (this.context == 'thread') {
      if (this.post.hasMoreReplies) {
        let loadMore = this.buildLoadMoreLink();
        content.appendChild(loadMore);
      } else if (this.post.hasHiddenReplies && window.biohazardEnabled !== false) {
        let loadMore = this.buildHiddenRepliesLink();
        content.appendChild(loadMore);
      }
    }

    div.appendChild(content);

    return div;
  }

  /** @returns {HTMLElement} */

  buildPostHeader() {
    let timeFormat = this.timeFormatForTimestamp;
    let formattedTime = this.post.createdAt.toLocaleString(window.dateLocale, timeFormat);
    let isoTime = this.post.createdAt.toISOString();

    let h = $tag('h2');

    h.innerHTML = `${escapeHTML(this.authorName)} `;

    if (this.post.isFediPost) {
      let handle = `@${this.post.authorFediHandle}`;
      h.innerHTML += `<a class="handle" href="${this.linkToAuthor}" target="_blank">${handle}</a> ` +
        `<img src="icons/mastodon.svg" class="mastodon"> `;
    } else {
      let handle = (this.post.author.handle != 'handle.invalid') ? `@${this.post.author.handle}` : '[invalid handle]';
      h.innerHTML += `<a class="handle" href="${this.linkToAuthor}" target="_blank">${handle}</a> `;
    }

    h.innerHTML += `<span class="separator">&bull;</span> ` +
      `<a class="time" href="${this.linkToPost}" target="_blank" title="${isoTime}">${formattedTime}</a> `;

    if (this.post.replyCount > 0 && !this.isRoot || ['quote', 'quotes', 'feed'].includes(this.context)) {
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

  buildEdgeMargin() {
    let div = $tag('div.margin');

    let edge = $tag('div.edge');
    let line = $tag('div.line');
    edge.appendChild(line);
    div.appendChild(edge);

    let plus = $tag('img.plus', { src: 'icons/subtract-square.png' });
    div.appendChild(plus);

    [edge, plus].forEach(x => {
      x.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleSectionFold();
      });
    });

    return div;
  }

  /** @param {string} url, @returns {HTMLImageElement} */

  buildUserAvatar(url) {
    let avatar = $tag('img.avatar', { loading: 'lazy' }, HTMLImageElement); // needs to be set before src!
    avatar.src = url;
    window.avatarPreloader.observe(avatar);
    return avatar;
  }

  /** @returns {HTMLElement} */

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

    return p;
  }

  /** @param {string[]} terms */

  highlightSearchResults(terms) {
    let regexp = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');

    let root = this.rootElement;
    let body = $(root.querySelector(':scope > .content > .body, :scope > .content > details .body'));
    let walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let textNodes = [];

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    for (let node of textNodes) {
      if (!node.textContent) { continue; }

      let markedText = document.createDocumentFragment();
      let currentPosition = 0;

      for (;;) {
        let match = regexp.exec(node.textContent);
        if (match === null) break;

        if (match.index > currentPosition) {
          let earlierText = node.textContent.slice(currentPosition, match.index);
          markedText.appendChild(document.createTextNode(earlierText));
        }

        let span = $tag('span.highlight', { text: match[0] });
        markedText.appendChild(span);

        currentPosition = match.index + match[0].length;
      }

      if (currentPosition < node.textContent.length) {
        let remainingText = node.textContent.slice(currentPosition);
        markedText.appendChild(document.createTextNode(remainingText));
      }

      $(node.parentNode).replaceChild(markedText, node);
    }
  }

  /** @param {string[]} tags, @returns {HTMLElement} */

  buildTagsRow(tags) {
    let p = $tag('p.tags');

    for (let tag of tags) {
      let url = new URL(getLocation());
      url.searchParams.set('hash', tag);

      let tagLink = $tag('a', { href: url.toString(), text: '# ' + tag });
      p.append(tagLink);
    }

    return p;
  }

  /** @returns {HTMLElement} */

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

    if (this.post.replyCount > 0 && (this.context == 'quotes' || this.context == 'feed')) {
      let pluralizedCount = (this.post.replyCount > 1) ? `${this.post.replyCount} replies` : '1 reply';
      let span = $tag('span', {
        html: `<i class="fa-regular fa-message"></i> <a href="${linkToPostThread(this.post)}">${pluralizedCount}</a>`
      });
      stats.append(span);
    }

    if (!this.isRoot && this.context != 'quote' && this.post.quoteCount) {
      let expanded = this.context == 'quotes' || this.context == 'feed';
      let quotesLink = this.buildQuotesIconLink(this.post.quoteCount, expanded);
      stats.append(quotesLink);
    }

    if (this.context == 'thread' && this.post.isRestrictingReplies) {
      let span = $tag('span', { html: `<i class="fa-solid fa-ban"></i> Limited replies` });
      stats.append(span);
    }

    return stats;
  }

  /** @param {number} count, @param {boolean} expanded, @returns {HTMLElement} */

  buildQuotesIconLink(count, expanded) {
    let q = new URL(getLocation());
    q.searchParams.set('quotes', this.linkToPost);

    let url = q.toString();
    let icon = `<i class="fa-regular fa-comments"></i>`;

    if (expanded) {
      let span = $tag('span', { html: `${icon} ` });
      let link = $tag('a', { text: (count > 1) ? `${count} quotes` : '1 quote', href: url });
      span.append(link);
      return span;
    } else {
      return $tag('a', { html: `${icon} ${count}`, href: url });
    }
  }

  /** @param {number} quoteCount, @param {boolean} expanded */

  appendQuotesIconLink(quoteCount, expanded) {
    let stats = $(this.rootElement.querySelector(':scope > .content > p.stats'));
    let quotesLink = this.buildQuotesIconLink(quoteCount, expanded);
    stats.append(quotesLink);
  }

  /** @returns {HTMLElement} */

  buildLoadMoreLink() {
    let loadMore = $tag('p');

    let link = $tag('a', {
      href: linkToPostThread(this.post),
      text: "Load more replies…"
    });

    link.addEventListener('click', (e) => {
      e.preventDefault();
      loadMore.innerHTML = `<img class="loader" src="icons/sunny.png">`;
      this.loadSubtree(this.post, this.rootElement);
    });

    loadMore.appendChild(link);
    return loadMore;
  }

  /** @returns {HTMLElement} */

  buildHiddenRepliesLink() {
    let loadMore = $tag('p.hidden-replies');

    let link = $tag('a', {
      href: linkToPostThread(this.post),
      text: "Load hidden replies…"
    });

    link.addEventListener('click', (e) => {
      e.preventDefault();

      if (window.biohazardEnabled === true) {
        this.loadHiddenReplies(loadMore);
      } else {
        window.loadInfohazard = () => this.loadHiddenReplies(loadMore);
        showDialog($id('biohazard_dialog'));
      }
    });

    loadMore.append("☣️ ", link);
    return loadMore;
  }

  /** @param {HTMLElement} loadMoreButton */

  loadHiddenReplies(loadMoreButton) {
    loadMoreButton.innerHTML = `<img class="loader" src="icons/sunny.png">`;
    this.loadHiddenSubtree(this.post, this.rootElement);
  }

  /** @param {string} url, @returns {HTMLElement | undefined} */

  buildFediSourceLink(url) {
    try {
      let hostname = new URL(url).hostname;
      let a = $tag('a.fedi-link', { href: url, target: '_blank' });

      let box = $tag('div', { html: `<i class="fa-solid fa-arrow-up-right-from-square fa-sm"></i> View on ${hostname}` });
      a.append(box);
      return a;
    } catch (error) {
      console.log("Invalid Fedi URL:" + error);
      return undefined;
    }
  }

  /** @param {HTMLLinkElement} authorLink */

  loadReferencedPostAuthor(authorLink) {
    let did = atURI(this.post.uri).repo;

    api.fetchHandleForDid(did).then(handle => {
      if (this.post.author) {
        this.post.author.handle = handle;
      } else {
        this.post.author = { did, handle };
      }

      authorLink.href = this.linkToAuthor;
      authorLink.innerText = `@${handle}`;
    });
  }

  /** @param {HTMLElement} div, @returns {HTMLElement} */

  buildBlockedPostElement(div) {
    let p = $tag('p.blocked-header');
    p.innerHTML = `<i class="fa-solid fa-ban"></i> <span>Blocked post</span>`;

    if (window.biohazardEnabled === false) {
      div.appendChild(p);
      div.classList.add('blocked');
      return p;
    }

    let blockStatus = this.post.blockedByUser ? 'has blocked you' : this.post.blocksUser ? "you've blocked them" : '';
    blockStatus = blockStatus ? `, ${blockStatus}` : '';

    let authorLink = $tag('a', { href: this.didLinkToAuthor, target: '_blank', text: 'see author' }, HTMLLinkElement);
    p.append(' (', authorLink, blockStatus, ') ');
    div.appendChild(p);

    this.loadReferencedPostAuthor(authorLink);

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

  /** @param {HTMLElement} div, @returns {HTMLElement} */

  buildDetachedQuoteElement(div) {
    let p = $tag('p.blocked-header');
    p.innerHTML = `<i class="fa-solid fa-ban"></i> <span>Hidden quote</span>`;

    if (window.biohazardEnabled === false) {
      div.appendChild(p);
      div.classList.add('blocked');
      return p;
    }

    let authorLink = $tag('a', { href: this.didLinkToAuthor, target: '_blank', text: 'see author' }, HTMLLinkElement);
    p.append(' (', authorLink, ') ');
    div.appendChild(p);

    this.loadReferencedPostAuthor(authorLink);

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

  /** @param {HTMLElement} div, @returns {HTMLElement} */

  buildMissingPostElement(div) {
    let p = $tag('p.blocked-header');
    p.innerHTML = `<i class="fa-solid fa-ban"></i> <span>Deleted post</span>`;

    let authorLink = $tag('a', { href: this.didLinkToAuthor, target: '_blank', text: 'see author' }, HTMLLinkElement);
    p.append(' (', authorLink, ') ');

    this.loadReferencedPostAuthor(authorLink);

    div.appendChild(p);
    div.classList.add('blocked');
    return div;
  }

  /** @param {string} uri, @param {HTMLElement} div, @returns Promise<void> */

  async loadBlockedPost(uri, div) {
    let record = await appView.loadPostIfExists(this.post.uri);

    if (!record) {
      let post = new MissingPost({ uri: this.post.uri });
      let postView = new PostComponent(post, 'quote').buildElement();
      div.replaceWith(postView);
      return;
    }

    this.post = new Post(record);

    let userView = await api.getRequest('app.bsky.actor.getProfile', { actor: this.post.author.did });

    if (!userView.viewer || !(userView.viewer.blockedBy || userView.viewer.blocking)) {
      let { repo, rkey } = atURI(this.post.uri);

      let a = $tag('a', {
        href: linkToPostById(repo, rkey),
        className: 'action',
        title: "Load thread",
        html: `<i class="fa-solid fa-arrows-split-up-and-left fa-rotate-180"></i>`
      });

      let header = $(div.querySelector('p.blocked-header'));
      let separator = $tag('span.separator', { html: '&bull;' });
      header.append(separator, ' ', a);
    }

    let loadPost = $(div.querySelector('p.load-post'));
    loadPost.remove();

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

      // TODO
      Array.from(div.querySelectorAll('a.link-card')).forEach(x => x.remove());
    }
  }

  /** @param {Post} post, @param {HTMLElement} nodeToUpdate, @returns {Promise<void>} */

  async loadSubtree(post, nodeToUpdate) {
    try {
      let json = await api.loadThreadByAtURI(post.uri);

      let root = Post.parseThreadPost(json.thread, post.pageRoot, 0, post.absoluteLevel);
      post.updateDataFromPost(root);
      window.subtreeRoot = post;

      let component = new PostComponent(post, 'thread');
      component.installIntoElement(nodeToUpdate);
    } catch (error) {
      showError(error);
    }
  }


  /** @param {Post} post, @param {HTMLElement} nodeToUpdate, @returns {Promise<void>} */

  async loadHiddenSubtree(post, nodeToUpdate) {
    let content = $(nodeToUpdate.querySelector('.content'));
    let hiddenRepliesDiv = $(content.querySelector(':scope > .hidden-replies'));

    try {
      var expectedReplyURIs = await blueAPI.getReplies(post.uri);
    } catch (error) {
      hiddenRepliesDiv.remove();

      if (error instanceof APIError && error.code == 404) {
        let info = $tag('p.missing-replies-info', {
          html: `<i class="fa-solid fa-ban"></i> Hidden replies not available (post too old)`
        });
        content.append(info);
      } else {
        setTimeout(() => showError(error), 1);
      }

      return;
    }

    let missingReplyURIs = expectedReplyURIs.filter(r => !post.replies.some(x => x.uri === r));
    let promises = missingReplyURIs.map(uri => api.loadThreadByAtURI(uri));

    try {
      // TODO
      var responses = await Promise.allSettled(promises);
    } catch (error) {
      hiddenRepliesDiv.remove();
      setTimeout(() => showError(error), 1);
      return;
    }

    let replies = responses
      .map(r => r.status == 'fulfilled' ? r.value : undefined)
      .filter(v => v)
      .map(json => Post.parseThreadPost(json.thread, post.pageRoot, 1, post.absoluteLevel + 1));

    post.setReplies(replies);
    hiddenRepliesDiv.remove();

    for (let reply of post.replies) {
      let component = new PostComponent(reply, 'thread');
      let view = component.buildElement();
      content.append(view);
    }

    if (replies.length < responses.length) {
      let notFoundCount = responses.length - replies.length;
      let pluralizedCount = (notFoundCount > 1) ? `${notFoundCount} replies are` : '1 reply is';

      let info = $tag('p.missing-replies-info', {
        html: `<i class="fa-solid fa-ban"></i> ${pluralizedCount} missing (likely taken down by moderation)`
      });
      content.append(info);
    }
  }

  /** @returns {boolean} */
  isCollapsed() {
    return this.rootElement.classList.contains('collapsed');
  }

  toggleSectionFold() {
    let plus = $(this.rootElement.querySelector(':scope > .margin .plus'), HTMLImageElement);

    if (this.isCollapsed()) {
      this.rootElement.classList.remove('collapsed');
      plus.src = 'icons/subtract-square.png'
    } else {
      this.rootElement.classList.add('collapsed');
      plus.src = 'icons/add-square.png'
    }
  }

  /** @param {HTMLElement} heart, @returns {Promise<void>} */

  async onHeartClick(heart) {
    try {
      if (!this.post.hasViewerInfo) {
        if (accountAPI.isLoggedIn) {
          let data = await this.loadViewerInfo();

          if (data) {
            if (this.post.liked) {
              heart.classList.add('liked');
              return;
            } else {
              // continue down
            }
          } else {
            this.showPostAsBlocked();
            return;
          }
        } else {
          // not logged in
          showDialog(loginDialog);
          return;
        }
      }

      let countField = $(heart.nextElementSibling);
      let likeCount = parseInt(countField.innerText, 10);

      if (!heart.classList.contains('liked')) {
        let like = await accountAPI.likePost(this.post);
        this.post.viewerLike = like.uri;
        heart.classList.add('liked');
        countField.innerText = String(likeCount + 1);
      } else {
        await accountAPI.removeLike(this.post.viewerLike);
        this.post.viewerLike = undefined;
        heart.classList.remove('liked');
        countField.innerText = String(likeCount - 1);
      }
    } catch (error) {
      showError(error);
    }
  }

  showPostAsBlocked() {
    let stats = $(this.rootElement.querySelector(':scope > .content > p.stats'));

    if (!stats.querySelector('.blocked-info')) {
      let span = $tag('span.blocked-info', { text: '🚫 Post unavailable' });
      stats.append(span);
    }
  }

  /** @returns {Promise<json | undefined>} */

  async loadViewerInfo() {
    let data = await accountAPI.loadPostIfExists(this.post.uri);

    if (data) {
      this.post.author = data.author;
      this.post.viewerData = data.viewer;
      this.post.viewerLike = data.viewer?.like;
    }

    return data;
  }
}
