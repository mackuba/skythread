class Record {
  constructor(data, extra) {
    this.data = data;

    if (extra) {
      Object.assign(this, extra);
    }
  }

  get uri() {
    return this.data.uri;
  }

  get cid() {
    return this.data.cid;
  }

  get rkey() {
    return atURI(this.uri).rkey;
  }
}

class Post extends Record {
  static parse(json) {
    let post;

    switch (json.$type) {
    case 'app.bsky.feed.defs#threadViewPost':
      post = new Post(json.post);

      if (json.replies) {
        post.replies = json.replies.map(x => Post.parse(x)).sort((a, b) => sortReplies(a, b, post));
      }

      if (json.parent) {
        post.parent = Post.parse(json.parent);
      }

      return post;

    case 'app.bsky.feed.defs#notFoundPost':
      return new Record(json, { missing: true });

    case 'app.bsky.feed.defs#blockedPost':
      return new Record(json, { missing: true, blocked: true });

    default:
      console.warn('Unknown record type:', json.$type);
      return new Record(json);
    }
  }

  constructor(data, extra) {
    super(data, extra);

    this.author = this.author ?? data.author;
    this.record = data.value ?? data.record;
    this.replies = [];
    this.embed = this.record.embed && Embed.parse(this.record.embed);
    this.viewerLike = data.viewer?.like;

    if (this.author) {
      api.cacheProfile(this.author);      
    }
  }

  get text() {
    return this.record.text;
  }

  get createdAt() {
    return new Date(this.record.createdAt);
  }

  get likeCount() {
    return this.data.likeCount;
  }

  get replyCount() {
    return this.data.replyCount;
  }

  get hasMoreReplies() {
    return this.replyCount !== undefined && this.replyCount !== this.replies.length;
  }

  get repostCount() {
    return this.data.repostCount;
  }

  get liked() {
    return (this.viewerLike !== undefined);
  }

  get muted() {
    return this.author.viewer?.muted;
  }

  get muteList() {
    return this.author.viewer?.mutedByList?.name;
  }

  get parentReference() {
    return this.record.reply?.parent && new Record(this.record.reply?.parent);
  }

  get rootReference() {
    return this.record.reply?.root && new Record(this.record.reply?.root);
  }
}

class Embed {
  static parse(json) {
    switch (json.$type) {
    case 'app.bsky.embed.record':
      return new RecordEmbed(json);

    case 'app.bsky.embed.recordWithMedia':
      return new RecordWithMediaEmbed(json);

    case 'app.bsky.embed.images':
      return new ImageEmbed(json);

    default:
      return new Embed(json);
    }
  }

  constructor(json) {
    this.json = json;
  }

  get type() {
    return this.json.$type;
  }
}

class ImageEmbed extends Embed {
  constructor(json) {
    super(json);
  }
}

class RecordEmbed extends Embed {
  constructor(json) {
    super(json);
    this.record = new Record(json.record);
  }
}

class RecordWithMediaEmbed extends Embed {
  constructor(json) {
    super(json);
    this.record = new Record(json.record.record);
  }
}

function sortReplies(a, b, parent) {
  if (a.missing && b.missing) {
    return 0;
  } else if (a.missing && !b.missing) {
    return 1;
  } else if (b.missing && !a.missing) {
    return -1;
  } else if (a.author.did == parent.author.did && b.author.did != parent.author.did) {
    return -1;
  } else if (a.author.did != parent.author.did && b.author.did == parent.author.did) {
    return 1;
  } else if (a.createdAt.getTime() < b.createdAt.getTime()) {
    return -1;
  } else if (a.createdAt.getTime() > b.createdAt.getTime()) {
    return 1;
  } else {
    return 0;
  }
}
