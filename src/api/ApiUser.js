// ApiUser.js - Moderne API-Client-Klasse für User-Aktionen
import { getAuthHeaders } from '../stores/GlobalToken.js'
import { UserItem, currentUser } from '../stores/GlobalUser.js'
import { parseCookiesFromResponse } from '../stores/CookieManager.js'
import { useOnlineStatusStore } from '../stores/OnlineStatus.js'
import { getApiTimeout, getMaxRetries } from '../utils/ApiConfigHelper.js'
import { getApiBaseUrl } from '../config/apiConfig.js'
import ImageCache from '@/services/ImageCache.js'

/**
 * Standardisierte API-Response-Klasse
 * Entspricht dem API-Format: {"success": true/false, "data": {...}, "error": "", "server_time": 123, "response_time": 1.23}
 */
export class ApiResponse {
  constructor({ success = false, data = null, error = "", server_time = 0, response_time = 0, message = "", raw = null }) {
    this.success = success
    this.data = data
    this.error = error
    this.server_time = server_time
    this.response_time = response_time
    this.message = message
    this.raw = raw

    // Rückwärtskompatibilität für Token/User Extraktion
    if (this.data && typeof this.data === 'object') {
      if ('token' in this.data) this.token = this.data.token
      if ('user' in this.data) this.user = this.data.user
    }
  }
}

/**
 * API-Request-Konfiguration
 */
export class ApiRequest {
  constructor({
    endpoint,
    method = "GET",
    body = null,
    headers = {},
    timeout = null,
    retries = null,
  }) {
    this.endpoint = endpoint
    this.method = method
    this.body = body
    this.headers = headers
    // Verwende Konfigurationswerte mit Fallback
    this.timeout = getApiTimeout(timeout)
    this.retries = getMaxRetries(retries)
  }
}

/**
 * Response-Klassen für verschiedene User-API-Endpunkte
 */
export class UserListResponse {
  constructor({ items = [], success = false, error = "", server_time = 0, response_time = 0 } = {}) {
    this.items = Array.isArray(items) ? items.map(u => u instanceof UserItem ? u : new UserItem(u)) : []
    this.success = !!success
    this.error = error ?? ""
    this.server_time = Number(server_time) || 0
    this.response_time = Number(response_time) || 0
  }

  toJSON() {
    return {
      items: this.items,
      success: this.success,
      error: this.error,
      server_time: this.server_time,
      response_time: this.response_time,
    }
  }
}

export class UserRoleResponse {
  constructor({ role = "", enabled = false } = {}) {
    this.role = typeof role === "string" ? role : ""
    this.enabled = !!enabled
  }
}

export class UserLoginResponse {
  constructor({ token = "", user = null } = {}) {
    this.token = typeof token === "string" ? token : ""
    this.user = user ? (user instanceof UserItem ? user : new UserItem(user)) : null
  }
}

export class TokenCheckResponse {
  constructor({ success = false, error = "", valid = false, session_time = 0, user_data = null } = {}) {
    this.success = !!success
    this.error = error ?? ""
    this.valid = !!valid
    this.session_time = Number(session_time) || 0
    this.user_data = user_data
  }
}

/**
 * Helper-Funktionen für Datenkonvertierung
 */
function toPlainUserPartial(value = {}) {
  const out = {}
  if (value == null || typeof value !== "object") return out
  if ("id" in value) out.id = typeof value.id === "string" ? parseInt(value.id, 10) : Number(value.id) || 0
  if ("name" in value) out.name = value.name
  if ("email" in value) out.email = value.email
  if ("username" in value) out.username = value.username
  if ("password" in value) out.password = value.password
  if ("role" in value) out.role = value.role
  if ("enabled" in value) out.enabled = !!value.enabled
  return out
}

function toPlainRegister(value = {}) {
  const out = {}
  out.username = typeof value.username === "string" ? value.username : ""
  out.password = typeof value.password === "string" ? value.password : ""
  if (typeof value.name === "string") out.name = value.name
  if (typeof value.email === "string") out.email = value.email
  return out
}

function toPlainLogin(value = {}) {
  const out = {}
  out.username = typeof value.username === "string" ? value.username : ""
  out.password = typeof value.password === "string" ? value.password : ""
  return out
}

function toPlainChangePassword(value = {}) {
  const out = {}
  out.oldPassword = typeof value.oldPassword === "string" ? value.oldPassword : ""
  out.newPassword = typeof value.newPassword === "string" ? value.newPassword : ""
  return out
}

/**
 * Hauptklasse für User-API-Operationen
 */
export class ApiUser {
  constructor(baseUrl = null) {
    // Im Development-Mode verwenden wir den Vite-Proxy, in Production die direkte URL
    this.baseUrl = baseUrl || getApiBaseUrl()
  }

  /**
   * Interne Methode für HTTP-Requests mit Retry-Logic
   */
  async send(request, attempt = 0) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), request.timeout)

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...request.headers,
        ...getAuthHeaders()
      }

      const config = {
        method: request.method,
        headers,
        signal: controller.signal,
        credentials: 'include',
        mode: 'cors'
      }

      if (request.body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        config.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
        console.log('📤 Sending request body:', config.body)
      }

      console.log('🚀 Making request to:', `${this.baseUrl}${request.endpoint}`)
      console.log('📋 Request headers:', headers)

      const response = await fetch(`${this.baseUrl}${request.endpoint}`, config)
      clearTimeout(timeoutId)

      console.log('📥 Response status:', response.status)
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))

      // Cookies aus Response parsen und speichern
      parseCookiesFromResponse(response)

      let responseData
      const contentType = response.headers.get('content-type')

      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json()
          console.log('✅ JSON Response:', responseData)
        } else {
          // Falls HTML zurückkommt, als Fehler behandeln
          const textResponse = await response.text()
          console.error('❌ Non-JSON response received:', textResponse.substring(0, 200))

          if (textResponse.includes("doesn't work properly without JavaScript")) {
            responseData = {
              success: false,
              error: 'Backend antwortet mit HTML statt JSON - Proxy-Konfiguration prüfen',
              data: null
            }
          } else {
            responseData = {
              success: false,
              error: 'Ungültige Antwort vom Server',
              data: null
            }
          }
        }
      } catch (parseError) {
        console.error('❌ Error parsing response:', parseError)
        responseData = { success: false, error: 'Fehler beim Parsen der Server-Antwort', data: null }
      }

      return new ApiResponse({
        success: response.ok && (responseData.success !== false),
        data: responseData.data || null,
        error: responseData.error || (!response.ok ? `HTTP ${response.status}: ${response.statusText}` : null),
        message: responseData.message || null,
        server_time: responseData.server_time || 0,
        response_time: responseData.response_time || 0,
        raw: responseData
      })
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('❌ Network error:', error)

      if (attempt < request.retries && !controller.signal.aborted) {
        console.log(`🔄 Retrying request (attempt ${attempt + 1}/${request.retries})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        return this.send(request, attempt + 1)
      }

      return new ApiResponse({
        success: false,
        error: error.name === 'AbortError' ? 'Request timeout' : (error.message || 'Netzwerkfehler'),
        data: null
      })
    }
  }

  /**
   * POST /user/register - Benutzer registrieren
   */
  async register(data = {}, options = {}) {
    const { timeout = null, headers = {} } = options

    const request = new ApiRequest({
      endpoint: "/user/register",
      method: "POST",
      body: toPlainRegister(data),
      headers,
      timeout,
    })

    const response = await this.send(request)
    return response.data ? new UserItem(response.data) : { success: response.success, error: response.error }
  }

  /**
   * POST /user/login - Benutzer anmelden
   */
  async login(data = {}, options = {}) {
    const { timeout = null, headers = {} } = options

    const request = new ApiRequest({
      endpoint: "/user/login",
      method: "POST",
      body: toPlainLogin(data),
      headers,
      timeout,
      retries: 3
    })

    const response = await this.send(request)

    if (!response.success) {
      return new UserLoginResponse({ token: "", user: null })
    }

    const token = response.data?.token || ""
    const user = response.data?.user ? new UserItem(response.data.user) : null

    return new UserLoginResponse({ token, user })
  }

  /**
   * GET /user/get oder /user/get/{id} - Benutzer abrufen
   */
  async get(id = null, options = {}) {
    const { timeout = null, headers = {} } = options

    // Offline-Check: Lade aus IndexedDB wenn offline
    let isOffline = !navigator.onLine
    try {
      const onlineStatus = useOnlineStatusStore()
      if (!onlineStatus.isFullyOnline || onlineStatus.manualOfflineMode) {
        isOffline = true
      }
    } catch (e) {
      // Store nicht verfügbar, navigator.onLine als Fallback
    }
    if (isOffline) {
      console.log('📴 Offline-Modus: Lade User aus IndexedDB...')
      try {
        const { getCurrentUser } = await import('../stores/GlobalUser.js')
        const user = await getCurrentUser()
        if (user) return user
      } catch (e) {
        console.warn('⚠️ Konnte User nicht aus IndexedDB laden:', e)
      }
      return null
    }

    const endpoint = id == null || id === "" ? "/user/get" : `/user/get/${encodeURIComponent(id)}`
    const request = new ApiRequest({
      endpoint,
      method: "GET",
      headers,
      timeout,
    })

    const response = await this.send(request)
    return response.data ? new UserItem(response.data) : null
  }

  /**
   * Alias für get() ohne Parameter
   */
  async getCurrentUser(options = {}) {
    return await this.get(null, options)
  }
  async list(options = {}) {
    const { timeout = null, headers = {} } = options

    const request = new ApiRequest({
      endpoint: "/user/list",
      method: "GET",
      headers,
      timeout,
    })

    const response = await this.send(request)
    const items = Array.isArray(response.data) ? response.data : []

    return new UserListResponse({
      items,
      success: response.success,
      error: response.error,
      server_time: response.server_time,
      response_time: response.response_time,
    })
  }

  /**
   * POST /user/update/{id} - Benutzer aktualisieren
   */
  async update(id, partial = {}, options = {}) {
    const { timeout = null, headers = {} } = options

    const body = toPlainUserPartial(partial)
    // ID nicht im Body senden
    if (body && typeof body === 'object' && 'id' in body) delete body.id

    const request = new ApiRequest({
      endpoint: `/user/update/${encodeURIComponent(id)}`,
      method: "POST",
      body,
      headers,
      timeout,
    })

    const response = await this.send(request)
    const user = response.data ? new UserItem(response.data) : null

    // Wenn Update erfolgreich und user zurückgegeben wurde, Cache für Avatar entfernen
    if (user && user.id) {
      try {
        await ImageCache.remove(user.id)
      } catch (e) {
        // Fehler beim Entfernen ignorieren
        console.warn('Could not remove avatar cache after user update', e)
      }
    }

    return user
  }

  /**
   * GET /user/role - Benutzerrolle abrufen
   */
  async getRole(options = {}) {
    const { timeout = null, headers = {} } = options

    // ✅ NEU: Im Offline-Modus Rolle aus LocalStorage (currentUser) zurückgeben
    let isOffline = !navigator.onLine
    try {
      const onlineStatus = useOnlineStatusStore()
      if (!onlineStatus.isFullyOnline) isOffline = true
    } catch (e) { /* Store nicht verfügbar */ }

    if (isOffline) {
      console.log('📴 Offline-Modus: Verwende Rolle aus LocalStorage, kein API-Call')

      // Versuche Rolle aus currentUser zu holen
      const cachedRole = currentUser.value?.role || 'user'

      return new UserRoleResponse({
        role: cachedRole,
        enabled: true
      })
    }

    const request = new ApiRequest({
      endpoint: "/user/role",
      method: "GET",
      headers,
      timeout,
    })

    const response = await this.send(request)
    return new UserRoleResponse(response.data || {})
  }

  /**
   * POST /user/setrole - Benutzerrolle setzen
   */
  async setRole(data = {}, options = {}) {
    const { timeout = null, headers = {} } = options

    const request = new ApiRequest({
      endpoint: "/user/setrole",
      method: "POST",
      body: toPlainUserPartial(data),
      headers,
      timeout,
    })

    const response = await this.send(request)
    return response.data ? new UserItem(response.data) : { success: response.success, error: response.error }
  }

  /**
   * DELETE /user/remove/{id} - Benutzer löschen
   */
  async remove(id, options = {}) {
    const { timeout = null, headers = {} } = options

    const request = new ApiRequest({
      endpoint: `/user/remove/${encodeURIComponent(id)}`,
      method: "DELETE",
      headers,
      timeout,
    })

    const response = await this.send(request)
    return { success: response.success, error: response.error }
  }

  /**
   * POST /user/logout - Benutzer abmelden
   */
  async logout(options = {}) {
    const { timeout = null, headers = {} } = options

    const request = new ApiRequest({
      endpoint: "/user/logout",
      method: "POST",
      headers,
      timeout,
    })

    const response = await this.send(request)
    return { success: response.success, error: response.error }
  }

  /**
   * POST /user/changepw - Passwort ändern
   */
  async changePassword(data = {}, options = {}) {
    const { timeout = null, headers = {} } = options

    const request = new ApiRequest({
      endpoint: "/user/changepw",
      method: "POST",
      body: toPlainChangePassword(data),
      headers,
      timeout,
    })

    const response = await this.send(request)
    return { success: response.success, error: response.error }
  }

  /**
   * POST /user/checktoken - Token validieren
   */
  async checkToken(token = null, options = {}) {
    const { timeout = null, headers = {} } = options

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return new TokenCheckResponse({
        success: false,
        valid: false,
        error: 'Kein Token vorhanden'
      })
    }

    const request = new ApiRequest({
      endpoint: "/user/checktoken",
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: { token },
      timeout,
    })

    try {
      const response = await this.send(request)
      const valid = response.data?.valid ?? response.success

      // Session-Zeit und User-Daten aus der Response extrahieren
      const session_time = response.data?.session_time || response.raw?.session_time || 0
      const user_data = response.data?.user || response.data?.user_data || null

      return new TokenCheckResponse({
        success: response.success,
        valid,
        error: response.error,
        session_time,
        user_data
      })
    } catch (error) {
      return new TokenCheckResponse({
        success: false,
        valid: false,
        error: error.message || 'Token-Prüfung fehlgeschlagen'
      })
    }
  }

  /**
   * Alias für get() ohne Parameter
   */
  async getCurrentUser(options = {}) {
    return await this.get(null, options)
  }

  /**
   * GET /user/photo/{id} - Profilbild als Base64 laden (mit lokalem Cache)
   * Rückgabe: { success: boolean, data: { base64: string|null }, error: string|null }
   * Optionen: { timeout, headers, ttlMinutes }
   */
  async getProfileImage(userId, options = {}) {
    const { timeout = null, headers = {}, ttlMinutes = 24 * 60 } = options

    // Validierung
    if (!userId) {
      return { success: false, data: null, error: 'No userId provided' }
    }

    try {
      // Prüfe IndexedDB Cache zuerst
      try {
        const cached = await ImageCache.get(userId)
        if (cached && cached.base64) {
          const ageMinutes = Math.floor((Date.now() - (cached.ts || 0)) / 60000)
          if (ageMinutes <= ttlMinutes) {
            return { success: true, data: { base64: cached.base64 }, error: null }
          }
          // Wenn Cache abgelaufen, aber App offline -> gib alten Cache zurück
          const onlineStatus = useOnlineStatusStore()
          if (!onlineStatus.isFullyOnline || onlineStatus.manualOfflineMode) {
            console.warn('Offline oder manueller Offline-Modus - verwende abgelaufenen IndexedDB-Cache für Profilbild')
            return { success: true, data: { base64: cached.base64 }, error: null }
          }
          // sonst weiter zum Server-Request
        }
      } catch (e) {
        console.warn('Fehler beim Lesen aus ImageCache:', e)
      }


      // Wenn wir offline sind, aber kein Cache oder Cache ungültig -> Fehler
      const onlineStatus = useOnlineStatusStore()
      if (!onlineStatus.isFullyOnline || onlineStatus.manualOfflineMode) {
        return { success: false, data: null, error: 'Offline - kein Profilbild im Cache' }
      }

      // Request an Backend
      const endpoint = `/user/photo/${encodeURIComponent(userId)}`
      const request = new ApiRequest({ endpoint, method: 'GET', headers, timeout })
      const response = await this.send(request)

      if (!response.success || !response.data) {
        return { success: false, data: null, error: response.error || 'No data' }
      }

      // Erwartet: response.data.base64 oder response.data
      const base64 = typeof response.data === 'string' ? response.data : (response.data.base64 || null)
      if (!base64) {
        return { success: false, data: null, error: 'No base64 image in response' }
      }

      // Cache in IndexedDB speichern
      try {
        await ImageCache.set(userId, base64)
      } catch (e) {
        console.warn('Konnte Profilbild nicht in ImageCache speichern', e)
      }


      return { success: true, data: { base64 }, error: null }
    } catch (error) {
      console.error('Fehler beim Laden des Profilbildes:', error)
      return { success: false, data: null, error: error.message || 'Error' }
    }
  }
}

// Default Export
export default ApiUser
