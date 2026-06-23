/**
 * IndexedDBHelper.js
 * Modern IndexedDB wrapper with async/await support for PWA data persistence
 * Replaces localStorage with a more robust storage solution
 */

const DB_NAME = 'TWS_APP_DB'
const DB_VERSION = 4

// Object stores (tables) definition
const STORES = {
  CONFIG: 'config',
  APARTMENTS: 'apartments',
  BUILDINGS: 'buildings',
  OFFLINE_FLUSHES: 'offline_flushes',
  AUTH: 'auth',
  USER: 'user',
  SETTINGS: 'settings',
  METADATA: 'metadata',
  IMAGES: 'images',
  METERS: 'meters',
  OFFLINE_METER_READINGS: 'offline_meter_readings',
}

class IndexedDBHelper {
  constructor() {
    this.db = null
    this.dbReady = false
    this.initPromise = null
  }

  /**
   * Initialize the database
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    // Return existing promise if initialization is already in progress
    if (this.initPromise) {
      return this.initPromise
    }

    // Return db if already initialized
    if (this.db && this.dbReady) {
      return this.db
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('❌ IndexedDB initialization failed:', request.error)
        this.dbReady = false
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.dbReady = true
        console.log('✅ IndexedDB initialized successfully')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        const oldVersion = event.oldVersion
        console.log(`🔧 Upgrading IndexedDB schema from v${oldVersion} to v${DB_VERSION}...`)

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          db.createObjectStore(STORES.CONFIG, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(STORES.APARTMENTS)) {
          const apartmentStore = db.createObjectStore(STORES.APARTMENTS, { keyPath: 'id', autoIncrement: true })
          apartmentStore.createIndex('buildingId', 'buildingId', { unique: false })
          apartmentStore.createIndex('apartmentId', 'apartmentId', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.BUILDINGS)) {
          db.createObjectStore(STORES.BUILDINGS, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(STORES.OFFLINE_FLUSHES)) {
          const flushStore = db.createObjectStore(STORES.OFFLINE_FLUSHES, { keyPath: 'id' })
          flushStore.createIndex('apartmentId', 'apartmentId', { unique: false })
          flushStore.createIndex('buildingId', 'buildingId', { unique: false })
          flushStore.createIndex('synced', 'synced', { unique: false })
        } else if (oldVersion < 2) {
          // Store existiert bereits - fehlende Indizes nachrüsten
          const transaction = event.target.transaction
          const flushStore = transaction.objectStore(STORES.OFFLINE_FLUSHES)
          if (!flushStore.indexNames.contains('synced')) {
            flushStore.createIndex('synced', 'synced', { unique: false })
            console.log('✅ synced-Index für offline_flushes erstellt')
          }
          if (!flushStore.indexNames.contains('apartmentId')) {
            flushStore.createIndex('apartmentId', 'apartmentId', { unique: false })
          }
          if (!flushStore.indexNames.contains('buildingId')) {
            flushStore.createIndex('buildingId', 'buildingId', { unique: false })
          }
        }

        if (!db.objectStoreNames.contains(STORES.AUTH)) {
          db.createObjectStore(STORES.AUTH, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(STORES.USER)) {
          db.createObjectStore(STORES.USER, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          db.createObjectStore(STORES.IMAGES, { keyPath: 'key' })
        }

        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains(STORES.METERS)) {
            db.createObjectStore(STORES.METERS, { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains(STORES.OFFLINE_METER_READINGS)) {
            const meterReadingStore = db.createObjectStore(STORES.OFFLINE_METER_READINGS, { keyPath: 'localId' })
            meterReadingStore.createIndex('meterId', 'meterId', { unique: false })
            meterReadingStore.createIndex('synced', 'synced', { unique: false })
            meterReadingStore.createIndex('meter_type', 'meter_type', { unique: false })
          }
        }

        console.log('✅ IndexedDB schema upgrade complete')
      }
    })

    return this.initPromise
  }

  /**
   * Get a value from a store
   * @param {string} storeName - Name of the object store
   * @param {string|number} key - Key to retrieve
   * @returns {Promise<any>}
   */
  async get(storeName, key) {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(key)

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`❌ Error getting key "${key}" from store "${storeName}":`, error)
      throw error
    }
  }

  /**
   * Set a value in a store
   * @param {string} storeName - Name of the object store
   * @param {any} value - Value to store (must include key property matching keyPath)
   * @returns {Promise<void>}
   */
  async set(storeName, value) {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.put(value)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`❌ Error setting value in store "${storeName}":`, error)
      throw error
    }
  }

  /**
   * Delete a value from a store
   * @param {string} storeName - Name of the object store
   * @param {string|number} key - Key to delete
   * @returns {Promise<void>}
   */
  async delete(storeName, key) {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.delete(key)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`❌ Error deleting key "${key}" from store "${storeName}":`, error)
      throw error
    }
  }

  /**
   * Get all values from a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<Array>}
   */
  async getAll(storeName) {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`❌ Error getting all from store "${storeName}":`, error)
      throw error
    }
  }

  /**
   * Get all values from an index
   * @param {string} storeName - Name of the object store
   * @param {string} indexName - Name of the index
   * @param {any} query - Query value for the index
   * @returns {Promise<Array>}
   */
  async getAllByIndex(storeName, indexName, query) {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const index = store.index(indexName)

        // Für Boolean-Werte: Verwende Cursor-basierte Filterung
        // IndexedDB's getAll() funktioniert nicht zuverlässig mit Boolean-Werten
        if (typeof query === 'boolean') {
          const results = []
          const request = index.openCursor()

          request.onsuccess = (event) => {
            const cursor = event.target.result
            if (cursor) {
              // Prüfe ob der Wert mit der Query übereinstimmt
              if (cursor.value[indexName] === query) {
                results.push(cursor.value)
              }
              cursor.continue()
            } else {
              // Alle Einträge verarbeitet
              resolve(results)
            }
          }
          request.onerror = () => reject(request.error)
        } else {
          // Für andere Werte: Standard getAll
          const request = index.getAll(query)
          request.onsuccess = () => resolve(request.result || [])
          request.onerror = () => reject(request.error)
        }
      })
    } catch (error) {
      console.error(`❌ Error getting from index "${indexName}" in store "${storeName}":`, error)
      throw error
    }
  }

  /**
   * Clear all data from a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`❌ Error clearing store "${storeName}":`, error)
      throw error
    }
  }

  /**
   * Count items in a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<number>}
   */
  async count(storeName) {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.count()

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`❌ Error counting items in store "${storeName}":`, error)
      throw error
    }
  }

  /**
   * Perform multiple operations in a single transaction
   * @param {string} storeName - Name of the object store
   * @param {Function} callback - Callback function that receives the object store
   * @returns {Promise<any>}
   */
  async transaction(storeName, callback) {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)

        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)

        try {
          callback(store)
        } catch (error) {
          reject(error)
        }
      })
    } catch (error) {
      console.error(`❌ Error in transaction for store "${storeName}":`, error)
      throw error
    }
  }

  /**
   * Delete all data and reset the database
   * @returns {Promise<void>}
   */
  async deleteDatabase() {
    try {
      if (this.db) {
        this.db.close()
        this.db = null
        this.dbReady = false
        this.initPromise = null
      }

      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME)

        request.onsuccess = () => {
          console.log('✅ Database deleted successfully')
          resolve()
        }

        request.onerror = () => {
          console.error('❌ Error deleting database:', request.error)
          reject(request.error)
        }

        request.onblocked = () => {
          console.warn('⚠️ Database deletion blocked - close all connections')
        }
      })
    } catch (error) {
      console.error('❌ Error in deleteDatabase:', error)
      throw error
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      await this.init()

      const stats = {
        name: DB_NAME,
        version: DB_VERSION,
        stores: {}
      }

      for (const storeName of Object.values(STORES)) {
        const count = await this.count(storeName)
        stats.stores[storeName] = { count }
      }

      return stats
    } catch (error) {
      console.error('❌ Error getting database stats:', error)
      throw error
    }
  }
}

// Singleton instance
const indexedDBHelper = new IndexedDBHelper()

// Export singleton and constants
export { STORES }
export default indexedDBHelper
