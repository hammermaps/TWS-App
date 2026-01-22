/**
 * OfflineFlushStorage.js
 * Verwaltung von Offline-Spülungen im LocalStorage
 */

class OfflineFlushStorage {
  constructor() {
    this.storageKey = 'wls_offline_flushes'
    this.syncQueueKey = 'wls_flush_sync_queue'
  }

  /**
   * Generiert eine eindeutige ID für Offline-Spülungen
   */
  generateId() {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Speichert eine Spülung offline
   */
  saveOfflineFlush(apartmentId, buildingId, flushData) {
    const flush = {
      id: this.generateId(),
      apartmentId: parseInt(apartmentId),
      buildingId: parseInt(buildingId),
      startTime: flushData.startTime,
      endTime: flushData.endTime,
      duration: flushData.duration || this.calculateDuration(flushData.startTime, flushData.endTime),
      isOffline: true,
      createdAt: new Date().toISOString(),
      synced: false
    }

    console.log('💾 Speichere Offline-Spülung:', flush)

    // Zu Offline-Spülungen hinzufügen
    const offlineFlushes = this.getOfflineFlushes()
    offlineFlushes.push(flush)
    localStorage.setItem(this.storageKey, JSON.stringify(offlineFlushes))

    // Zur Sync-Queue hinzufügen
    this.addToSyncQueue(flush)

    return flush
  }

  /**
   * Berechnet die Dauer zwischen Start- und Endzeit
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return Math.floor((end - start) / 1000)
  }

  /**
   * Lädt alle Offline-Spülungen
   */
  getOfflineFlushes() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('❌ Fehler beim Laden der Offline-Spülungen:', error)
      return []
    }
  }

  /**
   * Lädt Offline-Spülungen für ein bestimmtes Apartment
   */
  getOfflineFlushesForApartment(apartmentId) {
    const allFlushes = this.getOfflineFlushes()
    return allFlushes.filter(flush => flush.apartmentId === parseInt(apartmentId))
  }

  /**
   * Lädt Offline-Spülungen für ein bestimmtes Gebäude
   */
  getOfflineFlushesForBuilding(buildingId) {
    const allFlushes = this.getOfflineFlushes()
    return allFlushes.filter(flush => flush.buildingId === parseInt(buildingId))
  }

  /**
   * Fügt eine Spülung zur Sync-Queue hinzu
   */
  addToSyncQueue(flush) {
    const syncQueue = this.getSyncQueue()
    syncQueue.push(flush)
    localStorage.setItem(this.syncQueueKey, JSON.stringify(syncQueue))
    console.log('📤 Zur Sync-Queue hinzugefügt:', flush.id)
  }

  /**
   * Lädt die Sync-Queue
   */
  getSyncQueue() {
    try {
      const stored = localStorage.getItem(this.syncQueueKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('❌ Fehler beim Laden der Sync-Queue:', error)
      return []
    }
  }

  /**
   * Entfernt eine Spülung aus der Sync-Queue nach erfolgreichem Sync
   */
  removeFromSyncQueue(flushId) {
    const syncQueue = this.getSyncQueue()
    const updatedQueue = syncQueue.filter(flush => flush.id !== flushId)
    localStorage.setItem(this.syncQueueKey, JSON.stringify(updatedQueue))

    // Markiere als synchronisiert in den Offline-Spülungen
    this.markAsSynced(flushId)
    console.log('✅ Aus Sync-Queue entfernt:', flushId)
  }

  /**
   * Markiert eine Spülung als synchronisiert
   */
  markAsSynced(flushId) {
    const offlineFlushes = this.getOfflineFlushes()
    const flush = offlineFlushes.find(f => f.id === flushId)
    if (flush) {
      flush.synced = true
      flush.syncedAt = new Date().toISOString()
      localStorage.setItem(this.storageKey, JSON.stringify(offlineFlushes))
    }
  }

  /**
   * Zählt die Anzahl nicht synchronisierter Spülungen
   */
  getUnsyncedCount() {
    const syncQueue = this.getSyncQueue()
    return syncQueue.length
  }

  /**
   * Simuliert eine lokale Aktualisierung der Apartment-Daten nach Offline-Spülung
   */
  updateApartmentAfterOfflineFlush(apartmentId, buildingId, flushData) {
    // Erstelle ein Mock-Apartment-Update für lokale Anzeige
    const apartmentUpdate = {
      id: parseInt(apartmentId),
      last_flush_date: flushData.endTime,
      // Berechne nächste Spülung: 72 Stunden (3 Tage) nach dem Ende der Spülung
      next_flush_due: new Date(new Date(flushData.endTime).getTime() + (72 * 60 * 60 * 1000)).toISOString()
    }

    console.log('🏠 Lokale Apartment-Aktualisierung:', apartmentUpdate)
    return apartmentUpdate
  }

  /**
   * Bereinigt alte synchronisierte Spülungen (älter als 30 Tage)
   */
  cleanupOldFlushes() {
    const offlineFlushes = this.getOfflineFlushes()
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))

    const cleanedFlushes = offlineFlushes.filter(flush => {
      if (flush.synced && flush.syncedAt) {
        return new Date(flush.syncedAt) > thirtyDaysAgo
      }
      return true // Behalte nicht synchronisierte Spülungen
    })

    if (cleanedFlushes.length !== offlineFlushes.length) {
      localStorage.setItem(this.storageKey, JSON.stringify(cleanedFlushes))
      console.log('🧹 Bereinigung:', offlineFlushes.length - cleanedFlushes.length, 'alte Spülungen entfernt')
    }
  }

  /**
   * Löscht alle Offline-Daten (für Debugging/Reset)
   */
  clearAll() {
    localStorage.removeItem(this.storageKey)
    localStorage.removeItem(this.syncQueueKey)
    console.log('🗑️ Alle Offline-Spülungen gelöscht')
  }

  /**
   * Gibt Statistiken über Offline-Spülungen zurück
   */
  getStats() {
    const offlineFlushes = this.getOfflineFlushes()
    const syncQueue = this.getSyncQueue()

    return {
      totalOfflineFlushes: offlineFlushes.length,
      syncedFlushes: offlineFlushes.filter(f => f.synced).length,
      unsyncedFlushes: syncQueue.length,
      oldestUnsynced: syncQueue.length > 0 ?
        Math.min(...syncQueue.map(f => new Date(f.createdAt).getTime())) : null
    }
  }
}

// Singleton-Instanz
const offlineFlushStorage = new OfflineFlushStorage()

// Composable für Vue-Komponenten
export function useOfflineFlushStorage() {
  return {
    storage: offlineFlushStorage
  }
}

export default offlineFlushStorage
