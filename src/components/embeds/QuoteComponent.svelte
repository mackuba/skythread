<script lang="ts">
  import { api, blueAPI } from '../../api.js';
  import { getPostContext } from '../posts/PostComponent.svelte';
  import { BasePost, Post, MissingPost } from '../../models/posts.js';
  import { InlineRecordEmbed, InlineRecordWithMediaEmbed } from '../../models/embeds.js';
  import { ATProtoRecord, FeedGeneratorRecord, StarterPackRecord, UserListRecord } from '../../models/records.js';
  import { linkToQuotesPage } from '../../router.js';
  import { atURI, pluralize } from '../../utils.js';

  import FeedGeneratorView from '../embeds/FeedGeneratorView.svelte';
  import PostWrapper from '../posts/PostWrapper.svelte';
  import StarterPackView from '../embeds/StarterPackView.svelte';
  import UserListView from '../embeds/UserListView.svelte';

  let { record }: { record: ATProtoRecord } = $props();
  let { post, placement } = getPostContext();

  async function loadDeletedPostQuoteCount(post: MissingPost): Promise<number | undefined> {
    try {
      return await blueAPI.getQuoteCount(post.uri);
    } catch (error) {
      console.warn("Couldn't load quote count: " + error);
      return undefined;
    }
  }

  async function loadQuotedRecord(): Promise<ATProtoRecord> {
    let { collection } = atURI(record.uri);

    if (collection == 'app.bsky.feed.post') {
      let reloaded = await api.loadPostIfExists(record.uri);

      if (reloaded) {
        return new Post(reloaded);
      } else {
        return new MissingPost(record.data);
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

      {#if record instanceof MissingPost && record.isBskyPost && placement != 'quote' && placement != 'quotes'}
        {#await loadDeletedPostQuoteCount(record) then quoteCount}
          {#if quoteCount && quoteCount > 0}
            <p class="deleted-post-quotes">
              <i class="fa-regular fa-comments"></i>
              <a href={linkToQuotesPage(record.uri)}>{pluralize(quoteCount, 'quote')}</a>
            </p>
          {/if}
        {/await}
      {/if}
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

  .deleted-post-quotes {
    margin: 0 16px 15px;
    font-size: 10pt;
    color: #666;
  }

  .deleted-post-quotes a {
    color: #666;
    text-decoration: none;
  }

  .deleted-post-quotes a:hover {
    text-decoration: underline;
  }

  .deleted-post-quotes i {
    font-size: 9pt;
    color: #888;
    margin-right: 1px;
  }

  @media (prefers-color-scheme: dark) {
    .quote-embed {
      background-color: #303030;
      border-color: #606060;
    }

    .deleted-post-quotes, .deleted-post-quotes a {
      color: #aaa;
    }
  }
</style>
