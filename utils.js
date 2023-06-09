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

function lastPathComponent(uri) {
  let parts = uri.replace(/\/$/, '').split('/');
  return parts[parts.length-1];
}

function linkToPostThread(post) {
  return linkToPostById(post.author.handle, post.id);
}

function linkToPostById(handle, postId) {
  let url = new URL(getLocation());
  url.searchParams.set('author', handle);
  url.searchParams.set('post', postId);
  return url.toString();
}
