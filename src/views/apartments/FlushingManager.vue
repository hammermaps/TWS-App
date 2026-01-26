<template>
  <div class="flushing-manager">
    <!-- Header mit Navigation in Card -->
    <CCard class="mb-4">
      <CCardBody>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2>{{ $t('flushing.title') }}</h2>
            <p class="text-muted mb-0">{{ $t('flushing.subtitle') }}</p>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <CButton
              color="primary"
              @click="loadApartments"
              :disabled="loading"
            >
              <CIcon name="cilReload" class="me-2" />
              {{ $t('common.refresh') }}
            </CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>

    <!-- Auto-Navigate Option -->
    <CCard class="mb-4">
      <CCardBody>
        <CFormCheck
          v-model="autoNavigate"
          :label="$t('flushing.autoNavigate')"
        />
      </CCardBody>
    </CCard>

    <!-- Apartment Liste -->
    <CRow class="mb-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <h5>{{ $t('nav.apartments') }}</h5>
          </CCardHeader>
          <CCardBody>
            <div v-if="loading" class="text-center">
              <CSpinner />
              <p class="mt-2">{{ $t('apartments.loading') }}</p>
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
                    <span class="text-muted ms-2">{{ $t('flushing.floor') }} {{ apartment.floor }}</span>
                    <CBadge
                      v-if="!apartment.enabled"
                      color="secondary"
                      class="ms-2"
                    >
                      {{ $t('flushing.disabled') }}
                    </CBadge>
                    <CBadge
                      v-else-if="needsFlush(apartment)"
                      color="warning"
                      class="ms-2"
                    >
                      {{ $t('apartments.needsFlushing') }}
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
                      {{ $t('flushing.lastFlush') }}: {{ formatLastFlush(apartment) }}
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
            <h5>{{ $t('flushing.flushControl') }} {{ $t('flushing.apartment') }} {{ currentApartment.number }}</h5>
          </CCardHeader>
          <CCardBody>
            <div v-if="!isFlushingActive" class="text-center">
              <p class="mb-3">
                {{ $t('flushing.minDuration') }}: {{ currentApartment.min_flush_duration }} {{ $t('flushing.seconds') }}
              </p>
              <CButton
                color="success"
                size="lg"
                @click="startFlushing"
                :disabled="flushingLoading"
              >
                <CIcon name="cilPlayArrow" class="me-2" />
                {{ $t('flushing.startFlush') }}
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
                    <div class="countdown-label">{{ $t('flushing.seconds') }}</div>
                  </div>
                </div>
              </div>
              <p class="mb-3">
                {{ $t('flushing.flushRunning', { seconds: Math.floor((Date.now() - flushStartTime) / 1000) }) }}
              </p>
              <CButton
                color="danger"
                size="lg"
                @click="stopFlushing"
                :disabled="flushingLoading || remainingTime > 0"
              >
                <CIcon name="cilStop" class="me-2" />
                {{ $t('flushing.stopFlush') }}
              </CButton>
              <p class="mt-2 text-muted small">
                <span v-if="remainingTime > 0">
                  {{ $t('flushing.minDurationNotReached') }}
                </span>
                <span v-else>
                  {{ $t('flushing.minDurationReached') }}
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
            <h5>{{ $t('flushing.gpsStatus') }}</h5>
          </CCardHeader>
          <CCardBody>
            <div v-if="gpsLoading" class="text-center">
              <CSpinner size="sm" />
              <span class="ms-2">{{ $t('flushing.gpsLoading') }}</span>
            </div>
            <div v-else-if="gpsError" class="alert alert-warning">
              <CIcon name="cilLocationPin" class="me-2" />
              {{ gpsError }}
            </div>
            <div v-else-if="currentPosition" class="d-flex align-items-center">
              <CIcon name="cilLocationPin" class="me-2 text-success" />
              <span>
                {{ $t('flushing.position') }}: {{ currentPosition.latitude.toFixed(6) }}, {{ currentPosition.longitude.toFixed(6) }}
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
import { formatDateTime } from '@/utils/dateFormatter.js'
import { useApiApartment } from '../../api/ApiApartment.js'
import { useApiRecords } from '../../api/ApiRecords.js'
import { currentUser } from '../../stores/GlobalUser.js'
import { useApartmentStorage } from '../../stores/ApartmentStorage.js'
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
    const apartmentStorage = useApartmentStorage()
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
      return formatDateTime(apartment.last_flush_date)
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
        // GPS Position ermitteln (zeige Loading an)
        gpsLoading.value = true
        gpsError.value = null
        try {
          await getCurrentPosition({ timeout: 8000, maximumAge: 0 })
        } catch (e) {
          // Nicht kritisch hier: wir starten auch ohne GPS, aber dokumentieren den Fehler
          console.warn('Warnung: konnte keine GPS-Position vor dem Start ermitteln', e)
          gpsError.value = e.message || String(e)
        } finally {
          gpsLoading.value = false
        }

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

    const waitForPosition = (timeoutMs = 10000) => {
      return new Promise((resolve, reject) => {
        if (currentPosition.value) return resolve(currentPosition.value)
        const start = Date.now()
        const check = setInterval(() => {
          if (currentPosition.value) {
            clearInterval(check)
            resolve(currentPosition.value)
          } else if (Date.now() - start > timeoutMs) {
            clearInterval(check)
            reject(new Error('Timeout beim Warten auf GPS-Position'))
          }
        }, 250)
      })
    }

    const stopFlushing = async () => {
      if (!currentApartment.value || remainingTime.value > 0) return

      flushingLoading.value = true

      try {
        // Stelle sicher, dass wir ggf. noch eine aktuelle Position haben bevor wir das Record speichern
        gpsError.value = null
        try {
          gpsLoading.value = true
          // Wenn noch keine Position vorliegt, versuche kurz noch eine zu holen (kürzerer Timeout)
          if (!currentPosition.value) {
            try {
              // Erster Versuch: schneller Abruf
              await getCurrentPosition({ timeout: 7000, maximumAge: 0 })
            } catch (e) {
              console.warn('Konnte vor dem Speichern keine GPS-Position ermitteln (Versuch 1):', e)
              // Zweiter Versuch: längerer Timeout
              try {
                await getCurrentPosition({ timeout: 15000, maximumAge: 0 })
              } catch (e2) {
                console.warn('Konnte vor dem Speichern keine GPS-Position ermitteln (Versuch 2):', e2)
                // Dritter Versuch: warte auf einen watch-basierten Wert kurz
                try {
                  await waitForPosition(10000)
                } catch (e3) {
                  console.warn('Kein GPS-Ergebnis nach Warteversuch:', e3)
                  // leave gpsError for UI
                  gpsError.value = gpsError.value || e3.message || String(e3)
                }
              }
            }
          }
        } finally {
          gpsLoading.value = false
        }

        // Zeitstempel für start_time und end_time berechnen
        const endTime = new Date()
        const startTime = new Date(flushStartTime.value)

        // Record mit allen erforderlichen Feldern erstellen
        const recordPayload = {
          apartment_id: currentApartment.value.id,
          building_id: currentApartment.value.building_id, // building_id aus apartment
          user_id: currentUser.value?.id || 1, // user_id aus globalem Store
          start_time: startTime.toISOString(), // ISO-String für Backend
          end_time: endTime.toISOString(), // ISO-String für Backend
          latitude: currentPosition.value?.latitude || null,
          longitude: currentPosition.value?.longitude || null,
          location_accuracy: currentPosition.value?.accuracy || null
        }

        // Debug: Zeige das Payload bevor es gesendet wird
        console.debug('Spülungs-Record Payload:', recordPayload)

        if (!recordPayload.latitude || !recordPayload.longitude) {
          gpsError.value = gpsError.value || 'Keine GPS-Daten verfügbar'
          console.warn('Keine GPS-Daten im Payload, sende Record trotzdem (Backend erhält nulls):', recordPayload)
        }

        const createdRecord = await createRecord(recordPayload)

        console.log('✅ Spülung erfolgreich gespeichert:', createdRecord)

        // Update local apartment data so UI shows correct last/next flush immediately (important for offline mode)
        // Setze last_flush_date und next_flush_due (72h / 3 Tage) auf dem Apartment lokal
        try {
          const endIso = endTime.toISOString()
          const nextDue = new Date(endTime.getTime() + 72 * 3600 * 1000) // 72 Stunden

          // Aktualisiere currentApartment
          if (currentApartment.value) {
            currentApartment.value.last_flush_date = endIso
            currentApartment.value.next_flush_due = nextDue.toISOString()
          }

          // Aktualisiere das apartments-Array (reaktiv)
          const idx = apartments.value.findIndex(a => a.id === currentApartment.value?.id)
          if (idx !== -1) {
            // merge changes immutably to ensure Vue reactivity
            const updatedApt = {
              ...apartments.value[idx],
              last_flush_date: endIso,
              next_flush_due: nextDue.toISOString()
            }
            apartments.value.splice(idx, 1, updatedApt)

            // --- NEW: Also update the ApartmentStorage so other views receive the update event ---
            try {
              apartmentStorage.updateApartment(updatedApt.building_id, updatedApt)
            } catch (e) {
              console.warn('⚠️ Fehler beim Aktualisieren des ApartmentStorage nach Spülung:', e)
            }
          }

        } catch (e) {
          console.warn('⚠️ Fehler beim lokalen Aktualisieren der Apartment-Daten nach Spülung:', e)
        }

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
        // Versuche remote zu laden (falls online). Bei Offline-Betrieb haben wir bereits lokal aktualisiert.
        await loadApartments()

        // Falls die nachgeladene Liste die erwartete 72h-Nachfrist überschrieben hat,
        // wende die lokale Berechnung erneut an, damit die UI korrekt 72 Stunden anzeigt.
        try {
          const endIsoReapply = endTime.toISOString()
          const expectedNextDueIso = new Date(endTime.getTime() + 72 * 3600 * 1000).toISOString()
          const idxAfter = apartments.value.findIndex(a => a.id === currentApartment.value?.id)
          if (idxAfter !== -1) {
            const apt = apartments.value[idxAfter]
            if (apt.next_flush_due !== expectedNextDueIso || apt.last_flush_date !== endIsoReapply) {
              const updatedApt2 = { ...apt, last_flush_date: endIsoReapply, next_flush_due: expectedNextDueIso }
              apartments.value.splice(idxAfter, 1, updatedApt2)

              // Ensure storage + other views are updated as well
              try {
                apartmentStorage.updateApartment(updatedApt2.building_id, updatedApt2)
              } catch (e) {
                console.warn('⚠️ Fehler beim erneuten Anwenden der lokalen Spülungs-Aktualisierung im Storage:', e)
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ Fehler beim erneuten Anwenden der lokalen Spülungs-Aktualisierung:', e)
        }

         // Automatisch zur nächsten Wohnung springen (nach dem Refresh)
         if (autoNavigate.value) {
          const nextApartment = sortedApartments.value.find(apt =>
            apt.enabled && needsFlush(apt) && apt.id !== currentApartment.value.id
          )
          if (nextApartment) {
            selectApartment(nextApartment)
          }
        }

      } catch (error) {
        console.error('Fehler beim Stoppen der Spülung:', error)
        alert('Fehler beim Stoppen der Spülung: ' + error.message)
      } finally {
        flushingLoading.value = false
      }
    }

    // Hilfsfunktion: erhalte Position, optional mit überschriebenen Optionen
    const getCurrentPosition = (optsOverride) => {
      return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          const err = new Error('Geolocation wird von diesem Gerät/Browser nicht unterstützt')
          console.warn('Geolocation not supported')
          return reject(err)
        }

        const defaultOpts = {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
        const optsSingle = optsOverride || defaultOpts

        // Versuch 1: Schneller Einzelabruf (getCurrentPosition)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            currentPosition.value = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            }
            // Wenn noch kein watch läuft, starte einen, damit wir später Updates haben
            try {
              if (!watchId.value) {
                watchId.value = navigator.geolocation.watchPosition(
                  (p) => {
                    currentPosition.value = {
                      latitude: p.coords.latitude,
                      longitude: p.coords.longitude,
                      accuracy: p.coords.accuracy
                    }
                  },
                  (werr) => {
                    console.warn('watchPosition error', werr)
                  },
                  { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
                )
              }
            } catch (e) {
              console.warn('Fehler beim Starten von watchPosition nach getCurrentPosition:', e)
            }

            resolve(currentPosition.value)
          },
          (error) => {
            console.warn('getCurrentPosition fehlgeschlagen, versuche watchPosition als Fallback', error)

            // Fallback: watchPosition nutzen und auf erstes Ergebnis warten
            try {
              if (watchId.value) {
                // Wenn bereits ein watch läuft, warte kurz ob currentPosition gesetzt wird
                const waitStart = Date.now()
                const checkInterval = setInterval(() => {
                  if (currentPosition.value) {
                    clearInterval(checkInterval)
                    resolve(currentPosition.value)
                  } else if (Date.now() - waitStart > (optsSingle.timeout || 10000)) {
                    clearInterval(checkInterval)
                    reject(new Error('Kein Positionsergebnis vom bereits laufenden watchPosition innerhalb Timeout'))
                  }
                }, 250)
              } else {
                watchId.value = navigator.geolocation.watchPosition(
                  (position) => {
                    currentPosition.value = {
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      accuracy: position.coords.accuracy
                    }
                    // Sobald wir das erste Ergebnis haben, lösen wir das Promise auf
                    resolve(currentPosition.value)
                  },
                  (werror) => {
                    console.error('watchPosition fehlgeschlagen', werror)
                    reject(werror)
                  },
                  { enableHighAccuracy: optsSingle.enableHighAccuracy ?? true, maximumAge: optsSingle.maximumAge ?? 10000, timeout: optsSingle.timeout ?? 10000 }
                )
              }
            } catch (e) {
              console.error('Fehler beim watchPosition-Fallback', e)
              reject(e)
            }
          },
          optsSingle
        )
      })
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
      currentApartment,
      autoNavigate,
      isFlushingActive,
      flushStartTime,
      remainingTime,
      flushingLoading,
      gpsLoading,
      gpsError,
      currentPosition,
      loading,
      error,
      sortedApartments,
      circumference,
      strokeDashoffset,

      // Methods
      loadApartments,
      startFlushing,
      stopFlushing,
      selectApartment,
      formatLastFlush,
      needsFlush,
      getCurrentPosition
    }
  }
}
</script>

<style scoped>
.flushing-manager {
  max-width: 800px;
  margin: 0 auto;
}

.countdown-circle {
  position: relative;
}

.countdown-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.countdown-number {
  font-size: 2rem;
  font-weight: bold;
}

.countdown-label {
  font-size: 1rem;
  color: #6c757d;
}
</style>
