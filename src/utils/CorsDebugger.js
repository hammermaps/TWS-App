// CORS-Test und Debug-Utility
// Testet die CORS-Konfiguration und API-Verbindung

export class CorsDebugger {
  constructor() {
    this.baseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:4040'
  }

  /**
   * Testet CORS mit einem einfachen GET-Request
   */
  async testCors() {
    console.log('🔍 CORS-Test wird durchgeführt...')

    try {
      const response = await fetch(`${this.baseUrl}/health/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      console.log('✅ CORS-Test erfolgreich!')
      console.log('Status:', response.status)
      console.log('Headers:')

      // Alle Response-Header anzeigen
      for (const [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`)
      }

      const data = await response.json()
      console.log('Response Data:', data)

      return { success: true, response, data }
    } catch (error) {
      console.error('❌ CORS-Test fehlgeschlagen:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Testet OPTIONS Preflight Request
   */
  async testPreflight() {
    console.log('🔍 Preflight-Test wird durchgeführt...')

    try {
      const response = await fetch(`${this.baseUrl}/health/status`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3001',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      })

      console.log('✅ Preflight-Test erfolgreich!')
      console.log('Status:', response.status)
      console.log('CORS Headers:')

      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-credentials',
        'access-control-allow-methods',
        'access-control-allow-headers'
      ]

      corsHeaders.forEach(header => {
        const value = response.headers.get(header)
        console.log(`  ${header}: ${value || 'NICHT GESETZT'}`)
      })

      return { success: true, response }
    } catch (error) {
      console.error('❌ Preflight-Test fehlgeschlagen:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Vollständiger CORS-Diagnose-Test
   */
  async diagnose() {
    console.log('🚀 Vollständige CORS-Diagnose...')
    console.log('Base URL:', this.baseUrl)
    console.log('Environment:', import.meta.env.DEV ? 'Development' : 'Production')

    const results = {
      preflight: await this.testPreflight(),
      cors: await this.testCors()
    }

    console.log('📊 Diagnose-Ergebnisse:', results)

    if (results.preflight.success && results.cors.success) {
      console.log('🎉 CORS ist korrekt konfiguriert!')
    } else {
      console.log('⚠️ CORS-Probleme erkannt:')
      if (!results.preflight.success) {
        console.log('- Preflight-Request fehlgeschlagen')
      }
      if (!results.cors.success) {
        console.log('- CORS-Request fehlgeschlagen')
      }
    }

    return results
  }

  /**
   * Cookie-Status prüfen
   */
  checkCookies() {
    console.log('🍪 Cookie-Status:')
    console.log('Document cookies:', document.cookie)
    console.log('PHPSESSID:', this.getCookie('PHPSESSID'))
  }

  /**
   * Helper: Cookie abrufen
   */
  getCookie(name) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
    return null
  }

  /**
   * Testet Login-Endpoint
   */
  async testLogin(credentials = { username: 'test', password: 'test' }) {
    console.log('🔐 Login-Test wird durchgeführt...')

    try {
      const response = await fetch(`${this.baseUrl}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(credentials),
        credentials: 'include'
      })

      console.log('Status:', response.status)
      console.log('CORS Headers für Login:')

      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-credentials',
        'access-control-allow-methods',
        'access-control-allow-headers'
      ]

      corsHeaders.forEach(header => {
        const value = response.headers.get(header)
        console.log(`  ${header}: ${value || 'NICHT GESETZT'}`)
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Login-Test erfolgreich!')
        console.log('Response Data:', data)
        return { success: true, response, data }
      } else {
        console.log('⚠️ Login-Request erfolgreich, aber API-Fehler:', data.error)
        return { success: false, response, data, error: data.error }
      }
    } catch (error) {
      console.error('❌ Login-Test fehlgeschlagen:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Testet User-Check-Token Endpoint
   */
  async testCheckToken(token = 'dummy-token') {
    console.log('🔑 Token-Check-Test wird durchgeführt...')

    try {
      const response = await fetch(`${this.baseUrl}/user/checktoken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ token }),
        credentials: 'include'
      })

      console.log('Status:', response.status)
      const data = await response.json()

      if (response.ok) {
        console.log('✅ Token-Check-Test erfolgreich!')
        console.log('Response Data:', data)
        return { success: true, response, data }
      } else {
        console.log('⚠️ Token-Check-Request erfolgreich, aber API-Fehler:', data.error)
        return { success: false, response, data, error: data.error }
      }
    } catch (error) {
      console.error('❌ Token-Check-Test fehlgeschlagen:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Testet Health-Ping Endpoint
   */
  async testHealthPing() {
    console.log('🏓 Health-Ping-Test wird durchgeführt...')

    try {
      const response = await fetch(`${this.baseUrl}/health/ping`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      })

      console.log('Status:', response.status)
      const data = await response.json()

      if (response.ok) {
        console.log('✅ Health-Ping-Test erfolgreich!')
        console.log('Response Data:', data)
        return { success: true, response, data }
      } else {
        console.log('⚠️ Health-Ping-Request erfolgreich, aber API-Fehler:', data.error)
        return { success: false, response, data, error: data.error }
      }
    } catch (error) {
      console.error('❌ Health-Ping-Test fehlgeschlagen:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Vollständiger API-Test aller wichtigen Endpunkte
   */
  async testAllEndpoints() {
    console.log('🚀 Vollständiger API-Test aller Endpunkte...')
    console.log('Base URL:', this.baseUrl)
    console.log('Environment:', import.meta.env.DEV ? 'Development' : 'Production')
    console.log('==========================================')

    const results = {
      preflight: await this.testPreflight(),
      healthStatus: await this.testCors(),
      healthPing: await this.testHealthPing(),
      login: await this.testLogin(),
      checkToken: await this.testCheckToken()
    }

    console.log('==========================================')
    console.log('📊 Vollständige Test-Ergebnisse:')

    let successCount = 0
    const totalTests = Object.keys(results).length

    Object.entries(results).forEach(([test, result]) => {
      if (result.success) {
        console.log(`✅ ${test}: ERFOLGREICH`)
        successCount++
      } else {
        console.log(`❌ ${test}: FEHLGESCHLAGEN - ${result.error || 'Unbekannter Fehler'}`)
      }
    })

    console.log('==========================================')
    console.log(`📈 Erfolgsrate: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`)

    if (successCount === totalTests) {
      console.log('🎉 Alle Tests erfolgreich! API ist vollständig funktionsfähig.')
    } else {
      console.log('⚠️ Einige Tests fehlgeschlagen. Überprüfen Sie die CORS-Konfiguration und API-Server.')
    }

    this.checkCookies()

    return results
  }

  /**
   * Interaktiver Login-Test mit echten Credentials
   */
  async testRealLogin() {
    console.log('🔐 Interaktiver Login-Test')
    console.log('Verwenden Sie: testRealLogin("ihr_username", "ihr_password")')
    return { message: 'Bitte Username und Password als Parameter angeben' }
  }

  /**
   * Interaktiver Login-Test mit benutzerdefinierten Credentials
   */
  async testLoginWithCredentials(username, password) {
    if (!username || !password) {
      console.log('❌ Username und Password erforderlich!')
      console.log('Beispiel: corsDebugger.testLoginWithCredentials("myuser", "mypass")')
      return { success: false, error: 'Credentials fehlen' }
    }

    console.log(`🔐 Login-Test mit Username: ${username}`)
    return await this.testLogin({ username, password })
  }
}

// Globale Instanz für einfachen Zugriff
export const corsDebugger = new CorsDebugger()

// Debug-Funktionen global verfügbar machen
if (typeof window !== 'undefined') {
  window.corsDebugger = corsDebugger
  window.testCors = () => corsDebugger.diagnose()
}

export default corsDebugger
