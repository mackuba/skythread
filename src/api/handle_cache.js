/**
 * Caches the mapping of handles to DIDs to avoid unnecessary API calls to resolveHandle or getProfile.
 */

export class HandleCache {
  prepareCache() {
    if (!this.cache) {
      this.cache = JSON.parse(localStorage.getItem('handleCache') ?? '{}');
    }
  }

  saveCache() {
    localStorage.setItem('handleCache', JSON.stringify(this.cache));
  }

  /** @param {string} handle, @returns {string | undefined}  */

  getHandleDid(handle) {
    this.prepareCache();
    return this.cache[handle];
  }

  /** @param {string} handle, @param {string} did */

  setHandleDid(handle, did) {
    this.prepareCache();
    this.cache[handle] = did;
    this.saveCache();
  }

  /** @param {string} did, @returns {string | undefined}  */

  findHandleByDid(did) {
    this.prepareCache();
    let found = Object.entries(this.cache).find((e) => e[1] == did);
    return found ? found[0] : undefined;
  }
}
