export function initAnalytics() {
  if (window.location.protocol != 'https:') { return }

  let _paq = window._paq = window._paq || [];
  _paq.push(["setExcludedQueryParams", ['fbclid']]);
  _paq.push(['setTrackerUrl', 'https://mackuba.eu/stat/matomo.php']);
  _paq.push(['setCustomUrl', anonymizeParams(location.href)]);
  _paq.push(["setRequestMethod", "POST"]);
  _paq.push(['setSiteId', '13']);
  _paq.push(["disableCookies"]);
  _paq.push(["disableAlwaysUseSendBeacon"]);
  _paq.push(['trackPageView']);
}

function anonymizeParams(url: string) {
  let u = new URL(url);
  let params = u.searchParams;

  // turn e.g.: /?author=jcsalterego.bsky.social&post=3mci5wurx6c2c
  //      into: /?author=xxx&post=xxx

  for (let key of params.keys()) {
    if (['q', 'author', 'post', 'quotes', 'hash'].includes(key)) {
      params.set(key, 'xxx');
    }
  }

  u.search = params.toString();
  return u.origin + u.pathname + u.search;
}
