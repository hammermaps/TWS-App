import { ref } from 'vue'
import { getAuthHeaders } from '../stores/GlobalToken.js'
import { parseCookiesFromResponse } from '../stores/CookieManager.js'

// Einzelnes Gebäude-Element
export class BuildingItem {
    constructor({ id, name, hidden, sorted, created, updated, apartments_count } = {}) {
        this.id = typeof id === "string" ? parseInt(id, 10) : (Number.isFinite(id) ? id : 0)
        this.name = typeof name === "string" ? name : ""
        this.hidden = !!hidden
        this.sorted = typeof sorted === "string" ? parseInt(sorted, 10) : (Number.isFinite(sorted) ? sorted : 0)
        this.created = typeof created === "string" ? created : ""
        this.updated = typeof updated === "string" ? updated : ""
        this.apartments_count = typeof apartments_count === "string" ? parseInt(apartments_count, 10) : (Number.isFinite(apartments_count) ? apartments_count : 0)
    }
}

// Antworttyp für die Liste inkl. Meta
export class ApiBuildingListResponse {
    constructor({ items = [], success = false, error = "", server_time = 0, response_time = 0 } = {}) {
        this.items = Array.isArray(items) ? items.map((it) => it instanceof BuildingItem ? it : new BuildingItem(it)) : []
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

// Body-Helper: Erlaubt Partial-Bodies für update, vollständige Bodies für create/sync
function toPlainBuilding(value, { allowPartial = false } = {}) {
    if (!value || typeof value !== "object") return allowPartial ? {} : { name: "", hidden: false, sorted: 0 }
    const out = {}
    if (allowPartial) {
        if ("name" in value) out.name = value.name
        if ("hidden" in value) out.hidden = !!value.hidden
        if ("sorted" in value) out.sorted = typeof value.sorted === "string" ? parseInt(value.sorted, 10) : Number(value.sorted) || 0
    } else {
        out.name = typeof value.name === "string" ? value.name : ""
        out.hidden = !!value.hidden
        out.sorted = typeof value.sorted === "string" ? parseInt(value.sorted, 10) : Number(value.sorted) || 0
    }
    // optional id für sync
    if ("id" in value) {
        out.id = typeof value.id === "string" ? parseInt(value.id, 10) : Number(value.id) || 0
    }
    return out
}

/**
 * Hauptklasse für Gebäude-API-Operationen
 */
export class ApiBuilding {
    constructor(baseUrl = null) {
        // Im Development-Mode verwenden wir den Vite-Proxy, in Production die direkte URL
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
                'Origin': 'http://localhost:3001', // Explizit Origin setzen
                ...request.headers,
                ...getAuthHeaders()
            }

            const config = {
                method: request.method,
                headers,
                signal: controller.signal,
                credentials: 'include', // Wichtig für Cookie-Übertragung
                mode: 'cors' // Explizit CORS-Mode setzen
            }

            if (request.body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
                config.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
            }

            const response = await fetch(`${this.baseUrl}${request.endpoint}`, config)
            clearTimeout(timeoutId)

            // Cookies aus Response parsen und speichern
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
     * GET /buildings/list - Alle Gebäude auflisten
     */
    async list(options = {}) {
        const { timeout = 5000, headers = {} } = options

        const request = new ApiRequest({
            endpoint: "/buildings/list",
            method: "GET",
            headers,
            timeout,
        })

        const response = await this.send(request)
        const items = Array.isArray(response.data) ? response.data : []

        return new ApiBuildingListResponse({
            items,
            success: response.success,
            error: response.error,
            server_time: response.server_time,
            response_time: response.response_time,
        })
    }

    /**
     * GET /buildings/{id} - Gebäude nach ID abrufen
     */
    async getById(id, options = {}) {
        const { timeout = 5000, headers = {} } = options

        const request = new ApiRequest({
            endpoint: `/buildings/${encodeURIComponent(id)}`,
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

        return item ? new BuildingItem(item) : null
    }

    /**
     * POST /buildings/create - Neues Gebäude erstellen
     */
    async create(data = {}, options = {}) {
        const { timeout = 5000, headers = {} } = options

        const request = new ApiRequest({
            endpoint: "/buildings/create",
            method: "POST",
            body: toPlainBuilding(data, { allowPartial: false }),
            headers,
            timeout,
        })

        const response = await this.send(request)

        let item = null
        if (response.data) {
            if (Array.isArray(response.data)) item = response.data[0] ?? null
            else if (typeof response.data === "object") item = response.data
        }

        return item ? new BuildingItem(item) : null
    }

    /**
     * POST /buildings/{id} - Gebäude aktualisieren
     */
    async update(id, partial = {}, options = {}) {
        const { timeout = 5000, headers = {} } = options

        const request = new ApiRequest({
            endpoint: `/buildings/${encodeURIComponent(id)}`,
            method: "POST",
            body: toPlainBuilding(partial, { allowPartial: true }),
            headers,
            timeout,
        })

        const response = await this.send(request)

        let item = null
        if (response.data) {
            if (Array.isArray(response.data)) item = response.data[0] ?? null
            else if (typeof response.data === "object") item = response.data
        }

        return item ? new BuildingItem(item) : null
    }

    /**
     * DELETE /buildings/{id} - Gebäude löschen
     */
    async remove(id, options = {}) {
        const { timeout = 5000, headers = {} } = options

        const request = new ApiRequest({
            endpoint: `/buildings/${encodeURIComponent(id)}`,
            method: "DELETE",
            headers,
            timeout,
        })

        const response = await this.send(request)
        return { success: response.success, error: response.error }
    }

    /**
     * POST /buildings/sync - Gebäude synchronisieren
     */
    async sync(array = [], options = {}) {
        const { timeout = 5000, headers = {} } = options

        const body = Array.isArray(array) ? array.map(it => toPlainBuilding(it, { allowPartial: false })) : []

        const request = new ApiRequest({
            endpoint: "/buildings/sync",
            method: "POST",
            body,
            headers,
            timeout,
        })

        const response = await this.send(request)
        return {
            success: response.success,
            error: response.error,
            created: response.raw?.created || 0,
            updated: response.raw?.updated || 0,
            errors: response.raw?.errors || [],
            buildings: response.raw?.buildings || []
        }
    }
}

/**
 * Vue Composable für Gebäude-API (behält Rückwärtskompatibilität)
 */
export function useApiBuilding() {
    const buildings = ref([])
    const building = ref(null)
    const error = ref(null)
    const loading = ref(false)

    const apiBuilding = new ApiBuilding()

    const list = async () => {
        loading.value = true
        error.value = null

        try {
            const response = await apiBuilding.list()
            buildings.value = response.items
            if (!response.success && response.error) {
                error.value = response.error
            }
            return response
        } catch (err) {
            error.value = err.message
            return new ApiBuildingListResponse({ error: err.message })
        } finally {
            loading.value = false
        }
    }

    const getById = async (id) => {
        loading.value = true
        error.value = null

        try {
            const result = await apiBuilding.getById(id)
            building.value = result
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
            const result = await apiBuilding.create(data)
            if (result) {
                buildings.value = [...buildings.value, result]
            }
            building.value = result
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
            const result = await apiBuilding.update(id, partial)
            if (result) {
                buildings.value = buildings.value.map(b => b.id === result.id ? result : b)
            }
            building.value = result
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
            const result = await apiBuilding.remove(id)
            if (result.success) {
                buildings.value = buildings.value.filter(b => b.id !== Number(id))
                if (building.value?.id === Number(id)) {
                    building.value = null
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

    const sync = async (array) => {
        loading.value = true
        error.value = null

        try {
            const result = await apiBuilding.sync(array)
            if (!result.success && result.error) {
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
        buildings,
        building,
        error,
        loading,
        list,
        getById,
        create,
        update,
        remove,
        sync
    }
}

// Default Export
export default ApiBuilding
