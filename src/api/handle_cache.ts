/**
 * Caches the mapping of handles to DIDs to avoid unnecessary API calls to resolveHandle or getProfile.
 */

type HandleMap = Record<string, string>;

export class HandleCache {
  cache?: HandleMap

  prepareCache(): asserts this is { cache: HandleMap } {
    if (!this.cache) {
      let savedCache = localStorage.getItem('handleCache');
      this.cache = (savedCache ? JSON.parse(savedCache) : {}) as HandleMap;
    }
  }

  saveCache() {
    localStorage.setItem('handleCache', JSON.stringify(this.cache));
  }

  getHandleDid(handle: string): string | undefined {
    this.prepareCache();
    return this.cache[handle];
  }

  setHandleDid(handle: string, did: string) {
    this.prepareCache();
    this.cache[handle] = did;
    this.saveCache();
  }

  findHandleByDid(did: string) {
    this.prepareCache();
    let found = Object.entries(this.cache).find((e) => e[1] == did);
    return found ? found[0] : undefined;
  }
}
