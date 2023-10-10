class EmbedComponent {
  constructor(post, embed) {
    this.post = post;
    this.embed = embed;
  }

  buildElement() {
    let div, p, a, wrapper, postView, mediaView;

    switch (this.embed.constructor) {
    case RecordEmbed:
      div = $tag('div.quote-embed', {
        content: '<p class="post placeholder">Loading quoted post...</p>'
      });

      this.loadQuotedPost(this.embed.record.uri, div);
      return div;

    case RecordWithMediaEmbed:
      wrapper = $tag('div');

      mediaView = new EmbedComponent(this.post, this.embed.media).buildElement();
      wrapper.appendChild(mediaView);

      div = $tag('div.quote-embed', {
        content: '<p class="post placeholder">Loading quoted post...</p>'
      });
      wrapper.appendChild(div);

      this.loadQuotedPost(this.embed.record.uri, div);

      return wrapper;

    case InlineRecordEmbed:
      div = $tag('div.quote-embed');

      if (this.embed.post instanceof Post || this.embed.post instanceof BlockedPost) {
        postView = new PostComponent(this.embed.post).buildElement();
        div.appendChild(postView);
      } else {
        p = $tag('p', { text: `[${this.embed.post.type}]` });
        div.appendChild(p);
      }

      return div;

    case InlineRecordWithMediaEmbed:
      wrapper = $tag('div');

      mediaView = new EmbedComponent(this.post, this.embed.media).buildElement();
      wrapper.appendChild(mediaView);

      div = $tag('div.quote-embed');

      if (this.embed.post instanceof Post || this.embed.post instanceof BlockedPost) {
        postView = new PostComponent(this.embed.post).buildElement();
        div.appendChild(postView);
      } else {
        p = $tag('p', { text: `[${this.embed.post.type}]` });
        div.appendChild(p);
      }

      wrapper.appendChild(div);
      return wrapper;

    case ImageEmbed:
    case InlineImageEmbed:
      wrapper = $tag('div');
      this.addImagesFromEmbed(wrapper);
      return wrapper;

    case LinkEmbed:
    case InlineLinkEmbed:
      return $tag('p', {
        content: `[Link: <a href="${this.embed.url}">${this.embed.title || this.embed.url}</a>]`
      });

    default:
      return $tag('p', { text: `[${this.embed.type}]` });
    }
  }

  addImagesFromEmbed(wrapper) {
    for (let image of this.embed.images) {
      let p = $tag('p');
      p.append('[');

      // TODO: load image
      let a = $tag('a', { text: "Image" });

      if (image.fullsize) {
        a.href = image.fullsize;
      } else {
        let cid = image.image.ref['$link'];
        a.href = `https://av-cdn.bsky.app/img/feed_fullsize/plain/${this.post.author.did}/${cid}@jpeg`;
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
  }

  async loadQuotedPost(uri, div) {
    let result = await api.loadPost(uri);
    let post = new Post(result, { isEmbed: true });

    let postView = new PostComponent(post).buildElement();
    div.innerHTML = '';
    div.appendChild(postView);
  }
}
