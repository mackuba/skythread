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
