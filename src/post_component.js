import * as svelte from 'svelte';
import { $, atURI, showError } from './utils.js';
import { $tag } from './utils_ts.js';
import { Post, BlockedPost, MissingPost, DetachedQuotePost, parseThreadPost } from './models/posts.js';
import { account } from './models/account.svelte.js';
import { InlineLinkEmbed } from './models/embeds.js';
import { APIError } from './api/api.js';
import { linkToPostById, linkToPostThread } from './router.js';
import { showBiohazardDialog } from './skythread.js';
import { PostPresenter } from './utils/post_presenter.js';

import BlockedPostView from './components/posts/BlockedPostView.svelte';
import EdgeMargin from './components/posts/EdgeMargin.svelte';
import EmbedComponent from './components/embeds/EmbedComponent.svelte';
import FediSourceLink from './components/posts/FediSourceLink.svelte';
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
        let loadMore = this.buildLoadMoreLink();
        content.appendChild(loadMore);
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

      if (account.biohazardEnabled === true) {
        this.loadHiddenReplies(loadMore);
      } else {
        showBiohazardDialog(() => this.loadHiddenReplies(loadMore));
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

  /** @param {Post} post, @param {HTMLElement} nodeToUpdate, @returns {Promise<void>} */

  async loadSubtree(post, nodeToUpdate) {
    try {
      let json = await api.loadThreadByAtURI(post.uri);

      let root = parseThreadPost(json.thread, post.pageRoot, 0, post.absoluteLevel);
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
      .map(json => parseThreadPost(json.thread, post.pageRoot, 1, post.absoluteLevel + 1));

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
}
