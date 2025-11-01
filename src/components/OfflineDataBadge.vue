<template>
  <div class="offline-data-badge">
    <CBadge
      :color="badgeColor"
      class="d-flex align-items-center gap-1"
      style="cursor: pointer"
      :title="tooltipContent"
    >
      <CIcon
        :icon="badgeIcon"
        size="sm"
      />
      <span v-if="!compact">{{ badgeText }}</span>
      <CSpinner
        v-if="isLoading"
        size="sm"
        class="ms-1"
      />
    </CBadge>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import { CBadge, CSpinner } from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'

// Props
const props = defineProps({
  compact: {
    type: Boolean,
    default: false
  }
})

// Stores
const onlineStatusStore = useOnlineStatusStore()

// Computed
const isLoading = computed(() => {
  if (!onlineStatusStore.dataPreloader) return false
  return onlineStatusStore.dataPreloader.isPreloading?.value ?? false
})

const preloadStats = computed(() => {
  if (!onlineStatusStore.dataPreloader) return { preloaded: false }
  return onlineStatusStore.dataPreloader?.getPreloadStats() ?? { preloaded: false }
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
    return 'Lädt...'
  }
  if (preloadStats.value.preloaded) {
    return `${preloadStats.value.apartmentsCount} Apartments`
  }
  return 'Keine Daten'
})

const tooltipContent = computed(() => {
  if (isLoading.value) {
    return 'Offline-Daten werden geladen...'
  }
  if (preloadStats.value.preloaded) {
    const { buildingsCount, apartmentsCount, hoursSinceLastPreload } = preloadStats.value
    let tooltip = `${buildingsCount} Gebäude, ${apartmentsCount} Apartments\n`
    if (hoursSinceLastPreload < 1) {
      tooltip += 'Gerade aktualisiert'
    } else if (hoursSinceLastPreload < 24) {
      tooltip += `Vor ${hoursSinceLastPreload} Stunden aktualisiert`
    } else {
      const days = Math.floor(hoursSinceLastPreload / 24)
      tooltip += `Vor ${days} Tagen aktualisiert`
    }
    return tooltip
  }
  return 'Keine Offline-Daten verfügbar'
})
</script>

<style scoped src="@/styles/components/OfflineDataBadge.css"></style>

