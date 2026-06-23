// MeterStorage.js - Zähler-Cache in IndexedDB
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

/**
 * Speicher für Zähler-Stammdaten (offline-Cache)
 * Jeder Zähler wird einzeln unter seiner ID abgelegt (keyPath: 'id').
 */
const MeterStorage = {
  /**
   * Lädt alle gespeicherten Zähler, optional gefiltert nach Gebäude
   * @param {number|null} buildingId
   * @returns {Promise<Array>}
   */
  async getMeters(buildingId = null) {
    try {
      const all = await indexedDBHelper.getAll(STORES.METERS)
      if (!Array.isArray(all)) return []
      if (buildingId !== null) {
        return all.filter(m => m.building_id === buildingId)
      }
      return all
    } catch (error) {
      console.error('❌ Fehler beim Laden der Zähler:', error)
      return []
    }
  },

  /**
   * Speichert eine Liste von Zählern (ersetzt den gesamten Cache)
   * @param {Array} meters
   * @returns {Promise<void>}
   */
  async setMeters(meters) {
    if (!Array.isArray(meters)) {
      console.error('❌ MeterStorage.setMeters: Kein Array übergeben')
      return
    }
    try {
      await indexedDBHelper.clear(STORES.METERS)
      for (const meter of meters) {
        await indexedDBHelper.set(STORES.METERS, meter)
      }
      console.log(`💾 ${meters.length} Zähler in IndexedDB gespeichert`)
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Zähler:', error)
      throw error
    }
  },

  /**
   * Lädt einen einzelnen Zähler nach ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getMeter(id) {
    try {
      return await indexedDBHelper.get(STORES.METERS, id)
    } catch (error) {
      console.error(`❌ Fehler beim Laden des Zählers ${id}:`, error)
      return null
    }
  },

  /**
   * Fügt einen Zähler hinzu oder aktualisiert ihn
   * @param {Object} meter
   * @returns {Promise<void>}
   */
  async updateMeter(meter) {
    try {
      await indexedDBHelper.set(STORES.METERS, meter)
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Zählers:', error)
      throw error
    }
  },

  /**
   * Löscht alle gespeicherten Zähler
   * @returns {Promise<void>}
   */
  async clearMeters() {
    try {
      await indexedDBHelper.clear(STORES.METERS)
      console.log('🗑️ Zähler-Cache geleert')
    } catch (error) {
      console.error('❌ Fehler beim Leeren des Zähler-Cache:', error)
      throw error
    }
  },

  /**
   * Gibt den Zeitstempel des letzten Syncs zurück (falls im Metadata-Store abgelegt)
   * @returns {Promise<number|null>}
   */
  async getTimestamp() {
    try {
      const result = await indexedDBHelper.get(STORES.METADATA, 'meters_last_sync')
      return result?.value || null
    } catch {
      return null
    }
  },

  /**
   * Speichert den Zeitstempel des letzten Syncs
   * @returns {Promise<void>}
   */
  async setTimestamp() {
    try {
      await indexedDBHelper.set(STORES.METADATA, { key: 'meters_last_sync', value: Date.now() })
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Zeitstempels:', error)
    }
  },
}

export default MeterStorage
