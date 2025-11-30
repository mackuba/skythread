import * as svelte from 'svelte';
import App from './App.svelte';
import BiohazardDialog from './components/BiohazardDialog.svelte';
import LoginDialog from './components/LoginDialog.svelte';

import { BlueskyAPI } from './api.js';
import { account } from './models/account.svelte.js';
import { parseURLParams } from './router.js';

let loginDialog: Record<string, any> | undefined;
let biohazardDialog: Record<string, any> | undefined;


function init() {
  for (let dialog of document.querySelectorAll('.dialog')) {
    let close = dialog.querySelector('.close') as HTMLElement;

    dialog.addEventListener('click', (e) => {
      if (e.target === e.currentTarget && close && close.offsetHeight > 0) {
        hideDialog(dialog);
      } else {
        e.stopPropagation();
      }
    });

    close?.addEventListener('click', (e) => {
      hideDialog(dialog);
    });
  }

  parseQueryParams();
}

function parseQueryParams() {
  let params = parseURLParams(location.search);
  svelte.mount(App, { target: document.body, props: { params }});
}

function hideDialog(dialog) {
  dialog.style.visibility = 'hidden';
  dialog.classList.remove('expanded');
  document.getElementById('thread')!.classList.remove('overlay');

  for (let field of dialog.querySelectorAll('input[type=text]')) {
    field.value = '';
  }
}

function showLoginDialog(showClose: boolean = true) {
  if (loginDialog) {
    return;
  }

  let dialog = document.getElementById('login')!

  let props = {
    onClose: showClose ? hideLoginDialog : undefined
  };

  dialog.addEventListener('click', (e) => {
    if (e.target === e.currentTarget && showClose) {
      hideLoginDialog();
    } else {
      e.stopPropagation();
    }
  });

  loginDialog = svelte.mount(LoginDialog, { target: dialog, props });

  dialog.style.visibility = 'visible';
  document.getElementById('thread')!.classList.add('overlay');
}

function hideLoginDialog() {
  if (loginDialog) {
    svelte.unmount(loginDialog);
    loginDialog = undefined;

    document.getElementById('login')!.style.visibility = 'hidden';
    document.getElementById('thread')!.classList.remove('overlay');
  }
}

function showBiohazardDialog(onConfirm?: () => void) {
  if (biohazardDialog) {
    return;
  }

  let dialog = document.getElementById('biohazard_dialog')!

  dialog.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      hideBiohazardDialog();
    } else {
      e.stopPropagation();
    }
  });

  biohazardDialog = svelte.mount(BiohazardDialog, {
    target: dialog,
    props: {
      onConfirm: onConfirm,
      onClose: hideBiohazardDialog
    }
  });

  dialog.style.visibility = 'visible';
  document.getElementById('thread')!.classList.add('overlay');
}

function hideBiohazardDialog() {
  if (biohazardDialog) {
    svelte.unmount(biohazardDialog);
    biohazardDialog = undefined;

    document.getElementById('biohazard_dialog')!.style.visibility = 'hidden';
    document.getElementById('thread')!.classList.remove('overlay');
  }
}

async function submitLogin(identifier: string, password: string) {
  await account.logIn(identifier, password);

  hideLoginDialog();

  let params = new URLSearchParams(location.search);
  let page = params.get('page');
  if (page) {
    openPage(page);
  }
}

window.init = init;
window.BlueskyAPI = BlueskyAPI;

export { showLoginDialog, showBiohazardDialog, submitLogin };
