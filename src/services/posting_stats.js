import { BlueskyAPI } from '../api/api.js';
import { feedPostTime } from '../utils.js';

/**
 * Manages the Posting Stats page.
 */

export class PostingStats {

  /** @type {number | undefined} */
  scanStartTime;

  /** @type {Record<string, { pages: number, progress: number }>} */
  userProgress = {};

  /**
   * @typedef {{
   *   did: string,
   *   handle: string,
   *   avatar?: string
   * }} UserWithHandle
   *
   * @typedef {{
   *   handle: string,
   *   avatar: string | undefined,
   *   own: number,
   *   reposts: number,
   *   all: number
   * }} PostingStatsResultRow
   *
   * @typedef {{
   *   users: PostingStatsResultRow[],
   *   sums: { own: number, reposts: number, all: number },
   *   fetchedDays: number,
   *   daysBack: number
   * }} PostingStatsResult
   */

  /** @param {((progress: number) => void)=} onProgress */

  constructor(onProgress) {
    this.onProgress = onProgress;
    this.appView = new BlueskyAPI('public.api.bsky.app', false);
  }

  /** @param {json[]} data, @param {number} startTime */

  onPageLoad(data, startTime) {
    if (this.scanStartTime == startTime) {
      this.updateProgress(data, startTime);
    } else {
      return { cancel: true };
    }
  }

  /** @param {number} requestedDays, @returns {Promise<PostingStatsResult?>} */

  async scanHomeTimeline(requestedDays) {
    let startTime = new Date().getTime();
    this.scanStartTime = startTime;

    let posts = await accountAPI.loadHomeTimeline(requestedDays, {
      onPageLoad: (d) => this.onPageLoad(d, startTime),
      keepLastPage: true
    });

    return this.generateResults(posts, requestedDays, startTime);
  }

  /** @param {string} listURI, @param {number} requestedDays, @returns {Promise<PostingStatsResult?>} */

  async scanListTimeline(listURI, requestedDays) {
    let startTime = new Date().getTime();
    this.scanStartTime = startTime;

    let posts = await accountAPI.loadListTimeline(listURI, requestedDays, {
      onPageLoad: (d) => this.onPageLoad(d, startTime),
      keepLastPage: true
    });

    return this.generateResults(posts, requestedDays, startTime);
  }

  /** @param {UserWithHandle[]} users, @returns {Promise<PostingStatsResult?>} */

  async scanUserTimelines(users, requestedDays) {
    let startTime = new Date().getTime();
    this.scanStartTime = startTime;

    let dids = users.map(u => u.did);
    this.resetUserProgress(dids);

    let requests = dids.map(did => this.appView.loadUserTimeline(did, requestedDays, {
      filter: 'posts_and_author_threads',
      onPageLoad: (data) => {
        if (this.scanStartTime != startTime) {
          return { cancel: true };
        }

        this.updateUserProgress(did, data, startTime, requestedDays);
      },
      keepLastPage: true
    }));

    let datasets = await Promise.all(requests);
    let posts = datasets.flat();

    return this.generateResults(posts, requestedDays, startTime, { countFetchedDays: false, users: users });
  }

  /** @param {number} requestedDays, @returns {Promise<PostingStatsResult?>} */

  async scanYourTimeline(requestedDays) {
    let startTime = new Date().getTime();
    this.scanStartTime = startTime;

    let posts = await accountAPI.loadUserTimeline(accountAPI.user.did, requestedDays, {
      filter: 'posts_no_replies',
      onPageLoad: (d) => this.onPageLoad(d, startTime),
      keepLastPage: true
    });

    return this.generateResults(posts, requestedDays, startTime);
  }

  /**
   * @param {json[]} posts
   * @param {number} requestedDays
   * @param {number} startTime
   * @param {{ countFetchedDays?: boolean, users?: UserWithHandle[] }} options
   * @returns {PostingStatsResult?}
   */

  generateResults(posts, requestedDays, startTime, options = {}) {
    let last = posts.at(-1);

    if (!last) {
      this.stopScan();
      return null;
    }

    if (this.scanStartTime != startTime) {
      return null;
    }

    let users = {};

    let lastDate = feedPostTime(last);
    let fetchedDays = (startTime - lastDate) / 86400 / 1000;
    let daysBack;

    if (options.countFetchedDays !== false) {
      daysBack = Math.min(requestedDays, fetchedDays);
    } else {
      daysBack = requestedDays;
    }

    let timeLimit = startTime - requestedDays * 86400 * 1000;
    posts = posts.filter(x => (feedPostTime(x) > timeLimit));
    posts.reverse();

    if (options.users) {
      for (let user of options.users) {
        users[user.handle] = { handle: user.handle, own: 0, reposts: 0, avatar: user.avatar };
      }
    }

    let ownThreads = new Set();
    let sums = { own: 0, reposts: 0, all: 0 };

    for (let item of posts) {
      if (item.reply) {
        if (!ownThreads.has(item.reply.parent.uri)) {
          continue;
        }
      }

      let user = item.reason ? item.reason.by : item.post.author;
      let handle = user.handle;
      users[handle] = users[handle] ?? { handle: handle, own: 0, reposts: 0, avatar: user.avatar };

      if (item.reason) {
        users[handle].reposts += 1;
        sums.reposts += 1;
      } else {
        users[handle].own += 1;
        sums.own += 1;
        ownThreads.add(item.post.uri);
      }
    }

    let userRows = Object.values(users);
    userRows.forEach((u) => { u.all = u.own + u.reposts });
    userRows.sort((a, b) => b.all - a.all);

    sums.all = sums.own + sums.reposts;
    this.scanStartTime = undefined;

    return { users: userRows, sums, fetchedDays, daysBack };
  }

  /** @param {json[]} dataPage, @param {number} startTime */

  updateProgress(dataPage, startTime) {
    let last = dataPage.at(-1);

    if (!last) { return }

    let lastDate = feedPostTime(last);
    let daysBack = (startTime - lastDate) / 86400 / 1000;

    this.onProgress && this.onProgress(daysBack);
  }

  /** @param {string[]} dids */

  resetUserProgress(dids) {
    this.userProgress = {};

    for (let did of dids) {
      this.userProgress[did] = { pages: 0, progress: 0 };
    }
  }

  /** @param {string} did, @param {json[]} dataPage, @param {number} startTime, @param {number} requestedDays */

  updateUserProgress(did, dataPage, startTime, requestedDays) {
    let last = dataPage.at(-1);

    if (!last) { return }

    let lastDate = feedPostTime(last);
    let daysBack = (startTime - lastDate) / 86400 / 1000;

    this.userProgress[did].pages += 1;
    this.userProgress[did].progress = Math.min(daysBack / requestedDays, 1.0);

    let expectedPages = Object.values(this.userProgress).map(x => x.pages / x.progress);
    let known = expectedPages.filter(x => !isNaN(x));
    let expectedTotalPages = known.reduce((a, b) => a + b) / known.length * expectedPages.length;
    let fetchedPages = Object.values(this.userProgress).map(x => x.pages).reduce((a, b) => a + b);

    let progress = (fetchedPages / expectedTotalPages) * requestedDays;
    this.onProgress && this.onProgress(progress);
  }

  stopScan() {
    this.scanStartTime = undefined;
  }
}
