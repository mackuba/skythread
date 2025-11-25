import { Post, parseFeedPost } from '../models/posts.js';
import { feedPostTime } from '../utils.js';

export class TimelineSearch {
  fetchStartTime: number | undefined;
  timelinePosts: json[];

  constructor() {
    this.timelinePosts = [];
  }

  async fetchTimeline(requestedDays: number, onProgress: (progress: number) => void) {
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

  calculateProgress(dataPage: json[], startTime: number) {
    let last = dataPage.at(-1);

    if (!last) { return null; }

    let lastDate = feedPostTime(last);
    let daysBack = (startTime - lastDate) / 86400 / 1000;
    return daysBack;
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

  stopFetch() {
    this.fetchStartTime = undefined;
  }
}
