class PrivateSearchPage {

  /** @type {number | undefined} */
  fetchStartTime;

  constructor() {
    this.pageElement = $id('private_search_page');

    this.rangeInput = $(this.pageElement.querySelector('input[type="range"]'), HTMLInputElement);
    this.submitButton = $(this.pageElement.querySelector('input[type="submit"]'), HTMLInputElement);
    this.progressBar = $(this.pageElement.querySelector('input[type="submit"] + progress'), HTMLProgressElement);
    this.archiveStatus = $(this.pageElement.querySelector('.archive-status'));

    this.searchLine = $(this.pageElement.querySelector('.search'));
    this.searchField = $(this.pageElement.querySelector('.search-query'), HTMLInputElement);
    this.results = $(this.pageElement.querySelector('.results'));

    this.timelinePosts = [];

    this.setupEvents();
  }

  setupEvents() {
    $(this.pageElement.querySelector('form')).addEventListener('submit', (e) => {
      e.preventDefault();

      if (!this.fetchStartTime) {
        this.fetchTimeline();      
      } else {
        this.stopFetch();
      }
    });

    this.rangeInput.addEventListener('input', (e) => {
      let days = parseInt(this.rangeInput.value, 10);
      let label = $(this.pageElement.querySelector('input[type=range] + label'));
      label.innerText = (days == 1) ? '1 day' : `${days} days`;
    });

    this.searchField.addEventListener('input', (e) => {
      let query = this.searchField.value.trim().toLowerCase();

      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }

      this.searchTimer = setTimeout(() => this.searchInTimeline(query), 100);
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

  async fetchTimeline() {
    this.submitButton.value = 'Cancel';

    let requestedDays = this.selectedDaysRange();

    this.progressBar.max = requestedDays;
    this.progressBar.value = 0;
    this.progressBar.style.display = 'inline';

    let startTime = new Date().getTime();
    this.fetchStartTime = startTime;

    let timeline = await accountAPI.loadHomeTimeline(requestedDays, {
      onPageLoad: (data) => {
        if (this.fetchStartTime != startTime) {
          return { cancel: true };
        }

        this.updateProgress(data, startTime);
      }
    });

    if (this.fetchStartTime != startTime) {
      return;
    }

    let last = timeline.at(-1);
    let daysBack;

    if (last) {
      let lastTimestamp = last.reason ? last.reason.indexedAt : last.post.record.createdAt;
      let lastDate = Date.parse(lastTimestamp);
      daysBack = Math.round((startTime - lastDate) / 86400 / 1000);
    } else {
      daysBack = 0;
    }

    this.timelinePosts = timeline.map(x => Post.parseFeedPost(x));

    this.archiveStatus.innerText = "Timeline archive fetched: " + ((daysBack == 1) ? '1 day' : `${daysBack} days`);
    this.searchLine.style.display = 'block';

    this.submitButton.value = 'Fetch timeline';
    this.progressBar.style.display = 'none';
    this.fetchStartTime = undefined;
  }

  searchInTimeline(query) {
    this.results.innerHTML = '';

    if (query.length == 0) {
      return;
    }

    let matching = this.timelinePosts.filter(x => x.lowercaseText.includes(query));

    for (let post of matching) {
      let postView = new PostComponent(post, 'feed').buildElement();
      this.results.appendChild(postView);
    }
  }

  /** @param {json[]} dataPage, @param {number} startTime */

  updateProgress(dataPage, startTime) {
    let last = dataPage.at(-1);

    if (!last) { return }

    let lastTimestamp = last.reason ? last.reason.indexedAt : last.post.record.createdAt;
    let lastDate = Date.parse(lastTimestamp);
    let daysBack = (startTime - lastDate) / 86400 / 1000;

    this.progressBar.value = daysBack;    
  }

  stopFetch() {
    this.submitButton.value = 'Fetch timeline';
    this.progressBar.style.display = 'none';
    this.fetchStartTime = undefined;
  }
}
