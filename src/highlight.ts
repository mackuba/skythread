import { highlightCodeBlock } from './utils/code_highlighter.js';

window.Highlighter = { highlightCodeBlock };
window.dispatchEvent(new Event('highlighter-loaded'));
