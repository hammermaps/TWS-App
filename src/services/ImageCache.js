// Simple IndexedDB wrapper for caching user avatar images as base64
// Stores records in DB 'wls-image-cache', store 'avatars' with key = userId (string)

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'))
    }
    const request = window.indexedDB.open('wls-image-cache', 1)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('avatars')) {
        db.createObjectStore('avatars', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getTransaction(storeName, mode = 'readonly') {
  const db = await openDB()
  return db.transaction([storeName], mode).objectStore(storeName)
}

export default {
  async get(userId) {
    if (!userId) return null
    try {
      const store = await getTransaction('avatars', 'readonly')
      return await new Promise((resolve, reject) => {
        const req = store.get(String(userId))
        req.onsuccess = () => resolve(req.result || null)
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.warn('ImageCache.get error', e)
      return null
    }
  },

  async set(userId, base64) {
    if (!userId || !base64) return false
    try {
      const db = await openDB()
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(['avatars'], 'readwrite')
        const store = tx.objectStore('avatars')
        const payload = { id: String(userId), base64, ts: Date.now() }
        const req = store.put(payload)
        req.onsuccess = () => resolve(true)
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.warn('ImageCache.set error', e)
      return false
    }
  },

  async remove(userId) {
    if (!userId) return false
    try {
      const db = await openDB()
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(['avatars'], 'readwrite')
        const store = tx.objectStore('avatars')
        const req = store.delete(String(userId))
        req.onsuccess = () => resolve(true)
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.warn('ImageCache.remove error', e)
      return false
    }
  }
}
