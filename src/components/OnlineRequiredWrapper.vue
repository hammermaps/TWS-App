<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CAlert } from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const route = useRoute()
const onlineStatusStore = useOnlineStatusStore()

const requiresOnline = computed(() => route.meta.requiresOnline === true)
const isOffline = computed(() => !onlineStatusStore.isFullyOnline)
const showWarning = computed(() => requiresOnline.value && isOffline.value)
</script>

<template>
  <!-- Offline-Warnung für Online-Only-Seiten -->
  <CAlert
    v-if="showWarning"
    color="danger"
    class="mb-4"
    :visible="true"
  >
    <div class="d-flex align-items-start">
      <CIcon icon="cil-warning" size="xl" class="me-3 mt-1" />
      <div class="flex-grow-1">
        <h5 class="alert-heading mb-2">Offline-Modus: Seite nicht verfügbar</h5>
        <p class="mb-2">
          Diese Seite erfordert eine aktive Internetverbindung und ist im Offline-Modus nicht verfügbar.
        </p>
        <hr />
        <p class="mb-0">
          <strong>Verbindungsstatus:</strong> {{ onlineStatusStore.connectionStatus.label }}
        </p>
        <div v-if="onlineStatusStore.manualOfflineMode" class="mt-2">
          <small class="text-muted">
            Sie haben den manuellen Offline-Modus aktiviert.
            Deaktivieren Sie diesen im Header-Menü, um wieder online zu gehen.
          </small>
        </div>
      </div>
    </div>
  </CAlert>

  <!-- Content wird nur gerendert wenn entweder nicht requiresOnline oder online -->
  <div v-if="!showWarning">
    <slot></slot>
  </div>

  <!-- Alternative Ansicht wenn offline -->
  <div v-else class="text-center py-5">
    <CIcon icon="cil-cloud-download" size="4xl" class="text-secondary mb-3" />
    <h4 class="text-secondary">Seite offline nicht verfügbar</h4>
    <p class="text-muted">
      Bitte stellen Sie eine Internetverbindung her, um auf diese Seite zuzugreifen.
    </p>
  </div>
</template>

<style scoped src="@/styles/components/OnlineRequiredWrapper.css"></style>

