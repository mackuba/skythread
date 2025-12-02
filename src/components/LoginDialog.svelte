<script lang="ts">
  import { APIError } from '../api.js';
  import { account } from '../models/account.svelte.js';
  import DialogPanel from './DialogPanel.svelte';

  type Props = {
    onLogin?: () => void;
    onClose?: () => void;
    showClose: boolean;
  }

  let { onClose = undefined, onLogin = undefined, showClose }: Props = $props();

  let identifier: string = $state('');
  let password: string = $state('');
  let loginInfoVisible = $state(false);
  let submitting = $state(false);
  let loginField: HTMLInputElement;
  let passwordField: HTMLInputElement;

  function onOverlayClick() {
    if (showClose && onClose) {
      onClose();
    }
  }

  function toggleLoginInfo(e: Event) {
    e.preventDefault();
    loginInfoVisible = !loginInfoVisible;
  }

  async function onsubmit(e: Event) {
    e.preventDefault();
    submitting = true;

    loginField.blur();
    passwordField.blur();

    try {
      await account.logIn(identifier.trim(), password.trim());
      onLogin?.();
      onClose?.();
    } catch (error) {
      submitting = false;
      showError(error);
    }
  }

  function showError(error: Error) {
    console.log(error);

    if (error instanceof APIError && error.code == 401 && error.json.error == 'AuthFactorTokenRequired') {
      alert(`Please log in using an "app password" if you have 2FA enabled.`);
    } else {
      window.setTimeout(() => alert(error), 10);
    }
  }
</script>

<DialogPanel id="login" class={loginInfoVisible ? 'expanded' : ''} onClose={onOverlayClick}>
  <form method="get" {onsubmit}>
    {#if showClose}
      <i class="close fa-circle-xmark fa-regular" onclick={onClose}></i>
    {/if}

    <h2>🌤 Skythread</h2>

    <p><input type="text" id="login_handle" required autofocus placeholder="name.bsky.social"
          bind:value={identifier} bind:this={loginField}></p>

    <p><input type="password" id="login_password" required
          placeholder="&#x2731;&#x2731;&#x2731;&#x2731;&#x2731;&#x2731;&#x2731;&#x2731;"
          bind:value={password} bind:this={passwordField}></p>

    <p class="info">
      <a href="#" onclick={toggleLoginInfo}><i class="fa-regular fa-circle-question"></i> Use an "app password" here</a>
    </p>

    {#if loginInfoVisible}
      <div class="info-box">
        <p>Skythread doesn't support OAuth yet. For now, you need to use an "app password" here, which you can generate in the Bluesky app settings.</p>
        <p>The password you enter here is only passed to the Bluesky API (PDS) and isn't saved anywhere. The returned access token is only stored in your browser's local storage. You can see the complete source code of this app <a href="http://tangled.org/@mackuba.eu/skythread" target="_blank">on Tangled</a>.</p>
      </div>
    {/if}

    <p class="submit">
      {#if !submitting}
        <input type="submit" value="Log in">
      {:else}
        <i class="cloudy fa-solid fa-cloud fa-beat fa-xl"></i>
      {/if}
    </p>
  </form>
</DialogPanel>

<style>
  p.info {
    font-size: 9pt;
  }

  p.info a {
    color: #666;
  }

  .cloudy {
    color: hsl(210, 60%, 75%);
    margin: 14px 0px;
  }

  .info-box {
    border: 1px solid hsl(45, 100%, 60%);
    background-color: hsl(50, 100%, 96%);
    width: 360px;
    font-size: 11pt;
    border-radius: 6px;
  }

  .info-box p {
    margin: 15px 15px;
    text-align: left;
  }

  @media (prefers-color-scheme: dark) {
    :global(#login) {
      background-color: rgba(240, 240, 240, 0.15);
    }

    form {
      border-color: hsl(210, 20%, 40%);
      background-color: hsl(210, 12%, 25%);
    }

    .close {
      color: hsl(210, 20%, 50%);
      opacity: 0.6;
    }

    .close:hover {
      color: hsl(210, 20%, 50%);
      opacity: 1.0;
    }

    p.info a {
      color: #888;
    }

    input[type="text"], input[type="password"] {
      border-color: #666;
    }

    input[type="submit"] {
      border-color: hsl(210, 15%, 40%);
      background-color: hsl(210, 12%, 35%);
    }

    input[type="submit"]:active {
      border-color: hsl(210, 15%, 35%);
      background-color: hsl(210, 12%, 30%);
    }

    .cloudy {
      color: hsl(210, 60%, 75%);
    }

    .info-box {
      border-color: hsl(45, 100%, 45%);
      background-color: hsl(50, 40%, 30%);
    }

    .info-box a {
      color: hsl(45, 100%, 50%);
    }
  }
</style>
