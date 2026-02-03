/**
 * IndexedDB-Datenbank für Apartments
 * Ermöglicht Offline-Betrieb und sofortige UI-Updates
 */

import { ref } from 'vue'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const STORAGE_VERSION = '1.0'
const METADATA_KEY = 'wls_apartments_metadata'

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
 * IndexedDB-Manager für Apartments
 */
class ApartmentStorageManager {
  constructor() {
    // Initialization is handled by IndexedDBHelper
  }

  /**
   * Gibt alle Apartments für ein Gebäude zurück
   */
  async getApartmentsForBuilding(buildingId) {
    try {
      const apartments = await indexedDBHelper.getAllByIndex(
        STORES.APARTMENTS,
        'buildingId',
        String(buildingId)
      )
      console.log(`📦 ${apartments.length} Apartments für Gebäude ${buildingId} aus IndexedDB geladen`)
      return apartments
    } catch (error) {
      console.error('❌ Failed to get apartments for building:', error)
      return []
    }
  }

  /**
   * Speichert Apartments für ein Gebäude
   */
  async setApartmentsForBuilding(buildingId, apartments) {
    try {
      // First, delete all existing apartments for this building
      const existing = await this.getApartmentsForBuilding(buildingId)
      for (const apt of existing) {
        await indexedDBHelper.delete(STORES.APARTMENTS, apt.id)
      }

      // Then add all new apartments
      for (const apartment of apartments) {
        await indexedDBHelper.set(STORES.APARTMENTS, {
          id: `${buildingId}_${apartment.id}`,
          buildingId: String(buildingId),
          apartmentId: apartment.id,
          ...apartment
        })
      }

      // Update metadata
      await this.updateMetadata(buildingId)

      console.log(`💾 ${apartments.length} Apartments für Gebäude ${buildingId} in IndexedDB gespeichert`)
      return true
    } catch (error) {
      console.error('❌ Failed to set apartments for building:', error)
      return false
    }
  }

  /**
   * Update metadata for apartment storage
   */
  async updateMetadata(buildingId) {
    try {
      let metadata = await indexedDBHelper.get(STORES.METADATA, METADATA_KEY)
      if (!metadata) {
        metadata = { key: METADATA_KEY, value: new StorageMetadata() }
      }
      
      metadata.value.lastUpdate = new Date().toISOString()
      if (!metadata.value.buildingIds) {
        metadata.value.buildingIds = []
      }
      if (!metadata.value.buildingIds.includes(String(buildingId))) {
        metadata.value.buildingIds.push(String(buildingId))
      }
      
      await indexedDBHelper.set(STORES.METADATA, metadata)
    } catch (error) {
      console.error('❌ Failed to update metadata:', error)
    }
  }

  /**
   * Ersetzt alle Apartments für ein Gebäude
   */
  async replaceForBuilding(buildingId, apartments) {
    return await this.setApartmentsForBuilding(buildingId, apartments)
  }

  /**
   * Fügt ein neues Apartment hinzu oder aktualisiert ein bestehendes
   */
  async addOrUpdateApartment(buildingId, apartment) {
    try {
      await indexedDBHelper.set(STORES.APARTMENTS, {
        id: `${buildingId}_${apartment.id}`,
        buildingId: String(buildingId),
        apartmentId: apartment.id,
        ...apartment
      })

      await this.updateMetadata(buildingId)

      // --- Keep reactive globalApartments in sync when possible ---
      try {
        // Only update if globalApartments already contains apartments for this building
        if (Array.isArray(globalApartments.value)) {
          const hasBuilding = globalApartments.value.some(a => String(a.building_id) === String(buildingId))
          if (hasBuilding) {
            const idx = globalApartments.value.findIndex(a => a.id === apartment.id)
            if (idx >= 0) {
              // Replace existing reactive item to preserve reactivity
              globalApartments.value.splice(idx, 1, apartment)
            } else {
              // Append new apartment to reactive array
              globalApartments.value.push(apartment)
            }
            console.log('🔄 globalApartments reactive ref synchronized for building', buildingId)
          }
        }

        // Dispatch a DOM event for other listeners (components) within the same window
        try {
          window.dispatchEvent(new CustomEvent('wls_apartment_updated', { detail: { buildingId, apartment } }))
        } catch (e) {
          // ignore
        }
      } catch (e) {
        console.warn('⚠️ Fehler beim Synchronisieren des globalApartments refs:', e)
      }

      return true
    } catch (error) {
      console.error('❌ Failed to add/update apartment:', error)
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
  async clearAll() {
    try {
      await indexedDBHelper.clear(STORES.APARTMENTS)
      await indexedDBHelper.delete(STORES.METADATA, METADATA_KEY)
      console.log('🗑️ Alle Apartment-Daten aus IndexedDB entfernt')
      return true
    } catch (error) {
      console.error('❌ Failed to clear storage:', error)
      return false
    }
  }

  /**
   * Gibt Metadaten zurück
   */
  async getMetadata() {
    try {
      const result = await indexedDBHelper.get(STORES.METADATA, METADATA_KEY)
      return result ? result.value : new StorageMetadata()
    } catch (error) {
      console.error('❌ Failed to get metadata:', error)
      return new StorageMetadata()
    }
  }

  /**
   * Gibt Debug-Statistiken zurück
   */
  async getStats() {
    try {
      const metadata = await this.getMetadata()
      const totalApartments = await indexedDBHelper.count(STORES.APARTMENTS)

      const stats = {
        totalBuildings: metadata.buildingIds ? metadata.buildingIds.length : 0,
        totalApartments: totalApartments,
        buildingStats: {},
        lastUpdate: metadata.lastUpdate,
        version: metadata.version
      }

      // Count apartments per building
      if (metadata.buildingIds) {
        for (const buildingId of metadata.buildingIds) {
          const apartments = await this.getApartmentsForBuilding(buildingId)
          stats.buildingStats[buildingId] = {
            apartmentCount: apartments.length,
            apartments: apartments.map(apt => ({ id: apt.apartmentId, number: apt.number }))
          }
        }
      }

      return stats
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error)
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
 * Composable für Apartment Storage - jetzt echter Singleton mit async Unterstützung
 */
export function useApartmentStorage() {
  const loadApartments = async (buildingId) => {
    globalLoading.value = true
    globalError.value = null

    try {
      // Aus IndexedDB laden für sofortige Anzeige
      const cachedApartments = await storageManager.getApartmentsForBuilding(buildingId)
      globalApartments.value = cachedApartments
      console.log('📦 Apartments aus IndexedDB in reactive ref geladen:', cachedApartments.length)

      // Dann vom Backend aktualisieren (falls verfügbar)
      // Dies wird in der API-Integration implementiert

    } catch (err) {
      globalError.value = err.message
      console.error('❌ Failed to load apartments:', err)
    } finally {
      globalLoading.value = false
    }
  }

  const updateApartment = async (buildingId, apartment) => {
    const success = await storageManager.addOrUpdateApartment(buildingId, apartment)
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

  const replaceApartments = async (buildingId, newApartments) => {
    const success = await storageManager.replaceForBuilding(buildingId, newApartments)
    if (success) {
      globalApartments.value = newApartments
      console.log('🔄 Reactive apartments ersetzt:', newApartments.length)
    }
    return success
  }

  const loadFromStorage = async (buildingId) => {
    if (buildingId) {
      const cachedApartments = await storageManager.getApartmentsForBuilding(buildingId)
      globalApartments.value = cachedApartments
      console.log('🏠 Apartments für Gebäude', buildingId, 'geladen:', cachedApartments.length)
    }
  }

  // Backward compatibility alias
  const loadFromLocalStorage = loadFromStorage

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
    loadFromStorage,
    loadFromLocalStorage, // Backward compatibility alias
    getStatusColor,
    getStatusText,
    storage: storageManager
  }
}

// Export der Manager-Klasse für direkte Nutzung
export { ApartmentStorageManager }
