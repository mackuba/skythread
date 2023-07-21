function atURI(uri) {
  return new AtURI(uri);
}

class AtURI {
  constructor(uri) {
    if (!uri.startsWith('at://')) {
      throw new URLError(`Not an at:// URI: ${uri}`);
    }

    let parts = uri.split('/');

    if (parts.length != 5) {
      throw new URLError(`Invalid at:// URI: ${uri}`);
    }

    this.repo = parts[2];
    this.collection = parts[3];
    this.rkey = parts[4];
  }
}

function getLocation() {
  return location.origin + location.pathname;
}

function sameDay(date1, date2) {
  return (
    date1.getDate() == date2.getDate() &&
    date1.getMonth() == date2.getMonth() &&
    date1.getFullYear() == date2.getFullYear()
  );
}

function linkToPostThread(post) {
  return linkToPostById(post.author.handle, post.rkey);
}

function linkToPostById(handle, postId) {
  let url = new URL(getLocation());
  url.searchParams.set('author', handle);
  url.searchParams.set('post', postId);
  return url.toString();
}
