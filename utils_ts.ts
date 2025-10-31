export function $tag<T extends HTMLElement>(
  tag: string,
  params?: string | object | (new (...args: any[]) => T),
  type?: new (...args: any[]) => T
): T {
  let element;
  let parts = tag.split('.');

  if (parts.length > 1) {
    let tagName = parts[0];
    element = document.createElement(tagName);
    element.className = parts.slice(1).join(' ');
  } else {
    element = document.createElement(tag);
  }

  if (typeof params === 'string') {
    element.className = element.className + ' ' + params;
  } else if (params) {
    for (let key in params) {
      if (key == 'text') {
        element.innerText = params[key];
      } else if (key == 'html') {
        element.innerHTML = params[key];
      } else {
        element[key] = params[key];
      }
    }
  }

  return element;
}
