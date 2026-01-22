import { ref } from 'vue'
import { getAuthHeaders } from '../stores/GlobalToken.js'
import { parseCookiesFromResponse } from '../stores/CookieManager.js'
import { getApiTimeout, getMaxRetries } from '../utils/ApiConfigHelper.js'
import { getApiBaseUrl } from '../config/apiConfig.js'

// Konfigurationsobjekt
export class ConfigItem {
    constructor(data = {}) {
        // Konfiguration als Key-Value Objekt speichern
        Object.assign(this, data)
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

/**
 * Hauptklasse für Config-API-Operationen
 */
export class ApiConfig {
    constructor(baseUrl = null) {
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
     * GET /config/get - Aktuelle Konfiguration abrufen
     */
    async get(options = {}) {
        const { timeout = null, headers = {} } = options

        const request = new ApiRequest({
            endpoint: "/config/get",
            method: "GET",
            headers,
            timeout,
        })

        const response = await this.send(request)
        return response.data ? new ConfigItem(response.data) : null
    }

    /**
     * POST /config/set - Konfigurationswerte setzen
     */
    async set(configData = {}, options = {}) {
        const { timeout = null, headers = {} } = options

        const request = new ApiRequest({
            endpoint: "/config/set",
            method: "POST",
            body: configData,
            headers,
            timeout,
        })

        const response = await this.send(request)
        return response.data ? new ConfigItem(response.data) : null
    }

    /**
     * DELETE /config/reset - Konfiguration auf Standardwerte zurücksetzen
     */
    async reset(options = {}) {
        const { timeout = null, headers = {} } = options

        const request = new ApiRequest({
            endpoint: "/config/reset",
            method: "DELETE",
            headers,
            timeout,
        })

        const response = await this.send(request)
        return response.data ? new ConfigItem(response.data) : null
    }

    /**
     * PUT /config/remove - Konfigurationswerte gezielt entfernen
     */
    async remove(keys = [], options = {}) {
        const { timeout = null, headers = {} } = options

        const request = new ApiRequest({
            endpoint: "/config/remove",
            method: "PUT",
            body: { keys: Array.isArray(keys) ? keys : [keys] },
            headers,
            timeout,
        })

        const response = await this.send(request)
        return { success: response.success, error: response.error, message: response.message }
    }
}

/**
 * Vue Composable für Config-API
 */
export function useApiConfig() {
    const config = ref(null)
    const error = ref(null)
    const loading = ref(false)

    const apiConfig = new ApiConfig()

    const get = async () => {
        loading.value = true
        error.value = null

        try {
            const result = await apiConfig.get()
            config.value = result
            return result
        } catch (err) {
            error.value = err.message
            return null
        } finally {
            loading.value = false
        }
    }

    const set = async (configData) => {
        loading.value = true
        error.value = null

        try {
            const result = await apiConfig.set(configData)
            config.value = result
            return result
        } catch (err) {
            error.value = err.message
            return null
        } finally {
            loading.value = false
        }
    }

    const reset = async () => {
        loading.value = true
        error.value = null

        try {
            const result = await apiConfig.reset()
            config.value = result
            return result
        } catch (err) {
            error.value = err.message
            return null
        } finally {
            loading.value = false
        }
    }

    const remove = async (keys) => {
        loading.value = true
        error.value = null

        try {
            const result = await apiConfig.remove(keys)
            if (result.success) {
                // Refresh config after successful removal
                await get()
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
        config,
        error,
        loading,
        get,
        set,
        reset,
        remove
    }
}

export default ApiConfig
