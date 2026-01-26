<template>
  <div class="building-apartments">
    <!-- Header mit Gebäude-Info in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center header-row">
          <div>
            <h2>{{ $t('apartments.title') }} - {{ buildingName || `${$t('buildings.name')} #${buildingId}` }}</h2>
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb mb-2">
                <li class="breadcrumb-item">
                  <router-link to="/buildings" class="text-decoration-none">
                    {{ $t('nav.buildings') }}
                  </router-link>
                </li>
                <li class="breadcrumb-item active" aria-current="page">
                  {{ buildingName || `${$t('buildings.name')} #${buildingId}` }}
                </li>
              </ol>
            </nav>
            <small v-if="cacheStatusText" class="text-muted">
              <CIcon icon="cil-clock" class="me-1" size="sm" />
              {{ cacheStatusText }}
            </small>
          </div>
          <div class="d-flex gap-2 align-items-center header-actions">
            <CBadge v-if="isPreloading" color="info" class="me-2">
              <CIcon icon="cil-sync" class="me-1" size="sm" />
              {{ $t('apartments.updating') }}
            </CBadge>
            <CButton color="primary" @click="refreshApartments" :disabled="loading">
              <CIcon icon="cil-reload" class="me-2" />
              {{ $t('common.refresh') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Loading State -->
    <div v-if="loading && (!apartments || apartments.length === 0)" class="text-center">
      <CSpinner color="primary" />
      <p class="mt-2">{{ $t('apartments.loading') }}</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>{{ $t('common.error') }}:</strong> {{ error }}
    </CAlert>

    <!-- Apartments Table -->
    <CCard v-if="!loading && !error || (apartments && apartments.length > 0)">
      <CCardHeader>
        <h5 class="mb-0">
          <CIcon icon="cil-home" class="me-2" />
          {{ $t('apartments.overview') }} ({{ $t('apartments.apartmentsCount', { count: apartments?.length || 0 }) }})
        </h5>
      </CCardHeader>
      <CCardBody class="p-0">
        <CTable hover responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>{{ $t('apartments.apartment') }}</CTableHeaderCell>
              <!-- Floor und Status zusammengefasst in der ersten Spalte -->
              <CTableHeaderCell>{{ $t('apartments.lastFlush') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('apartments.nextFlush') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('apartments.flushStatus') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('apartments.actions') }}</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            <CTableRow
              v-for="apartment in sortedApartments"
              :key="apartment.id"
              :class="getRowClass(apartment)"
            >
              <!-- Zusammengefasste Zelle: Apartment, Floor und Status nebeneinander -->
              <CTableDataCell class="align-middle" :data-label="$t('apartments.apartment')">
                <div class="d-flex align-items-center justify-content-between flex-nowrap">
                  <div class="d-flex align-items-center">
                    <CIcon icon="cil-door" class="me-2 text-muted" />
                    <strong class="me-3">{{ apartment.number }}</strong>
                    <CBadge color="info" shape="rounded-pill" class="me-2">
                      {{ apartment.floor || 'N/A' }}
                    </CBadge>
                    <CBadge
                      :color="apartment.enabled ? 'success' : 'danger'"
                      shape="rounded-pill"
                    >
                      {{ apartment.enabled ? $t('apartments.enabled') : $t('apartments.disabled') }}
                    </CBadge>
                  </div>
                </div>
              </CTableDataCell>

              <!-- Ab hier bleibt die Darstellung gleich -->
              <CTableDataCell class="align-middle" :data-label="$t('apartments.lastFlush')">
                <div v-if="apartment.last_flush_date">
                  <div>{{ formatDate(apartment.last_flush_date) }}</div>
                  <small class="text-muted">{{ formatTimeAgo(apartment.last_flush_date) }}</small>
                </div>
                <span v-else class="text-muted">{{ $t('apartments.neverFlushed') }}</span>
              </CTableDataCell>

              <CTableDataCell class="align-middle" :data-label="$t('apartments.nextFlush')">
                <div v-if="apartment.next_flush_due">
                  <div>{{ formatDate(apartment.next_flush_due) }}</div>
                  <small :class="getNextFlushClass(apartment.next_flush_due)">
                    {{ formatTimeToNext(apartment.next_flush_due) }}
                  </small>
                </div>
                <span v-else class="text-muted">{{ $t('apartments.notPlanned') }}</span>
              </CTableDataCell>

              <CTableDataCell class="align-middle" :data-label="$t('apartments.flushStatus')">
                <CBadge
                  :color="getFlushStatusColor(apartment)"
                  shape="rounded-pill"
                  class="d-flex align-items-center justify-content-center"
                  style="min-width: 80px;"
                >
                  <CIcon :icon="getFlushStatusIcon(apartment)" class="me-1" />
                  {{ getFlushStatusText(apartment) }}
                </CBadge>
              </CTableDataCell>

              <CTableDataCell class="align-middle" :data-label="$t('apartments.actions')">
                <div class="d-flex gap-2">
                  <CButton
                    color="primary"
                    size="sm"
                    :disabled="!apartment.enabled"
                    @click="startFlushing(apartment)"
                  >
                    <CIcon icon="cil-media-play" class="me-1" />
                    {{ $t('apartments.flush') }}
                  </CButton>
                  <CButton
                    color="info"
                    size="sm"
                    variant="outline"
                    @click="viewFlushHistory(apartment)"
                  >
                    <CIcon icon="cil-history" class="me-1" />
                    {{ $t('apartments.history') }}
                  </CButton>
                </div>
              </CTableDataCell>

            </CTableRow>
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>

    <!-- Empty State -->
    <div v-if="!loading && !error && (!apartments || apartments.length === 0)" class="text-center py-5">
      <CIcon icon="cil-home" size="4xl" class="text-muted mb-3" />
      <h4 class="text-muted">Keine Apartments gefunden</h4>
      <p class="text-muted">Dieses Gebäude hat derzeit keine Apartments.</p>
      <CButton color="primary" variant="outline" @click="$router.push('/buildings')">
        <CIcon icon="cil-arrow-left" class="me-2" />
        Zurück zur Gebäude-Übersicht
      </CButton>
    </div>

    <!-- Statistics Cards -->
    <CRow v-if="!loading && !error && apartments && apartments.length > 0" class="mt-4">
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <h4 class="text-primary">{{ apartments.length }}</h4>
            <p class="text-muted mb-0">{{ $t('common.total') }} {{ $t('apartments.title') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <h4 class="text-success">{{ activeApartments }}</h4>
            <p class="text-muted mb-0">{{ $t('apartments.enabled') }} {{ $t('apartments.title') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <h4 class="text-warning">{{ overdueFlushes }}</h4>
            <p class="text-muted mb-0">{{ $t('apartments.statusOverdue') }} {{ $t('flushing.title') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <h4 class="text-info">{{ upcomingFlushes }}</h4>
            <p class="text-muted mb-0">{{ $t('apartments.statusPending') }} {{ $t('flushing.title') }}</p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </div>
</template>

<script setup>
import { onMounted, computed, watch, nextTick, onUnmounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useApartmentStorage } from '@/stores/ApartmentStorage.js'
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

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { apartments, loading, error, list, storage } = useApiApartment()

const buildingId = computed(() => route.params.id)
const buildingName = computed(() => route.query.buildingName)

// Lokale States für besseres UX
const isPreloading = ref(false)
const cacheAge = ref(null)

// Berechne das Alter des Caches
const calculateCacheAge = () => {
  const cacheKey = `apartments_${buildingId.value}_timestamp`
  const timestamp = localStorage.getItem(cacheKey)
  if (timestamp) {
    const ageInMinutes = Math.floor((Date.now() - parseInt(timestamp)) / 60000)
    cacheAge.value = ageInMinutes
  } else {
    cacheAge.value = null
  }
}

// Cache-Status-Text
const cacheStatusText = computed(() => {
  if (cacheAge.value === null) return ''
  if (cacheAge.value < 1) return t('apartments.updatedJustNow')
  if (cacheAge.value === 1) return t('apartments.updatedOneMinuteAgo')
  if (cacheAge.value < 60) return t('apartments.updatedMinutesAgo', { minutes: cacheAge.value })
  const hours = Math.floor(cacheAge.value / 60)
  if (hours === 1) return t('apartments.updatedOneHourAgo')
  return t('apartments.updatedHoursAgo', { hours })
})

const sortedApartments = computed(() => {
  if (!apartments.value || !Array.isArray(apartments.value)) return []
  return [...apartments.value].sort((a, b) => {
    // Wenn beide ein 'sorted' Feld haben, nutze dieses numerisch (aufsteigend)
    const aHasSorted = a && a.sorted !== undefined && a.sorted !== null && a.sorted !== ''
    const bHasSorted = b && b.sorted !== undefined && b.sorted !== null && b.sorted !== ''

    if (aHasSorted && bHasSorted) {
      const numA = Number(a.sorted)
      const numB = Number(b.sorted)
      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA !== numB) return numA - numB
      }
    }

    // Wenn nur eines der Apartments ein 'sorted' hat, soll dieses vorangestellt werden
    if (aHasSorted && !bHasSorted) return -1
    if (!aHasSorted && bHasSorted) return 1

    // Fallback: wie bisher nach Etage, dann nach Apartment-Nummer sortieren
    try {
      if ((a.floor || '') !== (b.floor || '')) {
        return (a.floor || '').toString().localeCompare((b.floor || '').toString(), undefined, { numeric: true })
      }
      return (a.number || '').toString().localeCompare((b.number || '').toString(), undefined, { numeric: true })
    } catch (e) {
      // Falls etwas schief geht, keine Reihenfolgeänderung
      return 0
    }
  })
})

const activeApartments = computed(() => {
  if (!apartments.value || !Array.isArray(apartments.value)) return 0
  return apartments.value.filter(apt => apt.enabled).length
})

const overdueFlushes = computed(() => {
  if (!apartments.value || !Array.isArray(apartments.value)) return 0
  return apartments.value.filter(apt => isFlushOverdue(apt)).length
})

const upcomingFlushes = computed(() => {
  if (!apartments.value || !Array.isArray(apartments.value)) return 0
  return apartments.value.filter(apt => isFlushUpcoming(apt)).length
})

// Initialer Ladevorgang mit Cache
const loadApartments = async (forceRefresh = false) => {
  console.log('Loading apartments for building:', buildingId.value)

  // Wenn nicht erzwungen, versuche Cache zu laden
  if (!forceRefresh) {
    const cachedApartments = storage.storage.getApartmentsForBuilding(buildingId.value)
    if (cachedApartments && cachedApartments.length > 0) {
      apartments.value = cachedApartments
      calculateCacheAge()

      // Im Hintergrund aktualisieren
      isPreloading.value = true
      try {
        await list({ building_id: buildingId.value })
        const cacheKey = `apartments_${buildingId.value}_timestamp`
        localStorage.setItem(cacheKey, Date.now().toString())
        calculateCacheAge()
      } catch (err) {
        console.warn('Hintergrund-Aktualisierung fehlgeschlagen:', err)
      } finally {
        isPreloading.value = false
      }
      return
    }
  }

  // Ansonsten normales Laden
  await list({ building_id: buildingId.value })
  const cacheKey = `apartments_${buildingId.value}_timestamp`
  localStorage.setItem(cacheKey, Date.now().toString())
  calculateCacheAge()
}

// Erzwungenes Neuladen
const refreshApartments = async () => {
  await loadApartments(true)
}

const formatDate = (dateString) => {
  if (!dateString) return t('apartments.unknown')
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return t('apartments.invalidDate')
  }
}

const formatTimeAgo = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return t('apartments.today')
    if (diffInDays === 1) return t('apartments.yesterday')
    if (diffInDays < 7) return t('apartments.daysAgo', { days: diffInDays })
    if (diffInDays < 30) return t('apartments.daysAgo', { days: Math.floor(diffInDays / 7) * 7 })
    return t('apartments.daysAgo', { days: Math.floor(diffInDays / 30) * 30 })
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

    if (diffInDays < 0) return t('apartments.daysAgo', { days: Math.abs(diffInDays) }) + ' ' + t('apartments.overdue').toLowerCase()
    if (diffInDays === 0) return t('apartments.todayDue')
    if (diffInDays === 1) return t('apartments.tomorrowDue')
    if (diffInDays < 7) return t('apartments.daysLeft', { days: diffInDays })
    if (diffInDays < 30) return t('apartments.daysLeft', { days: Math.floor(diffInDays / 7) * 7 })
    return t('apartments.daysLeft', { days: Math.floor(diffInDays / 30) * 30 })
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

const isFlushOverdue = (apartment) => {
  if (!apartment.next_flush_due) return false
  try {
    const date = new Date(apartment.next_flush_due)
    const now = new Date()
    return date < now
  } catch {
    return false
  }
}

const isFlushUpcoming = (apartment) => {
  if (!apartment.next_flush_due) return false
  try {
    const date = new Date(apartment.next_flush_due)
    const now = new Date()
    const diffInDays = Math.floor((date - now) / (1000 * 60 * 60 * 24))
    return diffInDays >= 0 && diffInDays <= 7
  } catch {
    return false
  }
}

const getFlushStatusColor = (apartment) => {
  // Deaktivierte Apartments grau
  if (!apartment.enabled) return 'secondary'

  // Prüfe zuerst auf überfällige Spülungen (rot)
  if (apartment.next_flush_due) {
    try {
      const nextFlushDate = new Date(apartment.next_flush_due)
      const now = new Date()
      const diffInDays = Math.floor((nextFlushDate - now) / (1000 * 60 * 60 * 24))

      // Überfällig (rot)
      if (diffInDays < 0) {
        return 'danger'
      }

      // Heute fällig (gelb)
      if (diffInDays === 0) {
        return 'warning'
      }

      return 'success'
    } catch (error) {
      console.warn('Fehler beim Parsen des next_flush_due Datums:', error)
    }
  }

  // Prüfe letzte Spülung für grüne Färbung (1-2 Tage nach Spülung)
  if (apartment.last_flush_date) {
    try {
      const lastFlushDate = new Date(apartment.last_flush_date)
      const now = new Date()
      const daysSinceLastFlush = Math.floor((now - lastFlushDate) / (1000 * 60 * 60 * 24))

      // 1-2 Tage nach letzter Spülung = grün (frisch gespült)
      if (daysSinceLastFlush >= 1 && daysSinceLastFlush <= 2) {
        return 'success'
      }

      // Ältere Spülungen = blau/info
      return 'info'
    } catch (error) {
      console.warn('Fehler beim Parsen des last_flush_date Datums:', error)
    }
  }

  // Standard für Apartments ohne Spül-Historie
  return 'info'
}

const getFlushStatusIcon = (apartment) => {
  if (!apartment.enabled) return 'cil-x'
  if (isFlushOverdue(apartment)) return 'cil-warning'
  if (isFlushUpcoming(apartment)) return 'cil-clock'
  if (apartment.last_flush_date) return 'cil-check-circle'
  return 'cil-clock'
}

const getFlushStatusText = (apartment) => {
  if (!apartment.enabled) return t('apartments.statusDisabled')
  if (isFlushOverdue(apartment)) return t('apartments.statusOverdue')

  // Prüfe auf heute fällige Spülungen (höchste Priorität nach Überfällig)
  if (apartment.next_flush_due) {
    try {
      const nextFlushDate = new Date(apartment.next_flush_due)
      const now = new Date()
      const diffInDays = Math.floor((nextFlushDate - now) / (1000 * 60 * 60 * 24))

      // Heute fällig
      if (diffInDays === 0) {
        return t('apartments.statusDue')
      }
    } catch (error) {
      console.warn('Fehler beim Parsen des next_flush_due Datums:', error)
    }
  }

  // Prüfe letzte Spülung für "Aktuell" vs "Anstehend" Status
  if (apartment.last_flush_date) {
    try {
      const lastFlushDate = new Date(apartment.last_flush_date)
      const now = new Date()
      const daysSinceLastFlush = Math.floor((now - lastFlushDate) / (1000 * 60 * 60 * 24))

      // 0-2 Tage nach letzter Spülung = "Anstehend" (kürzlich gespült)
      if (daysSinceLastFlush <= 1) {
        return t('apartments.statusPending')
      }
    } catch (error) {
      console.warn('Fehler beim Parsen des last_flush_date Datums:', error)
    }
  }

  // Standard für Apartments ohne Historie
  return t('apartments.statusCurrent')
}

const getRowClass = (apartment) => {
  // Keine farbigen Klassen mehr - Zebra-Streifen bleiben erhalten
  // Die Status-Information wird über Badges in den Zellen angezeigt
  return ''
}

const startFlushing = (apartment) => {
  // Navigiere zur neuen Spül-Detail-Seite
  router.push({
    name: 'ApartmentFlushing',
    params: {
      buildingId: buildingId.value,
      apartmentId: apartment.id
    },
    query: {
      buildingName: buildingName.value,
      apartmentNumber: apartment.number
    }
  })
}

const viewFlushHistory = (apartment) => {
  // Navigiere zur bestehenden Historie-Seite
  router.push({
    name: 'ApartmentFlushHistory',
    params: { id: apartment.id }
  })
}

// Zusätzliche Event-Listener für robuste Datenaktualisierung
let focusHandler = null
let visibilityHandler = null
let storageHandler = null
let refreshInterval = null

const setupEventListeners = () => {
  // Window focus event - lädt Daten wenn Benutzer zur Seite zurückkehrt
  focusHandler = () => {
    console.log('Window focused, reloading apartments data')
    loadApartments()
  }

  // Visibility change event - lädt Daten wenn Tab wieder sichtbar wird
  visibilityHandler = () => {
    if (!document.hidden) {
      console.log('Page became visible, reloading apartments data')
      loadApartments()
    }
  }

  // LocalStorage Event - lauscht auf Änderungen aus anderen Tabs/Windows
  storageHandler = (e) => {
    if (e.key === 'wls_apartments_db' || e.key === 'wls_apartments_metadata') {
      console.log('Storage changed, reloading apartments data')
      loadApartments()
    }
  }

  // Periodische Aktualisierung alle 30 Sekunden
  refreshInterval = setInterval(() => {
    if (!document.hidden) {
      console.log('Periodic refresh of apartments data')
      loadApartments()
    }
  }, 30000)

  window.addEventListener('focus', focusHandler)
  document.addEventListener('visibilitychange', visibilityHandler)
  window.addEventListener('storage', storageHandler)
}

const removeEventListeners = () => {
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler)
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
  }
  if (storageHandler) {
    window.removeEventListener('storage', storageHandler)
  }
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
}

onMounted(() => {
  console.log('Component mounted, loading apartments data')
  loadApartments()
  setupEventListeners()

  // Listen for apartment updates from storage and other components
  const apartmentUpdatedHandler = (e) => {
    try {
      const detail = e?.detail || {}
      const updatedBuildingId = detail.buildingId
      const updatedApartment = detail.apartment
      if (!updatedApartment) return

      if (String(updatedBuildingId) !== String(buildingId.value)) return

      // Update apartments reactive ref if present
      const idx = apartments.value.findIndex(a => a.id === updatedApartment.id)
      if (idx >= 0) {
        apartments.value.splice(idx, 1, updatedApartment)
        console.log('🔔 Apartment-Update angewendet in Übersicht:', updatedApartment.number)
      } else {
        apartments.value.push(updatedApartment)
        console.log('🔔 Neues Apartment zur Übersicht hinzugefügt:', updatedApartment.number)
      }

      // Refresh cache timestamp to indicate recent change
      try {
        const cacheKey = `apartments_${buildingId.value}_timestamp`
        localStorage.setItem(cacheKey, Date.now().toString())
        calculateCacheAge()
      } catch (err) {
        /* ignore */
      }
    } catch (err) {
      console.warn('Fehler beim Verarbeiten des apartment-updated Events:', err)
    }
  }

  window.addEventListener('wls_apartment_updated', apartmentUpdatedHandler)

  // Store handler on window for cleanup reference
  window.__wls_apartment_updated_handler = apartmentUpdatedHandler
})

onBeforeUnmount(() => {
  removeEventListeners()
  console.log('Component unmounted, cleaned up event listeners')

  // Cleanup custom event listener
  try {
    const handler = window.__wls_apartment_updated_handler
    if (handler) {
      window.removeEventListener('wls_apartment_updated', handler)
      delete window.__wls_apartment_updated_handler
    }
  } catch (e) {
    // ignore
  }
})

// Watch für Route-Änderungen - lädt Daten neu wenn man zur Seite zurücknavigiert
watch(() => route.fullPath, (newPath) => {
  // Nur neu laden wenn wir zu dieser Route navigieren (nicht weg von ihr)
  if (newPath.includes('/buildings/') && newPath.includes('/apartments')) {
    console.log('Route changed, reloading apartments data')
    nextTick(() => {
      loadApartments()
    })
  }
}, { immediate: false })

// Auch auf buildingId-Änderungen reagieren
watch(buildingId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    console.log('Building ID changed, reloading apartments data')
    nextTick(() => {
      loadApartments()
    })
  }
}, { immediate: false })

// Vor dem Verlassen der Route: Speichere aktuellen Zustand
onBeforeRouteLeave((to, from) => {
  console.log('Leaving route, storage stats:', storage.storage.getStats())
  return true
})
</script>

<style scoped src="@/styles/views/BuildingApartments.css"></style>

<style scoped>
/* Mobile-first: bei engen Bildschirmen Tabelle in Block-Layout umwandeln, damit kein horizontales Scrollen entsteht */
@media (max-width: 767.98px) {
  .building-apartments table thead {
    display: none;
  }
  .building-apartments table,
  .building-apartments tbody,
  .building-apartments tr,
  .building-apartments td,
  .building-apartments th {
    display: block;
    width: 100%;
  }
  .building-apartments tr {
    border: 1px solid #e9ecef;
    padding: 0.5rem;
    margin-bottom: 0.75rem;
    border-radius: 6px;
    background: #fff;
  }
  .building-apartments td {
    padding: 0.375rem 0;
    white-space: normal !important;
    word-break: break-word;
    overflow-wrap: anywhere;
    border: none;
  }
  .building-apartments td::before {
    content: attr(data-label);
    display: block;
    font-weight: 600;
    color: #6c757d;
    margin-bottom: 0.25rem;
  }
  .building-apartments .d-flex.gap-2 {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .building-apartments .text-muted {
    display: block;
  }

  /* Stelle sicher, dass CoreUI's .table-responsive auf kleinen Bildschirmen kein horizontales Scrollen erzwingt */
  .building-apartments .table-responsive {
    overflow-x: visible !important;
  }

  /* Erlaube Buttons innerhalb der Actions-Zelle zu umbrechen */
  .building-apartments td .d-flex.gap-2 > * {
    min-width: 0 !important;
  }

  /* Header: bei kleinen Bildschirmen Header-Row vertikal anordnen und Controls unter dem Titel platzieren */
  .building-apartments .header-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .building-apartments .header-actions {
    margin-top: 0.5rem;
    width: 100%;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  /* Der 'Aktualisieren' Button (und andere Header Controls) soll in mobilen Ansichten
     direkt unter dem Gebäudetitel erscheinen und touchfreundlich die volle Breite nutzen. */
  .building-apartments .header-actions > * {
    width: 100%;
    max-width: 100%;
  }

  /* Entferne evtl. rechter margin bei kleinen Elementen, damit Buttons sauber nebeneinander/untereinander sitzen */
  .building-apartments .header-actions > .me-2 {
    margin-right: 0 !important;
  }
}
</style>
