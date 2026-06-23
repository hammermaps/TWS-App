<template>
  <div class="meters-list">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>{{ $t('meter.list_title') }}</h2>
            <small v-if="pendingCount > 0" class="text-muted">
              <CBadge color="warning" class="me-1">{{ pendingCount }}</CBadge>
              {{ $t('meter.sync_pending', { count: pendingCount }) }}
            </small>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <CBadge v-if="!onlineStatus.isFullyOnline" color="secondary" class="d-flex align-items-center gap-1">
              <CIcon icon="cil-wifi-off" size="sm" class="me-1" />
              {{ $t('meter.offline_badge') }}
            </CBadge>
            <CBadge v-if="isPreloading" color="info" class="me-2">
              <CIcon icon="cil-sync" class="me-1" size="sm" />
              {{ $t('buildings.updating') }}
            </CBadge>
            <CButton color="primary" @click="refreshMeters" :disabled="loading || !onlineStatus.isFullyOnline">
              <CIcon icon="cil-reload" class="me-2" />
              {{ $t('common.refresh') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Building selector + Type filter -->
    <CCard class="mb-4">
      <CCardBody>
        <CRow class="g-3">
          <CCol xs="12" md="6">
            <CFormLabel>{{ $t('buildings.name') }}</CFormLabel>
            <CFormSelect v-model="selectedBuildingId" @change="onBuildingChange">
              <option value="">{{ $t('common.filter') }} - {{ $t('buildings.title') }}</option>
              <option v-for="b in buildings" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
            </CFormSelect>
          </CCol>
          <CCol xs="12" md="6">
            <CFormLabel>{{ $t('meter.type_all') }}</CFormLabel>
            <CFormSelect v-model="selectedType">
              <option value="">{{ $t('meter.type_all') }}</option>
              <option value="water">{{ $t('meter.type_water') }}</option>
              <option value="power">{{ $t('meter.type_power') }}</option>
              <option value="heating">{{ $t('meter.type_heating') }}</option>
            </CFormSelect>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>

    <!-- Loading State -->
    <div v-if="loading && filteredMeters.length === 0" class="text-center py-4">
      <CSpinner color="primary" />
      <p class="mt-2">{{ $t('meter.loading') }}</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Empty State -->
    <div v-if="!loading && !error && filteredMeters.length === 0" class="text-center py-5">
      <CIcon icon="cil-speedometer" size="4xl" class="text-muted mb-3" />
      <h4 class="text-muted">{{ $t('meter.no_meters') }}</h4>
    </div>

    <!-- Meters Grid -->
    <CRow v-if="filteredMeters.length > 0">
      <CCol
        v-for="meter in filteredMeters"
        :key="meter.id"
        xs="12"
        sm="6"
        md="4"
        lg="4"
        class="mb-4"
      >
        <CCard class="h-100 meter-card" style="transition: all 0.2s ease-in-out;"
          @mouseover="$event.currentTarget.style.transform = 'translateY(-2px)'"
          @mouseleave="$event.currentTarget.style.transform = 'translateY(0)'">
          <CCardHeader class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <span class="meter-type-icon">{{ getMeterTypeIcon(meter.meter_type) }}</span>
              <h5 class="mb-0">{{ meter.name }}</h5>
            </div>
            <div class="d-flex gap-1 align-items-center">
              <CBadge :color="getMeterTypeBadgeColor(meter.meter_type)" shape="rounded-pill">
                {{ getMeterTypeLabel(meter.meter_type) }}
              </CBadge>
              <CBadge v-if="getPendingCountForMeter(meter.id) > 0" color="warning" shape="rounded-pill">
                {{ getPendingCountForMeter(meter.id) }} {{ $t('meter.pending_badge') }}
              </CBadge>
            </div>
          </CCardHeader>

          <CCardBody>
            <div class="meter-info">
              <div class="info-item mb-2">
                <CIcon icon="cil-barcode" class="me-2 text-muted" />
                <span class="text-muted">{{ $t('meter.meter_number') }}:</span>
                <strong class="ms-1">{{ meter.meter_number }}</strong>
              </div>

              <div v-if="meter.location" class="info-item mb-2">
                <CIcon icon="cil-location-pin" class="me-2 text-muted" />
                <span class="text-muted">{{ $t('meter.location') }}:</span>
                <span class="ms-1">{{ meter.location }}</span>
              </div>

              <div class="info-item mb-2">
                <CIcon icon="cil-chart-line" class="me-2 text-muted" />
                <span class="text-muted">{{ $t('meter.current_reading') }}:</span>
                <strong class="ms-1" v-if="meter.reading_value !== null && meter.reading_value !== undefined">
                  {{ meter.reading_value }} {{ meter.unit }}
                </strong>
                <span v-else class="ms-1 text-muted">{{ $t('meter.no_reading') }}</span>
              </div>

              <div v-if="meter.reading_date" class="info-item mb-2">
                <CIcon icon="cil-calendar" class="me-2 text-muted" />
                <span class="text-muted">{{ $t('meter.last_reading') }}:</span>
                <small class="ms-1">{{ formatDate(meter.reading_date) }}</small>
              </div>
            </div>
          </CCardBody>

          <CCardFooter class="d-flex gap-2">
            <CButton
              color="primary"
              size="sm"
              class="flex-fill"
              @click="goToReading(meter)"
            >
              <CIcon icon="cil-pencil" class="me-1" />
              {{ $t('meter.capture') }}
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              class="flex-fill"
              @click="goToHistory(meter)"
            >
              <CIcon icon="cil-history" class="me-1" />
              {{ $t('meter.history') }}
            </CButton>
          </CCardFooter>
        </CCard>
      </CCol>
    </CRow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate } from '@/utils/dateFormatter.js'
import { useRouter, useRoute } from 'vue-router'
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
  CBadge,
  CFormLabel,
  CFormSelect
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { apiMeter } from '@/api/ApiMeter.js'
import MeterStorage from '@/stores/MeterStorage.js'
import { useOfflineMeterStorage } from '@/stores/OfflineMeterStorage.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import BuildingStorage from '@/stores/BuildingStorage.js'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const onlineStatus = useOnlineStatusStore()
const offlineMeterStorage = useOfflineMeterStorage()

const meters = ref([])
const buildings = ref([])
const loading = ref(false)
const error = ref(null)
const isPreloading = ref(false)
const selectedBuildingId = ref(route.params.buildingId ? String(route.params.buildingId) : '')
const selectedType = ref('')
const pendingCount = ref(0)
const pendingByMeter = ref({})

const filteredMeters = computed(() => {
  let result = meters.value
  if (selectedType.value) {
    result = result.filter(m => m.meter_type === selectedType.value)
  }
  return result
})

const getMeterTypeIcon = (type) => {
  switch (type) {
    case 'water': return '💧'
    case 'power': return '⚡'
    case 'heating': return '🔥'
    default: return '📊'
  }
}

const getMeterTypeBadgeColor = (type) => {
  switch (type) {
    case 'water': return 'info'
    case 'power': return 'warning'
    case 'heating': return 'danger'
    default: return 'secondary'
  }
}

const getMeterTypeLabel = (type) => {
  switch (type) {
    case 'water': return t('meter.type_water')
    case 'power': return t('meter.type_power')
    case 'heating': return t('meter.type_heating')
    default: return type
  }
}

const getPendingCountForMeter = (meterId) => {
  return pendingByMeter.value[meterId] || 0
}

const loadPendingCounts = async () => {
  try {
    const stats = await offlineMeterStorage.getStats()
    pendingCount.value = stats.total || 0

    const byMeter = {}
    const queue = await offlineMeterStorage.getQueue()
    for (const item of queue) {
      if (!item.synced) {
        byMeter[item.meterId] = (byMeter[item.meterId] || 0) + 1
      }
    }
    pendingByMeter.value = byMeter
  } catch (err) {
    console.warn('Fehler beim Laden der Offline-Zähler:', err)
  }
}

const loadMeters = async (forceRefresh = false) => {
  if (!onlineStatus.isFullyOnline) {
    const cached = await MeterStorage.getMeters(selectedBuildingId.value || undefined)
    if (cached && cached.length > 0) {
      meters.value = cached
    }
    return
  }

  if (!forceRefresh) {
    const cached = await MeterStorage.getMeters(selectedBuildingId.value || undefined)
    if (cached && cached.length > 0) {
      meters.value = cached
      isPreloading.value = true
      try {
        const result = await apiMeter.list(selectedBuildingId.value || undefined)
        if (result && result.length > 0) {
          meters.value = result
          await MeterStorage.setMeters(JSON.parse(JSON.stringify(result)))
        }
      } catch (err) {
        console.warn('Hintergrund-Aktualisierung fehlgeschlagen:', err)
      } finally {
        isPreloading.value = false
      }
      return
    }
  }

  loading.value = true
  error.value = null
  try {
    const result = await apiMeter.list(selectedBuildingId.value || undefined)
    meters.value = result || []
    if (meters.value.length > 0) {
      await MeterStorage.setMeters(JSON.parse(JSON.stringify(meters.value)))
    }
  } catch (err) {
    error.value = err.message || t('common.error')
  } finally {
    loading.value = false
  }
}

const loadBuildings = async () => {
  try {
    const cached = await BuildingStorage.getBuildings()
    if (cached && cached.length > 0) {
      buildings.value = cached
    }
  } catch (err) {
    console.warn('Fehler beim Laden der Gebäude:', err)
  }
}

const refreshMeters = async () => {
  await loadMeters(true)
}

const onBuildingChange = async () => {
  if (selectedBuildingId.value) {
    router.replace({ name: 'MetersListBuilding', params: { buildingId: selectedBuildingId.value } })
  } else {
    router.replace({ name: 'MetersList' })
  }
  await loadMeters(true)
}

const goToReading = (meter) => {
  router.push({ name: 'MeterReadingForm', params: { meterId: meter.id } })
}

const goToHistory = (meter) => {
  router.push({ name: 'MeterHistory', params: { meterId: meter.id } })
}

onMounted(async () => {
  await loadBuildings()
  await loadMeters()
  await loadPendingCounts()
})
</script>

<style scoped src="@/styles/views/Meters.css"></style>
