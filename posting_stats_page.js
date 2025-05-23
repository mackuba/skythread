/**
 * Manages the Posting Stats page.
 */

class PostingStatsPage {

  /** @type {number | undefined} */
  scanStartTime;

  constructor() {
    this.pageElement = $id('posting_stats_page');

    this.rangeInput = $(this.pageElement.querySelector('input[type="range"]'), HTMLInputElement);
    this.submitButton = $(this.pageElement.querySelector('input[type="submit"]'), HTMLInputElement);
    this.progressBar = $(this.pageElement.querySelector('input[type=submit] + progress'), HTMLProgressElement);
    this.table = $(this.pageElement.querySelector('table.scan-result'));

    this.setupEvents();
  }

  setupEvents() {
    $(this.pageElement.querySelector('form')).addEventListener('submit', (e) => {
      e.preventDefault();

      if (!this.scanStartTime) {
        this.scanPostingStats();      
      } else {
        this.stopScan();
      }
    });

    this.rangeInput.addEventListener('input', (e) => {
      let days = parseInt(this.rangeInput.value, 10);
      this.configurePostingStats({ days });
    });
  }

  show() {
    this.pageElement.style.display = 'block';
  }

  /** @returns {number} */

  selectedDaysRange() {
    return parseInt(this.rangeInput.value, 10);
  }

  /** @param {{ days: number }} args */

  configurePostingStats(args) {
    if (args.days) {
      let label = $(this.pageElement.querySelector('input[type=range] + label'));
      label.innerText = (args.days == 1) ? '1 day' : `${args.days} days`;
    }
  }

  /** @returns {Promise<void>} */

  async scanPostingStats() {
    this.submitButton.value = 'Cancel';

    let requestedDays = this.selectedDaysRange();

    this.progressBar.max = requestedDays;
    this.progressBar.value = 0;
    this.progressBar.style.display = 'inline';

    this.table.style.display = 'none';

    let tbody = $(this.table.querySelector('tbody'));
    tbody.innerHTML = '';

    let startTime = new Date().getTime();
    this.scanStartTime = startTime;

    let scanInfo = $(this.pageElement.querySelector('.scan-info'));
    scanInfo.style.display = 'none';

    let items = await accountAPI.loadTimeline(requestedDays, {
      onPageLoad: (data) => {
        if (this.scanStartTime != startTime) {
          return { cancel: true };
        }

        this.updateProgress(data, startTime);
      }
    });

    if (this.scanStartTime != startTime) {
      return;
    }

    this.updateResultsTable(items, startTime, requestedDays);
  }

  /** @param {json[]} dataPage, @param {number} startTime */

  updateProgress(dataPage, startTime) {
    if (dataPage.length == 0) { return }

    let last = dataPage[dataPage.length - 1];
    let lastTimestamp = last.reason ? last.reason.indexedAt : last.post.record.createdAt;
    let lastDate = Date.parse(lastTimestamp);

    let daysBack = (startTime - lastDate) / 86400 / 1000;
    this.progressBar.value = daysBack;    
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

  /** @param {json[]} items, @param {number} startTime, @param {number} requestedDays */

  updateResultsTable(items, startTime, requestedDays) {
    let users = {};
    let total = 0;
    let allReposts = 0;
    let allNormalPosts = 0;

    let last = items[items.length - 1];
    let lastTimestamp = last.reason ? last.reason.indexedAt : last.post.record.createdAt;
    let lastDate = Date.parse(lastTimestamp);
    let daysBack = (startTime - lastDate) / 86400 / 1000;

    for (let item of items) {
      if (item.reply) { continue; }

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
      }
    }

    let tbody = $(this.table.querySelector('tbody'));
    let tr = $tag('tr.total');

    tr.append(
      $tag('td.no', { text: '' }),
      $tag('td.handle', { text: 'Total:' }),
      $tag('td', { text: (total / daysBack).toFixed(1) }),
      $tag('td', { text: (allNormalPosts / daysBack).toFixed(1) }),
      $tag('td', { text: (allReposts / daysBack).toFixed(1) }),
      $tag('td.percent', { text: '' })
    );

    tbody.append(tr);

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
        $tag('td', { text: ((user.own + user.reposts) / daysBack).toFixed(1) }),
        $tag('td', { text: user.own > 0 ? (user.own / daysBack).toFixed(1) : '–' }),
        $tag('td', { text: user.reposts > 0 ? (user.reposts / daysBack).toFixed(1) : '–' }),
        $tag('td.percent', { text: ((user.own + user.reposts) * 100 / total).toFixed(1) + '%' })
      );

      tbody.append(tr);
    }

    if (Math.ceil(daysBack) < requestedDays) {
      let scanInfo = $(this.pageElement.querySelector('.scan-info'));
      scanInfo.innerText = `🕓 Showing data from ${Math.round(daysBack)} days (your timeline only goes that far):`;
      scanInfo.style.display = 'block';
    }

    this.table.style.display = 'table';
    this.submitButton.value = 'Start scan';
    this.progressBar.style.display = 'none';
    this.scanStartTime = undefined;
  }

  stopScan() {
    this.submitButton.value = 'Start scan';
    this.scanStartTime = undefined;
    this.progressBar.style.display = 'none';
  }
}
