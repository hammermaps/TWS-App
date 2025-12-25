// OnlineStatus.js - Store für Online/Offline-Status mit automatischer Ping-Überwachung
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import healthClient from '../api/ApiHealth.js'
import { useOfflineDataPreloader } from '../services/OfflineDataPreloader.js'
import { useConfigSyncService } from '../services/ConfigSyncService.js'

export const useOnlineStatusStore = defineStore('onlineStatus', () => {
  // State
  const isOnline = ref(navigator.onLine) // Browser-Status
  const isServerReachable = ref(true) // Server-Erreichbarkeit
  const manualOfflineMode = ref(false) // Manuell auf Offline gestellt
  const lastPingTime = ref(null)
  const lastPingSuccess = ref(null)
  const pingInterval = ref(null)
  const consecutiveFailures = ref(0)
  const isCheckingConnection = ref(false)
  const dataPreloader = useOfflineDataPreloader() // Preloader für Offline-Daten
  const configSyncService = useConfigSyncService() // Config Sync Service

  // Konfiguration
  const PING_INTERVAL = 30000 // 30 Sekunden
  const MAX_FAILURES_BEFORE_OFFLINE = 3 // Nach 3 fehlgeschlagenen Pings -> Offline

  // Computed
  const isFullyOnline = computed(() => {
    return !manualOfflineMode.value && isOnline.value && isServerReachable.value
  })

  const connectionStatus = computed(() => {
    if (manualOfflineMode.value) {
      return {
        status: 'offline-manual',
        label: 'Offline (Manuell)',
        color: 'secondary',
        icon: 'cil-cloud-download'
      }
    }
    if (!isOnline.value) {
      return {
        status: 'offline-network',
        label: 'Offline (Keine Netzwerkverbindung)',
        color: 'danger',
        icon: 'cil-wifi-signal-off'
      }
    }
    if (!isServerReachable.value) {
      return {
        status: 'offline-server',
        label: 'Offline (Server nicht erreichbar)',
        color: 'warning',
        icon: 'cil-warning'
      }
    }
    return {
      status: 'online',
      label: 'Online',
      color: 'success',
      icon: 'cil-check-circle'
    }
  })

  // Funktionen für Features, die nur online verfügbar sind
  const requiresOnlineFeatures = computed(() => [
    'password-change',
    'statistics',
    'user-management',
    'building-management'
  ])

  /**
   * Prüft ob ein Feature verfügbar ist
   */
  function isFeatureAvailable(featureName) {
    if (requiresOnlineFeatures.value.includes(featureName)) {
      return isFullyOnline.value
    }
    // Features wie Leerstandspülungen sind auch offline verfügbar
    return true
  }

  /**
   * Führt einen Ping zum Server aus
   */
  async function pingServer() {
    if (manualOfflineMode.value) {
      // Im manuellen Offline-Modus keine Pings durchführen
      return false
    }

    isCheckingConnection.value = true
    lastPingTime.value = Date.now()

    try {
      const response = await healthClient.ping()
      const success = response.isPong()

      lastPingSuccess.value = success
      isCheckingConnection.value = false

      if (success) {
        consecutiveFailures.value = 0
        if (!isServerReachable.value) {
          isServerReachable.value = true
          console.log('✅ Server ist wieder erreichbar')
          notifyUser('Server-Verbindung wiederhergestellt', 'success')

          // Preloading starten wenn Daten veraltet sind oder nicht existieren
          triggerPreloadIfNeeded()

          // Synchronisiere ausstehende Konfigurationsänderungen
          syncConfigChanges()
        }
        return true
      } else {
        handlePingFailure()
        return false
      }
    } catch (error) {
      console.error('❌ Ping fehlgeschlagen:', error)
      lastPingSuccess.value = false
      isCheckingConnection.value = false
      handlePingFailure()
      return false
    }
  }

  /**
   * Behandelt fehlgeschlagene Pings
   */
  function handlePingFailure() {
    consecutiveFailures.value++
    console.warn(`⚠️ Ping fehlgeschlagen (${consecutiveFailures.value}/${MAX_FAILURES_BEFORE_OFFLINE})`)

    if (consecutiveFailures.value >= MAX_FAILURES_BEFORE_OFFLINE && isServerReachable.value) {
      isServerReachable.value = false
      console.error('🔴 Server nicht erreichbar - Wechsel zu Offline-Modus')
      notifyUser('Server nicht erreichbar. App wurde in den Offline-Modus geschaltet.', 'warning')
    }
  }

  /**
   * Startet die automatische Ping-Überwachung
   */
  function startPingMonitoring() {
    if (pingInterval.value) {
      console.log('⏱️ Ping-Überwachung läuft bereits')
      return
    }

    console.log('🚀 Starte Ping-Überwachung...')

    // Erster Ping sofort
    pingServer()

    // Dann regelmäßig
    pingInterval.value = setInterval(() => {
      if (!manualOfflineMode.value) {
        pingServer()
      }
    }, PING_INTERVAL)
  }

  /**
   * Stoppt die automatische Ping-Überwachung
   */
  function stopPingMonitoring() {
    if (pingInterval.value) {
      clearInterval(pingInterval.value)
      pingInterval.value = null
      console.log('⏸️ Ping-Überwachung gestoppt')
    }
  }

  /**
   * Setzt manuell auf Offline
   */
  function setManualOffline(offline) {
    manualOfflineMode.value = offline

    if (offline) {
      stopPingMonitoring()
      console.log('📴 Manueller Offline-Modus aktiviert')
      notifyUser('Offline-Modus aktiviert', 'info')
    } else {
      // Bei manuellem Online-Schalten: Ping-Überwachung wieder starten
      consecutiveFailures.value = 0
      isServerReachable.value = true
      startPingMonitoring()
      console.log('📶 Manueller Online-Modus aktiviert')
      notifyUser('Online-Modus aktiviert', 'info')

      // Preloading starten wenn Daten veraltet sind oder nicht existieren
      triggerPreloadIfNeeded()
      
      // Config-Synchronisation starten
      syncConfigChanges()
    }
  }

  /**
   * Benachrichtigt den Benutzer (kann durch Toast-Bibliothek ersetzt werden)
   */
  function notifyUser(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`)
    // TODO: Integration mit Toast-Bibliothek
    // Für jetzt verwenden wir eine einfache Benachrichtigung
    if (window.showToast) {
      window.showToast(message, type)
    }
  }

  /**
   * Startet das Preloading wenn nötig (Daten veraltet oder nicht vorhanden)
   */
  async function triggerPreloadIfNeeded() {
    if (!isFullyOnline.value) {
      console.log('⏸️ Preloading übersprungen - nicht online')
      return
    }

    if (dataPreloader.isPreloading.value) {
      console.log('⏸️ Preloading läuft bereits')
      return
    }

    // Prüfe ob Preloading nötig ist
    if (!dataPreloader.isDataPreloaded() || dataPreloader.shouldRefreshData()) {
      console.log('🔄 Starte automatisches Preloading...')
      notifyUser('Lade Daten für Offline-Modus...', 'info')

      const success = await dataPreloader.preloadAllData()

      if (success) {
        const stats = dataPreloader.getPreloadStats()
        console.log('✅ Preloading erfolgreich:', stats)
        notifyUser(
          `Offline-Daten geladen: ${stats.buildingsCount} Gebäude, ${stats.apartmentsCount} Apartments`,
          'success'
        )
      } else {
        console.error('❌ Preloading fehlgeschlagen')
        notifyUser('Fehler beim Laden der Offline-Daten', 'warning')
      }
    } else {
      console.log('✓ Offline-Daten sind aktuell')
    }
  }

  /**
   * Synchronisiert ausstehende Konfigurationsänderungen
   */
  async function syncConfigChanges() {
    if (!isFullyOnline.value) {
      console.log('⏸️ Config-Sync übersprungen - nicht online')
      return
    }

    if (!configSyncService.hasPending()) {
      console.log('✓ Keine ausstehenden Konfigurationsänderungen')
      return
    }

    console.log('🔄 Synchronisiere Konfigurationsänderungen...')
    
    try {
      const result = await configSyncService.syncPending()
      
      if (result.success) {
        console.log(`✅ ${result.synced} Konfigurationsänderungen synchronisiert`)
        if (result.synced > 0) {
          notifyUser(`${result.synced} Konfigurationsänderungen synchronisiert`, 'success')
        }
      } else {
        console.warn(`⚠️ Config-Sync teilweise fehlgeschlagen: ${result.failed} Fehler`)
        notifyUser('Einige Konfigurationsänderungen konnten nicht synchronisiert werden', 'warning')
      }
    } catch (error) {
      console.error('❌ Fehler bei Config-Synchronisation:', error)
      notifyUser('Fehler bei der Synchronisation der Konfiguration', 'error')
    }
  }

  /**
   * Manuelles Preloading (z.B. per Button)
   */
  async function forcePreload() {
    if (!isFullyOnline.value) {
      notifyUser('Preloading nur im Online-Modus möglich', 'warning')
      return false
    }

    console.log('🔄 Starte manuelles Preloading...')
    notifyUser('Lade alle Daten für Offline-Modus...', 'info')

    const success = await dataPreloader.preloadAllData()

    if (success) {
      const stats = dataPreloader.getPreloadStats()
      notifyUser(
        `Erfolgreich geladen: ${stats.buildingsCount} Gebäude, ${stats.apartmentsCount} Apartments`,
        'success'
      )
    } else {
      notifyUser('Fehler beim Laden der Offline-Daten', 'error')
    }

    return success
  }

  /**
   * Browser Online/Offline Events
   */
  function setupBrowserListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Browser ist online')
      isOnline.value = true
      if (!manualOfflineMode.value) {
        // Versuche sofort den Server zu erreichen
        pingServer()
        // Preloading starten wenn nötig
        setTimeout(() => triggerPreloadIfNeeded(), 2000) // 2 Sekunden Verzögerung
        // Config-Synchronisation starten
        setTimeout(() => syncConfigChanges(), 3000) // 3 Sekunden Verzögerung
      }
    })

    window.addEventListener('offline', () => {
      console.log('🌐 Browser ist offline')
      isOnline.value = false
      notifyUser('Keine Netzwerkverbindung', 'warning')
    })
  }

  /**
   * Initialisierung
   */
  function initialize() {
    console.log('🔧 Initialisiere Online-Status-Store...')
    setupBrowserListeners()

    // Lade gespeicherten Zustand
    const savedManualMode = localStorage.getItem('wls-manual-offline-mode')
    if (savedManualMode === 'true') {
      manualOfflineMode.value = true
      console.log('📴 Gespeicherter Offline-Modus wiederhergestellt')
    } else {
      // Nur Ping-Überwachung starten wenn nicht manuell offline
      startPingMonitoring()

      // Preloading starten wenn nötig (mit Verzögerung nach Initialisierung)
      setTimeout(() => triggerPreloadIfNeeded(), 3000) // 3 Sekunden nach Start
    }
  }

  /**
   * Speichere manuellen Modus in localStorage
   */
  watch(manualOfflineMode, (newValue) => {
    localStorage.setItem('wls-manual-offline-mode', newValue.toString())
  })

  /**
   * Cleanup
   */
  function cleanup() {
    stopPingMonitoring()
  }

  return {
    // State
    isOnline,
    isServerReachable,
    manualOfflineMode,
    lastPingTime,
    lastPingSuccess,
    consecutiveFailures,
    isCheckingConnection,
    dataPreloader, // Zugriff auf Preloader für UI

    // Computed
    isFullyOnline,
    connectionStatus,
    requiresOnlineFeatures,

    // Methods
    isFeatureAvailable,
    pingServer,
    startPingMonitoring,
    stopPingMonitoring,
    setManualOffline,
    triggerPreloadIfNeeded,
    forcePreload,
    initialize,
    cleanup
  }
})

