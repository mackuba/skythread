<script lang="ts">
  let { children, onClose = undefined }: { children: any, onClose?: () => void } = $props();

  function onclick(e: Event) {
    // close the dialog (if it's closable) on click on the overlay, but not on anything inside
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }
</script>

<div class="dialog" {onclick}>
  {@render children()}
</div>
