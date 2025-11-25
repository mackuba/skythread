<script lang="ts">
  export type AutocompleteUser = {
    did: string;
    handle: string;
    avatar?: string;
    displayName?: string;
  }

  let { selectedUsers = $bindable([]) }: { selectedUsers: AutocompleteUser[] } = $props();

  let typedValue = $state('');
  let autocompleteResults: AutocompleteUser[] = $state([]);
  let autocompleteIndex = $state(-1);

  let selectedUserDIDs: string[] = $derived(selectedUsers.map(u => u.did));
  let autocompleteVisible = $derived(autocompleteResults.length > 0);
  let autocompleteVerticalOffset = $state(0);

  let autocompleteTimer: number | undefined;

  $effect(() => {
    let html = document.body.parentNode!
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

  function onKeyPress(e: KeyboardEvent) {
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

  async function fetchAutocomplete(query: string) {
    let users = await accountAPI.autocompleteUsers(query) as AutocompleteUser[];

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

  function moveAutocomplete(change: 1 | -1) {
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

  function selectAutocomplete(e: MouseEvent, index: number) {
    e.preventDefault();
    selectUser(index);
  }

  function selectUser(index: number) {
    let user = autocompleteResults[index];

    if (!user) {
      return;
    }

    selectedUsers.push(user);
    typedValue = '';
    hideAutocomplete();
  }

  function removeUser(e: MouseEvent, index: number) {
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

{#snippet userRow(user: AutocompleteUser)}
  <img class="avatar" alt="Avatar" src={user.avatar}>
  <span class="name">{user.displayName || '–'}</span>
  <span class="handle">{user.handle}</span>
{/snippet}
