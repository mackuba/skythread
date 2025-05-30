class NotificationsPage {

  constructor() {
    this.pageElement = $id('thread');
  }

  show() {
    document.title = `Notifications - Skythread`;
    showLoader();

    let isLoading = false;
    let firstPageLoaded = false;
    let finished = false;
    let cursor;

    loadInPages((next) => {
      if (isLoading || finished) { return; }
      isLoading = true;

      accountAPI.loadMentions(cursor).then(data => {
        let posts = data.posts.map(x => new Post(x));

        if (posts.length > 0) {
          if (!firstPageLoaded) {
            hideLoader();
            firstPageLoaded = true;

            let header = $tag('header');
            let h2 = $tag('h2', { text: "Replies & Mentions:" });
            header.append(h2);

            this.pageElement.appendChild(header);
            this.pageElement.classList.add('notifications');
          }

          for (let post of posts) {
            if (post.parentReference) {
              let p = $tag('p.back');
              p.innerHTML = `<i class="fa-solid fa-reply"></i> `;

              let { repo, rkey } = atURI(post.parentReference.uri);
              let url = linkToPostById(repo, rkey);
              let parentLink = $tag('a', { href: url });
              p.append(parentLink);

              if (repo == accountAPI.user.did) {
                parentLink.innerText = 'Reply to you';
              } else {
                parentLink.innerText = 'Reply';
                api.fetchHandleForDid(repo).then(handle => {
                  parentLink.innerText = `Reply to @${handle}`;
                });
              }

              this.pageElement.appendChild(p);
            }

            let postView = new PostComponent(post, 'feed').buildElement();
            this.pageElement.appendChild(postView);
          }
        }

        isLoading = false;
        cursor = data.cursor;

        if (!cursor) {
          finished = true;
        } else if (posts.length == 0) {
          next();
        }
      }).catch(error => {
        hideLoader();
        console.log(error);
        isLoading = false;
      });
    });
  }
}
