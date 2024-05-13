/**
 * Thrown when parsing post JSON fails.
 */

class PostDataError extends Error {

  /** @param {string} message */
  constructor(message) {
    super(message);
  }
}


/**
 * Generic record type, base class for all records or record view objects.
 */

class ATProtoRecord {

  /** @param {object} data, @param {object} [extra] */
  constructor(data, extra) {
    this.data = data;
    Object.assign(this, extra ?? {});
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
 *
 * @typedef {Post | BlockedPost | MissingPost} AnyPost
 */

class Post extends ATProtoRecord {
  /** @type {ATProtoRecord | undefined} */
  parent;

  /** @type {object | undefined} */
  reason;

  /** @type {boolean | undefined} */
  isEmbed;

  /**
   * View of a post as part of a thread, as returned from getPostThread.
   * Expected to be #threadViewPost, but may be blocked or missing.
   *
   * @param {object} json, @returns {AnyPost}
   */

  static parseThreadPost(json) {
    switch (json.$type) {
    case 'app.bsky.feed.defs#threadViewPost':
      let post = new Post(json.post);

      if (json.replies) {
        post.setReplies(json.replies.map(x => Post.parseThreadPost(x)));
      }

      if (json.parent) {
        post.parent = Post.parseThreadPost(json.parent);
      }

      return post;

    case 'app.bsky.feed.defs#notFoundPost':
      return new MissingPost(json);

    case 'app.bsky.feed.defs#blockedPost':
      return new BlockedPost(json);

    default:
      throw new PostDataError(`Unexpected record type: ${json.$type}`);
    }
  }

  /**
   * View of a post embedded as a quote.
   * Expected to be app.bsky.embed.record#viewRecord, but may be blocked, missing or a different type of record
   * (e.g. a list or a feed generator). For unknown record embeds, we fall back to generic ATProtoRecord.
   *
   * @param {object} json, @returns {ATProtoRecord}
   */

  static parseViewRecord(json) {
    switch (json.$type) {
    case 'app.bsky.embed.record#viewRecord':
      return new Post(json, { isEmbed: true });

    case 'app.bsky.embed.record#viewNotFound':
      return new MissingPost(json);

    case 'app.bsky.embed.record#viewBlocked':
      return new BlockedPost(json);

    default:
      console.warn('Unknown record type:', json.$type);
      return new ATProtoRecord(json);
    }
  }

  /**
   * View of a post as part of a feed (e.g. a profile feed, home timeline or a custom feed). It should be an
   * app.bsky.feed.defs#feedViewPost - blocked or missing posts don't appear here, they just aren't included.
   *
   * @param {object} json, @returns {Post}
   */

  static parseFeedPost(json) {
    let post = new Post(json.post);

    if (json.reply) {
      post.parent = new Post(json.reply.parent);
    }

    if (json.reason) {
      post.reason = json.reason;
    }

    return post;
  }

  /** @param {object} data, @param {object} [extra] */

  constructor(data, extra) {
    super(data);
    Object.assign(this, extra ?? {});

    this.record = this.isPostView ? data.record : data.value;

    if (this.isPostView && data.embed) {
      this.embed = Embed.parseInlineEmbed(data.embed);
    } else if (this.isEmbed && data.embeds && data.embeds[0]) {
      this.embed = Embed.parseInlineEmbed(data.embeds[0]);
    } else if (this.record.embed) {
      this.embed = Embed.parseRawEmbed(this.record.embed);
    }

    this.author = this.author ?? data.author;
    this.replies = [];

    this.viewerData = data.viewer;
    this.viewerLike = data.viewer?.like;

    if (this.author) {
      api.cacheProfile(this.author);
    }
  }

  /** @param {AnyPost[]} replies */

  setReplies(replies) {
    this.replies = replies;
    this.replies.sort(this.sortReplies.bind(this));
  }

  /** @param {AnyPost} a, @param {AnyPost} b, @returns {-1 | 0 | 1} */

  sortReplies(a, b) {
    if (a instanceof Post && b instanceof Post) {
      if (a.author.did == this.author.did && b.author.did != this.author.did) {
        return -1;
      } else if (a.author.did != this.author.did && b.author.did == this.author.did) {
        return 1;
      } else if (a.createdAt.getTime() < b.createdAt.getTime()) {
        return -1;
      } else if (a.createdAt.getTime() > b.createdAt.getTime()) {
        return 1;
      } else {
        return 0;
      }
    } else if (a instanceof Post) {
      return -1;
    } else if (b instanceof Post) {
      return 1;
    } else {
      return 0;
    }
  }

  /** @returns {boolean} */
  get isPostView() {
    return !this.isEmbed;
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
 * Stub of a post which was deleted or hidden.
 */

class MissingPost extends ATProtoRecord {}


/**
 * Base class for embed objects.
 */

class Embed {

  /**
   * More hydrated view of an embed, taken from a full post view (#postView).
   *
   * @param {object} json, @returns {Embed}
   */

  static parseInlineEmbed(json) {
    switch (json.$type) {
    case 'app.bsky.embed.record#view':
      return new InlineRecordEmbed(json);

    case 'app.bsky.embed.recordWithMedia#view':
      return new InlineRecordWithMediaEmbed(json);

    case 'app.bsky.embed.images#view':
      return new InlineImageEmbed(json);

    case 'app.bsky.embed.external#view':
      return new InlineLinkEmbed(json);

    default:
      if (location.protocol == 'file:') {
        throw new PostDataError(`Unexpected embed type: ${json.$type}`);
      } else {
        console.warn('Unexpected embed type:', json.$type);
        return new Embed(json);
      }
    }
  }

  /**
    * Raw embed extracted from raw record data of a post. Does not include quoted post contents.
    *
    * @param {object} json, @returns {Embed}
    */

  static parseRawEmbed(json) {
    switch (json.$type) {
    case 'app.bsky.embed.record':
      return new RawRecordEmbed(json);

    case 'app.bsky.embed.recordWithMedia':
      return new RawRecordWithMediaEmbed(json);

    case 'app.bsky.embed.images':
      return new RawImageEmbed(json);

    case 'app.bsky.embed.external':
      return new RawLinkEmbed(json);

    default:
      if (location.protocol == 'file:') {
        throw new PostDataError(`Unexpected embed type: ${json.$type}`);
      } else {
        console.warn('Unexpected embed type:', json.$type);
        return new Embed(json);
      }
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

class RawImageEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);
    this.images = json.images;
  }
}

class RawLinkEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
  }
}

class RawRecordEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);
    this.record = new ATProtoRecord(json.record);
  }
}

class RawRecordWithMediaEmbed extends Embed {

  /** @param {object} json */
  constructor(json) {
    super(json);
    this.record = new ATProtoRecord(json.record.record);
    this.media = Embed.parseRawEmbed(json.media);
  }
}

class InlineRecordEmbed extends Embed {

  /**
   * app.bsky.embed.record#view
   * @param {object} json
   */
  constructor(json) {
    super(json);
    this.post = Post.parseViewRecord(json.record);
  }
}

class InlineRecordWithMediaEmbed extends Embed {

  /**
   * app.bsky.embed.recordWithMedia#view
   * @param {object} json
   */
  constructor(json) {
    super(json);
    this.post = Post.parseViewRecord(json.record.record);
    this.media = Embed.parseInlineEmbed(json.media);
  }
}

class InlineLinkEmbed extends Embed {

  /**
   * app.bsky.embed.external#view
   * @param {object} json
   */
  constructor(json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
  }
}

class InlineImageEmbed extends Embed {

  /**
   * app.bsky.embed.images#view
   * @param {object} json
   */
  constructor(json) {
    super(json);
    this.images = json.images;
  }
}
