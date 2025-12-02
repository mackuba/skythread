<script lang="ts">
  import { settings } from '../models/settings.svelte.js';
  import DialogPanel from './DialogPanel.svelte';

  type Props = {
    onConfirm?: () => void;
    onReject?: () => void;
    onClose?: () => void;
  }

  let { onConfirm = undefined, onReject = undefined, onClose = undefined }: Props = $props();

  function showBiohazard(e: Event) {
    e.preventDefault();
    settings.biohazardsEnabled = true;

    onConfirm?.()
    onClose?.();
  }

  function hideBiohazard(e: Event) {
    e.preventDefault();
    settings.biohazardsEnabled = false;

    onReject?.();
    onClose?.();
  }
</script>

<DialogPanel onClose={() => onClose?.()}>
  <form method="get">
    <i class="close fa-circle-xmark fa-regular" onclick={onClose}></i>
    <h2>☣️ Infohazard Warning</h2>

    <p>&ldquo;<em>This thread is not a place of honor... no highly esteemed post is commemorated here... nothing valued is here.</em>&rdquo;</p>
    <p>This feature allows access to comments in a thread which were hidden because one of the commenters has blocked another. Bluesky currently hides such comments to avoid escalating conflicts.</p>
    <p>Are you sure you want to enter?<br>(You can toggle this in the menu in top-left corner.)</p>

    <p class="submit">
      <input type="submit" value="Show me the drama 😈" onclick={showBiohazard}>
      <input type="submit" value="Nope, I'd rather not 🙈" onclick={hideBiohazard}>
    </p>
  </form>
</DialogPanel>

<style>
  form {
    width: 400px;
  }

  p.submit {
    margin-top: 40px;
    margin-bottom: 20px;
  }

  input[type="submit"] {
    width: 180px;
    margin-left: 5px;
    margin-right: 5px;
  }
</style>
