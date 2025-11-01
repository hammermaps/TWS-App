<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Dashboard</h2>
        <p class="text-muted mb-0">Übersicht über die Arbeitsstatistiken</p>
      </div>
      <div class="d-flex gap-2">
        <CButton
          color="primary"
          @click="loadWorkStats"
          :disabled="!statisticsAvailable">
          <CIcon icon="cil-reload" class="me-2" />
          Aktualisieren
        </CButton>
        <CDropdown>
          <CDropdownToggle
            color="info"
            variant="outline"
            :disabled="!statisticsAvailable">
            <CIcon icon="cil-cloud-download" class="me-2" />
            Export {{ selectedMonthFormatted }}
          </CDropdownToggle>
          <CDropdownMenu>
            <CDropdownHeader>Monat auswählen:</CDropdownHeader>
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
              Druckansicht öffnen
            </CDropdownItem>
            <CDropdownItem @click="exportToCSV">
              <CIcon icon="cil-spreadsheet" class="me-2" />
              Als CSV herunterladen
            </CDropdownItem>
            <CDropdownDivider />
            <CDropdownItem @click="exportCurrentMonth" disabled>
              <CIcon icon="cil-data-transfer-down" class="me-2" />
              Raw-Daten (Debug)
            </CDropdownItem>
          </CDropdownMenu>
        </CDropdown>
      </div>
    </div>

    <!-- Offline-Modus Warnung -->
    <CAlert
      v-if="!statisticsAvailable"
      color="warning"
      class="d-flex align-items-center mb-4">
      <CIcon icon="cil-warning" size="lg" class="me-3" />
      <div>
        <strong>Offline-Modus aktiv</strong>
        <p class="mb-0 mt-1">
          Statistiken und Export-Funktionen sind nur im Online-Modus verfügbar.
          <span v-if="!onlineStatusStore.isOnline">
            Keine Netzwerkverbindung erkannt.
          </span>
          <span v-else-if="!onlineStatusStore.isServerReachable">
            Server ist nicht erreichbar.
          </span>
          <span v-else-if="onlineStatusStore.manualOfflineMode">
            Sie haben manuell in den Offline-Modus gewechselt.
          </span>
        </p>
      </div>
    </CAlert>

    <!-- Offline Data Preload Card -->
    <OfflineDataPreloadCard />

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <CSpinner color="primary" />
      <p class="mt-2">Lade Statistiken...</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>Fehler:</strong> {{ error }}
    </CAlert>

    <!-- Main Statistics Cards -->
    <CRow v-if="!loading && !error && workStats && statisticsAvailable" class="mb-4">
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <CIcon icon="cil-task" size="3xl" class="text-primary mb-3" />
            <h3 class="text-primary">{{ workStats.total_entries }}</h3>
            <p class="text-muted mb-0">Gesamt Einträge</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <CIcon icon="cil-clock" size="3xl" class="text-success mb-3" />
            <h3 class="text-success">{{ workStats.total_duration_formatted }}</h3>
            <p class="text-muted mb-0">Gesamtdauer</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <CIcon icon="cil-calendar" size="3xl" class="text-warning mb-3" />
            <h3 class="text-warning">{{ workStats.total_days_worked }}</h3>
            <p class="text-muted mb-0">Arbeitstage</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <CIcon icon="cil-speedometer" size="3xl" class="text-info mb-3" />
            <h3 class="text-info">{{ averageEntriesPerDay }}</h3>
            <p class="text-muted mb-0">Ø Einträge/Tag</p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Secondary Statistics Cards -->
    <CRow v-if="!loading && !error && workStats && workStats.averages && statisticsAvailable" class="mb-4">
      <CCol md="4">
        <CCard class="text-center">
          <CCardBody>
            <CIcon icon="cil-timer" size="xl" class="text-primary mb-2" />
            <h4 class="text-primary">{{ workStats.averages.avg_duration_per_entry_formatted }}</h4>
            <p class="text-muted mb-0">Ø Dauer pro Eintrag</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="4">
        <CCard class="text-center">
          <CCardBody>
            <CIcon icon="cil-calendar-check" size="xl" class="text-success mb-2" />
            <h4 class="text-success">{{ workStats.averages.avg_duration_per_day_formatted }}</h4>
            <p class="text-muted mb-0">Ø Arbeitszeit/Tag</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="4">
        <CCard class="text-center">
          <CCardBody>
            <CIcon icon="cil-history" size="xl" class="text-warning mb-2" />
            <h4 class="text-warning">{{ workStats.averages.avg_work_span_per_day_formatted }}</h4>
            <p class="text-muted mb-0">Ø Arbeitsspanne/Tag</p>
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
              Effizienz-Metriken
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-success">{{ workStats.efficiency_metrics.shortest_duration_formatted || '-' }}</h4>
                  <p class="text-muted mb-0">Kürzeste Dauer</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-danger">{{ workStats.efficiency_metrics.longest_duration_formatted || '-' }}</h4>
                  <p class="text-muted mb-0">Längste Dauer</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-primary">{{ workStats.efficiency_metrics.median_duration_formatted || '-' }}</h4>
                  <p class="text-muted mb-0">Median Dauer</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-warning">{{ averageEntriesPerDay }}</h4>
                  <p class="text-muted mb-0">Ø Einträge/Tag</p>
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
              GPS-Statistiken
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-success">{{ workStats.gps_statistics.total_gps_entries }}</h4>
                  <p class="text-muted mb-0">GPS Einträge</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-info">{{ workStats.gps_statistics.avg_accuracy }}m</h4>
                  <p class="text-muted mb-0">Ø Genauigkeit</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-success">{{ workStats.gps_statistics.best_accuracy }}m</h4>
                  <p class="text-muted mb-0">Beste Genauigkeit</p>
                </div>
              </CCol>
              <CCol md="3">
                <div class="text-center p-3 border rounded">
                  <h4 class="text-warning">{{ workStats.gps_statistics.worst_accuracy }}m</h4>
                  <p class="text-muted mb-0">Schlechteste Genauigkeit</p>
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
              Tägliche Details (letzte 10 Tage)
            </h5>
          </CCardHeader>
          <CCardBody class="p-0">
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Datum</CTableHeaderCell>
                  <CTableHeaderCell>Einträge</CTableHeaderCell>
                  <CTableHeaderCell>Dauer</CTableHeaderCell>
                  <CTableHeaderCell>Zeitspanne</CTableHeaderCell>
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
              Apartment-Statistiken
            </h5>
          </CCardHeader>
          <CCardBody class="p-0">
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Apartment</CTableHeaderCell>
                  <CTableHeaderCell>Einträge</CTableHeaderCell>
                  <CTableHeaderCell>Gesamtdauer</CTableHeaderCell>
                  <CTableHeaderCell>Ø Dauer</CTableHeaderCell>
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
      <h4 class="text-muted">Keine Statistiken verfügbar</h4>
      <p class="text-muted">Es sind noch keine Arbeitsstatistiken vorhanden.</p>
      <CButton color="primary" @click="loadWorkStats">
        <CIcon icon="cil-reload" class="me-2" />
        Statistiken laden
      </CButton>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue'
import { useApiStats } from '@/api/ApiStats.js'
import { getCurrentUser } from '@/stores/GlobalUser.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import OfflineDataPreloadCard from '@/components/OfflineDataPreloadCard.vue'
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

const currentMonth = computed(() => {
  return new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })
})

// Monatsauswahl für die letzten 12 Monate
const availableMonths = computed(() => {
  const months = []
  for (let i = 0; i < 12; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthLabel = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })
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

// Debug-Funktion für Raw-Daten
async function exportCurrentMonth() {
  console.log(`🔧 Debug: Exportiere gewählten Monat ${selectedMonth.value}`)
  await exportSelectedMonth()
}

// Datum formatieren
function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    return dateString
  }
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
