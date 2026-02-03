/**
 * OfflineDataPreloader.js
 * Service zum Vorladen von Gebäuden und Apartments für den Offline-Modus
 */

import { ref } from 'vue'
import { ApiBuilding } from '../api/ApiBuilding.js'
import { ApiApartment } from '../api/ApiApartment.js'
import { ApiConfig } from '../api/ApiConfig.js'
import BuildingStorage from '../stores/BuildingStorage.js'
import { useApartmentStorage } from '../stores/ApartmentStorage.js'
import configStorage from '../stores/ConfigStorage.js'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const PRELOAD_METADATA_KEY = 'wls_preload_metadata'

export class OfflineDataPreloader {
  constructor() {
    this.buildingApi = new ApiBuilding()
    this.apartmentApi = new ApiApartment()
    this.configApi = new ApiConfig()
    this.apartmentStorage = useApartmentStorage()

    this.isPreloading = ref(false)
    this.preloadProgress = ref({
      buildings: 0,
      apartments: 0,
      totalBuildings: 0,
      totalApartments: 0,
      currentBuilding: null,
      config: false,
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

    console.log('🚀 Starte Preloading von Gebäuden, Apartments und Konfiguration für Offline-Modus...')

    try {
      // Schritt 0: Lade Konfiguration
      console.log('⚙️ Lade Konfiguration...')
      try {
        const configResult = await this.configApi.get()
        if (configResult) {
          await configStorage.saveConfig(configResult)
          this.preloadProgress.value.config = true
          console.log('✅ Konfiguration geladen und gespeichert')
        } else {
          console.warn('⚠️ Keine Konfiguration verfügbar')
        }
      } catch (configError) {
        console.warn('⚠️ Fehler beim Laden der Konfiguration:', configError)
        // Konfigurationsfehler nicht als kritisch behandeln
      }

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

      // Speichere Gebäude in IndexedDB
      await BuildingStorage.saveBuildings(buildings)
      console.log('💾 Gebäude in IndexedDB gespeichert')

      // Schritt 2: Lade alle Apartments für jedes Gebäude
      console.log('🏢 Lade Apartments für alle Gebäude...')

      let totalApartmentsLoaded = 0
      const apartmentCounts = []

      // ✅ Sequenzielles Laden statt parallel, um Timeout-Probleme zu vermeiden
      for (const building of buildings) {
        this.preloadProgress.value.currentBuilding = building.name

        const count = await this.loadApartmentsForBuilding(building.id, building.name)
        apartmentCounts.push(count)
        totalApartmentsLoaded += count
        this.preloadProgress.value.apartments = totalApartmentsLoaded

        // Kleine Pause zwischen den Requests, um Server nicht zu überlasten
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      this.preloadProgress.value.totalApartments = totalApartmentsLoaded

      console.log(`✅ Insgesamt ${totalApartmentsLoaded} Apartments geladen`)
      console.log('🎉 Preloading abgeschlossen!')

      this.preloadProgress.value.status = 'success'
      if (this.lastPreloadTime) {
        this.lastPreloadTime.value = new Date().toISOString()
      }

      // Speichere Preload-Metadaten
      this.savePreloadMetadata({
        timestamp: this.lastPreloadTime.value,
        buildingsCount: buildings.length,
        apartmentsCount: totalApartmentsLoaded,
        configLoaded: this.preloadProgress.value.config,
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
        building_id: buildingId
        // Timeout wird aus der Konfiguration gelesen (ApiConfigHelper)
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
      // Aktualisiere reaktiven Zeitstempel damit UIs neu gerendert werden
      if (metadata && metadata.timestamp && this.lastPreloadTime) {
        this.lastPreloadTime.value = metadata.timestamp
      }
      console.log('💾 Preload-Metadaten gespeichert')
      try {
        // Emit event so UI components can react immediately
        window.dispatchEvent(new CustomEvent('wls:preload:complete', { detail: metadata }))
      } catch (e) {
        console.warn('⚠️ Konnte Preload-Event nicht dispatchen:', e)
      }
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Preload-Metadaten:', error)
    }
  }

  /**
   * Lädt Metadaten über das letzte Preloading
   */
  async getPreloadMetadata() {
    try {
      const result = await indexedDBHelper.get(STORES.METADATA, PRELOAD_METADATA_KEY)
      return result && result.value ? result.value : null
    } catch (error) {
      console.error('❌ Fehler beim Laden der Preload-Metadaten:', error)
      return null
    }
  }

  /**
   * Prüft, ob Daten bereits vorgeladen wurden
   */
  async isDataPreloaded() {
    const metadata = await this.getPreloadMetadata()
    return metadata !== null && metadata.buildingsCount > 0
  }

  /**
   * Prüft, ob ein erneutes Preloading empfohlen wird
   * (z.B. wenn die Daten älter als 24 Stunden sind)
   */
  async shouldRefreshData(maxAgeHours = 24) {
    const metadata = await this.getPreloadMetadata()

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
  async getPreloadStats() {
    // Wichtig: lese hier einen reaktiven Wert, damit Aufrufer (Components / Computed) reaktiv aktualisiert werden
    // wenn sich das Preload-Datum ändert. Ohne diesen Zugriff wird getPreloadStats als rein nicht-reaktiv
    // behandelt und UI-Computeds, die nur dieses Ergebnis verwenden, werden nicht neu ausgewertet.
    // optional chaining: wenn lastPreloadTime mal null sein sollte, vermeiden wir einen Crash
    void (this.lastPreloadTime?.value)

    const metadata = await this.getPreloadMetadata()

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
      needsRefresh: await this.shouldRefreshData(),
      buildings: metadata.buildingDetails || []
    }
  }

  /**
   * Löscht alle vorgeladenen Daten
   */
  async clearPreloadedData() {
    try {
      await BuildingStorage.clearBuildings()
      await this.apartmentStorage.storage.clearAll()
      await configStorage.clearConfig()
      await indexedDBHelper.delete(STORES.METADATA, PRELOAD_METADATA_KEY)
      // Reset reaktive Werte
      this.preloadProgress.value = {
        buildings: 0,
        apartments: 0,
        totalBuildings: 0,
        totalApartments: 0,
        currentBuilding: null,
        config: false,
        status: 'idle'
      }
      this.preloadError.value = null
      if (this.lastPreloadTime) this.lastPreloadTime.value = null
      console.log('🗑️ Alle vorgeladenen Daten gelöscht')
      try {
        window.dispatchEvent(new CustomEvent('wls:preload:cleared'))
      } catch (e) {
        console.warn('⚠️ Konnte preload cleared event nicht dispatchen:', e)
      }
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
