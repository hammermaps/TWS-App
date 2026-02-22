/**
 * OfflineFlushStorage.js
 * Verwaltung von Offline-Spülungen in IndexedDB
 */

import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

class OfflineFlushStorage {
  constructor() {
    // No instance variables needed with IndexedDB
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
  async saveOfflineFlush(apartmentId, buildingId, flushData) {
    const flush = {
      id: this.generateId(),
      apartmentId: parseInt(apartmentId),
      buildingId: parseInt(buildingId),
      startTime: flushData.startTime,
      endTime: flushData.endTime,
      duration: flushData.duration || this.calculateDuration(flushData.startTime, flushData.endTime),
      isOffline: true,
      createdAt: new Date().toISOString(),
      synced: 0  // 0 = nicht synchronisiert, 1 = synchronisiert (Integer für IDB-Kompatibilität)
    }

    console.log('💾 Speichere Offline-Spülung:', flush)

    try {
      await indexedDBHelper.set(STORES.OFFLINE_FLUSHES, flush)
      console.log('✅ Offline-Spülung in IndexedDB gespeichert')
      return flush
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Offline-Spülung:', error)
      throw error
    }
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
  async getOfflineFlushes() {
    try {
      const flushes = await indexedDBHelper.getAll(STORES.OFFLINE_FLUSHES)
      console.log(`📦 ${flushes.length} Offline-Spülungen aus IndexedDB geladen`)
      return flushes
    } catch (error) {
      console.error('❌ Fehler beim Laden der Offline-Spülungen:', error)
      return []
    }
  }

  /**
   * Lädt Offline-Spülungen für ein bestimmtes Apartment
   */
  async getOfflineFlushesForApartment(apartmentId) {
    try {
      const parsedId = parseInt(apartmentId)
      if (isNaN(parsedId)) {
        console.warn('⚠️ getOfflineFlushesForApartment: Ungültige apartmentId:', apartmentId)
        return []
      }
      const flushes = await indexedDBHelper.getAllByIndex(
        STORES.OFFLINE_FLUSHES,
        'apartmentId',
        parsedId
      )
      return Array.isArray(flushes) ? flushes : []
    } catch (error) {
      console.error('❌ Fehler beim Laden der Apartment-Spülungen:', error)
      return []
    }
  }

  /**
   * Lädt Offline-Spülungen für ein bestimmtes Gebäude
   */
  async getOfflineFlushesForBuilding(buildingId) {
    try {
      const flushes = await indexedDBHelper.getAllByIndex(
        STORES.OFFLINE_FLUSHES,
        'buildingId',
        parseInt(buildingId)
      )
      return flushes
    } catch (error) {
      console.error('❌ Fehler beim Laden der Gebäude-Spülungen:', error)
      return []
    }
  }

  /**
   * Lädt die Sync-Queue (alle nicht synchronisierten Spülungen)
   */
  async getSyncQueue() {
    try {
      // Lade alle und filtere - robusteste Methode für boolean/integer synced-Werte
      const all = await indexedDBHelper.getAll(STORES.OFFLINE_FLUSHES)
      const flushes = Array.isArray(all)
        ? all.filter(f => f.synced === 0 || f.synced === false || f.synced === '0')
        : []
      console.log(`📤 ${flushes.length} Spülungen in der Sync-Queue`)
      return flushes
    } catch (error) {
      console.error('❌ Fehler beim Laden der Sync-Queue:', error)
      return []
    }
  }

  /**
   * Entfernt eine Spülung aus der Sync-Queue nach erfolgreichem Sync
   */
  async removeFromSyncQueue(flushId) {
    try {
      // Markiere als synchronisiert statt zu löschen
      await this.markAsSynced(flushId)
      console.log('✅ Aus Sync-Queue entfernt:', flushId)
    } catch (error) {
      console.error('❌ Fehler beim Entfernen aus Sync-Queue:', error)
      throw error
    }
  }

  /**
   * Markiert eine Spülung als synchronisiert
   */
  async markAsSynced(flushId) {
    try {
      const flush = await indexedDBHelper.get(STORES.OFFLINE_FLUSHES, flushId)
      if (flush) {
        flush.synced = 1  // 1 = synchronisiert
        flush.syncedAt = new Date().toISOString()
        await indexedDBHelper.set(STORES.OFFLINE_FLUSHES, flush)
        console.log('✅ Spülung als synchronisiert markiert:', flushId)
      }
    } catch (error) {
      console.error('❌ Fehler beim Markieren als synchronisiert:', error)
      throw error
    }
  }

  /**
   * Zählt die Anzahl nicht synchronisierter Spülungen
   */
  async getUnsyncedCount() {
    const syncQueue = await this.getSyncQueue()
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
  async cleanupOldFlushes() {
    try {
      const allFlushes = await this.getOfflineFlushes()
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))

      let deletedCount = 0
      for (const flush of allFlushes) {
        if (flush.synced && flush.syncedAt) {
          const syncDate = new Date(flush.syncedAt)
          if (syncDate < thirtyDaysAgo) {
            await indexedDBHelper.delete(STORES.OFFLINE_FLUSHES, flush.id)
            deletedCount++
          }
        }
      }

      if (deletedCount > 0) {
        console.log('🧹 Bereinigung:', deletedCount, 'alte Spülungen entfernt')
      }
    } catch (error) {
      console.error('❌ Fehler bei der Bereinigung:', error)
    }
  }

  /**
   * Löscht alle Offline-Daten (für Debugging/Reset)
   */
  async clearAll() {
    try {
      await indexedDBHelper.clear(STORES.OFFLINE_FLUSHES)
      console.log('🗑️ Alle Offline-Spülungen gelöscht')
    } catch (error) {
      console.error('❌ Fehler beim Löschen aller Spülungen:', error)
      throw error
    }
  }

  /**
   * Gibt Statistiken über Offline-Spülungen zurück
   */
  async getStats() {
    try {
      const allFlushes = await this.getOfflineFlushes()
      const syncQueue = await this.getSyncQueue()
      const syncedFlushes = allFlushes.filter(f => f.synced === 1 || f.synced === true)

      return {
        totalOfflineFlushes: allFlushes.length,
        syncedFlushes: syncedFlushes.length,
        unsyncedFlushes: syncQueue.length,
        oldestUnsynced: syncQueue.length > 0 ? Math.min(...syncQueue.map(f => new Date(f.createdAt).getTime())) : null
      }
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Statistiken:', error)
      return {
        totalOfflineFlushes: 0,
        syncedFlushes: 0,
        unsyncedFlushes: 0,
        oldestUnsynced: null
      }
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
