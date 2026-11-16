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
              <CTableDataCell>{{ report.street_name || report.street }} / {{ report.whg }}</CTableDataCell>
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

    <!-- Foto-Galerie -->
    <CCard v-if="!loading && report && report.photos && report.photos.length > 0" class="mt-4">
      <CCardHeader>
        <CIcon icon="cil-image" class="me-2" />
        {{ $t('mm.photos') }}
        <CBadge color="secondary" class="ms-2">{{ report.photos.length }}</CBadge>
      </CCardHeader>
      <CCardBody>
        <div class="d-flex flex-wrap gap-2">
          <div
            v-for="(filename, idx) in report.photos"
            :key="filename"
            class="mm-photo-thumb-wrapper"
            @click="openPhoto(idx)"
          >
            <img
              v-if="photoUrls[filename]"
              :src="photoUrls[filename]"
              class="mm-photo-thumb"
              :alt="filename"
            />
            <div v-else class="mm-photo-placeholder d-flex align-items-center justify-content-center">
              <CSpinner size="sm" color="secondary" />
            </div>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Vollbild-Modal -->
    <CModal :visible="photoModalVisible" size="xl" alignment="center" @close="closePhoto">
      <CModalHeader>
        <CModalTitle>
          {{ $t('mm.photos') }}
          <span class="text-muted ms-2 small">{{ photoModalIdx + 1 }} / {{ report?.photos?.length }}</span>
        </CModalTitle>
      </CModalHeader>
      <CModalBody class="text-center p-2">
        <img
          v-if="photoModalUrl"
          :src="photoModalUrl"
          class="img-fluid"
          style="max-height: 75vh; object-fit: contain;"
          :alt="report?.photos?.[photoModalIdx]"
        />
        <CSpinner v-else color="primary" />
      </CModalBody>
      <CModalFooter class="justify-content-between">
        <CButton color="secondary" variant="outline" :disabled="photoModalIdx <= 0" @click="photoModalIdx--; loadFullPhoto()">
          <CIcon icon="cil-arrow-left" />
        </CButton>
        <CButton color="secondary" variant="outline" :disabled="photoModalIdx >= (report?.photos?.length ?? 1) - 1" @click="photoModalIdx++; loadFullPhoto()">
          <CIcon icon="cil-arrow-right" />
        </CButton>
      </CModalFooter>
    </CModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate } from '@/utils/dateFormatter.js'
import { useRouter, useRoute } from 'vue-router'
import {
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
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

// Foto-State
const photoUrls = ref({})       // { filename: objectUrl }
const photoModalVisible = ref(false)
const photoModalIdx = ref(0)
const photoModalUrl = ref(null)
const revokeUrls = []           // für Cleanup in onUnmounted

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
    case 5: return 'info'
    case 6: return 'primary'
    case 3: return 'success'
    case 4: return 'warning'
    default: return 'secondary'
  }
}

const loadThumbnails = async (photos) => {
  for (const filename of photos) {
    if (photoUrls.value[filename]) continue
    const url = await apiMm.fetchPhotoObjectUrl(uid.value, filename, 'thumb')
    if (url) {
      photoUrls.value[filename] = url
      revokeUrls.push(url)
    }
  }
}

const openPhoto = async (idx) => {
  photoModalIdx.value = idx
  photoModalUrl.value = null
  photoModalVisible.value = true
  await loadFullPhoto()
}

const loadFullPhoto = async () => {
  const filename = report.value?.photos?.[photoModalIdx.value]
  if (!filename) return
  photoModalUrl.value = null
  const url = await apiMm.fetchPhotoObjectUrl(uid.value, filename, 'large')
  photoModalUrl.value = url
  if (url) revokeUrls.push(url)
}

const closePhoto = () => {
  photoModalVisible.value = false
  photoModalUrl.value = null
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
    if (report.value?.photos?.length && isOnline.value) {
      loadThumbnails(report.value.photos)
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

onUnmounted(() => {
  for (const url of revokeUrls) {
    URL.revokeObjectURL(url)
  }
})
</script>

<style scoped>
.mm-photo-thumb-wrapper {
  width: 90px;
  height: 90px;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--cui-border-color, #dee2e6);
}
.mm-photo-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.15s;
}
.mm-photo-thumb-wrapper:hover .mm-photo-thumb {
  opacity: 0.85;
}
.mm-photo-placeholder {
  width: 100%;
  height: 100%;
  background: var(--cui-secondary-bg, #f8f9fa);
}
</style>
