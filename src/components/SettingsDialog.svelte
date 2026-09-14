<script lang="ts">
  import { settings } from '../models/settings.svelte.js';
  import DialogPanel from './DialogPanel.svelte';

  let { onClose = undefined }: { onClose?: () => void } = $props();
  let dateLocale = $state(settings.dateLocale ?? '');

  function updateDateLocale() {
    const value = dateLocale.trim();
    settings.dateLocale = value || undefined;
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
          onkeydown={applyOnEnter(updateDateLocale)}
        >
        <small>Used for date and text formatting</small>
      </div>
    </div>
  </form>
</DialogPanel>

<style>
  .setting {
    display: flex;
    align-items: baseline;
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
