<script lang="ts">
  import { getContext } from 'svelte';
  import { BasePost, Post, MissingPost } from '../../models/posts.js';
  import { InlineRecordEmbed, InlineRecordWithMediaEmbed } from '../../models/embeds.js';
  import { ATProtoRecord, FeedGeneratorRecord, StarterPackRecord, UserListRecord } from '../../models/records.js';
  import { atURI } from '../../utils.js';

  import FeedGeneratorView from '../embeds/FeedGeneratorView.svelte';
  import PostComponent from '../posts/PostComponent.svelte';
  import StarterPackView from '../embeds/StarterPackView.svelte';
  import UserListView from '../embeds/UserListView.svelte';

  let { post }: { post: Post } = getContext('post');
  let { record }: { record: ATProtoRecord } = $props();

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
      let newEmbed = reloadedPost && reloadedPost.embed;

      if (newEmbed && (newEmbed instanceof InlineRecordEmbed || newEmbed instanceof InlineRecordWithMediaEmbed)) {
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
  {:catch error}
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
      <PostComponent post={record} context="quote" />
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
