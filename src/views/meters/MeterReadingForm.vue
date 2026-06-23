<template>
  <div class="meter-reading-form">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>{{ $t('meter.reading_new') }}</h2>
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb mb-0">
                <li class="breadcrumb-item">
                  <router-link to="/meters" class="text-decoration-none">
                    {{ $t('meter.title') }}
                  </router-link>
                </li>
                <li class="breadcrumb-item active" aria-current="page">
                  {{ meter ? meter.name : $t('meter.reading_new') }}
                </li>
              </ol>
            </nav>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <CBadge v-if="!isOnline" color="secondary" class="d-flex align-items-center gap-1">
              <CIcon icon="cil-wifi-off" size="sm" class="me-1" />
              {{ $t('meter.offline_badge') }}
            </CBadge>
            <CButton color="secondary" variant="outline" @click="goBack">
              <CIcon icon="cil-arrow-left" class="me-2" />
              {{ $t('common.back') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Offline Banner -->
    <CAlert v-if="!isOnline" color="warning" :visible="true" class="mb-4">
      <CIcon icon="cil-wifi-off" class="me-2" />
      {{ $t('flushing.offlineMode') }} – {{ $t('meter.save_offline_msg') }}
    </CAlert>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-4">
      <CSpinner color="primary" />
      <p class="mt-2">{{ $t('meter.loading') }}</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Success State -->
    <CAlert v-if="successMsg" color="success" :visible="true" class="mb-4">
      <CIcon icon="cil-check-circle" class="me-2" />
      {{ successMsg }}
    </CAlert>

    <!-- Main Content -->
    <CRow v-if="!loading">
      <!-- Meter Info -->
      <CCol xs="12" md="4" class="mb-4">
        <CCard class="h-100" v-if="meter">
          <CCardHeader>
            <h5>
              <span class="me-2">{{ getMeterTypeIcon(meter.meter_type) }}</span>
              {{ meter.name }}
            </h5>
          </CCardHeader>
          <CCardBody>
            <CTable bordered responsive class="mb-0">
              <CTableBody>
                <CTableRow>
                  <CTableHeaderCell scope="row">{{ $t('meter.meter_number') }}</CTableHeaderCell>
                  <CTableDataCell>{{ meter.meter_number }}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell scope="row">{{ $t('meter.unit') }}</CTableHeaderCell>
                  <CTableDataCell>{{ meter.unit }}</CTableDataCell>
                </CTableRow>
                <CTableRow v-if="meter.location">
                  <CTableHeaderCell scope="row">{{ $t('meter.location') }}</CTableHeaderCell>
                  <CTableDataCell>{{ meter.location }}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell scope="row">{{ $t('meter.current_reading') }}</CTableHeaderCell>
                  <CTableDataCell>
                    <span v-if="meter.reading_value !== null && meter.reading_value !== undefined">
                      <strong>{{ meter.reading_value }}</strong> {{ meter.unit }}
                    </span>
                    <span v-else class="text-muted">{{ $t('meter.no_reading') }}</span>
                  </CTableDataCell>
                </CTableRow>
                <CTableRow v-if="meter.reading_date">
                  <CTableHeaderCell scope="row">{{ $t('meter.last_reading') }}</CTableHeaderCell>
                  <CTableDataCell>{{ formatDate(meter.reading_date) }}</CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
        <CCard class="h-100" v-else>
          <CCardBody class="text-center text-muted">
            <CIcon icon="cil-speedometer" size="3xl" class="mb-2" />
            <p>{{ $t('meter.loading') }}</p>
          </CCardBody>
        </CCard>
      </CCol>

      <!-- Reading Form -->
      <CCol xs="12" md="8" class="mb-4">
        <CCard>
          <CCardHeader>
            <h5>
              <CIcon icon="cil-pencil" class="me-2" />
              {{ $t('meter.reading_new') }}
            </h5>
          </CCardHeader>
          <CCardBody>
            <form @submit.prevent="submitReading">
              <div class="mb-3">
                <CFormLabel for="reading_value">
                  {{ $t('meter.reading_value') }}
                  <span v-if="meter"> ({{ meter.unit }})</span>
                  <span class="text-danger ms-1">*</span>
                </CFormLabel>
                <CFormInput
                  id="reading_value"
                  type="number"
                  step="0.001"
                  min="0.001"
                  v-model="form.reading_value"
                  :class="{ 'is-invalid': validationErrors.reading_value }"
                  :placeholder="$t('meter.reading_value')"
                  required
                />
                <div v-if="validationErrors.reading_value" class="invalid-feedback">
                  {{ validationErrors.reading_value }}
                </div>
              </div>

              <div class="mb-3">
                <CFormLabel for="reading_date">
                  {{ $t('meter.reading_date') }}
                  <span class="text-danger ms-1">*</span>
                </CFormLabel>
                <CFormInput
                  id="reading_date"
                  type="date"
                  v-model="form.reading_date"
                  :class="{ 'is-invalid': validationErrors.reading_date }"
                  required
                />
                <div v-if="validationErrors.reading_date" class="invalid-feedback">
                  {{ validationErrors.reading_date }}
                </div>
              </div>

              <div class="mb-3">
                <CFormLabel for="reading_time">{{ $t('meter.reading_time') }}</CFormLabel>
                <CFormInput
                  id="reading_time"
                  type="time"
                  v-model="form.reading_time"
                />
              </div>

              <div class="mb-3">
                <CFormLabel for="reading_note">{{ $t('meter.reading_note') }}</CFormLabel>
                <CFormTextarea
                  id="reading_note"
                  v-model="form.note"
                  :placeholder="$t('meter.reading_note')"
                  rows="3"
                  maxlength="500"
                />
                <div class="form-text text-muted">{{ (form.note || '').length }}/500</div>
              </div>

              <div class="d-flex gap-2">
                <CButton type="submit" color="primary" :disabled="submitting">
                  <CSpinner v-if="submitting" size="sm" class="me-2" />
                  <CIcon v-else icon="cil-save" class="me-2" />
                  {{ isOnline ? $t('common.save') : $t('meter.save_offline') }}
                </CButton>
                <CButton type="button" color="secondary" variant="outline" @click="goBack">
                  {{ $t('common.cancel') }}
                </CButton>
              </div>
            </form>
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
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CTable,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { apiMeter } from '@/api/ApiMeter.js'
import MeterStorage from '@/stores/MeterStorage.js'
import { useOfflineMeterStorage } from '@/stores/OfflineMeterStorage.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const onlineStatus = useOnlineStatusStore()
const offlineMeterStorage = useOfflineMeterStorage()

const meterId = computed(() => route.params.meterId)
const isOnline = computed(() => onlineStatus.isFullyOnline)

const meter = ref(null)
const loading = ref(false)
const error = ref(null)
const successMsg = ref(null)
const submitting = ref(false)
const validationErrors = ref({})

const getTodayDate = () => {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

const getCurrentTime = () => {
  const now = new Date()
  return now.toTimeString().slice(0, 5)
}

const form = ref({
  reading_value: '',
  reading_date: getTodayDate(),
  reading_time: getCurrentTime(),
  note: ''
})

const getMeterTypeIcon = (type) => {
  switch (type) {
    case 'water': return '💧'
    case 'power': return '⚡'
    case 'heating': return '🔥'
    default: return '📊'
  }
}

const loadMeter = async () => {
  loading.value = true
  error.value = null
  try {
    // Zuerst aus Cache versuchen
    const cached = await MeterStorage.getMeter(meterId.value)
    if (cached) {
      meter.value = cached
    }
    // Online: frische Daten laden
    if (isOnline.value) {
      try {
        const result = await apiMeter.get(meterId.value)
        if (result) {
          meter.value = result
        }
      } catch (apiErr) {
        if (!meter.value) throw apiErr
        console.warn('API-Fehler, nutze Cache:', apiErr)
      }
    } else if (!meter.value) {
      error.value = t('meter.no_meters')
    }
  } catch (err) {
    error.value = err.message || t('common.error')
  } finally {
    loading.value = false
  }
}

const validate = () => {
  const errors = {}
  const val = parseFloat(form.value.reading_value)
  if (!form.value.reading_value || form.value.reading_value === '') {
    errors.reading_value = t('meter.error_value_required')
  } else if (isNaN(val) || val <= 0) {
    errors.reading_value = t('meter.error_value_invalid')
  }
  if (!form.value.reading_date) {
    errors.reading_date = t('common.error')
  }
  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

const submitReading = async () => {
  if (!validate()) return

  submitting.value = true
  error.value = null
  successMsg.value = null

  const localId = crypto.randomUUID()
  const readingData = {
    meter_id: meterId.value,
    reading_value: parseFloat(form.value.reading_value),
    reading_date: form.value.reading_date,
    reading_time: form.value.reading_time || undefined,
    note: form.value.note || undefined,
    local_id: localId
  }

  try {
    if (isOnline.value) {
      await apiMeter.createReading(readingData)
      successMsg.value = t('common.success')
    } else {
      await offlineMeterStorage.saveOfflineReading({
        localId,
        meterId: meterId.value,
        buildingId: meter.value?.building_id,
        meter_type: meter.value?.meter_type,
        reading_value: readingData.reading_value,
        reading_date: readingData.reading_date,
        reading_time: readingData.reading_time || null,
        note: readingData.note || null,
        synced: false,
        createdAt: new Date().toISOString()
      })
      successMsg.value = t('meter.save_offline') + ' – ' + t('meter.save_offline_msg')
    }

    // Nach kurzer Pause zurücknavigieren
    setTimeout(() => {
      goBack()
    }, 1500)
  } catch (err) {
    error.value = err.message || t('common.error')
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadMeter()
})
</script>

<style scoped src="@/styles/views/Meters.css"></style>
