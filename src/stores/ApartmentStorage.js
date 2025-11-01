/**
 * LocalStorage-Datenbank für Apartments
 * Ermöglicht Offline-Betrieb und sofortige UI-Updates
 */

import { ref, reactive } from 'vue'

const STORAGE_KEY = 'wls_apartments_db'
const STORAGE_VERSION = '1.0'
const STORAGE_METADATA_KEY = 'wls_apartments_metadata'

/**
 * Metadaten für die Datenbank
 */
class StorageMetadata {
  constructor() {
    this.version = STORAGE_VERSION
    this.lastSync = null
    this.lastUpdate = null
    this.buildingIds = []
  }
}

/**
 * LocalStorage-Manager für Apartments
 */
class ApartmentStorageManager {
  constructor() {
    this.initializeStorage()
  }

  /**
   * Initialisiert den Storage
   */
  initializeStorage() {
    try {
      const existing = localStorage.getItem(STORAGE_KEY)
      if (!existing) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({}))
      }

      const metadata = localStorage.getItem(STORAGE_METADATA_KEY)
      if (!metadata) {
        localStorage.setItem(STORAGE_METADATA_KEY, JSON.stringify(new StorageMetadata()))
      }
    } catch (error) {
      console.error('Failed to initialize apartment storage:', error)
    }
  }

  /**
   * Gibt alle Apartments für ein Gebäude zurück
   */
  getApartmentsForBuilding(buildingId) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return data[buildingId] || []
    } catch (error) {
      console.error('Failed to get apartments for building:', error)
      return []
    }
  }

  /**
   * Speichert Apartments für ein Gebäude
   */
  setApartmentsForBuilding(buildingId, apartments) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      data[buildingId] = apartments
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

      // Update metadata
      const metadata = JSON.parse(localStorage.getItem(STORAGE_METADATA_KEY) || '{}')
      metadata.lastUpdate = new Date().toISOString()
      if (!metadata.buildingIds.includes(buildingId)) {
        metadata.buildingIds.push(buildingId)
      }
      localStorage.setItem(STORAGE_METADATA_KEY, JSON.stringify(metadata))

      return true
    } catch (error) {
      console.error('Failed to set apartments for building:', error)
      return false
    }
  }

  /**
   * Ersetzt alle Apartments für ein Gebäude
   */
  replaceForBuilding(buildingId, apartments) {
    return this.setApartmentsForBuilding(buildingId, apartments)
  }

  /**
   * Fügt ein neues Apartment hinzu oder aktualisiert ein bestehendes
   */
  addOrUpdateApartment(buildingId, apartment) {
    try {
      const apartments = this.getApartmentsForBuilding(buildingId)
      const existingIndex = apartments.findIndex(apt => apt.id === apartment.id)

      if (existingIndex >= 0) {
        apartments[existingIndex] = apartment
      } else {
        apartments.push(apartment)
      }

      return this.setApartmentsForBuilding(buildingId, apartments)
    } catch (error) {
      console.error('Failed to add/update apartment:', error)
      return false
    }
  }

  /**
   * Berechnet den Status-Farbcode für ein Apartment basierend auf der letzten Spülung
   */
  getStatusColor(lastFlush) {
    if (!lastFlush) return 'danger' // Rot - keine Spülung

    const today = new Date()
    const lastFlushDate = new Date(lastFlush)
    const daysDiff = Math.floor((today - lastFlushDate) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 2) return 'success' // Grün - 1-2 Tage
    if (daysDiff <= 7) return 'warning' // Gelb - heute fällig
    return 'danger' // Rot - überfällig
  }

  /**
   * Gibt den Status-Text zurück
   */
  getStatusText(lastFlush) {
    if (!lastFlush) return 'Keine Spülung'

    const today = new Date()
    const lastFlushDate = new Date(lastFlush)
    const daysDiff = Math.floor((today - lastFlushDate) / (1000 * 60 * 60 * 24))

    if (daysDiff === 0) return 'Heute gespült'
    if (daysDiff === 1) return 'Gestern gespült'
    if (daysDiff <= 2) return `Vor ${daysDiff} Tagen gespült`
    if (daysDiff <= 7) return 'Spülung fällig'
    return `Überfällig (${daysDiff} Tage)`
  }

  /**
   * Löscht alle Daten
   */
  clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_METADATA_KEY)
      this.initializeStorage()
      return true
    } catch (error) {
      console.error('Failed to clear storage:', error)
      return false
    }
  }

  /**
   * Gibt Metadaten zurück
   */
  getMetadata() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_METADATA_KEY) || '{}')
    } catch (error) {
      console.error('Failed to get metadata:', error)
      return new StorageMetadata()
    }
  }

  /**
   * Gibt Debug-Statistiken zurück
   */
  getStats() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      const metadata = this.getMetadata()

      const stats = {
        totalBuildings: Object.keys(data).length,
        totalApartments: 0,
        buildingStats: {},
        lastUpdate: metadata.lastUpdate,
        version: metadata.version
      }

      // Zähle Apartments pro Gebäude
      for (const [buildingId, apartments] of Object.entries(data)) {
        const apartmentCount = Array.isArray(apartments) ? apartments.length : 0
        stats.totalApartments += apartmentCount
        stats.buildingStats[buildingId] = {
          apartmentCount,
          apartments: apartmentCount > 0 ? apartments.map(apt => ({ id: apt.id, number: apt.number })) : []
        }
      }

      return stats
    } catch (error) {
      console.error('Failed to get storage stats:', error)
      return {
        totalBuildings: 0,
        totalApartments: 0,
        buildingStats: {},
        lastUpdate: null,
        version: STORAGE_VERSION,
        error: error.message
      }
    }
  }
}

// Singleton-Instanz
const storageManager = new ApartmentStorageManager()

// Globale reactive refs - nur einmal erstellt
const globalApartments = ref([])
const globalLoading = ref(false)
const globalError = ref(null)

/**
 * Composable für Apartment Storage - jetzt echter Singleton
 */
export function useApartmentStorage() {
  const loadApartments = async (buildingId) => {
    globalLoading.value = true
    globalError.value = null

    try {
      // Zuerst aus LocalStorage laden für sofortige Anzeige
      const cachedApartments = storageManager.getApartmentsForBuilding(buildingId)
      globalApartments.value = cachedApartments
      console.log('📦 Apartments aus LocalStorage in reactive ref geladen:', cachedApartments.length)

      // Dann vom Backend aktualisieren (falls verfügbar)
      // Dies wird in der API-Integration implementiert

    } catch (err) {
      globalError.value = err.message
      console.error('Failed to load apartments:', err)
    } finally {
      globalLoading.value = false
    }
  }

  const updateApartment = (buildingId, apartment) => {
    const success = storageManager.addOrUpdateApartment(buildingId, apartment)
    if (success) {
      // Aktualisiere die reactive Liste
      const index = globalApartments.value.findIndex(apt => apt.id === apartment.id)
      if (index >= 0) {
        globalApartments.value[index] = apartment
      } else {
        globalApartments.value.push(apartment)
      }
    }
    return success
  }

  const replaceApartments = (buildingId, newApartments) => {
    const success = storageManager.replaceForBuilding(buildingId, newApartments)
    if (success) {
      globalApartments.value = newApartments
      console.log('🔄 Reactive apartments ersetzt:', newApartments.length)
    }
    return success
  }

  const loadFromLocalStorage = (buildingId) => {
    if (buildingId) {
      const cachedApartments = storageManager.getApartmentsForBuilding(buildingId)
      globalApartments.value = cachedApartments
      console.log('🏠 Apartments für Gebäude', buildingId, 'geladen:', cachedApartments.length)
    }
  }

  const getStatusColor = (lastFlush) => {
    return storageManager.getStatusColor(lastFlush)
  }

  const getStatusText = (lastFlush) => {
    return storageManager.getStatusText(lastFlush)
  }

  return {
    apartments: globalApartments,
    loading: globalLoading,
    error: globalError,
    loadApartments,
    updateApartment,
    replaceApartments,
    loadFromLocalStorage,
    getStatusColor,
    getStatusText,
    storage: storageManager
  }
}

// Export der Manager-Klasse für direkte Nutzung
export { ApartmentStorageManager }
