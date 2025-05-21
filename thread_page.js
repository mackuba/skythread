/**
 * Manages the page that displays a thread, as a whole.
 */

class ThreadPage {

  /** @param {AnyPost} post, @returns {HTMLElement} */

  buildParentLink(post) {
    let p = $tag('p.back');

    if (post instanceof BlockedPost) {
      let element = new PostComponent(post, 'parent').buildElement();
      element.className = 'back';
      let span = $(element.querySelector('p.blocked-header span'));
      span.innerText = 'Parent post blocked';
      return element;
    } else if (post instanceof MissingPost) {
      p.innerHTML = `<i class="fa-solid fa-ban"></i> parent post has been deleted`;
    } else {
      let url = linkToPostThread(post);
      p.innerHTML = `<i class="fa-solid fa-reply"></i><a href="${url}">See parent post (@${post.author.handle})</a>`;
    }

    return p;
  } 

  /** @param {string} url, @returns {Promise<void>} */

  async loadThreadByURL(url) {
    try {
      let json = url.startsWith('at://') ? await api.loadThreadByAtURI(url) : await api.loadThreadByURL(url);
      this.displayThread(json);
    } catch (error) {
      hideLoader();
      showError(error);
    }
  }

  /** @param {string} author, @param {string} rkey, @returns {Promise<void>} */

  async loadThreadById(author, rkey) {
    try {
      let json = await api.loadThreadById(author, rkey);
      this.displayThread(json);
    } catch (error) {
      hideLoader();
      showError(error);
    }
  }

  /** @param {json} json */

  displayThread(json) {
    let root = Post.parseThreadPost(json.thread);
    window.root = root;
    window.subtreeRoot = root;

    let loadQuoteCount;

    if (root instanceof Post) {
      setPageTitle(root);
      loadQuoteCount = blueAPI.getQuoteCount(root.uri);

      if (root.parent) {
        let p = this.buildParentLink(root.parent);
        $id('thread').appendChild(p);
      }
    }

    let component = new PostComponent(root, 'thread');
    let view = component.buildElement();
    hideLoader();
    $id('thread').appendChild(view);

    loadQuoteCount?.then(count => {
      if (count > 0) {
        component.appendQuotesIconLink(count, true);
      }
    }).catch(error => {
      console.warn("Couldn't load quote count: " + error);
    });
  }
}
