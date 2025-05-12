interface Window {
  dateLocale: string | undefined;
  root: AnyPost;
  subtreeRoot: AnyPost;
  loadInfohazard: (() => void) | undefined;
}

declare var accountAPI: BlueskyAPI;
declare var blueAPI: BlueskyAPI;
declare var appView: BlueskyAPI;
declare var api: BlueskyAPI;
declare var isIncognito: boolean;
declare var biohazardEnabled: boolean;
declare var loginDialog: AnyElement;
declare var accountMenu: AnyElement;
declare var avatarPreloader: IntersectionObserver;

type SomeElement = Element | HTMLElement | AnyElement;
type json = Record<string, any>;

interface AnyElement {
  classList: CSSClassList;
  className: string;
  innerText: string;
  innerHTML: string;
  nextElementSibling: AnyElement;
  parentNode: AnyElement;
  src: string;
  style: CSSStyleDeclaration;

  addEventListener<K extends keyof DocumentEventMap>(
    type: K, listener: EventListenerOrEventListenerObject
  ): void;

  append(...e: Array<string | SomeElement>): void;
  appendChild(e: SomeElement): void;
  closest(q: string): AnyElement;
  querySelector(q: string): AnyElement;
  querySelectorAll(q: string): AnyElement[];
  prepend(...e: Array<string | SomeElement>): void;
  remove(): void;
  replaceChildren(e: SomeElement): void;
  replaceWith(e: SomeElement): void;
}
