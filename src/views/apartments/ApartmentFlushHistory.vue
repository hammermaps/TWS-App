<template>
  <div class="apartment-flush-history">
    <!-- Header in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>Spülhistorie - Wohnung {{ apartment?.number || 'Unbekannt' }}</h2>
            <p class="text-muted mb-0">Übersicht aller durchgeführten Spülungen</p>
          </div>
          <div class="d-flex gap-2">
            <CButton
              color="primary"
              @click="loadHistory"
              :disabled="loading"
            >
              <CIcon name="cilReload" class="me-2" />
              Aktualisieren
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Apartment Info -->
    <CRow v-if="apartment" class="mb-4">
      <CCol md="6">
        <CCard>
          <CCardHeader>
            <h5>Wohnungsinformationen</h5>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol sm="6">
                <strong>Nummer:</strong> {{ apartment.number }}
              </CCol>
              <CCol sm="6">
                <strong>Etage:</strong> {{ apartment.floor }}
              </CCol>
            </CRow>
            <CRow class="mt-2">
              <CCol sm="6">
                <strong>Mindestspüldauer:</strong> {{ apartment.min_flush_duration }}s
              </CCol>
              <CCol sm="6">
                <strong>Status:</strong>
                <CBadge :color="apartment.enabled ? 'success' : 'secondary'">
                  {{ apartment.enabled ? 'Aktiv' : 'Deaktiviert' }}
                </CBadge>
              </CCol>
            </CRow>
            <CRow class="mt-2">
              <CCol sm="6">
                <strong>Letzte Spülung:</strong>
                <span v-if="apartment.last_flush_date">
                  {{ formatDateTime(apartment.last_flush_date) }}
                </span>
                <span v-else class="text-muted">Nie</span>
              </CCol>
              <CCol sm="6">
                <strong>Nächste Spülung:</strong>
                <span v-if="apartment.next_flush_due" :class="isOverdue ? 'text-danger' : 'text-success'">
                  {{ formatDateTime(apartment.next_flush_due) }}
                  <CBadge v-if="isOverdue" color="danger" class="ms-1">Überfällig</CBadge>
                </span>
                <span v-else class="text-muted">Nicht geplant</span>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md="6">
        <CCard>
          <CCardHeader>
            <h5>Statistiken</h5>
          </CCardHeader>
          <CCardBody>
            <CRow v-if="stats">
              <CCol sm="6">
                <div class="text-center">
                  <div class="fs-4 fw-bold text-primary">{{ stats.totalFlushes }}</div>
                  <div class="text-muted small">Gesamt Spülungen</div>
                </div>
              </CCol>
              <CCol sm="6">
                <div class="text-center">
                  <div class="fs-4 fw-bold text-info">{{ stats.avgDuration }}s</div>
                  <div class="text-muted small">Ø Spüldauer</div>
                </div>
              </CCol>
            </CRow>
            <CRow class="mt-2" v-if="stats">
              <CCol sm="6">
                <div class="text-center">
                  <div class="fs-4 fw-bold text-success">{{ stats.lastMonth }}</div>
                  <div class="text-muted small">Letzter Monat</div>
                </div>
              </CCol>
              <CCol sm="6">
                <div class="text-center">
                  <div class="fs-4 fw-bold text-warning">{{ stats.thisMonth }}</div>
                  <div class="text-muted small">Dieser Monat</div>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Spülhistorie -->
    <CRow>
      <CCol>
        <CCard>
          <CCardHeader>
            <h5>Letzte 12 Spülungen</h5>
          </CCardHeader>
          <CCardBody>
            <div v-if="loading" class="text-center py-4">
              <CSpinner />
              <p class="mt-2 text-muted">Lade Spülhistorie...</p>
            </div>
            <div v-else-if="error" class="alert alert-danger">
              <CIcon name="cilWarning" class="me-2" />
              {{ error }}
            </div>
            <div v-else-if="flushHistory.length === 0" class="text-center py-4">
              <CIcon name="cilInfo" size="xl" class="text-muted mb-3" />
              <h5 class="text-muted">Keine Spülungen gefunden</h5>
              <p class="text-muted">Für diese Wohnung wurden noch keine Spülungen durchgeführt.</p>
            </div>
            <div v-else>
              <!-- Tabelle für größere Bildschirme -->
              <CTable class="d-none d-md-table" responsive striped hover>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Datum/Zeit</CTableHeaderCell>
                    <CTableHeaderCell>Dauer</CTableHeaderCell>
                    <CTableHeaderCell>Benutzer</CTableHeaderCell>
                    <CTableHeaderCell>GPS Position</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  <CTableRow v-for="record in flushHistory" :key="record.id">
                    <CTableDataCell>
                      <div>
                        <strong>{{ formatDate(record.start_time) }}</strong>
                      </div>
                      <div class="text-muted small">
                        {{ formatTime(record.start_time) }} - {{ formatTime(record.end_time) }}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge :color="getDurationColor(record.duration)">
                        {{ record.duration }}s
                      </CBadge>
                      <div v-if="apartment && record.duration < apartment.min_flush_duration" class="text-warning small mt-1">
                        <CIcon name="cilWarning" size="sm" />
                        Unter Mindestdauer
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <span v-if="record.user_id">{{ getUserName(record.user_id) }}</span>
                      <span v-else class="text-muted">Unbekannt</span>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div v-if="record.latitude && record.longitude">
                        <div class="small">
                          <CIcon name="cilLocationPin" class="me-1" />
                          {{ record.latitude.toFixed(4) }}, {{ record.longitude.toFixed(4) }}
                        </div>
                        <div v-if="record.location_accuracy" class="text-muted small">
                          Genauigkeit: ±{{ Math.round(record.location_accuracy) }}m
                        </div>
                      </div>
                      <span v-else class="text-muted small">Keine GPS-Daten</span>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge
                        :color="apartment && record.duration >= apartment.min_flush_duration ? 'success' : 'danger'"
                      >
                        {{ apartment && record.duration >= apartment.min_flush_duration ? 'OK' : 'Zu kurz' }}
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>

              <!-- Karten für mobile Geräte -->
              <div class="d-md-none">
                <CCard
                  v-for="record in flushHistory"
                  :key="record.id"
                  class="mb-3"
                >
                  <CCardBody>
                    <div class="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <strong>{{ formatDate(record.start_time) }}</strong>
                        <div class="text-muted small">
                          {{ formatTime(record.start_time) }} - {{ formatTime(record.end_time) }}
                        </div>
                      </div>
                      <CBadge :color="getDurationColor(record.duration)">
                        {{ record.duration }}s
                      </CBadge>
                    </div>

                    <div class="row">
                      <div class="col-6">
                        <small class="text-muted">Benutzer:</small><br>
                        <span v-if="record.user_id">{{ getUserName(record.user_id) }}</span>
                        <span v-else class="text-muted">Unbekannt</span>
                      </div>
                      <div class="col-6">
                        <small class="text-muted">Status:</small><br>
                        <CBadge
                          :color="apartment && record.duration >= apartment.min_flush_duration ? 'success' : 'danger'"
                        >
                          {{ apartment && record.duration >= apartment.min_flush_duration ? 'OK' : 'Zu kurz' }}
                        </CBadge>
                      </div>
                    </div>

                    <div v-if="record.latitude && record.longitude" class="mt-2">
                      <small class="text-muted">GPS:</small><br>
                      <span class="small">
                        <CIcon name="cilLocationPin" class="me-1" />
                        {{ record.latitude.toFixed(4) }}, {{ record.longitude.toFixed(4) }}
                        <span v-if="record.location_accuracy" class="text-muted">
                          (±{{ Math.round(record.location_accuracy) }}m)
                        </span>
                      </span>
                    </div>
                  </CCardBody>
                </CCard>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </div>
</template>

<script>
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRoute } from 'vue-router'
import { formatDate, formatDateTime, formatTime } from '@/utils/dateFormatter.js'
import { useApiApartment } from '../../api/ApiApartment.js'
import { useApiRecords } from '../../api/ApiRecords.js'
import { getCurrentUser } from '../../stores/GlobalUser.js'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CSpinner,
  CBadge,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'

export default {
  name: 'ApartmentFlushHistory',
  components: {
    CRow,
    CCol,
    CCard,
    CCardHeader,
    CCardBody,
    CButton,
    CIcon,
    CSpinner,
    CBadge,
    CTable,
    CTableHead,
    CTableBody,
    CTableRow,
    CTableHeaderCell,
    CTableDataCell
  },
  setup() {
    const route = useRoute()

    // API Composables
    const { getApartment, loading: apartmentLoading } = useApiApartment()
    const { getByApartment: getRecords, loading: recordsLoading } = useApiRecords()

    // State
    const apartment = ref(null)
    const flushHistory = ref([])
    const error = ref(null)
    const userCache = ref(new Map()) // Cache für geladene User-Namen
    const userNames = ref(new Map()) // Reaktive User-Namen für Template

    // Computed
    const loading = computed(() => apartmentLoading.value || recordsLoading.value)

    const isOverdue = computed(() => {
      if (!apartment.value?.next_flush_due) return false
      return new Date(apartment.value.next_flush_due) < new Date()
    })

    const stats = computed(() => {
      if (flushHistory.value.length === 0) return null

      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const totalFlushes = flushHistory.value.length
      const avgDuration = Math.round(
        flushHistory.value.reduce((sum, record) => sum + record.duration, 0) / totalFlushes
      )

      const lastMonthCount = flushHistory.value.filter(record => {
        const date = new Date(record.start_time)
        return date >= lastMonth && date < thisMonth
      }).length

      const thisMonthCount = flushHistory.value.filter(record => {
        const date = new Date(record.start_time)
        return date >= thisMonth
      }).length

      return {
        totalFlushes,
        avgDuration,
        lastMonth: lastMonthCount,
        thisMonth: thisMonthCount
      }
    })

    // Methods
    const loadUserName = async (userId) => {
      if (!userId) return 'Unbekannt'

      try {
        // 1. Prüfe Cache zuerst
        if (userCache.value.has(userId)) {
          const cachedName = userCache.value.get(userId)
          userNames.value.set(userId, cachedName)
          return cachedName
        }

        // 2. Versuche zunächst den aktuellen Benutzer aus GlobalUser zu laden
        const currentUser = getCurrentUser()
        if (currentUser && currentUser.id === userId && currentUser.name) {
          userCache.value.set(userId, currentUser.name)
          userNames.value.set(userId, currentUser.name)
          return currentUser.name
        }

        // 3. Fallback: Versuche Benutzer direkt aus LocalStorage zu laden
        const userDataStr = localStorage.getItem('wls_current_user')
        if (userDataStr) {
          const userData = JSON.parse(userDataStr)
          if (userData.id === userId && userData.name) {
            userCache.value.set(userId, userData.name)
            userNames.value.set(userId, userData.name)
            return userData.name
          }
        }

        // 4. Setze erstmal Fallback, damit UI nicht leer ist
        const fallbackName = `Benutzer ${userId}`
        userNames.value.set(userId, fallbackName)

        // 5. Backend-Abfrage als letzter Fallback
        console.log('🔍 User nicht im LocalStorage gefunden, frage Backend ab für User-ID:', userId)

        try {
          // Importiere die API-Funktion dynamisch
          const { useApiUser } = await import('../../api/ApiUser.js')
          const { getUser } = useApiUser()

          const userResult = await getUser(userId)
          if (userResult && userResult.name) {
            console.log('✅ User aus Backend geladen:', userResult.name)
            userCache.value.set(userId, userResult.name)
            userNames.value.set(userId, userResult.name)
            return userResult.name
          }
        } catch (apiError) {
          console.warn('⚠️ Backend-Abfrage für User fehlgeschlagen:', apiError.message)
        }

        // 6. Fallback bleibt bestehen
        userCache.value.set(userId, fallbackName)
        return fallbackName

      } catch (error) {
        console.warn('Fehler beim Laden des Benutzernamens:', error)
        const fallbackName = `Benutzer ${userId}`
        userCache.value.set(userId, fallbackName)
        userNames.value.set(userId, fallbackName)
        return fallbackName
      }
    }

    // Synchrone Funktion für Template
    const getUserName = (userId) => {
      if (!userId) return 'Unbekannt'

      // Starte asynchrones Laden falls noch nicht vorhanden
      if (!userNames.value.has(userId)) {
        loadUserName(userId)
        return `Benutzer ${userId}` // Temporärer Fallback
      }

      return userNames.value.get(userId) || `Benutzer ${userId}`
    }

    // Lade alle User-Namen wenn Historie geladen wird
    const loadAllUserNames = async () => {
      const uniqueUserIds = [...new Set(flushHistory.value.map(record => record.user_id).filter(Boolean))]

      // Lade alle User-Namen parallel
      await Promise.all(uniqueUserIds.map(userId => loadUserName(userId)))
    }


    const getDurationColor = (duration) => {
      if (!apartment.value) return 'secondary'
      if (duration >= apartment.value.min_flush_duration) return 'success' // Grün für OK
      if (duration >= apartment.value.min_flush_duration * 0.8) return 'warning' // Gelb für fast OK
      return 'danger' // Rot für zu kurz
    }

    const loadApartment = async () => {
      try {
        error.value = null
        const apartmentId = route.params.id
        if (!apartmentId) {
          error.value = 'Keine Wohnungs-ID angegeben'
          return
        }

        const result = await getApartment(apartmentId)
        if (result) {
          apartment.value = result
        } else {
          error.value = 'Wohnung nicht gefunden'
        }
      } catch (err) {
        console.error('Fehler beim Laden der Wohnung:', err)
        error.value = err.message || 'Fehler beim Laden der Wohnung'
      }
    }

    const loadFlushHistory = async () => {
      try {
        if (!apartment.value) return

        const records = await getRecords(apartment.value.id, { limit: 12 })
        flushHistory.value = records || []

        // Lade alle Benutzernamen nach dem Laden der Historie
        await loadAllUserNames()
      } catch (err) {
        console.error('Fehler beim Laden der Spülhistorie:', err)
        error.value = err.message || 'Fehler beim Laden der Spülhistorie'
      }
    }

    const loadHistory = async () => {
      await loadApartment()
      if (apartment.value) {
        await loadFlushHistory()
      }
    }

    // Watchers
    watch(() => route.params.id, () => {
      loadHistory()
    })

    // Lifecycle
    onMounted(() => {
      loadHistory()
    })

    onActivated(() => {
      loadHistory()
    })

    return {
      // State
      apartment,
      flushHistory,
      loading,
      error,

      // Computed
      isOverdue,
      stats,

      // Methods
      loadHistory,
      formatDateTime,
      formatDate,
      formatTime,
      getDurationColor,
      getUserName
    }
  }
}
</script>

<style scoped src="@/styles/views/ApartmentFlushHistory.css"></style>
