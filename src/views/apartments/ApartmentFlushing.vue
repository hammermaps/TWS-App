<template>
  <div class="apartment-flushing">
    <!-- Header mit Navigation -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Spülung - Apartment {{ apartmentNumber || apartmentId }}</h2>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <router-link to="/buildings" class="text-decoration-none">
                Gebäude
              </router-link>
            </li>
            <li class="breadcrumb-item">
              <router-link
                :to="{
                  name: 'BuildingApartments',
                  params: { id: buildingId },
                  query: { buildingName }
                }"
                class="text-decoration-none"
              >
                {{ buildingName || `Gebäude #${buildingId}` }}
              </router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">
              Apartment {{ apartmentNumber || apartmentId }}
            </li>
          </ol>
        </nav>
      </div>
      <div class="d-flex align-items-center gap-2">
        <!-- Offline/Sync Status -->
        <div v-if="syncStatus && syncStatus.unsyncedCount > 0" class="me-3">
          <CBadge
            :color="syncStatus.isOnline ? 'warning' : 'danger'"
            class="d-flex align-items-center gap-1"
          >
            <CIcon :icon="syncStatus.isOnline ? 'cil-cloud-upload' : 'cil-wifi-off'" size="sm" />
            {{ syncStatus.unsyncedCount }} unsynced
          </CBadge>
        </div>

        <!-- Offline Indicator -->
        <div v-if="!isOnline" class="me-3">
          <CBadge color="secondary" class="d-flex align-items-center gap-1">
            <CIcon icon="cil-wifi-off" size="sm" />
            Offline-Modus
          </CBadge>
        </div>

        <CFormCheck
          v-model="autoNavigate"
          label="Zur nächsten Wohnung springen"
          class="me-3"
        />

        <!-- Sync Button (nur wenn offline Items vorhanden) -->
        <CButton
          v-if="syncStatus && syncStatus.unsyncedCount > 0 && isOnline"
          color="info"
          variant="outline"
          size="sm"
          @click="forceSyncFlushes"
          :disabled="syncStatus.isSyncing"
          class="me-2"
        >
          <CIcon icon="cil-reload" :class="{ 'fa-spin': syncStatus.isSyncing }" />
          Sync
        </CButton>

        <CButton color="secondary" variant="outline" @click="goBack">
          <CIcon icon="cil-arrow-left" class="me-2" />
          Zurück
        </CButton>
      </div>
    </div>

    <!-- Offline Alert -->
    <CAlert v-if="!isOnline" color="warning" :visible="true" class="mb-4">
      <CIcon icon="cil-wifi-off" class="me-2" />
      <strong>Offline-Modus:</strong> Spülungen werden lokal gespeichert und automatisch synchronisiert, sobald eine Internetverbindung verfügbar ist.
    </CAlert>

    <!-- Loading State -->
    <div v-if="loading" class="text-center">
      <CSpinner color="primary" />
      <p class="mt-2">Lade Apartment-Daten...</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>Fehler:</strong> {{ error }}
    </CAlert>

    <!-- Main Content -->
    <CRow v-if="!loading && !error && currentApartment">
      <!-- Spül-Steuerung -->
      <CCol lg="6">
        <CCard class="h-100">
          <CCardHeader>
            <h5>
              <CIcon icon="cil-drop" class="me-2" />
              Spül-Steuerung
            </h5>
          </CCardHeader>
          <CCardBody class="text-center">
            <div v-if="!currentApartment.enabled" class="alert alert-warning">
              <CIcon icon="cil-warning" class="me-2" />
              Dieses Apartment ist deaktiviert und kann nicht gespült werden.
            </div>

            <div v-else>
              <p class="mb-4">
                <strong>Mindestspüldauer:</strong> {{ currentApartment.min_flush_duration }} Sekunden
              </p>

              <!-- Spül-Kreis mit integriertem Start/Stop Button -->
              <div class="flush-circle-container mb-4">
                <div class="position-relative d-inline-block">
                  <svg width="250" height="250" class="flush-circle">
                    <!-- Hintergrund-Kreis -->
                    <circle
                      cx="125"
                      cy="125"
                      r="110"
                      fill="none"
                      stroke="#e9ecef"
                      stroke-width="15"
                    />
                    <!-- Progress-Kreis (nur während Spülung) -->
                    <circle
                      v-if="isFlushingActive"
                      cx="125"
                      cy="125"
                      r="110"
                      fill="none"
                      :stroke="getCountdownColor()"
                      stroke-width="15"
                      stroke-linecap="round"
                      :stroke-dasharray="circumference"
                      :stroke-dashoffset="strokeDashoffset"
                      class="progress-circle"
                    />
                  </svg>

                  <!-- Zentraler Button -->
                  <CButton
                    :color="isFlushingActive ? 'danger' : 'primary'"
                    size="lg"
                    class="flush-control-button"
                    :disabled="flushLoading || (isFlushingActive && !minDurationReached)"
                    @click="toggleFlushing"
                  >
                    <div class="text-center">
                      <CIcon
                        :icon="isFlushingActive ? 'cil-media-stop' : 'cil-media-play'"
                        size="xl"
                        class="mb-2"
                      />
                      <div class="fw-bold">
                        {{ isFlushingActive ? 'STOPP' : 'START' }}
                      </div>
                      <div v-if="isFlushingActive" class="small">
                        {{ remainingTime > 0 ? `${remainingTime}s` : 'Stopp möglich' }}
                      </div>
                    </div>
                  </CButton>
                </div>
              </div>

              <!-- Status Anzeige -->
              <div class="status-display">
                <CBadge
                  :color="getStatusBadgeColor()"
                  class="px-3 py-2 fs-6"
                >
                  <CIcon :icon="getStatusIcon()" class="me-2" />
                  {{ getStatusText() }}
                </CBadge>

                <div v-if="isFlushingActive" class="mt-2">
                  <small class="text-muted">
                    Läuft seit {{ formatDuration(elapsedTime) }}
                  </small>
                </div>
              </div>

              <!-- Offline Success Message -->
              <div v-if="showOfflineSuccess" class="mt-3">
                <CAlert color="info" :visible="true">
                  <CIcon icon="cil-check-circle" class="me-2" />
                  Spülung offline gespeichert. Wird automatisch synchronisiert.
                </CAlert>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      <!-- Apartment-Details -->
      <CCol lg="6">
        <CCard class="h-100">
          <CCardHeader>
            <h5>
              <CIcon icon="cil-home" class="me-2" />
              Apartment-Details
            </h5>
          </CCardHeader>
          <CCardBody>
            <div class="apartment-details">
              <div class="detail-row">
                <strong>Apartment:</strong>
                <span>{{ currentApartment.number }}</span>
              </div>
              <div class="detail-row">
                <strong>Etage:</strong>
                <span>{{ currentApartment.floor || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <strong>Status:</strong>
                <CBadge :color="currentApartment.enabled ? 'success' : 'danger'">
                  {{ currentApartment.enabled ? 'Aktiv' : 'Deaktiviert' }}
                </CBadge>
              </div>
              <div class="detail-row">
                <strong>Mindestspüldauer:</strong>
                <span>{{ currentApartment.min_flush_duration }}s</span>
              </div>
              <div class="detail-row">
                <strong>Letzte Spülung:</strong>
                <span v-if="currentApartment.last_flush_date">
                  {{ formatDate(currentApartment.last_flush_date) }}
                  <small class="text-muted d-block">
                    {{ formatTimeAgo(currentApartment.last_flush_date) }}
                  </small>
                </span>
                <span v-else class="text-muted">Noch nie</span>
              </div>
              <div class="detail-row">
                <strong>Nächste Spülung:</strong>
                <span v-if="currentApartment.next_flush_due">
                  {{ formatDate(currentApartment.next_flush_due) }}
                  <small :class="getNextFlushClass(currentApartment.next_flush_due)" class="d-block">
                    {{ formatTimeToNext(currentApartment.next_flush_due) }}
                  </small>
                </span>
                <span v-else class="text-muted">Nicht geplant</span>
              </div>
            </div>

            <!-- Navigation zu nächstem Apartment -->
            <div v-if="nextApartment" class="mt-4 pt-3 border-top">
              <h6 class="text-muted mb-3">Nächstes Apartment:</h6>
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{{ nextApartment.number }}</strong>
                  <small class="text-muted d-block">
                    Etage {{ nextApartment.floor || 'N/A' }}
                  </small>
                </div>
                <CButton
                  color="primary"
                  variant="outline"
                  @click="goToNextApartment"
                  :disabled="isFlushingActive"
                >
                  <CIcon icon="cil-arrow-right" class="me-2" />
                  Nächstes
                </CButton>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Spül-Historie mit Offline-Spülungen -->
    <CRow v-if="!loading && !error && (recentFlushes.length > 0 || offlineFlushes.length > 0)" class="mt-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <h5>
              <CIcon icon="cil-history" class="me-2" />
              Letzte Spülungen
              <small v-if="offlineFlushes.length > 0" class="text-muted">
                ({{ offlineFlushes.length }} offline)
              </small>
            </h5>
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Datum</CTableHeaderCell>
                  <CTableHeaderCell>Dauer</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Sync</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                <!-- Offline-Spülungen -->
                <CTableRow v-for="flush in offlineFlushes" :key="flush.id" class="table-secondary">
                  <CTableDataCell>
                    {{ formatDate(flush.endTime) }}
                    <small class="text-muted d-block">Offline erstellt</small>
                  </CTableDataCell>
                  <CTableDataCell>{{ flush.duration }}s</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color="info">
                      <CIcon icon="cil-wifi-off" class="me-1" size="sm" />
                      Offline
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge :color="flush.synced ? 'success' : 'warning'">
                      <CIcon :icon="flush.synced ? 'cil-check-circle' : 'cil-clock'" class="me-1" size="sm" />
                      {{ flush.synced ? 'Synced' : 'Pending' }}
                    </CBadge>
                  </CTableDataCell>
                </CTableRow>

                <!-- Online-Spülungen -->
                <CTableRow v-for="flush in recentFlushes" :key="flush.id">
                  <CTableDataCell>{{ formatDate(flush.date) }}</CTableDataCell>
                  <CTableDataCell>{{ flush.duration }}s</CTableDataCell>
                  <CTableDataCell>
                    <CBadge :color="flush.success ? 'success' : 'danger'">
                      {{ flush.success ? 'Erfolgreich' : 'Fehler' }}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color="success">
                      <CIcon icon="cil-cloud-check" class="me-1" size="sm" />
                      Online
                    </CBadge>
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApartmentStorage } from '@/stores/ApartmentStorage.js'
import { useOfflineFlushStorage } from '@/stores/OfflineFlushStorage.js'
import { useOfflineFlushSync } from '@/stores/OfflineFlushSyncService.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import { useApiApartment } from '@/api/ApiApartment.js'
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
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CFormCheck
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'

const route = useRoute()
const router = useRouter()
const apartmentStorage = useApartmentStorage()
const { storage: offlineStorage } = useOfflineFlushStorage()
const { syncService, getSyncStatus, forceSync } = useOfflineFlushSync()
const onlineStatusStore = useOnlineStatusStore()
const { flush, loading: flushLoading, error: flushError } = useApiApartment()

// Route-Parameter
const buildingId = computed(() => route.params.buildingId)
const apartmentId = computed(() => route.params.apartmentId)
const buildingName = computed(() => route.query.buildingName)
const apartmentNumber = computed(() => route.query.apartmentNumber)

// Reactive State
const loading = ref(false)
const error = ref(null)
const currentApartment = ref(null)
const allApartments = ref([])
const autoNavigate = ref(true)

// Offline/Sync State - Verwende Online-Status-Store als einzige Quelle
const isOnline = computed(() => onlineStatusStore.isFullyOnline)
const syncStatus = ref(null)
const offlineFlushes = ref([])
const showOfflineSuccess = ref(false)
let autoSyncInterval = null

// Spül-Status
const isFlushingActive = ref(false)
const flushStartTime = ref(null)
const elapsedTime = ref(0)
const remainingTime = ref(0)
const flushTimer = ref(null)
const minDurationReached = ref(false)

// Berechnungen für Progress-Kreis
const circumference = 2 * Math.PI * 110
const strokeDashoffset = computed(() => {
  if (!isFlushingActive.value || !currentApartment.value) return circumference
  const progress = Math.min(elapsedTime.value / currentApartment.value.min_flush_duration, 1)
  return circumference - (progress * circumference)
})

// Nächstes Apartment (sortiert nach dem 'sorted' Feld) - mit zirkulärer Navigation
const nextApartment = computed(() => {
  if (!currentApartment.value || !allApartments.value.length) return null

  // Sortiere Apartments nach dem 'sorted' Feld (aufsteigend)
  const sortedApartments = [...allApartments.value].sort((a, b) => {
    const sortA = a.sorted || 0
    const sortB = b.sorted || 0
    if (sortA !== sortB) {
      return sortA - sortB
    }
    // Sekundär nach Apartment-Nummer (falls sorted gleich)
    return (a.number || '').localeCompare(b.number || '')
  })

  console.log('🔢 Sortierte Apartments:', sortedApartments.map(apt => `${apt.number}(sorted:${apt.sorted})`))
  const currentIndex = sortedApartments.findIndex(apt => apt.id === currentApartment.value.id)
  console.log('📍 Aktueller Index:', currentIndex, 'von', sortedApartments.length)

  // Zirkuläre Navigation: Nach dem letzten Apartment kommt das erste
  if (currentIndex >= 0) {
    const nextIndex = (currentIndex + 1) % sortedApartments.length
    const next = sortedApartments[nextIndex]

    if (nextIndex === 0) {
      console.log('🔄 Zirkuläre Navigation: Springe zum ersten Apartment:', next.number, 'ID:', next.id)
    } else {
      console.log('➡️ Nächstes Apartment:', next.number, 'ID:', next.id)
    }

    return next
  }

  console.log('⏸️ Apartment nicht in der Liste gefunden')
  return null
})

// Mock-Daten für Historie (später durch echte API ersetzen)
const recentFlushes = ref([])

const loadApartmentData = async () => {
  loading.value = true
  error.value = null

  try {
    // Apartment-Details aus LocalStorage laden
    const apartments = apartmentStorage.storage.getApartmentsForBuilding(buildingId.value)
    allApartments.value = apartments

    console.log('✅ Apartment geladen:', apartmentId.value, 'Min-Duration:', apartments.find(apt => apt.id == apartmentId.value)?.min_flush_duration)
    console.log('📋 Alle Apartments im Gebäude:', apartments.length)
    console.log('🔍 Nächstes Apartment verfügbar:', !!nextApartment.value)

    const apartment = apartments.find(apt => apt.id == apartmentId.value)
    if (apartment) {
      currentApartment.value = apartment

      // Auto-Navigation Einstellung aus LocalStorage laden
      const storedAutoNav = localStorage.getItem('wls_auto_navigate_apartments')
      if (storedAutoNav !== null) {
        autoNavigate.value = JSON.parse(storedAutoNav)
      }

      // Offline-Spülungen laden
      loadOfflineFlushes()
    } else {
      error.value = 'Apartment nicht gefunden'
    }
  } catch (err) {
    error.value = err.message || 'Fehler beim Laden der Apartment-Daten'
  } finally {
    loading.value = false
  }
}

const toggleFlushing = async () => {
  if (isFlushingActive.value) {
    await stopFlushing()
  } else {
    startFlushing()
  }
}

const startFlushing = () => {
  console.log('🚿 Starte Spülung für Apartment:', currentApartment.value.number)
  isFlushingActive.value = true
  flushStartTime.value = Date.now()
  elapsedTime.value = 0
  remainingTime.value = currentApartment.value.min_flush_duration
  minDurationReached.value = false
  showOfflineSuccess.value = false

  startTimer()
}

const stopFlushing = async () => {
  if (!minDurationReached.value) {
    console.log('⚠️ Mindestspüldauer noch nicht erreicht')
    return
  }

  const totalDuration = elapsedTime.value
  const startTime = new Date(flushStartTime.value).toISOString()
  const endTime = new Date().toISOString()

  console.log('🛑 Stoppe Spülung nach', totalDuration, 'Sekunden')

  isFlushingActive.value = false
  clearTimer()

  const flushData = {
    startTime,
    endTime,
    duration: totalDuration,
    buildingId: buildingId.value
  }

  try {
    if (isOnline.value) {
      // Online: Normale Server-Speicherung
      const { createFlushRecord } = useApiApartment()
      const result = await createFlushRecord(apartmentId.value, flushData)

      if (result.success) {
        console.log('✅ Spül-Record online gespeichert')

        // Apartment-Daten aktualisieren
        if (result.data && result.data.apartment) {
          currentApartment.value = result.data.apartment
          apartmentStorage.storage.addOrUpdateApartment(buildingId.value, result.data.apartment)
        }

        await handleNavigationAfterFlush()
      }
    } else {
      // Offline: Lokale Speicherung
      console.log('📱 Speichere Spülung offline')

      const offlineFlush = offlineStorage.saveOfflineFlush(
        apartmentId.value,
        buildingId.value,
        flushData
      )

      // Lokale Apartment-Aktualisierung
      const apartmentUpdate = offlineStorage.updateApartmentAfterOfflineFlush(
        apartmentId.value,
        buildingId.value,
        flushData
      )

      // Apartment lokal aktualisieren
      Object.assign(currentApartment.value, apartmentUpdate)
      apartmentStorage.storage.addOrUpdateApartment(buildingId.value, currentApartment.value)

      // Offline-Spülungen neu laden
      loadOfflineFlushes()

      // Success-Message anzeigen
      showOfflineSuccess.value = true
      setTimeout(() => {
        showOfflineSuccess.value = false
      }, 5000)

      console.log('✅ Spül-Record offline gespeichert')

      await handleNavigationAfterFlush()
    }
  } catch (err) {
    console.error('❌ Fehler beim Speichern der Spülung:', err)
    error.value = err.message || 'Fehler beim Speichern der Spülung'
  }
}

const handleNavigationAfterFlush = async () => {
  if (autoNavigate.value && nextApartment.value) {
    console.log('🚀 Navigiere zum nächsten Apartment:', nextApartment.value.number)
    setTimeout(() => {
      goToNextApartment()
    }, 2000)
  }
}

const forceSyncFlushes = async () => {
  try {
    console.log('🔄 Starte manuelle Synchronisation')
    const result = await forceSync()

    if (result.success) {
      console.log('✅ Synchronisation erfolgreich')
      loadOfflineFlushes() // Reload nach Sync
      updateSyncStatus()
    }
  } catch (err) {
    console.error('❌ Sync-Fehler:', err)
    error.value = 'Fehler bei der Synchronisation: ' + err.message
  }
}

// Navigation zu nächstem Apartment
const goToNextApartment = () => {
  if (!nextApartment.value) return

  router.push({
    name: 'ApartmentFlushing',
    params: {
      buildingId: buildingId.value,
      apartmentId: nextApartment.value.id
    },
    query: {
      buildingName: buildingName.value,
      apartmentNumber: nextApartment.value.number
    }
  })
}

const goBack = () => {
  router.push({
    name: 'BuildingApartments',
    params: { id: buildingId.value },
    query: { buildingName: buildingName.value }
  })
}

// Offline-Spülungen für aktuelles Apartment laden
const loadOfflineFlushes = () => {
  const flushes = offlineStorage.getOfflineFlushesForApartment(apartmentId.value)
  offlineFlushes.value = flushes.sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
  console.log('📱 Offline-Spülungen geladen:', flushes.length)
}

// Sync-Status aktualisieren
const updateSyncStatus = () => {
  const status = getSyncStatus()
  // isOnline kommt vom Store, nicht vom syncService
  syncStatus.value = {
    ...status,
    isOnline: isOnline.value
  }
}

// Lifecycle
onMounted(async () => {
  console.log('🏠 ApartmentFlushing mounted')

  // KEINE eigenen Online/Offline Event Listeners mehr
  // Der OnlineStatus Store koordiniert alle Online/Offline Übergänge zentral

  // Initial Status setzen
  updateSyncStatus()

  // Auto-Sync starten
  autoSyncInterval = syncService.startAutoSync(2) // Alle 2 Minuten

  // Auto-Navigation Einstellung speichern wenn geändert
  const stopAutoNavWatch = watch(autoNavigate, (newValue) => {
    localStorage.setItem('wls_auto_navigate_apartments', JSON.stringify(newValue))
    console.log('💾 Auto-Navigation gespeichert:', newValue)
  })
  
  // Watch auf isFullyOnline für UI-Updates
  const stopOnlineWatch = watch(() => onlineStatusStore.isFullyOnline, (newIsOnline) => {
    console.log('🔄 Online-Status geändert:', newIsOnline)
    updateSyncStatus()
    
    // Wenn wieder online, Sync anstoßen
    if (newIsOnline) {
      setTimeout(() => {
        forceSync().catch(console.error)
      }, 1000)
    }
  })

  // Sync-Status regelmäßig aktualisieren
  const statusInterval = setInterval(() => {
    updateSyncStatus()
  }, 10000) // Alle 10 Sekunden

  // Apartment-Daten laden
  await loadApartmentData()

  // Cleanup bei Component-Unmount
  onUnmounted(() => {
    console.log('🧹 ApartmentFlushing cleanup')

    clearTimer()

    if (autoSyncInterval) {
      syncService.stopAutoSync(autoSyncInterval)
    }

    if (statusInterval) {
      clearInterval(statusInterval)
    }
    
    // Stoppe die Watchers
    stopAutoNavWatch()
    stopOnlineWatch()
  })
})

// Hilfsfunktionen für Timer und Status
const startTimer = () => {
  flushTimer.value = setInterval(() => {
    const now = Date.now()
    elapsedTime.value = Math.floor((now - flushStartTime.value) / 1000)
    remainingTime.value = Math.max(0, currentApartment.value.min_flush_duration - elapsedTime.value)

    // Prüfe ob Mindestdauer erreicht wurde
    if (elapsedTime.value >= currentApartment.value.min_flush_duration) {
      minDurationReached.value = true
      remainingTime.value = 0
    }
  }, 1000)
}

const clearTimer = () => {
  if (flushTimer.value) {
    clearInterval(flushTimer.value)
    flushTimer.value = null
  }
}

const getCountdownColor = () => {
  const percentage = (elapsedTime.value / currentApartment.value.min_flush_duration) * 100
  if (percentage < 50) return '#28a745' // Grün
  if (percentage < 80) return '#ffc107' // Gelb
  return '#dc3545' // Rot
}

const getStatusBadgeColor = () => {
  if (isFlushingActive.value && minDurationReached.value) return 'success'
  if (isFlushingActive.value) return 'primary'
  if (currentApartment.value?.last_flush_date) return 'success'
  return 'secondary'
}

const getStatusIcon = () => {
  if (isFlushingActive.value && minDurationReached.value) return 'cil-check-circle'
  if (isFlushingActive.value) return 'cil-media-play'
  if (currentApartment.value?.last_flush_date) return 'cil-check-circle'
  return 'cil-clock'
}

const getStatusText = () => {
  if (isFlushingActive.value && minDurationReached.value) return 'Mindestdauer erreicht - Stopp möglich'
  if (isFlushingActive.value) return `Spülung läuft - noch ${remainingTime.value}s`
  if (currentApartment.value?.last_flush_date) return 'Bereit für Spülung'
  return 'Noch nie gespült'
}

// Hilfsfunktionen für Formatierung
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unbekannt'
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Ungültiges Datum'
  }
}

const formatTimeAgo = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Heute'
    if (diffInDays === 1) return 'Gestern'
    if (diffInDays < 7) return `vor ${diffInDays} Tagen`
    if (diffInDays < 30) return `vor ${Math.floor(diffInDays / 7)} Wochen`
    return `vor ${Math.floor(diffInDays / 30)} Monaten`
  } catch {
    return ''
  }
}

const formatTimeToNext = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((date - now) / (1000 * 60 * 60 * 24))

    if (diffInDays < 0) return `${Math.abs(diffInDays)} Tage überfällig`
    if (diffInDays === 0) return 'Heute fällig'
    if (diffInDays === 1) return 'Morgen fällig'
    if (diffInDays < 7) return `in ${diffInDays} Tagen`
    return `in ${Math.floor(diffInDays / 7)} Wochen`
  } catch {
    return ''
  }
}

const getNextFlushClass = (dateString) => {
  if (!dateString) return 'text-muted'
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((date - now) / (1000 * 60 * 60 * 24))

    if (diffInDays < 0) return 'text-danger fw-bold'
    if (diffInDays <= 7) return 'text-warning fw-bold'
    return 'text-success'
  } catch {
    return 'text-muted'
  }
}


// Watch für Route-Änderungen (Navigation zwischen Apartments)
watch(() => apartmentId.value, () => {
  clearTimer()
  isFlushingActive.value = false
  minDurationReached.value = false
  loadApartmentData()
})

// Watch für autoNavigate Änderungen - speichere in LocalStorage
watch(autoNavigate, (newValue) => {
  localStorage.setItem('wls_auto_navigate_apartments', JSON.stringify(newValue))
  console.log('🔄 Auto-Navigation Einstellung gespeichert:', newValue)
})

// Watch für Flush-Errors
watch(flushError, (newError) => {
  if (newError) {
    error.value = newError
  }
})

onMounted(() => {
  loadApartmentData()
})

onUnmounted(() => {
  clearTimer()
})
</script>

<style scoped src="@/styles/views/ApartmentFlushing.css">
.apartment-details .detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f8f9fa;
}

.apartment-details .detail-row:last-child {
  border-bottom: none;
}

.breadcrumb {
  background: none;
  padding: 0;
  margin: 0;
}
</style>
