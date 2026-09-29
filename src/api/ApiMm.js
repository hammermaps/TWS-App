/**
 * ApiMm.js
 * API-Client für Mängelmeldungen (MM)
 *
 * Endpunkte (siehe api.php twsHandleMmEndpoint()):
 *   GET  /mm/list[?limit=&offset=&status=&street=]  – Mängelmeldungen auflisten
 *   GET  /mm/{uid}                                   – Einzelne Mängelmeldung
 *   POST /mm/pre_upload                              – Fotos hochladen (Phase 1, multipart)
 *   POST /mm/create                                  – Mängelmeldung anlegen (lokale_id-Dedup)
 */

import { getAuthHeaders } from '../stores/GlobalToken.js'
import { getApiBaseUrl } from '../config/apiConfig.js'
import { getApiTimeout, getMaxRetries } from '../utils/ApiConfigHelper.js'

// ---------------------------------------------------------------------------
// Datenmodelle
// ---------------------------------------------------------------------------

/**
 * Repräsentiert einen Mängelmeldungs-Listeneintrag (GET /mm/list)
 */
export class MmReportItem {
  constructor(data = {}) {
    this.uid             = String(data.uid || '')
    this.status           = Number(data.status) || 0
    this.betreff           = String(data.betreff || '')
    this.street            = Number(data.street) || 0
    this.whg               = String(data.whg || '')
    this.melder            = String(data.melder || '')
    this.datetime          = String(data.datetime || '')
    this.dringlichkeit     = String(data.dringlichkeit || 'normal')
    this.nachunternehmer    = data.nachunternehmer != null ? Number(data.nachunternehmer) : null
    this.scanned            = Boolean(data.scanned)
    this.zugeh              = String(data.zugeh || '')
  }
}

/**
 * Repräsentiert eine Mängelmeldungs-Detailansicht (GET /mm/{uid})
 */
export class MmReportDetail {
  constructor(data = {}) {
    this.uid              = String(data.uid || '')
    this.status            = Number(data.status) || 0
    this.betreff            = String(data.betreff || '')
    this.meldung_massage    = String(data.meldung_massage || '')
    this.apleona            = String(data.apleona || '')
    this.folge              = String(data.folge || '')
    this.street              = Number(data.street) || 0
    this.whg                = String(data.whg || '')
    this.melder              = String(data.melder || '')
    this.tel                = String(data.tel || '')
    this.email              = String(data.email || '')
    this.datetime            = String(data.datetime || '')
    this.dringlichkeit       = String(data.dringlichkeit || 'normal')
    this.nachunternehmer      = data.nachunternehmer != null ? Number(data.nachunternehmer) : null
    this.ekpreis              = data.ekpreis != null ? String(data.ekpreis) : ''
    this.klausel              = Boolean(data.klausel)
    this.zugeh                = String(data.zugeh || '')
    this.scanned              = Boolean(data.scanned)
    this.zeit                = String(data.zeit || '')
    this.planon              = data.planon != null ? String(data.planon) : ''
    this.instructions        = Array.isArray(data.instructions) ? data.instructions : []
  }
}

// ---------------------------------------------------------------------------
// API-Klasse
// ---------------------------------------------------------------------------

/**
 * Mängelmeldungs-API-Client
 */
class ApiMm {
  constructor(baseUrl = null) {
    this._baseUrl = baseUrl
  }

  get baseUrl() {
    return this._baseUrl || getApiBaseUrl()
  }

  /**
   * Interne HTTP-Methode mit Timeout und Auth-Headers (JSON)
   * @param {string} endpoint
   * @param {string} method
   * @param {Object|null} body
   * @param {number|null} timeout  Millisekunden
   * @returns {Promise<{success: boolean, data: any, error: string|null, raw: Object}>}
   */
  async send(endpoint, method = 'GET', body = null, timeout = null) {
    const controller = new AbortController()
    const ms         = getApiTimeout(timeout) || 30000
    const timeoutId  = setTimeout(() => controller.abort(), ms)

    try {
      const headers = {
        'Content-Type':    'application/json',
        'Accept':          'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...getAuthHeaders(),
      }

      const config = {
        method,
        headers,
        signal:      controller.signal,
        credentials: 'include',
        mode:        'cors',
      }

      if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        config.body = JSON.stringify(body)
      }

      const response    = await fetch(`${this.baseUrl}${endpoint}`, config)
      clearTimeout(timeoutId)

      const contentType = response.headers.get('content-type') || ''
      let data

      if (contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch {
          data = { success: false, error: 'Ungültige JSON-Antwort' }
        }
      } else {
        data = { success: false, error: 'Kein JSON-Antwortformat' }
      }

      return {
        success: response.ok && data.success !== false,
        data:    data.data    ?? null,
        error:   data.error   || (!response.ok ? `HTTP ${response.status}: ${response.statusText}` : null),
        raw:     data,
      }
    } catch (err) {
      clearTimeout(timeoutId)
      return {
        success: false,
        data:    null,
        error:   err.name === 'AbortError'
          ? 'Timeout – Server antwortet nicht rechtzeitig'
          : (err.message || 'Netzwerkfehler'),
        raw:     {},
      }
    }
  }

  /**
   * Interne HTTP-Methode für multipart/form-data Uploads (kein JSON-Body)
   * @param {string} endpoint
   * @param {FormData} formData
   * @param {number|null} timeout
   * @returns {Promise<{success: boolean, data: any, error: string|null, raw: Object}>}
   */
  async sendMultipart(endpoint, formData, timeout = null) {
    const controller = new AbortController()
    const ms         = getApiTimeout(timeout) || 30000
    const timeoutId  = setTimeout(() => controller.abort(), ms)

    try {
      // Kein 'Content-Type' setzen – der Browser ergänzt automatisch die
      // multipart-Boundary; ein manuell gesetzter Header würde sie entfernen.
      const headers = {
        'Accept':          'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...getAuthHeaders(),
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method:      'POST',
        headers,
        body:        formData,
        signal:      controller.signal,
        credentials: 'include',
        mode:        'cors',
      })
      clearTimeout(timeoutId)

      let data
      try {
        data = await response.json()
      } catch {
        data = { success: false, error: 'Ungültige JSON-Antwort' }
      }

      return {
        success: response.ok && data.success !== false,
        data:    data.data ?? null,
        error:   data.error || (!response.ok ? `HTTP ${response.status}: ${response.statusText}` : null),
        raw:     data,
      }
    } catch (err) {
      clearTimeout(timeoutId)
      return {
        success: false,
        data:    null,
        error:   err.name === 'AbortError'
          ? 'Timeout – Server antwortet nicht rechtzeitig'
          : (err.message || 'Netzwerkfehler'),
        raw:     {},
      }
    }
  }

  // -------------------------------------------------------------------------
  // Mängelmeldungs-Endpunkte
  // -------------------------------------------------------------------------

  /**
   * GET /mm/list
   * Lädt Mängelmeldungen des aktiven Projekts
   * @param {{limit?: number, offset?: number, status?: number|null, street?: string|number|null}} options
   * @returns {Promise<{success: boolean, items: MmReportItem[], total: number, error: string|null}>}
   */
  async list({ limit = 50, offset = 0, status = null, street = null } = {}) {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    if (status !== null && status !== undefined) params.set('status', String(status))
    if (street !== null && street !== undefined && street !== '') params.set('street', String(street))

    const res = await this.send(`/mm/list?${params.toString()}`)
    return {
      success: res.success,
      items:   Array.isArray(res.raw?.messages) ? res.raw.messages.map(d => new MmReportItem(d)) : [],
      total:   res.raw?.total || 0,
      error:   res.error,
    }
  }

  /**
   * GET /mm/{uid}
   * Einzelne Mängelmeldung nach uid laden
   * @param {string} uid
   * @returns {Promise<MmReportDetail|null>}
   */
  async getByUid(uid) {
    const res = await this.send(`/mm/${encodeURIComponent(uid)}`)
    return res.success && res.raw?.message ? new MmReportDetail(res.raw.message) : null
  }

  /**
   * POST /mm/pre_upload
   * Lädt Fotos vorab hoch (Zwei-Phasen-Upload, Phase 1)
   * @param {File[]} files
   * @returns {Promise<{success: boolean, token: string|null, files: string[], error: string|null}>}
   */
  async preUpload(files) {
    const formData = new FormData()
    for (const file of files) {
      formData.append('mangel_bilder[]', file, file.name)
    }
    const res = await this.sendMultipart('/mm/pre_upload', formData)
    return {
      success: res.success,
      token:   res.raw?.token || null,
      files:   Array.isArray(res.raw?.files) ? res.raw.files : [],
      error:   res.error,
    }
  }

  /**
   * POST /mm/create
   * Mängelmeldung anlegen (unterstützt local_id für Offline-Sync-Dedup und
   * optional upload_token aus preUpload())
   * @param {Object} data
   * @returns {Promise<{success: boolean, uid: string|null, status: number|null, duplicate: boolean, error: string|null}>}
   */
  async create(data) {
    const res = await this.send('/mm/create', 'POST', data)
    return {
      success:   res.success,
      uid:       res.raw?.uid ?? null,
      status:    res.raw?.status ?? null,
      duplicate: res.raw?.duplicate || false,
      error:     res.error,
    }
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Singleton-Instanz für direkten Import */
export const apiMm = new ApiMm()

export default ApiMm
