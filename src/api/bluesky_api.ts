import { HandleCache } from './handle_cache.js';
import { appView, blueAPI, constellationAPI, slingshotAPI } from '../api.js';
import { APIError, Minisky, type FetchAllOnPageLoad, type MiniskyConfig, type MiniskyOptions, type MiniskyRequestOptions } from './minisky.js';
import { atURI, feedPostTime } from '../utils.js';
import { Post } from '../models/posts.js';
import { parseBlueskyPostURL } from '../router.js';

export { APIError };

export const blueskyLabellerDID = 'did:plc:ar7c4by46qjdydhdevvrndac';

/**
 * Thrown when the response is technically a "success" one, but the returned data is not what it should be.
 */

export class ResponseDataError extends Error {}

/**
 * Thrown when the passed URL is not a supported post URL on bsky.app.
 */

export class URLError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type AuthorFeedFilter =
  | 'posts_with_replies'          // posts, replies and reposts (default)
  | 'posts_no_replies'            // posts and reposts (no replies)
  | 'posts_and_author_threads'    // posts, reposts, and replies in your own threads
  | 'posts_with_media'            // posts and replies, but only with images (no reposts)
  | 'posts_with_video';           // posts and replies, but only with videos (no reposts)

export type TimelineFetchOptions = {
  onPageLoad?: FetchAllOnPageLoad;
  keepLastPage?: boolean;
  abortSignal?: AbortSignal;
}

/**
 * API client for connecting to the Bluesky XRPC API (authenticated or not).
 */

export class BlueskyAPI extends Minisky {
  handleCache: HandleCache;
  profiles: Record<string, json>;

  constructor(host: string | null, config?: MiniskyConfig | null, options?: MiniskyOptions | null) {
    super(host, config, options);

    this.handleCache = new HandleCache();
    this.profiles = {};
  }

  cacheProfile(author: json) {
    this.profiles[author.did] = author;
    this.profiles[author.handle] = author;
    this.handleCache.setHandleDid(author.handle, author.did);
  }

  async fetchHandleForDid(did: string): Promise<string> {
    let cachedHandle = this.handleCache.findHandleByDid(did);

    if (cachedHandle) {
      return cachedHandle;
    } else {
      let author = await this.loadUserProfile(did);
      return author.handle;
    }
  }

  async resolveHandle(handle: string): Promise<string> {
    let cachedDid = this.handleCache.getHandleDid(handle);

    if (cachedDid) {
      return cachedDid;
    } else {
      let json = await this.getRequest('com.atproto.identity.resolveHandle', { handle }, { auth: false });
      let did = json['did'];

      if (did) {
        this.handleCache.setHandleDid(handle, did);
        return did;
      } else {
        throw new ResponseDataError('Missing DID in response: ' + JSON.stringify(json));
      }
    }
  }

  async loadThreadByURL(url: string): Promise<json> {
    let { user, post } = parseBlueskyPostURL(url);
    return await this.loadThreadById(user, post);
  }

  async loadThreadById(author: string, postId: string): Promise<json> {
    let did = author.startsWith('did:') ? author : await this.resolveHandle(author);
    let postURI = `at://${did}/app.bsky.feed.post/${postId}`;
    return await this.loadThreadByAtURI(postURI);
  }

  async loadThreadByAtURI(uri: string): Promise<json> {
    return await this.getRequest('app.bsky.feed.getPostThread', { uri: uri, depth: 10 });
  }

  async loadUserProfile(handle: string, full: boolean = false, options: MiniskyRequestOptions = {}): Promise<json> {
    if (this.profiles[handle] && (!full || 'description' in this.profiles[handle])) {
      return this.profiles[handle];
    }

    let profile = await this.getRequest('app.bsky.actor.getProfile', { actor: handle }, options);
    this.cacheProfile(profile);
    return profile;
  }

  async autocompleteUsers(query: string): Promise<json[]> {
    let json = await this.getRequest('app.bsky.actor.searchActorsTypeahead', { q: query });
    return json.actors;
  }

  async getHashtagFeed(hashtag: string, cursor?: string): Promise<json> {
    let params: Record<string, any> = { q: '#' + hashtag, limit: 50, sort: 'latest' };

    if (cursor) {
      params['cursor'] = cursor;
    }

    return await this.getRequest('app.bsky.feed.searchPosts', params);
  }

  async checkIfProfileHasNeedsReview(did: string): Promise<boolean> {
    let profile = await this.getRequest('app.bsky.actor.getProfile', { actor: did },
      { headers: { 'atproto-accept-labelers': blueskyLabellerDID }}
    );

    return profile.labels?.some((x: json) => (x.src == blueskyLabellerDID && x.val == 'needs-review'));
  }

  async loadHiddenReplyURIs(post: Post): Promise<string[]> {
    let [constellationReplies, blueReplies] = await Promise.all([
      constellationAPI.getReplies(post.uri),
      blueAPI.getReplies(post.uri).catch(() => [])
    ]);

    let expectedReplyURIs = Array.from(new Set(constellationReplies.concat(blueReplies)));
    let existingReplies = new Set(post.replies.map(x => x.uri));
    let missingReplyURIs = expectedReplyURIs.filter(r => !existingReplies.has(r));

    missingReplyURIs.sort((a, b) => {
      let arkey = a.split('/').at(-1)!
      let brkey = b.split('/').at(-1)!
      return arkey.localeCompare(brkey);
    });

    return missingReplyURIs;
  }

  async loadMiniDocWithStatus(did: string): Promise<json> {
    let doc = await slingshotAPI.getRequest("blue.microcosm.identity.resolveMiniDoc", { identifier: did });

    try {
      let pds = new Minisky(doc.pds);

      let loadInfo = pds.getRequest('com.atproto.sync.getRepoStatus', { did: did });
      let loadProfile = appView.loadUserProfile(did).catch(() => null);

      let [info, profile] = await Promise.all([loadInfo, loadProfile]);

      doc.active = info.active;
      doc.status = info.status;

      if (profile) {
        doc.profile = profile;
      }
    } catch (error) {
      doc.pdsError = error;
    }

    return doc;
  }

  async loadUserTimeline(
    did: string,
    days: number,
    options: { filter: AuthorFeedFilter } & TimelineFetchOptions
  ): Promise<json[]> {
    let now = new Date();
    let timeLimit = now.getTime() - days * 86400 * 1000;
    let { filter, ...fetchOptions } = options;

    return await this.fetchAll('app.bsky.feed.getAuthorFeed', {
      params: {
        actor: did,
        filter: filter,
        limit: 100
      },
      field: 'feed',
      breakWhen: (x: json) => feedPostTime(x) < timeLimit,
      ...fetchOptions
    });
  }

  async loadListTimeline(list: string, days: number, options: TimelineFetchOptions = {}): Promise<json[]> {
    let now = new Date();
    let timeLimit = now.getTime() - days * 86400 * 1000;

    return await this.fetchAll('app.bsky.feed.getListFeed', {
      params: {
        list: list,
        limit: 100
      },
      field: 'feed',
      breakWhen: (x: json) => feedPostTime(x) < timeLimit,
      ...options
    });
  }

  async loadPost(postURI: string): Promise<json> {
    let posts = await this.loadPosts([postURI]);

    if (posts.length == 1) {
      return posts[0];
    } else {
      throw new ResponseDataError('Post not found');
    }
  }

  async loadPostIfExists(postURI: string): Promise<json | undefined> {
    let posts = await this.loadPosts([postURI]);
    return posts[0];
  }

  async loadPosts(uris: string[]): Promise<json[]> {
    if (uris.length > 0) {
      let response = await this.getRequest('app.bsky.feed.getPosts', { uris });
      return response.posts;
    } else {
      return [];
    }
  }

  async loadPostViewerInfo(post: Post): Promise<json | undefined> {
    let data = await this.loadPostIfExists(post.uri);

    if (data) {
      post.author = data.author;
      post.viewerData = data.viewer;
      post.viewerLike = data.viewer?.like;
    }

    return data;
  }

  async reloadBlockedPost(uri: string): Promise<Post | null> {
    let { repo } = atURI(uri);

    let loadPost = appView.loadPostIfExists(uri);
    let loadProfile = this.getRequest('app.bsky.actor.getProfile', { actor: repo });

    let data = await loadPost;

    if (!data) {
      return null;
    }

    let profile = await loadProfile;

    return new Post(data, { author: profile });
  }
}
