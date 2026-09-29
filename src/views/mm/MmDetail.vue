<template>
  <div class="mm-detail">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2>{{ report ? report.betreff : $t('mm.detail_title') }}</h2>
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb mb-0">
                <li class="breadcrumb-item">
                  <router-link to="/mm" class="text-decoration-none">
                    {{ $t('mm.title') }}
                  </router-link>
                </li>
                <li class="breadcrumb-item active" aria-current="page">
                  {{ report ? report.betreff : $t('mm.detail_title') }}
                </li>
              </ol>
            </nav>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <CBadge v-if="!isOnline" color="secondary" class="d-flex align-items-center gap-1">
              <CIcon icon="cil-wifi-off" size="sm" class="me-1" />
              {{ $t('mm.offline_badge') }}
            </CBadge>
            <CButton color="secondary" variant="outline" @click="goBack">
              <CIcon icon="cil-arrow-left" class="me-2" />
              {{ $t('common.back') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-4">
      <CSpinner color="primary" />
      <p class="mt-2">{{ $t('mm.loading') }}</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Detail -->
    <CCard v-if="!loading && report">
      <CCardHeader class="d-flex justify-content-between align-items-center">
        <CBadge :color="getStatusBadgeColor(report.status)">
          {{ $t('mm.status_' + report.status) }}
        </CBadge>
        <CBadge :color="getUrgencyBadgeColor(report.dringlichkeit)" shape="rounded-pill">
          {{ $t('mm.urgency_' + report.dringlichkeit) }}
        </CBadge>
      </CCardHeader>
      <CCardBody>
        <CTable bordered responsive class="mb-0">
          <CTableBody>
            <CTableRow>
              <CTableHeaderCell scope="row">{{ $t('mm.location') }}</CTableHeaderCell>
              <CTableDataCell>{{ report.street }} / {{ report.whg }}</CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableHeaderCell scope="row">{{ $t('mm.beschreibung') }}</CTableHeaderCell>
              <CTableDataCell><span v-html="report.meldung_massage"></span></CTableDataCell>
            </CTableRow>
            <CTableRow v-if="report.folge">
              <CTableHeaderCell scope="row">{{ $t('mm.folge') }}</CTableHeaderCell>
              <CTableDataCell><span v-html="report.folge"></span></CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableHeaderCell scope="row">{{ $t('mm.reported_by') }}</CTableHeaderCell>
              <CTableDataCell>
                {{ report.melder }}
                <span v-if="report.tel"> · {{ report.tel }}</span>
                <span v-if="report.email"> · {{ report.email }}</span>
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableHeaderCell scope="row">{{ $t('mm.reported_at') }}</CTableHeaderCell>
              <CTableDataCell>{{ formatDate(report.datetime) }}</CTableDataCell>
            </CTableRow>
            <CTableRow v-if="report.instructions && report.instructions.length > 0">
              <CTableHeaderCell scope="row">{{ $t('common.info') }}</CTableHeaderCell>
              <CTableDataCell>
                <CBadge v-for="i in report.instructions" :key="i" color="info" class="me-1">{{ i }}</CBadge>
              </CTableDataCell>
            </CTableRow>
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
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
  CSpinner,
  CAlert,
  CBadge,
  CTable,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { apiMm } from '@/api/ApiMm.js'
import MmReportStorage from '@/stores/MmReportStorage.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const onlineStatus = useOnlineStatusStore()

const uid = computed(() => route.params.uid)
const isOnline = computed(() => onlineStatus.isFullyOnline)

const report = ref(null)
const loading = ref(false)
const error = ref(null)

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

const loadReport = async () => {
  loading.value = true
  error.value = null
  try {
    const cached = await MmReportStorage.getReport(uid.value)
    if (cached) {
      report.value = cached
    }
    if (isOnline.value) {
      try {
        const result = await apiMm.getByUid(uid.value)
        if (result) {
          report.value = result
          await MmReportStorage.updateReport(JSON.parse(JSON.stringify(result)))
        }
      } catch (apiErr) {
        if (!report.value) throw apiErr
        console.warn('API-Fehler, nutze Cache:', apiErr)
      }
    } else if (!report.value) {
      error.value = t('mm.no_reports')
    }
  } catch (err) {
    error.value = err.message || t('common.error')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadReport()
})
</script>
