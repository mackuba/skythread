import { Post, parseFeedPost } from '../models/posts.js';
import { feedPostTime } from '../utils.js';

export class TimelineSearch {

  /** @type {number | undefined} */
  fetchStartTime;

  /** @type {json[]} */
  timelinePosts;

  constructor() {
    this.timelinePosts = [];
  }

  /**
   * @param {number} requestedDays
   * @param {(progress: number) => void} onProgress
   */

  async fetchTimeline(requestedDays, onProgress) {
    let startTime = new Date().getTime();
    this.fetchStartTime = startTime;

    let timeline = await accountAPI.loadHomeTimeline(requestedDays, {
      onPageLoad: (data) => {
        if (this.fetchStartTime != startTime) {
          return { cancel: true };
        }

        let progress = this.calculateProgress(data, startTime);
        if (progress) {
          onProgress(progress);
        }
      }
    });

    if (this.fetchStartTime != startTime) {
      return;
    }

    this.timelinePosts = timeline;
    this.fetchStartTime = undefined;
  }

  /** @param {json[]} dataPage, @param {number} startTime, @returns {number | undefined} */

  calculateProgress(dataPage, startTime) {
    let last = dataPage.at(-1);

    if (!last) { return }

    let lastDate = feedPostTime(last);
    let daysBack = (startTime - lastDate) / 86400 / 1000;
    return daysBack;
  }

  /** @param {string} query, @returns {Post[]} */

  searchPosts(query) {
    if (query.length == 0) {
      return [];
    }

    let matching = this.timelinePosts
      .filter(x => x.post.record.text.toLowerCase().includes(query))
      .map(x => parseFeedPost(x));

    return matching;
  }

  stopFetch() {
    this.fetchStartTime = undefined;
  }
}
