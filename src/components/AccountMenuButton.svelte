<script lang="ts">
  type Props = {
    title?: string,
    label: string,
    showCheckmark?: boolean,
    onclick: (e: Event) => void
  }

  let { title = undefined, label, showCheckmark = false, onclick }: Props = $props();
</script>

<li><a class="button" href="#" {onclick} {title}>
  {#if showCheckmark} <span class="check">✓</span> {/if} {label}
</a></li>
