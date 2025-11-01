<script setup>
import { onMounted } from 'vue'
import { CContainer } from '@coreui/vue'
import AppFooter from '@/components/AppFooter.vue'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import OfflineModeBanner from '@/components/OfflineModeBanner.vue'
import { setRouter } from '../stores/TokenManager.js'
import { useRouter } from 'vue-router'

const router = useRouter()

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
        <CContainer class="px-4" lg>
          <router-view />
        </CContainer>
      </div>
      <AppFooter />
    </div>
  </div>
</template>
