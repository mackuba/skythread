class LikeStatsPage {

  /** @type {number | undefined} */
  scanStartTime;

  constructor() {
    this.pageElement = $id('like_stats_page');

    this.rangeInput = $(this.pageElement.querySelector('input[type="range"]'), HTMLInputElement);
    this.submitButton = $(this.pageElement.querySelector('input[type="submit"]'), HTMLInputElement);

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

    let startTime = new Date().getTime();
    this.scanStartTime = startTime;

    let fetchGivenLikes = this.fetchGivenLikes(requestedDays);

    let receivedLikes = await this.fetchReceivedLikes(requestedDays);
    let received = countElementsBy(receivedLikes, (x) => x.actor.handle);

    await this.renderResults(received, this.receivedTable);

    let givenLikes = await fetchGivenLikes;
    let given = countElementsBy(givenLikes, (x) => atURI(x.value.subject.uri).repo);

    await this.renderResults(given, this.givenTable);

    this.receivedTable.style.display = 'table';
    this.givenTable.style.display = 'table';
  }

  async fetchGivenLikes(requestedDays) {
    let now = new Date().getTime();

    return await accountAPI.fetchAll('com.atproto.repo.listRecords', {
      repo: accountAPI.user.did,
      collection: 'app.bsky.feed.like',
      limit: 100
    }, {
      field: 'records',
      breakWhen: (x) => Date.parse(x['value']['createdAt']) < now - 86400 * requestedDays * 1000
    });
  }

  async fetchReceivedLikes(requestedDays) {
    let myPosts = await this.appView.loadUserTimeline(accountAPI.user.did, requestedDays);
    let likedPosts = myPosts.filter(x => !x['reason'] && x['post']['likeCount'] > 0);

    let results = [];

    for (let i = 0; i < likedPosts.length; i += 10) {
      let batch = likedPosts.slice(i, i + 10);

      let fetchBatch = batch.map(x => {
        return this.appView.fetchAll('app.bsky.feed.getLikes', { uri: x['post']['uri'], limit: 100 }, {
          field: 'likes'
        });
      });

      let batchResults = await Promise.all(fetchBatch);
      results = results.concat(batchResults);
    }

    return results.flat();
  }

  async renderResults(counts, table) {
    let entries = Object.entries(counts).sort(this.sortResults).slice(0, 20);

    for (let [user, count] of entries) {
      let handle = user.startsWith('did:') ? await accountAPI.fetchHandleForDid(user) : user;

      let tr = $tag('tr');
      tr.append(
        $tag('td', { html: `<a href="https://bsky.app/profile/${handle}" target="_blank">${handle}</a>` }),
        $tag('td', { text: count })
      );

      table.append(tr);
    };
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
    this.scanStartTime = undefined;
  }
}
