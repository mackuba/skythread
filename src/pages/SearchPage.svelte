<script lang="ts">
  let { children } = $props();
</script>

<div class="search-page">
  {@render children()}
</div>

<style>
  .search-page :global {
    input[type="submit"] {
      font-size: 12pt;
      margin: 5px 0px;
      padding: 5px 10px;
    }

    progress {
      width: 300px;
      margin-left: 10px;
      vertical-align: middle;
    }

    .search-query {
      font-size: 12pt;
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 5px 6px;
      margin-left: 8px;
    }

    .results {
      margin-top: 30px;
    }

    .results > .post {
      margin-left: -15px;
      padding-left: 15px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
      margin-top: 24px;
    }

    .results-end {
      font-size: 12pt;
      color: #333;
    }

    .post + .results-end {
      font-size: 11pt;
    }
  }

  @media (prefers-color-scheme: dark) {
    .search-page :global {
      .search-query {
        border: 1px solid #666;
      }

      .results-end {
        color: #888;
      }

      .results > .post {
        border-bottom: 1px solid #555;
      }
    }
  }
</style>
