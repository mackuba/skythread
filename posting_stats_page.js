/**
 * Manages the Posting Stats page.
 */

class PostingStatsPage {

  /** @type {number | undefined} */
  scanStartTime;

  /** @type {Record<string, { pages: number, progress: number }>} */
  userProgress;

  /** @type {number | undefined} */
  autocompleteTimer;

  /** @type {number} */
  autocompleteIndex = -1;

  /** @type {json[]} */
  autocompleteResults = [];

  /** @type {Record<string, json>} */
  selectedUsers = {};

  constructor() {
    this.pageElement = $id('posting_stats_page');
    this.form = $(this.pageElement.querySelector('form'), HTMLFormElement);

    this.rangeInput = $(this.pageElement.querySelector('input[type="range"]'), HTMLInputElement);
    this.submitButton = $(this.pageElement.querySelector('input[type="submit"]'), HTMLInputElement);
    this.progressBar = $(this.pageElement.querySelector('input[type=submit] + progress'), HTMLProgressElement);
    this.table = $(this.pageElement.querySelector('table.scan-result'));
    this.tableHead = $(this.table.querySelector('thead'));
    this.tableBody = $(this.table.querySelector('tbody'));
    this.listSelect = $(this.pageElement.querySelector('.list-choice select'), HTMLSelectElement);
    this.scanInfo = $(this.pageElement.querySelector('.scan-info'));
    this.scanType = this.form.elements['scan_type'];

    this.userField = $(this.pageElement.querySelector('.user-choice input'), HTMLInputElement);
    this.userList = $(this.pageElement.querySelector('.selected-users'));
    this.autocomplete = $(this.pageElement.querySelector('.autocomplete'));

    this.userProgress = {};
    this.appView = new BlueskyAPI('public.api.bsky.app', false);

    this.setupEvents();
  }

  setupEvents() {
    let html = $(document.body.parentNode);

    html.addEventListener('click', (e) => {
      this.hideAutocomplete();
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!this.scanStartTime) {
        this.scanPostingStats();
      } else {
        this.stopScan();
      }
    });

    this.rangeInput.addEventListener('input', (e) => {
      let days = parseInt(this.rangeInput.value, 10);
      let label = $(this.pageElement.querySelector('input[type=range] + label'));
      label.innerText = (days == 1) ? '1 day' : `${days} days`;
    });

    this.scanType.forEach(r => {
      r.addEventListener('click', (e) => {
        let value = $(r, HTMLInputElement).value;

        $(this.pageElement.querySelector('.list-choice')).style.display = (value == 'list') ? 'block' : 'none';
        $(this.pageElement.querySelector('.user-choice')).style.display = (value == 'users') ? 'block' : 'none';

        if (value == 'users') {
          this.userField.focus();
        }

        this.table.style.display = 'none';
      });
    });

    this.userField.addEventListener('input', () => {
      this.onUserInput();
    });

    this.userField.addEventListener('keydown', (e) => {
      this.onUserKeyDown(e);
    });
  }

  show() {
    this.pageElement.style.display = 'block';
    this.fetchLists();
  }

  /** @returns {number} */

  selectedDaysRange() {
    return parseInt(this.rangeInput.value, 10);
  }

  /** @returns {Promise<void>} */

  async fetchLists() {
    let lists = await accountAPI.loadUserLists();

    let sorted = lists.sort((a, b) => {
      let aName = a.name.toLocaleLowerCase();
      let bName = b.name.toLocaleLowerCase();

      return aName.localeCompare(bName);
    });

    for (let list of lists) {
      this.listSelect.append(
        $tag('option', { value: list.uri, text: list.name + ' ' })
      );
    }
  }

  onUserInput() {
    if (this.autocompleteTimer) {
      clearTimeout(this.autocompleteTimer);
    }

    let query = this.userField.value.trim();

    if (query.length == 0) {
      this.hideAutocomplete();
      this.autocompleteTimer = undefined;
      return;
    }

    this.autocompleteTimer = setTimeout(() => this.fetchAutocomplete(query), 100);
  }

  /** @param {KeyboardEvent} e */

  onUserKeyDown(e) {
    if (e.key == 'Enter') {
      e.preventDefault();

      if (this.autocompleteIndex >= 0) {
        this.selectUser(this.autocompleteIndex);
      }
    } else if (e.key == 'Escape') {
      this.hideAutocomplete();
    } else if (e.key == 'ArrowDown' && this.autocompleteResults.length > 0) {
      e.preventDefault();
      this.moveAutocomplete(1);
    } else if (e.key == 'ArrowUp' && this.autocompleteResults.length > 0) {
      e.preventDefault();
      this.moveAutocomplete(-1);
    }
  }

  /** @param {string} query, @returns {Promise<void>} */

  async fetchAutocomplete(query) {
    let users = await accountAPI.autocompleteUsers(query);

    let selectedDIDs = new Set(Object.keys(this.selectedUsers));
    users = users.filter(u => !selectedDIDs.has(u.did));

    this.autocompleteResults = users;
    this.autocompleteIndex = -1;
    this.showAutocomplete();
  }

  showAutocomplete() {
    this.autocomplete.innerHTML = '';
    this.autocomplete.scrollTop = 0;

    if (this.autocompleteResults.length == 0) {
      this.hideAutocomplete();
      return;
    }

    for (let [i, user] of this.autocompleteResults.entries()) {
      let row = this.makeUserRow(user);

      row.addEventListener('mouseenter', () => {
        this.highlightAutocomplete(i);
      });

      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.selectUser(i);
      });

      this.autocomplete.append(row);
    };

    this.autocomplete.style.top = this.userField.offsetHeight + 'px';
    this.autocomplete.style.display = 'block';
    this.highlightAutocomplete(0);
  }

  hideAutocomplete() {
    this.autocomplete.style.display = 'none';
    this.autocompleteResults = [];
    this.autocompleteIndex = -1;
  }

  /** @param {number} change */

  moveAutocomplete(change) {
    if (this.autocompleteResults.length == 0) {
      return;
    }

    let newIndex = this.autocompleteIndex + change;

    if (newIndex < 0) {
      newIndex = this.autocompleteResults.length - 1;
    } else if (newIndex >= this.autocompleteResults.length) {
      newIndex = 0;
    }

    this.highlightAutocomplete(newIndex);
  }

  /** @param {number} index */

  highlightAutocomplete(index) {
    this.autocompleteIndex = index;

    let rows = this.autocomplete.querySelectorAll('.user-row');

    rows.forEach((row, i) => {
      row.classList.toggle('hover', i == index);
    });
  }

  /** @param {number} index */

  selectUser(index) {
    let user = this.autocompleteResults[index];

    if (!user) {
      return;
    }

    this.selectedUsers[user.did] = user;

    let row = this.makeUserRow(user, true);
    this.userList.append(row);

    this.userField.value = '';
    this.hideAutocomplete();
  }

  /** @param {json} user, @param {boolean} [withRemove], @returns HTMLElement */

  makeUserRow(user, withRemove = false) {
    let row = $tag('div.user-row');
    row.dataset.did = user.did;
    row.append(
      $tag('img.avatar', { src: user.avatar }),
      $tag('span.name', { text: user.displayName || '–' }),
      $tag('span.handle', { text: user.handle })
    );

    if (withRemove) {
      let remove = $tag('a.remove', { href: '#', text: '✕' });

      remove.addEventListener('click', (e) => {
        e.preventDefault();
        row.remove();
        delete this.selectedUsers[user.did];
      });

      row.append(remove);
    }

    return row;
  }

  /** @returns {Promise<void>} */

  async scanPostingStats() {
    let startTime = new Date().getTime();
    let requestedDays = this.selectedDaysRange();
    let scanType = this.scanType.value;

    /** @type {FetchAllOnPageLoad} */
    let onPageLoad = (data) => {
      if (this.scanStartTime != startTime) {
        return { cancel: true };
      }

      this.updateProgress(data, startTime);
    };

    if (scanType == 'home') {
      this.startScan(startTime, requestedDays);

      let posts = await accountAPI.loadHomeTimeline(requestedDays, {
        onPageLoad: onPageLoad,
        keepLastPage: true
      });

      this.updateResultsTable(posts, startTime, requestedDays);
    } else if (scanType == 'list') {
      let list = this.listSelect.value;

      if (!list) {
        return;
      }

      this.startScan(startTime, requestedDays);

      let posts = await accountAPI.loadListTimeline(list, requestedDays, {
        onPageLoad: onPageLoad,
        keepLastPage: true
      });

      this.updateResultsTable(posts, startTime, requestedDays, { showReposts: false });
    } else if (scanType == 'users') {
      let dids = Object.keys(this.selectedUsers);

      if (dids.length == 0) {
        return;
      }

      this.startScan(startTime, requestedDays);
      this.resetUserProgress(dids);

      let requests = dids.map(did => this.appView.loadUserTimeline(did, requestedDays, {
        filter: 'posts_and_author_threads',
        onPageLoad: (data) => {
          if (this.scanStartTime != startTime) {
            return { cancel: true };
          }

          this.updateUserProgress(did, data, startTime, requestedDays);
        },
        keepLastPage: true
      }));

      let datasets = await Promise.all(requests);
      let posts = datasets.flat();

      this.updateResultsTable(posts, startTime, requestedDays, {
        showTotal: false,
        showPercentages: false,
        countFetchedDays: false,
        users: Object.values(this.selectedUsers)
      });
    } else {
      this.startScan(startTime, requestedDays);

      let posts = await accountAPI.loadUserTimeline(accountAPI.user.did, requestedDays, {
        filter: 'posts_no_replies',
        onPageLoad: onPageLoad,
        keepLastPage: true
      });

      this.updateResultsTable(posts, startTime, requestedDays, { showTotal: false, showPercentages: false });
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

  /** @param {string[]} dids */

  resetUserProgress(dids) {
    this.userProgress = {};

    for (let did of dids) {
      this.userProgress[did] = { pages: 0, progress: 0 };
    }
  }

  /** @param {string} did, @param {json[]} dataPage, @param {number} startTime, @param {number} requestedDays */

  updateUserProgress(did, dataPage, startTime, requestedDays) {
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

    this.progressBar.value = Math.max(this.progressBar.value, (fetchedPages / expectedTotalPages) * requestedDays);
  }

  /** @param {json} a, @param {json} b, @returns {number} */

  sortUserRows(a, b) {
    let asum = a.own + a.reposts;
    let bsum = b.own + b.reposts;

    if (asum < bsum) {
      return 1;
    } else if (asum > bsum) {
      return -1;
    } else {
      return 0;
    }
  }

  /**
   * @param {json[]} posts
   * @param {number} startTime
   * @param {number} requestedDays
   * @param {{
   *   showTotal?: boolean,
   *   showPercentages?: boolean,
   *   showReposts?: boolean,
   *   countFetchedDays?: boolean,
   *   users?: json[]
   * }} [options]
   * @returns {Promise<void>}
   */

  async updateResultsTable(posts, startTime, requestedDays, options = {}) {
    if (this.scanStartTime != startTime) {
      return;
    }

    let now = new Date().getTime();

    if (now - startTime < 100) {
      // artificial UI delay in case scan finishes immediately
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    let users = {};
    let total = 0;
    let allReposts = 0;
    let allNormalPosts = 0;

    let last = posts.at(-1);

    if (!last) {
      this.stopScan();
      return;
    }

    let daysBack;

    if (options.countFetchedDays !== false) {
      let lastDate = feedPostTime(last);
      let fetchedDays = (startTime - lastDate) / 86400 / 1000;

      if (Math.ceil(fetchedDays) < requestedDays) {
        this.scanInfo.innerText = `🕓 Showing data from ${Math.round(fetchedDays)} days (the timeline only goes that far):`;
        this.scanInfo.style.display = 'block';
      }

      daysBack = Math.min(requestedDays, fetchedDays);
    } else {
      daysBack = requestedDays;
    }

    let timeLimit = startTime - requestedDays * 86400 * 1000;
    posts = posts.filter(x => (feedPostTime(x) > timeLimit));
    posts.reverse();

    if (options.users) {
      for (let user of options.users) {
        users[user.handle] = { handle: user.handle, own: 0, reposts: 0, avatar: user.avatar };
      }
    }

    let ownThreads = new Set();

    for (let item of posts) {
      if (item.reply) {
        if (!ownThreads.has(item.reply.parent.uri)) {
          continue;
        }
      }

      let user = item.reason ? item.reason.by : item.post.author;
      let handle = user.handle;
      users[handle] = users[handle] ?? { handle: handle, own: 0, reposts: 0, avatar: user.avatar };
      total += 1;

      if (item.reason) {
        users[handle].reposts += 1;
        allReposts += 1;
      } else {
        users[handle].own += 1;
        allNormalPosts += 1;
        ownThreads.add(item.post.uri);
      }
    }

    let headRow = $tag('tr');

    if (options.showReposts !== false) {
      headRow.append(
        $tag('th', { text: '#' }),
        $tag('th', { text: 'Handle' }),
        $tag('th', { text: 'All posts /d' }),
        $tag('th', { text: 'Own posts /d' }),
        $tag('th', { text: 'Reposts /d' })
      );
    } else {
      headRow.append(
        $tag('th', { text: '#' }),
        $tag('th', { text: 'Handle' }),
        $tag('th', { text: 'Posts /d' }),
      );
    }

    if (options.showPercentages !== false) {
      headRow.append($tag('th', { text: '% of timeline' }));
    }

    this.tableHead.append(headRow);

    if (options.showTotal !== false) {
      let tr = $tag('tr.total');

      tr.append(
        $tag('td.no', { text: '' }),
        $tag('td.handle', { text: 'Total:' }),

        (options.showReposts !== false) ?
          $tag('td', { text: (total / daysBack).toFixed(1) }) : '',

        $tag('td', { text: (allNormalPosts / daysBack).toFixed(1) }),

        (options.showReposts !== false) ?
          $tag('td', { text: (allReposts / daysBack).toFixed(1) }) : ''
      );

      if (options.showPercentages !== false) {
        tr.append($tag('td.percent', { text: '' }));
      }

      this.tableBody.append(tr);
    }

    let sorted = Object.values(users).sort(this.sortUserRows);

    for (let i = 0; i < sorted.length; i++) {
      let user = sorted[i];
      let tr = $tag('tr');

      tr.append(
        $tag('td.no', { text: i + 1 }),
        $tag('td.handle', {
          html: `<img class="avatar" src="${user.avatar}"> ` +
                `<a href="https://bsky.app/profile/${user.handle}" target="_blank">${user.handle}</a>`
        }),

        (options.showReposts !== false) ?
          $tag('td', { text: ((user.own + user.reposts) / daysBack).toFixed(1) }) : '',

        $tag('td', { text: user.own > 0 ? (user.own / daysBack).toFixed(1) : '–' }),

        (options.showReposts !== false) ?
          $tag('td', { text: user.reposts > 0 ? (user.reposts / daysBack).toFixed(1) : '–' }) : ''
      );

      if (options.showPercentages !== false) {
        tr.append($tag('td.percent', { text: ((user.own + user.reposts) * 100 / total).toFixed(1) + '%' }));
      }

      this.tableBody.append(tr);
    }

    this.table.style.display = 'table';
    this.stopScan();
  }

  /** @param {number} startTime, @param {number} requestedDays */

  startScan(startTime, requestedDays) {
    this.submitButton.value = 'Cancel';

    this.progressBar.max = requestedDays;
    this.progressBar.value = 0;
    this.progressBar.style.display = 'inline';

    this.table.style.display = 'none';
    this.tableHead.innerHTML = '';
    this.tableBody.innerHTML = '';

    this.scanStartTime = startTime;
    this.scanInfo.style.display = 'none';
  }

  stopScan() {
    this.submitButton.value = 'Start scan';
    this.scanStartTime = undefined;
    this.progressBar.style.display = 'none';
  }
}
