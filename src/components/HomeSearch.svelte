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
      target.searchParams.set('q', q);
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

<style>
  form {
    border: 2px solid hsl(210, 100%, 80%);
    border-radius: 10px;
    padding: 15px 20px;
    margin-left: 50px;
  }

  input {
    font-size: 16pt;
    width: 600px;
    border: 0;
    margin-left: 8px;
  }

  input:focus {
    outline: none;
  }

  @media (prefers-color-scheme: dark) {
    form {
      border-color: hsl(210, 40%, 60%);
    }

    form input {
      background-color: transparent;
    }
  }
</style>
