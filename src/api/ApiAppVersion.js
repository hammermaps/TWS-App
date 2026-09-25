// ApiAppVersion.js - Versionscheck-API-Client (prüft auf neue App-Version
// und ob die aktuell installierte Version vom Server noch unterstützt wird)
import axios from 'axios'
import { getApiBaseUrl } from '../config/apiConfig.js'

/**
 * Aktuell installierte App-Version (aus package.json, siehe vite.config.mjs define).
 */
export const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0'

/**
 * Versionscheck-Daten
 */
export class AppVersionData {
  constructor({
    current_version = null,
    latest_version = '',
    latest_version_code = 0,
    update_available = null,
    min_supported_version = null,
    supported = null,
    notes = '',
    uploaded_at = ''
  } = {}) {
    this.currentVersion = current_version
    this.latestVersion = String(latest_version || '')
    this.latestVersionCode = Number(latest_version_code) || 0
    this.updateAvailable = update_available
    this.minSupportedVersion = min_supported_version
    this.supported = supported
    this.notes = String(notes || '')
    this.uploadedAt = String(uploaded_at || '')
  }
}

/**
 * Versionscheck-Response
 */
export class AppVersionResponse {
  constructor({ success = false, data = {}, error = '' } = {}) {
    this.success = !!success
    this.data = data instanceof AppVersionData ? data : new AppVersionData(data)
    this.error = String(error || '')
  }

  isSuccess() {
    return this.success && !this.error
  }
}

/**
 * API-Client für den App-Versionscheck
 */
export class ApiAppVersionClient {
  constructor(baseUrl = null) {
    this._baseUrl = baseUrl
    this.client = axios.create({
      timeout: 5000,
      headers: { Accept: 'application/json' }
    })
  }

  get baseUrl() {
    return this._baseUrl || getApiBaseUrl()
  }

  /**
   * Prüft, ob eine neuere Version verfügbar ist und ob die aktuell
   * installierte Version noch vom Server unterstützt wird.
   * @param {string} currentVersion
   * @returns {Promise<AppVersionResponse>}
   */
  async check(currentVersion = CURRENT_APP_VERSION) {
    try {
      this.client.defaults.baseURL = this.baseUrl
      const response = await this.client.get('/app/version', {
        params: { current_version: currentVersion }
      })
      return new AppVersionResponse(response.data)
    } catch (error) {
      if (error.response && error.response.data) {
        return new AppVersionResponse(error.response.data)
      }
      return new AppVersionResponse({
        success: false,
        error: error.message || 'Fehler beim Versionscheck'
      })
    }
  }
}

const appVersionClient = new ApiAppVersionClient()

export default appVersionClient
