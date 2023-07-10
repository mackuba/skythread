function parsePost(json) {
  let post = json.post;

  if (!post) {
    return { missing: true, blocked: json.blocked, uri: json.uri };
  }

  return {
    author: post.author,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
    repostCount: post.repostCount,
    uri: post.uri,
    cid: post.cid,
    id: lastPathComponent(post.uri),
    createdAt: new Date(post.record.createdAt),
    text: post.record.text,
    like: post.viewer.like,
    replies: [],
    embed: post.record.embed,
    muted: post.author.viewer.muted,
    muteList: post.author.viewer.mutedByList?.name
  };
}

function buildPostSubtree(json) {
  let post = parsePost(json);

  if (json.parent) {
    post.parent = parsePost(json.parent);
  }

  if (json.replies) {
    post.replies = json.replies.map(x => buildPostSubtree(x)).sort((a, b) => {
      if (a.missing && b.missing) {
        return 0;
      } else if (a.missing && !b.missing) {
        return 1;
      } else if (b.missing && !a.missing) {
        return -1;
      } else if (a.author.did == post.author.did && b.author.did != post.author.did) {
        return -1;
      } else if (a.author.did != post.author.did && b.author.did == post.author.did) {
        return 1;
      } else if (a.createdAt.getTime() < b.createdAt.getTime()) {
        return -1;
      } else if (a.createdAt.getTime() > b.createdAt.getTime()) {
        return 1;
      } else {
        return 0;
      }
    });
  }

  return post;
}

function parseRawPost(json) {
  return {
    replyCount: 0,
    uri: json.uri,
    cid: json.cid,
    id: lastPathComponent(json.uri),
    createdAt: new Date(json.value.createdAt),
    text: json.value.text,
    replies: [],
    embed: json.value.embed,
    parentURI: json.value.reply?.parent?.uri
  };
}
