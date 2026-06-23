<template>
  <div class="meter-history">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>{{ $t('meter.history') }} – {{ meter ? meter.name : '' }}</h2>
            <p class="text-muted mb-0" v-if="meter">
              {{ $t('meter.meter_number') }}: {{ meter.meter_number }}
              <span v-if="meter.location"> · {{ meter.location }}</span>
            </p>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <CBadge v-if="!isOnline" color="secondary" class="d-flex align-items-center gap-1">
              <CIcon icon="cil-wifi-off" size="sm" class="me-1" />
              {{ $t('meter.offline_badge') }}
            </CBadge>
            <CButton
              v-if="pendingReadings.length > 0 && isOnline"
              color="info"
              variant="outline"
              size="sm"
              @click="forceSync"
              :disabled="syncing"
            >
              <CSpinner v-if="syncing" size="sm" class="me-1" />
              <CIcon v-else icon="cil-cloud-upload" class="me-1" />
              Sync
            </CButton>
            <CButton color="primary" @click="loadData" :disabled="loading || !isOnline">
              <CIcon icon="cil-reload" class="me-2" />
              {{ $t('common.refresh') }}
            </CButton>
            <CButton color="secondary" variant="outline" @click="goBack">
              <CIcon icon="cil-arrow-left" class="me-2" />
              {{ $t('common.back') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true" class="mb-4">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Sync Success -->
    <CAlert v-if="syncMsg" color="success" :visible="true" class="mb-4">
      <CIcon icon="cil-check-circle" class="me-2" />
      {{ syncMsg }}
    </CAlert>

    <!-- Loading State -->
    <div v-if="loading && readings.length === 0 && pendingReadings.length === 0" class="text-center py-4">
      <CSpinner color="primary" />
      <p class="mt-2">{{ $t('meter.loading') }}</p>
    </div>

    <!-- Pending Offline Readings -->
    <CCard v-if="pendingReadings.length > 0" class="mb-4 border-warning">
      <CCardHeader class="bg-warning bg-opacity-10">
        <h5 class="mb-0">
          <CIcon icon="cil-clock" class="me-2" />
          {{ $t('meter.pending_badge') }}
          <CBadge color="warning" class="ms-2">{{ pendingReadings.length }}</CBadge>
        </h5>
      </CCardHeader>
      <CCardBody>
        <CTable responsive hover>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>{{ $t('meter.reading_date') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('meter.reading_value') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('meter.reading_note') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('common.status') }}</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            <CTableRow v-for="reading in pendingReadings" :key="reading.localId">
              <CTableDataCell>
                {{ reading.reading_date }}
                <small v-if="reading.reading_time" class="text-muted d-block">{{ reading.reading_time }}</small>
              </CTableDataCell>
              <CTableDataCell>
                <strong>{{ reading.reading_value }}</strong>
                <span v-if="meter" class="ms-1 text-muted">{{ meter.unit }}</span>
              </CTableDataCell>
              <CTableDataCell>
                <span v-if="reading.note" class="text-muted small">{{ reading.note }}</span>
                <span v-else class="text-muted small">–</span>
              </CTableDataCell>
              <CTableDataCell>
                <CBadge :color="reading.synced ? 'success' : 'warning'">
                  <CIcon :icon="reading.synced ? 'cil-check-circle' : 'cil-clock'" class="me-1" size="sm" />
                  {{ reading.synced ? $t('flushing.synced') : $t('meter.pending_badge') }}
                </CBadge>
              </CTableDataCell>
            </CTableRow>
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>

    <!-- Online Readings -->
    <CCard>
      <CCardHeader>
        <h5 class="mb-0">
          <CIcon icon="cil-history" class="me-2" />
          {{ $t('meter.readings') }}
        </h5>
      </CCardHeader>
      <CCardBody>
        <div v-if="readings.length === 0 && !loading" class="text-center py-4">
          <CIcon icon="cil-chart-line" size="3xl" class="text-muted mb-3" />
          <h5 class="text-muted">{{ $t('meter.no_reading') }}</h5>
        </div>

        <div v-else>
          <!-- Desktop Table -->
          <CTable class="d-none d-md-table" responsive striped hover>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>{{ $t('meter.reading_date') }}</CTableHeaderCell>
                <CTableHeaderCell>{{ $t('meter.reading_value') }}</CTableHeaderCell>
                <CTableHeaderCell>{{ $t('meter.reading_note') }}</CTableHeaderCell>
                <CTableHeaderCell>{{ $t('common.user') }}</CTableHeaderCell>
                <CTableHeaderCell>{{ $t('common.actions') }}</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              <template v-for="reading in readings" :key="reading.id">
                <!-- Normal row -->
                <CTableRow v-if="editingId !== reading.id">
                  <CTableDataCell>
                    <strong>{{ reading.reading_date }}</strong>
                    <small v-if="reading.reading_time" class="text-muted d-block">{{ reading.reading_time }}</small>
                  </CTableDataCell>
                  <CTableDataCell>
                    <strong>{{ reading.reading_value }}</strong>
                    <span v-if="meter" class="ms-1 text-muted">{{ meter.unit }}</span>
                  </CTableDataCell>
                  <CTableDataCell>
                    <span v-if="reading.note" class="small">{{ reading.note }}</span>
                    <span v-else class="text-muted small">–</span>
                  </CTableDataCell>
                  <CTableDataCell>
                    <span v-if="reading.created_by" class="small">{{ reading.created_by }}</span>
                    <span v-else class="text-muted small">–</span>
                  </CTableDataCell>
                  <CTableDataCell>
                    <div class="d-flex gap-1" v-if="isOnline">
                      <CButton color="primary" variant="ghost" size="sm" @click="startEdit(reading)">
                        <CIcon icon="cil-pencil" />
                      </CButton>
                      <CButton color="danger" variant="ghost" size="sm" @click="confirmDelete(reading)">
                        <CIcon icon="cil-trash" />
                      </CButton>
                    </div>
                  </CTableDataCell>
                </CTableRow>
                <!-- Inline edit row -->
                <CTableRow v-else class="table-active">
                  <CTableDataCell>
                    <CFormInput type="date" v-model="editForm.reading_date" size="sm" />
                    <CFormInput type="time" v-model="editForm.reading_time" size="sm" class="mt-1" />
                  </CTableDataCell>
                  <CTableDataCell>
                    <CFormInput type="number" step="0.001" v-model="editForm.reading_value" size="sm" />
                  </CTableDataCell>
                  <CTableDataCell colspan="2">
                    <CFormInput type="text" v-model="editForm.note" size="sm" maxlength="500" />
                  </CTableDataCell>
                  <CTableDataCell>
                    <div class="d-flex gap-1">
                      <CButton color="success" size="sm" @click="saveEdit(reading)" :disabled="saving">
                        <CSpinner v-if="saving" size="sm" />
                        <CIcon v-else icon="cil-check" />
                      </CButton>
                      <CButton color="secondary" variant="outline" size="sm" @click="cancelEdit">
                        <CIcon icon="cil-x" />
                      </CButton>
                    </div>
                  </CTableDataCell>
                </CTableRow>
              </template>
            </CTableBody>
          </CTable>

          <!-- Mobile Cards -->
          <div class="d-md-none">
            <CCard v-for="reading in readings" :key="reading.id" class="mb-3">
              <CCardBody>
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <strong>{{ reading.reading_date }}</strong>
                    <small v-if="reading.reading_time" class="text-muted d-block">{{ reading.reading_time }}</small>
                  </div>
                  <span class="fs-5 fw-bold text-primary">
                    {{ reading.reading_value }}
                    <small v-if="meter" class="text-muted">{{ meter.unit }}</small>
                  </span>
                </div>
                <div v-if="reading.note" class="text-muted small mb-2">{{ reading.note }}</div>
                <div v-if="isOnline" class="d-flex gap-2">
                  <CButton color="primary" variant="ghost" size="sm" @click="startEdit(reading)">
                    <CIcon icon="cil-pencil" class="me-1" />{{ $t('meter.edit') }}
                  </CButton>
                  <CButton color="danger" variant="ghost" size="sm" @click="confirmDelete(reading)">
                    <CIcon icon="cil-trash" class="me-1" />{{ $t('meter.delete') }}
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </div>

          <!-- Load More -->
          <div v-if="hasMore" class="text-center mt-3">
            <CButton color="secondary" variant="outline" @click="loadMore" :disabled="loading">
              <CSpinner v-if="loading" size="sm" class="me-2" />
              {{ $t('common.next') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Delete Confirm Modal -->
    <CModal :visible="showDeleteModal" @close="showDeleteModal = false">
      <CModalHeader>
        <CModalTitle>{{ $t('meter.delete') }}</CModalTitle>
      </CModalHeader>
      <CModalBody>{{ $t('meter.delete_confirm') }}</CModalBody>
      <CModalFooter>
        <CButton color="secondary" @click="showDeleteModal = false">{{ $t('common.cancel') }}</CButton>
        <CButton color="danger" @click="deleteReading" :disabled="deleting">
          <CSpinner v-if="deleting" size="sm" class="me-1" />
          {{ $t('common.delete') }}
        </CButton>
      </CModalFooter>
    </CModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
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
  CFormInput,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { apiMeter } from '@/api/ApiMeter.js'
import MeterStorage from '@/stores/MeterStorage.js'
import { useOfflineMeterStorage } from '@/stores/OfflineMeterStorage.js'
import { offlineMeterSyncService } from '@/stores/OfflineMeterSyncService.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const onlineStatus = useOnlineStatusStore()
const offlineMeterStorage = useOfflineMeterStorage()

const meterId = computed(() => route.params.meterId)
const isOnline = computed(() => onlineStatus.isFullyOnline)

const meter = ref(null)
const readings = ref([])
const pendingReadings = ref([])
const loading = ref(false)
const error = ref(null)
const syncing = ref(false)
const syncMsg = ref(null)
const hasMore = ref(false)
const page = ref(1)
const pageSize = 20

// Edit state
const editingId = ref(null)
const editForm = ref({ reading_value: '', reading_date: '', reading_time: '', note: '' })
const saving = ref(false)

// Delete state
const showDeleteModal = ref(false)
const deletingReading = ref(null)
const deleting = ref(false)

const loadMeter = async () => {
  try {
    const cached = await MeterStorage.getMeter(meterId.value)
    if (cached) meter.value = cached
    if (isOnline.value) {
      try {
        const result = await apiMeter.get(meterId.value)
        if (result) meter.value = result
      } catch (err) {
        if (!meter.value) throw err
      }
    }
  } catch (err) {
    console.warn('Fehler beim Laden des Zählers:', err)
  }
}

const loadReadings = async (append = false) => {
  if (!isOnline.value) return
  loading.value = true
  try {
    const result = await apiMeter.readings(meterId.value, { page: page.value, limit: pageSize })
    const items = Array.isArray(result) ? result : (result?.items || result?.data || [])
    if (append) {
      readings.value = [...readings.value, ...items]
    } else {
      readings.value = items
    }
    hasMore.value = items.length === pageSize
  } catch (err) {
    error.value = err.message || t('common.error')
  } finally {
    loading.value = false
  }
}

const loadPendingReadings = async () => {
  try {
    const all = await offlineMeterStorage.getAllForMeter(meterId.value)
    pendingReadings.value = (all || []).filter(r => !r.synced)
  } catch (err) {
    console.warn('Fehler beim Laden der Offline-Ablesungen:', err)
  }
}

const loadData = async () => {
  page.value = 1
  await Promise.all([loadMeter(), loadReadings(false), loadPendingReadings()])
}

const loadMore = async () => {
  page.value++
  await loadReadings(true)
}

const forceSync = async () => {
  syncing.value = true
  syncMsg.value = null
  try {
    await offlineMeterSyncService.forceSync()
    syncMsg.value = t('meter.sync_complete')
    await loadPendingReadings()
    await loadReadings(false)
    setTimeout(() => { syncMsg.value = null }, 3000)
  } catch (err) {
    error.value = err.message || t('common.error')
  } finally {
    syncing.value = false
  }
}

const startEdit = (reading) => {
  editingId.value = reading.id
  editForm.value = {
    reading_value: reading.reading_value,
    reading_date: reading.reading_date,
    reading_time: reading.reading_time || '',
    note: reading.note || ''
  }
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (reading) => {
  saving.value = true
  try {
    await apiMeter.updateReading(reading.id, {
      reading_value: parseFloat(editForm.value.reading_value),
      reading_date: editForm.value.reading_date,
      reading_time: editForm.value.reading_time || undefined,
      note: editForm.value.note || undefined
    })
    editingId.value = null
    await loadReadings(false)
  } catch (err) {
    error.value = err.message || t('common.error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (reading) => {
  deletingReading.value = reading
  showDeleteModal.value = true
}

const deleteReading = async () => {
  if (!deletingReading.value) return
  deleting.value = true
  try {
    await apiMeter.deleteReading(deletingReading.value.id)
    showDeleteModal.value = false
    deletingReading.value = null
    await loadReadings(false)
  } catch (err) {
    error.value = err.message || t('common.error')
  } finally {
    deleting.value = false
  }
}

const goBack = () => {
  router.push({ name: 'MetersList' })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped src="@/styles/views/Meters.css"></style>
