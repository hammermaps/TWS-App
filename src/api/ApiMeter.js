/**
 * ApiMeter.js
 * API-Client für Zähler (Meter) und Zählerstände (Meter Readings)
 *
 * Endpunkte:
 *   GET  /meters/list[/{building_id}]          – Aktive Zähler auflisten
 *   GET  /meters/get/{id}                      – Einzelner Zähler
 *   GET  /meters/readings/{meter_id}           – Zählerstand-Historie
 *   POST /meters/reading/create                – Zählerstand erfassen
 *   POST /meters/reading/sync                  – Batch-Sync
 *   POST /meters/reading/update/{id}           – Zählerstand aktualisieren
 *   DELETE /meters/reading/delete/{id}         – Zählerstand löschen
 */

import { getAuthHeaders } from '../stores/GlobalToken.js'
import { getApiBaseUrl } from '../config/apiConfig.js'
import { getApiTimeout, getMaxRetries } from '../utils/ApiConfigHelper.js'

// ---------------------------------------------------------------------------
// Datenmodelle
// ---------------------------------------------------------------------------

/**
 * Repräsentiert einen Zähler (Stammdaten)
 */
export class MeterItem {
  constructor(data = {}) {
    this.id            = Number(data.id) || 0
    this.project_id    = Number(data.project_id) || 0
    this.meter_number  = String(data.meter_number || '')
    this.name          = String(data.name || '')
    this.manufacturer  = String(data.manufacturer || '')
    this.unit          = String(data.unit || '')
    this.meter_type    = String(data.meter_type || 'water')   // 'water' | 'power' | 'heating'
    this.building_id   = Number(data.building_id) || 0
    this.whg_id        = data.whg_id != null ? Number(data.whg_id) : null
    this.location      = String(data.location || '')
    this.purpose       = String(data.purpose || '')
    this.notes         = String(data.notes || '')
    this.reading_value = data.reading_value != null ? Number(data.reading_value) : null
    this.reading_date  = data.reading_date ? String(data.reading_date) : null
    this.is_active     = Boolean(data.is_active !== false)
    this.qr_code       = String(data.qr_code || '')
    this.created_at    = String(data.created_at || '')
    this.updated_at    = String(data.updated_at || '')
  }
}

/**
 * Repräsentiert einen einzelnen Zählerstand
 */
export class MeterReadingItem {
  constructor(data = {}) {
    this.id            = Number(data.id) || 0
    this.local_id      = String(data.local_id || '')
    this.meter_id      = Number(data.meter_id) || 0
    this.reading_value = Number(data.reading_value) || 0
    this.reading_date  = String(data.reading_date || '')
    this.reading_time  = data.reading_time ? String(data.reading_time) : null
    this.note          = String(data.note || '')
    this.created_by    = data.created_by != null ? Number(data.created_by) : null
    this.created_at    = String(data.created_at || '')
    this.synced_at     = data.synced_at ? String(data.synced_at) : null
  }
}

// ---------------------------------------------------------------------------
// API-Klasse
// ---------------------------------------------------------------------------

/**
 * Zähler-API-Client
 */
class ApiMeter {
  constructor(baseUrl = null) {
    this._baseUrl = baseUrl
  }

  get baseUrl() {
    return this._baseUrl || getApiBaseUrl()
  }

  /**
   * Interne HTTP-Methode mit Timeout und Auth-Headers
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

  // -------------------------------------------------------------------------
  // Zähler-Endpunkte
  // -------------------------------------------------------------------------

  /**
   * GET /meters/list[/{buildingId}]
   * Lädt alle aktiven Zähler, optional gefiltert nach Gebäude
   * @param {number|null} buildingId
   * @returns {Promise<{success: boolean, items: MeterItem[], error: string|null}>}
   */
  async list(buildingId = null) {
    const endpoint = buildingId ? `/meters/list/${buildingId}` : '/meters/list'
    const res      = await this.send(endpoint)
    return {
      success: res.success,
      items:   Array.isArray(res.data) ? res.data.map(d => new MeterItem(d)) : [],
      error:   res.error,
    }
  }

  /**
   * GET /meters/get/{id}
   * Einzelnen Zähler nach ID laden
   * @param {number} id
   * @returns {Promise<MeterItem|null>}
   */
  async getById(id) {
    const res = await this.send(`/meters/get/${id}`)
    return res.success && res.data ? new MeterItem(res.data) : null
  }

  // -------------------------------------------------------------------------
  // Zählerstand-Endpunkte
  // -------------------------------------------------------------------------

  /**
   * GET /meters/readings/{meterId}?limit=50&offset=0
   * Zählerstand-Historie für einen Zähler
   * @param {number} meterId
   * @param {{limit?: number, offset?: number}} options
   * @returns {Promise<{success: boolean, items: MeterReadingItem[], total: number, error: string|null}>}
   */
  async readings(meterId, { limit = 50, offset = 0 } = {}) {
    const res = await this.send(`/meters/readings/${meterId}?limit=${limit}&offset=${offset}`)
    return {
      success: res.success,
      items:   Array.isArray(res.data) ? res.data.map(d => new MeterReadingItem(d)) : [],
      total:   res.raw?.total || 0,
      error:   res.error,
    }
  }

  /**
   * POST /meters/reading/create
   * Einzelnen Zählerstand erfassen (unterstützt local_id für Dedup)
   * @param {Object} data
   * @returns {Promise<{success: boolean, data: MeterReadingItem|null, duplicate: boolean, error: string|null}>}
   */
  async createReading(data) {
    const res = await this.send('/meters/reading/create', 'POST', data)
    return {
      success:   res.success,
      data:      res.data ? new MeterReadingItem(res.data) : null,
      duplicate: res.raw?.duplicate || false,
      error:     res.error,
    }
  }

  /**
   * POST /meters/reading/sync
   * Batch-Sync von Offline-Zählerständen
   * @param {Array<Object>} readings
   * @returns {Promise<{success: boolean, saved: number, duplicates: number, errors: number, results: Array, error: string|null}>}
   */
  async syncReadings(readings) {
    const res = await this.send('/meters/reading/sync', 'POST', { readings })
    return {
      success:    res.success,
      saved:      res.raw?.saved      || 0,
      duplicates: res.raw?.duplicates || 0,
      errors:     res.raw?.errors     || 0,
      results:    res.raw?.results    || [],
      error:      res.error,
    }
  }

  /**
   * POST /meters/reading/update/{id}
   * Zählerstand aktualisieren
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<{success: boolean, data: MeterReadingItem|null, error: string|null}>}
   */
  async updateReading(id, data) {
    const res = await this.send(`/meters/reading/update/${id}`, 'POST', data)
    return {
      success: res.success,
      data:    res.data ? new MeterReadingItem(res.data) : null,
      error:   res.error,
    }
  }

  /**
   * DELETE /meters/reading/delete/{id}
   * Zählerstand löschen
   * @param {number} id
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async deleteReading(id) {
    const res = await this.send(`/meters/reading/delete/${id}`, 'DELETE')
    return {
      success: res.success,
      error:   res.error,
    }
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Singleton-Instanz für direkten Import */
export const apiMeter = new ApiMeter()

export default ApiMeter
