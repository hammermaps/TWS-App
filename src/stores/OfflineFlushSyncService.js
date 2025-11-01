/**
 * OfflineFlushSyncService.js
 * Service für die Synchronisation von Offline-Spülungen mit dem Server
 */

import { useOfflineFlushStorage } from './OfflineFlushStorage.js'
import { useApiApartment } from '@/api/ApiApartment.js'
import { useApartmentStorage } from './ApartmentStorage.js'

class OfflineFlushSyncService {
  constructor() {
    this.isOnline = navigator.onLine
    this.isSyncing = false
    this.syncInProgress = new Set()

    // Event Listeners für Online/Offline Status
    window.addEventListener('online', () => {
      console.log('🌐 Online-Status: Verbunden')
      this.isOnline = true
      this.attemptSync()
    })

    window.addEventListener('offline', () => {
      console.log('📴 Online-Status: Offline')
      this.isOnline = false
    })
  }

  /**
   * Prüft ob eine Internetverbindung verfügbar ist
   */
  async checkConnectivity() {
    try {
      // Versuche einen einfachen API-Call
      const { checkHealth } = useApiApartment()
      await checkHealth()
      this.isOnline = true
      return true
    } catch (error) {
      this.isOnline = false
      return false
    }
  }

  /**
   * Startet die Synchronisation aller ausstehenden Spülungen
   */
  async attemptSync() {
    if (this.isSyncing) {
      console.log('🔄 Synchronisation bereits aktiv')
      return
    }

    // Prüfe erst, ob wirklich eine Verbindung besteht
    if (!this.isOnline) {
      console.log('📴 Keine Synchronisation möglich: Offline')
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
    // Prüfe, ob wir online sind, bevor wir versuchen zu synchronisieren
    if (!this.isOnline) {
      throw new Error('Keine Internetverbindung verfügbar')
    }

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
    if (!this.isOnline) {
      throw new Error('Keine Internetverbindung verfügbar')
    }

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
   */
  startAutoSync(intervalMinutes = 5) {
    console.log(`⏰ Auto-Sync gestartet (alle ${intervalMinutes} Minuten)`)

    return setInterval(async () => {
      if (this.isOnline && !this.isSyncing) {
        console.log('⏰ Auto-Sync Versuch...')
        await this.attemptSync()
      }
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
   */
  getSyncStatus() {
    const { storage } = useOfflineFlushStorage()
    const stats = storage.getStats()

    return {
      isOnline: this.isOnline,
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
    stopAutoSync: (intervalId) => syncService.stopAutoSync(intervalId)
  }
}

export default syncService
