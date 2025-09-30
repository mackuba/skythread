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
    this.searchForm = $(this.pageElement.querySelector('.search-form'), HTMLFormElement);
    this.results = $(this.pageElement.querySelector('.results'));

    this.timelineSearch = $(this.pageElement.querySelector('.timeline-search'));
    this.searchCollections = $(this.pageElement.querySelector('.search-collections'));

    this.likesImport = $(this.pageElement.querySelector('.likes-import'));
    this.importLoading = $(this.pageElement.querySelector('.likes-import .import-loading'));
    this.importIntro = $(this.pageElement.querySelector('.likes-import .import-intro'));
    this.importStartButton = $(this.pageElement.querySelector('.likes-import .start-import'), HTMLButtonElement);
    this.importProgress = $(this.pageElement.querySelector('.likes-import .import-progress'));
    this.importStatusLabel = $(this.pageElement.querySelector('.likes-import .import-status'));
    this.importProgressBar = $(this.pageElement.querySelector('.likes-import .import-progress progress'), HTMLProgressElement);
    this.importPosition = $(this.pageElement.querySelector('.likes-import .import-position'));
    this.importError = $(this.pageElement.querySelector('.likes-import .import-error'));

    this.importPollingTimer = undefined;
    this.importStatusPromise = undefined;
    this.currentImportStatus = undefined;

    this.timelinePosts = [];

    this.setupEvents();

    let params = new URLSearchParams(location.search);
    this.mode = params.get('mode');
    this.lycanMode = params.get('lycan');

    if (this.lycanMode == 'local') {
      this.localLycan = new BlueskyAPI('http://localhost:3000', false);
    }
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

    this.searchField.addEventListener('keydown', (e) => {
      if (e.key == 'Enter') {
        e.preventDefault();

        let query = this.searchField.value.trim().toLowerCase();

        if (this.mode == 'likes') {
          this.searchInLycan(query);
        } else {
          this.searchInTimeline(query);
        }
      }
    });

    this.importStartButton.addEventListener('click', () => {
      this.startLycanImport();
    });
  }

  /** @returns {number} */

  selectedDaysRange() {
    return parseInt(this.rangeInput.value, 10);
  }

  show() {
    this.pageElement.style.display = 'block';

    if (this.mode == 'likes') {
      this.timelineSearch.style.display = 'none';
      this.prepareLikesImportState();
    } else {
      this.timelineSearch.style.display = 'block';
      this.searchCollections.style.display = 'none';
      this.likesImport.style.display = 'none';
      this.clearImportPolling();
    }
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
      let lastDate = feedPostTime(last);
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

  /** @param {string} query */

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

  /** @param {string} query */

  searchInLycan(query) {
    this.results.innerHTML = '';

    if (query.length == 0) {
      return;
    }

    if (this.mode == 'likes' && this.currentImportStatus != 'finished') {
      return;
    }

    let collection = this.searchForm.elements['collection'].value;

    let loading = $tag('p', { text: "..." });
    this.results.append(loading);

    let isLoading = false;
    let firstPageLoaded = false;
    let cursor;
    let finished = false;

    Paginator.loadInPages(async () => {
      if (isLoading || finished) { return; }
      isLoading = true;

      let response;

      if (this.localLycan) {
        let params = { collection, query, user: window.accountAPI.user.did };
        if (cursor) params.cursor = cursor;

        response = await this.localLycan.getRequest('blue.feeds.lycan.searchPosts', params);
      } else {
        let params = { collection, query };
        if (cursor) params.cursor = cursor;

        response = await accountAPI.getRequest('blue.feeds.lycan.searchPosts', params, {
          headers: { 'atproto-proxy': 'did:web:lycan.feeds.blue#lycan' }
        });
      }

      if (response.posts.length == 0) {
        let p = $tag('p.results-end', { text: firstPageLoaded ? "No more results." : "No results." });
        loading.remove();
        this.results.append(p);

        isLoading = false;
        finished = true;
        return;
      }

      let records = await window.accountAPI.loadPosts(response.posts);
      let posts = records.map(x => new Post(x));

      if (!firstPageLoaded) {
        loading.remove();
        firstPageLoaded = true;
      }

      for (let post of posts) {
        let component = new PostComponent(post, 'feed');
        let postView = component.buildElement();
        this.results.appendChild(postView);

        component.highlightSearchResults(response.terms);
      }

      isLoading = false;
      cursor = response.cursor;

      if (!cursor) {
        finished = true;
        this.results.append("No more results.");
      }
    });
  }

  prepareLikesImportState() {
    this.hideLikesSearchUI();
    this.likesImport.style.display = 'block';
    this.importLoading.style.display = 'block';
    this.importLoading.innerText = 'Checking archive status…';
    this.importIntro.style.display = 'none';
    this.importProgress.style.display = 'none';
    this.importError.innerText = '';
    this.importStartButton.disabled = false;
    this.results.innerHTML = '';
    this.currentImportStatus = undefined;
    this.clearImportPolling();

    this.refreshImportStatus();
  }

  hideLikesSearchUI() {
    this.searchLine.style.display = 'none';
    this.searchCollections.style.display = 'none';
    this.setLikesSearchEnabled(false);
  }

  showLikesSearchUI() {
    this.likesImport.style.display = 'none';
    this.searchLine.style.display = 'block';
    this.searchCollections.style.display = 'block';
    this.setLikesSearchEnabled(true);
    this.clearImportPolling();
    this.currentImportStatus = 'finished';
  }

  /** @param {boolean} enabled */
  setLikesSearchEnabled(enabled) {
    this.searchField.disabled = !enabled;

    let collectionInputs = this.searchForm.querySelectorAll('input[name="collection"]');
    collectionInputs.forEach((input) => {
      input.disabled = !enabled;
    });
  }

  async refreshImportStatus() {
    if (this.importStatusPromise) {
      return this.importStatusPromise;
    }

    let previousStatus = this.currentImportStatus;

    this.importStatusPromise = this.requestLycanImportStatus()
      .then((status) => {
        if (status) {
          this.applyImportStatus(status);
        }
        return status;
      })
      .catch((err) => {
        console.error('Failed to load Lycan import status', err);
        this.importError.innerText = 'Could not load import status. Please try again.';

        if (previousStatus == 'in_progress') {
          this.importLoading.style.display = 'none';
          this.importIntro.style.display = 'none';
          this.importProgress.style.display = 'block';
        } else if (previousStatus == 'finished') {
          this.showLikesSearchUI();
        } else {
          this.importLoading.style.display = 'none';
          this.importProgress.style.display = 'none';
          this.importIntro.style.display = 'block';
          this.importStartButton.disabled = false;
        }

        this.currentImportStatus = previousStatus;
      })
      .finally(() => {
        this.importStatusPromise = undefined;
      });

    return this.importStatusPromise;
  }

  async requestLycanImportStatus() {
    if (this.mode != 'likes') {
      return;
    }

    if (this.localLycan) {
      return await this.localLycan.getRequest('blue.feeds.lycan.getImportStatus', {
        user: window.accountAPI.user.did
      });
    }

    return await accountAPI.getRequest('blue.feeds.lycan.getImportStatus', {}, {
      headers: { 'atproto-proxy': 'did:web:lycan.feeds.blue#lycan' }
    });
  }

  applyImportStatus(status) {
    this.currentImportStatus = status.status;
    this.importError.innerText = '';

    if (status.status == 'finished') {
      this.showLikesSearchUI();
      return;
    }

    this.likesImport.style.display = 'block';
    this.hideLikesSearchUI();

    if (status.status == 'not_started') {
      this.clearImportPolling();
      this.showImportIntro();
    } else if (status.status == 'in_progress') {
      this.showImportProgress(status);
      this.startImportPolling();
    } else {
      this.importLoading.style.display = 'none';
      this.importIntro.style.display = 'block';
      this.importError.innerText = 'Unknown import status.';
      this.importStartButton.disabled = false;
    }
  }

  showImportIntro() {
    this.importLoading.style.display = 'none';
    this.importProgress.style.display = 'none';
    this.importIntro.style.display = 'block';
    this.importStartButton.disabled = false;
    this.setLikesSearchEnabled(false);
  }

  showImportProgress(status) {
    this.importLoading.style.display = 'none';
    this.importIntro.style.display = 'none';
    this.importProgress.style.display = 'block';
    this.importProgressBar.style.display = 'block';
    this.importStartButton.disabled = true;

    let progress = (typeof status.progress == 'number') ? status.progress : 0;
    progress = Math.max(0, Math.min(1, progress));
    this.importProgressBar.max = 1;
    this.importProgressBar.value = progress;

    let percent = Math.round(progress * 100);
    this.importStatusLabel.innerText = `Import in progress (${percent}%)`;

    if (status.position) {
      this.importPosition.innerText = `Downloaded data until ${this.formatImportPosition(status.position)}`;
    } else {
      this.importPosition.innerText = '';
    }
  }

  formatImportPosition(position) {
    let date = new Date(position);

    if (isNaN(date.getTime())) {
      return position;
    }

    let options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleString(undefined, options);
  }

  startImportPolling() {
    if (this.importPollingTimer) {
      return;
    }

    this.importPollingTimer = window.setInterval(() => {
      if (this.mode != 'likes') {
        this.clearImportPolling();
        return;
      }

      this.refreshImportStatus();
    }, 10000);
  }

  clearImportPolling() {
    if (this.importPollingTimer) {
      clearInterval(this.importPollingTimer);
      this.importPollingTimer = undefined;
    }
  }

  async startLycanImport() {
    if (this.importStartButton.disabled) {
      return;
    }

    this.importStartButton.disabled = true;
    this.importError.innerText = '';

    this.applyImportStatus({ status: 'in_progress', progress: 0 });

    try {
      if (this.localLycan) {
        await this.localLycan.postRequest('blue.feeds.lycan.startImport', {
          user: window.accountAPI.user.did
        });
      } else {
        await accountAPI.postRequest('blue.feeds.lycan.startImport', {}, {
          headers: { 'atproto-proxy': 'did:web:lycan.feeds.blue#lycan' }
        });
      }

      await this.refreshImportStatus();
    } catch (err) {
      console.error('Failed to start Lycan import', err);
      this.importError.innerText = 'Could not start the import. Please try again.';
      this.importStartButton.disabled = false;
      this.importIntro.style.display = 'block';
      this.importProgress.style.display = 'none';
      this.importLoading.style.display = 'none';
      this.currentImportStatus = 'not_started';
      this.clearImportPolling();
    }
  }

  /** @param {json[]} dataPage, @param {number} startTime */

  updateProgress(dataPage, startTime) {
    let last = dataPage.at(-1);

    if (!last) { return }

    let lastDate = feedPostTime(last);
    let daysBack = (startTime - lastDate) / 86400 / 1000;

    this.progressBar.value = daysBack;
  }

  stopFetch() {
    this.submitButton.value = 'Fetch timeline';
    this.progressBar.style.display = 'none';
    this.fetchStartTime = undefined;
  }
}
