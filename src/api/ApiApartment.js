import { ref } from 'vue'
import { getAuthHeaders } from '../stores/GlobalToken.js'
import { parseCookiesFromResponse } from '../stores/CookieManager.js'
import { useApartmentStorage } from '../stores/ApartmentStorage.js'
import BuildingStorage from '../stores/BuildingStorage.js'
import { useOnlineStatusStore } from '../stores/OnlineStatus.js'
import { getApiTimeout, getMaxRetries } from '../utils/ApiConfigHelper.js'
import { getApiBaseUrl } from '../config/apiConfig.js'
import indexedDBHelper, { STORES } from '../utils/IndexedDBHelper.js'
import { getCurrentUser } from '../stores/GlobalUser.js'

// Apartment-Element mit Leerstandsspülung
export class ApartmentItem {
    constructor({
        id, building_id, number, floor, min_flush_duration, enabled, sorted,
        created_at, updated_at, last_flush_date, next_flush_due, qr_code_uuid
    } = {}) {
        this.id = typeof id === "string" ? parseInt(id, 10) : (Number.isFinite(id) ? id : 0)
        this.building_id = typeof building_id === "string" ? parseInt(building_id, 10) : (Number.isFinite(building_id) ? building_id : 0)
        this.number = typeof number === "string" ? number : ""
        this.floor = typeof floor === "string" ? floor : ""
        this.min_flush_duration = typeof min_flush_duration === "string" ? parseInt(min_flush_duration, 10) : (Number.isFinite(min_flush_duration) ? min_flush_duration : 20)
        this.enabled = typeof enabled === "string" ? parseInt(enabled, 10) : (Number.isFinite(enabled) ? enabled : 1)
        this.sorted = typeof sorted === "string" ? parseInt(sorted, 10) : (Number.isFinite(sorted) ? sorted : 0)
        this.created_at = typeof created_at === "string" ? created_at : ""
        this.updated_at = typeof updated_at === "string" ? updated_at : ""
        this.last_flush_date = typeof last_flush_date === "string" ? last_flush_date : null
        this.next_flush_due = typeof next_flush_due === "string" ? next_flush_due : null
        this.qr_code_uuid = typeof qr_code_uuid === "string" ? qr_code_uuid : null
    }
}

export class ApiApartmentListResponse {
    constructor({ items = [], success = false, error = "", server_time = 0, response_time = 0 } = {}) {
        this.items = Array.isArray(items) ? items.map((it) => it instanceof ApartmentItem ? it : new ApartmentItem(it)) : []
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

// Body-Helper: Erlaubt Partial-Bodies für update, vollständige Bodies für create/sync
function toPlainApartment(value, { allowPartial = false } = {}) {
    if (!value || typeof value !== "object") {
        return allowPartial ? {} : {
            building_id: 0, number: "", floor: "", min_flush_duration: 20, enabled: 1, sorted: 0
        }
    }
    const out = {}
    if (allowPartial) {
        if ("building_id" in value) out.building_id = typeof value.building_id === "string" ? parseInt(value.building_id, 10) : Number(value.building_id) || 0
        if ("number" in value) out.number = value.number
        if ("floor" in value) out.floor = value.floor
        if ("min_flush_duration" in value) out.min_flush_duration = typeof value.min_flush_duration === "string" ? parseInt(value.min_flush_duration, 10) : Number(value.min_flush_duration) || 20
        if ("enabled" in value) out.enabled = typeof value.enabled === "string" ? parseInt(value.enabled, 10) : Number(value.enabled) || 1
        if ("sorted" in value) out.sorted = typeof value.sorted === "string" ? parseInt(value.sorted, 10) : Number(value.sorted) || 0
    } else {
        out.building_id = typeof value.building_id === "string" ? parseInt(value.building_id, 10) : Number(value.building_id) || 0
        out.number = typeof value.number === "string" ? value.number : ""
        out.floor = typeof value.floor === "string" ? value.floor : ""
        out.min_flush_duration = typeof value.min_flush_duration === "string" ? parseInt(value.min_flush_duration, 10) : Number(value.min_flush_duration) || 20
        out.enabled = typeof value.enabled === "string" ? parseInt(value.enabled, 10) : Number(value.enabled) || 1
        out.sorted = typeof value.sorted === "string" ? parseInt(value.sorted, 10) : Number(value.sorted) || 0
    }
    // optional id für sync
    if ("id" in value) {
        out.id = typeof value.id === "string" ? parseInt(value.id, 10) : Number(value.id) || 0
    }
    return out
}

/**
 * Hauptklasse für Apartment-API-Operationen
 */
export class ApiApartment {
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
                console.log('📤 Apartment API - Sending request body:', config.body)
            }

            console.log('🚀 Apartment API - Making request to:', `${this.baseUrl}${request.endpoint}`)

            const response = await fetch(`${this.baseUrl}${request.endpoint}`, config)
            clearTimeout(timeoutId)

            console.log('📥 Apartment API - Response status:', response.status)

            // Cookies aus Response parsen und speichern
            parseCookiesFromResponse(response)

            let responseData
            const contentType = response.headers.get('content-type')

            try {
                if (contentType && contentType.includes('application/json')) {
                    responseData = await response.json()
                    console.log('✅ Apartment API - JSON Response received')
                } else {
                    // Falls HTML zurückkommt, als Fehler behandeln
                    const textResponse = await response.text()
                    console.error('❌ Apartment API - Non-JSON response received:', textResponse.substring(0, 200))

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
                console.error('❌ Apartment API - Error parsing response:', parseError)
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
            console.error('❌ Apartment API - Network error:', error)

            // Bei AbortError (Timeout) keine Retries, nur bei echten Netzwerkfehlern
            const isTimeout = error.name === 'AbortError'

            if (!isTimeout && attempt < request.retries) {
                console.log(`🔄 Apartment API - Retrying request (attempt ${attempt + 1}/${request.retries})`)
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
                return this.send(request, attempt + 1)
            }

            return new ApiResponse({
                success: false,
                error: isTimeout ? 'Request timeout - Server antwortet nicht rechtzeitig' : (error.message || 'Netzwerkfehler'),
                data: null
            })
        }
    }

    /**
     * GET /apartments/list - Alle Apartments auflisten (Backend verwendet Plural)
     */
    async list(options = {}) {
        const { timeout = 120000, headers = {}, building_id } = options // Timeout auf 120 Sekunden erhöht
        const storage = useApartmentStorage()
        const onlineStatus = useOnlineStatusStore()

        let endpoint = "/apartments/list"
        if (building_id) {
            endpoint += `/${encodeURIComponent(building_id)}`
        }

        // Zuerst aus IndexedDB laden für sofortige Anzeige
        if (building_id) {
            const cachedApartments = await storage.storage.getApartmentsForBuilding(building_id)
            if (Array.isArray(cachedApartments) && cachedApartments.length > 0) {
                console.log('📦 Apartments aus IndexedDB geladen:', cachedApartments.length)
                // Setze sofort die Apartments aus IndexedDB
                storage.apartments.value = cachedApartments
            } else {
                // Wichtig: Leere das Array wenn keine Apartments im Cache
                console.log('🔄 Keine Apartments im IndexedDB, leere Array')
                storage.apartments.value = []
            }
        }

        // ✅ NEU: Im Offline-Modus direkt IndexedDB-Daten zurückgeben, ohne API-Call
        if (!onlineStatus.isFullyOnline) {
            console.log('📴 Offline-Modus: Verwende nur IndexedDB-Daten, kein API-Call')

            if (building_id) {
                const cachedApartments = await storage.storage.getApartmentsForBuilding(building_id)
                return new ApiApartmentListResponse({
                    items: Array.isArray(cachedApartments) ? cachedApartments : [],
                    success: true,
                    error: (Array.isArray(cachedApartments) && cachedApartments.length > 0) ? 'Daten aus lokalem Speicher (Offline)' : 'Keine Daten im Offline-Modus verfügbar'
                })
            }

            // Fallback für den Fall ohne building_id
            return new ApiApartmentListResponse({
                items: storage.apartments.value || [],
                success: true,
                error: 'Daten aus lokalem Speicher (Offline)'
            })
        }

        const request = new ApiRequest({
            endpoint,
            method: "GET",
            headers,
            timeout,
        })

        try {
            const response = await this.send(request)

            if (response.success && response.data) {
                const apartments = Array.isArray(response.data)
                    ? response.data.map(item => new ApartmentItem(item))
                    : []

                console.log('✅ Apartments vom Backend erhalten:', apartments.length, 'für Gebäude:', building_id)

                // Aktualisiere sowohl IndexedDB als auch reactive ref
                if (building_id) {
                    // Speichere in IndexedDB
                    await storage.storage.setApartmentsForBuilding(building_id, apartments)
                    // Setze das reactive ref explizit
                    storage.apartments.value = apartments
                    console.log('💾 Apartments in IndexedDB und reactive ref aktualisiert:', apartments.length)
                } else if (apartments.length > 0) {
                    // Falls keine building_id, setze direkt das reactive ref
                    storage.apartments.value = apartments
                }

                return new ApiApartmentListResponse({
                    items: apartments,
                    success: true,
                    server_time: response.server_time,
                    response_time: response.response_time
                })
            }

            return new ApiApartmentListResponse({
                success: false,
                error: response.error || 'Unbekannter Fehler beim Laden der Apartments'
            })
        } catch (error) {
            console.error('❌ Fehler beim Laden der Apartments:', error)

            // Bei Netzwerkfehler: Fallback auf IndexedDB
            if (building_id) {
                try {
                    const cachedApartments = await storage.storage.getApartmentsForBuilding(building_id)
                    if (Array.isArray(cachedApartments) && cachedApartments.length > 0) {
                        console.log('🔄 Fallback auf IndexedDB-Daten:', cachedApartments.length)
                        storage.apartments.value = cachedApartments
                        return new ApiApartmentListResponse({
                            items: cachedApartments,
                            success: true,
                            error: 'Daten aus lokalem Speicher (Offline)'
                        })
                    }
                } catch (cacheError) {
                    console.error('❌ Fehler beim Laden aus IndexedDB:', cacheError)
                }
            }

            return new ApiApartmentListResponse({
                success: false,
                error: error.message || 'Netzwerkfehler beim Laden der Apartments'
            })
        }
    }

    /**
     * GET /apartments/by-uuid/{uuid} - Apartment per QR-Code UUID finden
     */
    async findByUUID(uuid, options = {}) {
        const { timeout = 30000, headers = {} } = options
        const storage = useApartmentStorage()
        const onlineStatus = useOnlineStatusStore()

        // Zuerst in IndexedDB suchen
        const buildings = await BuildingStorage.getBuildings()

        if (Array.isArray(buildings)) {
            for (const building of buildings) {
                const apartments = await storage.storage.getApartmentsForBuilding(building.id)

                if (Array.isArray(apartments)) {
                    const apartment = apartments.find(apt => apt.qr_code_uuid === uuid)
                    if (apartment) {
                        console.log('📦 Apartment per UUID aus IndexedDB gefunden:', apartment.number)
                        return new ApiResponse({
                            success: true,
                            data: {
                                apartment,
                                building
                            }
                        })
                    }
                }
            }
        }

        // Falls nicht im Cache und offline, Fehler zurückgeben
        if (!onlineStatus.isFullyOnline) {
            console.log('📴 Apartment nicht im Cache und offline')
            return new ApiResponse({
                success: false,
                error: 'Apartment nicht im Offline-Cache gefunden'
            })
        }

        // Online: API-Call zum Backend
        const request = new ApiRequest({
            endpoint: `/apartments/by-uuid/${encodeURIComponent(uuid)}`,
            method: "GET",
            headers,
            timeout
        })

        const response = await this.send(request)

        if (response.success && response.data) {
            const apartment = new ApartmentItem(response.data.apartment)

            // Speichere im LocalStorage für Offline-Zugriff
            storage.storage.addOrUpdateApartment(apartment.building_id, apartment)

            return new ApiResponse({
                success: true,
                data: {
                    apartment,
                    building: response.data.building
                }
            })
        }

        return response
    }

    /**
     * DELETE /apartments/delete/{id} - Apartment löschen
     */
    async getById(id, options = {}) {
        const { timeout = null, headers = {} } = options // Timeout auf 15 Sekunden erhöht

        const request = new ApiRequest({
            endpoint: `/apartments/get/${encodeURIComponent(id)}`,
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

        return item ? new ApartmentItem(item) : null
    }

    /**
     * POST /apartments/create - Neues Apartment erstellen
     */
    async create(apartment, options = {}) {
        const { timeout = 8000, headers = {} } = options
        const storage = useApartmentStorage()

        const body = toPlainApartment(apartment, { allowPartial: false })
        const request = new ApiRequest({
            endpoint: "/apartments/create",
            method: "POST",
            body,
            headers,
            timeout,
        })

        try {
            const response = await this.send(request)

            if (response.success && response.data) {
                const newApartment = new ApartmentItem(response.data)

                // Sofort in LocalStorage hinzufügen
                if (newApartment.building_id) {
                    storage.storage.addOrUpdateApartment(newApartment.building_id, newApartment)
                    console.log('✅ Neues Apartment in LocalStorage hinzugefügt:', newApartment.number)
                }

                return new ApiResponse({
                    success: true,
                    data: newApartment,
                    message: response.message || 'Apartment erfolgreich erstellt',
                    server_time: response.server_time,
                    response_time: response.response_time
                })
            }

            return new ApiResponse({
                success: false,
                error: response.error || 'Fehler beim Erstellen des Apartments'
            })
        } catch (error) {
            console.error('❌ Fehler beim Erstellen des Apartments:', error)
            return new ApiResponse({
                success: false,
                error: error.message || 'Netzwerkfehler beim Erstellen'
            })
        }
    }

    /**
     * POST /records/create - Spül-Record erstellen (wird vom Frontend nach Ablauf der min_flush_duration aufgerufen)
     */
    async createFlushRecord(apartmentId, options = {}) {
        const { timeout = 30000, headers = {}, startTime, endTime, duration, buildingId } = options
        const storage = useApartmentStorage()

        // Hole das aktuelle Apartment direkt aus IndexedDB um building_id zu erhalten
        let currentApartment = null

        // Wenn buildingId übergeben wurde, nutze diese
        if (buildingId) {
            const apartments = await storage.storage.getApartmentsForBuilding(buildingId)
            if (Array.isArray(apartments)) {
                currentApartment = apartments.find(apt => apt.id === parseInt(apartmentId))
            }
        }

        // Fallback: Durchsuche alle Gebäude in IndexedDB
        if (!currentApartment) {
            console.log('🔍 Suche Apartment in allen Gebäuden...')
            try {
                const buildings = await BuildingStorage.getBuildings()
                if (Array.isArray(buildings)) {
                    for (const building of buildings) {
                        const apartments = await storage.storage.getApartmentsForBuilding(building.id)
                        if (Array.isArray(apartments)) {
                            const found = apartments.find(apt => apt.id === parseInt(apartmentId))
                            if (found) {
                                currentApartment = found
                                console.log('✅ Apartment gefunden in Gebäude:', building.id)
                                break
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('❌ Fehler beim Suchen des Apartments:', err)
            }
        }

        if (!currentApartment) {
            console.error('❌ Apartment nicht gefunden. ApartmentId:', apartmentId, 'BuildingId:', buildingId)
            throw new Error('Apartment nicht gefunden. Bitte Seite neu laden.')
        }

        console.log('✅ Apartment gefunden:', currentApartment.number, 'Building:', currentApartment.building_id)

        // Hole aktuelle User-ID aus GlobalUser Store
        let currentUserId = null

        // Direkter Zugriff auf currentUser reactive ref (synchron, kein await nötig)
        try {
            const { currentUser } = await import('../stores/GlobalUser.js')
            if (currentUser.value && currentUser.value.id) {
                currentUserId = currentUser.value.id
                console.log('✅ User-ID direkt aus currentUser ref:', currentUserId)
            }
        } catch (e) {
            console.warn('⚠️ Konnte User-ID nicht aus currentUser ref lesen:', e)
        }

        // Erster Versuch: direkt aus in-memory Token dekodieren (schnellster Weg)
        try {
            const { getToken, loadTokenFromStorage } = await import('../stores/GlobalToken.js')
            let token = getToken()
            // Falls Token noch nicht geladen, jetzt laden
            if (!token) {
                await loadTokenFromStorage()
                token = getToken()
            }
            if (token) {
                const parts = token.split('.')
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]))
                    if (payload.userId) {
                        currentUserId = payload.userId
                        console.log('✅ User-ID direkt aus in-memory JWT:', currentUserId)
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Konnte User-ID nicht aus in-memory Token lesen:', e)
        }

        if (!currentUserId) {
        try {
            const currentUser = await getCurrentUser()
            if (currentUser && currentUser.id) {
                currentUserId = currentUser.id
                console.log('✅ User-ID aus GlobalUser Store:', currentUserId)
            }
        } catch (error) {
            console.warn('⚠️ Konnte User nicht aus GlobalUser laden:', error)
        }

        // Fallback: Prüfe IndexedDB USER store
        if (!currentUserId) {
            try {
                const userResult = await indexedDBHelper.get(STORES.USER, 'wls_current_user')
                if (userResult && userResult.value && userResult.value.id) {
                    currentUserId = userResult.value.id
                    console.log('✅ User-ID aus IndexedDB USER:', currentUserId)
                }
            } catch (error) {
                console.warn('⚠️ Konnte User nicht aus IndexedDB USER laden:', error)
            }
        }

        // Fallback: Prüfe IndexedDB CONFIG 'currentUserId'
        if (!currentUserId) {
            try {
                const configResult = await indexedDBHelper.get(STORES.CONFIG, 'currentUserId')
                if (configResult && configResult.value) {
                    currentUserId = configResult.value
                    console.log('✅ User-ID aus IndexedDB CONFIG:', currentUserId)
                }
            } catch (error) {
                console.warn('⚠️ Konnte User-ID nicht aus IndexedDB CONFIG laden:', error)
            }
        }

        // Fallback: JWT-Token aus IndexedDB dekodieren
        if (!currentUserId) {
            try {
                const authResult = await indexedDBHelper.get(STORES.AUTH, 'jwt_token')
                const token = authResult?.value
                if (token) {
                    const parts = token.split('.')
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]))
                        if (payload.userId) {
                            currentUserId = payload.userId
                            console.log('✅ User-ID aus JWT-Token:', currentUserId)
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ Konnte User-ID nicht aus JWT-Token laden:', error)
            }
        }
        } // end if (!currentUserId) GlobalUser block

        // Letzter Fallback: Versuche User-ID aus globalem authToken (in-memory ref) zu lesen
        if (!currentUserId) {
            try {
                const { authToken } = await import('../stores/GlobalToken.js')
                const token = authToken.value
                if (token) {
                    const parts = token.split('.')
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]))
                        if (payload.userId) {
                            currentUserId = payload.userId
                            console.log('✅ User-ID aus globalem authToken ref:', currentUserId)
                        }
                    }
                }
            } catch (e) {
                console.warn('⚠️ Konnte User-ID nicht aus globalem authToken lesen:', e)
            }
        }

        // Wenn immer noch keine User-ID, Fehler werfen
        if (!currentUserId) {
            // Letzter Notfall-Fallback: globale window Variable (beim Login synchron gesetzt)
            if (typeof window !== 'undefined' && window._wls_userId) {
                currentUserId = window._wls_userId
                console.log('✅ User-ID aus window._wls_userId:', currentUserId)
            }
        }

        if (!currentUserId) {
            console.error('❌ Keine User-ID gefunden - weder in GlobalUser noch in IndexedDB')
            throw new Error('Keine User-ID gefunden. Bitte einloggen.')
        }

        const body = {
            apartment_id: typeof apartmentId === "string" ? parseInt(apartmentId, 10) : Number(apartmentId) || 0,
            building_id: currentApartment.building_id,
            user_id: currentUserId,
            start_time: startTime || new Date().toISOString(),
            end_time: endTime || new Date().toISOString()
        }

        console.log('📤 Erstelle Spül-Record:', body)

        const request = new ApiRequest({
            endpoint: "/records/create",
            method: "POST",
            body,
            headers,
            timeout,
        })

        try {
            const response = await this.send(request)

            if (response.success && response.data) {
                // Nach erfolgreichem Record-Erstellen das Apartment im LocalStorage aktualisieren
                const updatedApartment = {
                    ...currentApartment,
                    last_flush_date: body.start_time,
                    // next_flush_due wird vom Backend berechnet und kommt ggf. in response.data
                    next_flush_due: response.data.next_flush_due || currentApartment.next_flush_due
                }

                // Aktualisiere LocalStorage
                storage.storage.addOrUpdateApartment(currentApartment.building_id, updatedApartment)

                // Auch das reactive ref aktualisieren (falls vorhanden)
                if (storage.apartments.value && storage.apartments.value.length > 0) {
                    const apartmentIndex = storage.apartments.value.findIndex(apt => apt.id === currentApartment.id)
                    if (apartmentIndex >= 0) {
                        storage.apartments.value[apartmentIndex] = new ApartmentItem(updatedApartment)
                    }
                }

                console.log('✅ Spül-Record erfolgreich erstellt für Apartment:', currentApartment.number)

                return new ApiResponse({
                    success: true,
                    data: {
                        record: response.data,
                        apartment: updatedApartment
                    },
                    message: response.message || 'Spülung erfolgreich gespeichert',
                    server_time: response.server_time,
                    response_time: response.response_time
                })
            }

            return new ApiResponse({
                success: false,
                error: response.error || 'Fehler beim Erstellen des Spül-Records',
                data: null
            })
        } catch (error) {
            console.error('❌ Fehler beim Erstellen des Spül-Records:', error)
            throw error
        }
    }

    /**
     * PUT /apartments/update - Apartment aktualisieren
     */
    async update(id, changes, options = {}) {
        const { timeout = 8000, headers = {} } = options
        const storage = useApartmentStorage()

        const body = {
            id: typeof id === "string" ? parseInt(id, 10) : Number(id) || 0,
            ...toPlainApartment(changes, { allowPartial: true })
        }

        const request = new ApiRequest({
            endpoint: "/apartments/update",
            method: "PUT",
            body,
            headers,
            timeout,
        })

        try {
            const response = await this.send(request)

            if (response.success && response.data) {
                const updatedApartment = new ApartmentItem(response.data)

                // Sofort in LocalStorage aktualisieren
                if (updatedApartment.building_id) {
                    storage.storage.addOrUpdateApartment(updatedApartment.building_id, updatedApartment)
                    console.log('📝 Apartment in LocalStorage aktualisiert:', updatedApartment.number)
                }

                return new ApiResponse({
                    success: true,
                    data: updatedApartment,
                    message: response.message || 'Apartment erfolgreich aktualisiert',
                    server_time: response.server_time,
                    response_time: response.response_time
                })
            }

            return new ApiResponse({
                success: false,
                error: response.error || 'Fehler beim Aktualisieren des Apartments'
            })
        } catch (error) {
            console.error('❌ Fehler beim Aktualisieren:', error)
            return new ApiResponse({
                success: false,
                error: error.message || 'Netzwerkfehler beim Aktualisieren'
            })
        }
    }
}

// Singleton-Instanz exportieren
export const apiApartment = new ApiApartment()

// Composable für einfache Nutzung in Vue-Komponenten
export function useApiApartment() {
    const storage = useApartmentStorage()
    const loading = ref(false)
    const error = ref(null)

    const handleRequest = async (requestFn) => {
        loading.value = true
        error.value = null

        try {
            const result = await requestFn()
            if (!result.success) {
                error.value = result.error
            }
            return result
        } catch (err) {
            error.value = err.message
            throw err
        } finally {
            loading.value = false
        }
    }

    return {
        apartments: storage.apartments, // Apartments aus dem Storage exportieren
        loading,
        error,
        storage, // Storage für Debug-Zwecke
        list: (options) => handleRequest(() => apiApartment.list(options)),
        create: (apartment, options) => handleRequest(() => apiApartment.create(apartment, options)),
        createFlushRecord: (apartmentId, options) => handleRequest(() => apiApartment.createFlushRecord(apartmentId, options)),
        update: (id, changes, options) => handleRequest(() => apiApartment.update(id, changes, options)),
        getApartment: (id, options) => handleRequest(() => apiApartment.getById(id, options)),
        findByUUID: (uuid, options) => handleRequest(() => apiApartment.findByUUID(uuid, options))
    }
}
