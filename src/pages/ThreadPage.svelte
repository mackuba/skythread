<script lang="ts">
  import { Post, parseThreadPost } from '../models/posts.js';
  import { showError } from '../utils.js';
  import MainLoader from '../components/MainLoader.svelte';
  import PostComponent from '../components/posts/PostComponent.svelte';
  import ThreadRootParent from '../components/posts/ThreadRootParent.svelte';
  import ThreadRootParentRaw from '../components/posts/ThreadRootParentRaw.svelte';

  type Props = { url: string } | { author: string, rkey: string };

  let props: Props = $props();
  let post: AnyPost | undefined = $state();
  let loadingFailed = $state(false);

  let rootComponent: PostComponent;
  let response: Promise<json>;

  if ('url' in props) {
    let { url } = props;

    if (url.startsWith('at://')) {
      response = api.loadThreadByAtURI(url);
    } else {
      response = api.loadThreadByURL(url);
    }
  } else {
    let { author, rkey } = props;

    response = api.loadThreadById(author, rkey);
  }

  response.then((json) => {
    let root = parseThreadPost(json.thread);
    window.root = root;
    window.subtreeRoot = root;

    if (root instanceof Post) {
      root.data.quoteCount = undefined;

      blueAPI.getQuoteCount(root.uri).then(count => {
        rootComponent.setQuoteCount(count);
      }).catch(error => {
        console.warn("Couldn't load quote count: " + error);
      });
    }

    post = root;
  }).catch((error) => {
    showError(error);
    loadingFailed = true;
  });
</script>

<svelte:head>
  {#if post instanceof Post}
    <title>{post.author.displayName}: "{post.text}" - Skythread</title>
  {/if}
</svelte:head>

{#if post}
  {#if post instanceof Post}
    {#if post.parent}
      <ThreadRootParent post={post.parent} />
    {:else if post.parentReference}
      <ThreadRootParentRaw uri={post.parentReference.uri} />
    {/if}
  {/if}

  <PostComponent {post} context="thread" bind:this={rootComponent} />
{:else if !loadingFailed}
  <MainLoader />
{/if}
