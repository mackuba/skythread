import { mount } from 'svelte';
import { parseURLParams } from './router.js';
import App from './App.svelte';

function init() {
  let params = parseURLParams(location.search);
  mount(App, { target: document.body, props: { params }});
}

document.addEventListener("DOMContentLoaded", init);
