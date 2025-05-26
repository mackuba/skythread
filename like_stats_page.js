class LikeStatsPage {

  /** @type {number | undefined} */
  scanStartTime;

  constructor() {
    this.pageElement = $id('like_stats_page');

    this.rangeInput = $(this.pageElement.querySelector('input[type="range"]'), HTMLInputElement);
    this.submitButton = $(this.pageElement.querySelector('input[type="submit"]'), HTMLInputElement);
    this.progressBar = $(this.pageElement.querySelector('input[type=submit] + progress'), HTMLProgressElement);

    this.receivedTable = $(this.pageElement.querySelector('.received-likes'));
    this.givenTable = $(this.pageElement.querySelector('.given-likes'));

    this.appView = new BlueskyAPI('public.api.bsky.app', false);

    this.setupEvents();
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
    let received = countElementsBy(receivedLikes, (x) => x.actor.handle);

    await this.renderResults(received, this.receivedTable);

    let givenLikes = await fetchGivenLikes;
    let given = countElementsBy(givenLikes, (x) => atURI(x.value.subject.uri).repo);

    await this.renderResults(given, this.givenTable);

    this.receivedTable.style.display = 'table';
    this.givenTable.style.display = 'table';

    this.submitButton.value = 'Start scan';
    this.progressBar.style.display = 'none';
    this.scanStartTime = undefined;
  }

  async fetchGivenLikes(requestedDays) {
    let now = new Date().getTime();

    return await accountAPI.fetchAll('com.atproto.repo.listRecords', {
      repo: accountAPI.user.did,
      collection: 'app.bsky.feed.like',
      limit: 100
    }, {
      field: 'records',
      breakWhen: (x) => Date.parse(x['value']['createdAt']) < now - 86400 * requestedDays * 1000,
      onPageLoad: (data) => {
        if (data.length == 0) { return }

        let last = data[data.length - 1];
        let lastDate = Date.parse(last.value.createdAt);

        let daysBack = (this.scanStartTime - lastDate) / 86400 / 1000;
        this.updateProgress({ likeRecords: Math.min(1.0, daysBack / requestedDays) });
      }
    });
  }

  async fetchReceivedLikes(requestedDays) {
    let myPosts = await this.appView.loadUserTimeline(accountAPI.user.did, requestedDays, {
      onPageLoad: (data) => {
        if (data.length == 0) { return }

        let last = data[data.length - 1];
        let lastTimestamp = last.reason ? last.reason.indexedAt : last.post.record.createdAt;
        let lastDate = Date.parse(lastTimestamp);

        let daysBack = (this.scanStartTime - lastDate) / 86400 / 1000;
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

  async renderResults(counts, table) {
    let tableBody = $(table.querySelector('tbody'));
    tableBody.innerHTML = '';

    let entries = Object.entries(counts).sort(this.sortResults).slice(0, 20);

    for (let [user, count] of entries) {
      let handle = user.startsWith('did:') ? await accountAPI.fetchHandleForDid(user) : user;

      let tr = $tag('tr');
      tr.append(
        $tag('td', { html: `<a href="https://bsky.app/profile/${handle}" target="_blank">${handle}</a>` }),
        $tag('td', { text: count })
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

  sortResults(a, b) {
    if (a[1] < b[1]) {
      return 1;
    } else if (a[1] > b[1]) {
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
