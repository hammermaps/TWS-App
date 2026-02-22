// BuildingStorage.js - Verwendet IndexedDB statt localStorage
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'
import { toRaw } from 'vue'

/**
 * Serialisiert ein Objekt zu einem klonbaren Plain Object
 * Entfernt reactive refs, Promises, Funktionen etc.
 */
function serializeForIndexedDB(data) {
  try {
    // Robustester Ansatz: JSON round-trip mit toRaw auf jedem Element
    if (Array.isArray(data) || (data && typeof data === 'object')) {
      // JSON.stringify/parse entfernt zuverlässig alle Proxy-Wrapper und nicht-klonbare Objekte
      const raw = toRaw(data)
      const serialized = JSON.parse(JSON.stringify(raw, (key, value) => {
        // Promises und Funktionen herausfiltern
        if (value instanceof Promise || typeof value === 'function') {
          return undefined
        }
        return value
      }))
      return serialized
    }
    return data
  } catch (e) {
    // Fallback: Jedes Element einzeln serialisieren
    try {
      if (Array.isArray(data) || (data && data[Symbol.iterator])) {
        const arr = Array.from(data)
        return arr.map(item => {
          try { return JSON.parse(JSON.stringify(toRaw(item))) } catch { return Object.assign({}, toRaw(item)) }
        })
      }
      return JSON.parse(JSON.stringify(toRaw(data)))
    } catch (e2) {
      console.error('❌ Serialisierung fehlgeschlagen:', e2)
      return Array.isArray(data) ? [] : {}
    }
  }
}

const BuildingStorage = {
  async saveBuildings(buildings) {
    if (!Array.isArray(buildings)) {
      console.error('Buildings data must be an array');
      return false;
    }

    try {
      // Serialisiere die Daten bevor sie gespeichert werden
      // Doppelter JSON round-trip um sicherzustellen dass keine reaktiven Proxies übrig bleiben
      let serializedBuildings
      try {
        // Erster Versuch: strukturierter Clone via JSON
        const raw = JSON.parse(JSON.stringify(Array.from(buildings), (key, value) => {
          if (value instanceof Promise || typeof value === 'function') return undefined
          if (value !== null && typeof value === 'object' && typeof value.then === 'function') return undefined
          return value
        }))
        serializedBuildings = raw
      } catch (e) {
        // Fallback: jedes Element einzeln serialisieren
        serializedBuildings = Array.from(buildings).map(b => {
          try {
            const plain = {}
            for (const k of Object.keys(Object(b))) {
              const v = b[k]
              if (v instanceof Promise || typeof v === 'function') continue
              plain[k] = (typeof v === 'object' && v !== null) ? JSON.parse(JSON.stringify(v)) : v
            }
            return plain
          } catch { return {} }
        })
      }

      // Store as a single document with key 'buildings'
      await indexedDBHelper.set(STORES.BUILDINGS, {
        id: 'buildings',
        data: serializedBuildings,
        timestamp: Date.now()
      });
      console.log('💾 Buildings in IndexedDB gespeichert:', serializedBuildings.length);
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Buildings:', error);
      return false;
    }
  },

  async getBuildings() {
    try {
      const result = await indexedDBHelper.get(STORES.BUILDINGS, 'buildings');
      if (result && result.data) {
        console.log('📦 Buildings aus IndexedDB geladen:', result.data.length);
        return result.data;
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Buildings:', error);
    }
    return [];
  },

  async clearBuildings() {
    try {
      await indexedDBHelper.delete(STORES.BUILDINGS, 'buildings');
      console.log('🗑️ Buildings aus IndexedDB entfernt');
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Buildings:', error);
      return false;
    }
  },

  async getTimestamp() {
    try {
      const result = await indexedDBHelper.get(STORES.BUILDINGS, 'buildings');
      return result?.timestamp || null;
    } catch {
      return null;
    }
  }
};

export default BuildingStorage;
