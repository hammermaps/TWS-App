<template>
  <CRow>
    <CCol :lg="10" :xl="8">
      <!-- Konfiguration Header -->
      <CCard class="mb-4">
        <CCardHeader>
          <h4>
            <CIcon icon="cilSettings" class="me-2" />
            Konfiguration
          </h4>
        </CCardHeader>
        <CCardBody>
          <p class="text-medium-emphasis">
            Verwalten Sie hier die Anwendungskonfiguration. Administratoren können die globale Konfiguration ändern,
            die als Standard für alle Benutzer dient. Benutzer können eigene Werte definieren, die die globalen Einstellungen überschreiben.
          </p>
        </CCardBody>
      </CCard>

      <!-- Success/Error Alerts -->
      <CAlert
        v-if="successMessage"
        color="success"
        :visible="true"
        dismissible
        @close="successMessage = ''"
      >
        {{ successMessage }}
      </CAlert>

      <CAlert
        v-if="errorMessage"
        color="danger"
        :visible="true"
        dismissible
        @close="errorMessage = ''"
      >
        {{ errorMessage }}
      </CAlert>

      <!-- Offline Warning -->
      <CAlert
        v-if="!isOnline"
        color="warning"
        :visible="true"
      >
        <CIcon icon="cilWarning" class="me-2" />
        Sie sind offline. Änderungen werden lokal gespeichert und synchronisiert, sobald Sie wieder online sind.
      </CAlert>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <CSpinner color="primary" />
        <p class="mt-2 text-medium-emphasis">Lade Konfiguration...</p>
      </div>

      <!-- Configuration Sections -->
      <div v-else>
        <!-- VDI 6023 Konfiguration -->
        <CCard class="mb-4">
          <CCardHeader>
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <CIcon icon="cilWater" class="me-2" />
                VDI 6023 Spülungseinstellungen
              </h5>
              <CBadge v-if="isAdmin" color="primary">Global</CBadge>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow class="mb-3">
              <CCol :md="6">
                <CFormLabel>Mindestdurchfluss (l/min)</CFormLabel>
                <CFormInput
                  v-model.number="configForm.vdi6023.minFlowRate"
                  type="number"
                  step="0.1"
                  :disabled="!canEditGlobal"
                  placeholder="z.B. 3.0"
                />
                <CFormText>Minimaler Durchfluss für ordnungsgemäße Spülung</CFormText>
              </CCol>
              <CCol :md="6">
                <CFormLabel>Spüldauer (Minuten)</CFormLabel>
                <CFormInput
                  v-model.number="configForm.vdi6023.flushDuration"
                  type="number"
                  :disabled="!canEditGlobal"
                  placeholder="z.B. 3"
                />
                <CFormText>Standarddauer einer Spülung</CFormText>
              </CCol>
            </CRow>
            <CRow>
              <CCol :md="6">
                <CFormLabel>Temperatur Kaltwasser Max. (°C)</CFormLabel>
                <CFormInput
                  v-model.number="configForm.vdi6023.coldWaterMaxTemp"
                  type="number"
                  step="0.1"
                  :disabled="!canEditGlobal"
                  placeholder="z.B. 25.0"
                />
                <CFormText>Maximale Kaltwassertemperatur</CFormText>
              </CCol>
              <CCol :md="6">
                <CFormLabel>Temperatur Warmwasser Min. (°C)</CFormLabel>
                <CFormInput
                  v-model.number="configForm.vdi6023.hotWaterMinTemp"
                  type="number"
                  step="0.1"
                  :disabled="!canEditGlobal"
                  placeholder="z.B. 55.0"
                />
                <CFormText>Minimale Warmwassertemperatur</CFormText>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <!-- Server Konfiguration (Admin only) -->
        <CCard v-if="isAdmin" class="mb-4">
          <CCardHeader>
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <CIcon icon="cilServer" class="me-2" />
                Server-Einstellungen
              </h5>
              <CBadge color="danger">Nur Admin</CBadge>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow class="mb-3">
              <CCol :md="6">
                <CFormLabel>API Timeout (ms)</CFormLabel>
                <CFormInput
                  v-model.number="configForm.server.apiTimeout"
                  type="number"
                  placeholder="z.B. 5000"
                />
                <CFormText>Standard-Timeout für API-Anfragen</CFormText>
              </CCol>
              <CCol :md="6">
                <CFormLabel>Max. Retry Versuche</CFormLabel>
                <CFormInput
                  v-model.number="configForm.server.maxRetries"
                  type="number"
                  placeholder="z.B. 3"
                />
                <CFormText>Maximale Anzahl von Wiederholungen bei Fehlern</CFormText>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <!-- UI Konfiguration -->
        <CCard class="mb-4">
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cilColorPalette" class="me-2" />
              Benutzeroberfläche
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow class="mb-3">
              <CCol :md="6">
                <CFormLabel>Design-Theme</CFormLabel>
                <CFormSelect v-model="configForm.ui.theme">
                  <option value="auto">Automatisch (System)</option>
                  <option value="light">Hell</option>
                  <option value="dark">Dunkel</option>
                </CFormSelect>
              </CCol>
              <CCol :md="6">
                <CFormLabel>Sprache</CFormLabel>
                <CFormSelect v-model="configForm.ui.language">
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </CFormSelect>
              </CCol>
            </CRow>
            <CRow>
              <CCol :md="6">
                <CFormLabel>Datums-Format</CFormLabel>
                <CFormSelect v-model="configForm.ui.dateFormat">
                  <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </CFormSelect>
              </CCol>
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.ui.compactMode"
                  label="Kompaktmodus aktivieren"
                  class="mt-4"
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <!-- Benachrichtigungen -->
        <CCard class="mb-4">
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cilBell" class="me-2" />
              Benachrichtigungen
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow class="mb-3">
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.notifications.enabled"
                  label="Benachrichtigungen aktivieren"
                />
              </CCol>
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.notifications.sound"
                  label="Benachrichtigungston"
                  :disabled="!configForm.notifications.enabled"
                />
              </CCol>
            </CRow>
            <CRow>
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.notifications.flushReminders"
                  label="Spülungs-Erinnerungen"
                  :disabled="!configForm.notifications.enabled"
                />
              </CCol>
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.notifications.syncStatus"
                  label="Sync-Status Benachrichtigungen"
                  :disabled="!configForm.notifications.enabled"
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <!-- Sync Konfiguration -->
        <CCard class="mb-4">
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cilSync" class="me-2" />
              Synchronisation
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow class="mb-3">
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.sync.autoSync"
                  label="Automatische Synchronisation"
                />
                <CFormText>Daten automatisch synchronisieren, wenn online</CFormText>
              </CCol>
              <CCol :md="6">
                <CFormLabel>Sync-Intervall (Minuten)</CFormLabel>
                <CFormInput
                  v-model.number="configForm.sync.syncInterval"
                  type="number"
                  :disabled="!configForm.sync.autoSync"
                  placeholder="z.B. 15"
                />
              </CCol>
            </CRow>
            <CRow>
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.sync.syncOnStartup"
                  label="Beim Start synchronisieren"
                />
              </CCol>
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.sync.wifiOnly"
                  label="Nur über WLAN synchronisieren"
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <!-- Action Buttons -->
        <CCard>
          <CCardBody>
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <CButton
                  color="primary"
                  @click="saveConfiguration"
                  :disabled="saving"
                  class="me-2"
                >
                  <CSpinner v-if="saving" size="sm" class="me-1" />
                  <CIcon v-else icon="cilSave" class="me-1" />
                  Speichern
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  @click="loadConfiguration"
                  :disabled="loading || saving"
                  class="me-2"
                >
                  <CIcon icon="cilReload" class="me-1" />
                  Neu laden
                </CButton>
                <CButton
                  v-if="isAdmin"
                  color="danger"
                  variant="outline"
                  @click="resetConfiguration"
                  :disabled="saving"
                >
                  <CIcon icon="cilTrash" class="me-1" />
                  Zurücksetzen
                </CButton>
              </div>
              <div v-if="lastUpdate" class="text-medium-emphasis small">
                Letzte Aktualisierung: {{ lastUpdateFormatted }}
              </div>
            </div>
          </CCardBody>
        </CCard>
      </div>
    </CCol>
  </CRow>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApiConfig } from '@/api/ApiConfig.js'
import { useConfigStorage } from '@/stores/ConfigStorage.js'
import { isAdmin } from '@/stores/GlobalUser.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import CIcon from '@coreui/icons-vue'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CAlert,
  CSpinner,
  CBadge,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CFormText,
  CButton
} from '@coreui/vue'

const apiConfig = useApiConfig()
const configStorageComposable = useConfigStorage()
const onlineStatusStore = useOnlineStatusStore()

// State
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const lastUpdate = ref(null)

// Default configuration structure
const defaultConfig = {
  vdi6023: {
    minFlowRate: 3.0,
    flushDuration: 3,
    coldWaterMaxTemp: 25.0,
    hotWaterMinTemp: 55.0
  },
  server: {
    apiTimeout: 5000,
    maxRetries: 3
  },
  ui: {
    theme: 'auto',
    language: 'de',
    dateFormat: 'DD.MM.YYYY',
    compactMode: false
  },
  notifications: {
    enabled: true,
    sound: true,
    flushReminders: true,
    syncStatus: true
  },
  sync: {
    autoSync: true,
    syncInterval: 15,
    syncOnStartup: true,
    wifiOnly: false
  }
}

// Form data
const configForm = ref(JSON.parse(JSON.stringify(defaultConfig)))

// Computed
const isOnline = computed(() => onlineStatusStore.isFullyOnline)
const canEditGlobal = computed(() => isAdmin.value)

const lastUpdateFormatted = computed(() => {
  if (!lastUpdate.value) return 'Nie'
  return new Date(lastUpdate.value).toLocaleString('de-DE')
})

// Methods
const loadConfiguration = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Try to load from API if online
    if (isOnline.value) {
      const result = await apiConfig.get()
      if (result) {
        // Merge with defaults to ensure all keys exist
        configForm.value = mergeWithDefaults(result, defaultConfig)
        // Save to local storage
        configStorageComposable.saveConfig(configForm.value)
        lastUpdate.value = new Date()
        console.log('✅ Konfiguration vom Server geladen')
      } else {
        throw new Error('Keine Konfiguration vom Server erhalten')
      }
    } else {
      // Load from local storage when offline
      const cachedConfig = configStorageComposable.loadConfig()
      if (cachedConfig) {
        configForm.value = mergeWithDefaults(cachedConfig, defaultConfig)
        lastUpdate.value = configStorageComposable.lastUpdate.value
        console.log('📦 Konfiguration aus LocalStorage geladen')
      } else {
        throw new Error('Keine lokale Konfiguration verfügbar')
      }
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden der Konfiguration:', error)
    errorMessage.value = `Fehler beim Laden: ${error.message}`
    // Use defaults if loading fails
    configForm.value = JSON.parse(JSON.stringify(defaultConfig))
  } finally {
    loading.value = false
  }
}

const saveConfiguration = async () => {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isOnline.value) {
      // Save to server when online
      const result = await apiConfig.set(configForm.value)
      if (result) {
        configForm.value = mergeWithDefaults(result, defaultConfig)
        // Also save to local storage
        configStorageComposable.saveConfig(configForm.value)
        lastUpdate.value = new Date()
        successMessage.value = 'Konfiguration erfolgreich gespeichert!'
        console.log('✅ Konfiguration auf Server gespeichert')
      } else {
        throw new Error('Fehler beim Speichern auf dem Server')
      }
    } else {
      // Save only locally when offline
      configStorageComposable.saveConfig(configForm.value)
      lastUpdate.value = new Date()
      successMessage.value = 'Konfiguration lokal gespeichert. Wird synchronisiert, sobald Sie online sind.'
      console.log('📦 Konfiguration lokal gespeichert (Offline)')
    }
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Konfiguration:', error)
    errorMessage.value = `Fehler beim Speichern: ${error.message}`
  } finally {
    saving.value = false
  }
}

const resetConfiguration = async () => {
  if (!isAdmin.value) {
    errorMessage.value = 'Nur Administratoren können die Konfiguration zurücksetzen'
    return
  }

  if (!confirm('Möchten Sie die Konfiguration wirklich auf die Standardwerte zurücksetzen?')) {
    return
  }

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isOnline.value) {
      await apiConfig.reset()
      await loadConfiguration()
      successMessage.value = 'Konfiguration wurde auf Standardwerte zurückgesetzt'
    } else {
      errorMessage.value = 'Zurücksetzen ist nur online möglich'
    }
  } catch (error) {
    console.error('❌ Fehler beim Zurücksetzen:', error)
    errorMessage.value = `Fehler beim Zurücksetzen: ${error.message}`
  } finally {
    saving.value = false
  }
}

// Helper to merge loaded config with defaults
const mergeWithDefaults = (loaded, defaults) => {
  const result = {}
  for (const key in defaults) {
    if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
      result[key] = {
        ...defaults[key],
        ...(loaded[key] || {})
      }
    } else {
      result[key] = loaded[key] !== undefined ? loaded[key] : defaults[key]
    }
  }
  return result
}

// Lifecycle
onMounted(() => {
  loadConfiguration()
})
</script>

<style scoped>
.text-medium-emphasis {
  color: var(--cui-secondary);
}

.small {
  font-size: 0.875rem;
}
</style>
