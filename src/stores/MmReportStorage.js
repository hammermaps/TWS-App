// MmReportStorage.js - Mängelmeldungs-Cache in IndexedDB
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

/**
 * Speicher für zuletzt geladene Mängelmeldungen (offline-Cache)
 * Jede Meldung wird einzeln unter ihrer uid abgelegt (keyPath: 'uid').
 */
const MmReportStorage = {
  /**
   * Lädt alle gecachten Mängelmeldungen
   * @returns {Promise<Array>}
   */
  async getReports() {
    try {
      const all = await indexedDBHelper.getAll(STORES.MM_REPORTS)
      return Array.isArray(all) ? all : []
    } catch (error) {
      console.error('❌ Fehler beim Laden der Mängelmeldungen:', error)
      return []
    }
  },

  /**
   * Speichert eine Liste von Mängelmeldungen (ersetzt den gesamten Cache)
   * @param {Array} reports
   * @returns {Promise<void>}
   */
  async setReports(reports) {
    if (!Array.isArray(reports)) {
      console.error('❌ MmReportStorage.setReports: Kein Array übergeben')
      return
    }
    try {
      await indexedDBHelper.clear(STORES.MM_REPORTS)
      for (const report of reports) {
        await indexedDBHelper.set(STORES.MM_REPORTS, report)
      }
      console.log(`💾 ${reports.length} Mängelmeldungen in IndexedDB gespeichert`)
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Mängelmeldungen:', error)
      throw error
    }
  },

  /**
   * Lädt eine einzelne Mängelmeldung nach uid
   * @param {string} uid
   * @returns {Promise<Object|null>}
   */
  async getReport(uid) {
    try {
      return await indexedDBHelper.get(STORES.MM_REPORTS, uid)
    } catch (error) {
      console.error(`❌ Fehler beim Laden der Mängelmeldung ${uid}:`, error)
      return null
    }
  },

  /**
   * Fügt eine Mängelmeldung hinzu oder aktualisiert sie
   * @param {Object} report
   * @returns {Promise<void>}
   */
  async updateReport(report) {
    try {
      await indexedDBHelper.set(STORES.MM_REPORTS, report)
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Mängelmeldung:', error)
      throw error
    }
  },

  /**
   * Löscht alle gespeicherten Mängelmeldungen
   * @returns {Promise<void>}
   */
  async clearReports() {
    try {
      await indexedDBHelper.clear(STORES.MM_REPORTS)
      console.log('🗑️ Mängelmeldungs-Cache geleert')
    } catch (error) {
      console.error('❌ Fehler beim Leeren des Mängelmeldungs-Cache:', error)
      throw error
    }
  },
}

export default MmReportStorage
