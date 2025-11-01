/**
 * OfflineDataPreloader.js
 * Service zum Vorladen von Gebäuden und Apartments für den Offline-Modus
 */

import { ref } from 'vue'
import { ApiBuilding } from '../api/ApiBuilding.js'
import { ApiApartment } from '../api/ApiApartment.js'
import BuildingStorage from '../stores/BuildingStorage.js'
import { useApartmentStorage } from '../stores/ApartmentStorage.js'

export class OfflineDataPreloader {
  constructor() {
    this.buildingApi = new ApiBuilding()
    this.apartmentApi = new ApiApartment()
    this.apartmentStorage = useApartmentStorage()

    this.isPreloading = ref(false)
    this.preloadProgress = ref({
      buildings: 0,
      apartments: 0,
      totalBuildings: 0,
      totalApartments: 0,
      currentBuilding: null,
      status: 'idle' // idle, loading, success, error
    })
    this.lastPreloadTime = ref(null)
    this.preloadError = ref(null)
  }

  /**
   * Lädt alle Gebäude und deren Apartments für den Offline-Modus vor
   */
  async preloadAllData() {
    if (this.isPreloading.value) {
      console.log('⏳ Preloading läuft bereits...')
      return false
    }

    // ✅ NEU: Prüfe ob wir online sind, bevor wir Daten laden
    if (!navigator.onLine) {
      console.log('📴 Preloading abgebrochen: Keine Internetverbindung')
      this.preloadError.value = 'Keine Internetverbindung verfügbar'
      this.preloadProgress.value.status = 'error'
      return false
    }

    this.isPreloading.value = true
    this.preloadProgress.value.status = 'loading'
    this.preloadError.value = null

    console.log('🚀 Starte Preloading von Gebäuden und Apartments für Offline-Modus...')

    try {
      // Schritt 1: Lade alle Gebäude
      console.log('📋 Lade Gebäude...')
      const buildingsResponse = await this.buildingApi.list()

      if (!buildingsResponse.success) {
        throw new Error(buildingsResponse.error || 'Fehler beim Laden der Gebäude')
      }

      const buildings = buildingsResponse.items
      this.preloadProgress.value.totalBuildings = buildings.length
      this.preloadProgress.value.buildings = buildings.length

      console.log(`✅ ${buildings.length} Gebäude geladen`)

      // Speichere Gebäude in LocalStorage
      BuildingStorage.saveBuildings(buildings)
      console.log('💾 Gebäude in LocalStorage gespeichert')

      // Schritt 2: Lade alle Apartments für jedes Gebäude
      console.log('🏢 Lade Apartments für alle Gebäude...')

      let totalApartmentsLoaded = 0
      const apartmentLoadPromises = []

      for (const building of buildings) {
        this.preloadProgress.value.currentBuilding = building.name

        // Paralleles Laden für bessere Performance
        const loadPromise = this.loadApartmentsForBuilding(building.id, building.name)
          .then(count => {
            totalApartmentsLoaded += count
            this.preloadProgress.value.apartments = totalApartmentsLoaded
            return count
          })

        apartmentLoadPromises.push(loadPromise)
      }

      // Warte auf alle Apartment-Ladevorgänge
      const apartmentCounts = await Promise.all(apartmentLoadPromises)
      this.preloadProgress.value.totalApartments = totalApartmentsLoaded

      console.log(`✅ Insgesamt ${totalApartmentsLoaded} Apartments geladen`)
      console.log('🎉 Preloading abgeschlossen!')

      this.preloadProgress.value.status = 'success'
      this.lastPreloadTime.value = new Date().toISOString()

      // Speichere Preload-Metadaten
      this.savePreloadMetadata({
        timestamp: this.lastPreloadTime.value,
        buildingsCount: buildings.length,
        apartmentsCount: totalApartmentsLoaded,
        buildingDetails: buildings.map((b, idx) => ({
          id: b.id,
          name: b.name,
          apartmentsCount: apartmentCounts[idx]
        }))
      })

      return true

    } catch (error) {
      console.error('❌ Fehler beim Preloading:', error)
      this.preloadError.value = error.message
      this.preloadProgress.value.status = 'error'
      return false
    } finally {
      this.isPreloading.value = false
      this.preloadProgress.value.currentBuilding = null
    }
  }

  /**
   * Lädt Apartments für ein bestimmtes Gebäude
   */
  async loadApartmentsForBuilding(buildingId, buildingName) {
    try {
      console.log(`  📦 Lade Apartments für Gebäude: ${buildingName} (ID: ${buildingId})`)

      const apartmentsResponse = await this.apartmentApi.list({
        building_id: buildingId,
        timeout: 10000 // Längerer Timeout für Preloading
      })

      if (apartmentsResponse.success && apartmentsResponse.items) {
        const apartments = apartmentsResponse.items
        console.log(`    ✓ ${apartments.length} Apartments geladen für ${buildingName}`)

        // Apartments werden bereits automatisch in LocalStorage gespeichert
        // durch die list()-Methode in ApiApartment.js

        return apartments.length
      } else {
        console.warn(`    ⚠️ Keine Apartments für ${buildingName} geladen`)
        return 0
      }

    } catch (error) {
      console.error(`    ❌ Fehler beim Laden von Apartments für ${buildingName}:`, error)
      // Bei Fehler für einzelnes Gebäude nicht abbrechen
      return 0
    }
  }

  /**
   * Speichert Metadaten über das Preloading
   */
  savePreloadMetadata(metadata) {
    try {
      localStorage.setItem('wls_preload_metadata', JSON.stringify(metadata))
      console.log('💾 Preload-Metadaten gespeichert')
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Preload-Metadaten:', error)
    }
  }

  /**
   * Lädt Metadaten über das letzte Preloading
   */
  getPreloadMetadata() {
    try {
      const data = localStorage.getItem('wls_preload_metadata')
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('❌ Fehler beim Laden der Preload-Metadaten:', error)
      return null
    }
  }

  /**
   * Prüft, ob Daten bereits vorgeladen wurden
   */
  isDataPreloaded() {
    const metadata = this.getPreloadMetadata()
    return metadata !== null && metadata.buildingsCount > 0
  }

  /**
   * Prüft, ob ein erneutes Preloading empfohlen wird
   * (z.B. wenn die Daten älter als 24 Stunden sind)
   */
  shouldRefreshData(maxAgeHours = 24) {
    const metadata = this.getPreloadMetadata()

    if (!metadata || !metadata.timestamp) {
      return true
    }

    const lastPreload = new Date(metadata.timestamp)
    const now = new Date()
    const hoursSinceLastPreload = (now - lastPreload) / (1000 * 60 * 60)

    return hoursSinceLastPreload > maxAgeHours
  }

  /**
   * Gibt Statistiken über vorgeladene Daten zurück
   */
  getPreloadStats() {
    const metadata = this.getPreloadMetadata()

    if (!metadata) {
      return {
        preloaded: false,
        message: 'Keine Daten vorgeladen'
      }
    }

    const lastPreload = new Date(metadata.timestamp)
    const now = new Date()
    const hoursSinceLastPreload = Math.floor((now - lastPreload) / (1000 * 60 * 60))

    return {
      preloaded: true,
      buildingsCount: metadata.buildingsCount,
      apartmentsCount: metadata.apartmentsCount,
      lastPreload: metadata.timestamp,
      hoursSinceLastPreload,
      needsRefresh: this.shouldRefreshData(),
      buildings: metadata.buildingDetails || []
    }
  }

  /**
   * Löscht alle vorgeladenen Daten
   */
  clearPreloadedData() {
    try {
      BuildingStorage.clearBuildings()
      this.apartmentStorage.storage.clearAll()
      localStorage.removeItem('wls_preload_metadata')
      console.log('🗑️ Alle vorgeladenen Daten gelöscht')
      return true
    } catch (error) {
      console.error('❌ Fehler beim Löschen der vorgeladenen Daten:', error)
      return false
    }
  }
}

// Singleton-Instanz
let preloaderInstance = null

/**
 * Gibt die Singleton-Instanz des Preloaders zurück
 */
export function useOfflineDataPreloader() {
  if (!preloaderInstance) {
    preloaderInstance = new OfflineDataPreloader()
  }
  return preloaderInstance
}

