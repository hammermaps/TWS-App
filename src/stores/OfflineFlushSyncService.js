/**
 * OfflineFlushSyncService.js
 * Service für die Synchronisation von Offline-Spülungen mit dem Server
 *
 * WICHTIG: Verwendet OnlineStatus Store als einzige Quelle für Online/Offline Status.
 * Keine eigenen Event-Listener mehr - wird zentral vom OnlineStatus Store koordiniert.
 */

import { useOfflineFlushStorage } from './OfflineFlushStorage.js'
import { useApiApartment } from '@/api/ApiApartment.js'
import { useApartmentStorage } from './ApartmentStorage.js'
import healthClient from '@/api/ApiHealth.js'

class OfflineFlushSyncService {
  constructor() {
    this.isSyncing = false
    this.syncInProgress = new Set()
    this.listeners = new Set() // Event-Listeners für Sync-Events
    // Keine eigenen Event Listener mehr - wird vom OnlineStatus Store koordiniert
  }

  /**
   * Registriert einen Listener für Sync-Events
   * @param {Function} callback - Callback-Funktion die bei Sync-Events aufgerufen wird
   * @returns {Function} - Unsubscribe-Funktion
   */
  onSyncComplete(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * Benachrichtigt alle Listeners über ein Sync-Event
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('❌ Fehler in Sync-Listener:', error)
      }
    })
  }

  /**
   * Prüft ob eine Internetverbindung verfügbar ist
   * HINWEIS: Diese Methode ist nun hauptsächlich zur Verifizierung,
   * der primäre Online-Status kommt vom OnlineStatus Store
   */
  async checkConnectivity() {
    try {
      // Versuche einen Ping zum Server
      const response = await healthClient.ping()
      return response.isPong()
    } catch (error) {
      console.warn('⚠️ Connectivity-Check fehlgeschlagen:', error.message)
      return false
    }
  }

  /**
   * Startet die Synchronisation aller ausstehenden Spülungen
   * HINWEIS: Sollte vom OnlineStatus Store aufgerufen werden, nicht direkt von Events
   */
  async attemptSync() {
    if (this.isSyncing) {
      console.log('🔄 Synchronisation bereits aktiv')
      return
    }

    // Verifiziere die Konnektivität mit einem echten API-Call
    const isConnected = await this.checkConnectivity()
    if (!isConnected) {
      console.log('📴 Keine Synchronisation möglich: Server nicht erreichbar')
      return
    }

    const { storage } = useOfflineFlushStorage()
    const syncQueue = storage.getSyncQueue()

    if (syncQueue.length === 0) {
      console.log('✅ Keine ausstehenden Spülungen zum Synchronisieren')
      return
    }

    console.log(`🚀 Starte Synchronisation von ${syncQueue.length} Spülungen`)
    this.isSyncing = true

    let successCount = 0
    let errorCount = 0

    for (const flush of syncQueue) {
      if (this.syncInProgress.has(flush.id)) {
        continue
      }

      try {
        this.syncInProgress.add(flush.id)
        await this.syncSingleFlush(flush)
        successCount++
        console.log(`✅ Spülung ${flush.id} erfolgreich synchronisiert`)
      } catch (error) {
        errorCount++
        console.error(`❌ Fehler beim Synchronisieren von ${flush.id}:`, error)
      } finally {
        this.syncInProgress.delete(flush.id)
      }
    }

    this.isSyncing = false

    console.log(`🏁 Synchronisation abgeschlossen: ${successCount} erfolgreich, ${errorCount} Fehler`)

    // Benachrichtige alle Listeners über die abgeschlossene Synchronisation
    this.notifyListeners({
      type: 'sync_complete',
      successCount,
      errorCount,
      total: syncQueue.length
    })

    return {
      success: errorCount === 0,
      successCount,
      errorCount,
      total: syncQueue.length
    }
  }

  /**
   * Synchronisiert eine einzelne Spülung mit dem Server
   */
  async syncSingleFlush(flush) {
    const { createFlushRecord } = useApiApartment()
    const { storage: offlineStorage } = useOfflineFlushStorage()
    const apartmentStorage = useApartmentStorage()

    try {
      // Server-Call für Spülung
      const result = await createFlushRecord(flush.apartmentId, {
        startTime: flush.startTime,
        endTime: flush.endTime,
        buildingId: flush.buildingId,
        isOfflineSync: true // Flag für Backend, dass es eine nachträgliche Synchronisation ist
      })

      if (result.success) {
        // Apartment-Daten aktualisieren falls vom Server zurückgegeben
        if (result.data && result.data.apartment) {
          apartmentStorage.storage.addOrUpdateApartment(flush.buildingId, result.data.apartment)
        }

        // Aus Sync-Queue entfernen und als synchronisiert markieren
        offlineStorage.removeFromSyncQueue(flush.id)

        return result
      } else {
        throw new Error(result.error || 'Server-Fehler beim Synchronisieren')
      }
    } catch (error) {
      // Bei Netzwerkfehlern nicht aus der Queue entfernen
      throw error
    }
  }

  /**
   * Synchronisiert eine spezifische Spülung sofort (falls online)
   */
  async syncFlushImmediately(flushId) {
    const { storage } = useOfflineFlushStorage()
    const syncQueue = storage.getSyncQueue()
    const flush = syncQueue.find(f => f.id === flushId)

    if (!flush) {
      throw new Error('Spülung nicht in Sync-Queue gefunden')
    }

    return await this.syncSingleFlush(flush)
  }

  /**
   * Startet automatische periodische Synchronisation
   * HINWEIS: Wird vom OnlineStatus Store koordiniert
   */
  startAutoSync(intervalMinutes = 5) {
    console.log(`⏰ Auto-Sync gestartet (alle ${intervalMinutes} Minuten)`)

    return setInterval(async () => {
      // Prüfe ob Online-Status gegeben ist (wird extern gemanaged)
      console.log('⏰ Auto-Sync Versuch...')
      await this.attemptSync()
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Stoppt die automatische Synchronisation
   */
  stopAutoSync(intervalId) {
    if (intervalId) {
      clearInterval(intervalId)
      console.log('⏹️ Auto-Sync gestoppt')
    }
  }

  /**
   * Gibt den aktuellen Sync-Status zurück
   * HINWEIS: isOnline wird nun vom OnlineStatus Store verwaltet
   */
  getSyncStatus() {
    const { storage } = useOfflineFlushStorage()
    const stats = storage.getStats()

    return {
      isSyncing: this.isSyncing,
      unsyncedCount: stats.unsyncedFlushes,
      syncInProgress: Array.from(this.syncInProgress),
      ...stats
    }
  }

  /**
   * Forciert eine Konnektivitätsprüfung und Sync-Versuch
   */
  async forceSync() {
    console.log('🔄 Forciere Synchronisation...')

    const isConnected = await this.checkConnectivity()
    if (!isConnected) {
      throw new Error('Keine Serververbindung möglich')
    }

    return await this.attemptSync()
  }
}

// Singleton-Instanz
const syncService = new OfflineFlushSyncService()

// Composable für Vue-Komponenten
export function useOfflineFlushSync() {
  return {
    syncService,
    getSyncStatus: () => syncService.getSyncStatus(),
    forceSync: () => syncService.forceSync(),
    startAutoSync: (interval) => syncService.startAutoSync(interval),
    stopAutoSync: (intervalId) => syncService.stopAutoSync(intervalId),
    onSyncComplete: (callback) => syncService.onSyncComplete(callback)
  }
}

export default syncService
