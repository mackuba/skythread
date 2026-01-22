<script lang="ts">
  import { api } from '../api.js';

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
    let users = await api.autocompleteUsers(query) as AutocompleteUser[];

    let selectedDIDs = new Set(selectedUserDIDs);
    users = users.filter(u => !selectedDIDs.has(u.did));

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
    oninput={onTextInput}
    onkeydown={onKeyPress}
    bind:value={typedValue}
    bind:offsetHeight={autocompleteVerticalOffset}>

  {#if autocompleteVisible}
    <div class="autocomplete"
      style:display={autocompleteVisible ? 'block' : 'none'}
      style:top="{autocompleteVerticalOffset}px">

      {#each autocompleteResults as user, i (user.did)}
        <div class="user-row"
            class:highlighted={autocompleteIndex == i}
            onmouseenter={() => { autocompleteIndex = i }}
            onmousedown={(e) => { selectAutocomplete(e, i) }}>
          {@render userRow(user)}
        </div>
      {/each}
    </div>
  {/if}

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

<style>
  .user-choice {
    position: relative;
  }

  input {
    width: 260px;
    font-size: 11pt;
  }

  .autocomplete {
    position: absolute;
    left: 0;
    top: 0;
    margin-top: 4px;
    width: 350px;
    max-height: 250px;
    overflow-y: auto;
    background-color: white;
    border: 1px solid #ccc;
    z-index: 10;
  }

  .selected-users {
    width: 275px;
    height: 150px;
    overflow-y: auto;
    border: 1px solid #aaa;
    padding: 4px;
    margin-top: 20px;
  }

  .user-row {
    position: relative;
    padding: 2px 4px 2px 37px;
    cursor: pointer;
  }

  .user-row .avatar {
    position: absolute;
    left: 6px;
    top: 8px;
    width: 24px;
    border-radius: 12px;
  }

  .user-row span {
    display: block;
    overflow-x: hidden;
    text-overflow: ellipsis;
  }

  .user-row .name {
    font-size: 11pt;
    margin-top: 1px;
    margin-bottom: 1px;
  }

  .user-row .handle {
    font-size: 10pt;
    margin-bottom: 2px;
    color: #666;
  }

  .autocomplete .user-row {
    cursor: pointer;
  }

  .autocomplete .user-row.highlighted {
    background-color: hsl(207, 100%, 85%);
  }

  .selected-users .user-row span {
    padding-right: 14px;
  }

  .selected-users .user-row .remove {
    position: absolute;
    right: 4px;
    top: 11px;
    padding: 0px 4px;
    color: #333;
    line-height: 17px;
  }

  .selected-users .user-row .remove:hover {
    text-decoration: none;
    background-color: #ddd;
    border-radius: 8px;
  }

  @media (prefers-color-scheme: dark) {
    .autocomplete {
      background-color: hsl(210, 5%, 18%);
      border-color: #4b4b4b;
    }

    .selected-users {
      border-color: #666;
    }

    .user-row .handle {
      color: #888;
    }

    .autocomplete .user-row.highlighted {
      background-color: hsl(207, 90%, 25%);
    }

    .selected-users .user-row .remove {
      color: #aaa;
    }

    .selected-users .user-row .remove:hover {
      background-color: #555;
      color: #bbb;
    }
  }
</style>
