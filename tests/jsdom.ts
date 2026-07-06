import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
});

const { window } = dom;

Object.defineProperties(globalThis, {
  window: { value: window, configurable: true },
  document: { value: window.document, configurable: true },
  navigator: { value: window.navigator, configurable: true },
  Node: { value: window.Node, configurable: true },
  Element: { value: window.Element, configurable: true },
  HTMLElement: { value: window.HTMLElement, configurable: true },
  HTMLTemplateElement: { value: window.HTMLTemplateElement, configurable: true },
  DocumentFragment: { value: window.DocumentFragment, configurable: true },
  DOMParser: { value: window.DOMParser, configurable: true },
  XMLSerializer: { value: window.XMLSerializer, configurable: true },
  MutationObserver: { value: window.MutationObserver, configurable: true },
});
