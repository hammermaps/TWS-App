/**
 * OfflineMmSyncService.js
 * Synchronisiert offline erfasste Mängelmeldungen mit dem Server.
 *
 * WICHTIG: Verwendet das gleiche Koordinationsprinzip wie
 * OfflineMeterSyncService – kein eigener online/offline Event-Listener.
 * Der OnlineStatus Store ruft attemptSync() zentral auf.
 *
 * Ablauf je Warteschlangen-Eintrag: vorhandene Fotos (Base64) zuerst über
 * preUpload() hochladen (Zwei-Phasen-Upload wie im Web-Wizard), danach
 * create() mit local_id (Dedup) und optionalem upload_token aufrufen.
 */

import { apiMm } from '../api/ApiMm.js'
import { useOfflineMmReportStorage } from './OfflineMmReportStorage.js'
import { dataUrlToFile } from '../utils/dataUrlToFile.js'

class OfflineMmSyncService {
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
        console.error('❌ Fehler in Mängelmeldungs-Sync-Listener:', error)
      }
    })
  }

  // -------------------------------------------------------------------------
  // Synchronisation
  // -------------------------------------------------------------------------

  /**
   * Versucht die Synchronisation aller ausstehenden Mängelmeldungen.
   * Gibt { skipped: true } zurück wenn bereits ein Sync läuft.
   * @returns {Promise<{skipped?: boolean, saved: number, errors: number, total: number}>}
   */
  async attemptSync() {
    if (this._syncing) {
      console.log('🔄 Mängelmeldungs-Sync bereits aktiv – übersprungen')
      return { skipped: true }
    }

    const storage = useOfflineMmReportStorage()
    const queue   = await storage.getQueue()

    if (!queue.length) {
      console.log('✅ Keine ausstehenden Mängelmeldungen zum Synchronisieren')
      return { saved: 0, errors: 0, total: 0 }
    }

    console.log(`🚀 Starte Mängelmeldungs-Sync: ${queue.length} Einträge`)
    this._syncing = true

    let saved  = 0
    let errors = 0

    try {
      for (const entry of queue) {
        try {
          let uploadToken = null

          if (Array.isArray(entry.photos) && entry.photos.length > 0) {
            const files = entry.photos.map((p, idx) =>
              dataUrlToFile(p.dataUrl, p.name || `foto_${idx + 1}.jpg`)
            )
            const uploadResult = await apiMm.preUpload(files)
            if (uploadResult.success && uploadResult.token) {
              uploadToken = uploadResult.token
            } else {
              console.warn(`⚠️ Foto-Upload für ${entry.localId} fehlgeschlagen:`, uploadResult.error)
              // Meldung trotzdem ohne Fotos anlegen statt sie dauerhaft in der
              // Warteschlange hängen zu lassen – Fotos sind optional.
            }
          }

          const createResult = await apiMm.create({
            street:        entry.street,
            whg:           entry.whg,
            betreff:       entry.betreff,
            beschreibung:  entry.beschreibung,
            dringlichkeit: entry.dringlichkeit,
            zugeh:         entry.zugeh,
            melder:        entry.melder || undefined,
            email:         entry.email || undefined,
            tel:           entry.tel || undefined,
            local_id:      entry.localId,
            upload_token:  uploadToken || undefined,
          })

          if (createResult.success) {
            await storage.markAsSynced(entry.localId, createResult.uid)
            saved++
          } else {
            console.warn(`⚠️ Sync-Fehler für ${entry.localId}:`, createResult.error)
            errors++
          }
        } catch (entryErr) {
          console.error(`❌ Unerwarteter Fehler beim Sync von ${entry.localId}:`, entryErr)
          errors++
        }
      }

      console.log(`🏁 Mängelmeldungs-Sync abgeschlossen: ${saved} gespeichert, ${errors} Fehler`)

      this._notify({ type: 'sync_complete', saved, errors, total: queue.length })

      return { saved, errors, total: queue.length }
    } catch (err) {
      console.error('❌ Unerwarteter Fehler beim Mängelmeldungs-Sync:', err)
      this._notify({ type: 'sync_error', error: err.message })
      return { saved, errors: queue.length - saved, total: queue.length }
    } finally {
      this._syncing = false
    }
  }

  /**
   * Erzwingt einen sofortigen Sync ohne Konnektivitätsprüfung
   * @returns {Promise<Object>}
   */
  async forceSync() {
    console.log('🔄 Forciere Mängelmeldungs-Sync...')
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
    console.log(`⏰ Mängelmeldungs Auto-Sync gestartet (alle ${intervalMinutes} Minuten)`)
    this._intervalId = setInterval(
      () => {
        console.log('⏰ Mängelmeldungs Auto-Sync Versuch...')
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
      console.log('⏹️ Mängelmeldungs Auto-Sync gestoppt')
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
    const storage = useOfflineMmReportStorage()
    const stats   = await storage.getStats()

    return {
      isSyncing:    this._syncing,
      pendingCount: stats.pending,
      ...stats,
    }
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Singleton-Instanz */
export const offlineMmSyncService = new OfflineMmSyncService()

/**
 * Composable für Vue-Komponenten
 */
export function useOfflineMmSync() {
  return {
    syncService:    offlineMmSyncService,
    getSyncStatus:  () => offlineMmSyncService.getSyncStatus(),
    forceSync:      () => offlineMmSyncService.forceSync(),
    startAutoSync:  (interval) => offlineMmSyncService.startAutoSync(interval),
    stopAutoSync:   () => offlineMmSyncService.stopAutoSync(),
    onSyncComplete: (callback) => offlineMmSyncService.onSyncComplete(callback),
  }
}

export default offlineMmSyncService
