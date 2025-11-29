import { URLError } from '../api.js';

export class AtURI {
  repo: string;
  collection: string;
  rkey: string;

  constructor(uri: string) {
    if (!uri.startsWith('at://')) {
      throw new URLError(`Not an at:// URI: ${uri}`);
    }

    let parts = uri.split('/');

    if (parts.length != 5) {
      throw new URLError(`Invalid at:// URI: ${uri}`);
    }

    this.repo = parts[2];
    this.collection = parts[3];
    this.rkey = parts[4];
  }
}

export function atURI(uri: string): AtURI {
  return new AtURI(uri);
}
