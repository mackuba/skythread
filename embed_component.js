class EmbedComponent {
  constructor(post, embed) {
    this.post = post;
    this.embed = embed;
  }

  buildElement() {
    let wrapper, quoteView, mediaView;

    switch (this.embed.constructor) {
    case RecordEmbed:
      quoteView = this.quotedPostPlaceholder();
      this.loadQuotedPost(this.embed.record.uri, quoteView);
      return quoteView;

    case RecordWithMediaEmbed:
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

    case ImageEmbed:
    case InlineImageEmbed:
      return this.buildImagesComponent();

    case LinkEmbed:
    case InlineLinkEmbed:
      return this.buildLinkComponent();

    default:
      return $tag('p', { text: `[${this.embed.type}]` });
    }
  }

  quotedPostPlaceholder() {
    return $tag('div.quote-embed', {
      html: '<p class="post placeholder">Loading quoted post...</p>'
    });
  }

  buildQuotedPostElement() {
    let div = $tag('div.quote-embed');

    if (this.embed.post instanceof Post || this.embed.post instanceof BlockedPost) {
      let postView = new PostComponent(this.embed.post).buildElement('quote');
      div.appendChild(postView);
    } else {
      let p = $tag('p', { text: `[${this.embed.post.type}]` });
      div.appendChild(p);
    }

    return div;
  }

  buildLinkComponent() {
    let a = $tag('a', { href: this.embed.url, text: this.embed.title || this.embed.url });

    let p = $tag('p');
    p.append('[Link: ', a, ']');
    return p;
  }

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

  async loadQuotedPost(uri, div) {
    let result = await api.loadPost(uri);
    let post = new Post(result, { isEmbed: true });

    let postView = new PostComponent(post).buildElement('quote');
    div.replaceChildren(postView);
  }
}
