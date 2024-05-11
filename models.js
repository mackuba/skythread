/**
 * Generic record type, base class for all records.
 */

class ATProtoRecord {

  /** @param {object} data, @param {object} [extra] */
  constructor(data, extra) {
    this.data = data;

    if (extra) {
      Object.assign(this, extra);
    }
  }

  /** @returns {string} */
  get uri() {
    return this.data.uri;
  }

  /** @returns {string} */
  get cid() {
    return this.data.cid;
  }

  /** @returns {string} */
  get rkey() {
    return atURI(this.uri).rkey;
  }

  /** @returns {string} */
  get type() {
    return this.data.$type;
  }
}


/**
 * Standard Bluesky post record.
 */

class Post extends ATProtoRecord {
  /** @type {ATProtoRecord | undefined} */
  parent;

  /** @type {object | undefined} */
  reason;

  /** @param {object} json, @returns {ATProtoRecord} */
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

    case 'app.bsky.feed.defs#feedViewPost':
      post = new Post(json.post);

      if (json.reply) {
        post.parent = new Post(json.reply.parent);
      }

      if (json.reason) {
        post.reason = json.reason;
      }

      return post;

    case 'app.bsky.embed.record#viewRecord':
      return new Post(json, { isEmbed: true });

    case 'app.bsky.feed.defs#notFoundPost':
    case 'app.bsky.embed.record#viewNotFound':
      return new ATProtoRecord(json, { missing: true });

    case 'app.bsky.feed.defs#blockedPost':
    case 'app.bsky.embed.record#viewBlocked':
      return new BlockedPost(json);

    default:
      console.warn('Unknown record type:', json.$type);
      return new ATProtoRecord(json);
    }
  }

  /** @param {object} data, @param {object} [extra] */
  constructor(data, extra) {
    super(data, extra);

    this.author = this.author ?? data.author;
    this.record = data.value ?? data.record;
    this.replies = [];

    if (data.embed) {
      this.embed = Embed.parse(data.embed);
    } else if (data.embeds && data.embeds.length > 0) {
      this.embed = Embed.parse(data.embeds[0]);
    } else if (this.record.embed) {
      this.embed = Embed.parse(this.record.embed);
    }

    this.viewerData = data.viewer;
    this.viewerLike = data.viewer?.like;

    if (this.author) {
      api.cacheProfile(this.author);      
    }
  }

  /** @returns {string} */
  get text() {
    return this.record.text;
  }

  /** @returns {object} */
  get facets() {
    return this.record.facets;
  }

  /** @returns {Date} */
  get createdAt() {
    return new Date(this.record.createdAt);
  }

  /** @returns {number} */
  get likeCount() {
    return this.data.likeCount;
  }

  /** @returns {number} */
  get replyCount() {
    return this.data.replyCount;
  }

  /** @returns {boolean} */
  get hasMoreReplies() {
    return this.replyCount !== undefined && this.replyCount !== this.replies.length;
  }

  /** @returns {number} */
  get repostCount() {
    return this.data.repostCount;
  }

  /** @returns {boolean} */
  get liked() {
    return (this.viewerLike !== undefined);
  }

  /** @returns {boolean | undefined} */
  get muted() {
    return this.author.viewer?.muted;
  }

  /** @returns {string | undefined} */
  get muteList() {
    return this.author.viewer?.mutedByList?.name;
  }

  /** @returns {boolean} */
  get hasViewerInfo() {
    return (this.viewerData !== undefined);
  }

  /** @returns {ATProtoRecord | undefined} */
  get parentReference() {
    return this.record.reply?.parent && new ATProtoRecord(this.record.reply?.parent);
  }

  /** @returns {ATProtoRecord | undefined} */
  get rootReference() {
    return this.record.reply?.root && new ATProtoRecord(this.record.reply?.root);
  }
}


/**
 * Post which is blocked for some reason (the author is blocked, the author has blocked you, or there is a block
 * between the post author and the parent author). It only includes a reference, but no post content.
 */

class BlockedPost extends ATProtoRecord {

  /** @param {object} data */
  constructor(data) {
    super(data);

    this.blocked = true;
    this.missing = true;
    this.author = data.author;
  }

  /** @returns {boolean} */
  get blocksUser() {
    return !!this.author.viewer?.blocking;
  }

  /** @returns {boolean} */
  get blockedByUser() {
    return this.author.viewer?.blockedBy;
  }
}


/**
 * Base class for embed objects.
 */

class Embed {

  /** @param {object} json, @returns {Embed} */
  static parse(json) {
    switch (json.$type) {
    case 'app.bsky.embed.record':
      return new RecordEmbed(json);

    case 'app.bsky.embed.recordWithMedia':
      return new RecordWithMediaEmbed(json);

    case 'app.bsky.embed.images':
      return new ImageEmbed(json);

    case 'app.bsky.embed.external':
      return new LinkEmbed(json);

    case 'app.bsky.embed.record#view':
      return new InlineRecordEmbed(json);

    case 'app.bsky.embed.recordWithMedia#view':
      return new InlineRecordWithMediaEmbed(json);

    case 'app.bsky.embed.images#view':
      return new InlineImageEmbed(json);

    case 'app.bsky.embed.external#view':
      return new InlineLinkEmbed(json);

    default:
      return new Embed(json);
    }
  }

  /** @param {object} json */
  constructor(json) {
    this.json = json;
  }

  /** @returns {string} */
  get type() {
    return this.json.$type;
  }
}

class ImageEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);
    this.images = json.images;
  }
}

class LinkEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
  }
}

class RecordEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);
    this.record = new ATProtoRecord(json.record);
  }
}

class RecordWithMediaEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);
    this.record = new ATProtoRecord(json.record.record);
    this.media = Embed.parse(json.media);
  }
}

class InlineRecordEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);
    this.post = Post.parse(json.record);
  }  
}

class InlineRecordWithMediaEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);
    this.post = Post.parse(json.record.record);
    this.media = Embed.parse(json.media);
  }  
}

class InlineLinkEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
  }
}

class InlineImageEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);
    this.images = json.images;
  }
}

// TODO
/** @param {object} a, @param {object} b, @param {Post} parent, @returns {-1 | 0 | 1} */

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
