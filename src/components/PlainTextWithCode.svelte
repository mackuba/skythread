<script lang="ts">
  import { sanitizeHTML } from '../utils.js';
  import { CodeMarkupParser, type Segment } from '../utils/code_markup_parser.js';

  let { text, renderCode = false }: { text: string, renderCode?: boolean } = $props();

  let parser = $derived(new CodeMarkupParser(text));
  let segments = $derived(renderCode ? parser.segments() : [parser.asSingleSegment()]);
  let highlighterLoaded = $state(window.Highlighter != null);

  $effect(() => {
    function onHighlighterLoaded() {
      highlighterLoaded = true;
    }

    window.addEventListener('highlighter-loaded', onHighlighterLoaded);
    return () => window.removeEventListener('highlighter-loaded', onHighlighterLoaded);
  });

  function codeBlockClass(segment: Segment): string {
    return segment.language ? `language-${segment.language}` : "";
  }

  function highlightCodeBlock(segment: Segment): CodeHighlightResult {
    if (segment.kind == 'codeBlock') {
      highlighterLoaded;

      return window.Highlighter?.highlightCodeBlock(segment.text, segment.language) ?? {
        kind: 'plain',
        text: segment.text
      };
    } else {
      return { kind: 'plain', text: segment.text };
    }
  }
</script>

{#each segments as segment}
  {#if segment.kind == 'text'}
    {@const lines = segment.text.split("\n")}

    {#each lines as line, i}
      {#if i > 0}<br>{/if}{line}
    {/each}
  {:else if segment.kind == 'inlineCode'}
    <code>{segment.text}</code>
  {:else}
    {@const result = highlightCodeBlock(segment)}

    {#if result.kind == 'highlighted'}
      <pre><code class={codeBlockClass(segment)}>{@html sanitizeHTML(result.html)}</code></pre>
    {:else}
      <pre><code>{result.text}</code></pre>
    {/if}
  {/if}
{/each}

<style>
  code {
    font-family: ui-monospace, "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.92em;
    background-color: rgba(0, 0, 0, 0.07);
    border-radius: 4px;
    padding: 1px 3px;
  }

  pre {
    overflow-x: auto;
    max-width: 100%;
    margin: 10px 0;
    padding: 8px 10px;
    border-radius: 6px;
    background-color: rgba(0, 0, 0, 0.07);
  }

  pre code {
    display: block;
    background-color: transparent;
    border-radius: 0;
    padding: 0;
    white-space: pre;
  }

  pre code :global(.hljs-keyword),
  pre code :global(.hljs-selector-tag),
  pre code :global(.hljs-title.function_) {
    color: #9d174d;
  }

  pre code :global(.hljs-built_in),
  pre code :global(.hljs-title.class_),
  pre code :global(.hljs-type) {
    color: #7c3aed;
  }

  pre code :global(.hljs-string),
  pre code :global(.hljs-attr),
  pre code :global(.hljs-symbol) {
    color: #047857;
  }

  pre code :global(.hljs-number),
  pre code :global(.hljs-literal) {
    color: #b45309;
  }

  pre code :global(.hljs-comment),
  pre code :global(.hljs-quote) {
    color: #6b7280;
    font-style: italic;
  }

  pre code :global(.hljs-meta),
  pre code :global(.hljs-tag),
  pre code :global(.hljs-name) {
    color: #0369a1;
  }

  @media (prefers-color-scheme: dark) {
    code {
      background-color: rgba(255, 255, 255, 0.12);
    }

    pre {
      background-color: rgba(255, 255, 255, 0.1);
    }

    pre code :global(.hljs-keyword),
    pre code :global(.hljs-selector-tag),
    pre code :global(.hljs-title.function_) {
      color: #f472b6;
    }

    pre code :global(.hljs-built_in),
    pre code :global(.hljs-title.class_),
    pre code :global(.hljs-type) {
      color: #c4b5fd;
    }

    pre code :global(.hljs-string),
    pre code :global(.hljs-attr),
    pre code :global(.hljs-symbol) {
      color: #6ee7b7;
    }

    pre code :global(.hljs-number),
    pre code :global(.hljs-literal) {
      color: #fbbf24;
    }

    pre code :global(.hljs-comment),
    pre code :global(.hljs-quote) {
      color: #9ca3af;
    }

    pre code :global(.hljs-meta),
    pre code :global(.hljs-tag),
    pre code :global(.hljs-name) {
      color: #7dd3fc;
    }
  }
</style>
