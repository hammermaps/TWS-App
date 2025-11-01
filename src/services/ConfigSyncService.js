/**
 * ConfigSyncService.js
 * Service zur Synchronisation von Konfigurationsänderungen im Offline-Modus
 */

import { ref } from 'vue'
import { ApiConfig } from '../api/ApiConfig.js'
import configStorage from '../stores/ConfigStorage.js'

export class ConfigSyncService {
  constructor() {
    this.configApi = new ApiConfig()
    this.syncQueueKey = 'wls_config_sync_queue'
    this.isSyncing = ref(false)
    this.lastSyncTime = ref(null)
    this.syncError = ref(null)
  }

  /**
   * Fügt eine Konfigurationsänderung zur Sync-Queue hinzu
   */
  addToSyncQueue(config) {
    try {
      const queue = this.getSyncQueue()
      const syncItem = {
        id: `config_${Date.now()}`,
        config: config,
        timestamp: new Date().toISOString(),
        synced: false,
        attempts: 0
      }
      queue.push(syncItem)
      localStorage.setItem(this.syncQueueKey, JSON.stringify(queue))
      console.log('📝 Konfigurationsänderung zur Sync-Queue hinzugefügt')
      return true
    } catch (error) {
      console.error('❌ Fehler beim Hinzufügen zur Sync-Queue:', error)
      return false
    }
  }

  /**
   * Gibt die aktuelle Sync-Queue zurück
   */
  getSyncQueue() {
    try {
      const queueString = localStorage.getItem(this.syncQueueKey)
      return queueString ? JSON.parse(queueString) : []
    } catch (error) {
      console.error('❌ Fehler beim Laden der Sync-Queue:', error)
      return []
    }
  }

  /**
   * Synchronisiert alle ausstehenden Konfigurationsänderungen
   */
  async syncPendingChanges() {
    if (this.isSyncing.value) {
      console.log('⏳ Synchronisation läuft bereits...')
      return { success: false, message: 'Sync already in progress' }
    }

    const queue = this.getSyncQueue()
    const pendingItems = queue.filter(item => !item.synced)

    if (pendingItems.length === 0) {
      console.log('✅ Keine ausstehenden Konfigurationsänderungen zu synchronisieren')
      return { success: true, synced: 0 }
    }

    this.isSyncing.value = true
    this.syncError.value = null
    console.log(`🔄 Starte Synchronisation von ${pendingItems.length} Konfigurationsänderungen...`)

    let syncedCount = 0
    let failedCount = 0

    for (const item of pendingItems) {
      try {
        console.log(`  📤 Synchronisiere Konfiguration ID: ${item.id}`)
        
        const response = await this.configApi.set(item.config)
        
        if (response) {
          // Markiere als synchronisiert
          item.synced = true
          item.syncedAt = new Date().toISOString()
          syncedCount++
          console.log(`    ✅ Konfiguration synchronisiert: ${item.id}`)
        } else {
          throw new Error('Keine gültige Antwort vom Server')
        }
      } catch (error) {
        console.error(`    ❌ Fehler bei Synchronisation von ${item.id}:`, error)
        item.attempts = (item.attempts || 0) + 1
        item.lastError = error.message
        failedCount++

        // Nach 3 Fehlversuchen als fehlgeschlagen markieren
        if (item.attempts >= 3) {
          console.warn(`    ⚠️ Konfiguration ${item.id} nach 3 Versuchen übersprungen`)
          item.failed = true
        }
      }
    }

    // Queue aktualisieren
    const updatedQueue = queue.map(item => {
      const updated = pendingItems.find(p => p.id === item.id)
      return updated || item
    })
    
    // Entferne erfolgreich synchronisierte und fehlgeschlagene Items
    const cleanedQueue = updatedQueue.filter(item => !item.synced && !item.failed)
    localStorage.setItem(this.syncQueueKey, JSON.stringify(cleanedQueue))

    this.lastSyncTime.value = new Date()
    this.isSyncing.value = false

    const result = {
      success: failedCount === 0,
      synced: syncedCount,
      failed: failedCount,
      remaining: cleanedQueue.length
    }

    console.log(`🎯 Synchronisation abgeschlossen: ${syncedCount} erfolgreich, ${failedCount} fehlgeschlagen, ${cleanedQueue.length} verbleibend`)

    return result
  }

  /**
   * Prüft ob Änderungen zur Synchronisation anstehen
   */
  hasPendingChanges() {
    const queue = this.getSyncQueue()
    return queue.some(item => !item.synced && !item.failed)
  }

  /**
   * Gibt die Anzahl ausstehender Änderungen zurück
   */
  getPendingCount() {
    const queue = this.getSyncQueue()
    return queue.filter(item => !item.synced && !item.failed).length
  }

  /**
   * Löscht die Sync-Queue
   */
  clearSyncQueue() {
    try {
      localStorage.removeItem(this.syncQueueKey)
      console.log('🗑️ Config Sync-Queue gelöscht')
      return true
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Sync-Queue:', error)
      return false
    }
  }

  /**
   * Gibt Statistiken über die Sync-Queue zurück
   */
  getSyncStats() {
    const queue = this.getSyncQueue()
    const pending = queue.filter(item => !item.synced && !item.failed)
    const synced = queue.filter(item => item.synced)
    const failed = queue.filter(item => item.failed)

    return {
      total: queue.length,
      pending: pending.length,
      synced: synced.length,
      failed: failed.length,
      lastSync: this.lastSyncTime.value,
      isSyncing: this.isSyncing.value
    }
  }
}

// Singleton-Instanz
const configSyncService = new ConfigSyncService()

/**
 * Vue Composable für Config Sync Service
 */
export function useConfigSyncService() {
  const syncPending = async () => {
    return await configSyncService.syncPendingChanges()
  }

  const addToQueue = (config) => {
    return configSyncService.addToSyncQueue(config)
  }

  const hasPending = () => {
    return configSyncService.hasPendingChanges()
  }

  const getPendingCount = () => {
    return configSyncService.getPendingCount()
  }

  const getStats = () => {
    return configSyncService.getSyncStats()
  }

  const clearQueue = () => {
    return configSyncService.clearSyncQueue()
  }

  return {
    isSyncing: configSyncService.isSyncing,
    lastSyncTime: configSyncService.lastSyncTime,
    syncError: configSyncService.syncError,
    syncPending,
    addToQueue,
    hasPending,
    getPendingCount,
    getStats,
    clearQueue
  }
}

export default configSyncService
