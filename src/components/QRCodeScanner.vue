<template>
  <CModal
    :visible="visible"
    @close="handleClose"
    size="lg"
    alignment="center"
  >
    <CModalHeader>
      <CModalTitle>
        <CIcon icon="cil-qr-code" class="me-2" />
        {{ $t('qrScanner.title') }}
      </CModalTitle>
    </CModalHeader>
    <CModalBody>
      <!-- Scanner View -->
      <div v-if="!scanResult" class="scanner-container">
        <div class="camera-view" ref="cameraView">
          <video ref="videoElement" class="scanner-video" autoplay playsinline></video>
          <div class="scanner-overlay">
            <div class="scanner-frame"></div>
          </div>
        </div>

        <!-- Status Messages -->
        <div class="mt-3 text-center">
          <div v-if="isLoading" class="text-muted">
            <CSpinner size="sm" class="me-2" />
            {{ $t('qrScanner.initializing') }}
          </div>
          <div v-else-if="error" class="text-danger">
            <CIcon icon="cil-warning" class="me-2" />
            {{ error }}
          </div>
          <div v-else class="text-success">
            <CIcon icon="cil-check-circle" class="me-2" />
            {{ $t('qrScanner.ready') }}
          </div>
        </div>

        <!-- Instructions -->
        <CAlert color="info" class="mt-3">
          <CIcon icon="cil-info" class="me-2" />
          {{ $t('qrScanner.instructions') }}
        </CAlert>
      </div>

      <!-- Scan Result -->
      <div v-else class="scan-result">
        <div class="text-center mb-4">
          <div class="success-icon mb-3">
            <CIcon icon="cil-check-circle" size="3xl" class="text-success" />
          </div>
          <h4>{{ $t('qrScanner.scanSuccess') }}</h4>
          <p class="text-muted">{{ $t('qrScanner.redirecting') }}</p>
        </div>

        <CCard class="border-success">
          <CCardBody>
            <div class="apartment-info">
              <div class="mb-2">
                <strong>{{ $t('qrScanner.apartment') }}:</strong> {{ scanResult.apartment?.number }}
              </div>
              <div class="mb-2">
                <strong>{{ $t('qrScanner.building') }}:</strong> {{ scanResult.building?.name }}
              </div>
              <div>
                <strong>UUID:</strong> <code class="text-muted">{{ scanResult.uuid }}</code>
              </div>
            </div>
          </CCardBody>
        </CCard>

        <div class="mt-3 d-flex gap-2 justify-content-center">
          <CButton color="success" @click="navigateToApartment">
            <CIcon icon="cil-arrow-right" class="me-2" />
            {{ $t('qrScanner.goToFlushing') }}
          </CButton>
          <CButton color="secondary" variant="outline" @click="resetScanner">
            <CIcon icon="cil-reload" class="me-2" />
            {{ $t('qrScanner.scanAgain') }}
          </CButton>
        </div>
      </div>
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" @click="handleClose">
        {{ $t('common.close') }}
      </CButton>
    </CModalFooter>
  </CModal>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BrowserMultiFormatReader } from '@zxing/library'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CSpinner,
  CAlert,
  CCard,
  CCardBody
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { useApartmentStorage } from '@/stores/ApartmentStorage.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'scan-success', 'close'])

const router = useRouter()
const { t } = useI18n()
const apartmentStorage = useApartmentStorage()

// Refs
const videoElement = ref(null)
const cameraView = ref(null)
const isLoading = ref(false)
const error = ref(null)
const scanResult = ref(null)
const codeReader = ref(null)
const selectedDeviceId = ref(null)

// Methods
const initScanner = async () => {
  if (!props.visible) return

  isLoading.value = true
  error.value = null

  try {
    // Erstelle CodeReader
    codeReader.value = new BrowserMultiFormatReader()

    // Hole verfügbare Kameras
    const videoInputDevices = await codeReader.value.listVideoInputDevices()

    if (videoInputDevices.length === 0) {
      throw new Error(t('qrScanner.noCameraFound'))
    }

    // Bevorzuge Rückkamera auf Mobilgeräten
    const backCamera = videoInputDevices.find(device =>
      device.label.toLowerCase().includes('back') ||
      device.label.toLowerCase().includes('rear')
    )
    selectedDeviceId.value = backCamera?.deviceId || videoInputDevices[0].deviceId

    // Starte Scanning
    await codeReader.value.decodeFromVideoDevice(
      selectedDeviceId.value,
      videoElement.value,
      (result, err) => {
        if (result) {
          handleScanResult(result.getText())
        }
        if (err && !(err.name === 'NotFoundException')) {
          console.error('Scanner error:', err)
        }
      }
    )

    isLoading.value = false
  } catch (err) {
    console.error('Failed to initialize scanner:', err)
    error.value = err.message || t('qrScanner.initError')
    isLoading.value = false
  }
}

const handleScanResult = (scannedData) => {
  console.log('📷 QR-Code gescannt:', scannedData)

  try {
    // Parse UUID aus gescanntem Daten
    let uuid = scannedData

    // Falls es eine URL ist, extrahiere die UUID
    if (scannedData.includes('uuid=')) {
      const urlParams = new URLSearchParams(scannedData.split('?')[1])
      uuid = urlParams.get('uuid')
    }

    if (!uuid) {
      throw new Error(t('qrScanner.invalidQRCode'))
    }

    // Suche Apartment anhand der UUID
    const apartment = findApartmentByUUID(uuid)

    if (!apartment) {
      throw new Error(t('qrScanner.apartmentNotFound'))
    }

    // Hole Gebäude-Info
    const building = apartmentStorage.storage.getBuilding(apartment.building_id)

    scanResult.value = {
      uuid,
      apartment,
      building
    }

    // Stoppe Scanner
    stopScanner()

    // Emit success event
    emit('scan-success', scanResult.value)

    // Auto-Navigation nach 2 Sekunden
    setTimeout(() => {
      navigateToApartment()
    }, 2000)

  } catch (err) {
    console.error('Error processing scan result:', err)
    error.value = err.message || t('qrScanner.scanError')
  }
}

const findApartmentByUUID = (uuid) => {
  // Durchsuche alle Gebäude und Apartments nach der UUID
  const buildings = apartmentStorage.storage.getAllBuildings()

  for (const building of buildings) {
    const apartments = apartmentStorage.storage.getApartmentsForBuilding(building.id)
    const apartment = apartments.find(apt => apt.qr_code_uuid === uuid)
    if (apartment) {
      return apartment
    }
  }

  return null
}

const navigateToApartment = () => {
  if (!scanResult.value) return

  const { apartment, building } = scanResult.value

  router.push({
    name: 'ApartmentFlushing',
    params: {
      buildingId: apartment.building_id,
      apartmentId: apartment.id
    },
    query: {
      buildingName: building?.name,
      apartmentNumber: apartment.number
    }
  })

  handleClose()
}

const resetScanner = () => {
  scanResult.value = null
  error.value = null
  initScanner()
}

const stopScanner = () => {
  if (codeReader.value) {
    codeReader.value.reset()
  }
}

const handleClose = () => {
  stopScanner()
  scanResult.value = null
  error.value = null
  emit('update:visible', false)
  emit('close')
}

// Watch für Modal-Sichtbarkeit
watch(() => props.visible, (newValue) => {
  if (newValue) {
    // Verzögere Initialisierung, damit Modal-Animation abgeschlossen ist
    setTimeout(() => {
      initScanner()
    }, 300)
  } else {
    stopScanner()
  }
})

// Cleanup
onUnmounted(() => {
  stopScanner()
})
</script>

<style scoped>
.scanner-container {
  position: relative;
}

.camera-view {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.scanner-frame {
  width: 250px;
  height: 250px;
  border: 3px solid #fff;
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  position: relative;
}

.scanner-frame::before,
.scanner-frame::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid var(--cui-success);
}

.scanner-frame::before {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
}

.scanner-frame::after {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
}

.scan-result {
  text-align: center;
}

.success-icon {
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

.apartment-info {
  text-align: left;
}

code {
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

[data-coreui-theme="dark"] code {
  background: #2c3034;
}

/* Responsive */
@media (max-width: 576px) {
  .scanner-frame {
    width: 200px;
    height: 200px;
  }
}
</style>

