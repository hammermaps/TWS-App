<template>
  <CCard v-if="shouldShowCard" class="mb-4">
    <CCardHeader>
      <strong>{{ $t('offlinePreload.title') }}</strong>
      <CBadge
        :color="statusBadgeColor"
        class="ms-2"
      >
        {{ statusBadgeText }}
      </CBadge>
    </CCardHeader>
    <CCardBody>
      <!-- Preloading läuft -->
      <div v-if="isPreloading">
        <div class="mb-3">
          <CIcon icon="cil-cloud-download" size="lg" class="text-primary me-2" />
          <strong>{{ $t('offlinePreload.loadingTitle') }}</strong>
        </div>

        <CProgress
          :value="preloadProgressPercent"
          color="primary"
          class="mb-2"
          :height="20"
        >
          <span class="text-white fw-bold">{{ preloadProgressPercent }}%</span>
        </CProgress>

        <div class="text-muted small">
          <div v-if="progress.currentBuilding">
            {{ $t('offlinePreload.currentBuilding') }}: <strong>{{ progress.currentBuilding }}</strong>
          </div>
          <div>
            {{ $t('offlinePreload.buildings') }}: {{ progress.buildings }} / {{ progress.totalBuildings }}
          </div>
          <div>
            {{ $t('offlinePreload.apartments') }}: {{ progress.apartments }}
          </div>
        </div>
      </div>

      <!-- Daten sind geladen -->
      <div v-else-if="preloadStats.preloaded">
        <div class="d-flex align-items-center mb-3">
          <CIcon icon="cil-check-circle" size="lg" class="text-success me-2" />
          <div>
            <strong>{{ $t('offlinePreload.preloadedTitle') }}</strong>
            <div class="text-muted small">
              {{ $t('offlinePreload.lastUpdated') }}: {{ formatLastUpdate(preloadStats.lastPreload) }}
            </div>
          </div>
        </div>

        <div class="row text-center mb-3">
          <div class="col-6">
            <CCard class="p-2 text-center">
              <div class="d-flex align-items-center justify-content-center">
                <CIcon icon="cil-building" class="me-2 text-primary" />
                <div>
                  <div class="fs-4 fw-bold text-primary">{{ preloadStats.buildingsCount ?? preloadStats.buildings?.length ?? 0 }}</div>
                  <div class="small text-muted">{{ $t('offlinePreload.buildings') }}</div>
                </div>
              </div>
            </CCard>
          </div>
          <div class="col-6">
            <CCard class="p-2 text-center">
              <div class="d-flex align-items-center justify-content-center">
                <CIcon icon="cil-home" class="me-2 text-success" />
                <div>
                  <div class="fs-4 fw-bold text-success">{{ preloadStats.apartmentsCount || 0 }}</div>
                  <div class="small text-muted">{{ $t('offlinePreload.apartments') }}</div>
                </div>
              </div>
            </CCard>
          </div>
        </div>

        <!-- Warnung wenn Daten veraltet sind -->
        <CAlert
          v-if="preloadStats.needsRefresh"
          color="warning"
          class="mb-3 d-flex align-items-center"
        >
          <CIcon icon="cil-warning" class="me-2" />
          <small>
            {{ $t('offlinePreload.needsRefresh') }}
          </small>
        </CAlert>

        <!-- Gebäude-Details (optional ausklappbar) -->
        <CCollapse :visible="showDetails">
          <div class="border-top pt-3 mt-3">
            <h6 class="mb-3">
              <CIcon icon="cil-building" class="me-2" />
              {{ $t('offlinePreload.loadedBuildings') }}
            </h6>

            <!-- Gebäude-Liste als Cards -->
            <div class="building-list">
              <div
                v-for="building in preloadStats.buildings"
                :key="building.id"
                class="building-card"
              >
                <div class="building-icon">
                  <CIcon icon="cil-building" size="lg" />
                </div>
                <div class="building-info">
                  <div class="building-name">{{ building.name }}</div>
                  <div class="building-apartments">
                    <CIcon icon="cil-home" size="sm" class="me-1" />
                    {{ building.apartmentsCount === 1 ? $t('offlineDataBadge.apartmentCount', { count: building.apartmentsCount }) :
                        $t('offlineDataBadge.apartmentsCount', { count: building.apartmentsCount }) }}
                  </div>
                </div>
                <div class="building-badge">
                  <CBadge color="primary" class="px-3 py-2">
                    {{ building.apartmentsCount }}
                  </CBadge>
                </div>
              </div>
            </div>
          </div>
        </CCollapse>

        <div class="d-flex gap-2 mt-4">
          <CButton
            color="primary"
            size="sm"
            @click="handleRefreshData"
            :disabled="!onlineStatusStore.isFullyOnline || isPreloading"
          >
            <CIcon icon="cil-reload" class="me-1" />
            {{ $t('dashboard.updateOfflineData') }}
          </CButton>

          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            @click="showDetails = !showDetails"
          >
            <CIcon :icon="showDetails ? 'cil-chevron-top' : 'cil-chevron-bottom'" class="me-1" />
            {{ showDetails ? $t('offlinePreload.less') : $t('offlinePreload.details') }}
          </CButton>
        </div>
      </div>

      <!-- Keine Daten geladen -->
      <div v-else>
        <div class="d-flex align-items-center mb-3">
          <CIcon icon="cil-cloud-download" size="lg" class="text-warning me-2" />
          <div>
            <strong>{{ $t('offlinePreload.noDataTitle') }}</strong>
            <div class="text-muted small">
              {{ $t('offlinePreload.noDataDesc') }}
            </div>
          </div>
        </div>

        <CButton
          color="primary"
          @click="handleLoadData"
          :disabled="!onlineStatusStore.isFullyOnline || isPreloading"
        >
          <CIcon icon="cil-cloud-download" class="me-2" />
          {{ $t('offlinePreload.loadButton') }}
        </CButton>

        <CAlert
          v-if="!onlineStatusStore.isFullyOnline"
          color="info"
          class="mt-3 mb-0 d-flex align-items-center"
        >
          <CIcon icon="cil-info" class="me-2" />
          <small>{{ $t('offlinePreload.onlineRequired') }}</small>
        </CAlert>
      </div>

      <!-- Fehler beim Preloading -->
      <CAlert
        v-if="preloadError"
        color="danger"
        class="mt-3 mb-0"
      >
        <CIcon icon="cil-warning" class="me-2" />
        <strong>{{ $t('common.error') }}:</strong> {{ preloadError }}
      </CAlert>
    </CCardBody>
  </CCard>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CProgress,
  CAlert,
  CBadge,
  CCollapse
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'

// Props
const props = defineProps({
  // Zeige Karte immer oder nur wenn online
  alwaysShow: {
    type: Boolean,
    default: false
  }
})

const { t } = useI18n()

// Stores
const onlineStatusStore = useOnlineStatusStore()

// State
const showDetails = ref(false)
// Local trigger to force recompute/update of computed values when preloader changes
const localRefreshKey = ref(0)

// Listen to global preload events
function onPreloadComplete(e) {
  console.log('🔔 Event wls:preload:complete empfangen in PreloadCard', e.detail)
  console.log('🔄 Erhöhe localRefreshKey von', localRefreshKey.value, 'auf', localRefreshKey.value + 1)
  localRefreshKey.value++
  console.log('✅ localRefreshKey erhöht, neue computed values werden ausgewertet')

  // Zusätzlich: Trigger manuelles Update des Stats-Cache
  if (onlineStatusStore.dataPreloader && onlineStatusStore.dataPreloader.refreshStatsCache) {
    console.log('🔄 Rufe refreshStatsCache manuell auf...')
    onlineStatusStore.dataPreloader.refreshStatsCache().then(() => {
      console.log('✅ Stats-Cache manuell aktualisiert')
      localRefreshKey.value++ // Nochmal erhöhen um sicherzustellen, dass UI neu rendert
    }).catch(err => {
      console.warn('⚠️ Fehler beim manuellen Update des Stats-Cache:', err)
    })
  }
}
function onPreloadCleared() {
  console.log('🔔 Event wls:preload:cleared empfangen in PreloadCard')
  localRefreshKey.value++
}
window.addEventListener('wls:preload:complete', onPreloadComplete)
window.addEventListener('wls:preload:cleared', onPreloadCleared)

// Initiales Laden und Poll-Interval als Fallback
let pollInterval = null
onMounted(async () => {
  // Initial Stats-Cache laden wenn Preloader bereit
  if (onlineStatusStore.dataPreloader?.refreshStatsCache) {
    try {
      await onlineStatusStore.dataPreloader.refreshStatsCache()
      localRefreshKey.value++
    } catch (e) {
      console.warn('⚠️ Initiales refreshStatsCache fehlgeschlagen:', e)
    }
  }
  // Poll alle 3 Sekunden bis Daten da sind (Fallback)
  pollInterval = setInterval(() => {
    if (onlineStatusStore.dataPreloader?.isReady?.value) {
      localRefreshKey.value++
      // Stoppe Poll wenn Daten vorhanden
      if (onlineStatusStore.dataPreloader?.cachedStats?.value?.preloaded) {
        clearInterval(pollInterval)
        pollInterval = null
      }
    }
  }, 3000)
  // Nach 30 Sekunden auf jeden Fall stoppen
  setTimeout(() => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }, 30000)
})

// cleanup on unmount
onBeforeUnmount(() => {
  window.removeEventListener('wls:preload:complete', onPreloadComplete)
  window.removeEventListener('wls:preload:cleared', onPreloadCleared)
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
})

// Computed
const progress = computed(() => {
  // reference localRefreshKey to ensure recompute when events fire
  localRefreshKey.value
  if (!onlineStatusStore.dataPreloader) return { buildings: 0, apartments: 0, totalBuildings: 0, totalApartments: 0, currentBuilding: null, status: 'idle' }
  return onlineStatusStore.dataPreloader.preloadProgress?.value ?? { buildings: 0, apartments: 0, totalBuildings: 0, totalApartments: 0, currentBuilding: null, status: 'idle' }
})

const preloadStats = computed(() => {
  // Verwende localRefreshKey als Abhängigkeit
  localRefreshKey.value

  if (!onlineStatusStore.dataPreloader) {
    return { preloaded: false, message: 'Initialisierung...' }
  }

  try {
    // Direkt auf cachedStats.value zugreifen (reaktiv!) statt über nicht-reaktive Methode
    const stats = onlineStatusStore.dataPreloader.cachedStats?.value ?? onlineStatusStore.dataPreloader.getPreloadStats?.() ?? { preloaded: false, message: 'Initialisierung...' }
    console.log('📊 preloadStats Ergebnis:', stats)
    return stats
  } catch (e) {
    console.warn('⚠️ Fehler beim Lesen der Preload-Statistiken in PreloadCard:', e)
    return { preloaded: false, message: 'Initialisierung...' }
  }
})

const shouldShowCard = computed(() => {
  // Immer zeigen wenn alwaysShow true ist
  if (props.alwaysShow) return true

  // Zeigen wenn online oder wenn Daten geladen sind
  return onlineStatusStore.isFullyOnline || preloadStats.value.preloaded
})

const preloadProgressPercent = computed(() => {
  const prog = progress.value
  if (!prog.totalBuildings) return 0

  // Fortschritt basierend auf geladenen Gebäuden
  return Math.round((prog.buildings / prog.totalBuildings) * 100)
})

const statusBadgeColor = computed(() => {
  if (isPreloading.value) return 'primary'
  if (preloadStats.value.preloaded) {
    return preloadStats.value.needsRefresh ? 'warning' : 'success'
  }
  return 'secondary'
})

const statusBadgeText = computed(() => {
  if (isPreloading.value) return t('offlinePreload.status.loading')
  if (preloadStats.value.preloaded) {
    return preloadStats.value.needsRefresh ? t('offlinePreload.status.needsRefresh') : t('offlinePreload.status.current')
  }
  return t('offlinePreload.status.notLoaded')
})

const preloadError = computed(() => {
  if (!onlineStatusStore.dataPreloader) return null
  return onlineStatusStore.dataPreloader.preloadError?.value ?? null
})

const isPreloading = computed(() => {
  if (!onlineStatusStore.dataPreloader) return false
  return onlineStatusStore.dataPreloader.isPreloading?.value ?? false
})

// Hilfsfunktion zum Einrichten der Preloader-Watchers
const preloaderWatchersSetup = ref(false)
const setupPreloaderWatchers = (preloader) => {
  if (!preloader || preloaderWatchersSetup.value) return
  preloaderWatchersSetup.value = true

  watch(() => preloader.lastPreloadTime?.value, () => { localRefreshKey.value++ })
  watch(() => preloader.preloadProgress?.value?.status, () => {
    setTimeout(() => { localRefreshKey.value++ }, 200)
  })
  watch(() => preloader.isPreloading?.value, async (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      setTimeout(async () => {
        if (preloader.refreshStatsCache) {
          await preloader.refreshStatsCache()
          localRefreshKey.value++
        }
      }, 500)
    } else {
      localRefreshKey.value++
    }
  })
  watch(() => preloader.cachedStats?.value, () => { localRefreshKey.value++ }, { deep: true })
  watch(() => preloader.isReady?.value, (newVal) => { if (newVal) localRefreshKey.value++ })
}

// Einmalig wenn bereits verfügbar
if (onlineStatusStore.dataPreloader) {
  setupPreloaderWatchers(onlineStatusStore.dataPreloader)
}

// Auch wenn dataPreloader später gesetzt wird (asynchrone Initialisierung)
watch(() => onlineStatusStore.dataPreloader, (newPreloader) => {
  if (newPreloader) {
    setupPreloaderWatchers(newPreloader)
    if (newPreloader.refreshStatsCache) {
      newPreloader.refreshStatsCache().then(() => { localRefreshKey.value++ }).catch(() => {})
    }
    localRefreshKey.value++
  }
})

function formatLastUpdate(timestamp) {
  if (!timestamp) return t('offlinePreload.time.never')

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffHours < 1) {
    return t('offlinePreload.time.minutes', { minutes: diffMins })
  } else if (diffHours < 24) {
    return t('offlinePreload.time.hours', { hours: diffHours })
  } else {
    const diffDays = Math.floor(diffHours / 24)
    return t('offlinePreload.time.days', { days: diffDays })
  }
}

async function handleLoadData() {
  const success = await onlineStatusStore.forcePreload()
  if (success) {
    // trigger immediate local refresh
    localRefreshKey.value++
  }
}

async function handleRefreshData() {
  const success = await onlineStatusStore.forcePreload()
  if (success) {
    // trigger immediate local refresh
    localRefreshKey.value++
  }
}
</script>

<style scoped src="@/styles/components/OfflineDataPreloadCard.css"></style>
