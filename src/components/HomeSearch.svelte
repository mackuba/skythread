<script>
  import { getBaseLocation, linkToHashtagPage, linkToPostById, parseBlueskyPostURL } from '../router.js';

  let query = $state();
  let searchField;

  $effect(() => {
    searchField.focus();
  });

  function onsubmit(e) {
    e.preventDefault();

    let q = query.trim();

    if (!q) {
      return;
    }

    if (q.startsWith('at://')) {
      let target = new URL(getBaseLocation());
      target.searchParams.set('q', url);
      location.assign(target.toString());

    } else if (q.match(/^#?((\p{Letter}|\p{Number})+)$/u)) {
      let hashtag = q.replace(/^#/, '');
      location.assign(linkToHashtagPage(hashtag));

    } else {
      try {
        let { user, post } = parseBlueskyPostURL(q);
        location.assign(linkToPostById(user, post));
      } catch (error) {
        console.log(error);
        alert(error.message || "This is not a valid URL or hashtag");
      }      
    }
  }
</script>

<form method="get" {onsubmit}>
  🌤 <input type="text" placeholder="Paste a thread link or type a #hashtag" bind:value={query} bind:this={searchField}>
</form>
