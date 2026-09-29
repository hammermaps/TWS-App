<template>
  <div class="mm-list">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2>{{ $t('mm.list_title') }}</h2>
            <small v-if="pendingCount > 0" class="text-muted">
              <CBadge color="warning" class="me-1">{{ pendingCount }}</CBadge>
              {{ $t('mm.sync_pending', { count: pendingCount }) }}
            </small>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <CBadge v-if="!onlineStatus.isFullyOnline" color="secondary" class="d-flex align-items-center gap-1">
              <CIcon icon="cil-wifi-off" size="sm" class="me-1" />
              {{ $t('mm.offline_badge') }}
            </CBadge>
            <CButton
              v-if="pendingCount > 0 && onlineStatus.isFullyOnline"
              color="info"
              variant="outline"
              size="sm"
              @click="syncPendingReports"
              :disabled="isSyncing"
            >
              <CIcon icon="cil-reload" class="me-2" />
              {{ $t('meter.sync_now') }}
            </CButton>
            <CButton color="primary" @click="refreshReports" :disabled="loading || !onlineStatus.isFullyOnline">
              <CIcon icon="cil-reload" class="me-2" />
              {{ $t('common.refresh') }}
            </CButton>
            <CButton
              v-if="canCreate"
              color="success"
              @click="router.push({ name: 'MmReportForm' })"
            >
              <CIcon icon="cil-plus" class="me-2" />
              {{ $t('mm.new') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Status filter -->
    <CCard class="mb-4">
      <CCardBody>
        <CFormLabel>{{ $t('mm.status') }}</CFormLabel>
        <CFormSelect v-model="selectedStatus">
          <option value="">{{ $t('mm.status_filter_all') }}</option>
          <option v-for="s in statusOptions" :key="s" :value="String(s)">{{ $t('mm.status_' + s) }}</option>
        </CFormSelect>
      </CCardBody>
    </CCard>

    <!-- Loading State -->
    <div v-if="loading && filteredReports.length === 0" class="text-center py-4">
      <CSpinner color="primary" />
      <p class="mt-2">{{ $t('mm.loading') }}</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Empty State -->
    <div v-if="!loading && !error && filteredReports.length === 0" class="text-center py-5">
      <CIcon icon="cil-warning" size="4xl" class="text-muted mb-3" />
      <h4 class="text-muted">{{ $t('mm.no_reports') }}</h4>
    </div>

    <!-- Reports Grid -->
    <CRow v-if="filteredReports.length > 0">
      <CCol
        v-for="report in filteredReports"
        :key="report.uid"
        xs="12"
        sm="6"
        md="4"
        lg="4"
        class="mb-4"
      >
        <CCard class="h-100" style="cursor: pointer;" @click="goToDetail(report)">
          <CCardHeader class="d-flex justify-content-between align-items-center">
            <h5 class="mb-0 text-truncate">{{ report.betreff }}</h5>
            <CBadge :color="getUrgencyBadgeColor(report.dringlichkeit)" shape="rounded-pill">
              {{ $t('mm.urgency_' + report.dringlichkeit) }}
            </CBadge>
          </CCardHeader>
          <CCardBody>
            <div class="info-item mb-2">
              <CIcon icon="cil-building" class="me-2 text-muted" />
              <span class="text-muted">{{ $t('mm.building') }}:</span>
              <strong class="ms-1">{{ report.street }}</strong>
              <span v-if="report.whg" class="ms-2">/ {{ report.whg }}</span>
            </div>
            <div class="info-item mb-2">
              <CIcon icon="cil-user" class="me-2 text-muted" />
              <span class="text-muted">{{ $t('mm.reporter_name') }}:</span>
              <span class="ms-1">{{ report.melder }}</span>
            </div>
            <div class="info-item mb-2">
              <CIcon icon="cil-calendar" class="me-2 text-muted" />
              <small class="ms-1">{{ formatDate(report.datetime) }}</small>
            </div>
            <CBadge :color="getStatusBadgeColor(report.status)" class="mt-1">
              {{ $t('mm.status_' + report.status) }}
            </CBadge>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
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
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CBadge,
  CFormLabel,
  CFormSelect
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { apiMm } from '@/api/ApiMm.js'
import MmReportStorage from '@/stores/MmReportStorage.js'
import { useOfflineMmReportStorage } from '@/stores/OfflineMmReportStorage.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import { useOfflineMmSync } from '@/stores/OfflineMmSyncService.js'
import { hasPermission } from '@/stores/GlobalUser.js'

const router = useRouter()
const { t } = useI18n()
const onlineStatus = useOnlineStatusStore()
const offlineMmReportStorage = useOfflineMmReportStorage()
const { forceSync } = useOfflineMmSync()
const isSyncing = ref(false)

const reports = ref([])
const loading = ref(false)
const error = ref(null)
const selectedStatus = ref('')
const pendingCount = ref(0)

const canCreate = computed(() => hasPermission('create_mm'))
const statusOptions = [-2, -1, 0, 1, 2, 3, 4]

const filteredReports = computed(() => {
  if (selectedStatus.value === '') return reports.value
  return reports.value.filter(r => String(r.status) === selectedStatus.value)
})

const getUrgencyBadgeColor = (urgency) => {
  switch (urgency) {
    case 'kritisch': return 'danger'
    case 'hoch': return 'warning'
    case 'niedrig': return 'secondary'
    default: return 'info'
  }
}

const getStatusBadgeColor = (status) => {
  switch (Number(status)) {
    case -2: return 'secondary'
    case -1: return 'danger'
    case 0: return 'warning'
    case 1: return 'info'
    case 2: return 'primary'
    case 3: return 'success'
    case 4: return 'warning'
    default: return 'secondary'
  }
}

const loadPendingCount = async () => {
  try {
    const stats = await offlineMmReportStorage.getStats()
    pendingCount.value = stats.pending || 0
  } catch (err) {
    console.warn('Fehler beim Laden der Offline-Mängelmeldungen:', err)
  }
}

const syncPendingReports = async () => {
  isSyncing.value = true
  try {
    await forceSync()
  } catch (err) {
    console.warn('Fehler beim manuellen Mängelmeldungs-Sync:', err)
  } finally {
    await loadPendingCount()
    isSyncing.value = false
  }
}

const loadReports = async (forceRefresh = false) => {
  if (!onlineStatus.isFullyOnline) {
    const cached = await MmReportStorage.getReports()
    if (cached && cached.length > 0) {
      reports.value = cached
    }
    return
  }

  if (!forceRefresh) {
    const cached = await MmReportStorage.getReports()
    if (cached && cached.length > 0) {
      reports.value = cached
    }
  }

  loading.value = true
  error.value = null
  try {
    const result = await apiMm.list({ limit: 100 })
    if (!result.success) {
      error.value = result.error || t('common.error')
    }
    if (result.items.length > 0 || forceRefresh) {
      reports.value = result.items
      await MmReportStorage.setReports(JSON.parse(JSON.stringify(result.items)))
    }
  } catch (err) {
    error.value = err.message || t('common.error')
  } finally {
    loading.value = false
  }
}

const refreshReports = async () => {
  await loadReports(true)
}

const goToDetail = (report) => {
  router.push({ name: 'MmDetail', params: { uid: report.uid } })
}

onMounted(async () => {
  await loadReports()
  await loadPendingCount()
})
</script>
