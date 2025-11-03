<script>
  let { title, label, showCheckmark, onclick } = $props();
</script>

<li><a class="button" href="#" {onclick} {title}>
  {#if showCheckmark} <span class="check">✓</span> {/if} {label}
</a></li>
