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
            <CButton
              v-if="sortOrderChanged"
              color="success"
              @click="saveOrder"
              :disabled="savingOrder"
            >
              <CIcon icon="cil-save" class="me-2" />
              {{ savingOrder ? $t('common.saving') : $t('apartments.saveOrder') }}
            </CButton>
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
              <CTableHeaderCell style="width:36px"></CTableHeaderCell>
              <CTableHeaderCell>{{ $t('apartments.apartment') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('apartments.lastFlush') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('apartments.nextFlush') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('apartments.flushStatus') }}</CTableHeaderCell>
              <CTableHeaderCell>{{ $t('apartments.actions') }}</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            <CTableRow
              v-for="(apartment, index) in sortedApartments"
              :key="apartment.id"
              :class="[getRowClass(apartment), dragOverIndex === index ? 'drag-over' : '']"
              draggable="true"
              @dragstart="onDragStart(index, $event)"
              @dragover.prevent="onDragOver(index)"
              @dragleave="onDragLeave"
              @drop.prevent="onDrop(index)"
              @dragend="onDragEnd"
            >
              <CTableDataCell class="align-middle drag-handle-cell" title="Ziehen zum Sortieren">
                <span class="drag-handle">⠿</span>
              </CTableDataCell>
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
import { onMounted, computed, watch, nextTick, onBeforeUnmount, ref, reactive } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useApartmentStorage } from '@/stores/ApartmentStorage.js'
import { useApiApartment } from '@/api/ApiApartment.js'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'
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
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { apartments, loading, error, list, update, storage } = useApiApartment()
const onlineStatusStore = useOnlineStatusStore()

const buildingId = computed(() => route.params.id)
const buildingName = computed(() => route.query.buildingName)

// Lokale States für besseres UX
const isPreloading = ref(false)
const cacheAge = ref(null)

// Drag-and-Drop Sortierung
const dragIndex = ref(null)
const dragOverIndex = ref(null)
const sortOrderChanged = ref(false)
const savingOrder = ref(false)
const localOrder = ref([])

function onDragStart(index, event) {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}
function onDragOver(index) {
  dragOverIndex.value = index
}
function onDragLeave() {
  dragOverIndex.value = null
}
function onDrop(targetIndex) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const items = [...localOrder.value]
  const [moved] = items.splice(dragIndex.value, 1)
  items.splice(targetIndex, 0, moved)
  items.forEach((item, i) => { item.sorted = i + 1 })
  localOrder.value = items
  sortOrderChanged.value = true
  dragIndex.value = null
  dragOverIndex.value = null
}
function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

async function saveOrder() {
  if (!onlineStatusStore.isFullyOnline) {
    alert(t('common.offlineNotAvailable') || 'Nur im Online-Modus verfügbar')
    return
  }
  savingOrder.value = true
  try {
    const { getAuthHeaders } = await import('@/stores/GlobalToken.js')
    const { getApiBaseUrl } = await import('@/config/apiConfig.js')
    const payload = localOrder.value.map(a => ({ id: a.id, sorted: a.sorted }))
    const res = await fetch(`${getApiBaseUrl()}/apartments/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.success) {
      apartments.value = [...localOrder.value]
      sortOrderChanged.value = false
    } else {
      console.error('Reihenfolge speichern fehlgeschlagen:', data.error)
    }
  } catch (e) {
    console.error('Fehler beim Speichern der Reihenfolge:', e)
  } finally {
    savingOrder.value = false
  }
}

// Berechne das Alter des Caches (async via IndexedDB)
const calculateCacheAge = async () => {
  try {
    const cacheKey = `apartments_${buildingId.value}_timestamp`
    const result = await indexedDBHelper.get(STORES.METADATA, cacheKey)
    const timestamp = result?.value
    if (timestamp) {
      const ageInMinutes = Math.floor((Date.now() - parseInt(timestamp)) / 60000)
      cacheAge.value = ageInMinutes
    } else {
      cacheAge.value = null
    }
  } catch {
    cacheAge.value = null
  }
}

// Speichert Cache-Timestamp in IndexedDB
const saveCacheTimestamp = async () => {
  try {
    const cacheKey = `apartments_${buildingId.value}_timestamp`
    await indexedDBHelper.set(STORES.METADATA, { key: cacheKey, value: Date.now().toString() })
  } catch (e) {
    console.warn('⚠️ Fehler beim Speichern des Cache-Timestamps:', e)
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

const sortedApartments = computed(() => localOrder.value)

function initLocalOrder(source) {
  if (!source || !Array.isArray(source)) return
  const sorted = [...source].sort((a, b) => {
    const numA = Number(a.sorted ?? 0)
    const numB = Number(b.sorted ?? 0)
    if (numA !== numB) return numA - numB
    return (a.number || '').toString().localeCompare((b.number || '').toString(), undefined, { numeric: true })
  })
  sorted.forEach((item, i) => { item.sorted = item.sorted || (i + 1) })
  localOrder.value = sorted
  sortOrderChanged.value = false
}

watch(apartments, (val) => { if (!sortOrderChanged.value) initLocalOrder(val) }, { immediate: true })

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

  // Im Offline-Modus nur aus Cache laden
  const isOnline = onlineStatusStore.isFullyOnline

  if (!isOnline) {
    const cachedApartments = await storage.storage.getApartmentsForBuilding(buildingId.value)
    if (Array.isArray(cachedApartments) && cachedApartments.length > 0) {
      apartments.value = cachedApartments
      calculateCacheAge()
      console.log('📴 Offline: Apartments aus Cache geladen:', cachedApartments.length)
    } else {
      console.warn('📴 Offline: Keine gecachten Apartments gefunden')
      apartments.value = []
    }
    return
  }

  // Wenn nicht erzwungen, versuche Cache zu laden
  if (!forceRefresh) {
    const cachedApartments = await storage.storage.getApartmentsForBuilding(buildingId.value)
    if (Array.isArray(cachedApartments) && cachedApartments.length > 0) {
      apartments.value = cachedApartments
      calculateCacheAge()

      // Im Hintergrund aktualisieren (nur wenn online)
      isPreloading.value = true
      try {
        await list({ building_id: buildingId.value })
        await saveCacheTimestamp()
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
  await saveCacheTimestamp()
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
  // Window focus event - lädt Daten wenn Benutzer zur Seite zurückkehrt (nur online)
  focusHandler = () => {
    if (!onlineStatusStore.isFullyOnline) return
    console.log('Window focused, reloading apartments data')
    loadApartments()
  }

  // Visibility change event - lädt Daten wenn Tab wieder sichtbar wird (nur online)
  visibilityHandler = () => {
    if (!document.hidden && onlineStatusStore.isFullyOnline) {
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

  // Periodische Aktualisierung alle 30 Sekunden (nur online)
  refreshInterval = setInterval(() => {
    if (!document.hidden && onlineStatusStore.isFullyOnline) {
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
  // Wenn zurück von Spülung: forceRefresh um aktuelle Daten zu laden
  const forceRefreshOnMount = route.query.refresh === '1' || route.query.refresh === 'true'
  loadApartments(forceRefreshOnMount)
  setupEventListeners()

  // Listen for apartment updates from storage and other components
  const apartmentUpdatedHandler = async (e) => {
    try {
      console.log('🔔 wls_apartment_updated Event empfangen:', e.detail)
      const detail = e?.detail || {}
      const updatedBuildingId = detail.buildingId
      const updatedApartment = detail.apartment

      console.log('🔍 Event Details - Building ID:', updatedBuildingId, 'Current Building ID:', buildingId.value)

      if (!updatedApartment) {
        console.warn('⚠️ Kein Apartment im Event-Detail gefunden')
        return
      }

      if (String(updatedBuildingId) !== String(buildingId.value)) {
        console.log('⏭️ Event ignoriert - anderes Gebäude (Event:', updatedBuildingId, 'Current:', buildingId.value, ')')
        return
      }

      console.log('✅ Event ist für aktuelles Gebäude - aktualisiere Apartment:', updatedApartment.number)

      // Update apartments reactive ref if present
      const idx = apartments.value.findIndex(a => a.id === updatedApartment.id)
      if (idx >= 0) {
        apartments.value.splice(idx, 1, updatedApartment)
        console.log('✅ Apartment-Update angewendet in Übersicht:', updatedApartment.number)
      } else {
        apartments.value.push(updatedApartment)
        console.log('✅ Neues Apartment zur Übersicht hinzugefügt:', updatedApartment.number)
      }

      // Refresh cache timestamp to indicate recent change
      try {
        await saveCacheTimestamp()
        calculateCacheAge()
        console.log('✅ Cache-Timestamp aktualisiert')
      } catch (err) {
        console.warn('⚠️ Fehler beim Aktualisieren des Cache-Timestamps:', err)
      }
    } catch (err) {
      console.error('❌ Fehler beim Verarbeiten des apartment-updated Events:', err)
    }
  }

  console.log('📡 Registriere Event-Listener für wls_apartment_updated')
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
    const forceRefresh = route.query.refresh === '1' || route.query.refresh === 'true'
    console.log('Route changed, reloading apartments data, forceRefresh:', forceRefresh)
    nextTick(() => {
      loadApartments(forceRefresh)
    })
  }
}, { immediate: false })

// Spezifischer Watch auf refresh-Parameter: lädt Daten wenn refresh=1 gesetzt wird
watch(() => route.query.refresh, (newVal) => {
  if (newVal === '1' || newVal === 'true') {
    console.log('🔄 refresh-Parameter erkannt - lade Apartments neu')
    nextTick(() => {
      loadApartments(true)
    })
  }
}, { immediate: false })

// Reagiere auf wls_apartment_updated aus dem Storage (nach Spülung)
window.addEventListener('wls_apartment_updated', async (e) => {
  const detail = e?.detail || {}
  if (String(detail.buildingId) === String(buildingId.value) && detail.apartment) {
    const idx = apartments.value.findIndex(a => a.id === detail.apartment.id)
    if (idx >= 0) {
      apartments.value.splice(idx, 1, detail.apartment)
    }
  }
})

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
.drag-handle-cell { width: 36px; text-align: center; }
.drag-handle { cursor: grab; font-size: 1.2rem; color: #adb5bd; user-select: none; }
.drag-handle:active { cursor: grabbing; }
tr[draggable="true"] { cursor: default; }
tr.drag-over td { background-color: #cfe2ff !important; }
</style>

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
