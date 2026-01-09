<template>
  <CCard v-if="shouldShowCard" class="mb-4">
    <CCardHeader>
      <strong>Offline-Daten</strong>
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
          <strong>Lade Daten für Offline-Modus...</strong>
        </div>

        <CProgress
          :value="preloadProgressPercent"
          color="primary"
          class="mb-2"
          height="20px"
        >
          <span class="text-white fw-bold">{{ preloadProgressPercent }}%</span>
        </CProgress>

        <div class="text-muted small">
          <div v-if="progress.currentBuilding">
            Aktuelles Gebäude: <strong>{{ progress.currentBuilding }}</strong>
          </div>
          <div>
            Gebäude: {{ progress.buildings }} / {{ progress.totalBuildings }}
          </div>
          <div>
            Apartments: {{ progress.apartments }}
          </div>
        </div>
      </div>

      <!-- Daten sind geladen -->
      <div v-else-if="preloadStats.preloaded">
        <div class="d-flex align-items-center mb-3">
          <CIcon icon="cil-check-circle" size="lg" class="text-success me-2" />
          <div>
            <strong>Offline-Daten verfügbar</strong>
            <div class="text-muted small">
              Zuletzt aktualisiert: {{ formatLastUpdate(preloadStats.lastPreload) }}
            </div>
          </div>
        </div>

        <div class="row text-center mb-3">
          <div class="col-6">
            <div class="fs-4 fw-bold text-primary">{{ preloadStats.buildingsCount }}</div>
            <div class="text-muted small">Gebäude</div>
          </div>
          <div class="col-6">
            <div class="fs-4 fw-bold text-primary">{{ preloadStats.apartmentsCount }}</div>
            <div class="text-muted small">Apartments</div>
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
            Daten sind älter als 24 Stunden.
            Aktualisierung empfohlen.
          </small>
        </CAlert>

        <!-- Gebäude-Details (optional ausklappbar) -->
        <CCollapse :visible="showDetails">
          <div class="border-top pt-3 mt-3">
            <h6 class="mb-3">
              <CIcon icon="cil-building" class="me-2" />
              Geladene Gebäude
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
                    {{ building.apartmentsCount }} {{ building.apartmentsCount === 1 ? 'Apartment' : 'Apartments' }}
                  </div>
                </div>
                <div class="building-badge">
                  <CBadge color="primary" class="px-3 py-2">
                    {{ building.apartmentsCount }}
                  </CBadge>
                </div>
              </div>
            </div>

            <!-- Statistik-Zusammenfassung -->
            <div class="stats-summary mt-3 p-3 bg-light rounded">
              <div class="row text-center">
                <div class="col-4">
                  <div class="stat-value text-primary">{{ preloadStats.buildings?.length || 0 }}</div>
                  <div class="stat-label">Gebäude</div>
                </div>
                <div class="col-4">
                  <div class="stat-value text-success">{{ preloadStats.apartmentsCount }}</div>
                  <div class="stat-label">Apartments</div>
                </div>
                <div class="col-4">
                  <div class="stat-value text-info">
                    {{ Math.round(preloadStats.apartmentsCount / (preloadStats.buildings?.length || 1)) }}
                  </div>
                  <div class="stat-label">Ø pro Gebäude</div>
                </div>
              </div>
            </div>
          </div>
        </CCollapse>

        <div class="d-flex gap-2">
          <CButton
            color="primary"
            size="sm"
            @click="handleRefreshData"
            :disabled="!onlineStatusStore.isFullyOnline || isPreloading"
          >
            <CIcon icon="cil-reload" class="me-1" />
            Daten aktualisieren
          </CButton>

          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            @click="showDetails = !showDetails"
          >
            <CIcon :icon="showDetails ? 'cil-chevron-top' : 'cil-chevron-bottom'" class="me-1" />
            {{ showDetails ? 'Weniger' : 'Details' }}
          </CButton>
        </div>
      </div>

      <!-- Keine Daten geladen -->
      <div v-else>
        <div class="d-flex align-items-center mb-3">
          <CIcon icon="cil-cloud-download" size="lg" class="text-warning me-2" />
          <div>
            <strong>Keine Offline-Daten verfügbar</strong>
            <div class="text-muted small">
              Laden Sie Daten herunter, um die App offline nutzen zu können.
            </div>
          </div>
        </div>

        <CButton
          color="primary"
          @click="handleLoadData"
          :disabled="!onlineStatusStore.isFullyOnline || isPreloading"
        >
          <CIcon icon="cil-cloud-download" class="me-2" />
          Offline-Daten laden
        </CButton>

        <CAlert
          v-if="!onlineStatusStore.isFullyOnline"
          color="info"
          class="mt-3 mb-0 d-flex align-items-center"
        >
          <CIcon icon="cil-info" class="me-2" />
          <small>Zum Laden der Daten ist eine Online-Verbindung erforderlich.</small>
        </CAlert>
      </div>

      <!-- Fehler beim Preloading -->
      <CAlert
        v-if="preloadError"
        color="danger"
        class="mt-3 mb-0"
      >
        <CIcon icon="cil-warning" class="me-2" />
        <strong>Fehler:</strong> {{ preloadError }}
      </CAlert>
    </CCardBody>
  </CCard>
</template>

<script setup>
import { ref, computed } from 'vue'
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

// Stores
const onlineStatusStore = useOnlineStatusStore()

// State
const showDetails = ref(false)

// Computed
const progress = computed(() => {
  if (!onlineStatusStore.dataPreloader) return { buildings: 0, apartments: 0, totalBuildings: 0, totalApartments: 0, currentBuilding: null, status: 'idle' }
  return onlineStatusStore.dataPreloader.preloadProgress?.value ?? { buildings: 0, apartments: 0, totalBuildings: 0, totalApartments: 0, currentBuilding: null, status: 'idle' }
})

const preloadStats = computed(() => {
  if (!onlineStatusStore.dataPreloader) return { preloaded: false, message: 'Initialisierung...' }
  return onlineStatusStore.dataPreloader?.getPreloadStats() ?? { preloaded: false, message: 'Initialisierung...' }
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
  if (isPreloading.value) return 'Wird geladen...'
  if (preloadStats.value.preloaded) {
    return preloadStats.value.needsRefresh ? 'Aktualisierung empfohlen' : 'Aktuell'
  }
  return 'Nicht geladen'
})

const preloadError = computed(() => {
  if (!onlineStatusStore.dataPreloader) return null
  return onlineStatusStore.dataPreloader.preloadError?.value ?? null
})

const isPreloading = computed(() => {
  if (!onlineStatusStore.dataPreloader) return false
  return onlineStatusStore.dataPreloader.isPreloading?.value ?? false
})

// Methods
function formatLastUpdate(timestamp) {
  if (!timestamp) return 'Nie'

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffHours < 1) {
    return `vor ${diffMins} Minuten`
  } else if (diffHours < 24) {
    return `vor ${diffHours} Stunden`
  } else {
    const diffDays = Math.floor(diffHours / 24)
    return `vor ${diffDays} Tagen`
  }
}

async function handleLoadData() {
  await onlineStatusStore.forcePreload()
}

async function handleRefreshData() {
  await onlineStatusStore.forcePreload()
}
</script>

<style scoped src="@/styles/components/OfflineDataPreloadCard.css"></style>

