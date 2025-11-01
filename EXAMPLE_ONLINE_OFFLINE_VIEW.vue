<!-- Beispiel: Integration des Online/Offline-Status in eine View -->
<script setup>
import { computed } from 'vue'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import { useFeatureAccess } from '@/composables/useFeatureAccess.js'

// Online-Status Store
const onlineStatusStore = useOnlineStatusStore()

// Feature Access Helper
const {
  canViewStatistics,
  canChangePassword,
  executeIfOnline,
  showFeatureUnavailableMessage
} = useFeatureAccess()

// Computed
const isOnline = computed(() => onlineStatusStore.isFullyOnline)

// Methoden
async function loadStatistics() {
  // Automatische Fehlerbehandlung
  await executeIfOnline('statistics', async () => {
    console.log('Lade Statistiken...')
    // API-Call hier
  })
}

async function changePassword() {
  if (!canChangePassword.value) {
    showFeatureUnavailableMessage('password-change')
    return
  }

  // Passwort-Änderung durchführen
  console.log('Ändere Passwort...')
}

function doOfflineAction() {
  // Diese Aktion funktioniert immer
  console.log('Offline-fähige Aktion')
}
</script>

<template>
  <div>
    <h1>Beispiel-View</h1>

    <!-- Offline-Warnung am Anfang der Seite -->
    <CAlert
      v-if="!isOnline"
      color="warning"
      class="mb-4"
    >
      <CIcon icon="cil-wifi-off" class="me-2" />
      <strong>Offline-Modus:</strong>
      Einige Funktionen sind eingeschränkt.
    </CAlert>

    <CRow>
      <CCol md="6">
        <CCard>
          <CCardHeader>
            <strong>Online-Only Feature</strong>
          </CCardHeader>
          <CCardBody>
            <p>Diese Funktion erfordert eine Internetverbindung.</p>

            <!-- Button ist deaktiviert wenn offline -->
            <CButton
              color="primary"
              @click="loadStatistics"
              :disabled="!canViewStatistics"
            >
              <CIcon icon="cil-chart" class="me-2" />
              Statistiken laden
            </CButton>

            <!-- Offline-Hinweis -->
            <small
              v-if="!canViewStatistics"
              class="text-muted d-block mt-2"
            >
              Diese Funktion ist offline nicht verfügbar
            </small>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md="6">
        <CCard>
          <CCardHeader>
            <strong>Offline-fähiges Feature</strong>
          </CCardHeader>
          <CCardBody>
            <p>Diese Funktion funktioniert auch offline.</p>

            <!-- Button ist immer aktiv -->
            <CButton
              color="success"
              @click="doOfflineAction"
            >
              <CIcon icon="cil-check-circle" class="me-2" />
              Offline-Aktion ausführen
            </CButton>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Bedingte Anzeige basierend auf Online-Status -->
    <CRow class="mt-4">
      <CCol>
        <CCard v-if="isOnline">
          <CCardHeader>
            <strong>Nur online sichtbar</strong>
          </CCardHeader>
          <CCardBody>
            <p>Dieser Inhalt wird nur im Online-Modus angezeigt.</p>

            <CButton
              color="info"
              @click="changePassword"
            >
              Passwort ändern
            </CButton>
          </CCardBody>
        </CCard>

        <CCard v-else>
          <CCardHeader>
            <strong>Offline-Hinweis</strong>
          </CCardHeader>
          <CCardBody>
            <p>
              Sie sind derzeit offline.
              Einige Features sind nicht verfügbar.
            </p>

            <ul>
              <li>Passwort ändern</li>
              <li>Statistiken anzeigen</li>
              <li>Benutzerverwaltung</li>
            </ul>

            <CButton
              color="primary"
              size="sm"
              @click="onlineStatusStore.setManualOffline(false)"
              v-if="onlineStatusStore.manualOfflineMode"
            >
              Online-Modus aktivieren
            </CButton>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

    <!-- Detaillierte Status-Informationen -->
    <CRow class="mt-4">
      <CCol>
        <CCard>
          <CCardHeader>
            <strong>Verbindungsstatus</strong>
          </CCardHeader>
          <CCardBody>
            <table class="table table-sm">
              <tbody>
                <tr>
                  <td><strong>Browser:</strong></td>
                  <td>
                    <CBadge
                      :color="onlineStatusStore.isOnline ? 'success' : 'danger'"
                    >
                      {{ onlineStatusStore.isOnline ? 'Online' : 'Offline' }}
                    </CBadge>
                  </td>
                </tr>
                <tr>
                  <td><strong>Server:</strong></td>
                  <td>
                    <CBadge
                      :color="onlineStatusStore.isServerReachable ? 'success' : 'danger'"
                    >
                      {{ onlineStatusStore.isServerReachable ? 'Erreichbar' : 'Nicht erreichbar' }}
                    </CBadge>
                  </td>
                </tr>
                <tr>
                  <td><strong>Manueller Modus:</strong></td>
                  <td>
                    <CBadge
                      :color="onlineStatusStore.manualOfflineMode ? 'warning' : 'info'"
                    >
                      {{ onlineStatusStore.manualOfflineMode ? 'Offline' : 'Auto' }}
                    </CBadge>
                  </td>
                </tr>
                <tr>
                  <td><strong>Gesamtstatus:</strong></td>
                  <td>
                    <CBadge
                      :color="onlineStatusStore.connectionStatus.color"
                    >
                      {{ onlineStatusStore.connectionStatus.label }}
                    </CBadge>
                  </td>
                </tr>
              </tbody>
            </table>

            <CButton
              color="primary"
              size="sm"
              @click="onlineStatusStore.pingServer()"
              :disabled="onlineStatusStore.isCheckingConnection"
            >
              <span v-if="onlineStatusStore.isCheckingConnection">
                <span class="spinner-border spinner-border-sm me-1"></span>
                Prüfe...
              </span>
              <span v-else>
                <CIcon icon="cil-reload" class="me-1" />
                Verbindung jetzt prüfen
              </span>
            </CButton>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </div>
</template>

<style scoped>
/* Optionale Styles für bessere Offline-UX */
.offline-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

