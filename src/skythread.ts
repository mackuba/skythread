import * as svelte from 'svelte';
import { parseURLParams } from './router.js';
import App from './App.svelte';

function init() {
  let params = parseURLParams(location.search);
  svelte.mount(App, { target: document.body, props: { params }});
}

window.init = init;
