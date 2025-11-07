<script>
  let { selectedUsers = $bindable([]) } = $props();

  let typedValue = $state('');
  let autocompleteResults = $state([]);
  let autocompleteIndex = $state();

  let selectedUserDIDs = $derived(selectedUsers.map(u => u.did));
  let autocompleteVisible = $derived(autocompleteResults.length > 0);
  let autocompleteVerticalOffset = $state();
  let autocompleteScroll = $state(0);

  /** @type {number | undefined} */
  let autocompleteTimer;

  $effect(() => {
    let html = /** @type {Element} */ (document.body.parentNode);
    html.addEventListener('click', hideAutocomplete);

    return () => {
      html.removeEventListener('click', hideAutocomplete);
    };
  });

  function onTextInput() {
    if (autocompleteTimer) {
      clearTimeout(autocompleteTimer);
    }

    let query = typedValue.trim();

    if (query.length > 0) {
      autocompleteTimer = setTimeout(() => fetchAutocomplete(query), 100);
    } else {
      hideAutocomplete();
      autocompleteTimer = undefined;
    }
  }

  /** @param {KeyboardEvent} e */

  function onKeyPress(e) {
    if (e.key == 'Enter') {
      e.preventDefault();

      if (autocompleteIndex >= 0) {
        selectUser(autocompleteIndex);
      }
    } else if (e.key == 'Escape') {
      hideAutocomplete();
    } else if (e.key == 'ArrowDown' && autocompleteResults.length > 0) {
      e.preventDefault();
      moveAutocomplete(+1);
    } else if (e.key == 'ArrowUp' && autocompleteResults.length > 0) {
      e.preventDefault();
      moveAutocomplete(-1);
    }
  }

  /** @param {string} query, @returns {Promise<void>} */

  async function fetchAutocomplete(query) {
    let users = await accountAPI.autocompleteUsers(query);

    let selectedDIDs = new Set(selectedUserDIDs);
    users = users.filter(u => !selectedDIDs.has(u.did));

    // TODO this.autocomplete.scrollTop = 0;

    if (users.length > 0) {
      autocompleteResults = users;
      autocompleteIndex = 0;
    } else {
      hideAutocomplete();
    }
  }

  function hideAutocomplete() {
    autocompleteResults = [];
    autocompleteIndex = -1;
  }

  /** @param {1|-1} change */

  function moveAutocomplete(change) {
    if (autocompleteResults.length == 0) {
      return;
    }

    let newIndex = autocompleteIndex + change;

    if (newIndex < 0) {
      newIndex = autocompleteResults.length - 1;
    } else if (newIndex >= autocompleteResults.length) {
      newIndex = 0;
    }

    autocompleteIndex = newIndex;
  }

  /** @param {MouseEvent} e, @param {number} index */

  function selectAutocomplete(e, index) {
    e.preventDefault();
    selectUser(index);
  }

  /** @param {number} index */

  function selectUser(index) {
    let user = autocompleteResults[index];

    if (!user) {
      return;
    }

    selectedUsers.push(user);
    typedValue = '';
    hideAutocomplete();
  }

  /** @param {MouseEvent} e, @param {number} index */

  function removeUser(e, index) {
    e.preventDefault();
    selectedUsers.splice(index, 1);
  }
</script>

<div class="user-choice">
  <input type="text" placeholder="Add user" autocomplete="off" autofocus
    oninput={onTextInput} onkeydown={onKeyPress} bind:value={typedValue} bind:offsetHeight={autocompleteVerticalOffset}>

  <div class="autocomplete"
    style="display: {autocompleteVisible ? 'block' : 'none'}; top: {autocompleteVerticalOffset}px;">

    {#each autocompleteResults as user, i (user.did)}
      <div class="user-row {autocompleteIndex == i ? 'highlighted' : ''}"
           onmouseenter={(e) => { autocompleteIndex = i }}
           onmousedown={(e) => { selectAutocomplete(e, i) }}>
        {@render userRow(user)}
      </div>
    {/each}
  </div>

  <div class="selected-users">
    {#each selectedUsers as user, i (user.did)}
      <div class="user-row">
        {@render userRow(user)}
        <a class="remove" href="#" onclick={(e) => { removeUser(e, i) }}>✕</a>
      </div>
    {/each}
  </div>
</div>

{#snippet userRow(user)}
  <img class="avatar" alt="Avatar" src={user.avatar}>
  <span class="name">{user.displayName || '–'}</span>
  <span class="handle">{user.handle}</span>
{/snippet}
