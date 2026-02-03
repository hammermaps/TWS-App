<template>
  <CRow style="padding-left: 9px;">
    <CCol :lg="12">
      <!-- Konfiguration Header in Card -->
      <CCard class="mb-4">
        <CCardBody>
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <CIcon icon="cilSettings" class="me-2" />
                {{ $t('settings.title') }}
              </h2>
              <p class="text-muted mb-0">
                {{ $t('settings.subtitle') }}
              </p>
            </div>
          </div>
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
        {{ $t('offline.dataWillSync') }}
      </CAlert>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <CSpinner color="primary" />
        <p class="mt-2 text-medium-emphasis">{{ $t('settings.loading') }}</p>
      </div>

      <!-- Configuration Sections -->
      <div v-else>
        <!-- Server Konfiguration (Admin only) -->
        <CCard v-if="isAdmin" class="mb-4">
          <CCardHeader>
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <CIcon icon="cilServer" class="me-2" />
                {{ $t('settings.server.title') }}
              </h5>
              <CBadge color="danger">{{ $t('settings.adminOnly') }}</CBadge>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow class="mb-3">
              <CCol :md="6">
                <CFormLabel>{{ $t('settings.server.apiTimeout') }}</CFormLabel>
                <CFormInput
                  v-model.number="configForm.server.apiTimeout"
                  type="number"
                  :placeholder="$t('settings.server.apiTimeoutPlaceholder')"
                />
                <CFormText>{{ $t('settings.server.apiTimeoutHelp') }}</CFormText>
              </CCol>
              <CCol :md="6">
                <CFormLabel>{{ $t('settings.server.maxRetries') }}</CFormLabel>
                <CFormInput
                  v-model.number="configForm.server.maxRetries"
                  type="number"
                  :placeholder="$t('settings.server.maxRetriesPlaceholder')"
                />
                <CFormText>{{ $t('settings.server.maxRetriesHelp') }}</CFormText>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <!-- UI Konfiguration -->
        <CCard class="mb-4">
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cilColorPalette" class="me-2" />
              {{ $t('settings.ui.title') }}
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow class="mb-3">
              <CCol :md="6">
                <CFormLabel>{{ $t('settings.ui.theme') }}</CFormLabel>
                <CFormSelect v-model="configForm.ui.theme">
                  <option value="auto">{{ $t('settings.ui.themeAuto') }}</option>
                  <option value="light">{{ $t('settings.ui.themeLight') }}</option>
                  <option value="dark">{{ $t('settings.ui.themeDark') }}</option>
                </CFormSelect>
              </CCol>
              <CCol :md="6">
                <CFormLabel>{{ $t('settings.ui.language') }}</CFormLabel>
                <CFormSelect v-model="configForm.ui.language">
                  <option value="de">{{ $t('settings.ui.languageGerman') }}</option>
                  <option value="en">{{ $t('settings.ui.languageEnglish') }}</option>
                </CFormSelect>
              </CCol>
            </CRow>
            <CRow>
              <CCol :md="6">
                <CFormLabel>{{ $t('settings.ui.dateFormat') }}</CFormLabel>
                <CFormSelect v-model="configForm.ui.dateFormat">
                  <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </CFormSelect>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <!-- Sync Konfiguration -->
        <CCard class="mb-4">
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cilSync" class="me-2" />
              {{ $t('settings.sync.title') }}
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow class="mb-3">
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.sync.autoSync"
                  :label="$t('settings.sync.autoSync')"
                />
                <CFormText>{{ $t('settings.sync.autoSyncHelp') }}</CFormText>
              </CCol>
              <CCol :md="6">
                <CFormLabel>{{ $t('settings.sync.syncInterval') }}</CFormLabel>
                <CFormInput
                  v-model.number="configForm.sync.syncInterval"
                  type="number"
                  :disabled="!configForm.sync.autoSync"
                  :placeholder="$t('settings.sync.syncIntervalPlaceholder')"
                />
              </CCol>
            </CRow>
            <CRow>
              <CCol :md="6">
                <CFormCheck
                  v-model="configForm.sync.syncOnStartup"
                  :label="$t('settings.sync.syncOnStartup')"
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
                  {{ $t('settings.save') }}
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  @click="loadConfiguration"
                  :disabled="loading || saving"
                  class="me-2"
                >
                  <CIcon icon="cilReload" class="me-1" />
                  {{ $t('settings.reload') }}
                </CButton>
                <CButton
                  v-if="isAdmin"
                  color="danger"
                  variant="outline"
                  @click="resetConfiguration"
                  :disabled="saving"
                >
                  <CIcon icon="cilTrash" class="me-1" />
                  {{ $t('settings.reset') }}
                </CButton>
              </div>
              <div v-if="lastUpdate" class="text-medium-emphasis small">
                {{ $t('settings.lastUpdate') }}: {{ lastUpdateFormatted }}
              </div>
            </div>
          </CCardBody>
        </CCard>
      </div>
    </CCol>
  </CRow>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApiConfig } from '@/api/ApiConfig.js'
import { useConfigStorage } from '@/stores/ConfigStorage.js'
import { useConfigSyncService } from '@/services/ConfigSyncService.js'
import { useAutoSyncService } from '@/services/AutoSyncService.js'
import { useThemeSync } from '@/services/ThemeService.js'
import { useLanguageService } from '@/services/LanguageService.js'
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
const configSyncService = useConfigSyncService()
const autoSyncService = useAutoSyncService()
const onlineStatusStore = useOnlineStatusStore()
const { changeTheme, loadAndApplyTheme } = useThemeSync()
const languageService = useLanguageService()
const { t } = useI18n()

// State
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const lastUpdate = ref(null)

// Default configuration structure
const defaultConfig = {
  server: {
    apiTimeout: 15000,
    maxRetries: 3
  },
  ui: {
    theme: 'auto',
    language: 'de',
    dateFormat: 'DD.MM.YYYY',
  },
  sync: {
    autoSync: true,
    syncInterval: 15,
    syncOnStartup: true,
  }
}

// Form data
const configForm = ref(JSON.parse(JSON.stringify(defaultConfig)))

// Computed
const isOnline = computed(() => onlineStatusStore.isFullyOnline)
const canEditGlobal = computed(() => isAdmin.value)

const lastUpdateFormatted = computed(() => {
  if (!lastUpdate.value) return t('common.never')
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
        successMessage.value = t('settings.savedSuccess')
        console.log('✅ Konfiguration auf Server gespeichert')
      } else {
        throw new Error('Fehler beim Speichern auf dem Server')
      }
    } else {
      // Save only locally when offline and add to sync queue
      configStorageComposable.saveConfig(configForm.value)
      configSyncService.addToQueue(configForm.value)
      lastUpdate.value = new Date()
      successMessage.value = t('settings.savedOffline')
      console.log('📦 Konfiguration lokal gespeichert und zur Sync-Queue hinzugefügt (Offline)')
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
    errorMessage.value = t('settings.resetOnlineOnly')
    return
  }

  if (!confirm(t('settings.resetConfirm'))) {
    return
  }

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isOnline.value) {
      await apiConfig.reset()
      await loadConfiguration()
      successMessage.value = t('settings.resetSuccess')
    } else {
      errorMessage.value = t('settings.resetOnlineOnly')
    }
  } catch (error) {
    console.error('❌ Fehler beim Zurücksetzen:', error)
    errorMessage.value = `${t('errors.general')}: ${error.message}`
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

// Watch für Theme-Änderungen - sofort anwenden und synchronisieren
watch(() => configForm.value.ui.theme, async (newTheme, oldTheme) => {
  if (newTheme && newTheme !== oldTheme && oldTheme !== undefined) {
    console.log('🎨 Theme in Settings geändert:', oldTheme, '→', newTheme)
    // Wende Theme sofort an und synchronisiere zum Server
    await changeTheme(newTheme)
    const themeName = newTheme === 'auto' ? t('settings.ui.themeAuto') :
                      newTheme === 'light' ? t('settings.ui.themeLight') :
                      t('settings.ui.themeDark')
    successMessage.value = t('settings.themeChanged')

    // Verstecke Erfolgs-Nachricht nach 3 Sekunden
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  }
})

// Watch für Sprach-Änderungen - sofort anwenden und synchronisieren
watch(() => configForm.value.ui.language, async (newLanguage, oldLanguage) => {
  if (newLanguage && newLanguage !== oldLanguage && oldLanguage !== undefined) {
    console.log('🌐 Sprache in Settings geändert:', oldLanguage, '→', newLanguage)
    // Wende Sprache sofort an (ohne Server-Sync, da das beim Save passiert)
    const success = await languageService.setLanguage(newLanguage, false)
    if (success) {
      const langName = newLanguage === 'de' ? t('settings.ui.languageGerman') : t('settings.ui.languageEnglish')
      successMessage.value = `${t('settings.ui.language')}: ${langName}`

      // Verstecke Erfolgs-Nachricht nach 3 Sekunden
      setTimeout(() => {
        if (successMessage.value.includes('Sprache')) {
          successMessage.value = ''
        }
      }, 3000)
    }
  }
})

// Watch für Sync-Einstellungen - AutoSync neu starten bei Änderung
watch(() => configForm.value.sync.autoSync, (newValue, oldValue) => {
  if (oldValue !== undefined && newValue !== oldValue) {
    console.log('🔄 AutoSync Einstellung geändert:', newValue)
    if (newValue && configForm.value.sync.syncInterval > 0) {
      autoSyncService.start(configForm.value.sync.syncInterval)
      console.log('✅ AutoSync aktiviert')
    } else {
      autoSyncService.stop()
      console.log('⏹️ AutoSync deaktiviert')
    }
  }
})

watch(() => configForm.value.sync.syncInterval, (newInterval, oldInterval) => {
  if (oldInterval !== undefined && newInterval !== oldInterval) {
    console.log('🔄 Sync-Intervall geändert:', oldInterval, '→', newInterval)
    // Wenn AutoSync aktiv ist, Intervall aktualisieren
    if (configForm.value.sync.autoSync && newInterval > 0) {
      autoSyncService.updateInterval(newInterval)
      console.log('✅ Sync-Intervall aktualisiert')
    }
  }
})

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
