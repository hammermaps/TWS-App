// TokenManager.js - Automatische Token-Validierung alle 5 Minuten
import { ref, watch } from 'vue'
import { authToken, clearToken, isAuthenticated } from './GlobalToken.js'
import { clearUser } from './GlobalUser.js'
import { useUser } from '../api/useUser.js'
import { cookieManager } from './CookieManager.js'
import { useOnlineStatusStore } from './OnlineStatus.js'
import { getApiBaseUrl } from '../config/apiConfig.js'

// Token Check Interval (5 Minuten = 300000ms)
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000

// State
const tokenCheckInterval = ref(null)
const lastTokenCheck = ref(null)
const lastPageTokenCheck = ref(null) // Für Seitenaufruf-Checks
const lastActivity = ref(new Date()) // Letzte Benutzeraktivität
const tokenCheckActive = ref(false)
const isCheckingToken = ref(false) // Verhindert gleichzeitige Token-Checks
const inactivityTimer = ref(null) // Timer für Inaktivitätsprüfung

// Router Referenz für Weiterleitung
let routerInstance = null

// Router-Instanz setzen (wird von der App aufgerufen)
const setRouter = (router) => {
  routerInstance = router
}

// Activity-Tracking - Benutzeraktivität registrieren
const registerActivity = () => {
  lastActivity.value = new Date()

  // Inaktivitäts-Timer zurücksetzen
  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value)
  }

  // Neuen Timer für 5 Minuten Inaktivität setzen
  inactivityTimer.value = setTimeout(() => {
    console.log('🕐 5 Minuten Inaktivität - Token-Prüfung wird durchgeführt')
    performTokenCheck()
  }, TOKEN_CHECK_INTERVAL)
}

// Behandlung ungültiger Token
const handleInvalidToken = async () => {
  // Token und User löschen
  clearToken()
  clearUser()

  // Cookies löschen
  cookieManager.deletePHPSESSID()

  // SessionStorage für Page-Checks löschen
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('pageCheck_')) {
      sessionStorage.removeItem(key)
    }
  })

  // Inaktivitäts-Timer stoppen
  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value)
    inactivityTimer.value = null
  }

  // Zur Login-Seite weiterleiten
  if (routerInstance) {
    routerInstance.push('/login')
  }

  // Optional: Toast-Benachrichtigung
  if (window.showToast) {
    window.showToast('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.', 'warning')
  }
}

// Token-Prüfung bei Seitenaufruf (einmalig pro Route)
const checkTokenOnPageLoad = async (routeName) => {
  if (!authToken.value || !isAuthenticated.value) {
    console.warn('⚠️ checkTokenOnPageLoad: Kein Token oder nicht authentifiziert')
    return { valid: false, reason: 'Nicht authentifiziert' }
  }

  // Prüfe ob bereits eine Prüfung für diese Route stattgefunden hat
  const lastCheckKey = `pageCheck_${routeName}`
  const lastRouteCheck = sessionStorage.getItem(lastCheckKey)

  if (lastRouteCheck) {
    const timeSinceLastCheck = Date.now() - parseInt(lastRouteCheck)
    // Wenn weniger als 2 Minuten seit letzter Prüfung für diese Route
    if (timeSinceLastCheck < 120000) { // 2 Minuten
      console.log(`✅ Token für Route "${routeName}" bereits vor ${Math.round(timeSinceLastCheck / 1000)}s geprüft`)
      registerActivity() // Aktivität trotzdem registrieren
      return { valid: true, reason: 'Bereits kürzlich geprüft' }
    }
  }

  console.log(`🔍 Token-Prüfung bei Seitenaufruf für Route: ${routeName}`)

  try {
    isCheckingToken.value = true

    // Prüfe erst die Online-Verbindung mit OnlineStatus Store
    const onlineStatusStore = useOnlineStatusStore()
    if (!onlineStatusStore.isFullyOnline) {
      console.log('📴 Offline-Modus: Token-Prüfung übersprungen, Login bleibt aktiv')
      registerActivity()
      // Markiere als geprüft für diese Session
      sessionStorage.setItem(lastCheckKey, Date.now().toString())
      return { valid: true, reason: 'Offline-Modus: Lokales Token vertraut, Login aktiv' }
    }

    const baseUrl = getApiBaseUrl()
    const { validateToken } = useUser(baseUrl)

    // Timeout für Server-Anfrage setzen (5 Sekunden - erhöht von 3)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Server-Timeout')), 5000)
    })

    const result = await Promise.race([
      validateToken(authToken.value),
      timeoutPromise
    ])

    lastPageTokenCheck.value = new Date()
    sessionStorage.setItem(lastCheckKey, Date.now().toString())

    if (!result.valid) {
      console.warn('❌ Token bei Seitenaufruf ungültig - Benutzer wird abgemeldet')
      console.warn('🔍 Validierungsergebnis:', result)
      await handleInvalidToken()
      return { valid: false, reason: result.error || 'Token ungültig' }
    } else {
      console.log(`✅ Token bei Seitenaufruf für "${routeName}" gültig`)
      registerActivity() // Aktivität registrieren
      return { valid: true, reason: 'Token gültig' }
    }
  } catch (error) {
    console.error('❌ Fehler bei Seitenaufruf-Token-Prüfung:', error)
    console.error('🔍 Error details:', { name: error.name, message: error.message, stack: error.stack?.substring(0, 200) })

    // Bei Netzwerkfehlern (Server nicht erreichbar) nicht abmelden
    if (error.message.includes('fetch') ||
        error.message.includes('Network') ||
        error.message.includes('Server-Timeout') ||
        error.message.includes('AbortError') ||
        error.name === 'TypeError' ||
        error.name === 'AbortError') {
      console.log('🌐 Server nicht erreichbar oder Request abgebrochen: Token-Prüfung übersprungen, vertraue lokalem Token')
      registerActivity()
      // Markiere als "geprüft" für diese Session (aber kürzer gültig)
      sessionStorage.setItem(lastCheckKey, (Date.now() - 60000).toString()) // 1 Minute früher
      return { valid: true, reason: 'Server nicht erreichbar: Lokales Token vertraut' }
    }

    // Bei anderen Fehlern weiterhin fehlschlagen, aber NICHT abmelden bei unerwarteten Fehlern
    console.warn('⚠️ Unerwarteter Fehler bei Token-Prüfung, vertraue lokalem Token')
    return { valid: true, reason: `Fehler bei Validierung (${error.message}), behalte Token` }
  } finally {
    isCheckingToken.value = false
  }
}

// Token-Prüfung durchführen mit Debouncing
const performTokenCheck = async () => {
  if (!authToken.value || !isAuthenticated.value) {
    return { valid: false, reason: 'Nicht authentifiziert' }
  }

  // Verhindere gleichzeitige Token-Checks
  if (isCheckingToken.value) {
    console.log('🔄 Token-Check bereits in Bearbeitung, überspringe...')
    return { valid: true, reason: 'Check bereits aktiv' }
  }

  // Überspringe wenn letzter Check weniger als 30 Sekunden her ist
  if (lastTokenCheck.value) {
    const timeSinceLastCheck = Date.now() - lastTokenCheck.value.getTime()
    if (timeSinceLastCheck < 30000) { // 30 Sekunden Mindestabstand
      console.log('🕐 Letzter Token-Check vor', Math.round(timeSinceLastCheck / 1000), 'Sekunden, überspringe...')
      return { valid: true, reason: 'Zu früh für neuen Check' }
    }
  }

  isCheckingToken.value = true
  console.log('🔍 Automatische Token-Prüfung wird durchgeführt...')
  console.log('🍪 PHPSESSID:', cookieManager.getPHPSESSID())

  try {
    // Prüfe erst die Online-Verbindung mit OnlineStatus Store
    const onlineStatusStore = useOnlineStatusStore()
    if (!onlineStatusStore.isFullyOnline) {
      console.log('📴 Offline-Modus: Automatische Token-Prüfung übersprungen, Login bleibt aktiv')
      lastTokenCheck.value = new Date()
      registerActivity()
      return { valid: true, reason: 'Offline-Modus: Token-Prüfung übersprungen, Login aktiv' }
    }

    const baseUrl = getApiBaseUrl()
    const { validateToken } = useUser(baseUrl)

    // Timeout für Server-Anfrage setzen (5 Sekunden bei automatischer Prüfung)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Server-Timeout')), 5000)
    })

    const result = await Promise.race([
      validateToken(authToken.value),
      timeoutPromise
    ])

    lastTokenCheck.value = new Date()

    if (!result.valid) {
      console.warn('❌ Token ist ungültig - Benutzer wird abgemeldet')
      await handleInvalidToken()
      return { valid: false, reason: result.error || 'Token ungültig' }
    } else {
      console.log('✅ Token ist gültig')
      registerActivity() // Aktivität registrieren
      return { valid: true, reason: 'Token gültig' }
    }
  } catch (error) {
    console.error('❌ Fehler bei Token-Prüfung:', error)
    console.error('🔍 Error details:', { name: error.name, message: error.message })
    lastTokenCheck.value = new Date()

    // Bei Netzwerkfehlern (Server nicht erreichbar) nicht abmelden
    if (error.message.includes('fetch') ||
        error.message.includes('Network') ||
        error.message.includes('Server-Timeout') ||
        error.message.includes('AbortError') ||
        error.name === 'TypeError' ||
        error.name === 'AbortError') {
      console.log('🌐 Server nicht erreichbar oder Request abgebrochen: Automatische Token-Prüfung übersprungen, behalte Token')
      registerActivity()
      return { valid: true, reason: 'Server nicht erreichbar: Token behalten' }
    }

    // Bei anderen Fehlern weiterhin fehlschlagen, aber nur bei kritischen Fehlern abmelden
    console.warn('⚠️ Unerwarteter Fehler bei automatischer Token-Prüfung, behalte Token')
    return { valid: true, reason: `Fehler bei Validierung (${error.message}), Token behalten` }
  } finally {
    isCheckingToken.value = false
  }
}

// Intervall starten
const startTokenCheck = () => {
  if (tokenCheckInterval.value) {
    clearInterval(tokenCheckInterval.value)
  }

  if (authToken.value) {
    console.log('🔄 Token-Überwachung gestartet (alle 5 Minuten)')
    tokenCheckActive.value = true
    registerActivity() // Erste Aktivität registrieren

    // Erste Prüfung nach 30 Sekunden (nicht sofort nach Login)
    setTimeout(performTokenCheck, 30000)

    // Dann alle 5 Minuten
    tokenCheckInterval.value = setInterval(performTokenCheck, TOKEN_CHECK_INTERVAL)
  }
}

// Intervall stoppen
const stopTokenCheck = () => {
  if (tokenCheckInterval.value) {
    clearInterval(tokenCheckInterval.value)
    tokenCheckInterval.value = null
  }

  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value)
    inactivityTimer.value = null
  }

  tokenCheckActive.value = false
  console.log('⏹️ Token-Überwachung gestoppt')
}

// Manuelle Token-Prüfung
const checkTokenNow = async () => {
  return await performTokenCheck()
}

// Watcher für Token-Änderungen
watch(authToken, (newToken) => {
  if (newToken) {
    startTokenCheck()
  } else {
    stopTokenCheck()
  }
}, { immediate: true })

// Beim Browser-Tab-Wechsel prüfen (falls Tab lange inaktiv war)
let isTabActive = true
const handleVisibilityChange = async () => {
  if (document.hidden) {
    isTabActive = false
  } else {
    isTabActive = true

    // Wenn Tab wieder aktiv und mehr als 5 Minuten seit letzter Prüfung
    if (authToken.value && lastTokenCheck.value) {
      const timeSinceLastCheck = Date.now() - lastTokenCheck.value.getTime()
      if (timeSinceLastCheck > TOKEN_CHECK_INTERVAL) {
        console.log('🔍 Tab wieder aktiv - Token-Prüfung wird durchgeführt')
        await performTokenCheck()
      }
    }
  }
}

// Activity Handler - separate Funktion für bessere Verwaltung
const handleActivity = () => {
  if (authToken.value && tokenCheckActive.value) {
    registerActivity()
  }
}

// Event Listener Referenzen für Cleanup speichern
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
let listenersAttached = false

// Event Listener hinzufügen
const attachEventListeners = () => {
  if (listenersAttached || typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  // Tab-Sichtbarkeit
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Benutzeraktivität
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true })
  })

  // Page Unload
  window.addEventListener('beforeunload', cleanup)

  listenersAttached = true
  console.log('✅ Event Listeners für TokenManager registriert')
}

// Event Listener entfernen
const detachEventListeners = () => {
  if (!listenersAttached || typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  // Tab-Sichtbarkeit
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // Benutzeraktivität
  activityEvents.forEach(event => {
    document.removeEventListener(event, handleActivity)
  })

  // Page Unload
  window.removeEventListener('beforeunload', cleanup)

  listenersAttached = false
  console.log('✅ Event Listeners für TokenManager entfernt')
}

// Cleanup bei Seiten-Verlassen
const cleanup = () => {
  stopTokenCheck()
  detachEventListeners()
}

// Event Listeners beim Modul-Load einmalig hinzufügen
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  attachEventListeners()
}

// Cookie-Manager Debugging-Funktionen hinzufügen
const debugCookies = () => {
  cookieManager.debug()
}

// Erweitere die Exports
export {
  tokenCheckInterval,
  lastTokenCheck,
  lastPageTokenCheck,
  lastActivity,
  tokenCheckActive,
  startTokenCheck,
  stopTokenCheck,
  checkTokenNow,
  checkTokenOnPageLoad,
  registerActivity,
  performTokenCheck,
  setRouter,
  cleanup,
  attachEventListeners,
  detachEventListeners,
  debugCookies,
  cookieManager
}
