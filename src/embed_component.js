import { atURI } from './utils.js';
import { $tag } from './utils_ts.js';
import { PostComponent } from './post_component.js';

import { ATProtoRecord, FeedGeneratorRecord, StarterPackRecord, UserListRecord } from './models/records.js';
import { BasePost, Post, MissingPost } from './models/posts.js';
import {
  Embed, RawRecordEmbed, RawRecordWithMediaEmbed, RawImageEmbed, RawLinkEmbed, RawVideoEmbed,
  InlineRecordEmbed, InlineRecordWithMediaEmbed, InlineImageEmbed, InlineLinkEmbed, InlineVideoEmbed
} from './models/embeds.js';

/**
 * Renders an embed (e.g. image or quoted post) inside the post view.
 */

export class EmbedComponent {

  /** @param {Post} post, @param {Embed} embed */
  constructor(post, embed) {
    this.post = post;
    this.embed = embed;
  }

  /** @returns {HTMLElement} */

  buildElement() {
    if (this.embed instanceof RawRecordEmbed) {
      let quoteView = this.quotedPostPlaceholder();
      this.loadQuotedPost(this.embed.record.uri, quoteView);
      return quoteView;

    } else if (this.embed instanceof RawRecordWithMediaEmbed) {
      let wrapper = $tag('div');

      let mediaView = new EmbedComponent(this.post, this.embed.media).buildElement();
      let quoteView = this.quotedPostPlaceholder();
      this.loadQuotedPost(this.embed.record.uri, quoteView);

      wrapper.append(mediaView, quoteView);
      return wrapper;

    } else if (this.embed instanceof InlineRecordEmbed) {
      return this.buildQuotedPostElement(this.embed.record);

    } else if (this.embed instanceof InlineRecordWithMediaEmbed) {
      let wrapper = $tag('div');

      let mediaView = new EmbedComponent(this.post, this.embed.media).buildElement();
      let quoteView = this.buildQuotedPostElement(this.embed.record);

      wrapper.append(mediaView, quoteView);
      return wrapper;

    } else if (this.embed instanceof RawImageEmbed || this.embed instanceof InlineImageEmbed) {
      return this.buildImagesComponent(this.embed);

    } else if (this.embed instanceof RawLinkEmbed || this.embed instanceof InlineLinkEmbed) {
      return this.buildLinkComponent(this.embed);

    } else if (this.embed instanceof RawVideoEmbed || this.embed instanceof InlineVideoEmbed) {
      return this.buildVideoComponent(this.embed);

    } else {
      return $tag('p', { text: `[${this.embed.type}]` });
    }
  }

  /** @returns {HTMLElement} */

  quotedPostPlaceholder() {
    return $tag('div.quote-embed', {
      html: '<p class="post placeholder">Loading quoted post...</p>'
    });
  }

  /** @param {ATProtoRecord} embeddedRecord, @returns {HTMLElement} */

  buildQuotedPostElement(embeddedRecord) {
    let div = $tag('div.quote-embed');

    if (embeddedRecord instanceof BasePost) {
      let postView = new PostComponent(embeddedRecord, 'quote').buildElement();
      div.appendChild(postView);

    } else if (embeddedRecord instanceof FeedGeneratorRecord) {
      return this.buildFeedGeneratorView(embeddedRecord);

    } else if (embeddedRecord instanceof UserListRecord) {
      return this.buildUserListView(embeddedRecord);

    } else if (embeddedRecord instanceof StarterPackRecord) {
      return this.buildStarterPackView(embeddedRecord);

    } else {
      let p = $tag('p', { text: `[${embeddedRecord.type}]` });
      div.appendChild(p);
    }

    return div;
  }

  /** @params {RawLinkEmbed | InlineLinkEmbed} embed, @returns {HTMLElement} */

  buildLinkComponent(embed) {
    let hostname;

    try {
      hostname = new URL(embed.url).hostname;
    } catch (error) {
      console.log("Invalid URL:" + error);

      let a = $tag('a', { href: embed.url, text: embed.title || embed.url });
      let p = $tag('p');
      p.append('[Link: ', a, ']');
      return p;
    }

    let a = $tag('a.link-card', { href: embed.url, target: '_blank' });
    let box = $tag('div');

    let domain = $tag('p.domain', { text: hostname });
    let title = $tag('h2', { text: embed.title || embed.url });
    box.append(domain, title);

    if (embed.description) {
      let text;

      if (embed.description.length <= 300) {
        text = embed.description;
      } else {
        text = embed.description.slice(0, 300) + '…';
      }

      box.append($tag('p.description', { text: text }));
    }

    a.append(box);

    if (hostname == 'media.tenor.com') {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.displayGIFInline(a, embed);
      });
    }

    return a;
  }

  /** @param {HTMLElement} a, @param {RawLinkEmbed | InlineLinkEmbed} embed */

  displayGIFInline(a, embed) {
    let gifDiv = $tag('div.gif');
    let img = $tag('img', { src: embed.url }, HTMLImageElement);
    img.style.opacity = '0';
    img.style.maxHeight = '200px';
    gifDiv.append(img);
    a.replaceWith(gifDiv);

    img.addEventListener('load', (e) => {
      if (img.naturalWidth > img.naturalHeight) {
        img.style.maxHeight = '200px';
      } else {
        img.style.maxWidth = '200px';
        img.style.maxHeight = '400px';
      }

      img.style.opacity = '';
    });

    let staticPic;

    if (typeof embed.thumb == 'string') {
      staticPic = embed.thumb;
    } else {
      staticPic = `https://cdn.bsky.app/img/avatar/plain/${this.post.author.did}/${embed.thumb.ref.$link}@jpeg`;
    }

    img.addEventListener('click', (e) => {
      if (img.classList.contains('static')) {
        img.src = embed.url;
        img.classList.remove('static');
      } else {
        img.src = staticPic;
        img.classList.add('static');
      }
    });
  }

  /** @param {FeedGeneratorRecord} feedgen, @returns {HTMLElement} */

  buildFeedGeneratorView(feedgen) {
    let link = this.linkToFeedGenerator(feedgen);

    let a = $tag('a.link-card.record', { href: link, target: '_blank' });
    let box = $tag('div');

    if (feedgen.avatar) {
      let avatar = $tag('img.avatar', HTMLImageElement);
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

  /** @param {UserListRecord} list, @returns {HTMLElement} */

  buildUserListView(list) {
    let link = this.linkToUserList(list);

    let a = $tag('a.link-card.record', { href: link, target: '_blank' });
    let box = $tag('div');

    if (list.avatar) {
      let avatar = $tag('img.avatar', HTMLImageElement);
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

  /** @param {StarterPackRecord} pack, @returns {HTMLElement} */

  buildStarterPackView(pack) {
    let { repo, rkey } = atURI(pack.uri);
    let link = `https://bsky.app/starter-pack/${repo}/${rkey}`;

    let a = $tag('a.link-card.record', { href: link, target: '_blank' });
    let box = $tag('div');

    let title = $tag('h2', { text: pack.title });
    title.append($tag('span.handle', { text: `• Starter pack by @${pack.author.handle}` }));
    box.append(title);

    if (pack.description) {
      let description = $tag('p.description', { text: pack.description });
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

  /** @params {RawImageEmbed | InlineImageEmbed} embed, @returns {HTMLElement} */

  buildImagesComponent(embed) {
    let wrapper = $tag('div');

    for (let image of embed.images) {
      let p = $tag('p');
      p.append('[');

      // TODO: load image
      let a = $tag('a', { text: "Image" }, HTMLLinkElement);

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

  /** @params {RawVideoEmbed | InlineVideoEmbed} embed, @returns {HTMLElement} */

  buildVideoComponent(embed) {
    let wrapper = $tag('div');

    // TODO: load thumbnail
    let a = $tag('a', { text: "Video" }, HTMLLinkElement);

    if (embed.playlistURL) {
      a.href = embed.playlistURL;
    } else {
      let cid = embed.video.ref['$link'];
      a.href = `https://video.bsky.app/watch/${this.post.author.did}/${cid}/playlist.m3u8`;
    }

    let p = $tag('p');
    p.append('[', a, ']');
    wrapper.append(p);

    if (embed.alt) {
      let details = $tag('details.image-alt');
      details.append(
        $tag('summary', { text: 'Show alt' }),
        embed.alt
      );
      wrapper.appendChild(details);
    }

    return wrapper;
  }

  /** @param {string} uri, @param {HTMLElement} div, @returns {Promise<void>} */

  async loadQuotedPost(uri, div) {
    let record = await api.loadPostIfExists(uri);

    if (record) {
      let post = new Post(record);
      let postView = new PostComponent(post, 'quote').buildElement();
      div.replaceChildren(postView);
    } else {
      let post = new MissingPost(this.embed.record);
      let postView = new PostComponent(post, 'quote').buildElement();
      div.replaceChildren(postView);
    }
  }
}
