import * as svelte from 'svelte';
import { $, atURI } from './utils.js';
import { $tag } from './utils_ts.js';
import { Post, MissingPost } from './models/posts.js';
import { linkToPostById } from './router.js';

/**
 * Renders a post/thread view and its subviews.
 */

export class PostComponent {
  /**
   * Post component's root HTML element, if built.
   * @type {HTMLElement | undefined}
   */
  _rootElement;

  /**
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

  /** @param {number} quoteCount, @param {boolean} expanded */

  appendQuotesIconLink(quoteCount, expanded) {
    /*let stats = $(this.rootElement.querySelector(':scope > .content > p.stats'));
    let quotesLink = this.buildQuotesIconLink(quoteCount, expanded);
    stats.append(quotesLink);*/
  }

  /** @param {string} uri, @param {HTMLElement} div, @returns {Promise<void>} */

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

    this.buildPostBody(div);

    if (this.post.embed) {
      svelte.mount(EmbedComponent, {
        target: div,
        context: new Map(Object.entries({
          post: {
            post: this.post
          }
        })),
        props: {
          embed: this.post.embed
        }
      });

      // TODO
      Array.from(div.querySelectorAll('a.link-card')).forEach(x => x.remove());
    }
  }
}
