import * as svelte from 'svelte';
import { $, atURI, showError } from './utils.js';
import { $tag } from './utils_ts.js';
import { Post, BlockedPost, MissingPost, DetachedQuotePost, parseThreadPost } from './models/posts.js';
import { account } from './models/account.svelte.js';
import { InlineLinkEmbed } from './models/embeds.js';
import { APIError, HiddenRepliesError } from './api/api.js';
import { linkToPostById, linkToPostThread } from './router.js';
import { showBiohazardDialog } from './skythread.js';
import { PostPresenter } from './utils/post_presenter.js';

import BlockedPostView from './components/posts/BlockedPostView.svelte';
import EdgeMargin from './components/posts/EdgeMargin.svelte';
import EmbedComponent from './components/embeds/EmbedComponent.svelte';
import FediSourceLink from './components/posts/FediSourceLink.svelte';
import HiddenRepliesLink from './components/posts/HiddenRepliesLink.svelte';
import LoadMoreLink from './components/posts/LoadMoreLink.svelte';
import MissingPostView from './components/posts/MissingPostView.svelte';
import PostBody from './components/posts/PostBody.svelte';
import PostHeader from './components/posts/PostHeader.svelte';
import PostTagsRow from './components/posts/PostTagsRow.svelte';
import PostFooter from './components/posts/PostFooter.svelte';

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
    Contexts:
    - thread - a post in the thread tree
    - parent - parent reference above the thread root
    - quote - a quote embed
    - quotes - a post on the quotes page
    - feed - a post on the hashtag feed page

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

    this.buildPostHeader(div);

    let content = $tag('div.content');

    if (this.context == 'thread' && !this.isRoot) {
      this.buildEdgeMargin(div);
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

    this.buildPostBody(wrapper);

    if (this.post.tags) {
      this.buildTagsRow(wrapper);
    }

    if (this.post.embed) {
      this.buildEmbedComponent(wrapper);
    }

    if (this.post.originalFediURL) {
      this.buildFediSourceLink(this.post.originalFediURL, wrapper);
    }

    if (this.post.likeCount !== undefined && this.post.repostCount !== undefined) {
      this.buildStatsFooter(wrapper);
    }

    if (this.post.replyCount == 1 && this.post.replies[0]?.author?.did == this.post.author.did) {
      let component = new PostComponent(this.post.replies[0], 'thread');
      let element = component.buildElement();
      element.classList.add('flat');
      content.appendChild(element);
    } else {
      for (let reply of this.post.replies) {
        if (reply instanceof MissingPost) { continue }
        if (reply instanceof BlockedPost && account.biohazardEnabled === false) { continue }

        let component = new PostComponent(reply, 'thread');
        content.appendChild(component.buildElement());
      }
    }

    if (this.context == 'thread') {
      if (this.post.hasMoreReplies) {
        this.buildLoadMoreLink(content);
      } else if (this.post.hasHiddenReplies && account.biohazardEnabled !== false) {
        let loadMore = this.buildHiddenRepliesLink();
        content.appendChild(loadMore);
      }
    }

    div.appendChild(content);

    return div;
  }

  /** @param {HTMLElement} div */

  buildEmbedComponent(div) {
    if (this.post.originalFediURL) {
      if (this.post.embed instanceof InlineLinkEmbed && this.post.embed.title?.startsWith('Original post on ')) {
        return;
      }
    }

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
  }

  /** @param {HTMLElement} div */

  buildPostHeader(div) {
    svelte.mount(PostHeader, {
      target: div,
      context: new Map(Object.entries({
        post: {
          post: this.post,
          context: this.context,
          presenter: new PostPresenter(this.post, this.context)
        }
      }))
    });
  }

  /** @param {HTMLElement} div */

  buildEdgeMargin(div) {
    svelte.mount(EdgeMargin, {
      target: div,
      props: {
        onToggle: (val) => this.rootElement.classList.toggle('collapsed', val)
      }
    });
  }

  /** @param {HTMLElement} div */

  buildPostBody(div) {
    svelte.mount(PostBody, {
      target: div,
      context: new Map(Object.entries({
        post: {
          post: this.post
        }
      }))
    });
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

  /** @param {HTMLElement} div */

  buildTagsRow(div) {
    svelte.mount(PostTagsRow, {
      target: div,
      context: new Map(Object.entries({
        post: {
          post: this.post
        }
      }))
    });
  }

  /** @param {HTMLElement} div */

  buildStatsFooter(div) {
    svelte.mount(PostFooter, {
      target: div,
      context: new Map(Object.entries({
        post: {
          post: this.post,
          context: this.context
        }
      }))
    });
  }

  /** @param {number} quoteCount, @param {boolean} expanded */

  appendQuotesIconLink(quoteCount, expanded) {
    /*let stats = $(this.rootElement.querySelector(':scope > .content > p.stats'));
    let quotesLink = this.buildQuotesIconLink(quoteCount, expanded);
    stats.append(quotesLink);*/
  }

  /** @param {HTMLElement} element */

  buildLoadMoreLink(element) {
    svelte.mount(LoadMoreLink, {
      target: element,
      context: new Map(Object.entries({
        post: {
          post: this.post,
          context: this.context
        }
      })),
      props: {
        onLoad: (newPost) => {
          this.post.updateDataFromPost(newPost);

          let component = new PostComponent(this.post, 'thread');
          component.installIntoElement(this.rootElement);
        }
      }
    });
  }

  /** @returns {HTMLElement} */

  buildHiddenRepliesLink() {
    let hiddenRepliesDiv = $tag('div');

    svelte.mount(HiddenRepliesLink, {
      target: hiddenRepliesDiv,
      context: new Map(Object.entries({
        post: {
          post: this.post,
          context: this.context
        }
      })),
      props: {
        onLoad: (repliesData) => {
          let content = $(this.rootElement.querySelector('.content'));

          let replies = repliesData
            .filter(v => v)
            .map(json => parseThreadPost(json.thread, this.post.pageRoot, 1, this.post.absoluteLevel + 1));

          this.post.setReplies(this.post.replies.concat(replies));
          hiddenRepliesDiv.remove();

          for (let reply of replies) {
            let component = new PostComponent(reply, 'thread');
            let view = component.buildElement();
            content.append(view);
          }

          if (replies.length < repliesData.length) {
            let notFoundCount = repliesData.length - replies.length;
            let pluralizedCount = (notFoundCount > 1) ? `${notFoundCount} replies are` : '1 reply is';

            let info = $tag('p.missing-replies-info', {
              html: `<i class="fa-solid fa-ban"></i> ${pluralizedCount} missing (likely taken down by moderation)`
            });
            content.append(info);
          }
        },

        onError: (error) => {
          hiddenRepliesDiv.remove();

          if (error instanceof HiddenRepliesError) {
            let content = $(this.rootElement.querySelector('.content'));
            let info = $tag('p.missing-replies-info', {
              html: `<i class="fa-solid fa-ban"></i> Hidden replies not available (post too old)`
            });
            content.append(info);
          } else {
            setTimeout(() => showError(error), 1);
          }
        }
      }
    });

    return hiddenRepliesDiv;
  }

  /** @param {string} url, @param {HTMLElement} div */

  buildFediSourceLink(url, div) {
    try {
      svelte.mount(FediSourceLink, {
        target: div,
        props: { url }
      });
    } catch (error) {
      console.log("Invalid Fedi URL:" + error);
    }
  }

  /** @param {HTMLElement} div, @returns {HTMLElement} */

  buildBlockedPostElement(div) {
    div.classList.add('blocked');

    svelte.mount(BlockedPostView, {
      target: div,
      context: new Map(Object.entries({
        post: {
          post: this.post
        }
      })),
      props: {
        reason: 'Blocked post'
      }
    });

    return div;
  }

  /** @param {HTMLElement} div, @returns {HTMLElement} */

  buildDetachedQuoteElement(div) {
    div.classList.add('blocked');

    svelte.mount(BlockedPostView, {
      target: div,
      context: new Map(Object.entries({
        post: {
          post: this.post
        }
      })),
      props: {
        reason: 'Hidden quote'
      }
    });

    return div;
  }

  /** @param {HTMLElement} div, @returns {HTMLElement} */

  buildMissingPostElement(div) {
    div.classList.add('blocked');

    svelte.mount(MissingPostView, {
      target: div,
      context: new Map(Object.entries({
        post: {
          post: this.post
        }
      }))
    });

    return div;
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
