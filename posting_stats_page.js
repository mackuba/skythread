/**
 * Manages the Posting Stats page.
 */

class PostingStatsPage {

  /** @type {number | undefined} */
  scanStartTime;

  constructor() {
    this.pageElement = $id('posting_stats_page');

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

    $(this.pageElement.querySelector('input[type="range"]')).addEventListener('input', (e) => {
      let range = $(e.target, HTMLInputElement);
      let days = parseInt(range.value, 10);
      this.configurePostingStats({ days });
    });
    
  }

  show() {
    this.pageElement.style.display = 'block';
  }

  /** @param {{ days: number }} args */

  configurePostingStats(args) {
    if (args.days) {
      let label = $(this.pageElement.querySelector('input[type=range] + label'));
      label.innerText = (args.days == 1) ? '1 day' : `${args.days} days`;
    }
  }

  scanPostingStats() {
    let submit = $(this.pageElement.querySelector('input[type=submit]'), HTMLInputElement);
    submit.value = 'Cancel';

    let range = $(this.pageElement.querySelector('input[type=range]'), HTMLInputElement);
    let days = parseInt(range.value, 10);

    let progressBar = $(this.pageElement.querySelector('input[type=submit] + progress'), HTMLProgressElement);
    progressBar.max = days;
    progressBar.value = 0;
    progressBar.style.display = 'inline';

    let table = $(this.pageElement.querySelector('table.scan-result'));
    table.style.display = 'none';

    let tbody = $(table.querySelector('tbody'));
    tbody.innerHTML = '';

    let now = new Date().getTime();
    this.scanStartTime = now;

    let minTime = now;
    let daysBack = 0;

    let scanInfo = $(this.pageElement.querySelector('.scan-info'));
    scanInfo.style.display = 'none';

    accountAPI.loadTimeline(days, {
      onPageLoad: (data) => {
        if (this.scanStartTime != now) {
          return { cancel: true };
        }

        for (let item of data) {
          let timestamp = item.reason ? item.reason.indexedAt : item.post.record.createdAt;
          let date = Date.parse(timestamp);
          minTime = Math.min(minTime, date);
        }

        daysBack = (now - minTime) / 86400 / 1000;
        progressBar.value = daysBack;
      }
    }).then(items => {
      if (this.scanStartTime != now) {
        return;
      }

      let users = {};
      let total = 0;
      let allReposts = 0;
      let allNormalPosts = 0;

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

      let sorted = Object.values(users).sort((a, b) => {
        let asum = a.own + a.reposts;
        let bsum = b.own + b.reposts;

        if (asum < bsum) {
          return 1;
        } else if (asum > bsum) {
          return -1;
        } else {
          return 0;
        }
      });

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

      if (Math.ceil(daysBack) < days) {
        scanInfo.innerText = `🕓 Showing data from ${Math.round(daysBack)} days (your timeline only goes that far):`;
        scanInfo.style.display = 'block';
      }

      table.style.display = 'table';
      submit.value = 'Start scan';
      progressBar.style.display = 'none';
      this.scanStartTime = undefined;
    });
  }

  stopScan() {
    let submit = $(this.pageElement.querySelector('input[type=submit]'), HTMLInputElement);
    submit.value = 'Start scan';
    this.scanStartTime = undefined;

    let progressBar = $(this.pageElement.querySelector('input[type=submit] + progress'), HTMLProgressElement);
    progressBar.style.display = 'none';
  }
}
