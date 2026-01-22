<template>
  <div class="offline-data-badge position-relative">
    <CBadge
      :color="badgeColor"
      class="d-flex align-items-center gap-1"
      style="cursor: pointer"
      :title="tooltipContent"
      @click="showProgress = !showProgress"
    >
      <CIcon
        :icon="badgeIcon"
        size="sm"
        :class="{ 'rotating-icon': isLoading }"
      />
      <span v-if="!compact">{{ $t('offlineDataBadge.badgeText') !== undefined ? $t('offlineDataBadge.badgeText') : badgeText }}</span>
      <CSpinner
        v-if="isLoading"
        size="sm"
        class="ms-1"
      />
    </CBadge>

    <!-- Progress Dropdown -->
    <div
      v-if="(isLoading || showSuccess) && showProgress"
      class="progress-dropdown position-absolute top-100 end-0 mt-2 p-3 bg-body border rounded shadow-lg"
      style="min-width: 300px; z-index: 1050"
    >
      <!-- Loading State -->
      <div v-if="isLoading">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong class="text-primary">
            <CIcon icon="cil-cloud-download" size="sm" class="me-1" />
            {{ $t('offlineDataBadge.loadingTitle') }}
          </strong>
          <CButton
            size="sm"
            color="light"
            variant="ghost"
            @click="showProgress = false"
          >
            <CIcon icon="cil-x" size="sm" />
          </CButton>
        </div>

        <CProgress
          :value="progressPercent"
          color="primary"
          class="mb-2"
          height="25px"
        >
          <span class="text-white fw-bold small">{{ progressPercent }}%</span>
        </CProgress>

        <div class="text-muted small">
          <div v-if="progressData.currentBuilding" class="mb-1">
            <strong>{{ $t('offlineDataBadge.current') }}</strong> {{ progressData.currentBuilding }}
          </div>
          <div class="d-flex justify-content-between">
            <span>{{ $t('offlineDataBadge.buildings') }}:</span>
            <strong>{{ progressData.buildings }} / {{ progressData.totalBuildings }}</strong>
          </div>
          <div class="d-flex justify-content-between">
            <span>{{ $t('offlineDataBadge.apartments') }}:</span>
            <strong>{{ progressData.apartments }}</strong>
          </div>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="showSuccess">
        <div class="d-flex align-items-center justify-content-center py-2">
          <CIcon icon="cil-check-circle" size="xl" class="text-success me-2" />
          <div>
            <strong class="text-success">{{ $t('offlineDataBadge.successTitle') }}</strong>
            <div class="text-muted small">
              {{ $t('offlineDataBadge.successStats', { buildings: preloadStats.buildingsCount, apartments: preloadStats.apartmentsCount }) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import { CBadge, CSpinner, CProgress, CButton } from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { useI18n } from 'vue-i18n'

// Props
const props = defineProps({
  compact: {
    type: Boolean,
    default: false
  }
})

const { t } = useI18n()

// Local state
const showProgress = ref(false)
const showSuccess = ref(false)
const localRefreshKey = ref(0)

// Stores
const onlineStatusStore = useOnlineStatusStore()

// Computed
const isLoading = computed(() => {
  if (!onlineStatusStore.dataPreloader) return false
  return onlineStatusStore.dataPreloader.isPreloading?.value ?? false
})

// Listen to global preload events so the UI updates immediately after preload finishes/cleared
function onPreloadComplete(e) {
  console.log('🔔 Event wls:preload:complete empfangen', e.detail)
  localRefreshKey.value++
  showSuccess.value = true
  setTimeout(() => {
    showSuccess.value = false
    showProgress.value = false
  }, 3000)
}

function onPreloadCleared() {
  console.log('🔔 Event wls:preload:cleared empfangen')
  localRefreshKey.value++
}

window.addEventListener('wls:preload:complete', onPreloadComplete)
window.addEventListener('wls:preload:cleared', onPreloadCleared)

// cleanup on unmount
onBeforeUnmount(() => {
  window.removeEventListener('wls:preload:complete', onPreloadComplete)
  window.removeEventListener('wls:preload:cleared', onPreloadCleared)
})

// Ensure computed properties reference localRefreshKey so they update when events fire
const progressData = computed(() => {
  if (!onlineStatusStore.dataPreloader) {
    return { buildings: 0, totalBuildings: 0, apartments: 0, currentBuilding: null }
  }
  return onlineStatusStore.dataPreloader.preloadProgress?.value ?? {
    buildings: 0,
    totalBuildings: 0,
    apartments: 0,
    currentBuilding: null
  }
})

const progressPercent = computed(() => {
  const data = progressData.value
  if (!data.totalBuildings || data.totalBuildings === 0) return 0
  return Math.round((data.buildings / data.totalBuildings) * 100)
})

const preloadStats = computed(() => {
  // referenziere localRefreshKey für reaktive Aktualisierung
  localRefreshKey.value
  try {
    if (!onlineStatusStore.dataPreloader) return { preloaded: false }
    const stats = onlineStatusStore.dataPreloader.getPreloadStats()
    return stats ?? { preloaded: false }
  } catch (err) {
    console.warn('⚠️ Fehler beim Lesen der Preload-Statistiken:', err)
    return { preloaded: false }
  }
})

const badgeColor = computed(() => {
  if (isLoading.value) return 'primary'
  if (preloadStats.value.preloaded) {
    return preloadStats.value.needsRefresh ? 'warning' : 'success'
  }
  return 'secondary'
})

const badgeIcon = computed(() => {
  if (isLoading.value) return 'cil-cloud-download'
  if (preloadStats.value.preloaded) {
    return preloadStats.value.needsRefresh ? 'cil-warning' : 'cil-check-circle'
  }
  return 'cil-cloud-download'
})

const badgeText = computed(() => {
  if (isLoading.value && onlineStatusStore.dataPreloader) {
    const progress = onlineStatusStore.dataPreloader.preloadProgress?.value
    if (progress?.totalBuildings > 0) {
      return `${progress.buildings}/${progress.totalBuildings}`
    }
    return t('offlineDataBadge.loading')
  }
  if (preloadStats.value.preloaded) {
    return t('offlineDataBadge.apartmentsCount', { count: preloadStats.value.apartmentsCount })
  }
  return t('offlineDataBadge.noData')
})

const tooltipContent = computed(() => {
  if (isLoading.value) {
    return t('offlineDataBadge.loadingTooltip')
  }
  if (preloadStats.value.preloaded) {
    const { buildingsCount, apartmentsCount, hoursSinceLastPreload } = preloadStats.value
    let tooltip = `${buildingsCount} ${t('offlineDataBadge.buildings')}, ${apartmentsCount} ${t('offlineDataBadge.apartments')}\n`
    if (hoursSinceLastPreload < 1) {
      tooltip += t('buildings.updatedJustNow')
    } else if (hoursSinceLastPreload < 24) {
      tooltip += t('buildings.updatedHoursAgo', { hours: hoursSinceLastPreload })
    } else {
      const days = Math.floor(hoursSinceLastPreload / 24)
      tooltip += t('apartments.daysAgo', { days })
    }
    return tooltip
  }
  return t('offlineDataBadge.noOfflineData')
})
</script>

<style scoped src="@/styles/components/OfflineDataBadge.css"></style>
