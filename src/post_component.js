import * as svelte from 'svelte';
import { $ } from './utils.js';
import { $tag } from './utils_ts.js';
import { Post } from './models/posts.js';

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
}
