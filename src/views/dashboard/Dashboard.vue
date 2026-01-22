<template>
  <div class="dashboard">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>{{ $t('dashboard.title') }}</h2>
            <p class="text-muted mb-0">{{ $t('dashboard.subtitle') }}</p>
          </div>
          <div class="d-flex gap-2">
            <CButton
              color="primary"
              @click="loadWorkStats"
              :disabled="!statisticsAvailable">
              <CIcon icon="cil-reload" class="me-2" />
              {{ $t('common.refresh') }}
            </CButton>
            <!-- Export-Dropdown nur für Admins sichtbar -->
            <CDropdown v-if="isAdmin">
              <CDropdownToggle
                color="info"
                variant="outline"
                :disabled="!statisticsAvailable">
                <CIcon icon="cil-cloud-download" class="me-2" />
                {{ $t('dashboard.export') }} {{ selectedMonthFormatted }}
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownHeader>{{ $t('dashboard.selectMonth') }}:</CDropdownHeader>
                <CDropdownItem
                  v-for="month in availableMonths"
                  :key="month.value"
                  @click="selectedMonth = month.value"
                  :active="selectedMonth === month.value">
                  <CIcon
                    :icon="selectedMonth === month.value ? 'cil-check' : 'cil-calendar'"
                    class="me-2"
                  />
                  {{ month.label }}
                </CDropdownItem>
                <CDropdownDivider />
                <CDropdownItem @click="exportToPrint">
                  <CIcon icon="cil-print" class="me-2" />
                  {{ $t('dashboard.print') }}
                </CDropdownItem>
                <CDropdownItem @click="exportToCSV">
                  <CIcon icon="cil-spreadsheet" class="me-2"  />
                  {{ $t('dashboard.exportCSV') }}
                </CDropdownItem>
                <CDropdownDivider />
                <CDropdownItem @click="exportCurrentMonth">
                  <CIcon icon="cil-data-transfer-down" class="me-2" />
                  Raw-Daten (Debug)
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Offline Data Preload Card -->
    <OfflineDataPreloadCard />

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <CSpinner color="primary" />
      <p class="mt-2">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Main Statistics Cards -->
    <CRow v-if="!loading && !error && workStats && statisticsAvailable" class="mb-4">
      <CCol md="3">
        <CCard class="text-center h-100" style="min-height: 180px;">
          <CCardBody class="d-flex flex-column justify-content-center">
            <CIcon icon="cil-task" size="3xl" class="text-primary mb-3" />
            <h3 class="text-primary">{{ workStats.total_entries }}</h3>
            <p class="text-muted mb-0">{{ $t('common.total') }} {{ $t('dashboard.entries') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center h-100" style="min-height: 180px;">
          <CCardBody class="d-flex flex-column justify-content-center">
            <CIcon icon="cil-clock" size="3xl" class="text-success mb-3" />
            <h3 class="text-success">{{ workStats.total_duration_formatted }}</h3>
            <p class="text-muted mb-0">{{ $t('common.duration') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center h-100" style="min-height: 180px;">
          <CCardBody class="d-flex flex-column justify-content-center">
            <CIcon icon="cil-calendar" size="3xl" class="text-warning mb-3" />
            <h3 class="text-warning">{{ workStats.total_days_worked }}</h3>
            <p class="text-muted mb-0">{{ $t('dashboard.totalDays') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center h-100" style="min-height: 180px;">
          <CCardBody class="d-flex flex-column justify-content-center">
            <CIcon icon="cil-speedometer" size="3xl" class="text-info mb-3" />
            <h3 class="text-info">{{ averageEntriesPerDay }}</h3>
            <p class="text-muted mb-0">{{ $t('dashboard.avgPerDay') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Secondary Statistics Cards -->
    <CRow v-if="!loading && !error && workStats && workStats.averages && statisticsAvailable" class="mb-4">
      <CCol md="4" class="mb-3">
        <CCard class="text-center h-100">
          <CCardBody class="d-flex flex-column">
            <CIcon icon="cil-timer" size="xl" class="text-primary mb-2" />
            <h4 class="text-primary">{{ workStats.averages.avg_duration_per_entry_formatted }}</h4>
            <p class="text-muted mb-0 mt-auto">{{ $t('dashboard.avgDurationPerEntry') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="4" class="mb-3">
        <CCard class="text-center h-100">
          <CCardBody class="d-flex flex-column">
            <CIcon icon="cil-calendar-check" size="xl" class="text-success mb-2" />
            <h4 class="text-success">{{ workStats.averages.avg_duration_per_day_formatted }}</h4>
            <p class="text-muted mb-0 mt-auto">{{ $t('dashboard.avgWorkTimePerDay') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="4" class="mb-3">
        <CCard class="text-center h-100">
          <CCardBody class="d-flex flex-column">
            <CIcon icon="cil-history" size="xl" class="text-warning mb-2" />
            <h4 class="text-warning">{{ workStats.averages.avg_work_span_per_day_formatted }}</h4>
            <p class="text-muted mb-0 mt-auto">{{ $t('dashboard.avgWorkSpanPerDay') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Efficiency Metrics -->
    <CRow v-if="!loading && !error && workStats && workStats.efficiency_metrics && statisticsAvailable" class="mb-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cil-gauge" class="me-2" />
              {{ $t('dashboard.efficiencyMetrics') }}
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-success">{{ workStats.efficiency_metrics.shortest_duration_formatted || '-' }}</h4>
                  <p class="text-muted mb-0">{{ $t('dashboard.shortestDuration') }}</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-danger">{{ workStats.efficiency_metrics.longest_duration_formatted || '-' }}</h4>
                  <p class="text-muted mb-0">{{ $t('dashboard.longestDuration') }}</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-primary">{{ workStats.efficiency_metrics.median_duration_formatted || '-' }}</h4>
                  <p class="text-muted mb-0">{{ $t('dashboard.medianDuration') }}</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-warning">{{ averageEntriesPerDay }}</h4>
                  <p class="text-muted mb-0">{{ $t('dashboard.avgPerDay') }}</p>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- GPS Statistics -->
    <CRow v-if="!loading && !error && workStats && workStats.gps_statistics && workStats.gps_statistics.total_gps_entries > 0 && statisticsAvailable" class="mb-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cil-location-pin" class="me-2" />
              {{ $t('dashboard.gpsStatistics') }}
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-success">{{ workStats.gps_statistics.total_gps_entries }}</h4>
                  <p class="text-muted mb-0">{{ $t('dashboard.gpsEntries') }}</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-info">{{ workStats.gps_statistics.avg_accuracy }}m</h4>
                  <p class="text-muted mb-0">{{ $t('dashboard.avgAccuracy') }}</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-success">{{ workStats.gps_statistics.best_accuracy }}m</h4>
                  <p class="text-muted mb-0">{{ $t('dashboard.bestAccuracy') }}</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-warning">{{ workStats.gps_statistics.worst_accuracy }}m</h4>
                  <p class="text-muted mb-0">{{ $t('dashboard.worstAccuracy') }}</p>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Detailed Statistics Tables -->
    <CRow v-if="!loading && !error && workStats && statisticsAvailable">
      <!-- Daily Statistics Table -->
      <CCol lg="6" class="mb-4">
        <CCard>
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cil-list" class="me-2" />
              {{ $t('dashboard.dailyDetails') }}
            </h5>
          </CCardHeader>
          <CCardBody class="p-0">
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>{{ $t('dashboard.date') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('dashboard.entries') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('common.duration') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('dashboard.timeSpan') }}</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                <CTableRow v-for="day in recentDays" :key="day.date">
                  <CTableDataCell>{{ formatDate(day.date) }}</CTableDataCell>
                  <CTableDataCell>{{ day.entries }}</CTableDataCell>
                  <CTableDataCell>{{ day.total_duration_formatted }}</CTableDataCell>
                  <CTableDataCell>{{ day.work_span_formatted }}</CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <!-- Apartment Statistics Table -->
      <CCol lg="6" class="mb-4">
        <CCard>
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cil-home" class="me-2" />
              {{ $t('dashboard.apartmentStatistics') }}
            </h5>
          </CCardHeader>
          <CCardBody class="p-0">
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>{{ $t('dashboard.apartment') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('dashboard.entries') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('dashboard.totalDuration') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('dashboard.avgDuration') }}</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                <CTableRow v-for="apt in workStats.apartment_statistics" :key="apt.apartment_id">
                  <CTableDataCell>
                    <CBadge color="info">{{ apt.apartment_id }}</CBadge>
                  </CTableDataCell>
                  <CTableDataCell>{{ apt.total_entries }}</CTableDataCell>
                  <CTableDataCell>{{ apt.total_duration_formatted }}</CTableDataCell>
                  <CTableDataCell>{{ apt.avg_duration_per_entry_formatted }}</CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Empty State -->
    <div v-if="!loading && !error && !workStats" class="text-center py-5">
      <CIcon icon="cil-chart" size="4xl" class="text-muted mb-3" />
      <h4 class="text-muted">{{ $t('dashboard.noStatisticsAvailable') }}</h4>
      <p class="text-muted">{{ $t('dashboard.noStatisticsYet') }}</p>
      <CButton color="primary" @click="loadWorkStats">
        <CIcon icon="cil-reload" class="me-2" />
        {{ $t('dashboard.loadStatistics') }}
      </CButton>
    </div>

    <!-- QR-Code Scanner Modal -->
    <QRCodeScanner
      :visible="showQRScanner"
      @update:visible="showQRScanner = $event"
      @close="showQRScanner = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { formatDate, formatMonthYear } from '@/utils/dateFormatter.js'
import { useApiStats } from '@/api/ApiStats.js'
import { getCurrentUser, isAdmin } from '@/stores/GlobalUser.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import OfflineDataPreloadCard from '@/components/OfflineDataPreloadCard.vue'
import { defineAsyncComponent } from 'vue'
const QRCodeScanner = defineAsyncComponent(() => import('@/components/QRCodeScanner.vue'))
import {
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CBadge,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CDropdownDivider,
  CDropdownHeader
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'

const { workStats, error, loading, getWorkStats, exportMonth, downloadExportAsCSV, openPrintView } = useApiStats()
const onlineStatusStore = useOnlineStatusStore()

// Letztes Export-Ergebnis zwischenspeichern
const lastExportData = ref(null)

// QR-Scanner State
const showQRScanner = ref(false)

// Prüfung ob Statistiken verfügbar sind
const statisticsAvailable = computed(() => {
  // Statistiken sind nur online verfügbar
  return onlineStatusStore.isFullyOnline
})

// User-ID aus LocalStorage oder GlobalUser Store
const currentUserId = computed(() => {
  // Zuerst versuchen wir es aus dem GlobalUser Store
  const user = getCurrentUser()
  if (user && user.id) {
    return user.id
  }

  // Fallback auf LocalStorage
  const userId = localStorage.getItem('userId') || localStorage.getItem('wls_user_id')
  return userId ? parseInt(userId, 10) : null
})

// Admin-Prüfung aus dem globalen User-Store (reactive)
// Das importierte `isAdmin` ist bereits ein reactive computed und steht dem Template direkt zur Verfügung

const currentMonth = computed(() => {
  return formatMonthYear(new Date())
})

// Monatsauswahl für die letzten 12 Monate
const availableMonths = computed(() => {
  const months = []
  for (let i = 0; i < 12; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthLabel = formatMonthYear(date)
    months.push({ value: date.toISOString().slice(0, 7), label: monthLabel })
  }
  return months.reverse()
})

const selectedMonth = ref(new Date().toISOString().slice(0, 7))

// Formatierter Monat für die Anzeige
const selectedMonthFormatted = computed(() => {
  const month = availableMonths.value.find(m => m.value === selectedMonth.value)
  return month ? month.label : ''
})

// Sichere Computed-Werte für das Template
const averageEntriesPerDay = computed(() => {
  if (!workStats.value || !workStats.value.averages) return '-'
  const avg = workStats.value.averages.avg_entries_per_day
  return avg ? Math.round(avg * 100) / 100 : '-'
})

const recentDays = computed(() => {
  if (!workStats.value || !workStats.value.daily_statistics) return []
  return workStats.value.daily_statistics.slice(-10)
})

// Statistiken laden
async function loadWorkStats() {
  // Prüfe ob Statistiken verfügbar sind (nur online)
  if (!statisticsAvailable.value) {
    console.warn('⚠️ Statistiken sind nur im Online-Modus verfügbar')
    error.value = 'Statistiken sind nur im Online-Modus verfügbar. Bitte stellen Sie eine Verbindung zum Server her.'
    return
  }

  const userId = currentUserId.value
  if (!userId) {
    error.value = 'Keine Benutzer-ID gefunden. Bitte melden Sie sich erneut an.'
    return
  }

  console.log(`📊 Lade Arbeitsstatistiken für Benutzer ${userId}`)
  await getWorkStats(userId, selectedMonth.value)
}

// Export des gewählten Monats
async function exportSelectedMonth() {
  if (!statisticsAvailable.value) {
    console.warn('⚠️ Export ist nur im Online-Modus verfügbar')
    error.value = 'Export ist nur im Online-Modus verfügbar.'
    return
  }

  console.log(`📤 Exportiere gewählten Monat ${selectedMonth.value}`)

  const exportData = await exportMonth(selectedMonth.value)
  if (exportData) {
    lastExportData.value = exportData
    console.log('✅ Export-Daten erhalten:', exportData)
  }
}

// Druckansicht öffnen
async function exportToPrint() {
  if (!statisticsAvailable.value) {
    console.warn('⚠️ Druckansicht ist nur im Online-Modus verfügbar')
    error.value = 'Druckansicht ist nur im Online-Modus verfügbar.'
    return
  }

  console.log(`🖨️ Druckansicht wird geöffnet für ${selectedMonth.value}...`)

  // Export-Daten für gewählten Monat laden
  await exportSelectedMonth()

  if (lastExportData.value) {
    openPrintView(lastExportData.value)
  } else {
    error.value = 'Keine Export-Daten verfügbar für die Druckansicht'
  }
}

// Als CSV herunterladen
async function exportToCSV() {
  if (!statisticsAvailable.value) {
    console.warn('⚠️ CSV-Download ist nur im Online-Modus verfügbar')
    error.value = 'CSV-Download ist nur im Online-Modus verfügbar.'
    return
  }

  console.log(`⬇️ CSV-Download gestartet für ${selectedMonth.value}...`)

  // Export-Daten für gewählten Monat laden
  await exportSelectedMonth()

  if (lastExportData.value) {
    const filename = `arbeitszeit-export-${lastExportData.value.export_month}`
    downloadExportAsCSV(lastExportData.value, filename)
  } else {
    error.value = 'Keine Export-Daten verfügbar für den CSV-Download'
  }
}

// QR-Scanner öffnen
function openQRScanner() {
  showQRScanner.value = true
}

// Debug-Funktion für Raw-Daten
async function exportCurrentMonth() {
  console.log(`🔧 Debug: Exportiere gewählten Monat ${selectedMonth.value}`)
  await exportSelectedMonth()
}


// Initial laden beim Mount
onMounted(() => {
  console.log('🚀 Dashboard geladen')

  if (statisticsAvailable.value) {
    console.log('📊 Online-Modus erkannt, lade Statistiken...')
    loadWorkStats()
  } else {
    console.log('📴 Offline-Modus erkannt, Statistiken werden nicht geladen')
  }
})
</script>

<style scoped src="@/styles/views/Dashboard.css"></style>
