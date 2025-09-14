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
  }

  /** @returns {number} */

  selectedDaysRange() {
    return parseInt(this.rangeInput.value, 10);
  }

  show() {
    this.pageElement.style.display = 'block';

    if (this.mode == 'likes') {
      this.timelineSearch.style.display = 'none';
      this.searchCollections.style.display = 'block';
      this.searchLine.style.display = 'block';
    } else {
      this.timelineSearch.style.display = 'block';
      this.searchCollections.style.display = 'none';
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
