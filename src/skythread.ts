import { mount } from 'svelte';
import { parseURLParams } from './router.js';
import App from './App.svelte';
import { initAnalytics } from './services/analytics.js';

function init() {
  let params = parseURLParams(location.search);
  mount(App, { target: document.body, props: { params }});
}

document.addEventListener("DOMContentLoaded", init);
initAnalytics();
