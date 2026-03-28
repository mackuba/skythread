import { accountAPI } from '../api.js';
import { Post, parseFeedPost } from '../models/posts.js';
import { feedPostTime } from '../utils.js';

export class TimelineSearch {
  timelinePosts: json[];
  abortController?: AbortController;

  constructor() {
    this.timelinePosts = [];
  }

  async fetchTimeline(requestedDays: number, onProgress: (progress: number) => void) {
    let startTime = new Date().getTime();
    this.abortController = new AbortController();

    let timeline = await accountAPI.loadHomeTimeline(requestedDays, {
      abortSignal: this.abortController.signal,
      onPageLoad: (data) => {
        let progress = this.calculateProgress(data, startTime);
        if (progress) {
          onProgress(progress);
        }
      }
    });

    this.timelinePosts = this.deduplicatePosts(timeline);
  }

  calculateProgress(dataPage: json[], startTime: number) {
    let last = dataPage.at(-1);

    if (!last) { return null; }

    let lastDate = feedPostTime(last);
    let daysBack = (startTime - lastDate) / 86400 / 1000;
    return daysBack;
  }

  deduplicatePosts(records: json[]): json[] {
    let lastIndexMap: Record<string, number> = {};  // reverse-chrono so last is earliest

    for (let [i, record] of records.entries()) {
      lastIndexMap[record.post.uri] = i;
    }

    return records.filter((record, i) => lastIndexMap[record.post.uri] === i);
  }

  searchPosts(query: string): Post[] {
    if (query.length == 0) {
      return [];
    }

    let matching = this.timelinePosts
      .filter(x => x.post.record.text.toLowerCase().includes(query))
      .map(x => parseFeedPost(x));

    return matching;
  }

  abortFetch() {
    this.abortController?.abort();
    delete this.abortController;
  }
}
