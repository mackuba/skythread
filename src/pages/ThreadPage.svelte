<script>
  import { Post, parseThreadPost } from '../models/posts.js';
  import { showError } from '../utils.js';
  import MainLoader from '../components/MainLoader.svelte';
  import PostComponent from '../components/posts/PostComponent.svelte';
  import ThreadRootParent from '../components/posts/ThreadRootParent.svelte';

  let { url = null, author = null, rkey = null } = $props();
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

  response.then((json) => {
    let root = parseThreadPost(json.thread);
    window.root = root;
    window.subtreeRoot = root;

    if (root instanceof Post) {
      /*
      TODO
      blueAPI.getQuoteCount(root.uri).then(count => {
        if (count > 0) {
          component.appendQuotesIconLink(count, true);
        }
      }).catch(error => {
        console.warn("Couldn't load quote count: " + error);
      });
      */
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
    {:else}
      <!-- TODO for threadgated parent:
        let { repo, rkey } = atURI(root.parentReference.uri);
        let url = linkToPostById(repo, rkey);

        let handle = api.findHandleByDid(repo);
        let link = handle ? `See parent post (@${handle})` : "See parent post";

        let p = $tag('p.back', { html: `<i class="fa-solid fa-reply"></i><a href="${url}">${link}</a>` });
        $id('thread').appendChild(p);
      -->
    {/if}
  {/if}

  <PostComponent {post} context="thread" />
{:else if !loadingFailed}
  <MainLoader />
{/if}
