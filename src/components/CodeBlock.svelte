<script lang="ts">
  import { sanitizeHTML } from '../utils/sanitize.js';

  let { text, language }: { text: string, language?: string | undefined } = $props();

  let highlighterLoaded = $state(window.Highlighter !== undefined);

  $effect(() => {
    let onHighlighterLoaded = () => { highlighterLoaded = true };

    window.addEventListener('highlighter-loaded', onHighlighterLoaded);

    return () => {
      window.removeEventListener('highlighter-loaded', onHighlighterLoaded);
    };
  });

  let highlightResult: CodeHighlightResult = $derived.by(() => {
    if (highlighterLoaded && window.Highlighter) {
      return window.Highlighter.highlightCodeBlock(text, language);
    } else {
      return { kind: 'plain', text: text };
    }
  });

  let codeClass = $derived(language ? `language-${language}` : "");
</script>

{#if highlightResult.kind == 'highlighted'}
  <pre><code class={codeClass}>{@html sanitizeHTML(highlightResult.html)}</code></pre>
{:else}
  <pre><code>{highlightResult.text}</code></pre>
{/if}

<style>
  pre {
    overflow-x: auto;
    max-width: 60em;
    padding: 8px 10px;
    border-radius: 6px;
    background-color: rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.06);
  }

  code {
    display: block;
    font-family: ui-monospace, "Consolas", "Liberation Mono", "Menlo", monospace;
    font-size: 0.88em;
    background-color: transparent;
    border-radius: 0;
    padding: 0;
    white-space: pre;
    line-height: 150%;
  }

  code :global(.hljs-keyword),
  code :global(.hljs-selector-tag),
  code :global(.hljs-title.function_) {
    color: #9d174d;
  }

  code :global(.hljs-built_in),
  code :global(.hljs-title.class_),
  code :global(.hljs-type) {
    color: #7c3aed;
  }

  code :global(.hljs-string),
  code :global(.hljs-attr),
  code :global(.hljs-symbol) {
    color: #047857;
  }

  code :global(.hljs-number),
  code :global(.hljs-literal) {
    color: #b45309;
  }

  code :global(.hljs-comment),
  code :global(.hljs-quote) {
    color: #6b7280;
    font-style: italic;
  }

  code :global(.hljs-meta),
  code :global(.hljs-tag),
  code :global(.hljs-name) {
    color: #0369a1;
  }

  @media (prefers-color-scheme: dark) {
    pre {
      background-color: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.1);
    }

    code :global(.hljs-keyword),
    code :global(.hljs-selector-tag),
    code :global(.hljs-title.function_) {
      color: #f472b6;
    }

    code :global(.hljs-built_in),
    code :global(.hljs-title.class_),
    code :global(.hljs-type) {
      color: #c4b5fd;
    }

    code :global(.hljs-string),
    code :global(.hljs-attr),
    code :global(.hljs-symbol) {
      color: #6ee7b7;
    }

    code :global(.hljs-number),
    code :global(.hljs-literal) {
      color: #fbbf24;
    }

    code :global(.hljs-comment),
    code :global(.hljs-quote) {
      color: #9ca3af;
    }

    code :global(.hljs-meta),
    code :global(.hljs-tag),
    code :global(.hljs-name) {
      color: #7dd3fc;
    }
  }
</style>
