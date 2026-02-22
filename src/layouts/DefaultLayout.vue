<script setup>
import { onMounted, computed } from 'vue'
import { CContainer } from '@coreui/vue'
import AppFooter from '@/components/AppFooter.vue'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import OfflineModeBanner from '@/components/OfflineModeBanner.vue'
import OfflineDataLoadingOverlay from '@/components/OfflineDataLoadingOverlay.vue'
import { setRouter } from '../stores/TokenManager.js'
import { useRouter } from 'vue-router'
import { useOfflineDataPreloader } from '@/services/OfflineDataPreloader.js'

const router = useRouter()
const dataPreloader = useOfflineDataPreloader()

// Reaktive Werte für das Loading-Overlay
const isLoading = computed(() => dataPreloader.isPreloading.value)
const loadingProgress = computed(() => dataPreloader.preloadProgress.value)

onMounted(() => {
  // Stelle Router-Instanz für TokenManager bereit (für automatische Weiterleitungen)
  setRouter(router)
})
</script>

<template>
  <div>
    <AppSidebar />
    <div class="wrapper d-flex flex-column min-vh-100">
      <AppHeader />
      <OfflineModeBanner />
      <div class="body flex-grow-1">
        <CContainer class="container-fluid flex-grow-1 container-p-y" fluid>
          <router-view />
        </CContainer>
      </div>
      <AppFooter />
    </div>

    <!-- Offline-Daten-Loading-Overlay -->
    <OfflineDataLoadingOverlay
      :is-visible="isLoading"
      :progress="loadingProgress"
      :show-cancel-button="false"
    />
  </div>
</template>
