<script lang="ts">
  import { CodeMarkupParser } from '../utils/code_markup_parser.js';
  import CodeBlock from './CodeBlock.svelte';

  let { text, renderCode = false }: { text: string, renderCode?: boolean } = $props();

  let parser = $derived(new CodeMarkupParser(text));
  let segments = $derived(renderCode ? parser.segments() : [parser.asSingleSegment()]);
</script>

{#each segments as segment}
  {#if segment.kind == 'text'}
    {let lines = segment.text.split("\n")}

    {#each lines as line, i}
      {#if i > 0}<br>{/if}{line}
    {/each}
  {:else if segment.kind == 'inlineCode'}
    <code>{segment.text}</code>
  {:else}
    <CodeBlock text={segment.text} language={segment.language} />
  {/if}
{/each}

<style>
  code {
    font-family: ui-monospace, "Consolas", "Liberation Mono", "Menlo", monospace;
    font-size: 0.88em;
    background-color: rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 4px;
    padding: 1px 3px;
    margin-inline: 2px;
  }

  @media (prefers-color-scheme: dark) {
    code {
      background-color: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.1);
    }
  }
</style>
