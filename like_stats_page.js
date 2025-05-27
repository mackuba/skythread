class LikeStatsPage {

  /** @type {number | undefined} */
  scanStartTime;

  constructor() {
    this.pageElement = $id('like_stats_page');

    this.rangeInput = $(this.pageElement.querySelector('input[type="range"]'), HTMLInputElement);
    this.submitButton = $(this.pageElement.querySelector('input[type="submit"]'), HTMLInputElement);
    this.progressBar = $(this.pageElement.querySelector('input[type=submit] + progress'), HTMLProgressElement);

    this.receivedTable = $(this.pageElement.querySelector('.received-likes'), HTMLTableElement);
    this.givenTable = $(this.pageElement.querySelector('.given-likes'), HTMLTableElement);

    this.appView = new BlueskyAPI('public.api.bsky.app', false);

    this.setupEvents();

    this.progressPosts = 0;
    this.progressLikeRecords = 0;
    this.progressPostLikes = 0;
  }

  setupEvents() {
    $(this.pageElement.querySelector('form')).addEventListener('submit', (e) => {
      e.preventDefault();

      if (!this.scanStartTime) {
        this.findLikes();      
      } else {
        this.stopScan();
      }
    });

    this.rangeInput.addEventListener('input', (e) => {
      let days = parseInt(this.rangeInput.value, 10);
      let label = $(this.pageElement.querySelector('input[type=range] + label'));
      label.innerText = (days == 1) ? '1 day' : `${days} days`;
    });
  }

  /** @returns {number} */

  selectedDaysRange() {
    return parseInt(this.rangeInput.value, 10);
  }

  show() {
    this.pageElement.style.display = 'block';
  }

  /** @returns {Promise<void>} */

  async findLikes() {
    this.submitButton.value = 'Cancel';

    let requestedDays = this.selectedDaysRange();

    this.resetProgress();
    this.progressBar.style.display = 'inline';

    let startTime = new Date().getTime();
    this.scanStartTime = startTime;

    this.receivedTable.style.display = 'none';
    this.givenTable.style.display = 'none';

    let fetchGivenLikes = this.fetchGivenLikes(requestedDays);

    let receivedLikes = await this.fetchReceivedLikes(requestedDays);
    let receivedStats = this.sumUpReceivedLikes(receivedLikes);
    let topReceived = this.getTopEntries(receivedStats);

    await this.renderResults(topReceived, this.receivedTable);

    let givenLikes = await fetchGivenLikes;
    let givenStats = this.sumUpGivenLikes(givenLikes);
    let topGiven = this.getTopEntries(givenStats);

    let profileInfo = await appView.getRequest('app.bsky.actor.getProfiles', { actors: topGiven.map(x => x.did) });

    for (let profile of profileInfo.profiles) {
      let user = /** @type {LikeStat} */ (topGiven.find(x => x.did == profile.did));
      user.handle = profile.handle;
      user.avatar = profile.avatar;
    }

    await this.renderResults(topGiven, this.givenTable);

    this.receivedTable.style.display = 'table';
    this.givenTable.style.display = 'table';

    this.submitButton.value = 'Start scan';
    this.progressBar.style.display = 'none';
    this.scanStartTime = undefined;
  }

  /** @param {number} requestedDays, @returns {Promise<json[]>} */

  async fetchGivenLikes(requestedDays) {
    let startTime = /** @type {number} */ (this.scanStartTime);

    return await accountAPI.fetchAll('com.atproto.repo.listRecords', {
      repo: accountAPI.user.did,
      collection: 'app.bsky.feed.like',
      limit: 100
    }, {
      field: 'records',
      breakWhen: (x) => Date.parse(x['value']['createdAt']) < startTime - 86400 * requestedDays * 1000,
      onPageLoad: (data) => {
        if (data.length == 0) { return }

        let last = data[data.length - 1];
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
      onPageLoad: (data) => {
        if (data.length == 0) { return }

        let last = data[data.length - 1];
        let lastTimestamp = last.reason ? last.reason.indexedAt : last.post.record.createdAt;
        let lastDate = Date.parse(lastTimestamp);

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
        return this.appView.fetchAll('app.bsky.feed.getLikes', { uri: x['post']['uri'], limit: 100 }, {
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
    return Object.entries(counts).sort(this.sortResults).map(x => x[1]).slice(0, 20);
  }

  /** @param {LikeStat[]} topEntries, @param {HTMLTableElement} table, @returns {Promise<void>} */

  async renderResults(topEntries, table) {
    let tableBody = $(table.querySelector('tbody'));
    tableBody.innerHTML = '';

    for (let user of topEntries) {
      let tr = $tag('tr');
      tr.append(
        $tag('td', {
          html: `<img class="avatar" src="${user.avatar}"> ` + 
                `<a href="https://bsky.app/profile/${user.handle}" target="_blank">${user.handle}</a>`
        }),
        $tag('td', { text: user.count })
      );

      tableBody.append(tr);
    };
  }

  resetProgress() {
    this.progressBar.value = 0;
    this.progressPosts = 0;
    this.progressLikeRecords = 0;
    this.progressPostLikes = 0;
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

    this.progressBar.value = totalProgress;
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
    this.submitButton.value = 'Start scan';
    this.progressBar.style.display = 'none';
    this.scanStartTime = undefined;
  }
}
