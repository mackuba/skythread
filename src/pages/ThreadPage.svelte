<script>
  import { Post, parseThreadPost } from '../models/posts.js';
  import { showError } from '../utils.js';
  import MainLoader from '../components/MainLoader.svelte';
  import PostComponent from '../components/posts/PostComponent.svelte';
  import ThreadRootParent from '../components/posts/ThreadRootParent.svelte';
  import ThreadRootParentRaw from '../components/posts/ThreadRootParentRaw.svelte';

  let { url = undefined, author = undefined, rkey = undefined } = $props();
  let post = $state();
  let loadingFailed = $state(false);

  let response;

  if (url && url.startsWith('at://')) {
    response = api.loadThreadByAtURI(url);
  } else if (url) {
    response = api.loadThreadByURL(url);
  } else if (author && rkey) {
    response = api.loadThreadById(author, rkey);
  } else {
    throw 'Either url or author & rkey must be set';
  }

  let rootComponent;

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
