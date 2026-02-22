<template>
  <div class="qr-scanner-page">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>
              <CIcon icon="cil-qr-code" class="me-2" />
              {{ $t('qrScanner.title') }}
            </h2>
            <p class="text-muted mb-0">{{ $t('qrScanner.instructions') }}</p>
          </div>
          <div>
            <CButton
              color="primary"
              size="lg"
              @click="showScanner = true"
              :disabled="showScanner">
              <CIcon icon="cil-camera" class="me-2" />
              {{ $t('qrScanner.startScanning') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Info Cards -->
    <CRow class="mb-4">
      <CCol md="4">
        <CCard class="h-100">
          <CCardBody class="text-center">
            <CIcon icon="cil-qr-code" size="3xl" class="text-primary mb-3" />
            <h5>{{ $t('qrScanner.howItWorks') }}</h5>
            <p class="text-muted small">
              {{ $t('qrScanner.howItWorksDesc') }}
            </p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="4">
        <CCard class="h-100">
          <CCardBody class="text-center">
            <CIcon icon="cil-speedometer" size="3xl" class="text-success mb-3" />
            <h5>{{ $t('qrScanner.quickAccess') }}</h5>
            <p class="text-muted small">
              {{ $t('qrScanner.quickAccessDesc') }}
            </p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="4">
        <CCard class="h-100">
          <CCardBody class="text-center">
            <CIcon icon="cil-wifi-signal-off" size="3xl" class="text-info mb-3" />
            <h5>{{ $t('qrScanner.offlineCapable') }}</h5>
            <p class="text-muted small">
              {{ $t('qrScanner.offlineCapableDesc') }}
            </p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Scanner Statistics -->
    <CRow v-if="scanHistory.length > 0" class="mb-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <h5>
              <CIcon icon="cil-history" class="me-2" />
              {{ $t('qrScanner.recentScans') }}
            </h5>
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>{{ $t('qrScanner.timestamp') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('qrScanner.apartment') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('qrScanner.building') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('common.actions') }}</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                <CTableRow v-for="(scan, index) in scanHistory" :key="index">
                  <CTableDataCell>
                    <small>{{ formatDateTime(scan.timestamp) }}</small>
                  </CTableDataCell>
                  <CTableDataCell>
                    <strong>{{ scan.apartment.number }}</strong>
                    <small class="text-muted d-block">{{ $t('flushing.floor') }}: {{ scan.apartment.floor }}</small>
                  </CTableDataCell>
                  <CTableDataCell>{{ scan.building.name }}</CTableDataCell>
                  <CTableDataCell>
                    <CButton
                      color="primary"
                      size="sm"
                      variant="outline"
                      @click="navigateToApartment(scan)">
                      <CIcon icon="cil-arrow-right" class="me-1" />
                      {{ $t('qrScanner.goToFlushing') }}
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Instructions -->
    <CCard>
      <CCardHeader>
        <h5>
          <CIcon icon="cil-info" class="me-2" />
          {{ $t('qrScanner.instructions') }}
        </h5>
      </CCardHeader>
      <CCardBody>
        <CRow>
          <CCol md="6">
            <h6>{{ $t('qrScanner.requirements') }}</h6>
            <ul class="mb-3">
              <li>{{ $t('qrScanner.requirementCamera') }}</li>
              <li>{{ $t('qrScanner.requirementPermission') }}</li>
              <li>{{ $t('qrScanner.requirementQRCode') }}</li>
            </ul>
          </CCol>
          <CCol md="6">
            <h6>{{ $t('qrScanner.steps') }}</h6>
            <ol>
              <li>{{ $t('qrScanner.step1') }}</li>
              <li>{{ $t('qrScanner.step2') }}</li>
              <li>{{ $t('qrScanner.step3') }}</li>
              <li>{{ $t('qrScanner.step4') }}</li>
            </ol>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>

    <!-- QR-Code Scanner Modal -->
    <QRCodeScanner
      :visible="showScanner"
      @update:visible="showScanner = $event"
      @scan-success="handleScanSuccess"
      @close="showScanner = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatDateTime } from '@/utils/dateFormatter.js'
import { defineAsyncComponent } from 'vue'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'
const QRCodeScanner = defineAsyncComponent(() => import('@/components/QRCodeScanner.vue'))
import {
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'

const router = useRouter()
const showScanner = ref(false)
const scanHistory = ref([])

// Lade Scan-Historie aus IndexedDB
const loadScanHistory = async () => {
  try {
    const result = await indexedDBHelper.get(STORES.SETTINGS, 'qr_scan_history')
    if (result?.value) {
      scanHistory.value = result.value
    }
  } catch (error) {
    console.error('Fehler beim Laden der Scan-Historie:', error)
  }
}

// Speichere Scan in Historie
const saveScanToHistory = async (scan) => {
  try {
    scanHistory.value.unshift({
      ...scan,
      timestamp: new Date().toISOString()
    })

    // Behalte nur die letzten 10 Scans
    if (scanHistory.value.length > 10) {
      scanHistory.value = scanHistory.value.slice(0, 10)
    }

    await indexedDBHelper.set(STORES.SETTINGS, { key: 'qr_scan_history', value: scanHistory.value })
  } catch (error) {
    console.error('Fehler beim Speichern der Scan-Historie:', error)
  }
}

// Handle successful scan
const handleScanSuccess = (result) => {
  console.log('Scan erfolgreich:', result)
  saveScanToHistory(result)
  showScanner.value = false
}

// Navigate to apartment
const navigateToApartment = (scan) => {
  router.push({
    name: 'ApartmentFlushing',
    params: {
      buildingId: scan.apartment.building_id,
      apartmentId: scan.apartment.id
    },
    query: {
      buildingName: scan.building?.name,
      apartmentNumber: scan.apartment.number
    }
  })
}

// Load history on mount
loadScanHistory()
</script>

<style scoped>
.qr-scanner-page {
  min-height: 100vh;
}

.card-body .text-center svg {
  opacity: 0.8;
}

.card-body .text-center:hover svg {
  opacity: 1;
  transform: scale(1.1);
  transition: all 0.3s ease;
}
</style>

