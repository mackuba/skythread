<script>
  import { submitLogin } from '../skythread.js';

  let { onClose } = $props();

  let identifier = $state();
  let password = $state();
  let loginInfoVisible = $state(false);
  let submitting = $state(false);
  let loginField, passwordField;

  $effect(() => {
    loginField.focus();
  });

  /** @param {Event} e */
  function toggleLoginInfo(e) {
    e.preventDefault();
    loginInfoVisible = !loginInfoVisible;
  }

  /** @param {Event} e, @returns {Promise<void>} */
  async function onsubmit(e) {
    e.preventDefault();
    submitting = true;

    loginField.blur();
    passwordField.blur();

    try {
      await submitLogin(identifier.trim(), password.trim());
    } catch (error) {
      submitting = false;
      showError(error);
    }
  }

  /** @param {Error} error */
  function showError(error) {
    console.log(error);

    if (error.code == 401 && error.json.error == 'AuthFactorTokenRequired') {
      alert(`Please log in using an "app password" if you have 2FA enabled.`);
    } else {
      window.setTimeout(() => alert(error), 10);
    }
  }
</script>

<form method="get" {onsubmit}>
  {#if onClose}
    <i class="close fa-circle-xmark fa-regular" onclick={onClose}></i>
  {/if}

  <h2>🌤 Skythread</h2>

  <p><input type="text" id="login_handle" required placeholder="name.bsky.social" bind:value={identifier} bind:this={loginField}></p>
  <p><input type="password" id="login_password" required
       placeholder="&#x2731;&#x2731;&#x2731;&#x2731;&#x2731;&#x2731;&#x2731;&#x2731;" bind:value={password} bind:this={passwordField}></p>

  <p class="info">
    <a href="#" onclick={toggleLoginInfo}><i class="fa-regular fa-circle-question"></i> Use an "app password" here</a>
  </p>

  {#if loginInfoVisible}
    <div class="info-box">
      <p>Bluesky API currently doesn't allow apps to request fine-grained permissions, only access to the whole account. However, you can generate an "app password" in the Bluesky app settings for this specific app that you can later revoke at any time.</p>
      <p>The password you enter here is only passed to the Bluesky API and isn't saved anywhere. The returned access token is only stored in your browser's local storage. You can see the complete source code of this app <a href="http://github.com/mackuba/skythread" target="_blank">on GitHub</a>.</p>
    </div>
  {/if}

  <p class="submit">
    {#if !submitting}
      <input id="login_submit" type="submit" value="Log in">
    {:else}
      <i id="cloudy" class="fa-solid fa-cloud fa-beat fa-xl"></i>
    {/if}
  </p>
</form>
