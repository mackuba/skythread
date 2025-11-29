import { BlueskyAPI, accountAPI } from '../api.js';
import { feedPostTime } from '../utils.js';

/**
 * Manages the Posting Stats page.
 */

type GenerateResultsOptions = {
  countFetchedDays?: boolean
  users?: UserWithHandle[]
}

export type OnProgress = ((progress: number) => void);

export type UserWithHandle = {
  did: string,
  handle: string,
  avatar?: string
}

export type PostingStatsResultRow = {
  handle: string,
  avatar: string | undefined,
  own: number,
  reposts: number,
  all: number
}

export type PostingStatsResult = {
  users: PostingStatsResultRow[],
  sums: { own: number, reposts: number, all: number },
  fetchedDays: number,
  daysBack: number
}

export class PostingStats {
  appView: BlueskyAPI;
  userProgress: Record<string, { pages: number, progress: number }>;
  onProgress: OnProgress | undefined;
  abortController?: AbortController;

  constructor(onProgress?: OnProgress) {
    this.onProgress = onProgress;
    this.appView = new BlueskyAPI('public.api.bsky.app');
    this.userProgress = {};
  }

  async scanHomeTimeline(requestedDays: number): Promise<PostingStatsResult | null> {
    let startTime = new Date().getTime();
    this.abortController = new AbortController();

    let posts = await accountAPI.loadHomeTimeline(requestedDays, {
      onPageLoad: (data) => this.updateProgress(data, startTime),
      abortSignal: this.abortController.signal,
      keepLastPage: true
    });

    return this.generateResults(posts, requestedDays, startTime);
  }

  async scanListTimeline(listURI: string, requestedDays: number): Promise<PostingStatsResult | null> {
    let startTime = new Date().getTime();
    this.abortController = new AbortController();

    let posts = await accountAPI.loadListTimeline(listURI, requestedDays, {
      onPageLoad: (data) => this.updateProgress(data, startTime),
      abortSignal: this.abortController.signal,
      keepLastPage: true
    });

    return this.generateResults(posts, requestedDays, startTime);
  }

  async scanUserTimelines(users: UserWithHandle[], requestedDays: number): Promise<PostingStatsResult | null> {
    let startTime = new Date().getTime();
    let dids = users.map(u => u.did);
    this.resetUserProgress(dids);
    this.abortController = new AbortController();

    let abortSignal = this.abortController.signal;
    let requests = dids.map(did => this.appView.loadUserTimeline(did, requestedDays, {
      filter: 'posts_and_author_threads',
      onPageLoad: (data) => this.updateUserProgress(did, data, startTime, requestedDays),
      abortSignal: abortSignal,
      keepLastPage: true
    }));

    let datasets = await Promise.all(requests);
    let posts = datasets.flat();

    return this.generateResults(posts, requestedDays, startTime, { countFetchedDays: false, users: users });
  }

  async scanYourTimeline(requestedDays: number): Promise<PostingStatsResult | null> {
    let startTime = new Date().getTime();
    this.abortController = new AbortController();

    let posts = await accountAPI.loadUserTimeline(accountAPI.user.did, requestedDays, {
      filter: 'posts_no_replies',
      onPageLoad: (data) => this.updateProgress(data, startTime),
      abortSignal: this.abortController.signal,
      keepLastPage: true
    });

    return this.generateResults(posts, requestedDays, startTime);
  }

  generateResults(posts: json[], requestedDays: number, startTime: number, options: GenerateResultsOptions = {}) {
    let last = posts.at(-1);

    if (!last) {
      return null;
    }

    let users: Record<string, PostingStatsResultRow> = {};

    let lastDate = feedPostTime(last);
    let fetchedDays = (startTime - lastDate) / 86400 / 1000;
    let daysBack: number;

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
        users[user.handle] = { handle: user.handle, own: 0, reposts: 0, avatar: user.avatar } as PostingStatsResultRow;
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

    return { users: userRows, sums, fetchedDays, daysBack };
  }

  updateProgress(dataPage: json[], startTime: number) {
    let last = dataPage.at(-1);

    if (!last) { return }

    let lastDate = feedPostTime(last);
    let daysBack = (startTime - lastDate) / 86400 / 1000;

    this.onProgress?.(daysBack);
  }

  resetUserProgress(dids: string[]) {
    this.userProgress = {};

    for (let did of dids) {
      this.userProgress[did] = { pages: 0, progress: 0 };
    }
  }

  updateUserProgress(did: string, dataPage: json[], startTime: number, requestedDays: number) {
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
    this.onProgress?.(progress);
  }

  abortScan() {
    this.abortController?.abort();
    delete this.abortController;
  }
}
