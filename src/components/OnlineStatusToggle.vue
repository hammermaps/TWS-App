<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownHeader,
  CDropdownDivider,
  CBadge,
  CButton
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const onlineStatusStore = useOnlineStatusStore()

const statusInfo = computed(() => onlineStatusStore.connectionStatus)
const isManualMode = computed(() => onlineStatusStore.manualOfflineMode)

// i18n - sichere Fallbacks falls Keys fehlen
const { t } = useI18n()
const manualModeText = computed(() => {
  if (isManualMode.value) {
    const v = t('online.manualModeOn')
    return v === 'online.manualModeOn' || !v ? t('online.monitoringPaused') : v
  }
  const off = t('online.manualModeOff')
  return off === 'online.manualModeOff' || !off ? t('online.autoCheckRunning') : off
})

const toggleOnlineStatus = () => {
  onlineStatusStore.setManualOffline(!onlineStatusStore.manualOfflineMode)
}

// Neuer Keydown-Handler für Tastatur-Unterstützung (Enter / Space)
const onKeyToggle = (e) => {
  if (!e) return
  const key = e.key
  if (key === 'Enter' || key === ' ') {
    toggleOnlineStatus()
  }
}

// Click-Handler auf der gesamten Card; ignoriert Klicks auf Buttons/Links/SVGs/Inputs
const onManualBoxClick = (e) => {
  if (e && e.target) {
    const tag = e.target.tagName?.toLowerCase()
    if (['button', 'a', 'svg', 'path', 'input'].includes(tag)) return
  }
  toggleOnlineStatus()
}

const getCheckingIndicator = computed(() => {
  return onlineStatusStore.isCheckingConnection
})

const getLastPingInfo = computed(() => {
  if (!onlineStatusStore.lastPingTime) return null
  const timeDiff = Date.now() - onlineStatusStore.lastPingTime
  const seconds = Math.floor(timeDiff / 1000)
  return {
    seconds,
    success: onlineStatusStore.lastPingSuccess,
    failures: onlineStatusStore.consecutiveFailures
  }
})
</script>

<template>
  <CDropdown variant="nav-item" placement="bottom-end">
    <CDropdownToggle :caret="false" class="position-relative">
      <CIcon :icon="statusInfo.icon" size="lg" />
      <!-- Checking Indicator -->
      <span
        v-if="getCheckingIndicator"
        class="position-absolute top-0 start-100 translate-middle p-1 bg-info border border-light rounded-circle"
        style="width: 12px; height: 12px;"
      >
        <span class="visually-hidden">{{ $t('online.checking') }}</span>
      </span>
      <!-- Status Badge -->
      <CBadge
        :color="statusInfo.color"
        shape="rounded-pill"
        class="position-absolute top-0 start-100 translate-middle"
        style="font-size: 0.5rem; padding: 0.15em 0.4em;"
      >
        {{ statusInfo.status === 'online' ? '●' : '○' }}
      </CBadge>
    </CDropdownToggle>
    <CDropdownMenu class="pt-0" style="min-width: 280px;">
      <CDropdownHeader class="bg-body-secondary fw-semibold mb-2">
        {{ $t('online.connectionStatus') }}
      </CDropdownHeader>

      <!-- Status Info -->
      <div class="px-3 py-2">
        <div class="d-flex align-items-center mb-2">
          <CIcon :icon="statusInfo.icon" size="lg" class="me-2" />
          <span class="fw-semibold">{{ statusInfo.label }}</span>
          <CBadge :color="statusInfo.color" class="ms-auto">
            {{ statusInfo.status }}
          </CBadge>
        </div>

        <!-- Detail-Informationen -->
        <div class="small text-body-secondary">
          <div class="d-flex justify-content-between mb-1">
            <span>{{ $t('online.browser') }}:</span>
            <span :class="onlineStatusStore.isOnline ? 'text-success' : 'text-danger'">
              {{ onlineStatusStore.isOnline ? $t('online.online') : $t('offline.title') }}
            </span>
          </div>

          <!-- Server: nur anzeigen, wenn NICHT manueller Offline-Modus -->
          <div v-if="!isManualMode" class="d-flex justify-content-between mb-1">
            <span>{{ $t('online.server') }}:</span>
            <span :class="onlineStatusStore.isServerReachable ? 'text-success' : 'text-danger'">
              {{ onlineStatusStore.isServerReachable ? $t('online.reachable') : $t('online.unreachable') }}
            </span>
          </div>

          <!-- Letzter Ping: nur anzeigen, wenn NICHT manueller Offline-Modus -->
          <div v-if="getLastPingInfo && !isManualMode" class="d-flex justify-content-between mb-1">
            <span>{{ $t('online.lastPing') }}:</span>
            <span>{{ $t('online.agoSeconds', { seconds: getLastPingInfo.seconds }) }}</span>
          </div>

          <!-- Fehlgeschlagene Versuche -->
          <div v-if="getLastPingInfo && getLastPingInfo.failures > 0" class="d-flex justify-content-between mb-1">
            <span>{{ $t('online.errors') }}:</span>
            <span class="text-warning">{{ getLastPingInfo.failures }}</span>
          </div>
        </div>
      </div>

      <CDropdownDivider />

      <!-- Manual Toggle -->
      <div class="px-3 py-2">
        <div
          class="manual-toggle-box p-2 rounded-3"
          role="switch"
          :aria-checked="isManualMode"
          :aria-label="manualModeText"
          tabindex="0"
          @click.stop="onManualBoxClick"
          @keydown.stop.prevent="onKeyToggle"
        >
          <div class="d-flex align-items-center justify-content-between">
            <div class="flex-grow-1 me-2">
              <div class="fw-semibold mb-1" style="font-size: 0.9rem;">{{ $t('online.manualOfflineMode') }}</div>
              <div class="small text-body-secondary" style="font-size: 0.8rem;">
                {{ isManualMode ? $t('online.monitoringPaused') : $t('online.autoCheckRunning') }}
              </div>
            </div>
            <!-- Inner switch visual only: keine Klick-Handler mehr -->
            <div
              :id="'manual-offline-toggle'"
              class="manual-toggle-switch flex-shrink-0 d-flex align-items-center"
            >
              <div class="me-2">
                <CIcon :icon="isManualMode ? 'cil-wifi-signal-off' : 'cil-wifi-signal-4'" />
              </div>
              <!-- Icon only here to avoid long texts pushing outside the card -->
              <div class="d-none d-sm-block"><!-- placeholder for spacing on larger screens --></div>
            </div>
          </div>
        </div>
      </div>


      <!-- Manual Ping Button: wird komplett ausgeblendet wenn manueller Offline-Modus aktiv ist -->
      <div class="px-3 py-2" v-if="!isManualMode">
        <CDropdownDivider />
        <CButton
          color="primary"
          variant="outline"
          size="sm"
          class="w-100"
          @click.prevent="onlineStatusStore.pingServer()"
          :disabled="getCheckingIndicator"
        >
          <CIcon
            :icon="getCheckingIndicator ? 'cil-sync' : 'cil-reload'"
            class="me-2"
            :class="{ 'rotating': getCheckingIndicator }"
          />
          {{ getCheckingIndicator ? $t('online.checking') : $t('online.checkNow') }}
        </CButton>
      </div>

      <!-- Info über eingeschränkte Features -->
      <template v-if="!onlineStatusStore.isFullyOnline">
        <CDropdownDivider />
        <div class="px-3 py-2">
          <div class="offline-info-box p-2 rounded-3">
            <div class="d-flex align-items-start mb-2">
              <CIcon icon="cil-warning" class="text-warning me-2 mt-1 flex-shrink-0" />
              <div class="flex-grow-1">
                <div class="fw-semibold mb-1" style="font-size: 0.9rem;">{{ $t('online.limitedMode') }}</div>
                <div class="small text-body-secondary mb-1" style="font-size: 0.8rem;">
                  {{ $t('online.featuresNotAvailable') }}:
                </div>
                <ul class="small mb-0 ps-3 text-body-secondary" style="font-size: 0.75rem;">
                  <li>{{ $t('online.changePassword') }}</li>
                  <li>{{ $t('online.statistics') }}</li>
                  <li>{{ $t('online.userManagement') }}</li>
                  <li>{{ $t('online.buildingManagement') }}</li>
                </ul>
              </div>
            </div>
            <div class="d-flex align-items-start pt-2 border-top border-success-subtle">
              <CIcon icon="cil-check-circle" class="text-success me-2 flex-shrink-0" />
              <div class="small" style="font-size: 0.75rem;">
                <span class="fw-semibold text-success">{{ $t('online.offlineAvailable') }}:</span>
                <span class="text-body-secondary ms-1">{{ $t('online.flushingContinue') }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CDropdownMenu>
  </CDropdown>
</template>

<style scoped src="@/styles/components/OnlineStatusToggle.css"></style>

<!-- Kleine Hilfs-Styles für die klickbare Umschaltung -->
<style scoped>
.manual-toggle-switch{ cursor: pointer }
.manual-toggle-switch:focus{ outline: 2px solid rgba(0,0,0,0.08); outline-offset: 2px }
/* Ensure the manual mode text wraps inside the card */
.manual-mode-text{ white-space: normal; word-break: break-word }

/* Verstecke native Checkboxen falls noch irgendwo vorhanden in kleinen Ansichten */
@media (max-width: 576px){
  .manual-toggle-switch input[type="checkbox"]{ display: none !important }
}
</style>
