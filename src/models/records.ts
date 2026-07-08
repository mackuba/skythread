import { atURI, castToInt } from '../utils.js';

/**
 * Generic record type, base class for all records or record view objects.
 */

export class ATProtoRecord {
  data: json;

  constructor(data: json, extra?: json) {
    this.data = data;
    Object.assign(this, extra ?? {});
  }

  get uri(): string {
    return this.data.uri;
  }

  get cid(): string {
    return this.data.cid;
  }

  get rkey(): string {
    return atURI(this.uri).rkey;
  }

  get type(): string {
    return this.data.$type;
  }
}

/**
 * Record representing a feed generator.
 */

export class FeedGeneratorRecord extends ATProtoRecord {
  author: json;

  constructor(data: json) {
    super(data);
    this.author = data.creator;
  }

  get title(): string | undefined {
    return this.data.displayName;
  }

  get description(): string | undefined {
    return this.data.description;
  }

  get likeCount(): number | null | undefined {
    return castToInt(this.data.likeCount);
  }

  get avatar(): string | undefined {
    return this.data.avatar;
  }
}

/**
 * Record representing a user list or moderation list.
 */

export class UserListRecord extends ATProtoRecord {
  author: json;

  constructor(data: json) {
    super(data);
    this.author = data.creator;
  }

  get title(): string | undefined {
    return this.data.name;
  }

  get purpose(): string | undefined {
    return this.data.purpose;
  }

  get description(): string | undefined {
    return this.data.description;
  }

  get avatar(): string | undefined {
    return this.data.avatar;
  }
}

/**
 * Record representing a starter pack.
 */

export class StarterPackRecord extends ATProtoRecord {
  author: json;

  constructor(data: json) {
    super(data);
    this.author = data.creator;
  }

  get title(): string | undefined {
    return this.data.record.name;
  }

  get description(): string | undefined {
    return this.data.record.description;
  }
}
