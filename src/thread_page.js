import { $, $id, atURI, showError } from './utils.js';
import { $tag } from './utils_ts.js';
import { Post, BlockedPost, MissingPost, parseThreadPost } from './models/posts.js';
import { PostComponent } from './post_component.js';
import { linkToPostById, linkToPostThread } from './router.js';
import { setPageTitle, hideLoader } from './skythread.js';

/**
 * Manages the page that displays a thread, as a whole.
 */

export class ThreadPage {

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
    let root = parseThreadPost(json.thread);
    window.root = root;
    window.subtreeRoot = root;

    let loadQuoteCount;

    if (root instanceof Post) {
      setPageTitle(root);
      loadQuoteCount = blueAPI.getQuoteCount(root.uri);

      if (root.parent) {
        let p = this.buildParentLink(root.parent);
        $id('thread').appendChild(p);
      } else if (root.parentReference) {
        let { repo, rkey } = atURI(root.parentReference.uri);
        let url = linkToPostById(repo, rkey);

        let handle = api.findHandleByDid(repo);
        let link = handle ? `See parent post (@${handle})` : "See parent post";

        let p = $tag('p.back', { html: `<i class="fa-solid fa-reply"></i><a href="${url}">${link}</a>` });
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
