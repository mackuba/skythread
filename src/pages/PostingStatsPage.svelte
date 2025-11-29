<script lang="ts">
  import UserAutocomplete, { type AutocompleteUser } from '../components/UserAutocomplete.svelte';
  import PostingStatsTable from '../components/PostingStatsTable.svelte';
  import { accountAPI } from '../api.js';
  import { PostingStats, type PostingStatsResult } from '../services/posting_stats.js';
  import { numberOfDays } from '../utils.js';

  const tabs = [
    { id: 'home',  title: 'Home timeline' },
    { id: 'list',  title: 'List feed' },
    { id: 'users', title: 'Selected users' },
    { id: 'you',   title: 'Your profile' }
  ]

  let lists: json[] = $state([]);

  let timeRangeDays = $state(7);
  let selectedTab = $state(tabs[0].id);
  let selectedUsers: AutocompleteUser[] = $state([]);
  let selectedList: string | undefined = $state();

  let scanInProgress = $state(false);
  let requestedDays: number | undefined = $state();
  let progress: number | undefined = $state();
  let scanInfo = $state();

  let tableOptions = $state({});
  let results: PostingStatsResult | null = $state(null);

  let scanner = new PostingStats((p) => { progress = Math.max(progress || 0, p) });

  $effect(() => {
    fetchLists();
  })

  function onTabChange(e: Event) {
    results = null;
  }

  async function fetchLists() {
    let result = await accountAPI.loadUserLists();

    lists = result.sort((a, b) => {
      let aName = a.name.toLocaleLowerCase();
      let bName = b.name.toLocaleLowerCase();

      return aName.localeCompare(bName);
    });

    selectedList = lists[0]?.uri;
  }

  function onsubmit(e: Event) {
    e.preventDefault();

    if (!scanInProgress) {
      startScan();
    } else {
      scanInProgress = false;
      scanner.stopScan();
    }
  }

  async function startScan() {
    if ((selectedTab == 'list' && !selectedList) || (selectedTab == 'users' && selectedUsers.length == 0)) {
      return;
    }

    scanInfo = undefined;
    results = null;
    requestedDays = timeRangeDays;
    progress = 0;
    scanInProgress = true;

    // TODO
    // let now = new Date().getTime();
    //
    // if (now - startTime < 100) {
    //   // artificial UI delay in case scan finishes immediately
    //   await new Promise(resolve => setTimeout(resolve, 100));
    // }

    if (selectedTab == 'home') {
      tableOptions = {};
      results = await scanner.scanHomeTimeline(requestedDays);
    } else if (selectedTab == 'list') {
      tableOptions = { showReposts: false };
      results = await scanner.scanListTimeline(selectedList!, requestedDays);
    } else if (selectedTab == 'users') {
      results = await scanner.scanUserTimelines(selectedUsers, requestedDays);
      tableOptions = { showTotal: false, showPercentages: false };
    } else if (selectedTab == 'you') {
      results = await scanner.scanYourTimeline(requestedDays);
      tableOptions = { showTotal: false, showPercentages: false };
    }

    scanInProgress = false;
  }
</script>

<h2>Bluesky posting statistics</h2>

<form {onsubmit}>
  <p>
    Scan posts from:

    {#each tabs as tab}
      <input type="radio" name="scan_type" id="scan_type_{tab.id}" value="{tab.id}" bind:group={selectedTab} onclick={onTabChange}>
      <label for="scan_type_{tab.id}">{tab.title}</label>
    {/each}
  </p>

  <p>
    Time range: <input id="posting_stats_range" type="range" min="1" max="60" bind:value={timeRangeDays}>
    <label for="posting_stats_range">{numberOfDays(timeRangeDays)}</label>
  </p>

  {#if selectedTab == 'list'}
    <p class="list-choice">
      <label for="posting_stats_list">Select list:</label>
      <select id="posting_stats_list" name="scan_list" bind:value={selectedList}>
        {#each lists as list}
          <option value={list.uri}>{list.name} </option>
        {/each}
      </select>
    </p>
  {/if}

  {#if selectedTab == 'users'}
    <UserAutocomplete bind:selectedUsers />
  {/if}

  <p>
    <input type="submit" value="{!scanInProgress ? 'Start scan' : 'Cancel'}">

    {#if scanInProgress}
      <progress max={requestedDays} value={progress}></progress>
    {/if}
  </p>
</form>

{#if scanInfo}
  <p class="scan-info">{scanInfo}</p>
{/if}

{#if results}
  <PostingStatsTable {...tableOptions} {...results} />
{/if}
