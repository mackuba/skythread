interface Window {
  unauthed: boolean;
  root: AnyPost;
  dateLocale?: string;
}

declare var api: BlueskyAPI;
declare var blue: BlueskyAPI;
declare var appView: BlueskyAPI;

type SomeElement = Element | HTMLElement | AnyElement;

interface AnyElement {
  classList: CSSClassList;
  className: string;
  innerText: string;
  nextElementSibling: AnyElement;
  parentNode: AnyElement;
  src: string;
  style: CSSStyleDeclaration;

  addEventListener<K extends keyof DocumentEventMap>(
    type: K, listener: EventListenerOrEventListenerObject
  ): void;

  append(...e: Array<string | SomeElement>): void;
  appendChild(e: SomeElement): void;
  querySelector(q: string): AnyElement;
  prepend(...e: Array<string | SomeElement>): void;
  remove(): void;
  replaceChildren(e: SomeElement): void;
  replaceWith(e: SomeElement): void;
}
