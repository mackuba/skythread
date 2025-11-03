<script>
  import { account } from '../models/account.svelte.js';

  let { onConfirm, onClose } = $props();

  function showBiohazard(e) {
    e.preventDefault();
    account.biohazardEnabled = true;

    if (onConfirm) {
      onConfirm();
    }

    onClose();
  }

  function hideBiohazard(e) {
    e.preventDefault();
    account.biohazardEnabled = false;

    for (let p of document.querySelectorAll('p.hidden-replies, .content > .post.blocked, .blocked > .load-post')) {
      p.style.display = 'none';
    }

    onClose();
  }
</script>

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
