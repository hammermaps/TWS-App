<template>
  <div class="flushing-manager">
    <!-- Header mit Navigation -->
    <CRow class="mb-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <h4>Leerstandsspülungen</h4>
            <div class="d-flex align-items-center mt-2">
              <CButton
                color="primary"
                size="sm"
                @click="loadApartments"
                :disabled="loading"
              >
                <CIcon name="cilReload" class="me-1" />
                Aktualisieren
              </CButton>
              <CFormCheck
                v-model="autoNavigate"
                class="ms-3"
                label="Automatisch zur nächsten ungespülten Wohnung springen"
              />
            </div>
          </CCardHeader>
        </CCard>
      </CCol>
    </CRow>

    <!-- Apartment Liste -->
    <CRow class="mb-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <h5>Wohnungen</h5>
          </CCardHeader>
          <CCardBody>
            <div v-if="loading" class="text-center">
              <CSpinner />
              <p class="mt-2">Lade Wohnungen...</p>
            </div>
            <div v-else-if="error" class="alert alert-danger">
              {{ error }}
            </div>
            <CListGroup v-else>
              <CListGroupItem
                v-for="apartment in sortedApartments"
                :key="apartment.id"
                :class="{
                  'list-group-item-success': apartment.id === currentApartment?.id,
                  'list-group-item-warning': needsFlush(apartment),
                  'list-group-item-light': !apartment.enabled
                }"
                @click="selectApartment(apartment)"
                style="cursor: pointer"
              >
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{{ apartment.number }}</strong>
                    <span class="text-muted ms-2">Etage {{ apartment.floor }}</span>
                    <CBadge
                      v-if="!apartment.enabled"
                      color="secondary"
                      class="ms-2"
                    >
                      Deaktiviert
                    </CBadge>
                    <CBadge
                      v-else-if="needsFlush(apartment)"
                      color="warning"
                      class="ms-2"
                    >
                      Spülung fällig
                    </CBadge>
                    <CBadge
                      v-else
                      color="success"
                      class="ms-2"
                    >
                      OK
                    </CBadge>
                  </div>
                  <div class="text-end">
                    <small class="text-muted">
                      Letzte Spülung: {{ formatLastFlush(apartment) }}
                    </small>
                  </div>
                </div>
              </CListGroupItem>
            </CListGroup>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Spülungs-Steuerung -->
    <CRow v-if="currentApartment" class="mb-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <h5>Spülung für Wohnung {{ currentApartment.number }}</h5>
          </CCardHeader>
          <CCardBody>
            <div v-if="!isFlushingActive" class="text-center">
              <p class="mb-3">
                Mindestspüldauer: {{ currentApartment.min_flush_duration }} Sekunden
              </p>
              <CButton
                color="success"
                size="lg"
                @click="startFlushing"
                :disabled="flushingLoading"
              >
                <CIcon name="cilPlayArrow" class="me-2" />
                Spülung starten
              </CButton>
            </div>
            <div v-else class="text-center">
              <div class="mb-4">
                <div class="position-relative d-inline-block">
                  <svg width="200" height="200" class="countdown-circle">
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="#e9ecef"
                      stroke-width="10"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      :stroke="getCountdownColor()"
                      stroke-width="10"
                      stroke-linecap="round"
                      :stroke-dasharray="circumference"
                      :stroke-dashoffset="strokeDashoffset"
                      transform="rotate(-90 100 100)"
                      style="transition: stroke-dashoffset 1s linear"
                    />
                  </svg>
                  <div class="countdown-text">
                    <div class="countdown-number">{{ remainingTime }}</div>
                    <div class="countdown-label">Sekunden</div>
                  </div>
                </div>
              </div>
              <p class="mb-3">
                Spülung läuft seit {{ Math.floor((Date.now() - flushStartTime) / 1000) }} Sekunden
              </p>
              <CButton
                color="danger"
                size="lg"
                @click="stopFlushing"
                :disabled="flushingLoading || remainingTime > 0"
              >
                <CIcon name="cilStop" class="me-2" />
                Spülung beenden
              </CButton>
              <p class="mt-2 text-muted small">
                <span v-if="remainingTime > 0">
                  Mindestspüldauer noch nicht erreicht
                </span>
                <span v-else>
                  Mindestspüldauer erreicht - Spülung kann beendet werden
                </span>
              </p>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- GPS Status -->
    <CRow v-if="isFlushingActive" class="mb-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <h5>GPS Status</h5>
          </CCardHeader>
          <CCardBody>
            <div v-if="gpsLoading" class="text-center">
              <CSpinner size="sm" />
              <span class="ms-2">GPS Position wird ermittelt...</span>
            </div>
            <div v-else-if="gpsError" class="alert alert-warning">
              <CIcon name="cilLocationPin" class="me-2" />
              {{ gpsError }}
            </div>
            <div v-else-if="currentPosition" class="d-flex align-items-center">
              <CIcon name="cilLocationPin" class="me-2 text-success" />
              <span>
                Position: {{ currentPosition.latitude.toFixed(6) }}, {{ currentPosition.longitude.toFixed(6) }}
                <span v-if="currentPosition.accuracy" class="text-muted ms-2">
                  (±{{ Math.round(currentPosition.accuracy) }}m)
                </span>
              </span>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApiApartment } from '../../api/ApiApartment.js'
import { useApiRecords } from '../../api/ApiRecords.js'
import { currentUser } from '../../stores/GlobalUser.js'
import { CIcon } from '@coreui/icons-vue'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CSpinner,
  CListGroup,
  CListGroupItem,
  CBadge,
  CFormCheck
} from '@coreui/vue'

export default {
  name: 'FlushingManager',
  components: {
    CRow,
    CCol,
    CCard,
    CCardHeader,
    CCardBody,
    CButton,
    CIcon,
    CSpinner,
    CListGroup,
    CListGroupItem,
    CBadge,
    CFormCheck
  },
  setup() {
    // API Composables
    const { apartments, loading, error, list: loadApartments } = useApiApartment()
    const { create: createRecord, loading: recordLoading } = useApiRecords()

    // State
    const currentApartment = ref(null)
    const autoNavigate = ref(true)
    const isFlushingActive = ref(false)
    const flushStartTime = ref(0)
    const remainingTime = ref(0)
    const flushingLoading = ref(false)
    const countdownInterval = ref(null)

    // GPS State
    const gpsLoading = ref(false)
    const gpsError = ref(null)
    const currentPosition = ref(null)
    const watchId = ref(null)

    // Computed
    const sortedApartments = computed(() => {
      return [...apartments.value].sort((a, b) => {
        // Erst nach enabled/disabled sortieren
        if (a.enabled !== b.enabled) return b.enabled - a.enabled
        // Dann nach Spülbedarf
        const aNeedsFlush = needsFlush(a)
        const bNeedsFlush = needsFlush(b)
        if (aNeedsFlush !== bNeedsFlush) return bNeedsFlush - aNeedsFlush
        // Schließlich nach Nummer
        return a.sorted - b.sorted
      })
    })

    const circumference = 2 * Math.PI * 90
    const strokeDashoffset = computed(() => {
      if (!currentApartment.value) return circumference
      const progress = Math.max(0, remainingTime.value) / currentApartment.value.min_flush_duration
      return circumference * progress
    })

    // Methods
    const needsFlush = (apartment) => {
      if (!apartment.enabled) return false

      // Backend liefert jetzt next_flush_due - verwende diese Daten
      if (apartment.next_flush_due) {
        return new Date(apartment.next_flush_due) <= new Date()
      }

      // Fallback: Wenn next_flush_due nicht gesetzt ist, als fällig markieren
      return true
    }

    const formatLastFlush = (apartment) => {
      if (!apartment.last_flush_date) return 'Nie'
      const date = new Date(apartment.last_flush_date)
      return date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const selectApartment = (apartment) => {
      if (isFlushingActive.value) return
      currentApartment.value = apartment
    }

    const getCountdownColor = () => {
      if (!currentApartment.value || remainingTime.value <= 0) return '#28a745'
      const ratio = remainingTime.value / currentApartment.value.min_flush_duration
      if (ratio > 0.5) return '#dc3545'
      if (ratio > 0.2) return '#ffc107'
      return '#28a745'
    }

    const startFlushing = async () => {
      if (!currentApartment.value) return

      flushingLoading.value = true

      try {
        // GPS Position ermitteln
        await getCurrentPosition()

        isFlushingActive.value = true
        flushStartTime.value = Date.now()
        remainingTime.value = currentApartment.value.min_flush_duration

        // Countdown starten
        countdownInterval.value = setInterval(() => {
          remainingTime.value = Math.max(0, remainingTime.value - 1)
        }, 1000)

      } catch (error) {
        console.error('Fehler beim Starten der Spülung:', error)
        alert('Fehler beim Starten der Spülung: ' + error.message)
      } finally {
        flushingLoading.value = false
      }
    }

    const stopFlushing = async () => {
      if (!currentApartment.value || remainingTime.value > 0) return

      flushingLoading.value = true

      try {
        // Zeitstempel für start_time und end_time berechnen
        const endTime = new Date()
        const startTime = new Date(flushStartTime.value)

        // Record mit allen erforderlichen Feldern erstellen
        const createdRecord = await createRecord({
          apartment_id: currentApartment.value.id,
          building_id: currentApartment.value.building_id, // building_id aus apartment
          user_id: currentUser.value?.id || 1, // user_id aus globalem Store
          start_time: startTime.toISOString(), // ISO-String für Backend
          end_time: endTime.toISOString(), // ISO-String für Backend
          latitude: currentPosition.value?.latitude || null,
          longitude: currentPosition.value?.longitude || null,
          location_accuracy: currentPosition.value?.accuracy || null
        })

        console.log('✅ Spülung erfolgreich gespeichert:', createdRecord)

        // Cleanup
        if (countdownInterval.value) {
          clearInterval(countdownInterval.value)
          countdownInterval.value = null
        }

        stopWatchingPosition()

        isFlushingActive.value = false
        flushStartTime.value = 0
        remainingTime.value = 0
        currentPosition.value = null

        // Apartments-Liste aktualisieren für neue Spül-Daten
        await loadApartments()

        // Automatisch zur nächsten Wohnung springen (nach dem Refresh)
        if (autoNavigate.value) {
          const nextApartment = sortedApartments.value.find(apt =>
            apt.enabled && needsFlush(apt) && apt.id !== currentApartment.value.id
          )
          if (nextApartment) {
            currentApartment.value = nextApartment
          } else {
            currentApartment.value = null
          }
        }

      } catch (error) {
        console.error('Fehler beim Beenden der Spülung:', error)
        alert('Fehler beim Beenden der Spülung: ' + error.message)
      } finally {
        flushingLoading.value = false
      }
    }

    const getCurrentPosition = () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          gpsError.value = 'GPS wird von diesem Browser nicht unterstützt'
          return reject(new Error('GPS nicht unterstützt'))
        }

        gpsLoading.value = true
        gpsError.value = null

        const options = {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            currentPosition.value = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            }
            gpsLoading.value = false

            // Position überwachen
            startWatchingPosition()

            resolve(currentPosition.value)
          },
          (error) => {
            gpsLoading.value = false
            let errorMessage = 'GPS-Fehler'

            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'GPS-Berechtigung verweigert'
                break
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'GPS-Position nicht verfügbar'
                break
              case error.TIMEOUT:
                errorMessage = 'GPS-Timeout'
                break
            }

            gpsError.value = errorMessage
            reject(new Error(errorMessage))
          },
          options
        )
      })
    }

    const startWatchingPosition = () => {
      if (!navigator.geolocation || watchId.value) return

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }

      watchId.value = navigator.geolocation.watchPosition(
        (position) => {
          currentPosition.value = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
        },
        (error) => {
          console.warn('GPS Watch Position Error:', error)
        },
        options
      )
    }

    const stopWatchingPosition = () => {
      if (watchId.value) {
        navigator.geolocation.clearWatch(watchId.value)
        watchId.value = null
      }
    }

    // Lifecycle
    onMounted(() => {
      loadApartments()
    })

    onUnmounted(() => {
      if (countdownInterval.value) {
        clearInterval(countdownInterval.value)
      }
      stopWatchingPosition()
    })

    return {
      // State
      apartments,
      loading,
      error,
      currentApartment,
      autoNavigate,
      isFlushingActive,
      flushStartTime,
      remainingTime,
      flushingLoading,
      gpsLoading,
      gpsError,
      currentPosition,

      // Computed
      sortedApartments,
      strokeDashoffset,
      circumference,

      // Methods
      loadApartments,
      needsFlush,
      formatLastFlush,
      selectApartment,
      getCountdownColor,
      startFlushing,
      stopFlushing
    }
  }
}
</script>

<style scoped src="@/styles/views/FlushingManager.css"></style>
