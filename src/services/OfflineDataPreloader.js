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

    // Reaktiver Cache für Preload-Stats
    this.cachedStats = ref({
      preloaded: false,
      message: 'Keine Daten vorgeladen',
      buildingsCount: 0,
      apartmentsCount: 0,
      lastPreload: null,
      hoursSinceLastPreload: null,
      needsRefresh: false,
      buildings: []
    })

    // Ready-Status für Initialisierung
    this.isReady = ref(false)

    // Initialisiere mit gespeicherten Metadaten
    this.initFromStorage()
  }

  /**
   * Initialisiert den Preloader mit gespeicherten Metadaten
   */
  async initFromStorage() {
    try {
      console.log('🔄 initFromStorage: Starte Initialisierung...')
      const metadata = await this.getPreloadMetadata()
      console.log('🔄 initFromStorage: Metadaten geladen:', metadata)

      if (metadata && metadata.timestamp) {
        this.lastPreloadTime.value = metadata.timestamp
        console.log('🔄 Preload-Metadaten beim Start geladen:', metadata.timestamp)

        // Aktualisiere den Stats-Cache sofort
        await this.refreshStatsCache()
        console.log('✅ initFromStorage: Stats-Cache initialisiert')
      } else {
        console.log('⚠️ initFromStorage: Keine Metadaten gefunden')
      }
    } catch (error) {
      console.warn('⚠️ Fehler beim Initialisieren der Preload-Metadaten:', error)
    } finally {
      // Setze ready-Status immer auf true, auch wenn keine Daten gefunden wurden
      this.isReady.value = true
      console.log('✅ OfflineDataPreloader ist bereit')
    }
  }

  /**
   * Aktualisiert den reaktiven Stats-Cache
   */
  async refreshStatsCache() {
    try {
      const metadata = await this.getPreloadMetadata()
      console.log('🔄 refreshStatsCache - Metadaten geladen:', metadata)

      if (!metadata) {
        console.log('⚠️ refreshStatsCache - Keine Metadaten gefunden, setze preloaded=false')
        this.cachedStats.value = {
          preloaded: false,
          message: 'Keine Daten vorgeladen',
          buildingsCount: 0,
          apartmentsCount: 0,
          lastPreload: null,
          hoursSinceLastPreload: null,
          needsRefresh: false,
          buildings: []
        }
        return
      }

      const lastPreload = new Date(metadata.timestamp)
      const now = new Date()
      const hoursSinceLastPreload = Math.floor((now - lastPreload) / (1000 * 60 * 60))

      this.cachedStats.value = {
        preloaded: true,
        buildingsCount: metadata.buildingsCount || 0,
        apartmentsCount: metadata.apartmentsCount || 0,
        lastPreload: metadata.timestamp,
        hoursSinceLastPreload,
        needsRefresh: await this.shouldRefreshData(),
        buildings: metadata.buildingDetails || []
      }
      console.log('✅ refreshStatsCache - cachedStats aktualisiert:', this.cachedStats.value)
    } catch (error) {
      console.warn('⚠️ Fehler beim Aktualisieren des Stats-Cache:', error)
    }
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
    this.preloadError.value = null

    // Reset Progress
    this.preloadProgress.value = {
      buildings: 0,
      apartments: 0,
      totalBuildings: 0,
      totalApartments: 0,
      currentBuilding: null,
      config: false,
      status: 'loading'
    }

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
      this.preloadProgress.value.buildings = 0 // Start bei 0, wird während Apartment-Laden erhöht

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
        this.preloadProgress.value.buildings++ // Erhöhe nach jedem erfolgreich geladenen Gebäude

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
      await this.savePreloadMetadata({
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

      // Aktualisiere Stats-Cache sofort nach erfolgreichem Preloading
      await this.refreshStatsCache()
      console.log('✅ Stats-Cache nach Preloading aktualisiert')

      // Feuere ein CustomEvent damit alle Komponenten aktualisiert werden
      try {
        window.dispatchEvent(new CustomEvent('wls:preload:complete', {
          detail: {
            buildingsCount: buildings.length,
            apartmentsCount: totalApartmentsLoaded
          }
        }))
      } catch (e) {
        console.warn('⚠️ Fehler beim Feuern des wls:preload:complete Events:', e)
      }

      // Warte 2 Sekunden, damit Benutzer die Erfolgs-Nachricht sehen kann
      await new Promise(resolve => setTimeout(resolve, 2000))

      return true

    } catch (error) {
      console.error('❌ Fehler beim Preloading:', error)
      this.preloadError.value = error.message
      this.preloadProgress.value.status = 'error'

      // Bei Fehler 3 Sekunden warten, damit Benutzer die Fehlermeldung sehen kann
      await new Promise(resolve => setTimeout(resolve, 3000))

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
  async savePreloadMetadata(metadata) {
    try {
      console.log('💾 savePreloadMetadata aufgerufen mit:', metadata)

      // Speichere in IndexedDB (primary storage)
      await indexedDBHelper.set(STORES.METADATA, {
        key: PRELOAD_METADATA_KEY,
        value: metadata
      })
      console.log('✅ Metadaten in IndexedDB gespeichert')


      // Aktualisiere reaktiven Zeitstempel damit UIs neu gerendert werden
      if (metadata && metadata.timestamp && this.lastPreloadTime) {
        this.lastPreloadTime.value = metadata.timestamp
        console.log('✅ lastPreloadTime aktualisiert:', metadata.timestamp)
      }

      // Aktualisiere den Stats-Cache BEVOR das Event gesendet wird
      console.log('🔄 Rufe refreshStatsCache auf...')
      await this.refreshStatsCache()
      console.log('✅ refreshStatsCache abgeschlossen, cachedStats:', this.cachedStats.value)

      console.log('💾 Preload-Metadaten gespeichert')

      try {
        // Emit event so UI components can react immediately
        console.log('📢 Dispatche wls:preload:complete Event mit Detail:', metadata)
        const event = new CustomEvent('wls:preload:complete', {
          detail: {
            ...metadata,
            cachedStats: this.cachedStats.value
          }
        })
        window.dispatchEvent(event)
        console.log('✅ Event wls:preload:complete dispatched')
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
      console.log('🔍 getPreloadMetadata - Suche in IndexedDB...')
      const result = await indexedDBHelper.get(STORES.METADATA, PRELOAD_METADATA_KEY)
      console.log('🔍 IndexedDB Ergebnis:', result)

      if (result && result.value) {
        console.log('✅ Metadaten aus IndexedDB geladen:', result.value)
        return result.value
      }

      console.log('❌ Keine Preload-Metadaten in IndexedDB gefunden')
      return null
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
   * Gibt Statistiken über vorgeladene Daten zurück (synchron aus Cache)
   */
  getPreloadStats() {
    // Lies aus dem reaktiven Cache
    console.log('📊 getPreloadStats aufgerufen')
    console.log('📊 isReady:', this.isReady.value)
    console.log('📊 cachedStats.value:', JSON.stringify(this.cachedStats.value, null, 2))
    return this.cachedStats.value
  }

  /**
   * Lädt die aktuellen Stats aus IndexedDB und aktualisiert den Cache (async)
   */
  async getPreloadStatsAsync() {
    await this.refreshStatsCache()
    return this.cachedStats.value
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
