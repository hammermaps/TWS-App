// Cookie-Manager für PHP Session und andere Cookies
// Verwaltet PHPSESSID automatisch für alle API-Calls

export class CookieManager {
  static instance = null

  constructor() {
    if (CookieManager.instance) {
      return CookieManager.instance
    }

    this.cookies = new Map()
    this.loadFromDocument()
    CookieManager.instance = this
  }

  /**
   * Singleton Pattern - nur eine Instanz
   */
  static getInstance() {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager()
    }
    return CookieManager.instance
  }

  /**
   * Lädt alle Cookies aus document.cookie
   */
  loadFromDocument() {
    if (typeof document === 'undefined') return

    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        this.cookies.set(name, decodeURIComponent(value))
      }
    }
  }

  /**
   * Cookie setzen
   */
  setCookie(name, value, options = {}) {
    this.cookies.set(name, value)

    if (typeof document === 'undefined') return

    let cookieString = `${name}=${encodeURIComponent(value)}`

    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`
    }

    if (options.maxAge) {
      cookieString += `; max-age=${options.maxAge}`
    }

    if (options.path) {
      cookieString += `; path=${options.path}`
    } else {
      cookieString += `; path=/`
    }

    if (options.domain) {
      cookieString += `; domain=${options.domain}`
    }

    if (options.secure) {
      cookieString += `; secure`
    }

    if (options.httpOnly) {
      cookieString += `; httpOnly`
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`
    }

    document.cookie = cookieString
  }

  /**
   * Cookie abrufen
   */
  getCookie(name) {
    return this.cookies.get(name) || null
  }

  /**
   * Cookie löschen
   */
  deleteCookie(name, options = {}) {
    this.cookies.delete(name)

    if (typeof document === 'undefined') return

    const path = options.path || '/'
    const domain = options.domain || ''

    let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`

    if (domain) {
      cookieString += `; domain=${domain}`
    }

    document.cookie = cookieString
  }

  /**
   * Alle Cookies als Header-String für fetch() requests
   */
  getCookieHeader() {
    const cookieArray = []
    for (const [name, value] of this.cookies) {
      cookieArray.push(`${name}=${encodeURIComponent(value)}`)
    }
    return cookieArray.join('; ')
  }

  /**
   * PHPSESSID spezifische Methoden
   */
  getPHPSESSID() {
    return this.getCookie('PHPSESSID')
  }

  setPHPSESSID(sessionId) {
    this.setCookie('PHPSESSID', sessionId, {
      path: '/',
      sameSite: 'Lax'
    })
  }

  deletePHPSESSID() {
    this.deleteCookie('PHPSESSID')
  }

  /**
   * Response-Cookies aus Set-Cookie Header parsen und speichern
   */
  parseSetCookieHeaders(response) {
    if (!response.headers) return

    // In Browser mit Proxy kann man Set-Cookie Header manchmal nicht direkt lesen
    // aber document.cookie wird automatisch aktualisiert
    setTimeout(() => {
      this.loadFromDocument()
    }, 100)

    // Zusätzlich: Versuche Set-Cookie Header zu lesen (falls verfügbar)
    try {
      const setCookieHeaders = response.headers.get('set-cookie')
      if (setCookieHeaders) {
        // Parse Set-Cookie Header manuell (nur für Debug-Zwecke)
        console.log('🍪 Set-Cookie Header erkannt:', setCookieHeaders)
      }
    } catch (error) {
      // Browser blockiert normalerweise den Zugriff auf Set-Cookie Header
      // Das ist normal und erwartet
      console.debug('Set-Cookie Header nicht verfügbar (normal im Browser)')
    }
  }

  /**
   * Alle Cookies zurücksetzen
   */
  clearAll() {
    this.cookies.clear()

    if (typeof document === 'undefined') return

    // Alle verfügbaren Cookies löschen
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name] = cookie.trim().split('=')
      if (name) {
        this.deleteCookie(name)
      }
    }
  }

  /**
   * Debug-Informationen mit Proxy-Status
   */
  debug() {
    console.log('🍪 CookieManager Debug:')
    console.log('Environment:', import.meta.env.DEV ? 'Development (Proxy)' : 'Production')
    console.log('PHPSESSID:', this.getPHPSESSID())
    console.log('Alle Cookies:', Object.fromEntries(this.cookies))
    console.log('Cookie Header:', this.getCookieHeader())
    console.log('Document Cookies:', document.cookie)
  }
}

// Globale Instanz exportieren
export const cookieManager = CookieManager.getInstance()

// Convenience Funktionen
export const getPHPSESSID = () => cookieManager.getPHPSESSID()
export const setPHPSESSID = (sessionId) => cookieManager.setPHPSESSID(sessionId)
export const getCookieHeader = () => cookieManager.getCookieHeader()
export const parseCookiesFromResponse = (response) => cookieManager.parseSetCookieHeaders(response)

export default cookieManager
