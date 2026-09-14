<script module lang="ts">
  import BiohazardDialog from './BiohazardDialog.svelte';
  import LoginDialog from './LoginDialog.svelte';
  import SettingsDialog from './SettingsDialog.svelte';

  let loginDisplayed = $state(false);
  let loginWithClose = $state(false);

  let biohazardDisplayed = $state(false);
  let biohazardOnConfirm: (() => void) | undefined = $state(undefined);

  let settingsDisplayed = $state(false);

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

  export function showSettingsDialog() {
    settingsDisplayed = true;
  }
</script>

{#if loginDisplayed}
  <LoginDialog onClose={() => loginDisplayed = false} showClose={loginWithClose} />
{:else if settingsDisplayed}
  <SettingsDialog onClose={() => settingsDisplayed = false} />
{:else if biohazardDisplayed}
  <BiohazardDialog onClose={() => biohazardDisplayed = false} onConfirm={() => biohazardOnConfirm?.()} />
{/if}
