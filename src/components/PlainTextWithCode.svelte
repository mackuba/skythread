<script lang="ts">
  import { CodeMarkupParser } from '../utils/code_markup_parser.js';

  let { text, renderCode = false }: { text: string, renderCode?: boolean } = $props();

  let parser = $derived(new CodeMarkupParser(text));
  let segments = $derived(renderCode ? parser.segments() : [parser.asSingleSegment()]);
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
    <pre><code class={segment.language ? `language-${segment.language}` : undefined}>{segment.text}</code></pre>
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

  @media (prefers-color-scheme: dark) {
    code {
      background-color: rgba(255, 255, 255, 0.12);
    }

    pre {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
</style>
