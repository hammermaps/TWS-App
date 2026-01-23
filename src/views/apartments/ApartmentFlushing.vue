<template>
  <div class="apartment-flushing">
    <!-- Header mit Navigation in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>{{ $t('flushing.apartmentFlushing', { number: apartmentNumber || apartmentId }) }}</h2>
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb mb-0">
                <li class="breadcrumb-item">
                  <router-link to="/buildings" class="text-decoration-none">
                    {{ $t('nav.buildings') }}
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
                    {{ buildingName || `${$t('buildings.name')} #${buildingId}` }}
                  </router-link>
                </li>
                <li class="breadcrumb-item active" aria-current="page">
                  {{ $t('flushing.apartment') }} {{ apartmentNumber || apartmentId }}
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
                {{ syncStatus.unsyncedCount }} {{ $t('flushing.unsynced') }}
              </CBadge>
            </div>

            <!-- Offline Indicator -->
            <div v-if="!isOnline" class="me-3">
              <CBadge color="secondary" class="d-flex align-items-center gap-1">
                <CIcon icon="cil-wifi-off" size="sm" />
                {{ $t('flushing.offlineMode') }}
              </CBadge>
            </div>

            <!-- Touch-freundlicher Toggle-Button für Auto-Navigation -->
            <CButton
              :color="autoNavigate ? 'success' : 'outline-secondary'"
              class="align-items-center"
              @click="toggleAutoNavigate"
              :aria-pressed="autoNavigate"
            >
              <CIcon :icon="autoNavigate ? 'cil-skip-forward' : 'cil-stop'" class="me-2" />
              <span>{{ $t('flushing.autoNavigate') }}</span>
              <small class="text-muted ms-2">{{ autoNavigate ? $t('common.on') : $t('common.off') }}</small>
            </CButton>

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
              {{ $t('flushing.sync') }}
            </CButton>

            <CButton color="secondary" variant="outline" @click="goBack">
              <CIcon icon="cil-arrow-left" class="me-2" />
              {{ $t('flushing.back') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Loading State -->
    <div v-if="loading" class="text-center">
      <CSpinner color="primary" />
      <p class="mt-2">{{ $t('flushing.loadingApartment') }}</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Main Content -->
    <CRow v-if="!loading && !error && currentApartment">
      <!-- Spül-Steuerung -->
      <CCol lg="6">
        <CCard class="h-100">
          <CCardHeader>
            <h5>
              <CIcon icon="cil-drop" class="me-2" />
              {{ $t('flushing.flushControl') }}
            </h5>
          </CCardHeader>
          <CCardBody class="text-center">
            <div v-if="!currentApartment.enabled" class="alert alert-warning">
              <CIcon icon="cil-warning" class="me-2" />
              {{ $t('flushing.apartmentDisabled') }}
            </div>

            <div v-else>
              <p class="mb-4">
                <strong>{{ $t('flushing.minDuration') }}:</strong> {{ currentApartment.min_flush_duration }} {{ $t('flushing.seconds') }}
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
                        {{ isFlushingActive ? $t('flushing.stop') : $t('flushing.start') }}
                      </div>
                      <div v-if="isFlushingActive" class="small">
                        {{ remainingTime > 0 ? `${remainingTime}s` : $t('flushing.stopPossible') }}
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
                    {{ $t('flushing.runningSince', { duration: formatDuration(elapsedTime) }) }}
                  </small>
                </div>
              </div>

              <!-- Offline Success Message -->
              <div v-if="showOfflineSuccess" class="mt-3">
                <CAlert color="info" :visible="true">
                  <CIcon icon="cil-check-circle" class="me-2" />
                  {{ $t('flushing.offlineSaved') }}
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
              {{ $t('flushing.apartmentDetails') }}
            </h5>
          </CCardHeader>
          <CCardBody>
            <!-- Wohnungs-Details tabellarisch -->
            <CTable bordered responsive class="mb-0 apartment-details-table">
              <CTableBody>
                <CTableRow>
                  <CTableHeaderCell scope="row">{{ $t('flushing.apartment') }}</CTableHeaderCell>
                  <CTableDataCell>{{ currentApartment.number }}</CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableHeaderCell scope="row">{{ $t('flushing.floor') }}</CTableHeaderCell>
                  <CTableDataCell>{{ currentApartment.floor || 'N/A' }}</CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableHeaderCell scope="row">{{ $t('common.status') }}</CTableHeaderCell>
                  <CTableDataCell>
                    <CBadge :color="currentApartment.enabled ? 'success' : 'danger'">
                      {{ currentApartment.enabled ? $t('flushing.active') : $t('flushing.disabled') }}
                    </CBadge>
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableHeaderCell scope="row">{{ $t('flushing.minDuration') }}</CTableHeaderCell>
                  <CTableDataCell>{{ currentApartment.min_flush_duration }}s</CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableHeaderCell scope="row">{{ $t('flushing.lastFlush') }}</CTableHeaderCell>
                  <CTableDataCell>
                    <span v-if="currentApartment.last_flush_date">
                      {{ formatDate(currentApartment.last_flush_date) }}
                      <small class="text-muted d-block">{{ formatTimeAgo(currentApartment.last_flush_date) }}</small>
                    </span>
                    <span v-else class="text-muted">{{ $t('flushing.never') }}</span>
                  </CTableDataCell>
                </CTableRow>

                <CTableRow>
                  <CTableHeaderCell scope="row">{{ $t('flushing.nextFlush') }}</CTableHeaderCell>
                  <CTableDataCell>
                    <span v-if="currentApartment.next_flush_due || currentApartment.last_flush_date">
                      {{ formatDate(getNextFlushToShow(currentApartment.next_flush_due, currentApartment.last_flush_date)) }}
                      <small :class="getNextFlushClass(getNextFlushToShow(currentApartment.next_flush_due, currentApartment.last_flush_date))" class="d-block">
                        {{ formatTimeToNext(getNextFlushToShow(currentApartment.next_flush_due, currentApartment.last_flush_date)) }}
                      </small>
                    </span>
                    <span v-else class="text-muted">{{ $t('flushing.notPlanned') }}</span>
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>

            <!-- Navigation zu nächstem Apartment -->
            <div v-if="nextApartment" class="mt-4 pt-3 border-top">
              <h6 class="text-muted mb-3">{{ $t('flushing.nextApartment') }}:</h6>
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{{ nextApartment.number }}</strong>
                  <small class="text-muted d-block">
                    {{ $t('flushing.floor') }} {{ nextApartment.floor || 'N/A' }}
                  </small>
                </div>
                <CButton
                  color="primary"
                  variant="outline"
                  @click="goToNextApartment"
                  :disabled="isFlushingActive"
                >
                  <CIcon icon="cil-arrow-right" class="me-2" />
                  Zur nächsten Wohnung springen
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
              {{ $t('flushing.recentFlushes') }}
              <small v-if="offlineFlushes.length > 0" class="text-muted">
                ({{ offlineFlushes.filter(f => !f.synced).length }} {{ $t('flushing.pending') }},
                {{ offlineFlushes.filter(f => f.synced).length }} {{ $t('flushing.synced') }})
              </small>
            </h5>
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>{{ $t('dashboard.date') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('common.duration') }}</CTableHeaderCell>
                  <CTableHeaderCell>{{ $t('common.status') }}</CTableHeaderCell>
                  <CTableHeaderCell>Sync</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                <!-- Offline-Spülungen -->
                <CTableRow v-for="flush in offlineFlushes" :key="flush.id">
                  <CTableDataCell>
                    {{ formatDate(flush.endTime) }}
                    <small class="text-muted d-block">{{ $t('flushing.offlineCreated') }}</small>
                  </CTableDataCell>
                  <CTableDataCell>{{ flush.duration }}s</CTableDataCell>
                  <CTableDataCell>
                    <CBadge :color="flush.synced ? 'success' : 'warning'">
                      <CIcon :icon="flush.synced ? 'cil-check-circle' : 'cil-clock'" class="me-1" size="sm" />
                      {{ flush.synced ? $t('flushing.successful') : $t('flushing.pending') }}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge :color="flush.synced ? 'success' : 'info'">
                      <CIcon :icon="flush.synced ? 'cil-cloud-check' : 'cil-wifi-off'" class="me-1" size="sm" />
                      {{ flush.synced ? $t('flushing.online') : $t('flushing.offline') }}
                    </CBadge>
                  </CTableDataCell>
                </CTableRow>

                <!-- Online-Spülungen -->
                <CTableRow v-for="flush in recentFlushes" :key="flush.id">
                  <CTableDataCell>{{ formatDate(flush.date) }}</CTableDataCell>
                  <CTableDataCell>{{ flush.duration }}s</CTableDataCell>
                  <CTableDataCell>
                    <CBadge :color="flush.success ? 'success' : 'danger'">
                      {{ flush.success ? $t('flushing.successful') : $t('flushing.failed') }}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color="success">
                      <CIcon icon="cil-cloud-check" class="me-1" size="sm" />
                      {{ $t('flushing.online') }}
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate } from '@/utils/dateFormatter.js'
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
  CTableDataCell
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'

// Event emitter für externe Komponenten
const emit = defineEmits(['apartment-updated'])

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const apartmentStorage = useApartmentStorage()
const { storage: offlineStorage } = useOfflineFlushStorage()
const { syncService, getSyncStatus, forceSync, onSyncComplete } = useOfflineFlushSync()
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
// Verzögerung für die automatische Weiterleitung nach einer Spülung (in ms)
// Standard: 500ms für schnellere Navigation; kann optional über localStorage konfiguriert werden
const autoNavigateDelay = ref(Number(localStorage.getItem('wls_auto_navigate_delay_ms')) || 500)

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

    console.log('✅ Apartment geladen:', apartmentId.value, 'Min-Duration:', apartments.find(apt => String(apt.id) === String(apartmentId.value))?.min_flush_duration)
    console.log('📋 Alle Apartments im Gebäude:', apartments.length)
    console.log('🔍 Nächstes Apartment verfügbar:', !!nextApartment.value)

    const apartment = apartments.find(apt => String(apt.id) === String(apartmentId.value))
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
      error.value = t('flushing.apartmentNotFound')
    }
  } catch (err) {
    error.value = err.message || t('flushing.errorLoadingApartment')
  } finally {
    loading.value = false
  }
}

// Toggle-Funktion für den Auto-Navigate Button
const toggleAutoNavigate = () => {
  autoNavigate.value = !autoNavigate.value
  console.log('🔁 Auto-Navigation umgeschaltet:', autoNavigate.value)
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

        // Vereinheitlichte Aktualisierung: Baue ein aktualisiertes Apartment-Objekt
        const serverApartment = result.data && result.data.apartment ? result.data.apartment : null
        // Beginne mit Server-Apartment (falls vorhanden), sonst mit aktuellem Apartment als Basis
        const updatedApartment = serverApartment ? { ...serverApartment } : { ...(currentApartment.value || {}) }

        // Setze immer die lokal bekannten Werte aus flushData, damit UI sofort konsistent ist
        updatedApartment.last_flush_date = flushData.endTime
        updatedApartment.last_flush_duration = flushData.duration

        // Berechne nächste Spülung (Annahme: 72 Stunden nach letzter Spülung)
        const nextFlushDate = new Date(flushData.endTime)
        nextFlushDate.setHours(nextFlushDate.getHours() + 72)
        updatedApartment.next_flush_due = nextFlushDate.toISOString()

        // Reaktive Zuweisung - setze zusätzlich next_flush_due zwingend aus last_flush_date +72h
        // (manchmal liefert der Server veraltete next_flush_due, deshalb erzwingen wir die Konsistenz lokal)
        const forcedNext = new Date(updatedApartment.last_flush_date)
        forcedNext.setHours(forcedNext.getHours() + 72)
        updatedApartment.next_flush_due = forcedNext.toISOString()

        currentApartment.value = { ...updatedApartment }

        // Persistiere im Apartment-Storage
        try {
          apartmentStorage.storage.addOrUpdateApartment(buildingId.value, currentApartment.value)
        } catch (e) {
          console.warn('⚠️ Fehler beim Speichern des aktualisierten Apartments in Storage:', e)
        }

        // Aktuallisiere allApartments Array falls geladen
        try {
          const idx = allApartments.value.findIndex(a => a.id === currentApartment.value.id)
          if (idx !== -1) {
            allApartments.value.splice(idx, 1, { ...allApartments.value[idx], ...currentApartment.value })
          }
        } catch (e) {
          console.warn('⚠️ Fehler beim Aktualisieren des allApartments Arrays:', e)
        }

        // Emit event für zentrale Komponenten (z.B. Header Badges)
        try {
          emit('apartment-updated', { apartmentId: apartmentId.value, update: currentApartment.value })
        } catch (e) {
          console.warn('⚠️ Fehler beim Emittieren des apartment-updated Events:', e)
        }

        // Füge neue Spülung zur Historie hinzu
        const newFlush = {
          id: result.data?.id || Date.now(),
          date: flushData.endTime,
          duration: flushData.duration,
          success: true
        }
        recentFlushes.value.unshift(newFlush)
        // Begrenze auf die letzten 10 Einträge
        if (recentFlushes.value.length > 10) {
          recentFlushes.value = recentFlushes.value.slice(0, 10)
        }

        console.log('✅ Spülung zur Historie hinzugefügt')

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

      // Sofortige lokale Aktualisierung des Apartment-Objekts damit UI die neue nächste Spülung zeigt
      try {
        const apartmentUpdate = offlineStorage.updateApartmentAfterOfflineFlush(apartmentId.value, buildingId.value, offlineFlush)
        // Merge in currentApartment.value (reactive) so Ansicht sofort aktualisiert
        if (currentApartment.value && typeof currentApartment.value === 'object') {
          Object.assign(currentApartment.value, apartmentUpdate)
        }

        // Persistiere die Änderung im Apartment-Storage
        try {
          apartmentStorage.storage.addOrUpdateApartment(buildingId.value, currentApartment.value)
        } catch (e) {
          console.warn('⚠️ Fehler beim Speichern des aktualisierten Apartments in Storage:', e)
        }

        // Aktualisiere auch das allApartments-Array (falls geladen), damit Übersichten sofort aktualisiert werden
        try {
          const idx = allApartments.value.findIndex(a => a.id === currentApartment.value.id)
          if (idx !== -1) {
            // Ersetze das Objekt reaktiv
            allApartments.value.splice(idx, 1, { ...allApartments.value[idx], ...currentApartment.value })
          }
        } catch (e) {
          console.warn('⚠️ Fehler beim Aktualisieren des allApartments Arrays:', e)
        }

        // Emit event für zentrale Komponenten (z.B. Apartments-Overview, Header Badges)
        // so diese die geladenen Statistiken / Karten aktualisieren können
        emit('apartment-updated', { apartmentId: apartmentId.value, update: apartmentUpdate })
      } catch (err) {
        console.error('Fehler bei lokaler Apartment-Aktualisierung nach Offline-Save:', err)
      }

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
    error.value = err.message || t('flushing.errorSavingFlush')
  }
}

const handleNavigationAfterFlush = async () => {
  console.log('🔍 Prüfe Auto-Navigation:', {
    autoNavigate: autoNavigate.value,
    hasNextApartment: !!nextApartment.value,
    nextApartmentNumber: nextApartment.value?.number,
    nextApartmentId: nextApartment.value?.id
  })

  if (autoNavigate.value && nextApartment.value) {
    console.log(`🚀 Auto-Navigation aktiviert - Navigiere in ${autoNavigateDelay.value}ms zum nächsten Apartment:`, nextApartment.value.number)
    setTimeout(() => {
      console.log('⏭️ Führe Navigation aus zu Apartment:', nextApartment.value.number)
      goToNextApartment()
    }, autoNavigateDelay.value)
  } else {
    if (!autoNavigate.value) {
      console.log('⏸️ Auto-Navigation ist deaktiviert')
    }
    if (!nextApartment.value) {
      console.log('⏸️ Kein nächstes Apartment verfügbar')
    }
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
    error.value = t('flushing.errorSyncing') + ': ' + err.message
  }
}

// Navigation zu nächstem Apartment
const goToNextApartment = () => {
  if (!nextApartment.value) {
    console.warn('⚠️ Keine Navigation möglich - nextApartment ist null')
    return
  }

  console.log('🎯 Navigiere zu:', {
    apartmentNumber: nextApartment.value.number,
    apartmentId: nextApartment.value.id,
    buildingId: buildingId.value,
    buildingName: buildingName.value
  })

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
  }).then(() => {
    console.log('✅ Navigation erfolgreich abgeschlossen')
  }).catch((err) => {
    console.error('❌ Navigation fehlgeschlagen:', err)
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

  // Listener für Sync-Events - aktualisiert die Seite nach erfolgreicher Synchronisation
  const unsubscribeSyncListener = onSyncComplete((event) => {
    console.log('🔄 Sync-Event empfangen:', event)

    if (event.type === 'sync_complete' && event.successCount > 0) {
      console.log('✅ Synchronisation abgeschlossen - aktualisiere Offline-Spülungen')

      // Lade Offline-Spülungen neu, um den aktualisierten Status zu zeigen
      loadOfflineFlushes()

      // Aktualisiere Sync-Status
      updateSyncStatus()

      // Optional: Apartment-Daten neu laden vom Server (falls online)
      if (isOnline.value) {
        console.log('📥 Lade Apartment-Daten vom Server nach Sync')
        // Hier könnten wir die Apartment-Daten vom Server neu laden
        // um sicherzustellen, dass last_flush_date aktuell ist
      }
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

    // Unsubscribe vom Sync-Listener
    unsubscribeSyncListener()
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
  if (isFlushingActive.value && minDurationReached.value) return t('flushing.minDurationReachedCanStop')
  if (isFlushingActive.value) return `${t('flushing.flushRunning', { seconds: remainingTime.value })}`
  if (currentApartment.value?.last_flush_date) return t('flushing.readyForFlushing')
  return t('flushing.neverFlushed')
}

// Hilfsfunktionen für Formatierung
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
}


const formatTimeAgo = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return t('flushing.today')
    if (diffInDays === 1) return t('flushing.yesterday')
    if (diffInDays < 7) return t('flushing.daysAgo', { days: diffInDays })
    if (diffInDays < 30) return t('flushing.daysAgo', { days: Math.floor(diffInDays / 7) * 7 })
    return t('flushing.daysAgo', { days: Math.floor(diffInDays / 30) * 30 })
  } catch {
    return ''
  }
}

// Liefert das Datum, das für "Nächste Spülung" angezeigt werden soll.
// Falls nextDue fehlt oder vor lastFlush liegt, berechne lastFlush + 72h.
const getNextFlushToShow = (nextDue, lastFlush) => {
  try {
    // Wenn wir eine lastFlush haben, berechne standardmäßig lastFlush + 72h
    let fallback = null
    if (lastFlush) {
      const lf = new Date(lastFlush)
      if (!isNaN(lf.getTime())) {
        fallback = new Date(lf)
        fallback.setHours(fallback.getHours() + 72)
      }
    }

    // Wenn nextDue gültig ist und später liegt als fallback, verwende es.
    if (nextDue) {
      const nd = new Date(nextDue)
      if (!isNaN(nd.getTime())) {
        if (fallback) {
          if (nd.getTime() > fallback.getTime()) return nd.toISOString()
          // falls server nextDue früher oder gleich fallback ist, nutze fallback
          return fallback.toISOString()
        }
        // Kein fallback vorhanden -> verwende serverwert
        return nd.toISOString()
      }
    }

    // Kein gültiges nextDue -> nutze fallback oder null
    return fallback ? fallback.toISOString() : null
  } catch (e) {
    return null
  }
}


const formatTimeToNext = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((date - now) / (1000 * 60 * 60 * 24))

    if (diffInDays < 0) return t('flushing.daysAgo', { days: Math.abs(diffInDays) }) + ' ' + t('apartments.overdue').toLowerCase()
    if (diffInDays === 0) return t('flushing.todayDue')
    if (diffInDays === 1) return t('flushing.tomorrowDue')
    if (diffInDays < 7) return t('flushing.daysLeft', { days: diffInDays })
    return t('flushing.daysLeft', { days: Math.floor(diffInDays / 7) * 7 })
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
