import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

export class ImageCache {
  /**
   * Retrieves a cached image for a user
   * @param {string|number} userId
   * @returns {Promise<{base64: string, ts: number}|null>}
   */
  static async get(userId) {
    try {
      const key = `profile_image_${userId}`
      const result = await indexedDBHelper.get(STORES.METADATA, key)
      if (result && result.value) {
        return result.value
      }
    } catch (e) {
      console.warn('ImageCache.get failed:', e)
    }
    return null
  }

  /**
   * Caches an image for a user
   * @param {string|number} userId
   * @param {string} base64
   * @returns {Promise<boolean>}
   */
  static async set(userId, base64) {
    try {
      const key = `profile_image_${userId}`
      const value = {
        base64,
        ts: Date.now()
      }
      await indexedDBHelper.set(STORES.METADATA, { key, value })
      return true
    } catch (e) {
      console.warn('ImageCache.set failed:', e)
      return false
    }
  }

  /**
   * Removes a cached image for a user
   * @param {string|number} userId
   * @returns {Promise<boolean>}
   */
  static async remove(userId) {
    try {
      const key = `profile_image_${userId}`
      await indexedDBHelper.delete(STORES.METADATA, key)
      return true
    } catch (e) {
      console.warn('ImageCache.remove failed:', e)
      return false
    }
  }
}

export default ImageCache
