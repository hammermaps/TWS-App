<script setup>
import { computed } from 'vue'
import {
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownHeader,
  CDropdownDivider,
  CBadge,
  CFormCheck,
  CButton
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const onlineStatusStore = useOnlineStatusStore()

const statusInfo = computed(() => onlineStatusStore.connectionStatus)
const isManualMode = computed(() => onlineStatusStore.manualOfflineMode)

const toggleOnlineStatus = () => {
  onlineStatusStore.setManualOffline(!onlineStatusStore.manualOfflineMode)
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
        <span class="visually-hidden">Prüfe Verbindung...</span>
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
        Verbindungsstatus
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
            <span>Browser:</span>
            <span :class="onlineStatusStore.isOnline ? 'text-success' : 'text-danger'">
              {{ onlineStatusStore.isOnline ? 'Online' : 'Offline' }}
            </span>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span>Server:</span>
            <span :class="onlineStatusStore.isServerReachable ? 'text-success' : 'text-danger'">
              {{ onlineStatusStore.isServerReachable ? 'Erreichbar' : 'Nicht erreichbar' }}
            </span>
          </div>

          <!-- Letzter Ping -->
          <div v-if="getLastPingInfo" class="d-flex justify-content-between mb-1">
            <span>Letzter Ping:</span>
            <span>vor {{ getLastPingInfo.seconds }}s</span>
          </div>

          <!-- Fehlgeschlagene Versuche -->
          <div v-if="getLastPingInfo && getLastPingInfo.failures > 0" class="d-flex justify-content-between mb-1">
            <span>Fehler:</span>
            <span class="text-warning">{{ getLastPingInfo.failures }}</span>
          </div>
        </div>
      </div>

      <CDropdownDivider />

      <!-- Manual Toggle -->
      <div class="px-3 py-2">
        <div class="manual-toggle-box p-2 rounded-3">
          <div class="d-flex align-items-center justify-content-between">
            <div class="flex-grow-1 me-2">
              <div class="fw-semibold mb-1" style="font-size: 0.9rem;">Manueller Offline-Modus</div>
              <div class="small text-body-secondary" style="font-size: 0.8rem;">
                {{ isManualMode ? 'Netzwerküberwachung ist pausiert' : 'Automatische Verbindungsprüfung läuft' }}
              </div>
            </div>
            <CFormCheck
              :id="'manual-offline-toggle'"
              v-model="onlineStatusStore.manualOfflineMode"
              switch
              @change="toggleOnlineStatus"
              class="flex-shrink-0"
            />
          </div>

          <!-- Status Badge -->
          <div class="d-flex align-items-center mt-2 pt-2 border-top" :class="isManualMode ? 'border-secondary-subtle' : 'border-primary-subtle'">
            <CIcon
              :icon="isManualMode ? 'cil-moon' : 'cil-chart-line'"
              size="sm"
              class="me-2"
              :class="isManualMode ? 'text-secondary' : 'text-primary'"
            />
            <small class="fw-medium" :class="isManualMode ? 'text-secondary' : 'text-primary'" style="font-size: 0.75rem;">
              {{ isManualMode ? 'Ping-Prüfungen deaktiviert' : 'Automatische Überwachung aktiv' }}
            </small>
          </div>
        </div>
      </div>

      <CDropdownDivider />

      <!-- Manual Ping Button -->
      <div class="px-3 py-2">
        <CButton
          color="primary"
          variant="outline"
          size="sm"
          class="w-100"
          @click.prevent="onlineStatusStore.pingServer()"
          :disabled="isManualMode || getCheckingIndicator"
        >
          <CIcon
            :icon="getCheckingIndicator ? 'cil-sync' : 'cil-reload'"
            class="me-2"
            :class="{ 'rotating': getCheckingIndicator }"
          />
          {{ getCheckingIndicator ? 'Prüfe Verbindung...' : 'Verbindung jetzt prüfen' }}
        </CButton>
        <small v-if="isManualMode" class="text-body-secondary d-block mt-2 text-center">
          Im manuellen Modus deaktiviert
        </small>
      </div>

      <!-- Info über eingeschränkte Features -->
      <template v-if="!onlineStatusStore.isFullyOnline">
        <CDropdownDivider />
        <div class="px-3 py-2">
          <div class="offline-info-box p-2 rounded-3">
            <div class="d-flex align-items-start mb-2">
              <CIcon icon="cil-warning" class="text-warning me-2 mt-1 flex-shrink-0" />
              <div class="flex-grow-1">
                <div class="fw-semibold mb-1" style="font-size: 0.9rem;">Eingeschränkter Modus</div>
                <div class="small text-body-secondary mb-1" style="font-size: 0.8rem;">
                  Folgende Features sind offline nicht verfügbar:
                </div>
                <ul class="small mb-0 ps-3 text-body-secondary" style="font-size: 0.75rem;">
                  <li>Passwort ändern</li>
                  <li>Statistiken</li>
                  <li>Benutzerverwaltung</li>
                  <li>Gebäudeverwaltung</li>
                </ul>
              </div>
            </div>
            <div class="d-flex align-items-start pt-2 border-top border-success-subtle">
              <CIcon icon="cil-check-circle" class="text-success me-2 flex-shrink-0" />
              <div class="small" style="font-size: 0.75rem;">
                <span class="fw-semibold text-success">Offline verfügbar:</span>
                <span class="text-body-secondary ms-1">Leerstandspülungen können weiterhin durchgeführt werden</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CDropdownMenu>
  </CDropdown>
</template>

<style scoped src="@/styles/components/OnlineStatusToggle.css"></style>

