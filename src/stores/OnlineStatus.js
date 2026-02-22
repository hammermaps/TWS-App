import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import healthClient from '../api/ApiHealth.js'
import { useOfflineDataPreloader } from '../services/OfflineDataPreloader.js'
import { useConfigSyncService } from '../services/ConfigSyncService.js'
import { useConfigStorage } from './ConfigStorage.js'
import { getToken } from '@/stores/GlobalToken.js'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const MANUAL_OFFLINE_KEY = 'wls-manual-offline-mode'
const LS_OFFLINE_KEY = 'wls-offline-mode-sync' // Schneller localStorage Fallback

/**
 * Synchron aus localStorage lesen (sofort verfügbar, kein async nötig)
 * Wird als Fallback verwendet, bis IndexedDB asynchron geladen ist
 */
function getManualOfflineModeSync() {
  try {
    return localStorage.getItem(LS_OFFLINE_KEY) === 'true'
  } catch (e) {
    return false
  }
}

export const useOnlineStatusStore = defineStore('onlineStatus', () => {
  // State
  const isOnline = ref(navigator.onLine) // Browser-Status
  const isServerReachable = ref(true) // Server-Erreichbarkeit
  // Synchron aus localStorage initialisieren um Race Condition zu vermeiden
  const manualOfflineMode = ref(getManualOfflineModeSync()) // Manuell auf Offline gestellt
  const lastPingTime = ref(null)
  const lastPingSuccess = ref(null)
  const pingInterval = ref(null)
  const consecutiveFailures = ref(0)
  const isCheckingConnection = ref(false)
  const dataPreloader = useOfflineDataPreloader() // Preloader für Offline-Daten
  const configSyncService = useConfigSyncService() // Config Sync Service
  const dataRefreshInterval = ref(null) // Interval für automatische Datenaktualisierung

  // Lazy-Loading für OfflineFlushSyncService (Import erfolgt bei Bedarf)
  // HINWEIS: Dies ist sicher, da Pinia Stores Singletons sind.
  // Der Service wird nur einmal geladen und über alle Store-Instanzen geteilt.
  let offlineFlushSyncService = null
  const getFlushSyncService = async () => {
    if (!offlineFlushSyncService) {
      const module = await import('./OfflineFlushSyncService.js')
      offlineFlushSyncService = module.default
    }
    return offlineFlushSyncService
  }

  // Konfiguration
  const PING_INTERVAL = 30000 // 30 Sekunden
  const MAX_FAILURES_BEFORE_OFFLINE = 3 // Nach 3 fehlgeschlagenen Pings -> Offline
  const DATA_REFRESH_CHECK_INTERVAL = 3600000 // 1 Stunde (60 * 60 * 1000 ms)

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

          // Synchronisiere ausstehende Offline-Spülungen
          syncFlushData()
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
   * Synchronisiert ausstehende Offline-Spülungen
   */
  async function syncFlushData() {
    if (!isFullyOnline.value) {
      console.log('⏸️ Flush-Sync übersprungen - nicht online')
      return
    }

    try {
      const flushSyncService = await getFlushSyncService()
      console.log('🔄 Starte Flush-Synchronisation...')

      const result = await flushSyncService.attemptSync()

      if (result) {
        if (result.success) {
          console.log(`✅ ${result.successCount} Spülungen synchronisiert`)
          if (result.successCount > 0) {
            notifyUser(`${result.successCount} Spülungen erfolgreich synchronisiert`, 'success')
          }
        } else {
          console.warn(`⚠️ Flush-Sync teilweise fehlgeschlagen: ${result.errorCount} Fehler`)
          if (result.successCount > 0) {
            notifyUser(`${result.successCount} von ${result.total} Spülungen synchronisiert`, 'warning')
          }
        }
      }
    } catch (error) {
      console.error('❌ Fehler bei Flush-Synchronisation:', error)
      // Nicht als kritischer Fehler anzeigen, da es nur um Offline-Daten geht
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
   * Startet die automatische Datenaktualisierungs-Prüfung
   */
  function startDataRefreshMonitoring() {
    if (dataRefreshInterval.value) {
      console.log('⏱️ Datenaktualisierungs-Überwachung läuft bereits')
      return
    }

    console.log('🚀 Starte Datenaktualisierungs-Überwachung (alle 60 Minuten)...')

    // Regelmäßige Prüfung ob Daten aktualisiert werden müssen
    dataRefreshInterval.value = setInterval(() => {
      if (isFullyOnline.value) {
        console.log('⏰ Periodische Prüfung der Offline-Daten-Aktualität...')
        triggerPreloadIfNeeded()
      }
    }, DATA_REFRESH_CHECK_INTERVAL)
  }

  /**
   * Stoppt die automatische Datenaktualisierungs-Prüfung
   */
  function stopDataRefreshMonitoring() {
    if (dataRefreshInterval.value) {
      clearInterval(dataRefreshInterval.value)
      dataRefreshInterval.value = null
      console.log('⏸️ Datenaktualisierungs-Überwachung gestoppt')
    }
  }

  /**
   * Setzt manuell auf Offline
   * @param {boolean} offline - true für Offline-Modus, false für Online-Modus
   * @returns {Promise<boolean>} - true wenn erfolgreich, false wenn abgelehnt
   */
  async function setManualOffline(offline) {
    if (offline) {
      // Offline-Modus kann immer aktiviert werden
      manualOfflineMode.value = offline
      stopPingMonitoring()
      stopDataRefreshMonitoring()
      console.log('📴 Manueller Offline-Modus aktiviert')
      notifyUser('Offline-Modus aktiviert', 'info')
      return true
    } else {
      // Online-Modus: Erst Server-Health prüfen
      console.log('🔍 Prüfe Server-Status vor Online-Aktivierung...')

      try {
        const healthStatus = await healthClient.getStatus()

        if (!healthStatus.isHealthy()) {
          console.error('❌ Server ist nicht healthy - Online-Modus kann nicht aktiviert werden')
          console.error('Server Status:', healthStatus.data?.status || 'unknown')
          notifyUser('Online-Modus kann nicht aktiviert werden: Server ist nicht verfügbar oder fehlerhaft', 'error')
          return false
        }

        console.log('✅ Server ist healthy - aktiviere Online-Modus')

        // Erst nach erfolgreicher Health-Prüfung den Modus ändern
        manualOfflineMode.value = offline

        // Bei manuellem Online-Schalten: Ping-Überwachung wieder starten
        consecutiveFailures.value = 0
        isServerReachable.value = true
        startPingMonitoring()
        startDataRefreshMonitoring()
        console.log('📶 Manueller Online-Modus aktiviert')
        notifyUser('Online-Modus aktiviert', 'info')

        // Preloading starten wenn nötig oder möglich
        triggerPreloadIfNeeded()

        // Config-Synchronisation starten
        syncConfigChanges()

        // Flush-Synchronisation starten
        syncFlushData()

        return true
      } catch (error) {
        // Unterscheide zwischen Timeout und anderen Fehlern
        // Axios Timeout-Fehler haben error.code === 'ECONNABORTED' oder error.code === 'ERR_NETWORK'
        const isTimeout =
          error.code === 'ECONNABORTED' ||
          error.code === 'ERR_NETWORK' ||
          (error.name === 'AxiosError' && error.message?.toLowerCase().includes('timeout'))

        if (isTimeout) {
          console.error('⏱️ Server-Health-Prüfung: Timeout nach 3 Sekunden')
          notifyUser('Online-Modus kann nicht aktiviert werden: Server antwortet nicht (Timeout)', 'error')
        } else {
          console.error('❌ Fehler bei Server-Health-Prüfung:', error.message || error)
          notifyUser('Online-Modus kann nicht aktiviert werden: Server nicht erreichbar', 'error')
        }

        // App bleibt im Offline-Modus verwendbar
        return false
      }
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

    // Prüfe ob ein Token vorhanden ist (nur vorladen wenn angemeldet)
    try {
      const token = getToken()
      if (!token) {
        console.log('⏭️ Preloading übersprungen: kein gültiges Login (Token fehlt)')
        return
      }
    } catch (e) {
      console.warn('⚠️ Fehler beim Prüfen des Token-Status vor Preload:', e)
      return
    }

    if (dataPreloader.isPreloading.value) {
      console.log('⏸️ Preloading läuft bereits')
      return
    }

    // Prüfe ob Preloading nötig ist (Daten älter als 24h oder nicht vorhanden)
    if (!dataPreloader.isDataPreloaded() || dataPreloader.shouldRefreshData(24)) {
      const stats = dataPreloader.getPreloadStats()
      if (stats.preloaded && stats.hoursSinceLastPreload >= 24) {
        console.log(`🔄 Offline-Daten sind ${stats.hoursSinceLastPreload}h alt - starte automatische Aktualisierung...`)
        notifyUser(`Daten werden aktualisiert (${stats.hoursSinceLastPreload}h alt)...`, 'info')
      } else {
        console.log('🔄 Starte automatisches Preloading...')
        notifyUser('Lade Daten für Offline-Modus...', 'info')
      }

      const success = await dataPreloader.preloadAllData()

      if (success) {
        const updatedStats = dataPreloader.getPreloadStats()
        console.log('✅ Preloading erfolgreich:', updatedStats)
        notifyUser(
          `Offline-Daten geladen: ${updatedStats.buildingsCount} Gebäude, ${updatedStats.apartmentsCount} Apartments`,
          'success'
        )
      } else {
        console.error('❌ Preloading fehlgeschlagen')
        notifyUser('Fehler beim Laden der Offline-Daten', 'warning')
      }
    } else {
      const stats = dataPreloader.getPreloadStats()
      console.log(`✓ Offline-Daten sind aktuell (${stats.hoursSinceLastPreload}h alt)`)
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

    // Prüfe ob autoSync aktiviert ist
    const configStorage = useConfigStorage()
    const config = await configStorage.loadConfig()

    if (!config?.sync?.autoSync) {
      console.log('⏸️ Config-Sync übersprungen - autoSync deaktiviert')
      return
    }

    if (!(await configSyncService.hasPendingChanges())) {
      console.log('✓ Keine ausstehenden Konfigurationsänderungen')
      return
    }

    console.log('🔄 Synchronisiere Konfigurationsänderungen (autoSync)...')

    try {
      const result = await configSyncService.syncPendingChanges()

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

    // Zusätzliche Prüfung: Nur angemeldete Nutzer dürfen Preloading manuell anstoßen
    try {
      const token = getToken()
      if (!token) {
        notifyUser('Preloading erfordert ein aktives Login', 'warning')
        return false
      }
    } catch (e) {
      console.warn('⚠️ Fehler beim Prüfen des Token-Status vor manuellem Preload:', e)
      notifyUser('Preloading konnte nicht gestartet werden', 'error')
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
        // Flush-Synchronisation starten
        setTimeout(() => syncFlushData(), 4000) // 4 Sekunden Verzögerung
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
  async function initialize() {
    console.log('🔧 Initialisiere Online-Status-Store...')
    setupBrowserListeners()

    // manualOfflineMode wurde bereits synchron aus localStorage gesetzt
    // Prüfe zusätzlich IndexedDB für persistente Bestätigung
    try {
      const result = await indexedDBHelper.get(STORES.SETTINGS, MANUAL_OFFLINE_KEY)
      const indexedDBOffline = result && result.value === 'true'

      if (indexedDBOffline && !manualOfflineMode.value) {
        // IndexedDB sagt offline, localStorage nicht aktuell → setze offline
        manualOfflineMode.value = true
        localStorage.setItem(LS_OFFLINE_KEY, 'true')
        console.log('📴 Offline-Modus aus IndexedDB wiederhergestellt (localStorage war nicht aktuell)')
      } else if (!indexedDBOffline && manualOfflineMode.value && result !== null) {
        // IndexedDB sagt online (Wert existiert und ist false), localStorage sagt offline
        // IndexedDB hat Vorrang wenn Wert explizit gesetzt wurde
        manualOfflineMode.value = false
        localStorage.setItem(LS_OFFLINE_KEY, 'false')
        console.log('📶 Online-Modus aus IndexedDB wiederhergestellt')
      } else if (manualOfflineMode.value) {
        console.log('📴 Manueller Offline-Modus aus localStorage aktiv')
      }
    } catch (error) {
      console.warn('⚠️ Fehler beim Laden des Offline-Modus aus IndexedDB:', error)
      // localStorage-Wert bleibt als Fallback
    }

    // Ping und Preloading nur starten wenn nicht manuell offline
    if (!manualOfflineMode.value) {
      startPingMonitoring()
      startDataRefreshMonitoring()
      setTimeout(() => triggerPreloadIfNeeded(), 3000)
    } else {
      console.log('📴 Offline-Modus aktiv - kein Ping/Preloading')
    }
  }

  /**
   * Speichere manuellen Modus in IndexedDB UND localStorage (synchron)
   */
  watch(manualOfflineMode, async (newValue) => {
    // Synchron in localStorage speichern (sofort verfügbar beim nächsten Start)
    try {
      localStorage.setItem(LS_OFFLINE_KEY, newValue.toString())
    } catch (e) {
      console.warn('⚠️ localStorage nicht verfügbar:', e)
    }
    // Asynchron in IndexedDB speichern (persistente Speicherung)
    try {
      await indexedDBHelper.set(STORES.SETTINGS, {
        key: MANUAL_OFFLINE_KEY,
        value: newValue.toString()
      })
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Offline-Modus in IndexedDB:', error)
    }
  })

  /**
   * Watch auf isFullyOnline - Automatische Synchronisation beim Online-Kommen
   */
  watch(isFullyOnline, async (newValue, oldValue) => {
    // Nur reagieren wenn von Offline zu Online gewechselt wird
    if (newValue && !oldValue) {
      console.log('🔄 Status wechselte zu Online - starte automatische Synchronisation')

      // Kleine Verzögerung, damit der Status sich stabilisieren kann
      setTimeout(async () => {
        try {
          // 1. Preloading wenn nötig
          await triggerPreloadIfNeeded()

          // 2. Config-Synchronisation
          await syncConfigChanges()

          // 3. Flush-Synchronisation
          await syncFlushData()
        } catch (error) {
          console.error('❌ Fehler bei automatischer Synchronisation:', error)
        }
      }, 1000) // 1 Sekunde Verzögerung
    }
  })

  /**
   * Cleanup
   */
  function cleanup() {
    stopPingMonitoring()
    stopDataRefreshMonitoring()
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
    syncFlushData,
    forcePreload,
    initialize,
    cleanup
  }
})

