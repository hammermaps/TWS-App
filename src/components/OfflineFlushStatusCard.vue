/**
 * OfflineFlushStatusCard.vue
 * Komponente zur Anzeige des Offline-Spülungs-Status im Dashboard
 */
<template>
  <CCard v-if="showCard">
    <CCardHeader>
      <h6 class="mb-0">
        <CIcon :icon="statusIcon" class="me-2" />
        Offline-Spülungen
      </h6>
    </CCardHeader>
    <CCardBody>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 class="text-primary mb-0">{{ stats.unsyncedFlushes }}</h4>
          <small class="text-muted">Ausstehende Sync</small>
        </div>
        <CBadge :color="isOnline ? 'success' : 'danger'" size="lg">
          <CIcon :icon="isOnline ? 'cil-wifi' : 'cil-wifi-off'" class="me-1" />
          {{ isOnline ? 'Online' : 'Offline' }}
        </CBadge>
      </div>

      <!-- Statistiken -->
      <div class="row g-2 mb-3">
        <div class="col-6">
          <div class="text-center p-2 bg-light rounded">
            <div class="fw-bold text-success">{{ stats.syncedFlushes }}</div>
            <small class="text-muted">Synchronisiert</small>
          </div>
        </div>
        <div class="col-6">
          <div class="text-center p-2 bg-light rounded">
            <div class="fw-bold text-info">{{ stats.totalOfflineFlushes }}</div>
            <small class="text-muted">Gesamt Offline</small>
          </div>
        </div>
      </div>

      <!-- Sync Status -->
      <div v-if="syncStatus.isSyncing" class="alert alert-info py-2 mb-3">
        <CIcon icon="cil-reload" class="fa-spin me-2" />
        <small>Synchronisierung läuft...</small>
      </div>

      <!-- Älteste unsynced Spülung -->
      <div v-if="oldestUnsyncedAge" class="mb-3">
        <small class="text-muted">
          Älteste unsynced: {{ oldestUnsyncedAge }}
        </small>
      </div>

      <!-- Action Buttons -->
      <div class="d-flex gap-2">
        <CButton
          v-if="stats.unsyncedFlushes > 0 && isOnline"
          color="primary"
          size="sm"
          @click="triggerSync"
          :disabled="syncStatus.isSyncing"
          class="flex-fill"
        >
          <CIcon icon="cil-cloud-upload" class="me-1" />
          Jetzt synchronisieren
        </CButton>

        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          @click="showDetails = !showDetails"
        >
          <CIcon :icon="showDetails ? 'cil-chevron-top' : 'cil-chevron-bottom'" />
        </CButton>
      </div>

      <!-- Details -->
      <CCollapse :visible="showDetails">
        <div class="mt-3 pt-3 border-top">
          <h6 class="mb-2">Details</h6>

          <!-- Sync Queue Items -->
          <div v-if="syncStatus.syncInProgress && syncStatus.syncInProgress.length > 0" class="mb-2">
            <small class="text-muted">Aktuell in Bearbeitung:</small>
            <div class="ps-3">
              <div v-for="flushId in syncStatus.syncInProgress" :key="flushId" class="small">
                <CIcon icon="cil-clock" class="me-1" />
                {{ flushId }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="d-flex gap-2 mt-2">
            <CButton
              color="info"
              variant="outline"
              size="sm"
              @click="viewOfflineFlushes"
            >
              <CIcon icon="cil-list" class="me-1" />
              Alle anzeigen
            </CButton>

            <CButton
              v-if="stats.totalOfflineFlushes > 0"
              color="warning"
              variant="outline"
              size="sm"
              @click="cleanupOldFlushes"
            >
              <CIcon icon="cil-trash" class="me-1" />
              Bereinigen
            </CButton>
          </div>
        </div>
      </CCollapse>
    </CCardBody>
  </CCard>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useOfflineFlushStorage } from '@/stores/OfflineFlushStorage.js'
import { useOfflineFlushSync } from '@/stores/OfflineFlushSyncService.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CBadge,
  CCollapse,
  CAlert
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'

const router = useRouter()
const { storage: offlineStorage } = useOfflineFlushStorage()
const { getSyncStatus, forceSync, onSyncComplete } = useOfflineFlushSync()
const onlineStatusStore = useOnlineStatusStore()

// Reactive State
const stats = ref({
  totalOfflineFlushes: 0,
  syncedFlushes: 0,
  unsyncedFlushes: 0,
  oldestUnsynced: null
})

const syncStatus = ref({
  isSyncing: false,
  unsyncedCount: 0,
  syncInProgress: []
})

// Verwende OnlineStatus Store als einzige Quelle
const isOnline = computed(() => onlineStatusStore.isFullyOnline)
const showDetails = ref(false)
const updateInterval = ref(null)

// Computed Properties
const showCard = computed(() => {
  return stats.value.totalOfflineFlushes > 0 || !isOnline.value
})

const statusIcon = computed(() => {
  if (syncStatus.value.isSyncing) return 'cil-reload'
  if (stats.value.unsyncedFlushes > 0) return 'cil-cloud-upload'
  return 'cil-check-circle'
})

const oldestUnsyncedAge = computed(() => {
  if (!stats.value.oldestUnsynced) return null

  const now = Date.now()
  const oldest = stats.value.oldestUnsynced
  const diffInMinutes = Math.floor((now - oldest) / (1000 * 60))

  if (diffInMinutes < 60) return `${diffInMinutes} Min`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ${diffInMinutes % 60}m`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} Tage`
})

// Methods
const updateStats = async () => {
  try {
    const offlineStats = await offlineStorage.getStats()
    const currentSyncStatus = await getSyncStatus()

    stats.value = {
      ...offlineStats,
      oldestUnsynced: offlineStats.oldestUnsynced
    }

    // isOnline kommt vom OnlineStatus Store
    syncStatus.value = {
      ...currentSyncStatus,
      isOnline: isOnline.value
    }

    console.log('📊 Offline-Flush Status aktualisiert:', stats.value)
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Offline-Stats:', error)
  }
}

const triggerSync = async () => {
  try {
    console.log('🔄 Manuelle Synchronisation gestartet vom Dashboard')

    // Prüfe ob online
    if (!isOnline.value) {
      alert('Synchronisation nicht möglich: Keine Netzwerkverbindung')
      return
    }

    await forceSync()
    updateStats()

    // Erfolgs-Benachrichtigung
    alert('Synchronisation erfolgreich abgeschlossen')
  } catch (error) {
    console.error('❌ Sync-Fehler:', error)
    alert(`Fehler bei der Synchronisation: ${error.message}`)
  }
}

const viewOfflineFlushes = () => {
  // Navigiere zur Spülungs-Historie oder einer speziellen Offline-Übersicht
  router.push('/apartments') // Oder eine spezielle Route für Offline-Spülungen
}

const cleanupOldFlushes = () => {
  if (confirm('Möchten Sie alte synchronisierte Spülungen wirklich löschen?')) {
    offlineStorage.cleanupOldFlushes()
    updateStats()
  }
}

// Lifecycle
onMounted(() => {
  console.log('📊 OfflineFlushStatusCard mounted')

  // KEINE eigenen Online/Offline Event Listeners mehr
  // Der OnlineStatus Store koordiniert alle Online/Offline Übergänge zentral

  // Initiale Daten laden
  updateStats()

  // Regelmäßige Updates als Fallback - die eigentlichen Änderungen (Sync
  // abgeschlossen, Online-Status geändert) lösen updateStats() bereits
  // gezielt über den Sync-Listener bzw. den isFullyOnline-Watcher aus,
  // daher genügt hier ein seltener Fallback-Takt (Akku-Optimierung)
  updateInterval.value = setInterval(updateStats, 60000) // Alle 60 Sekunden

  // Watch auf isFullyOnline für UI-Updates
  const stopWatch = watch(() => onlineStatusStore.isFullyOnline, () => {
    console.log('🔄 Online-Status geändert im OfflineFlushStatusCard')
    updateStats()
  })

  // Listener für Sync-Events
  const unsubscribeSyncListener = onSyncComplete((event) => {
    console.log('🔄 Sync-Event im OfflineFlushStatusCard:', event)

    if (event.type === 'sync_complete' && event.successCount > 0) {
      console.log('✅ Aktualisiere Stats nach erfolgreicher Synchronisation')
      updateStats()
    }
  })

  // Cleanup
  onUnmounted(() => {
    console.log('🧹 OfflineFlushStatusCard cleanup')

    if (updateInterval.value) {
      clearInterval(updateInterval.value)
    }

    // Stoppe den Watcher
    stopWatch()

    // Unsubscribe vom Sync-Listener
    unsubscribeSyncListener()
  })
})
</script>

<style scoped src="@/styles/components/OfflineFlushStatusCard.css"></style>
