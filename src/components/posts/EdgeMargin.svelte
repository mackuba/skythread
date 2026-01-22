<script lang="ts">
  let { collapsed = $bindable(false) }: { collapsed: boolean } = $props();

  function toggleFold() {
    collapsed = !collapsed;
  }
</script>

<div class="margin">
  <div class="edge" onclick={toggleFold}>
    <div class="line"></div>
  </div>

  <img class="plus" alt="{collapsed ? '+' : '-'}" src="icons/{collapsed ? 'add-square.png' : 'subtract-square.png'}" onclick={toggleFold}>
</div>

<style>
  .edge {
    position: absolute;
    left: -2px;
    top: 30px;
    bottom: 0px;
    width: 6px;
  }

  .line {
    position: absolute;
    left: 2px;
    top: 0px;
    bottom: 0px;
    border-left: 1px solid #aaa;
  }

  .edge:hover .line {
    border-left: 2px solid #888;
  }

  .plus {
    position: absolute;
    top: 8px;
    left: -6px;
    width: 14px;
  }

  :global(.post.collapsed) .line {
    display: none;
  }

  :global(.post.flat) > .margin {
    display: none;
  }

  @media (prefers-color-scheme: dark) {
    .line { border-left-color: #666; }
    .edge:hover .line { border-left-color: #888; }
    .plus { filter: invert(); }
  }
</style>
