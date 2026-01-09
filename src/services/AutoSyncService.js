/**
 * AutoSyncService.js
 * Service für automatische periodische Synchronisation
 */

import { ref } from 'vue'
import { useConfigSyncService } from './ConfigSyncService.js'

export class AutoSyncService {
  constructor() {
    this.intervalId = ref(null)
    this.isRunning = ref(false)
    this.currentInterval = ref(0)
    this.lastSyncTime = ref(null)
  }

  /**
   * Startet die automatische Synchronisation
   * @param {number} intervalMinutes - Intervall in Minuten
   */
  start(intervalMinutes) {
    // Validierung
    if (!intervalMinutes || intervalMinutes < 1) {
      console.warn('⚠️ AutoSync: Ungültiges Intervall, mindestens 1 Minute erforderlich')
      return false
    }

    // Wenn bereits läuft, erst stoppen
    if (this.intervalId.value) {
      console.log('🔄 AutoSync: Service läuft bereits, wird neu gestartet...')
      this.stop()
    }

    const intervalMs = intervalMinutes * 60 * 1000
    this.currentInterval.value = intervalMinutes

    console.log(`🚀 AutoSync: Starte automatische Synchronisation (${intervalMinutes} Min.)`)

    // Erste Synchronisation sofort durchführen (optional)
    // this._performSync()

    // Periodische Synchronisation einrichten
    this.intervalId.value = setInterval(() => {
      this._performSync()
    }, intervalMs)

    this.isRunning.value = true
    return true
  }

  /**
   * Stoppt die automatische Synchronisation
   */
  stop() {
    if (this.intervalId.value) {
      clearInterval(this.intervalId.value)
      this.intervalId.value = null
      this.isRunning.value = false
      console.log('⏹️ AutoSync: Automatische Synchronisation gestoppt')
      return true
    }
    return false
  }

  /**
   * Führt eine Synchronisation durch
   * @private
   */
  async _performSync() {
    // Nur synchronisieren wenn online
    if (!navigator.onLine) {
      console.log('📴 AutoSync: Offline, überspringe Synchronisation')
      return
    }

    try {
      console.log('🔄 AutoSync: Starte periodische Synchronisation...')
      const configSync = useConfigSyncService()

      // Prüfe ob es etwas zu synchronisieren gibt
      if (!configSync.hasPending()) {
        console.log('✅ AutoSync: Keine ausstehenden Änderungen')
        this.lastSyncTime.value = new Date()
        return
      }

      // Führe Synchronisation durch
      const result = await configSync.syncPending()

      if (result.success) {
        console.log(`✅ AutoSync: Erfolgreich - ${result.synced} Items synchronisiert`)
      } else {
        console.warn(`⚠️ AutoSync: Teilweise fehlgeschlagen - ${result.synced} erfolgreich, ${result.failed} fehlgeschlagen`)
      }

      this.lastSyncTime.value = new Date()
    } catch (error) {
      console.error('❌ AutoSync: Fehler bei der Synchronisation:', error)
    }
  }

  /**
   * Aktualisiert das Intervall
   * @param {number} intervalMinutes - Neues Intervall in Minuten
   */
  updateInterval(intervalMinutes) {
    if (this.isRunning.value) {
      console.log(`🔄 AutoSync: Aktualisiere Intervall auf ${intervalMinutes} Min.`)
      this.stop()
      this.start(intervalMinutes)
    }
  }

  /**
   * Gibt den aktuellen Status zurück
   */
  getStatus() {
    return {
      isRunning: this.isRunning.value,
      interval: this.currentInterval.value,
      lastSync: this.lastSyncTime.value
    }
  }
}

// Singleton-Instanz
const autoSyncService = new AutoSyncService()

/**
 * Vue Composable für Auto Sync Service
 */
export function useAutoSyncService() {
  const start = (intervalMinutes) => {
    return autoSyncService.start(intervalMinutes)
  }

  const stop = () => {
    return autoSyncService.stop()
  }

  const updateInterval = (intervalMinutes) => {
    return autoSyncService.updateInterval(intervalMinutes)
  }

  const getStatus = () => {
    return autoSyncService.getStatus()
  }

  return {
    isRunning: autoSyncService.isRunning,
    currentInterval: autoSyncService.currentInterval,
    lastSyncTime: autoSyncService.lastSyncTime,
    start,
    stop,
    updateInterval,
    getStatus
  }
}

export default autoSyncService

