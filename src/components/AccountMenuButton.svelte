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

<style>
  li .button {
    display: inline-block;
    color: #333;
    font-size: 11pt;
    border: 1px solid #bbb;
    padding: 3px 5px;
    margin-top: 8px;
    border-radius: 5px;
    background-color: hsla(210, 100%, 4%, 0.12);
  }

  li .button:hover {
    background-color: hsla(210, 100%, 4%, 0.2);
    text-decoration: none;
  }

  @media (prefers-color-scheme: dark) {
    li .button {
      color: #333;
      border-color: #bbb;
      background-color: hsla(210, 100%, 4%, 0.12);
    }

    li .button:hover {
      background-color: hsla(210, 100%, 4%, 0.2);
    }
  }
</style>
