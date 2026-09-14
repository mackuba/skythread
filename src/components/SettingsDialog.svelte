<script lang="ts">
  import { settings } from '../models/settings.svelte.js';
  import DialogPanel from './DialogPanel.svelte';

  let { onClose = undefined }: { onClose?: () => void } = $props();
  let dateLocale = $state(settings.dateLocale ?? '');
  let blueskyHost = $state(settings.blueskyHost ?? '');
  let showInfohazards = $state(settings.biohazardsEnabled !== false);

  function updateDateLocale() {
    let value = dateLocale.trim();
    settings.dateLocale = value || undefined;
  }

  function updateBlueskyHost() {
    let value = blueskyHost.trim();
    settings.blueskyHost = value || undefined;
  }

  function updateShowInfohazards() {
    settings.biohazardsEnabled = showInfohazards;
  }

  function applyOnEnter(applyChanges: () => void) {
    return (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyChanges();
      }
    };
  }
</script>

<DialogPanel id="settings" {onClose}>
  <form method="get">
    <i class="close fa-circle-xmark fa-regular" onclick={onClose}></i>

    <h2>Settings</h2>

    <div class="setting">
      <label for="settings_date_locale">Locale:</label>
      <div>
        <input
          type="text"
          id="settings_date_locale"
          autofocus
          placeholder="E.g. &quot;fr-CA&quot;"
          bind:value={dateLocale}
          onchange={updateDateLocale}
          onkeydown={applyOnEnter(updateDateLocale)}>

        <small>Used for date and text formatting</small>
      </div>
    </div>

    <div class="setting">
      <label for="settings_bluesky_host">Bluesky app:</label>
      <div>
        <input
          type="text"
          id="settings_bluesky_host"
          placeholder="bsky.app"
          bind:value={blueskyHost}
          onchange={updateBlueskyHost}
          onkeydown={applyOnEnter(updateBlueskyHost)}>

        <small>Hostname to use in links</small>
      </div>
    </div>

    <div class="setting checkbox-setting">
      <span class="setting-label-spacer"></span>
      <div>
        <label for="settings_show_infohazards">
          <input
            type="checkbox"
            id="settings_show_infohazards"
            bind:checked={showInfohazards}
            onchange={updateShowInfohazards}>

          Show infohazards
        </label>

        <small>E.g. links to blocked or hidden replies</small>
      </div>
    </div>
  </form>
</DialogPanel>

<style>
  :global(.dialog) form {
    padding: 15px 25px 30px;
  }

  .setting {
    display: flex;
    align-items: baseline;
  }

  .setting + .setting {
    margin-top: 18px;
  }

  .setting > label,
  .setting-label-spacer {
    width: 90px;
    flex-shrink: 0;
    text-align: right;
    white-space: nowrap;
  }

  .checkbox-setting label {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-left: -4px;
    white-space: nowrap;
  }

  .checkbox-setting input {
    width: 14px;
    height: 14px;
    margin: 0;
  }

  .checkbox-setting small {
    margin-left: 15px;
  }

  small {
    display: block;
    color: #888;
    font-size: 9pt;
    margin: 4px 20px 0;
  }

  @media (prefers-color-scheme: dark) {
    small {
      color: #aaa;
    }
  }
</style>
