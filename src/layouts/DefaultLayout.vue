<script setup>
import { onMounted, computed, ref } from 'vue'
import { CContainer } from '@coreui/vue'
import AppFooter from '@/components/AppFooter.vue'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import OfflineModeBanner from '@/components/OfflineModeBanner.vue'
import OfflineDataLoadingOverlay from '@/components/OfflineDataLoadingOverlay.vue'
import { setRouter } from '../stores/TokenManager.js'
import { useRouter } from 'vue-router'
import { useOfflineDataPreloader } from '../services/OfflineDataPreloader.js'

const router = useRouter()
const dataPreloader = useOfflineDataPreloader()

// detect Android/native container to apply fallback safe-area padding
const isAndroid = ref(false)

onMounted(() => {
  try {
    const ua = navigator && navigator.userAgent ? navigator.userAgent : ''
    isAndroid.value = /Android/i.test(ua) || (window && window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android')
  } catch (e) { isAndroid.value = false }
  // Stelle Router-Instanz für TokenManager bereit (für automatische Weiterleitungen)
  setRouter(router)
})

// Reaktive Werte für das Loading-Overlay
const isLoading = computed(() => dataPreloader.isPreloading.value)
const loadingProgress = computed(() => dataPreloader.preloadProgress.value)
</script>

<template>
  <div>
    <AppSidebar />
    <div :class="['wrapper d-flex flex-column min-vh-100 safe-area', { 'safe-area-android': isAndroid }]">
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

<style scoped>
/* Safe-area padding for devices with system UI overlays (iOS notch, Android translucent bars)
   We apply only the vertical insets to the main wrapper so header/footer are not overlapped by system bars.
   Use env() for safe-area-inset-* with fallbacks. */
.safe-area {
  /* Top */
  padding-top: env(safe-area-inset-top, 0px) !important;
  /* Bottom */
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
}

/* Helper classes to give fixed header/footer extra offset from system bars */
.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px) !important;
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
}

/* Ensure the safe-area adjustments don't break min-height layout */
.wrapper.safe-area {
  box-sizing: border-box;
  position: relative;
}

/* Fallback safe-area padding for Android */
.safe-area-android {
  padding-top: 24px !important;
  padding-bottom: 24px !important;
}
</style>
