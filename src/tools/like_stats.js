import { atURI, feedPostTime } from '../utils.js';
import { BlueskyAPI } from '../api/api.js';

export class LikeStats {

  /** @type {number | undefined} */
  scanStartTime;

  constructor() {
    this.appView = new BlueskyAPI('public.api.bsky.app', false);

    this.progressPosts = 0;
    this.progressLikeRecords = 0;
    this.progressPostLikes = 0;
  }

  /**
   * @param {number} requestedDays
   * @param {(days: number) => void} onProgress
   * @returns {Promise<{ givenLikes: LikeStat[], receivedLikes: LikeStat[] }>}
   */

  async findLikes(requestedDays, onProgress) {
    this.onProgress = onProgress;
    this.resetProgress();
    this.scanStartTime = new Date().getTime();

    let fetchGivenLikes = this.fetchGivenLikes(requestedDays);

    let receivedLikes = await this.fetchReceivedLikes(requestedDays);
    let receivedStats = this.sumUpReceivedLikes(receivedLikes);
    let topReceived = this.getTopEntries(receivedStats);

    let givenLikes = await fetchGivenLikes;
    let givenStats = this.sumUpGivenLikes(givenLikes);
    let topGiven = this.getTopEntries(givenStats);

    let profileInfo = await appView.getRequest('app.bsky.actor.getProfiles', { actors: topGiven.map(x => x.did) });

    for (let profile of profileInfo.profiles) {
      let user = /** @type {LikeStat} */ (topGiven.find(x => x.did == profile.did));
      user.handle = profile.handle;
      user.avatar = profile.avatar;
    }

    this.scanStartTime = undefined;

    return { givenLikes: topGiven, receivedLikes: topReceived };
  }

  /** @param {number} requestedDays, @returns {Promise<json[]>} */

  async fetchGivenLikes(requestedDays) {
    let startTime = /** @type {number} */ (this.scanStartTime);

    return await accountAPI.fetchAll('com.atproto.repo.listRecords', {
      params: {
        repo: accountAPI.user.did,
        collection: 'app.bsky.feed.like',
        limit: 100
      },
      field: 'records',
      breakWhen: (x) => Date.parse(x['value']['createdAt']) < startTime - 86400 * requestedDays * 1000,
      onPageLoad: (data) => {
        let last = data.at(-1);

        if (!last) { return }

        let lastDate = Date.parse(last.value.createdAt);
        let daysBack = (startTime - lastDate) / 86400 / 1000;

        this.updateProgress({ likeRecords: Math.min(1.0, daysBack / requestedDays) });
      }
    });
  }

  /** @param {number} requestedDays, @returns {Promise<json[]>} */

  async fetchReceivedLikes(requestedDays) {
    let startTime = /** @type {number} */ (this.scanStartTime);

    let myPosts = await this.appView.loadUserTimeline(accountAPI.user.did, requestedDays, {
      filter: 'posts_with_replies',
      onPageLoad: (data) => {
        let last = data.at(-1);

        if (!last) { return }

        let lastDate = feedPostTime(last);
        let daysBack = (startTime - lastDate) / 86400 / 1000;

        this.updateProgress({ posts: Math.min(1.0, daysBack / requestedDays) });
      }
    });

    let likedPosts = myPosts.filter(x => !x['reason'] && x['post']['likeCount'] > 0);

    let results = [];

    for (let i = 0; i < likedPosts.length; i += 10) {
      let batch = likedPosts.slice(i, i + 10);
      this.updateProgress({ postLikes: i / likedPosts.length });

      let fetchBatch = batch.map(x => {
        return this.appView.fetchAll('app.bsky.feed.getLikes', {
          params: {
            uri: x['post']['uri'],
            limit: 100
          },
          field: 'likes'
        });
      });

      let batchResults = await Promise.all(fetchBatch);
      results = results.concat(batchResults);
    }

    this.updateProgress({ postLikes: 1.0 });

    return results.flat();
  }

  /**
   * @typedef {{ handle?: string, did?: string, avatar?: string, count: number }} LikeStat
   * @typedef {Record<string, LikeStat>} LikeStatHash
   */

  /** @param {json[]} likes, @returns {LikeStatHash} */

  sumUpReceivedLikes(likes) {
    /** @type {LikeStatHash} */
    let stats = {};

    for (let like of likes) {
      let handle = like.actor.handle;

      if (!stats[handle]) {
        stats[handle] = { handle: handle, count: 0, avatar: like.actor.avatar };
      }

      stats[handle].count += 1;
    }

    return stats;
  }

  /** @param {json[]} likes, @returns {LikeStatHash} */

  sumUpGivenLikes(likes) {
    /** @type {LikeStatHash} */
    let stats = {};

    for (let like of likes) {
      let did = atURI(like.value.subject.uri).repo;

      if (!stats[did]) {
        stats[did] = { did: did, count: 0 };
      }

      stats[did].count += 1;
    }

    return stats;
  }

  /** @param {LikeStatHash} counts, @returns {LikeStat[]} */

  getTopEntries(counts) {
    return Object.entries(counts).sort(this.sortResults).map(x => x[1]).slice(0, 25);
  }

  resetProgress() {
    this.progressPosts = 0;
    this.progressLikeRecords = 0;
    this.progressPostLikes = 0;

    this.onProgress && this.onProgress(0);
  }

  /** @param {{ posts?: number, likeRecords?: number, postLikes?: number }} data */

  updateProgress(data) {
    if (data.posts) {
      this.progressPosts = data.posts;
    }

    if (data.likeRecords) {
      this.progressLikeRecords = data.likeRecords;
    }

    if (data.postLikes) {
      this.progressPostLikes = data.postLikes;
    }

    let totalProgress = (
      0.1 * this.progressPosts +
      0.65 * this.progressLikeRecords +
      0.25 * this.progressPostLikes
    );

    this.onProgress && this.onProgress(totalProgress);
  }

  /** @param {[string, LikeStat]} a, @param {[string, LikeStat]} b, @returns {-1|1|0} */

  sortResults(a, b) {
    if (a[1].count < b[1].count) {
      return 1;
    } else if (a[1].count > b[1].count) {
      return -1;
    } else {
      return 0;
    }
  }

  stopScan() {
    this.scanStartTime = undefined;
    this.onProgress = undefined;
  }
}
