import { sameDay } from '../utils.js';

export class PostPresenter {
  /**
   * Contexts:
   * - thread - a post in the thread tree
   * - parent - parent reference above the thread root
   * - quote - a quote embed
   * - quotes - a post on the quotes page
   * - feed - a post on the hashtag feed page
   *
   * @param {AnyPost} post, @param {PostContext} context
   */

  constructor(post, context) {
    this.post = post;
    this.context = context;
  }

  /** @returns {json} */

  get timeFormatForTimestamp() {
    if (this.context == 'quotes' || this.context == 'feed') {
      return { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' };
    } else if (this.post.isPageRoot || this.context != 'thread') {
      return { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' };
    } else if (this.post.pageRoot && !sameDay(this.post.createdAt, this.post.pageRoot.createdAt)) {
      return { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric' };
    } else {
      return { hour: 'numeric', minute: 'numeric' };
    }
  }

  get formattedTimestamp() {
    let timeFormat = this.timeFormatForTimestamp;
    return this.post.createdAt.toLocaleString(window.dateLocale, timeFormat);
  }
}
