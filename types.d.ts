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
declare var loginDialog: HTMLElement;
declare var accountMenu: HTMLElement;
declare var avatarPreloader: IntersectionObserver;

type json = Record<string, any>;

function $tag(tag: string): HTMLElement;
function $tag<T>(tag: string, type: new (...args: any[]) => T): T;
function $tag(tag: string, params: string | object): HTMLElement;
function $tag<T>(tag: string, params: string | object, type: new (...args: any[]) => T): T;

function $id(id: string): HTMLElement;
function $id<T>(id: string, type: new (...args: any[]) => T): T;

function $(element: Node | EventTarget | null): HTMLElement;
function $<T>(element: Node | EventTarget | null, type: new (...args: any[]) => T): T;
