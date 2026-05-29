import { atURI, feedPostTime } from '../utils.js';
import { BlueskyAPI, accountAPI } from '../api.js';

export type LikeStatsResponse = { givenLikes: LikeStat[], receivedLikes: LikeStat[], total: number }
export type LikeStat = { handle?: string, did?: string, avatar?: string, count: number }
export type LikeStatHash = Record<string, LikeStat>

const pageSize = 25;

export class LikeStats {
  scanStartTime: number | undefined;
  appView: BlueskyAPI;
  progressPosts: number;
  progressLikeRecords: number;
  progressPostLikes: number;
  onProgress: ((days: number) => void) | undefined
  abortController?: AbortController;
  sortedGiven?: LikeStat[];
  sortedReceived?: LikeStat[];
  loadedOffset?: number;

  constructor() {
    this.appView = new BlueskyAPI('public.api.bsky.app');

    this.progressPosts = 0;
    this.progressLikeRecords = 0;
    this.progressPostLikes = 0;
  }

  async findLikes(requestedDays: number, onProgress: (days: number) => void): Promise<LikeStatsResponse> {
    this.onProgress = onProgress;
    this.resetProgress();
    this.scanStartTime = new Date().getTime();
    this.abortController = new AbortController();

    let fetchGivenLikes = this.fetchGivenLikes(requestedDays);

    let receivedLikes = await this.fetchReceivedLikes(requestedDays);
    let receivedStats = this.sumUpReceivedLikes(receivedLikes);
    let sortedReceived = this.getSortedEntries(receivedStats);

    let givenLikes = await fetchGivenLikes;
    let givenStats = this.sumUpGivenLikes(givenLikes);
    let sortedGiven = this.getSortedEntries(givenStats);

    let topReceived = sortedReceived.slice(0, pageSize);
    let topGiven = sortedGiven.slice(0, pageSize);
    let total = Math.min(sortedGiven.length, sortedReceived.length);

    await this.fetchProfileInfoForGivenLikes(topGiven);

    this.scanStartTime = undefined;
    this.sortedReceived = sortedReceived;
    this.sortedGiven = sortedGiven;
    this.loadedOffset = pageSize;

    return { givenLikes: topGiven, receivedLikes: topReceived, total };
  }

  async loadMore(): Promise<LikeStatsResponse> {
    if (!(this.sortedReceived && this.sortedGiven && this.loadedOffset)) {
      throw "Initial fetch not executed yet";
    }

    let nextReceived = this.sortedReceived.slice(this.loadedOffset, this.loadedOffset + pageSize);
    let nextGiven = this.sortedGiven.slice(this.loadedOffset, this.loadedOffset + pageSize);
    let total = Math.min(this.sortedGiven.length, this.sortedReceived.length);

    let sharedLength = Math.min(nextReceived.length, nextGiven.length);
    nextReceived = nextReceived.slice(0, sharedLength);
    nextGiven = nextGiven.slice(0, sharedLength);
    this.loadedOffset += sharedLength;

    await this.fetchProfileInfoForGivenLikes(nextGiven);

    return { givenLikes: nextGiven, receivedLikes: nextReceived, total };
  }

  async fetchGivenLikes(requestedDays: number): Promise<json[]> {
    let startTime = this.scanStartTime!

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
      },
      abortSignal: this.abortController!.signal
    });
  }

  async fetchReceivedLikes(requestedDays: number): Promise<json[]> {
    let startTime = this.scanStartTime!

    let myPosts = await this.appView.loadUserTimeline(accountAPI.user.did, requestedDays, {
      filter: 'posts_with_replies',
      onPageLoad: (data) => {
        let last = data.at(-1);

        if (!last) { return }

        let lastDate = feedPostTime(last);
        let daysBack = (startTime - lastDate) / 86400 / 1000;

        this.updateProgress({ posts: Math.min(1.0, daysBack / requestedDays) });
      },
      abortSignal: this.abortController!.signal
    });

    let likedPosts = myPosts.filter(x => !x['reason'] && x['post']['likeCount'] > 0);

    let results: json[][] = [];

    for (let i = 0; i < likedPosts.length; i += 10) {
      let batch = likedPosts.slice(i, i + 10);
      this.updateProgress({ postLikes: i / likedPosts.length });

      let fetchBatch = batch.map(x => {
        return this.appView.fetchAll('app.bsky.feed.getLikes', {
          params: {
            uri: x['post']['uri'],
            limit: 100
          },
          field: 'likes',
          abortSignal: this.abortController!.signal
        });
      });

      let batchResults = await Promise.all(fetchBatch);
      results = results.concat(batchResults);
    }

    this.updateProgress({ postLikes: 1.0 });

    return results.flat();
  }

  sumUpReceivedLikes(likes: json[]): LikeStatHash {
    let stats: LikeStatHash = {};

    for (let like of likes) {
      let handle = like.actor.handle;

      if (!stats[handle]) {
        stats[handle] = { handle: handle, count: 0, avatar: like.actor.avatar };
      }

      stats[handle].count += 1;
    }

    return stats;
  }

  sumUpGivenLikes(likes: json[]): LikeStatHash {
    let stats: LikeStatHash = {};

    for (let like of likes) {
      let did = atURI(like.value.subject.uri).repo;

      if (!stats[did]) {
        stats[did] = { did: did, count: 0 };
      }

      stats[did].count += 1;
    }

    return stats;
  }

  getSortedEntries(counts: LikeStatHash): LikeStat[] {
    return Object.entries(counts).sort(this.sortResults).map(x => x[1]);
  }

  async fetchProfileInfoForGivenLikes(given: LikeStat[]) {
    let profileInfo = await this.appView.getRequest('app.bsky.actor.getProfiles',
      { actors: given.map(x => x.did) },
      { abortSignal: this.abortController!.signal }
    );

    for (let profile of profileInfo.profiles) {
      let user = given.find(x => x.did == profile.did)!;
      user.handle = profile.handle;
      user.avatar = profile.avatar;
    }
  }

  resetProgress() {
    this.progressPosts = 0;
    this.progressLikeRecords = 0;
    this.progressPostLikes = 0;

    this.onProgress?.(0);
  }

  updateProgress(data: { posts?: number, likeRecords?: number, postLikes?: number }) {
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

    this.onProgress?.(totalProgress);
  }

  sortResults(a: [string, LikeStat], b: [string, LikeStat]): -1 | 1 | 0 {
    if (a[1].count < b[1].count) {
      return 1;
    } else if (a[1].count > b[1].count) {
      return -1;
    } else {
      return 0;
    }
  }

  abortScan() {
    this.scanStartTime = undefined;
    this.onProgress = undefined;
    this.abortController?.abort();
    delete this.abortController;
  }
}
