<template>
  <div class="mm-report-form">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>{{ $t('mm.new') }}</h2>
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb mb-0">
                <li class="breadcrumb-item">
                  <router-link to="/mm" class="text-decoration-none">
                    {{ $t('mm.title') }}
                  </router-link>
                </li>
                <li class="breadcrumb-item active" aria-current="page">{{ $t('mm.new') }}</li>
              </ol>
            </nav>
          </div>
          <CBadge v-if="!isOnline" color="secondary" class="d-flex align-items-center gap-1">
            <CIcon icon="cil-wifi-off" size="sm" class="me-1" />
            {{ $t('mm.offline_badge') }}
          </CBadge>
        </div>
      </CCardBody>
    </CCard>

    <!-- Offline Banner -->
    <CAlert v-if="!isOnline" color="warning" :visible="true" class="mb-4">
      <CIcon icon="cil-wifi-off" class="me-2" />
      {{ $t('mm.save_offline_msg') }}
    </CAlert>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Success State -->
    <CAlert v-if="successMsg" color="success" :visible="true" class="mb-4">
      <CIcon icon="cil-check-circle" class="me-2" />
      {{ successMsg }}
    </CAlert>

    <CCard>
      <CCardBody>
        <form @submit.prevent="submitReport">
          <div class="mb-3">
            <CFormLabel for="building">
              {{ $t('mm.building') }} <span class="text-danger ms-1">*</span>
            </CFormLabel>
            <CFormSelect
              id="building"
              v-model="form.buildingId"
              :class="{ 'is-invalid': validationErrors.buildingId }"
              @change="onBuildingChange"
              required
            >
              <option value="">{{ $t('common.filter') }} - {{ $t('buildings.title') }}</option>
              <option v-for="b in buildings" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
            </CFormSelect>
            <div v-if="validationErrors.buildingId" class="invalid-feedback">
              {{ validationErrors.buildingId }}
            </div>
          </div>

          <div class="mb-3">
            <CFormLabel for="apartment">
              {{ $t('mm.apartment') }} <span class="text-danger ms-1">*</span>
            </CFormLabel>
            <CFormSelect
              id="apartment"
              v-model="form.whg"
              :class="{ 'is-invalid': validationErrors.whg }"
              :disabled="!form.buildingId || loadingApartments"
              required
            >
              <option value="">{{ $t('mm.apartment_select') }}</option>
              <option v-for="a in apartments" :key="a.id" :value="a.number">{{ a.number }}</option>
            </CFormSelect>
            <div v-if="validationErrors.whg" class="invalid-feedback">
              {{ validationErrors.whg }}
            </div>
          </div>

          <div class="mb-3">
            <CFormLabel for="betreff">
              {{ $t('mm.betreff') }} <span class="text-danger ms-1">*</span>
            </CFormLabel>
            <CFormInput
              id="betreff"
              v-model="form.betreff"
              :class="{ 'is-invalid': validationErrors.betreff }"
              maxlength="255"
              required
            />
            <div v-if="validationErrors.betreff" class="invalid-feedback">
              {{ validationErrors.betreff }}
            </div>
          </div>

          <div class="mb-3">
            <CFormLabel for="beschreibung">
              {{ $t('mm.beschreibung') }} <span class="text-danger ms-1">*</span>
            </CFormLabel>
            <CFormTextarea
              id="beschreibung"
              v-model="form.beschreibung"
              :class="{ 'is-invalid': validationErrors.beschreibung }"
              rows="4"
              maxlength="2000"
              required
            />
            <div v-if="validationErrors.beschreibung" class="invalid-feedback">
              {{ validationErrors.beschreibung }}
            </div>
          </div>

          <div class="mb-3">
            <CFormLabel for="urgency">{{ $t('mm.urgency') }}</CFormLabel>
            <CFormSelect id="urgency" v-model="form.dringlichkeit">
              <option value="niedrig">{{ $t('mm.urgency_niedrig') }}</option>
              <option value="normal">{{ $t('mm.urgency_normal') }}</option>
              <option value="hoch">{{ $t('mm.urgency_hoch') }}</option>
              <option value="kritisch">{{ $t('mm.urgency_kritisch') }}</option>
            </CFormSelect>
          </div>

          <CRow>
            <CCol xs="12" md="6" class="mb-3">
              <CFormLabel for="reporter_name">
                {{ $t('mm.reporter_name') }} <span class="text-danger ms-1">*</span>
              </CFormLabel>
              <CFormInput
                id="reporter_name"
                v-model="form.melder"
                :class="{ 'is-invalid': validationErrors.melder }"
                required
              />
              <div v-if="validationErrors.melder" class="invalid-feedback">
                {{ validationErrors.melder }}
              </div>
            </CCol>
            <CCol xs="12" md="6" class="mb-3">
              <CFormLabel for="reporter_email">{{ $t('mm.reporter_email') }}</CFormLabel>
              <CFormInput id="reporter_email" type="email" v-model="form.email" />
            </CCol>
          </CRow>

          <div class="mb-3">
            <CFormLabel for="reporter_phone">{{ $t('mm.reporter_phone') }}</CFormLabel>
            <CFormInput id="reporter_phone" v-model="form.tel" />
            <div v-if="validationErrors.contact" class="text-danger small mt-1">
              {{ validationErrors.contact }}
            </div>
          </div>

          <!-- Fotos -->
          <div class="mb-3">
            <CFormLabel>{{ $t('mm.photos') }}</CFormLabel>
            <div class="d-flex gap-2 mb-2">
              <CButton type="button" color="secondary" variant="outline" size="sm" @click="takePhoto" :disabled="capturing">
                <CSpinner v-if="capturing" size="sm" class="me-1" />
                <CIcon v-else icon="cil-camera" class="me-1" />
                {{ $t('mm.take_photo') }}
              </CButton>
              <CButton type="button" color="secondary" variant="outline" size="sm" @click="pickFromGallery" :disabled="capturing">
                <CIcon icon="cil-image" class="me-1" />
                {{ $t('mm.pick_from_gallery') }}
              </CButton>
            </div>
            <small v-if="photoError" class="text-danger d-block mb-2">{{ photoError }}</small>
            <div class="d-flex flex-wrap gap-2">
              <div v-for="(photo, idx) in photos" :key="photo.name" class="position-relative">
                <img :src="photo.dataUrl" class="mm-photo-thumb" :alt="photo.name" />
                <CButton
                  type="button"
                  color="danger"
                  size="sm"
                  class="position-absolute top-0 end-0"
                  @click="removePhoto(idx)"
                >
                  &times;
                </CButton>
              </div>
            </div>
          </div>

          <div class="d-flex gap-2">
            <CButton type="submit" color="primary" :disabled="submitting">
              <CSpinner v-if="submitting" size="sm" class="me-2" />
              <CIcon v-else icon="cil-save" class="me-2" />
              {{ isOnline ? $t('mm.submit') : $t('mm.save_offline') }}
            </CButton>
            <CButton type="button" color="secondary" variant="outline" @click="goBack">
              {{ $t('common.cancel') }}
            </CButton>
          </div>
        </form>
      </CCardBody>
    </CCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  CButton,
  CCard,
  CCardBody,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CBadge,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { apiMm } from '@/api/ApiMm.js'
import { useOfflineMmReportStorage } from '@/stores/OfflineMmReportStorage.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import { useApiBuilding } from '@/api/ApiBuilding.js'
import { useApiApartment } from '@/api/ApiApartment.js'
import { useMmPhotoCapture } from '@/composables/useMmPhotoCapture.js'
import { currentUser } from '@/stores/GlobalUser.js'
import { dataUrlToFile } from '@/utils/dataUrlToFile.js'

const router = useRouter()
const { t } = useI18n()
const onlineStatus = useOnlineStatusStore()
const offlineMmReportStorage = useOfflineMmReportStorage()
const { buildings, list: listBuildings } = useApiBuilding()
const { apartments, list: listApartments } = useApiApartment()
const { photos, capturing, error: photoError, takePhoto, pickFromGallery, removePhoto, clearPhotos } = useMmPhotoCapture()

const isOnline = computed(() => onlineStatus.isFullyOnline)
const loadingApartments = ref(false)
const error = ref(null)
const successMsg = ref(null)
const submitting = ref(false)
const validationErrors = ref({})

const form = ref({
  buildingId: '',
  whg: '',
  betreff: '',
  beschreibung: '',
  dringlichkeit: 'normal',
  melder: currentUser.value ? `${currentUser.value.name || ''}`.trim() : '',
  email: currentUser.value?.email || '',
  tel: '',
})

const onBuildingChange = async () => {
  form.value.whg = ''
  if (!form.value.buildingId) {
    apartments.value = []
    return
  }
  loadingApartments.value = true
  try {
    await listApartments({ building_id: form.value.buildingId })
  } catch (err) {
    console.warn('Fehler beim Laden der Wohnungen:', err)
  } finally {
    loadingApartments.value = false
  }
}

const validate = () => {
  const errors = {}
  if (!form.value.buildingId) errors.buildingId = t('mm.error_building_required')
  if (!form.value.whg) errors.whg = t('mm.error_apartment_required')
  if (!form.value.betreff || !form.value.betreff.trim()) errors.betreff = t('mm.error_betreff_required')
  if (!form.value.beschreibung || !form.value.beschreibung.trim()) errors.beschreibung = t('mm.error_beschreibung_required')
  if (!form.value.melder || !form.value.melder.trim()) errors.melder = t('mm.error_reporter_required')
  if (!(form.value.email && form.value.email.trim()) && !(form.value.tel && form.value.tel.trim())) {
    errors.contact = t('mm.error_contact_required')
  }
  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

const submitReport = async () => {
  if (!validate()) return

  submitting.value = true
  error.value = null
  successMsg.value = null

  const localId = crypto.randomUUID()
  const payload = {
    street:        Number(form.value.buildingId),
    whg:           form.value.whg,
    betreff:       form.value.betreff,
    beschreibung:  form.value.beschreibung,
    dringlichkeit: form.value.dringlichkeit,
    zugeh:         'haus',
    melder:        form.value.melder || undefined,
    email:         form.value.email || undefined,
    tel:           form.value.tel || undefined,
    local_id:      localId,
  }

  try {
    if (isOnline.value) {
      let uploadToken = null
      if (photos.value.length > 0) {
        const files = photos.value.map((p, idx) => dataUrlToFile(p.dataUrl, p.name || `foto_${idx + 1}.jpg`))
        const uploadResult = await apiMm.preUpload(files)
        if (uploadResult.success && uploadResult.token) {
          uploadToken = uploadResult.token
        } else {
          console.warn('Foto-Upload fehlgeschlagen, Meldung wird ohne Fotos angelegt:', uploadResult.error)
        }
      }
      const result = await apiMm.create({ ...payload, upload_token: uploadToken || undefined })
      if (!result.success) {
        error.value = result.error || t('common.error')
        return
      }
      successMsg.value = t('common.success')
    } else {
      await offlineMmReportStorage.saveOfflineReport({
        localId,
        street: payload.street,
        whg: payload.whg,
        betreff: payload.betreff,
        beschreibung: payload.beschreibung,
        dringlichkeit: payload.dringlichkeit,
        zugeh: payload.zugeh,
        melder: payload.melder || '',
        email: payload.email || '',
        tel: payload.tel || '',
        photos: photos.value,
      })
      successMsg.value = t('mm.save_offline') + ' – ' + t('mm.save_offline_msg')
    }

    clearPhotos()
    setTimeout(() => {
      router.push({ name: 'MmList' })
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

onMounted(async () => {
  try {
    await listBuildings()
  } catch (err) {
    console.warn('Fehler beim Laden der Gebäude:', err)
  }
})
</script>

<style scoped>
.mm-photo-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--cui-border-color, #dee2e6);
}
</style>
