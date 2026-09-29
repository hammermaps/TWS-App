<template>
  <RouterLink custom to="/" v-slot="{ href, navigate }">
    <CSidebarBrand v-bind="$attrs" as="a" :href="href" @click="navigate" class="app-sidebar-brand">
      <!-- Full logo für ausgeklappte Sidebar -->
      <div class="sidebar-brand-full">
        <img
          class="sidebar-brand-logo"
          :src="dkcLogo"
          :height="logoHeight"
          alt="DKC-Mobile"
        />
        <span v-if="showTitle" class="brand-title ms-2">{{ title }}</span>
      </div>

      <!-- Kompaktes Logo für minimierte Sidebar -->
      <div class="sidebar-brand-narrow">
        <img
          class="sidebar-brand-sygnet"
          :src="dkcLogo"
          :height="logoHeight"
          alt="DKC-Mobile"
        />
      </div>
    </CSidebarBrand>
  </RouterLink>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import dkcLogo from '@/assets/brand/dkc-logo.png'

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
    default: 'DKC-Mobile'
  }
})
</script>

<style src="@/styles/components/AppSidebarBrand.css"></style>

