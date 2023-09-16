class EmbedComponent {
  constructor(post, embed) {
    this.post = post;
    this.embed = embed;
  }

  buildElement() {
    let div, p, a, wrapper, postView, mediaView;

    switch (this.embed.constructor) {
    case RecordEmbed:
      div = document.createElement('div');
      div.className = 'quote-embed'
      div.innerHTML = '<p class="post placeholder">Loading quoted post...</p>';

      this.loadQuotedPost(this.embed.record.uri, div);
      return div;

    case RecordWithMediaEmbed:
      wrapper = document.createElement('div');

      mediaView = new EmbedComponent(this.post, this.embed.media).buildElement();
      wrapper.appendChild(mediaView);

      div = document.createElement('div');
      div.className = 'quote-embed'
      div.innerHTML = '<p class="post placeholder">Loading quoted post...</p>';
      wrapper.appendChild(div);

      this.loadQuotedPost(this.embed.record.uri, div);

      return wrapper;

    case InlineRecordEmbed:
      div = document.createElement('div');
      div.className = 'quote-embed'

      if (this.embed.post instanceof Post) {
        postView = new PostComponent(this.embed.post).buildElement();
        div.appendChild(postView);
      } else {
        p = document.createElement('p');
        p.innerText = `[${this.embed.post.type}]`;
        div.appendChild(p);
      }

      return div;

    case InlineRecordWithMediaEmbed:
      wrapper = document.createElement('div');

      mediaView = new EmbedComponent(this.post, this.embed.media).buildElement();
      wrapper.appendChild(mediaView);

      div = document.createElement('div');
      div.className = 'quote-embed'

      if (this.embed.post instanceof Post) {
        postView = new PostComponent(this.embed.post).buildElement();
        div.appendChild(postView);
      } else {
        p = document.createElement('p');
        p.innerText = `[${this.embed.post.type}]`;
        div.appendChild(p);
      }

      wrapper.appendChild(div);
      return wrapper;

    case ImageEmbed:
    case InlineImageEmbed:
      wrapper = document.createElement('div');
      this.addImagesFromEmbed(wrapper);
      return wrapper;

    case LinkEmbed:
    case InlineLinkEmbed:
      p = document.createElement('p');
      p.append('[Link: ');

      a = document.createElement('a');
      a.innerText = this.embed.title || this.embed.url;
      a.href = this.embed.url;
      p.append(a);

      p.append(']');
      return p;

    default:
      p = document.createElement('p');
      p.innerText = `[${this.embed.type}]`;
      return p;
    }
  }

  addImagesFromEmbed(wrapper) {
    for (let image of this.embed.images) {
      let p = document.createElement('p');
      p.append('[');

      // TODO: load image
      let a = document.createElement('a');
      a.innerText = "Image";

      if (image.fullsize) {
        a.href = image.fullsize;
      } else {
        let cid = image.image.ref['$link'];
        a.href = `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${this.post.author.did}&cid=${cid}`;          
      }

      p.append(a);
      p.append('] ');
      wrapper.append(p);        

      if (image.alt) {
        let details = document.createElement('details');
        let summary = document.createElement('summary');
        summary.innerText = 'Show alt';
        details.appendChild(summary);
        details.append(image.alt);
        details.className = 'image-alt';
        wrapper.appendChild(details);
      }
    }
  }

  async loadQuotedPost(uri, div) {
    let results = await api.loadRawPostWithAuthor(uri);
    let post = new Post(results.post, { author: results.author, isEmbed: true });

    let postView = new PostComponent(post).buildElement();
    div.innerHTML = '';
    div.appendChild(postView);
  }
}
