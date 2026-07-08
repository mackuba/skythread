import { api } from '../api.js';
import { atURI, castToInt } from '../utils.js';
import { ATProtoRecord, FeedGeneratorRecord, StarterPackRecord, UserListRecord } from './records.js';
import { Embed } from './embeds.js';

/**
 * Thrown when parsing post JSON fails.
 */

export class PostDataError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Base class shared by the full Post and post stubs like BlockedPost, MissingPost etc.
 */

export class BasePost extends ATProtoRecord {

  // Set to true if the post was loaded from the "hidden replies" link (as a direct descendant)
  isHiddenReply = false;

  // Set to true if the author of the post has the 'needs-review' label
  labelledNeedsReview = false;

  get didLinkToAuthor(): string {
    let { repo } = atURI(this.uri);
    return `https://bsky.app/profile/${repo}`;
  }
}

/**
 * View of a post as part of a thread, as returned from getPostThread.
 * Expected to be #threadViewPost, but may be blocked or missing.
 */

export function parseThreadPost(json: json, pageRoot: Post | null = null, level = 0, absoluteLevel = 0): AnyPost {
  switch (json.$type) {
  case 'app.bsky.feed.defs#threadViewPost':
    let post = new Post(json.post, { level: level, absoluteLevel: absoluteLevel });

    post.pageRoot = pageRoot ?? post;

    if (json.replies) {
      let replies = json.replies.map((x: json) => parseThreadPost(x, post.pageRoot, level + 1, absoluteLevel + 1));
      post.setReplies(replies);
    }

    if (absoluteLevel <= 0 && json.parent) {
      post.parent = parseThreadPost(json.parent, post.pageRoot, level - 1, absoluteLevel - 1);
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
 */

export function parseViewRecord(json: json): ATProtoRecord {
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
 */

export function parseFeedPost(json: json): Post {
  let post = new Post(json.post);

  if (json.reply) {
    post.parent = parsePostView(json.reply.parent);
    post.threadRoot = parsePostView(json.reply.root);

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
 */

export function parsePostView(json: json): AnyPost {
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


/**
 * Standard Bluesky post record.
 */

export class Post extends BasePost {
  // Post object which is the direct parent of this post
  parent: AnyPost | undefined;

  // Post object which is the root of the whole thread (as specified in the post record)
  threadRoot: AnyPost | undefined;

  // Post which is at the top of the (sub)thread currently loaded on the page (might not be the same as threadRoot)
  pageRoot: Post | undefined;

  // Post's direct replies (if it's displayed in a thread)
  replies: AnyPost[];

  // Info about the author of the "grandparent" post. Included only in feedPost views, for the purposes of feed filtering algorithm
  grandparentAuthor: json | undefined;

  // Depth of the post in the getPostThread response it was loaded from, starting from 0. May be negative.
  level: number | undefined;

  // Depth of the post in the whole tree visible on the page (pageRoot's absoluteLevel is 0). May be negative.
  absoluteLevel: number | undefined;

  // For posts in feeds and timelines - specifies e.g. that a post was reposted by someone
  reason: object | undefined;

  // True if the post was extracted from inner embed of a quote, not from a #postView
  isEmbed: boolean | undefined;

  record: json;
  embed: Embed | undefined;
  viewerData: json | undefined;
  viewerLike: string | undefined;
  _lowercaseText: string | undefined;

  constructor(data: json, extra?: json) {
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

  updateDataFromPost(post: Post) {
    this.record = post.record;
    this.embed = post.embed;
    this.author = post.author;
    this.viewerData = post.viewerData;
    this.viewerLike = post.viewerLike;
    this.level = post.level;
    this.absoluteLevel = post.absoluteLevel;
    this.setReplies(post.replies);
  }

  setReplies(replies: AnyPost[]) {
    this.replies = replies;
    this.replies.sort(this.sortReplies.bind(this));
  }

  sortReplies(a: AnyPost, b: AnyPost): -1 | 0 | 1 {
    if (a instanceof Post && b instanceof Post) {
      if (a.author.did == this.author.did && b.author.did != this.author.did) {
        return -1;
      } else if (a.author.did != this.author.did && b.author.did == this.author.did) {
        return 1;
      } else if (a.text != "📌" && b.text == "📌") {
        return -1;
      } else if (a.text == "📌" && b.text != "📌") {
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

  get isPostView(): boolean {
    return !this.isEmbed;
  }

  get isFediPost(): boolean {
    return this.author?.handle.endsWith('.ap.brid.gy');
  }

  get originalFediContent(): string | undefined {
    return this.record.bridgyOriginalText;
  }

  get originalFediURL(): string | undefined {
    return this.record.bridgyOriginalUrl;
  }

  get isPageRoot(): boolean {
    // I AM ROOOT
    return (this.pageRoot === this);
  }

  get authorFediHandle(): string {
    if (this.isFediPost) {
      return this.author.handle.replace(/\.ap\.brid\.gy$/, '').replace('.', '@');
    } else {
      throw "Not a Fedi post";
    }
  }

  get hasValidHandle(): boolean {
    return this.author.handle != 'handle.invalid';
  }

  get authorDisplayName(): string {
    if (this.author.displayName) {
      return this.author.displayName.trim();
    } else if (this.author.handle.endsWith('.bsky.social')) {
      return this.author.handle.replace(/\.bsky\.social$/, '');
    } else {
      return this.author.handle;
    }
  }

  get linkToAuthor(): string {
    return 'https://bsky.app/profile/' + (this.hasValidHandle ? this.author.handle : this.author.did);
  }

  get linkToPost(): string {
    return this.linkToAuthor + '/post/' + this.rkey;
  }

  get text(): string {
    return this.record.text;
  }

  get lowercaseText(): string {
    if (!this._lowercaseText) {
      this._lowercaseText = this.record.text.toLowerCase();
    }

    return this._lowercaseText!;
  }

  get facets(): json {
    return this.record.facets;
  }

  get tags(): string[] | undefined {
    return this.record.tags;
  }

  get createdAt(): Date {
    return new Date(this.record.createdAt);
  }

  get likeCount(): number | null | undefined {
    return castToInt(this.data.likeCount);
  }

  get replyCount(): number | null | undefined {
    return castToInt(this.data.replyCount);
  }

  get quoteCount(): number | null | undefined {
    return castToInt(this.data.quoteCount);
  }

  get hasMoreReplies(): boolean {
    let shouldHaveMoreReplies = (this.replyCount != null && this.replyCount > this.replies.length);

    return shouldHaveMoreReplies && (this.replies.length === 0) && (this.level !== undefined && this.level > 4);
  }

  get hasHiddenReplies(): boolean {
    let shouldHaveMoreReplies = (this.replyCount != null && this.replyCount > this.replies.length);

    return shouldHaveMoreReplies && (this.replies.length > 0 || (this.level !== undefined && this.level <= 4));
  }

  get isRestrictingReplies(): boolean {
    return !!(this.data.threadgate && this.data.threadgate.record.allow);
  }

  get hasDisabledReplies(): boolean {
    return !!(this.data.threadgate && this.data.threadgate.record.allow !== undefined && this.data.threadgate.record.allow.length == 0);
  }

  get hasBeenEdited(): boolean {
    return !!(this.record.originalText);
  }

  get originalText(): string | undefined {
    return this.record.originalText;
  }

  get repostCount(): number | null | undefined {
    return castToInt(this.data.repostCount);
  }

  get liked(): boolean {
    return (this.viewerLike !== undefined);
  }

  get muted(): boolean | undefined {
    return this.author.viewer?.muted;
  }

  get muteList(): string | undefined {
    return this.author.viewer?.mutedByList?.name;
  }

  get hasViewerInfo(): boolean {
    return (this.viewerData !== undefined);
  }

  get parentReference(): ATProtoRecord | undefined {
    return this.record.reply?.parent && new ATProtoRecord(this.record.reply?.parent);
  }

  get rootReference(): ATProtoRecord | undefined {
    return this.record.reply?.root && new ATProtoRecord(this.record.reply?.root);
  }
}


/**
 * Post which is blocked for some reason (the author is blocked, the author has blocked you, or there is a block
 * between the post author and the parent author). It only includes a reference, but no post content.
 */

export class BlockedPost extends BasePost {

  constructor(data: json) {
    super(data);
    this.author = data.author;
  }

  get blocksUser(): boolean {
    return !!this.author.viewer?.blocking;
  }

  get blockedByUser(): boolean {
    return this.author.viewer?.blockedBy;
  }
}


/**
 * Stub of a post which was deleted or hidden.
 */

export class MissingPost extends BasePost {
  get isBskyPost(): boolean {
    return atURI(this.uri).collection == 'app.bsky.feed.post';
  }
}


/**
 * Stub of a quoted post which was un-quoted by the original author.
 */

export class DetachedQuotePost extends BasePost {}
