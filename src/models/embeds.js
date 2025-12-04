import { ATProtoRecord } from './records.js';
import { PostDataError, parseViewRecord } from './posts.js';

/**
 * Base class for embed objects.
 */

export class Embed {

  /** @type {json} */
  json;

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

    case 'app.bsky.embed.video#view':
      return new InlineVideoEmbed(json);

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

    case 'app.bsky.embed.video':
      return new RawVideoEmbed(json);

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

export class RawImageEmbed extends Embed {

  /** @type {json[]} */
  images;

  /** @param {json} json */
  constructor(json) {
    super(json);
    this.images = json.images;
  }
}

export class RawLinkEmbed extends Embed {

  /** @type {string | undefined} */
  url;

  /** @type {string | undefined} */
  title;

  /** @type {json | undefined} */
  thumb;

  /** @param {json} json */
  constructor(json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
    this.thumb = json.external.thumb;
  }
}

export class RawVideoEmbed extends Embed {

  /** @type {json | undefined} */
  video;

  /** @param {json} json */
  constructor(json) {
    super(json);
    this.video = json.video;
  }
}

export class RawRecordEmbed extends Embed {

  /** @type {ATProtoRecord} */
  record;

  /** @param {json} json */
  constructor(json) {
    super(json);
    this.record = new ATProtoRecord(json.record);
  }
}

export class RawRecordWithMediaEmbed extends Embed {

  /** @type {ATProtoRecord} */
  record;

  /** @type {Embed} */
  media;

  /** @param {json} json */
  constructor(json) {
    super(json);
    this.record = new ATProtoRecord(json.record.record);
    this.media = Embed.parseRawEmbed(json.media);
  }
}

export class InlineRecordEmbed extends Embed {

  /** @type {ATProtoRecord} */
  record;

  /**
   * app.bsky.embed.record#view
   * @param {json} json
   */
  constructor(json) {
    super(json);
    this.record = parseViewRecord(json.record);
  }
}

export class InlineRecordWithMediaEmbed extends Embed {

  /** @type {ATProtoRecord} */
  record;

  /** @type {Embed} */
  media;

  /**
   * app.bsky.embed.recordWithMedia#view
   * @param {json} json
   */
  constructor(json) {
    super(json);
    this.record = parseViewRecord(json.record.record);
    this.media = Embed.parseInlineEmbed(json.media);
  }
}

export class InlineLinkEmbed extends Embed {

  /** @type {string | undefined} */
  url;

  /** @type {string | undefined} */
  title;

  /** @type {string | undefined} */
  description;

  /** @type {json | undefined} */
  thumb;

  /**
   * app.bsky.embed.external#view
   * @param {json} json
   */
  constructor(json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
    this.description = json.external.description;
    this.thumb = json.external.thumb;
  }
}

export class InlineImageEmbed extends Embed {

  /** @type {json[]} */
  images;

  /**
   * app.bsky.embed.images#view
   * @param {json} json
   */
  constructor(json) {
    super(json);
    this.images = json.images;
  }
}

export class InlineVideoEmbed extends Embed {

  /** @type {string | undefined} */
  playlistURL;

  /** @type {string | undefined} */
  alt;

  /**
   * app.bsky.embed.video#view
   * @param {json} json
   */
  constructor(json) {
    super(json);
    this.playlistURL = json.playlist;
    this.alt = json.alt;
  }
}
