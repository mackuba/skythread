import { ATProtoRecord } from './records.js';
import { PostDataError, parseViewRecord } from './posts.js';

/**
 * Base class for embed objects.
 */

export class Embed {
  json: json;

  /** More hydrated view of an embed, taken from a full post view (#postView) */

  static parseInlineEmbed(json: json): Embed {
    switch (json.$type) {
    case 'app.bsky.embed.record#view':
      return new InlineRecordEmbed(json);

    case 'app.bsky.embed.recordWithMedia#view':
      return new InlineRecordWithMediaEmbed(json);

    case 'app.bsky.embed.images#view':
      return new InlineImageEmbed(json);

    case 'app.bsky.embed.gallery#view':
      return new InlineGalleryEmbed(json);

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

  /** Raw embed extracted from raw record data of a post. Does not include quoted post contents */

  static parseRawEmbed(json: json): Embed {
    switch (json.$type) {
    case 'app.bsky.embed.record':
      return new RawRecordEmbed(json);

    case 'app.bsky.embed.recordWithMedia':
      return new RawRecordWithMediaEmbed(json);

    case 'app.bsky.embed.images':
      return new RawImageEmbed(json);

    case 'app.bsky.embed.gallery':
      return new RawGalleryEmbed(json);

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

  constructor(json: json) {
    this.json = json;
  }

  get type(): string {
    return this.json.$type;
  }
}

function filterGalleryItems(items: json[] | undefined, imageType: string): json[] {
  return (items ?? []).filter(item => {
    if (item.$type == imageType) {
      return true;
    } else {
      console.error('Unexpected gallery item type:', item.$type);
      return false;
    }
  });
}

export class RawImageEmbed extends Embed {
  images: json[];

  constructor(json: json) {
    super(json);
    this.images = json.images;
  }
}

export class RawGalleryEmbed extends Embed {
  images: json[];

  constructor(json: json) {
    super(json);
    this.images = filterGalleryItems(json.items, 'app.bsky.embed.gallery#image');
  }
}

export class RawLinkEmbed extends Embed {
  url: string | undefined;
  title: string | undefined;
  thumb: json | undefined;
  description: string | undefined;

  constructor(json: json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
    this.thumb = json.external.thumb;
    this.description = json.external.description;
  }
}

export class RawVideoEmbed extends Embed {
  video: json | undefined;
  alt: string | undefined;

  constructor(json: json) {
    super(json);
    this.video = json.video;
    this.alt = json.alt;
  }
}

export class RawRecordEmbed extends Embed {
  record: ATProtoRecord;

  constructor(json: json) {
    super(json);
    this.record = new ATProtoRecord(json.record);
  }
}

export class RawRecordWithMediaEmbed extends Embed {
  record: ATProtoRecord;
  media: Embed;

  constructor(json: json) {
    super(json);
    this.record = new ATProtoRecord(json.record.record);
    this.media = Embed.parseRawEmbed(json.media);
  }
}

export class InlineRecordEmbed extends Embed {
  record: ATProtoRecord;

  /** app.bsky.embed.record#view */
  constructor(json: json) {
    super(json);
    this.record = parseViewRecord(json.record);
  }
}

export class InlineRecordWithMediaEmbed extends Embed {
  record: ATProtoRecord;
  media: Embed;

  /** app.bsky.embed.recordWithMedia#view */
  constructor(json: json) {
    super(json);
    this.record = parseViewRecord(json.record.record);
    this.media = Embed.parseInlineEmbed(json.media);
  }
}

export class InlineLinkEmbed extends Embed {
  url: string | undefined;
  title: string | undefined;
  description: string | undefined;
  thumb: string | undefined;

  /** app.bsky.embed.external#view */
  constructor(json: json) {
    super(json);

    this.url = json.external.uri;
    this.title = json.external.title;
    this.description = json.external.description;
    this.thumb = json.external.thumb;
  }
}

export class InlineImageEmbed extends Embed {
  images: json[];

  /** app.bsky.embed.images#view */
  constructor(json: json) {
    super(json);
    this.images = json.images;
  }
}

export class InlineGalleryEmbed extends Embed {
  images: json[];

  /** app.bsky.embed.gallery#view */
  constructor(json: json) {
    super(json);
    this.images = filterGalleryItems(json.items, 'app.bsky.embed.gallery#viewImage');
  }
}

export class InlineVideoEmbed extends Embed {
  playlistURL: string | undefined;
  alt: string | undefined;

  /** app.bsky.embed.video#view */
  constructor(json: json) {
    super(json);
    this.playlistURL = json.playlist;
    this.alt = json.alt;
  }
}
