<script setup>
import { computed, ref } from 'vue'
import { CButton, CBadge } from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const onlineStatusStore = useOnlineStatusStore()

const showBanner = computed(() => !onlineStatusStore.isFullyOnline)
const statusInfo = computed(() => onlineStatusStore.connectionStatus)
const isTogglingMode = ref(false)

const getBannerColor = computed(() => {
  const status = statusInfo.value.status
  if (status === 'offline-manual') return 'secondary'
  if (status === 'offline-network') return 'danger'
  if (status === 'offline-server') return 'warning'
  return 'info'
})

const getBannerClass = computed(() => {
  const color = getBannerColor.value
  return `banner-${color}`
})

const getBannerBadgeColor = computed(() => {
  const status = statusInfo.value.status
  if (status === 'offline-manual') return 'secondary'
  if (status === 'offline-network') return 'danger'
  if (status === 'offline-server') return 'warning'
  return 'info'
})

const getStatusText = computed(() => {
  const status = statusInfo.value.status
  if (status === 'offline-manual') return 'Manuell'
  if (status === 'offline-network') return 'Netzwerk'
  if (status === 'offline-server') return 'Server'
  return 'Offline'
})

const retryConnection = () => {
  onlineStatusStore.pingServer()
}

const enableOnlineMode = async () => {
  if (isTogglingMode.value) return
  
  isTogglingMode.value = true
  try {
    await onlineStatusStore.setManualOffline(false)
  } finally {
    isTogglingMode.value = false
  }
}

// Neu: Toggle für manuellen Offline-Modus
const toggleManualMode = async (e) => {
  // verhindern, dass Clicks auf Buttons/Links das toggeln auslösen
  if (e && e.target) {
    const tag = e.target.tagName?.toLowerCase()
    if (['button', 'a', 'svg', 'path', 'input'].includes(tag)) return
  }
  
  if (isTogglingMode.value) return
  
  isTogglingMode.value = true
  try {
    await onlineStatusStore.setManualOffline(!onlineStatusStore.manualOfflineMode)
  } finally {
    isTogglingMode.value = false
  }
}

// Neuer benannter Keydown-Handler statt Inline-Arrow (vermeidet Linter-Warnung)
const onKeyToggle = async (e) => {
  if (!e) return
  const key = e.key
  if (key === 'Enter' || key === ' ') {
    await toggleManualMode(e)
  }
}

</script>

<template>
  <Transition name="slide-down">
    <div v-if="showBanner" class="container-fluid flex-grow-1 container-p-y">
      <div
        class="offline-banner alert"
        :class="getBannerClass"
      >
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <!-- Left: Status Info (jetzt klickbar zum toggeln des manuellen Offline-Modus) -->
          <div
            class="d-flex align-items-start flex-grow-1 clickable-status"
            role="button"
            tabindex="0"
            @click.stop="toggleManualMode"
            @keydown.stop.prevent="onKeyToggle"
            title="Klicken um Manuellen Offline-Modus ein/auszuschalten"
          >
             <div class="banner-icon-wrapper me-3">
               <CIcon :icon="statusInfo.icon" size="xl" />
             </div>
             <div class="flex-grow-1">
               <div class="d-flex align-items-center mb-1">
                 <strong class="banner-title me-2">{{ statusInfo.label }}</strong>
                 <CBadge
                   :color="getBannerBadgeColor"
                   class="text-uppercase"
                   style="font-size: 0.65rem;"
                 >
                   {{ getStatusText }}
                 </CBadge>
               </div>
               <div class="banner-description">
                 <span v-if="onlineStatusStore.manualOfflineMode">
                   <!-- Mond-Icon ersetzt durch WiFi-Off Icon -->
                   <CIcon icon="cil-wifi-signal-off" size="sm" class="me-1" />
                   Automatische Überwachung ist deaktiviert.
                 </span>
                 <span v-else-if="statusInfo.status === 'offline-network'">
                   <CIcon icon="cil-wifi-signal-off" size="sm" class="me-1" />
                   Keine Netzwerkverbindung erkannt.
                 </span>
                 <span v-else-if="statusInfo.status === 'offline-server'">
                   <CIcon icon="cil-cloud-download" size="sm" class="me-1" />
                   Server ist nicht erreichbar.
                 </span>
                 <span class="ms-2">
                   Leerstandspülungen können weiterhin offline durchgeführt werden.
                 </span>
               </div>
             </div>
           </div>

          <!-- Right: Action Buttons -->
          <div class="d-flex gap-2 align-items-center flex-shrink-0">
            <!-- Manual Mode: Enable Online Button -->
            <CButton
              v-if="onlineStatusStore.manualOfflineMode"
              color="light"
              size="sm"
              variant="ghost"
              @click="enableOnlineMode"
              :disabled="isTogglingMode"
              class="banner-action-btn"
            >
              <CIcon 
                :icon="isTogglingMode ? 'cil-sync' : 'cil-wifi-signal-4'"
                class="me-2"
                :class="{ 'rotating': isTogglingMode }"
              />
              {{ isTogglingMode ? $t('online.checking') : 'Online-Modus aktivieren' }}
            </CButton>

            <!-- Server Offline: Retry Button -->
            <CButton
              v-else-if="statusInfo.status === 'offline-server'"
              color="light"
              size="sm"
              variant="ghost"
              @click="retryConnection"
              :disabled="onlineStatusStore.isCheckingConnection"
              class="banner-action-btn"
            >
              <CIcon
                :icon="onlineStatusStore.isCheckingConnection ? 'cil-sync' : 'cil-reload'"
                class="me-2"
                :class="{ 'rotating': onlineStatusStore.isCheckingConnection }"
              />
              {{ onlineStatusStore.isCheckingConnection ? 'Prüfe...' : 'Erneut verbinden' }}
            </CButton>

            <!-- Network Offline: Info -->
            <CButton
              v-else-if="statusInfo.status === 'offline-network'"
              color="light"
              size="sm"
              variant="ghost"
              disabled
              class="banner-action-btn"
            >
              <CIcon icon="cil-wifi-signal-off" class="me-2" />
              Keine Verbindung
            </CButton>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped src="@/styles/components/OfflineModeBanner.css"></style>

<!-- Neu: Responsive CSS um Checkboxen in mobilen Ansichten auszublenden falls vorhanden -->
<style scoped>
.clickable-status{ cursor: pointer }
.clickable-status:focus{ outline: 2px solid rgba(0,0,0,0.12); outline-offset: 2px }

/* Verstecke Checkboxen in mobilen Ansichten innerhalb dieses Banners (falls dort Checkboxen benutzt werden) */
@media (max-width: 576px){
  .offline-banner input[type="checkbox"]{ display: none !important }
}
</style>
