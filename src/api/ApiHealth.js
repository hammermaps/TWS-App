// ApiHealth.js - Health Status API Client mit Axios
import axios from 'axios'
import { cookieManager, parseCookiesFromResponse } from '../stores/CookieManager.js'
import { getApiBaseUrl } from '../config/apiConfig.js'

/**
 * Memory Usage Informationen
 */
export class MemoryUsage {
  constructor({ used = 0, peak = 0, limit = -1 } = {}) {
    this.used = Number(used) || 0
    this.peak = Number(peak) || 0
    this.limit = Number(limit) || -1
  }

  toJSON() {
    return {
      used: this.used,
      peak: this.peak,
      limit: this.limit
    }
  }
}

/**
 * Server Informationen
 */
export class ServerInfo {
  constructor({ version = '', uptime = 0, load = 0, memory_usage = {} } = {}) {
    this.version = String(version || '')
    this.uptime = Number(uptime) || 0
    this.load = Number(load) || 0
    this.memory_usage = memory_usage instanceof MemoryUsage
      ? memory_usage
      : new MemoryUsage(memory_usage)
  }

  toJSON() {
    return {
      version: this.version,
      uptime: this.uptime,
      load: this.load,
      memory_usage: this.memory_usage.toJSON()
    }
  }
}

/**
 * Services Status
 */
export class Services {
  constructor({ database = false, filesystem = false, cache = false } = {}) {
    this.database = !!database
    this.filesystem = !!filesystem
    this.cache = !!cache
  }

  toJSON() {
    return {
      database: this.database,
      filesystem: this.filesystem,
      cache: this.cache
    }
  }

  /**
   * Prüft ob alle Services verfügbar sind
   */
  allHealthy() {
    return this.database && this.filesystem && this.cache
  }
}

/**
 * Health Status Data
 */
export class HealthStatusData {
  constructor({ status = '', server = '', server_info = {}, services = {} } = {}) {
    this.status = String(status || '')
    this.server = String(server || '')
    this.server_info = server_info instanceof ServerInfo
      ? server_info
      : new ServerInfo(server_info)
    this.services = services instanceof Services
      ? services
      : new Services(services)
  }

  toJSON() {
    return {
      status: this.status,
      server: this.server,
      server_info: this.server_info.toJSON(),
      services: this.services.toJSON()
    }
  }

  /**
   * Prüft ob der Status "healthy" ist
   */
  isHealthy() {
    return this.status === 'healthy'
  }
}

/**
 * Health Status Response
 */
export class HealthStatusResponse {
  constructor({
    success = false,
    data = {},
    error = '',
    server_time = 0,
    response_time = 0
  } = {}) {
    this.success = !!success
    this.data = data instanceof HealthStatusData
      ? data
      : new HealthStatusData(data)
    this.error = String(error || '')
    this.server_time = Number(server_time) || 0
    this.response_time = Number(response_time) || 0
  }

  toJSON() {
    return {
      success: this.success,
      data: this.data.toJSON(),
      error: this.error,
      server_time: this.server_time,
      response_time: this.response_time
    }
  }

  /**
   * Prüft ob die Response erfolgreich war
   */
  isSuccess() {
    return this.success && !this.error
  }

  /**
   * Prüft ob der Server healthy ist
   */
  isHealthy() {
    return this.isSuccess() && this.data.isHealthy()
  }
}

/**
 * Ping Data
 */
export class PingData {
  constructor({ message = '' } = {}) {
    this.message = String(message || '')
  }

  toJSON() {
    return {
      message: this.message
    }
  }

  /**
   * Prüft ob die Ping-Antwort "pong" ist
   */
  isPong() {
    return this.message === 'pong'
  }
}

/**
 * Ping Response
 */
export class PingResponse {
  constructor({
    success = false,
    data = {},
    error = '',
    server_time = 0,
    response_time = 0
  } = {}) {
    this.success = !!success
    this.data = data instanceof PingData
      ? data
      : new PingData(data)
    this.error = String(error || '')
    this.server_time = Number(server_time) || 0
    this.response_time = Number(response_time) || 0
  }

  toJSON() {
    return {
      success: this.success,
      data: this.data.toJSON(),
      error: this.error,
      server_time: this.server_time,
      response_time: this.response_time
    }
  }

  /**
   * Prüft ob die Response erfolgreich war
   */
  isSuccess() {
    return this.success && !this.error
  }

  /**
   * Prüft ob der Ping erfolgreich war
   */
  isPong() {
    return this.isSuccess() && this.data.isPong()
  }
}

/**
 * API Client für Health Status
 */
export class ApiHealthClient {
  constructor(baseUrl = null) {
    // Im Development-Mode verwenden wir den Vite-Proxy, in Production die direkte URL
    this.baseUrl = baseUrl || getApiBaseUrl()

    // Axios-Instanz mit Cookie-Unterstützung konfigurieren
    // Verwende kürzeren Timeout für Health-Checks (3 Sekunden)
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 3000, // Kurzer Timeout für Health-Checks
      withCredentials: true, // Wichtig für Cookie-Übertragung
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    // Response-Interceptor für Cookie-Parsing (ohne Request-Interceptor)
    this.client.interceptors.response.use(
      (response) => {
        // Cookies werden automatisch durch withCredentials: true verwaltet
        // Aktualisiere den lokalen Cookie-Manager
        setTimeout(() => {
          cookieManager.loadFromDocument()
        }, 100)
        return response
      },
      (error) => Promise.reject(error)
    )
  }

  /**
   * Ruft den Health Status ab
   * @returns {Promise<HealthStatusResponse>}
   */
  async getStatus() {
    try {
      const response = await this.client.get('/health/status')
      return new HealthStatusResponse(response.data)
    } catch (error) {
      if (error.response && error.response.data) {
        return new HealthStatusResponse(error.response.data)
      }
      return new HealthStatusResponse({
        success: false,
        error: error.message || 'Fehler beim Abrufen des Health Status',
        data: {}
      })
    }
  }

  /**
   * Sendet einen Ping an den Server
   * @returns {Promise<PingResponse>}
   */
  async ping() {
    try {
      const response = await this.client.get('/health/ping')
      return new PingResponse(response.data)
    } catch (error) {
      if (error.response && error.response.data) {
        return new PingResponse(error.response.data)
      }
      return new PingResponse({
        success: false,
        error: error.message || 'Fehler beim Ping',
        data: {}
      })
    }
  }

  /**
   * Prüft ob der Server erreichbar und healthy ist
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    const response = await this.getStatus()
    return response.isHealthy()
  }

  /**
   * Prüft ob der Server erreichbar ist (via Ping)
   * @returns {Promise<boolean>}
   */
  async isReachable() {
    const response = await this.ping()
    return response.isPong()
  }
}

// Standard-Client-Instanz exportieren
const healthClient = new ApiHealthClient()

export default healthClient
