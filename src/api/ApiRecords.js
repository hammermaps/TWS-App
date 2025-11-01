import { ref } from 'vue'
import { getAuthHeaders } from '../stores/GlobalToken.js'
import { parseCookiesFromResponse } from '../stores/CookieManager.js'

// Einzelner Record-Element (Spüldatensatz)
export class RecordItem {
    constructor({
        id, apartment_id, building_id, user_id, start_time, end_time, duration,
        latitude, longitude, location_accuracy, created_at, updated_at,
        user_name, user_email, user_firstname, user_lastname
    } = {}) {
        this.id = typeof id === "string" ? parseInt(id, 10) : (Number.isFinite(id) ? id : 0)
        this.apartment_id = typeof apartment_id === "string" ? parseInt(apartment_id, 10) : (Number.isFinite(apartment_id) ? apartment_id : 0)
        this.building_id = typeof building_id === "string" ? parseInt(building_id, 10) : (Number.isFinite(building_id) ? building_id : 0)
        this.user_id = typeof user_id === "string" ? parseInt(user_id, 10) : (Number.isFinite(user_id) ? user_id : 0)
        this.start_time = typeof start_time === "string" ? start_time : ""
        this.end_time = typeof end_time === "string" ? end_time : ""
        this.duration = typeof duration === "string" ? parseInt(duration, 10) : (Number.isFinite(duration) ? duration : 0)
        this.latitude = typeof latitude === "string" ? parseFloat(latitude) : (Number.isFinite(latitude) ? latitude : null)
        this.longitude = typeof longitude === "string" ? parseFloat(longitude) : (Number.isFinite(longitude) ? longitude : null)
        this.location_accuracy = typeof location_accuracy === "string" ? parseFloat(location_accuracy) : (Number.isFinite(location_accuracy) ? location_accuracy : null)
        this.created_at = typeof created_at === "string" ? created_at : ""
        this.updated_at = typeof updated_at === "string" ? updated_at : ""

        // Benutzer-Informationen (falls vom Backend bereitgestellt)
        this.user_name = typeof user_name === "string" ? user_name : ""
        this.user_email = typeof user_email === "string" ? user_email : ""
        this.user_firstname = typeof user_firstname === "string" ? user_firstname : ""
        this.user_lastname = typeof user_lastname === "string" ? user_lastname : ""
    }
}

// Antworttyp für die Record-Liste
export class ApiRecordListResponse {
    constructor({ items = [], success = false, error = "", server_time = 0, response_time = 0 } = {}) {
        this.items = Array.isArray(items) ? items.map((it) => it instanceof RecordItem ? it : new RecordItem(it)) : []
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

/**
 * API-Request-Konfiguration
 */
export class ApiRequest {
    constructor({
        endpoint,
        method = "GET",
        body = null,
        headers = {},
        timeout = 5000,
        retries = 2,
    }) {
        this.endpoint = endpoint
        this.method = method
        this.body = body
        this.headers = headers
        this.timeout = timeout
        this.retries = retries
    }
}

/**
 * Standardisierte API-Response-Klasse
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
    }
}

// Body-Helper für Records
function toPlainRecord(value, { allowPartial = false } = {}) {
    if (!value || typeof value !== "object") {
        return allowPartial ? {} : {
            apartment_id: 0, building_id: 0, start_time: "", end_time: "",
            latitude: null, longitude: null, location_accuracy: null
        }
    }
    const out = {}
    if (allowPartial) {
        if ("apartment_id" in value) out.apartment_id = typeof value.apartment_id === "string" ? parseInt(value.apartment_id, 10) : Number(value.apartment_id) || 0
        if ("building_id" in value) out.building_id = typeof value.building_id === "string" ? parseInt(value.building_id, 10) : Number(value.building_id) || 0
        if ("user_id" in value) out.user_id = typeof value.user_id === "string" ? parseInt(value.user_id, 10) : Number(value.user_id) || 0
        if ("start_time" in value) out.start_time = value.start_time
        if ("end_time" in value) out.end_time = value.end_time
        if ("latitude" in value) out.latitude = typeof value.latitude === "string" ? parseFloat(value.latitude) : value.latitude
        if ("longitude" in value) out.longitude = typeof value.longitude === "string" ? parseFloat(value.longitude) : value.longitude
        if ("location_accuracy" in value) out.location_accuracy = typeof value.location_accuracy === "string" ? parseFloat(value.location_accuracy) : value.location_accuracy
    } else {
        out.apartment_id = typeof value.apartment_id === "string" ? parseInt(value.apartment_id, 10) : Number(value.apartment_id) || 0
        out.building_id = typeof value.building_id === "string" ? parseInt(value.building_id, 10) : Number(value.building_id) || 0
        out.start_time = typeof value.start_time === "string" ? value.start_time : ""
        out.end_time = typeof value.end_time === "string" ? value.end_time : ""
        out.latitude = typeof value.latitude === "string" ? parseFloat(value.latitude) : value.latitude
        out.longitude = typeof value.longitude === "string" ? parseFloat(value.longitude) : value.longitude
        out.location_accuracy = typeof value.location_accuracy === "string" ? parseFloat(value.location_accuracy) : value.location_accuracy

        // user_id ist optional (wird vom Backend gesetzt wenn nicht angegeben)
        if ("user_id" in value && value.user_id) {
            out.user_id = typeof value.user_id === "string" ? parseInt(value.user_id, 10) : Number(value.user_id) || 0
        }
    }

    // Optional id für sync/update
    if ("id" in value) {
        out.id = typeof value.id === "string" ? parseInt(value.id, 10) : Number(value.id) || 0
    }

    // Duration wird vom Backend automatisch berechnet - nicht senden
    return out
}

/**
 * Hauptklasse für Records-API-Operationen
 */
export class ApiRecords {
    constructor(baseUrl = null) {
        this.baseUrl = baseUrl || (import.meta.env.DEV ? '/api' : 'https://wls.dk-automation.de')
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
                'Origin': 'http://localhost:3001',
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
            }

            const response = await fetch(`${this.baseUrl}${request.endpoint}`, config)
            clearTimeout(timeoutId)

            parseCookiesFromResponse(response)

            let responseData
            try {
                responseData = await response.json()
            } catch {
                responseData = { success: false, error: 'Ungültige JSON-Antwort', data: null }
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

            if (attempt < request.retries && !controller.signal.aborted) {
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
     * POST /records/list - Records auflisten mit erweiterten Filtern
     */
    async list(options = {}) {
        const {
            timeout = 5000,
            headers = {},
            limit,
            offset,
            apartment_id,
            building_id,
            user_id,
            start_date,
            end_date,
            order_by = 'start_time',
            order = 'DESC'
        } = options

        const body = {}
        if (limit !== undefined) body.limit = limit
        if (offset !== undefined) body.offset = offset
        if (apartment_id !== undefined) body.apartment_id = apartment_id
        if (building_id !== undefined) body.building_id = building_id
        if (user_id !== undefined) body.user_id = user_id
        if (start_date) body.start_date = start_date
        if (end_date) body.end_date = end_date
        if (order_by) body.order_by = order_by
        if (order) body.order = order

        const request = new ApiRequest({
            endpoint: "/records/list",
            method: "POST",
            body,
            headers,
            timeout,
        })

        const response = await this.send(request)
        const items = Array.isArray(response.data) ? response.data : []

        return new ApiRecordListResponse({
            items,
            success: response.success,
            error: response.error,
            server_time: response.server_time,
            response_time: response.response_time,
        })
    }

    /**
     * Records für bestimmtes Apartment mit Sortierung und Limit
     */
    async getByApartment(apartmentId, options = {}) {
        const { limit = 12, offset = 0, orderBy = 'start_time', order = 'DESC' } = options

        const response = await this.list({
            apartment_id: apartmentId,
            limit: limit,
            offset: offset,
            order_by: orderBy,
            order: order,
            ...options
        })

        return response.items
    }

    /**
     * GET /records/get/{id} - Einzelnen Record abrufen
     */
    async getById(id, options = {}) {
        const { timeout = 5000, headers = {} } = options

        const request = new ApiRequest({
            endpoint: `/records/get/${encodeURIComponent(id)}`,
            method: "GET",
            headers,
            timeout,
        })

        const response = await this.send(request)

        let item = null
        if (response.data) {
            if (Array.isArray(response.data)) {
                item = response.data[0] ?? null
            } else if (typeof response.data === "object") {
                item = response.data
            }
        }

        return item ? new RecordItem(item) : null
    }

    /**
     * POST /records/create - Neuen Record erstellen
     */
    async create(data = {}, options = {}) {
        const { timeout = 5000, headers = {} } = options

        const request = new ApiRequest({
            endpoint: "/records/create",
            method: "POST",
            body: toPlainRecord(data),
            headers,
            timeout,
        })

        const response = await this.send(request)

        let item = null
        if (response.data) {
            if (Array.isArray(response.data)) item = response.data[0] ?? null
            else if (typeof response.data === "object") item = response.data
        }

        return item ? new RecordItem(item) : null
    }

    /**
     * POST /records/update/{id} - Record aktualisieren
     */
    async update(id, partial = {}, options = {}) {
        const { timeout = 5000, headers = {} } = options

        const request = new ApiRequest({
            endpoint: `/records/update/${encodeURIComponent(id)}`,
            method: "POST",
            body: toPlainRecord(partial, { allowPartial: true }),
            headers,
            timeout,
        })

        const response = await this.send(request)

        let item = null
        if (response.data) {
            if (Array.isArray(response.data)) item = response.data[0] ?? null
            else if (typeof response.data === "object") item = response.data
        }

        return item ? new RecordItem(item) : null
    }

    /**
     * DELETE /records/remove/{id} - Record löschen
     */
    async remove(id, options = {}) {
        const { timeout = 5000, headers = {} } = options

        const request = new ApiRequest({
            endpoint: `/records/remove/${encodeURIComponent(id)}`,
            method: "DELETE",
            headers,
            timeout,
        })

        const response = await this.send(request)
        return { success: response.success, error: response.error }
    }
}

/**
 * Vue Composable für Records-API
 */
export function useApiRecords() {
    const records = ref([])
    const record = ref(null)
    const error = ref(null)
    const loading = ref(false)

    const apiRecords = new ApiRecords()

    const list = async (options = {}) => {
        loading.value = true
        error.value = null

        try {
            const response = await apiRecords.list(options)
            records.value = response.items
            if (!response.success && response.error) {
                error.value = response.error
            }
            return response
        } catch (err) {
            error.value = err.message
            return new ApiRecordListResponse({ error: err.message })
        } finally {
            loading.value = false
        }
    }

    const getByApartment = async (apartmentId, options = {}) => {
        loading.value = true
        error.value = null

        try {
            const result = await apiRecords.getByApartment(apartmentId, options)
            return result
        } catch (err) {
            error.value = err.message
            return []
        } finally {
            loading.value = false
        }
    }

    const getById = async (id) => {
        loading.value = true
        error.value = null

        try {
            const result = await apiRecords.getById(id)
            record.value = result
            return result
        } catch (err) {
            error.value = err.message
            return null
        } finally {
            loading.value = false
        }
    }

    const create = async (data) => {
        loading.value = true
        error.value = null

        try {
            const result = await apiRecords.create(data)
            if (result) {
                records.value = [...records.value, result]
            }
            record.value = result
            return result
        } catch (err) {
            error.value = err.message
            return null
        } finally {
            loading.value = false
        }
    }

    const update = async (id, partial) => {
        loading.value = true
        error.value = null

        try {
            const result = await apiRecords.update(id, partial)
            if (result) {
                records.value = records.value.map(r => r.id === result.id ? result : r)
            }
            record.value = result
            return result
        } catch (err) {
            error.value = err.message
            return null
        } finally {
            loading.value = false
        }
    }

    const remove = async (id) => {
        loading.value = true
        error.value = null

        try {
            const result = await apiRecords.remove(id)
            if (result.success) {
                records.value = records.value.filter(r => r.id !== Number(id))
                if (record.value?.id === Number(id)) {
                    record.value = null
                }
            } else if (result.error) {
                error.value = result.error
            }
            return result
        } catch (err) {
            error.value = err.message
            return { success: false, error: err.message }
        } finally {
            loading.value = false
        }
    }

    return {
        records,
        record,
        error,
        loading,
        list,
        getByApartment,
        getById,
        create,
        update,
        remove
    }
}

export default ApiRecords
