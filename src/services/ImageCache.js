import indexedDBHelper, { STORES } from '../utils/IndexedDBHelper.js'

class ImageCache {
  async get(userId) {
    try {
      const entry = await indexedDBHelper.get(STORES.IMAGES, String(userId))
      return entry || null
    } catch (e) {
      return null
    }
  }

  async set(userId, base64) {
    try {
      await indexedDBHelper.set(STORES.IMAGES, {
        key: String(userId),
        base64,
        ts: Date.now()
      })
    } catch (e) {
      return false
    }
  }

  async remove(userId) {
    try {
      await indexedDBHelper.delete(STORES.IMAGES, String(userId))
    } catch (e) {
      return false
    }
  }
}

export default new ImageCache()
