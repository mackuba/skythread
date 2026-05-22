import { Minisky } from './minisky.js';

/**
 * API client for connecting to the Microcosm Constellation API.
 */

export class ConstellationAPI extends Minisky {

  constructor(host: string) {
    super(host);
  }

  async getReplies(uri: string): Promise<string[]> {
    let results = await this.fetchAll('blue.microcosm.links.getBacklinks', {
      field: 'records',
      params: {
        subject: uri,
        source: 'app.bsky.feed.post:reply.parent.uri',
        limit: 100
      }
    });

    return results.map((x: json) => `at://${x.did}/${x.collection}/${x.rkey}`);
  }
}
