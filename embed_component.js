/**
 * Renders an embed (e.g. image or quoted post) inside the post view.
 */

class EmbedComponent {

  /** @param {Post} post, @param {object} embed */
  constructor(post, embed) {
    this.post = post;
    this.embed = embed;
  }

  /** @returns {AnyElement} */

  buildElement() {
    let wrapper, quoteView, mediaView;

    switch (this.embed.constructor) {
    case RawRecordEmbed:
      quoteView = this.quotedPostPlaceholder();
      this.loadQuotedPost(this.embed.record.uri, quoteView);
      return quoteView;

    case RawRecordWithMediaEmbed:
      wrapper = $tag('div');

      mediaView = new EmbedComponent(this.post, this.embed.media).buildElement();
      quoteView = this.quotedPostPlaceholder();
      this.loadQuotedPost(this.embed.record.uri, quoteView);

      wrapper.append(mediaView, quoteView);
      return wrapper;

    case InlineRecordEmbed:
      return this.buildQuotedPostElement();

    case InlineRecordWithMediaEmbed:
      wrapper = $tag('div');

      mediaView = new EmbedComponent(this.post, this.embed.media).buildElement();
      quoteView = this.buildQuotedPostElement();

      wrapper.append(mediaView, quoteView);
      return wrapper;

    case RawImageEmbed:
    case InlineImageEmbed:
      return this.buildImagesComponent();

    case RawLinkEmbed:
    case InlineLinkEmbed:
      return this.buildLinkComponent();

    default:
      return $tag('p', { text: `[${this.embed.type}]` });
    }
  }

  /** @returns {AnyElement} */

  quotedPostPlaceholder() {
    return $tag('div.quote-embed', {
      html: '<p class="post placeholder">Loading quoted post...</p>'
    });
  }

  /** @returns {AnyElement} */

  buildQuotedPostElement() {
    let div = $tag('div.quote-embed');

    if (this.embed.post instanceof Post || this.embed.post instanceof BlockedPost) {
      let postView = new PostComponent(this.embed.post).buildElement('quote');
      div.appendChild(postView);
    } else if (this.embed.post instanceof FeedGeneratorRecord) {
      return this.buildFeedGeneratorView(this.embed.post);
    } else if (this.embed.post instanceof UserListRecord) {
      return this.buildUserListView(this.embed.post);
    } else {
      let p = $tag('p', { text: `[${this.embed.post.type}]` });
      div.appendChild(p);
    }

    return div;
  }

  /** @returns {AnyElement} */

  buildLinkComponent() {
    let a = $tag('a.link-card', { href: this.embed.url, target: '_blank' });
    let box = $tag('div');

    let domain = $tag('p.domain', { text: new URL(this.embed.url).hostname });
    let title = $tag('h2', { text: this.embed.title });
    let description = this.embed.description ? $tag('p.description', { text: this.embed.description }) : '';
    box.append(domain, title, description);
    a.append(box);

    return a;
  }

  /** @param {FeedGeneratorRecord} feedgen, @returns {AnyElement} */

  buildFeedGeneratorView(feedgen) {
    let link = this.linkToFeedGenerator(feedgen);

    let a = $tag('a.link-card.record', { href: link, target: '_blank' });
    let box = $tag('div');

    if (feedgen.avatar) {
      let avatar = $tag('img.avatar');
      avatar.src = feedgen.avatar;
      box.append(avatar);
    }

    let title = $tag('h2', { text: feedgen.title });
    title.append($tag('span.handle', { text: `• Feed by @${feedgen.author.handle}` }));
    box.append(title);

    if (feedgen.description) {
      let description = $tag('p.description', { text: feedgen.description });
      box.append(description);
    }

    let stats = $tag('p.stats');
    stats.append($tag('i', 'fa-solid fa-heart'), ' ');
    stats.append($tag('output', { text: feedgen.likeCount }));
    box.append(stats);

    a.append(box);
    return a;
  }

  /** @param {FeedGeneratorRecord} feedgen, @returns {string} */

  linkToFeedGenerator(feedgen) {
    let { repo, rkey } = atURI(feedgen.uri);
    return `https://bsky.app/profile/${repo}/feed/${rkey}`;
  }

  /** @param {UserListRecord} list, @returns {AnyElement} */

  buildUserListView(list) {
    let link = this.linkToUserList(list);

    let a = $tag('a.link-card.record', { href: link, target: '_blank' });
    let box = $tag('div');

    if (list.avatar) {
      let avatar = $tag('img.avatar');
      avatar.src = list.avatar;
      box.append(avatar);
    }

    let listType;

    switch (list.purpose) {
    case 'app.bsky.graph.defs#curatelist':
      listType = "User list";
      break;
    case 'app.bsky.graph.defs#modlist':
      listType = "Mute list";
      break;
    default:
      listType = "List";
    }

    let title = $tag('h2', { text: list.title });
    title.append($tag('span.handle', { text: `• ${listType} by @${list.author.handle}` }));
    box.append(title);

    if (list.description) {
      let description = $tag('p.description', { text: list.description });
      box.append(description);
    }

    a.append(box);
    return a;
  }

  /** @param {UserListRecord} list, @returns {string} */

  linkToUserList(list) {
    let { repo, rkey } = atURI(list.uri);
    return `https://bsky.app/profile/${repo}/lists/${rkey}`;
  }

  /** @returns {AnyElement} */

  buildImagesComponent() {
    let wrapper = $tag('div');

    for (let image of this.embed.images) {
      let p = $tag('p');
      p.append('[');

      // TODO: load image
      let a = $tag('a', { text: "Image" });

      if (image.fullsize) {
        a.href = image.fullsize;
      } else {
        let cid = image.image.ref['$link'];
        a.href = `https://cdn.bsky.app/img/feed_fullsize/plain/${this.post.author.did}/${cid}@jpeg`;
      }

      p.append(a);
      p.append('] ');
      wrapper.append(p);

      if (image.alt) {
        let details = $tag('details.image-alt');
        details.append(
          $tag('summary', { text: 'Show alt' }),
          image.alt
        );
        wrapper.appendChild(details);
      }
    }

    return wrapper;
  }

  /** @param {string} uri, @param {AnyElement} div, @returns Promise<void> */

  async loadQuotedPost(uri, div) {
    let result = await api.loadPost(uri);
    let post = new Post(result);

    let postView = new PostComponent(post).buildElement('quote');
    div.replaceChildren(postView);
  }
}
