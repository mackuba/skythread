<script lang="ts">
  import { api } from '../../api.js';
  import { getPostContext } from '../posts/PostComponent.svelte';
  import { BasePost, Post, MissingPost } from '../../models/posts.js';
  import { InlineRecordEmbed, InlineRecordWithMediaEmbed } from '../../models/embeds.js';
  import { ATProtoRecord, FeedGeneratorRecord, StarterPackRecord, UserListRecord } from '../../models/records.js';
  import { atURI } from '../../utils.js';

  import FeedGeneratorView from '../embeds/FeedGeneratorView.svelte';
  import PostWrapper from '../posts/PostWrapper.svelte';
  import StarterPackView from '../embeds/StarterPackView.svelte';
  import UserListView from '../embeds/UserListView.svelte';

  let { record }: { record: ATProtoRecord } = $props();
  let { post } = getPostContext();

  async function loadQuotedRecord(): Promise<ATProtoRecord> {
    let { collection } = atURI(record.uri);

    if (collection == 'app.bsky.feed.post') {
      let reloaded = await api.loadPostIfExists(record.uri);

      if (reloaded) {
        return new Post(reloaded);
      } else {
        return new MissingPost(post.data);
      }
    } else {
      let reloadedPost = await api.loadPostIfExists(post.uri).then(x => x && new Post(x));
      let newEmbed = reloadedPost?.embed;

      if (newEmbed instanceof InlineRecordEmbed || newEmbed instanceof InlineRecordWithMediaEmbed) {
        return newEmbed.record;
      } else {
        return new MissingPost(record);
      }
    }
  }
</script>

{#if record.constructor === ATProtoRecord && !record.type}
  {#await loadQuotedRecord()}
    <div class="quote-embed">
      <p class="post placeholder">Loading quoted post...</p>
    </div>
  {:then record}
    {@render quoteContent(record)}
  {:catch}
    <div class="quote-embed">
      <p class="post placeholder">Error loading quoted post</p>
    </div>
  {/await}
{:else}
  {@render quoteContent(record)}
{/if}

{#snippet quoteContent(record: ATProtoRecord)}
  {#if record instanceof BasePost}
    <div class="quote-embed">
      <PostWrapper post={record} placement="quote" />
    </div>

  {:else if record instanceof FeedGeneratorRecord}
    <FeedGeneratorView feed={record} />

  {:else if record instanceof StarterPackRecord}
    <StarterPackView starterPack={record} />

  {:else if record instanceof UserListRecord}
    <UserListView list={record} />

  {:else}
    <div class="quote-embed">
      <p>[{record.type}]</p>
    </div>
  {/if}
{/snippet}

<style>
  .quote-embed {
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #fbfcfd;
    margin-top: 25px;
    margin-bottom: 15px;
    margin-left: 0px;
    max-width: 800px;
  }

  .quote-embed :global(.post) {
    margin-top: 16px;
    padding-left: 16px;
    padding-right: 16px;
    padding-bottom: 5px;
  }

  .placeholder {
    font-style: italic;
    font-size: 11pt;
    color: #888;
  }

  @media (prefers-color-scheme: dark) {
    .quote-embed {
      background-color: #303030;
      border-color: #606060;
    }
  }
</style>
