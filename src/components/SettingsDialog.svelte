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

    <p>
      <label for="settings_date_locale">Locale:</label>
      <input
        type="text"
        id="settings_date_locale"
        autofocus
        bind:value={dateLocale}
        onchange={updateDateLocale}
        onkeydown={applyOnEnter(updateDateLocale)}
      >
    </p>
  </form>
</DialogPanel>
