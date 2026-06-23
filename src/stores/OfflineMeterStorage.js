/**
 * OfflineMeterStorage.js
 * Verwaltung von offline erfassten Zählerständen in IndexedDB
 *
 * Datenstruktur eines Offline-Eintrags:
 * {
 *   localId:       string,        // UUID – primärer Schlüssel & Server-Dedup-Key
 *   meterId:       number,
 *   buildingId:    number,
 *   meter_type:    string,        // 'water' | 'power' | 'heating'
 *   reading_value: number,
 *   reading_date:  string,        // 'YYYY-MM-DD'
 *   reading_time:  string|null,   // 'HH:MM' optional
 *   note:          string,
 *   synced:        0|1,           // 0 = ausstehend, 1 = synchronisiert
 *   createdAt:     string,        // ISO datetime
 *   syncedAt:      string|null,
 * }
 */

import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

class OfflineMeterStorage {
  /**
   * Generiert eine neue UUID für den localId-Schlüssel
   * @returns {string}
   */
  _generateLocalId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    // Fallback für ältere Umgebungen
    return `offline_meter_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Speichert einen Zählerstand offline (synced = 0)
   * @param {Object} data - Zählerstand-Daten
   * @returns {Promise<Object>} - Gespeicherter Eintrag inkl. localId
   */
  async saveOfflineReading(data) {
    const reading = {
      localId:       data.localId || this._generateLocalId(),
      meterId:       Number(data.meterId) || 0,
      buildingId:    Number(data.buildingId) || 0,
      meter_type:    String(data.meter_type || 'water'),
      reading_value: Number(data.reading_value) || 0,
      reading_date:  String(data.reading_date || ''),
      reading_time:  data.reading_time ? String(data.reading_time) : null,
      note:          String(data.note || ''),
      synced:        0,
      createdAt:     new Date().toISOString(),
      syncedAt:      null,
    }

    console.log('💾 Speichere Offline-Zählerstand:', reading)

    try {
      await indexedDBHelper.set(STORES.OFFLINE_METER_READINGS, reading)
      console.log('✅ Offline-Zählerstand in IndexedDB gespeichert:', reading.localId)
      return reading
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Offline-Zählerstands:', error)
      throw error
    }
  }

  /**
   * Lädt alle noch nicht synchronisierten Einträge (Sync-Queue)
   * @returns {Promise<Array>}
   */
  async getQueue() {
    try {
      const all = await indexedDBHelper.getAll(STORES.OFFLINE_METER_READINGS)
      const pending = Array.isArray(all)
        ? all.filter(r => r.synced === 0 || r.synced === false || r.synced === '0')
        : []
      console.log(`📤 ${pending.length} Zählerstände in der Sync-Queue`)
      return pending
    } catch (error) {
      console.error('❌ Fehler beim Laden der Sync-Queue:', error)
      return []
    }
  }

  /**
   * Lädt alle Einträge für einen bestimmten Zähler (synced und pending)
   * @param {number} meterId
   * @returns {Promise<Array>}
   */
  async getAllForMeter(meterId) {
    try {
      const parsedId = Number(meterId)
      if (isNaN(parsedId)) {
        console.warn('⚠️ getAllForMeter: Ungültige meterId:', meterId)
        return []
      }
      const results = await indexedDBHelper.getAllByIndex(
        STORES.OFFLINE_METER_READINGS,
        'meterId',
        parsedId
      )
      return Array.isArray(results) ? results : []
    } catch (error) {
      console.error('❌ Fehler beim Laden der Zählerstände für Meter', meterId, ':', error)
      return []
    }
  }

  /**
   * Markiert einen Eintrag als erfolgreich synchronisiert
   * @param {string} localId
   * @returns {Promise<void>}
   */
  async markAsSynced(localId) {
    try {
      const reading = await indexedDBHelper.get(STORES.OFFLINE_METER_READINGS, localId)
      if (reading) {
        reading.synced    = 1
        reading.syncedAt  = new Date().toISOString()
        await indexedDBHelper.set(STORES.OFFLINE_METER_READINGS, reading)
        console.log('✅ Zählerstand als synchronisiert markiert:', localId)
      } else {
        console.warn('⚠️ markAsSynced: Eintrag nicht gefunden:', localId)
      }
    } catch (error) {
      console.error('❌ Fehler beim Markieren als synchronisiert:', error)
      throw error
    }
  }

  /**
   * Entfernt einen Eintrag aus IndexedDB
   * @param {string} localId
   * @returns {Promise<void>}
   */
  async remove(localId) {
    try {
      await indexedDBHelper.delete(STORES.OFFLINE_METER_READINGS, localId)
      console.log('🗑️ Offline-Zählerstand gelöscht:', localId)
    } catch (error) {
      console.error('❌ Fehler beim Löschen des Offline-Zählerstands:', error)
      throw error
    }
  }

  /**
   * Gibt Statistiken über offline gespeicherte Zählerstände zurück
   * @returns {Promise<{total: number, pending: number, synced: number}>}
   */
  async getStats() {
    try {
      const all = await indexedDBHelper.getAll(STORES.OFFLINE_METER_READINGS)
      if (!Array.isArray(all)) return { total: 0, pending: 0, synced: 0 }

      const synced  = all.filter(r => r.synced === 1 || r.synced === true).length
      const pending = all.filter(r => r.synced === 0 || r.synced === false || r.synced === '0').length

      return {
        total:   all.length,
        pending,
        synced,
      }
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Statistiken:', error)
      return { total: 0, pending: 0, synced: 0 }
    }
  }

  /**
   * Bereinigt synchronisierte Einträge die älter als 30 Tage sind
   * @returns {Promise<number>} Anzahl der gelöschten Einträge
   */
  async cleanupOld() {
    try {
      const all = await indexedDBHelper.getAll(STORES.OFFLINE_METER_READINGS)
      if (!Array.isArray(all)) return 0

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      let deletedCount = 0

      for (const reading of all) {
        if (reading.synced === 1 && reading.syncedAt) {
          const syncDate = new Date(reading.syncedAt)
          if (syncDate < thirtyDaysAgo) {
            await indexedDBHelper.delete(STORES.OFFLINE_METER_READINGS, reading.localId)
            deletedCount++
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`🧹 Bereinigung: ${deletedCount} alte Zählerstände entfernt`)
      }

      return deletedCount
    } catch (error) {
      console.error('❌ Fehler bei der Bereinigung:', error)
      return 0
    }
  }

  /**
   * Löscht alle gespeicherten Offline-Zählerstände (für Debugging/Reset)
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await indexedDBHelper.clear(STORES.OFFLINE_METER_READINGS)
      console.log('🗑️ Alle Offline-Zählerstände gelöscht')
    } catch (error) {
      console.error('❌ Fehler beim Löschen aller Offline-Zählerstände:', error)
      throw error
    }
  }
}

// Singleton-Instanz
const offlineMeterStorage = new OfflineMeterStorage()

/**
 * Composable für Vue-Komponenten
 * @returns {OfflineMeterStorage}
 */
export function useOfflineMeterStorage() {
  return offlineMeterStorage
}

export default offlineMeterStorage
