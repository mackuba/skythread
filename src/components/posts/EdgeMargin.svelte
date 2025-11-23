<script>
  let { collapsed = $bindable(false), onToggle = undefined } = $props();

  function toggleFold() {
    collapsed = !collapsed;
    onToggle && onToggle(collapsed);
  }
</script>

<div class="margin">
  <div class="edge" onclick={toggleFold}>
    <div class="line"></div>
  </div>

  <img class="plus" alt="{collapsed ? '+' : '-'}" src="icons/{collapsed ? 'add-square.png' : 'subtract-square.png'}" onclick={toggleFold}>
</div>
