/**
 * OfflineMeterSyncService.js
 * Synchronisiert offline erfasste Zählerstände mit dem Server.
 *
 * WICHTIG: Verwendet das gleiche Koordinationsprinzip wie OfflineFlushSyncService –
 * kein eigener online/offline Event-Listener. Der OnlineStatus Store ruft
 * attemptSync() zentral auf.
 */

import { apiMeter } from '../api/ApiMeter.js'
import { useOfflineMeterStorage } from './OfflineMeterStorage.js'
import MeterStorage from './MeterStorage.js'

class OfflineMeterSyncService {
  constructor() {
    this._syncing    = false
    this._listeners  = new Set()
    this._intervalId = null
  }

  // -------------------------------------------------------------------------
  // Listener-Verwaltung
  // -------------------------------------------------------------------------

  /**
   * Registriert einen Callback für Sync-Ereignisse
   * @param {Function} callback - Wird mit {type, saved, errors, total} oder {type, error} aufgerufen
   * @returns {Function} Unsubscribe-Funktion
   */
  onSyncComplete(callback) {
    this._listeners.add(callback)
    return () => this._listeners.delete(callback)
  }

  /**
   * Benachrichtigt alle registrierten Listener
   * @param {Object} payload
   */
  _notify(payload) {
    this._listeners.forEach(listener => {
      try {
        listener(payload)
      } catch (error) {
        console.error('❌ Fehler in Meter-Sync-Listener:', error)
      }
    })
  }

  // -------------------------------------------------------------------------
  // Synchronisation
  // -------------------------------------------------------------------------

  /**
   * Versucht die Synchronisation aller ausstehenden Zählerstände.
   * Gibt { skipped: true } zurück wenn bereits ein Sync läuft.
   * @returns {Promise<{skipped?: boolean, saved: number, errors: number, total: number}>}
   */
  async attemptSync() {
    if (this._syncing) {
      console.log('🔄 Zählerstand-Sync bereits aktiv – übersprungen')
      return { skipped: true }
    }

    const storage = useOfflineMeterStorage()
    const queue   = await storage.getQueue()

    if (!queue.length) {
      console.log('✅ Keine ausstehenden Zählerstände zum Synchronisieren')
      return { saved: 0, errors: 0, total: 0 }
    }

    console.log(`🚀 Starte Zählerstand-Sync: ${queue.length} Einträge`)
    this._syncing = true

    let saved  = 0
    let errors = 0

    try {
      // Alle ausstehenden Einträge als Batch senden
      const payload = queue.map(r => ({
        local_id:      r.localId,
        meter_id:      r.meterId,
        reading_value: r.reading_value,
        reading_date:  r.reading_date,
        reading_time:  r.reading_time  || null,
        note:          r.note          || null,
      }))

      const result = await apiMeter.syncReadings(payload)

      if (result.success && Array.isArray(result.results)) {
        for (const res of result.results) {
          const queueItem = queue[res.index]
          if (!queueItem) continue

          if (res.status === 'saved' || res.status === 'duplicate') {
            await storage.markAsSynced(queueItem.localId)
            saved++
          } else {
            console.warn(`⚠️ Sync-Fehler für ${queueItem.localId}:`, res.error || 'Unbekannter Fehler')
            errors++
          }
        }
      } else {
        // Gesamter Batch fehlgeschlagen
        errors = queue.length
        console.error('❌ Batch-Sync fehlgeschlagen:', result.error)
      }

      console.log(`🏁 Zählerstand-Sync abgeschlossen: ${saved} gespeichert, ${errors} Fehler`)

      this._notify({ type: 'sync_complete', saved, errors, total: queue.length })

      return { saved, errors, total: queue.length }
    } catch (err) {
      console.error('❌ Unerwarteter Fehler beim Zählerstand-Sync:', err)
      this._notify({ type: 'sync_error', error: err.message })
      return { saved: 0, errors: queue.length, total: queue.length }
    } finally {
      this._syncing = false
    }
  }

  /**
   * Erzwingt einen sofortigen Sync ohne Konnektivitätsprüfung
   * @returns {Promise<Object>}
   */
  async forceSync() {
    console.log('🔄 Forciere Zählerstand-Sync...')
    return this.attemptSync()
  }

  // -------------------------------------------------------------------------
  // Auto-Sync
  // -------------------------------------------------------------------------

  /**
   * Startet einen periodischen Auto-Sync
   * @param {number} intervalMinutes - Intervall in Minuten (Standard: 5)
   */
  startAutoSync(intervalMinutes = 5) {
    this.stopAutoSync()
    console.log(`⏰ Zählerstand Auto-Sync gestartet (alle ${intervalMinutes} Minuten)`)
    this._intervalId = setInterval(
      () => {
        console.log('⏰ Zählerstand Auto-Sync Versuch...')
        this.attemptSync()
      },
      intervalMinutes * 60 * 1000
    )
  }

  /**
   * Stoppt den Auto-Sync
   */
  stopAutoSync() {
    if (this._intervalId) {
      clearInterval(this._intervalId)
      this._intervalId = null
      console.log('⏹️ Zählerstand Auto-Sync gestoppt')
    }
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  /**
   * Gibt den aktuellen Sync-Status zurück
   * @returns {Promise<Object>}
   */
  async getSyncStatus() {
    const storage = useOfflineMeterStorage()
    const stats   = await storage.getStats()

    return {
      isSyncing:   this._syncing,
      pendingCount: stats.pending,
      ...stats,
    }
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Singleton-Instanz */
export const offlineMeterSyncService = new OfflineMeterSyncService()

/**
 * Composable für Vue-Komponenten
 */
export function useOfflineMeterSync() {
  return {
    syncService:  offlineMeterSyncService,
    getSyncStatus: () => offlineMeterSyncService.getSyncStatus(),
    forceSync:     () => offlineMeterSyncService.forceSync(),
    startAutoSync: (interval) => offlineMeterSyncService.startAutoSync(interval),
    stopAutoSync:  () => offlineMeterSyncService.stopAutoSync(),
    onSyncComplete: (callback) => offlineMeterSyncService.onSyncComplete(callback),
  }
}

export default offlineMeterSyncService
