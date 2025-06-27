// @ts-nocheck

// "Test suite" for TypeScript checking in $(), $id() and $tag()

function test() {

  let panel = $(document.querySelector('.panel'));  // HTMLElement
  panel.style.display = 'none';

  /** @type {never} */ let x1 = panel;

  let link = $(document.querySelector('a.more'), HTMLLinkElement);  // HTMLLinkElement
  link.href = 'about:blank';

  /** @type {never} */ let x2 = link;

  let html = $(document.parentNode);

  /** @type {never} */ let x3 = html;

  document.addEventListener('click', (e) => {
    let target = $(e.target);
    /** @type {never} */ let x4 = target;
  });

  let text = $(link.innerText);

  /** @type {never} */ let x5 = text;

  let login = $id('login');  // HTMLElement
  login.remove();

  /** @type {never} */ let x6 = login;

  let loginField = $id('login_field', HTMLInputElement);  // HTMLInputElement
  loginField.value = '';

  /** @type {never} */ let x7 = loginField;

  let p = $tag('p.details');  // HTMLElement
  p.innerText = 'About';

  /** @type {never} */ let x8 = p;

  let p2 = $tag('p.details', { text: 'Info' });  // HTMLElement
  p2.innerText = 'About';

  /** @type {never} */ let x9 = p2;

  let img = $tag('img.icon', HTMLImageElement);  // HTMLImageElement
  img.loading = 'lazy';

  /** @type {never} */ let x10 = img;

  let img2 = $tag('img.icon', { src: accountAPI.user.avatar }, HTMLImageElement);  // HTMLImageElement
  img2.loading = 'lazy';

  /** @type {never} */ let x11 = img2;

}
