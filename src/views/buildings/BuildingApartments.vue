<template>
  <div class="building-apartments">
    <!-- Header mit Gebäude-Info -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>Apartments - {{ buildingName || `Gebäude #${buildingId}` }}</h2>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <router-link to="/buildings" class="text-decoration-none">
                Gebäude
              </router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">
              {{ buildingName || `Gebäude #${buildingId}` }}
            </li>
          </ol>
        </nav>
      </div>
      <CButton color="primary" @click="loadApartments">
        <CIcon icon="cil-reload" class="me-2" />
        Aktualisieren
      </CButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center">
      <CSpinner color="primary" />
      <p class="mt-2">Lade Apartments...</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>Fehler:</strong> {{ error }}
    </CAlert>

    <!-- Apartments Table -->
    <CCard v-if="!loading && !error">
      <CCardHeader>
        <h5 class="mb-0">
          <CIcon icon="cil-home" class="me-2" />
          Apartment-Übersicht ({{ apartments?.length || 0 }} Apartments)
        </h5>
      </CCardHeader>
      <CCardBody class="p-0">
        <CTable hover responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Apartment</CTableHeaderCell>
              <CTableHeaderCell>Etage</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
              <CTableHeaderCell>Letzte Spülung</CTableHeaderCell>
              <CTableHeaderCell>Nächste Spülung</CTableHeaderCell>
              <CTableHeaderCell>Status Spülung</CTableHeaderCell>
              <CTableHeaderCell>Aktionen</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            <CTableRow
              v-for="apartment in sortedApartments"
              :key="apartment.id"
              :class="getRowClass(apartment)"
            >
              <CTableDataCell>
                <div class="d-flex align-items-center">
                  <CIcon icon="cil-door" class="me-2 text-muted" />
                  <strong>{{ apartment.number }}</strong>
                </div>
              </CTableDataCell>

              <CTableDataCell>
                <CBadge color="info" shape="rounded-pill">
                  {{ apartment.floor || 'N/A' }}
                </CBadge>
              </CTableDataCell>

              <CTableDataCell>
                <CBadge
                  :color="apartment.enabled ? 'success' : 'danger'"
                  shape="rounded-pill"
                >
                  {{ apartment.enabled ? 'Aktiv' : 'Deaktiviert' }}
                </CBadge>
              </CTableDataCell>

              <CTableDataCell>
                <div v-if="apartment.last_flush_date">
                  <div>{{ formatDate(apartment.last_flush_date) }}</div>
                  <small class="text-muted">{{ formatTimeAgo(apartment.last_flush_date) }}</small>
                </div>
                <span v-else class="text-muted">Noch nie</span>
              </CTableDataCell>

              <CTableDataCell>
                <div v-if="apartment.next_flush_due">
                  <div>{{ formatDate(apartment.next_flush_due) }}</div>
                  <small :class="getNextFlushClass(apartment.next_flush_due)">
                    {{ formatTimeToNext(apartment.next_flush_due) }}
                  </small>
                </div>
                <span v-else class="text-muted">Nicht geplant</span>
              </CTableDataCell>

              <CTableDataCell>
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

              <CTableDataCell>
                <div class="d-flex gap-2">
                  <CButton
                    color="primary"
                    size="sm"
                    :disabled="!apartment.enabled"
                    @click="startFlushing(apartment)"
                  >
                    <CIcon icon="cil-media-play" class="me-1" />
                    Spülen
                  </CButton>
                  <CButton
                    color="info"
                    size="sm"
                    variant="outline"
                    @click="viewFlushHistory(apartment)"
                  >
                    <CIcon icon="cil-history" class="me-1" />
                    Historie
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
            <p class="text-muted mb-0">Gesamt Apartments</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <h4 class="text-success">{{ activeApartments }}</h4>
            <p class="text-muted mb-0">Aktive Apartments</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <h4 class="text-warning">{{ overdueFlushes }}</h4>
            <p class="text-muted mb-0">Überfällige Spülungen</p>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="3">
        <CCard class="text-center">
          <CCardBody>
            <h4 class="text-info">{{ upcomingFlushes }}</h4>
            <p class="text-muted mb-0">Anstehende Spülungen</p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </div>
</template>

<script setup>
import { onMounted, computed, watch, nextTick, onUnmounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
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
const { apartments, loading, error, list, storage } = useApiApartment()

const buildingId = computed(() => route.params.id)
const buildingName = computed(() => route.query.buildingName)

const sortedApartments = computed(() => {
  if (!apartments.value || !Array.isArray(apartments.value)) return []
  return [...apartments.value].sort((a, b) => {
    // Erst nach Etage, dann nach Apartment-Nummer sortieren
    if (a.floor !== b.floor) {
      return (a.floor || '').localeCompare(b.floor || '')
    }
    return (a.number || '').localeCompare(b.number || '')
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

const loadApartments = async () => {
  console.log('Loading apartments for building:', buildingId.value)
  await list({ building_id: buildingId.value })
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unbekannt'
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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
    if (diffInDays < 30) return `in ${Math.floor(diffInDays / 7)} Wochen`
    return `in ${Math.floor(diffInDays / 30)} Monaten`
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
  if (!apartment.enabled) return 'Deaktiviert'
  if (isFlushOverdue(apartment)) return 'Überfällig'

  // Prüfe auf heute fällige Spülungen (höchste Priorität nach Überfällig)
  if (apartment.next_flush_due) {
    try {
      const nextFlushDate = new Date(apartment.next_flush_due)
      const now = new Date()
      const diffInDays = Math.floor((nextFlushDate - now) / (1000 * 60 * 60 * 24))

      // Heute fällig
      if (diffInDays === 0) {
        return 'Fällig'
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
        return 'Anstehend'
      }
    } catch (error) {
      console.warn('Fehler beim Parsen des last_flush_date Datums:', error)
    }
  }

  // Standard für Apartments ohne Historie
  return 'Aktuell'
}

const getRowClass = (apartment) => {
  // Deaktivierte Apartments grau
  if (!apartment.enabled) return 'table-secondary'

  // Prüfe zuerst auf überfällige Spülungen (rot)
  if (apartment.next_flush_due) {
    try {
      const nextFlushDate = new Date(apartment.next_flush_due)
      const now = new Date()
      const diffInDays = Math.floor((nextFlushDate - now) / (1000 * 60 * 60 * 24))

      // Überfällig (rot)
      if (diffInDays < 0) {
        return 'table-danger'
      }

      // Heute fällig (gelb)
      if (diffInDays === 0) {
        return 'table-warning'
      }
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
        return 'table-success'
      }
    } catch (error) {
      console.warn('Fehler beim Parsen des last_flush_date Datums:', error)
    }
  }

  // Standard (keine besondere Färbung)
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
})

// Vor dem Verlassen der Route: cleanup
onBeforeUnmount(() => {
  removeEventListeners()
  console.log('Component unmounted, cleaned up event listeners')
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
