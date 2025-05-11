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

  /** @param {json} data, @param {json} [extra] */
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
 * @typedef {Post | BlockedPost | MissingPost | DetachedQuotePost} AnyPost
 */

class Post extends ATProtoRecord {
  /**
   * Post object which is the direct parent of this post.
   * @type {ATProtoRecord | undefined}
   */
  parent;

  /**
   * Post object which is the root of the whole thread (as specified in the post record).
   * @type {ATProtoRecord | undefined}
   */
  threadRoot;

  /**
   * Post which is at the top of the (sub)thread currently loaded on the page (might not be the same as threadRoot).
   * @type {Post | undefined}
   */
  pageRoot;

  /**
   * Depth of the post in the getPostThread response it was loaded from, starting from 0. May be negative.
   * @type {number | undefined}
   */
  level;

  /**
   * Depth of the post in the whole tree visible on the page (pageRoot's absoluteLevel is 0). May be negative.
   * @type {number | undefined}
   */
  absoluteLevel;

  /**
   * For posts in feeds and timelines - specifies e.g. that a post was reposted by someone.
   * @type {object | undefined}
   */
  reason;

  /**
   * True if the post was extracted from inner embed of a quote, not from a #postView.
   * @type {boolean | undefined}
   */
  isEmbed;

  /**
   * View of a post as part of a thread, as returned from getPostThread.
   * Expected to be #threadViewPost, but may be blocked or missing.
   *
   * @param {json} json
   * @param {Post?} [pageRoot]
   * @param {number} [level]
   * @param {number} [absoluteLevel]
   * @returns {AnyPost}
   */

  static parseThreadPost(json, pageRoot = null, level = 0, absoluteLevel = 0) {
    switch (json.$type) {
    case 'app.bsky.feed.defs#threadViewPost':
      let post = new Post(json.post, { level: level, absoluteLevel: absoluteLevel });

      post.pageRoot = pageRoot ?? post;

      if (json.replies) {
        let replies = json.replies.map(x => Post.parseThreadPost(x, post.pageRoot, level + 1, absoluteLevel + 1));
        post.setReplies(replies);
      }

      if (absoluteLevel <= 0 && json.parent) {
        post.parent = Post.parseThreadPost(json.parent, post.pageRoot, level - 1, absoluteLevel - 1);
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
   * @param {json} json, @returns {ATProtoRecord}
   */

  static parseViewRecord(json) {
    switch (json.$type) {
    case 'app.bsky.embed.record#viewRecord':
      return new Post(json, { isEmbed: true });

    case 'app.bsky.embed.record#viewNotFound':
      return new MissingPost(json);

    case 'app.bsky.embed.record#viewBlocked':
      return new BlockedPost(json);

    case 'app.bsky.embed.record#viewDetached':
      return new DetachedQuotePost(json);

    case 'app.bsky.feed.defs#generatorView':
      return new FeedGeneratorRecord(json);

    case 'app.bsky.graph.defs#listView':
      return new UserListRecord(json);

    case 'app.bsky.graph.defs#starterPackViewBasic':
      return new StarterPackRecord(json);

    default:
      console.warn('Unknown record type:', json.$type);
      return new ATProtoRecord(json);
    }
  }

  /**
   * View of a post as part of a feed (e.g. a profile feed, home timeline or a custom feed). It should be an
   * app.bsky.feed.defs#feedViewPost - blocked or missing posts don't appear here, they just aren't included.
   *
   * @param {json} json, @returns {Post}
   */

  static parseFeedPost(json) {
    let post = new Post(json.post);

    if (json.reply) {
      post.parent = Post.parsePostView(json.reply.parent);
      post.threadRoot = Post.parsePostView(json.reply.root);

      if (json.reply.grandparentAuthor) {
        post.grandparentAuthor = json.reply.grandparentAuthor;
      }
    }

    if (json.reason) {
      post.reason = json.reason;
    }

    return post;
  }

 /**
  * Parses a #postView - the inner post object that includes the actual post - but still checks if it's not
  * a blocked or missing post. The #postView must include a $type.
  * (This is used for e.g. parent/root of a #feedViewPost.)
  *
  * @param {json} json, @returns {AnyPost}
  */

  static parsePostView(json) {
    switch (json.$type) {
    case 'app.bsky.feed.defs#postView':
      return new Post(json);

    case 'app.bsky.feed.defs#notFoundPost':
      return new MissingPost(json);

    case 'app.bsky.feed.defs#blockedPost':
      return new BlockedPost(json);

    default:
      throw new PostDataError(`Unexpected record type: ${json.$type}`);
    }
  }

  /** @param {json} data, @param {json} [extra] */

  constructor(data, extra) {
    super(data);
    Object.assign(this, extra ?? {});

    if (this.absoluteLevel === 0) {
      this.pageRoot = this;
    }

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

  /** @param {Post} post */

  updateDataFromPost(post) {
    this.record = post.record;
    this.embed = post.embed;
    this.author = post.author;
    this.replies = post.replies;
    this.viewerData = post.viewerData;
    this.viewerLike = post.viewerLike;
    this.level = post.level;
    this.absoluteLevel = post.absoluteLevel;
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

  /** @returns {boolean} */
  get isFediPost() {
    return this.author?.handle.endsWith('.ap.brid.gy');
  }

  /** @returns {string | undefined} */
  get originalFediContent() {
    return this.record.bridgyOriginalText;
  }

  /** @returns {boolean} */
  get isRoot() {
    // I AM ROOOT
    return (this.pageRoot === this);
  }

  /** @returns {string} */
  get authorFediHandle() {
    if (this.isFediPost) {
      return this.author.handle.replace(/\.ap\.brid\.gy$/, '').replace('.', '@');
    } else {
      throw "Not a Fedi post";
    }
  }

  /** @returns {string} */
  get text() {
    return this.record.text;
  }

  /** @returns {json} */
  get facets() {
    return this.record.facets;
  }

  /** @returns {string[] | undefined} */
  get tags() {
    return this.record.tags;
  }

  /** @returns {Date} */
  get createdAt() {
    return new Date(this.record.createdAt);
  }

  /** @returns {number} */
  get likeCount() {
    return castToInt(this.data.likeCount);
  }

  /** @returns {number} */
  get replyCount() {
    return castToInt(this.data.replyCount);
  }

  /** @returns {number} */
  get quoteCount() {
    return castToInt(this.data.quoteCount);
  }

  /** @returns {boolean} */
  get hasMoreReplies() {
    let shouldHaveMoreReplies = (this.replyCount !== undefined && this.replyCount > this.replies.length);

    return shouldHaveMoreReplies && (this.replies.length === 0) && (this.level !== undefined && this.level > 4);
  }

  /** @returns {boolean} */
  get hasHiddenReplies() {
    let shouldHaveMoreReplies = (this.replyCount !== undefined && this.replyCount > this.replies.length);

    return shouldHaveMoreReplies && (this.replies.length > 0 || (this.level !== undefined && this.level <= 4));
  }

  /** @returns {number} */
  get repostCount() {
    return castToInt(this.data.repostCount);
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

  /** @param {json} data */
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
 * Stub of a quoted post which was un-quoted by the original author.
 */

class DetachedQuotePost extends ATProtoRecord {}


/**
 * Record representing a feed generator.
 */

class FeedGeneratorRecord extends ATProtoRecord {

  /** @param {json} data */
  constructor(data) {
    super(data);
    this.author = data.creator;
  }

  /** @returns {string | undefined} */
  get title() {
    return this.data.displayName;
  }

  /** @returns {string | undefined} */
  get description() {
    return this.data.description;
  }

  /** @returns {number} */
  get likeCount() {
    return castToInt(this.data.likeCount);
  }

  /** @returns {string | undefined} */
  get avatar() {
    return this.data.avatar;
  }
}


/**
 * Record representing a user list or moderation list.
 */

class UserListRecord extends ATProtoRecord {

  /** @param {json} data */
  constructor(data) {
    super(data);
    this.author = data.creator;
  }

  /** @returns {string | undefined} */
  get title() {
    return this.data.name;
  }

  /** @returns {string | undefined} */
  get purpose() {
    return this.data.purpose;
  }

  /** @returns {string | undefined} */
  get description() {
    return this.data.description;
  }

  /** @returns {string | undefined} */
  get avatar() {
    return this.data.avatar;
  }
}


/**
 * Record representing a starter pack.
 */

class StarterPackRecord extends ATProtoRecord {

  /** @param {json} data */
  constructor(data) {
    super(data);
    this.author = data.creator;
  }

  /** @returns {string | undefined} */
  get title() {
    return this.data.record.name;
  }

  /** @returns {string | undefined} */
  get description() {
    return this.data.record.description;
  }
}


/**
 * Base class for embed objects.
 */

class Embed {

  /**
   * More hydrated view of an embed, taken from a full post view (#postView).
   *
   * @param {json} json, @returns {Embed}
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
    * @param {json} json, @returns {Embed}
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

  /** @param {json} json */
  constructor(json) {
    this.json = json;
  }

  /** @returns {string} */
  get type() {
    return this.json.$type;
  }
}

class RawImageEmbed extends Embed {

  /** @param {json} json */
  constructor(json) {
    super(json);
    this.images = json.images;
  }
}

class RawLinkEmbed extends Embed {

  /** @param {json} json */
  constructor(json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
  }
}

class RawRecordEmbed extends Embed {

  /** @param {json} json */
  constructor(json) {
    super(json);
    this.record = new ATProtoRecord(json.record);
  }
}

class RawRecordWithMediaEmbed extends Embed {

  /** @param {json} json */
  constructor(json) {
    super(json);
    this.record = new ATProtoRecord(json.record.record);
    this.media = Embed.parseRawEmbed(json.media);
  }
}

class InlineRecordEmbed extends Embed {

  /**
   * app.bsky.embed.record#view
   * @param {json} json
   */
  constructor(json) {
    super(json);
    this.post = Post.parseViewRecord(json.record);
  }
}

class InlineRecordWithMediaEmbed extends Embed {

  /**
   * app.bsky.embed.recordWithMedia#view
   * @param {json} json
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
   * @param {json} json
   */
  constructor(json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
    this.description = json.external.description;
  }
}

class InlineImageEmbed extends Embed {

  /**
   * app.bsky.embed.images#view
   * @param {json} json
   */
  constructor(json) {
    super(json);
    this.images = json.images;
  }
}
