<template>
  <div class="buildings-overview">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>{{ $t('buildings.title') }}</h2>
            <small v-if="cacheStatusText" class="text-muted">
              <CIcon icon="cil-clock" class="me-1" size="sm" />
              {{ cacheStatusText }}
            </small>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <CBadge v-if="isPreloading" color="info" class="me-2">
              <CIcon icon="cil-sync" class="me-1" size="sm" />
              {{ $t('buildings.updating') }}
            </CBadge>
            <CButton color="primary" @click="refreshBuildings" :disabled="loading || !onlineStatus.isFullyOnline">
              <CIcon icon="cil-reload" class="me-2" />
              {{ $t('common.refresh') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Loading State -->
    <div v-if="loading && buildings.length === 0" class="text-center">
      <CSpinner color="primary" />
      <p class="mt-2">{{ $t('buildings.loading') }}</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Buildings Grid -->
    <CRow v-if="!loading && !error || buildings.length > 0">
      <CCol
        v-for="building in buildings"
        :key="building.id"
        xs="12"
        sm="6"
        md="4"
        lg="4"
        class="mb-4"
      >
        <CCard
          class="h-100 building-card"
          :class="{ 'opacity-50': building.hidden }"
          @click="viewApartments(building)"
          style="cursor: pointer; transition: all 0.2s ease-in-out;"
          @mouseover="$event.currentTarget.style.transform = 'translateY(-2px)'"
          @mouseleave="$event.currentTarget.style.transform = 'translateY(0)'"
        >
          <CCardHeader class="d-flex justify-content-between align-items-center">
            <h5 class="mb-0">{{ building.name }}</h5>
            <CBadge
              :color="building.hidden ? 'secondary' : 'success'"
              shape="rounded-pill"
            >
              {{ building.hidden ? $t('buildings.hidden') : $t('buildings.active') }}
            </CBadge>
          </CCardHeader>

          <CCardBody>
            <div class="building-info">
              <div class="info-item mb-2">
                <CIcon icon="cil-building" class="me-2 text-muted" />
                <span class="text-muted">{{ $t('buildings.buildingId') }}:</span>
                <strong class="ms-1">#{{ building.id }}</strong>
              </div>

              <div class="info-item mb-2">
                <CIcon icon="cil-list" class="me-2 text-muted" />
                <span class="text-muted">{{ $t('buildings.sorting') }}:</span>
                <strong class="ms-1">{{ building.sorted }}</strong>
              </div>

              <div class="info-item mb-2">
                <CIcon icon="cil-home" class="me-2 text-muted" />
                <span class="text-muted">{{ $t('buildings.apartments') }}:</span>
                <strong class="ms-1">{{ building.apartments_count || 0 }}</strong>
              </div>

              <div class="info-item mb-2">
                <CIcon icon="cil-calendar" class="me-2 text-muted" />
                <span class="text-muted">{{ $t('buildings.created') }}:</span>
                <small class="ms-1">{{ formatDate(building.created) }}</small>
              </div>

              <div class="info-item mb-2">
                <CIcon icon="cil-pencil" class="me-2 text-muted" />
                <span class="text-muted">{{ $t('buildings.updated') }}:</span>
                <small class="ms-1">{{ formatDate(building.updated) }}</small>
              </div>
            </div>
          </CCardBody>

          <CCardFooter class="text-center">
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              class="w-100"
            >
              <CIcon icon="cil-home" class="me-2" />
              {{ $t('buildings.viewApartments') }}
            </CButton>
          </CCardFooter>
        </CCard>
      </CCol>
    </CRow>

    <!-- Empty State -->
    <div v-if="!loading && !error && buildings.length === 0" class="text-center py-5">
      <CIcon icon="cil-building" size="4xl" class="text-muted mb-3" />
      <h4 class="text-muted">{{ $t('buildings.noBuildings') }}</h4>
      <p class="text-muted">{{ $t('buildings.noBuildingsYet') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate } from '@/utils/dateFormatter.js'
import { useRouter } from 'vue-router'
import {
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CBadge
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { useApiBuilding } from '@/api/ApiBuilding'
import BuildingStorage from '@/stores/BuildingStorage'
import { useOnlineStatusStore } from '@/stores/OnlineStatus'

const router = useRouter()
const { t } = useI18n()
const { buildings, loading, error, list } = useApiBuilding()
const onlineStatus = useOnlineStatusStore()

// Lokale States für besseres UX
const isPreloading = ref(false)
const cacheAge = ref(null)

// Berechne das Alter des Caches
const calculateCacheAge = async () => {
  const stored = await BuildingStorage.getTimestamp()
  if (stored) {
    const ageInMinutes = Math.floor((Date.now() - stored) / 60000)
    cacheAge.value = ageInMinutes
  } else {
    cacheAge.value = null
  }
}

// Initialer Ladevorgang mit Cache
const loadBuildings = async (forceRefresh = false) => {
  // Offline-Modus: nur aus IndexedDB laden, kein API-Call
  if (!onlineStatus.isFullyOnline) {
    const cachedBuildings = await BuildingStorage.getBuildings()
    if (cachedBuildings && cachedBuildings.length > 0) {
      buildings.value = cachedBuildings
      await calculateCacheAge()
    }
    return
  }

  // Wenn nicht erzwungen, versuche Cache zu laden
  if (!forceRefresh) {
    const cachedBuildings = await BuildingStorage.getBuildings()
    if (cachedBuildings && cachedBuildings.length > 0) {
      buildings.value = cachedBuildings
      await calculateCacheAge()

      // Im Hintergrund aktualisieren (nur wenn online)
      isPreloading.value = true
      try {
        await list()
        if (buildings.value?.length > 0) {
          await BuildingStorage.saveBuildings(JSON.parse(JSON.stringify(buildings.value)))
        }
        await calculateCacheAge()
      } catch (err) {
        console.warn('Hintergrund-Aktualisierung fehlgeschlagen:', err)
      } finally {
        isPreloading.value = false
      }
      return
    }
  }

  // Ansonsten normales Laden (nur wenn online)
  await list()
  if (buildings.value && buildings.value.length > 0) {
    await BuildingStorage.saveBuildings(JSON.parse(JSON.stringify(buildings.value)))
    await calculateCacheAge()
  }
}

// Erzwungenes Neuladen
const refreshBuildings = async () => {
  await loadBuildings(true)
}

const viewApartments = (building) => {
  router.push({
    name: 'BuildingApartments',
    params: { id: building.id },
    query: { buildingName: building.name }
  })
}


// Cache-Status-Text
const cacheStatusText = computed(() => {
  if (cacheAge.value === null) return ''
  if (cacheAge.value < 1) return t('buildings.updatedJustNow')
  if (cacheAge.value === 1) return t('buildings.updatedOneMinuteAgo')
  if (cacheAge.value < 60) return t('buildings.updatedMinutesAgo', { minutes: cacheAge.value })
  const hours = Math.floor(cacheAge.value / 60)
  if (hours === 1) return t('buildings.updatedOneHourAgo')
  return t('buildings.updatedHoursAgo', { hours })
})

onMounted(() => {
  loadBuildings()
})
</script>

<style scoped src="@/styles/views/BuildingsOverview.css"></style>
