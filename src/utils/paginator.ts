let scrollHandler: (() => void) | undefined;
let resizeObserver: ResizeObserver | undefined;

export function loadInPages(callback: (next: () => void) => void) {
  if (scrollHandler) {
    document.removeEventListener('scroll', scrollHandler);
  }

  resizeObserver?.disconnect();

  scrollHandler = () => {
    if (window.pageYOffset + window.innerHeight > document.body.offsetHeight - 500) {
      callback(scrollHandler!);
    }
  };

  callback(scrollHandler);

  document.addEventListener('scroll', scrollHandler);

  resizeObserver = new ResizeObserver(scrollHandler);
  resizeObserver.observe(document.body);
}
