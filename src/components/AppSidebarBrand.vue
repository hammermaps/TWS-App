<template>
  <RouterLink custom to="/" v-slot="{ href, navigate }">
    <CSidebarBrand v-bind="$attrs" as="a" :href="href" @click="navigate" class="app-sidebar-brand">
      <!-- Full logo für ausgeklappte Sidebar -->
      <div class="sidebar-brand-full">
        <CIcon
          custom-class-name="sidebar-brand-logo"
          :icon="logo"
          :height="logoHeight"
        />
        <span v-if="showTitle" class="brand-title ms-2">{{ title }}</span>
      </div>

      <!-- Kompaktes Logo für minimierte Sidebar -->
      <div class="sidebar-brand-narrow">
        <CIcon
          custom-class-name="sidebar-brand-sygnet"
          :icon="sygnet"
          :height="logoHeight"
        />
      </div>
    </CSidebarBrand>
  </RouterLink>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { logo } from '@/assets/brand/logo'
import { sygnet } from '@/assets/brand/sygnet'

// Props für Anpassbarkeit
const props = defineProps({
  logoHeight: {
    type: Number,
    default: 32
  },
  showTitle: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'WLS App'
  }
})
</script>

<style src="@/styles/components/AppSidebarBrand.css"></style>

