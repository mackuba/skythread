<script lang="ts">
  import { Post } from '../models/posts';
  import { Lycan } from '../services/lycan';
  import PostComponent from '../components/posts/PostComponent.svelte';

  const collections = [
    { id: 'likes',   title: 'Likes' },
    { id: 'reposts', title: 'Reposts' },
    { id: 'quotes',  title: 'Quotes' },
    { id: 'pins',    title: 'Pins' }
  ]

  let { lycan }: { lycan: Lycan } = $props();

  let isCheckingStatus = $state(false);
  let importStatus: string | undefined = $state();
  let importStatusLabel: string | undefined = $state();
  let importProgress = $state(0);
  let wasImporting = $state(false);
  let importTimer: number | undefined;

  let selectedCollection = $state(collections[0].id);
  let query = $state('');

  let loadingPosts = $state(false);
  let finishedPosts = $state(false);
  let results: Post[] = $state([]);
  let highlightedMatches: string[] = $state([]);

  checkImportStatus();


  function onFormSubmit(e: Event) {
    e.preventDefault();

    showImportStatus({ status: 'requested' });
    wasImporting = true;

    lycan.startImport().catch((error) => {
      console.error('Failed to start Lycan import', error);
      showImportError(`Import failed: ${error}`);
    });
  }

  function onKeyPress(e: KeyboardEvent) {
    if (e.key == 'Enter') {
      e.preventDefault();

      let q = query.trim().toLowerCase();

      if (q.length == 0 || importStatus != 'finished') {
        return;
      }

      results = [];
      wasImporting = false;
      loadingPosts = true;
      finishedPosts = false;

      lycan.searchPosts(selectedCollection, q, {
        onPostsLoaded: ({ posts, terms }) => {
          loadingPosts = false;
          results.splice(results.length, 0, ...posts);
          highlightedMatches = terms;
        },
        onFinish: () => {
          finishedPosts = true;
        }
      });
    }
  }

  async function checkImportStatus() {
    if (isCheckingStatus) {
      return;
    }

    isCheckingStatus = true;

    try {
      let response = await lycan.getImportStatus();
      showImportStatus(response);
    } catch (error) {
      showImportError(`Couldn't check import status: ${error}`);
    } finally {
      isCheckingStatus = false;
    }
  }

  function showImportStatus(info: json) {
    console.log(info);

    if (!info.status) {
      showImportError("Error checking import status");
      return;
    }

    importStatus = info.status;

    let isImporting = ['in_progress', 'scheduled', 'requested'].includes(info.status);
    wasImporting = wasImporting || isImporting;

    if (info.status == 'not_started') {
      // do nothing
    } else if (isImporting) {
      showImportProgress(info);
    } else if (info.status == 'finished') {
      showImportProgress({ status: 'finished', progress: 1.0 });
    } else {
      showImportError("Error checking import status");
    }

    isImporting ? startImportTimer() : stopImportTimer();
  }

  function showImportProgress(info: json) {
    importProgress = Math.max(0, Math.min(info.progress || 0, 1));

    if (info.progress == 1.0) {
      importStatusLabel = `Import complete ✓`;
    } else if (info.position) {
      let date = new Date(info.position).toLocaleString(window.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
      importStatusLabel = `Downloaded data until: ${date}`;
    } else if (info.status == 'requested') {
      importStatusLabel = 'Requesting import…';
    } else {
      importStatusLabel = 'Import started…';
    }
  }

  function showImportError(message: string) {
    importStatus = 'error';
    wasImporting = true;
    importStatusLabel = message;
    stopImportTimer();
  }

  function startImportTimer() {
    if (!importTimer) {
      importTimer = setInterval(checkImportStatus, 3000);
    }
  }

  function stopImportTimer() {
    if (importTimer) {
      clearInterval(importTimer);
      importTimer = undefined;
    }
  }
</script>

<h2>Archive search</h2>

<form class="search-form">
  <p class="search">
    Search:
    <input type="text" class="search-query" autocomplete="off"
      disabled={importStatus != 'finished'} onkeydown={onKeyPress} bind:value={query}>
  </p>

  <div class="search-collections">
    {#each collections as col}
      <input type="radio" name="collection" value={col.id} id="collection-{col.id}" bind:group={selectedCollection}>
      <label for="collection-{col.id}">{col.title}</label>
    {/each}
  </div>
</form>

{#if wasImporting || importStatus == 'not_started'}
  <div class="lycan-import">
    {#if importStatus == 'not_started'}
      <form onsubmit={onFormSubmit}>
        <h4>Data not imported yet</h4>

        <p>
          In order to search within your likes and bookmarks, the posts you've liked or saved need to be imported into a database.
          This is a one-time process, but it can take several minutes or more, depending on the age of your account.
        </p>
        <p>
          To start the import, press the button below. You can then wait until it finishes, or close this tab and come back a bit later.
          After the import is complete, the database will be kept up to date automatically going forward.
        </p>
        <p>
          <input type="submit" value="Start import">
        </p>
      </form>
    {:else}
      <div class="import-progress">
        <h4>Import in progress</h4>

        <p class="import-status">{importStatusLabel}</p>

        {#if importStatus != 'error'}
          <p>
            <progress value={importProgress}></progress>
            <output>{Math.round(importProgress * 100)}%</output>
          </p>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<div class="results">
  {#if loadingPosts}
    <p>...</p>
  {:else}
    {#each results as post}
      <PostComponent {post} context="feed" {highlightedMatches} />
    {/each}
    {#if finishedPosts}
      <p class="results-end">{results.length > 0 ? "No more results." : "No results."}</p>
    {/if}
  {/if}
</div>
