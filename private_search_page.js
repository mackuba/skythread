import { $, $id, feedPostTime } from './utils.js';
import { $tag } from './utils_ts.js';
import { PostComponent } from './post_component.js';
import { Post } from './models.js';
import { BlueskyAPI } from './api.js';

export class PrivateSearchPage {

  /** @type {number | undefined} */
  fetchStartTime;

  /** @type {number | undefined} */
  importTimer;

  /** @type {string | undefined} */
  lycanImportStatus;

  constructor() {
    this.pageElement = $id('private_search_page');

    this.header = $(this.pageElement.querySelector('h2'));

    this.rangeInput = $(this.pageElement.querySelector('input[type="range"]'), HTMLInputElement);
    this.submitButton = $(this.pageElement.querySelector('input[type="submit"]'), HTMLInputElement);
    this.progressBar = $(this.pageElement.querySelector('input[type="submit"] + progress'), HTMLProgressElement);
    this.archiveStatus = $(this.pageElement.querySelector('.archive-status'));

    this.searchLine = $(this.pageElement.querySelector('.search'));
    this.searchField = $(this.pageElement.querySelector('.search-query'), HTMLInputElement);
    this.searchForm = $(this.pageElement.querySelector('.search-form'), HTMLFormElement);
    this.results = $(this.pageElement.querySelector('.results'));

    this.timelineSearch = $(this.pageElement.querySelector('.timeline-search'));
    this.timelineSearchForm = $(this.pageElement.querySelector('.timeline-search form'), HTMLFormElement);
    this.searchCollections = $(this.pageElement.querySelector('.search-collections'));

    this.lycanImportSection = $(this.pageElement.querySelector('.lycan-import'));
    this.lycanImportForm = $(this.pageElement.querySelector('.lycan-import form'), HTMLFormElement);
    this.importProgress = $(this.pageElement.querySelector('.import-progress'));
    this.importProgressBar = $(this.pageElement.querySelector('.import-progress progress'), HTMLProgressElement);
    this.importStatusLabel = $(this.pageElement.querySelector('.import-status'));
    this.importStatusPosition = $(this.pageElement.querySelector('.import-progress output'));

    this.isCheckingStatus = false;
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
    this.timelineSearchForm.addEventListener('submit', (e) => {
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

    this.lycanImportForm.addEventListener('submit', (e) => {
      e.preventDefault();
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
      this.header.innerText = 'Archive search';
      this.timelineSearch.style.display = 'none';
      this.searchCollections.style.display = 'block';
      this.searchLine.style.display = 'block';
      this.lycanImportSection.style.display = 'none';
      this.checkLycanImportStatus();
    } else {
      this.header.innerText = 'Timeline search';
      this.timelineSearch.style.display = 'block';
      this.searchCollections.style.display = 'none';
      this.lycanImportSection.style.display = 'none';
    }
  }

  /** @returns {Promise<void>} */

  async checkLycanImportStatus() {
    if (this.isCheckingStatus) {
      return;
    }

    this.isCheckingStatus = true;

    try {
      let response = await this.getImportStatus();
      this.showImportStatus(response);
    } catch (error) {
      this.showImportError(`Couldn't check import status: ${error}`);
    } finally {
      this.isCheckingStatus = false;
    }
  }

  /** @returns {Promise<json>} */

  async getImportStatus() {
    if (this.localLycan) {
      return await this.localLycan.getRequest('blue.feeds.lycan.getImportStatus', { user: accountAPI.user.did });
    } else {
      return await accountAPI.getRequest('blue.feeds.lycan.getImportStatus', null, {
        headers: { 'atproto-proxy': 'did:web:lycan.feeds.blue#lycan' }
      });
    }
  }

  /** @param {json} info */

  showImportStatus(info) {
    console.log(info);

    if (!info.status) {
      this.showImportError("Error checking import status");
      return;
    }

    this.lycanImportStatus = info.status;

    if (info.status == 'not_started') {
      this.lycanImportSection.style.display = 'block';
      this.lycanImportForm.style.display = 'block';
      this.importProgress.style.display = 'none';
      this.searchField.disabled = true;

      this.stopImportTimer();
    } else if (info.status == 'in_progress' || info.status == 'scheduled' || info.status == 'requested') {
      this.lycanImportSection.style.display = 'block';
      this.lycanImportForm.style.display = 'none';
      this.importProgress.style.display = 'block';
      this.searchField.disabled = true;

      this.showImportProgress(info);
      this.startImportTimer();
    } else if (info.status == 'finished') {
      this.lycanImportForm.style.display = 'none';
      this.importProgress.style.display = 'block';
      this.searchField.disabled = false;

      this.showImportProgress({ status: 'finished', progress: 1.0 });
      this.stopImportTimer();
    } else {
      this.showImportError("Error checking import status");
      this.stopImportTimer();
    }
  }

  /** @param {json} info */

  showImportProgress(info) {
    let progress = Math.max(0, Math.min(info.progress || 0));
    this.importProgressBar.value = progress;
    this.importProgressBar.style.display = 'inline';

    let percent = Math.round(progress * 100);
    this.importStatusPosition.innerText = `${percent}%`;

    if (info.progress == 1.0) {
      this.importStatusLabel.innerText = `Import complete ✓`;
    } else if (info.position) {
      let date = new Date(info.position).toLocaleString(window.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
      this.importStatusLabel.innerText = `Downloaded data until: ${date}`;
    } else if (info.status == 'requested') {
      this.importStatusLabel.innerText = 'Requesting import…';
    } else {
      this.importStatusLabel.innerText = 'Import started…';
    }
  }

  /** @param {string} message */

  showImportError(message) {
    this.lycanImportSection.style.display = 'block';
    this.lycanImportForm.style.display = 'none';
    this.importProgress.style.display = 'block';
    this.searchField.disabled = true;

    this.importStatusLabel.innerText = message;
    this.stopImportTimer();
  }

  startImportTimer() {
    if (this.importTimer) {
      return;
    }

    this.importTimer = setInterval(() => {
      this.checkLycanImportStatus();
    }, 3000);
  }

  stopImportTimer() {
    if (this.importTimer) {
      clearInterval(this.importTimer);
      this.importTimer = undefined;
    }
  }

  /** @returns {Promise<void>} */

  async startLycanImport() {
    this.showImportStatus({ status: 'requested' });

    try {
      if (this.localLycan) {
        await this.localLycan.postRequest('blue.feeds.lycan.startImport', {
          user: accountAPI.user.did
        });
      } else {
        await accountAPI.postRequest('blue.feeds.lycan.startImport', null, {
          headers: { 'atproto-proxy': 'did:web:lycan.feeds.blue#lycan' }
        });
      }

      this.startImportTimer();
    } catch (err) {
      console.error('Failed to start Lycan import', err);
      this.showImportError(`Import failed: ${err}`);
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

    this.timelinePosts = timeline;

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

    let matching = this.timelinePosts
      .filter(x => x.post.record.text.toLowerCase().includes(query))
      .map(x => Post.parseFeedPost(x));

    for (let post of matching) {
      let postView = new PostComponent(post, 'feed').buildElement();
      this.results.appendChild(postView);
    }
  }

  /** @param {string} query */

  searchInLycan(query) {
    if (query.length == 0 || this.lycanImportStatus != 'finished') {
      return;
    }

    this.results.innerHTML = '';
    this.lycanImportSection.style.display = 'none';

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
        let params = { collection, query, user: accountAPI.user.did };
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

      let records = await accountAPI.loadPosts(response.posts);
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
