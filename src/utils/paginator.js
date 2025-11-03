/** @type {() => void} */
let scrollHandler;

/** @type {ResizeObserver} */
let resizeObserver;

export function loadInPages(callback) {
  if (scrollHandler) {
    document.removeEventListener('scroll', scrollHandler);
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  scrollHandler = () => {
    if (window.pageYOffset + window.innerHeight > document.body.offsetHeight - 500) {
      callback(scrollHandler);
    }
  };

  callback(scrollHandler);

  document.addEventListener('scroll', scrollHandler);

  resizeObserver = new ResizeObserver(scrollHandler);
  resizeObserver.observe(document.body);
}
