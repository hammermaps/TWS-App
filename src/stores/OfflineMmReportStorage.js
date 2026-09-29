/**
 * OfflineMmReportStorage.js
 * Verwaltung von offline erfassten Mängelmeldungen in IndexedDB
 *
 * Datenstruktur eines Offline-Eintrags:
 * {
 *   localId:       string,        // UUID – primärer Schlüssel & Server-Dedup-Key (local_id)
 *   street:        number,
 *   whg:           string,
 *   betreff:       string,
 *   beschreibung:  string,
 *   dringlichkeit: string,        // 'niedrig' | 'normal' | 'hoch' | 'kritisch'
 *   zugeh:         string,        // 'haus' | 'gw' | 'all'
 *   melder:        string,
 *   email:         string,
 *   tel:           string,
 *   photos:        Array<{name: string, dataUrl: string}>,  // Base64, noch nicht hochgeladen
 *   synced:        0|1,           // 0 = ausstehend, 1 = synchronisiert
 *   createdAt:     string,        // ISO datetime
 *   syncedAt:      string|null,
 *   syncedUid:     string|null,   // uid der angelegten Mängelmeldung nach erfolgreichem Sync
 * }
 */

import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

class OfflineMmReportStorage {
  /**
   * Generiert eine neue UUID für den localId-Schlüssel
   * @returns {string}
   */
  _generateLocalId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    // Fallback für ältere Umgebungen
    return `offline_mm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Speichert eine Mängelmeldung offline (synced = 0)
   * @param {Object} data - Mängelmeldungs-Daten
   * @returns {Promise<Object>} - Gespeicherter Eintrag inkl. localId
   */
  async saveOfflineReport(data) {
    const report = {
      localId:       data.localId || this._generateLocalId(),
      street:        Number(data.street) || 0,
      whg:           String(data.whg || ''),
      betreff:       String(data.betreff || ''),
      beschreibung:  String(data.beschreibung || ''),
      dringlichkeit: String(data.dringlichkeit || 'normal'),
      zugeh:         String(data.zugeh || 'haus'),
      melder:        String(data.melder || ''),
      email:         String(data.email || ''),
      tel:           String(data.tel || ''),
      photos:        Array.isArray(data.photos) ? data.photos : [],
      synced:        0,
      createdAt:     new Date().toISOString(),
      syncedAt:      null,
      syncedUid:     null,
    }

    console.log('💾 Speichere Offline-Mängelmeldung:', report.localId)

    try {
      await indexedDBHelper.set(STORES.OFFLINE_MM_REPORTS, report)
      console.log('✅ Offline-Mängelmeldung in IndexedDB gespeichert:', report.localId)
      return report
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Offline-Mängelmeldung:', error)
      throw error
    }
  }

  /**
   * Lädt alle noch nicht synchronisierten Einträge (Sync-Queue)
   * @returns {Promise<Array>}
   */
  async getQueue() {
    try {
      const all = await indexedDBHelper.getAll(STORES.OFFLINE_MM_REPORTS)
      const pending = Array.isArray(all)
        ? all.filter(r => r.synced === 0 || r.synced === false || r.synced === '0')
        : []
      console.log(`📤 ${pending.length} Mängelmeldungen in der Sync-Queue`)
      return pending
    } catch (error) {
      console.error('❌ Fehler beim Laden der Sync-Queue:', error)
      return []
    }
  }

  /**
   * Markiert einen Eintrag als erfolgreich synchronisiert
   * @param {string} localId
   * @param {string|null} syncedUid
   * @returns {Promise<void>}
   */
  async markAsSynced(localId, syncedUid = null) {
    try {
      const report = await indexedDBHelper.get(STORES.OFFLINE_MM_REPORTS, localId)
      if (report) {
        report.synced    = 1
        report.syncedAt  = new Date().toISOString()
        report.syncedUid = syncedUid
        // Foto-Base64-Daten werden nach erfolgreichem Sync nicht mehr benötigt
        // und sind der Hauptspeicherverbraucher in IndexedDB.
        report.photos    = []
        await indexedDBHelper.set(STORES.OFFLINE_MM_REPORTS, report)
        console.log('✅ Mängelmeldung als synchronisiert markiert:', localId)
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
      await indexedDBHelper.delete(STORES.OFFLINE_MM_REPORTS, localId)
      console.log('🗑️ Offline-Mängelmeldung gelöscht:', localId)
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Offline-Mängelmeldung:', error)
      throw error
    }
  }

  /**
   * Gibt Statistiken über offline gespeicherte Mängelmeldungen zurück
   * @returns {Promise<{total: number, pending: number, synced: number}>}
   */
  async getStats() {
    try {
      const all = await indexedDBHelper.getAll(STORES.OFFLINE_MM_REPORTS)
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
      const all = await indexedDBHelper.getAll(STORES.OFFLINE_MM_REPORTS)
      if (!Array.isArray(all)) return 0

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      let deletedCount = 0

      for (const report of all) {
        if (report.synced === 1 && report.syncedAt) {
          const syncDate = new Date(report.syncedAt)
          if (syncDate < thirtyDaysAgo) {
            await indexedDBHelper.delete(STORES.OFFLINE_MM_REPORTS, report.localId)
            deletedCount++
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`🧹 Bereinigung: ${deletedCount} alte Mängelmeldungen entfernt`)
      }

      return deletedCount
    } catch (error) {
      console.error('❌ Fehler bei der Bereinigung:', error)
      return 0
    }
  }

  /**
   * Löscht alle gespeicherten Offline-Mängelmeldungen (für Debugging/Reset)
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await indexedDBHelper.clear(STORES.OFFLINE_MM_REPORTS)
      console.log('🗑️ Alle Offline-Mängelmeldungen gelöscht')
    } catch (error) {
      console.error('❌ Fehler beim Löschen aller Offline-Mängelmeldungen:', error)
      throw error
    }
  }
}

// Singleton-Instanz
const offlineMmReportStorage = new OfflineMmReportStorage()

/**
 * Composable für Vue-Komponenten
 * @returns {OfflineMmReportStorage}
 */
export function useOfflineMmReportStorage() {
  return offlineMmReportStorage
}

export default offlineMmReportStorage
