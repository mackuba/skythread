<script module lang="ts">
  import BiohazardDialog from './BiohazardDialog.svelte';
  import LoginDialog from './LoginDialog.svelte';

  let loginDisplayed = $state(false);
  let loginWithClose = $state(false);

  let biohazardDisplayed = $state(false);
  let biohazardOnConfirm: (() => void) | undefined = $state(undefined);

  export function showLoginDialog(opts: { showClose: boolean }) {
    if (!loginDisplayed) {
      loginDisplayed = true;
      loginWithClose = opts.showClose;
    }
  }

  export function showBiohazardDialog(onConfirm?: () => void) {
    if (!biohazardDisplayed) {
      biohazardDisplayed = true;
      biohazardOnConfirm = onConfirm;
    }
  }
</script>

{#if loginDisplayed}
  <LoginDialog onClose={() => loginDisplayed = false} showClose={loginWithClose} />
{:else if biohazardDisplayed}
  <BiohazardDialog onClose={() => biohazardDisplayed = false} onConfirm={() => biohazardOnConfirm?.()} />
{/if}
