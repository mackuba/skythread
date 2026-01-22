import { atURI, castToInt } from '../utils.js';

/**
 * Generic record type, base class for all records or record view objects.
 */

export class ATProtoRecord {

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
 * Record representing a feed generator.
 */

export class FeedGeneratorRecord extends ATProtoRecord {

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

export class UserListRecord extends ATProtoRecord {

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

export class StarterPackRecord extends ATProtoRecord {

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
