import { sameDay } from '../utils.js';
import { Post } from '../models/posts.js';

export class PostPresenter {

  /**
   * Contexts:
   * - thread - a post in the thread tree
   * - parent - parent reference above the thread root
   * - quote - a quote embed
   * - quotes - a post on the quotes page
   * - feed - a post on the hashtag feed page
   */

  post: Post;
  placement: PostPlacement;

  constructor(post: Post, placement: PostPlacement) {
    this.post = post;
    this.placement = placement;
  }

  get timeFormatForTimestamp(): Intl.DateTimeFormatOptions {
    if (this.placement == 'quotes' || this.placement == 'feed') {
      return { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' };
    } else if (this.post.isPageRoot || this.placement != 'thread') {
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
