<script setup>
import { onMounted, ref } from 'vue'
import { useThemeSync } from '@/services/ThemeService.js'

import AppHeaderDropdownAccnt from '@/components/AppHeaderDropdownAccnt.vue'
import OnlineStatusToggle from '@/components/OnlineStatusToggle.vue'
import OfflineDataBadge from '@/components/OfflineDataBadge.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import QRCodeScanner from '@/components/QRCodeScanner.vue'
import { useSidebarStore } from '@/stores/sidebar.js'

const headerClassNames = ref('mb-4 p-0')
const { colorMode, changeTheme } = useThemeSync()
const sidebar = useSidebarStore()
const showQRScanner = ref(false)

// Funktion zum Ändern des Themes mit Server-Synchronisation
const handleThemeChange = async (theme) => {
  console.log('🎨 Theme-Änderung im Header:', theme)
  await changeTheme(theme)
}

const openQRScanner = () => {
  showQRScanner.value = true
}

const closeQRScanner = () => {
  showQRScanner.value = false
}

onMounted(() => {
  document.addEventListener('scroll', () => {
    if (document.documentElement.scrollTop > 0) {
      headerClassNames.value = 'mb-4 p-0 shadow-sm'
    } else {
      headerClassNames.value = 'mb-4 p-0'
    }
  })
})
</script>

<template>
  <CHeader position="sticky" :class="headerClassNames">
    <CContainer class="border-bottom px-4" fluid>
      <CHeaderToggler @click="sidebar.toggleVisible()" style="margin-inline-start: -14px">
        <CIcon icon="cil-menu" size="lg" />
      </CHeaderToggler>
      <CHeaderNav class="d-none d-md-flex">
        <CNavItem>
          <CNavLink href="/dashboard"> {{ $t('nav.dashboard') }} </CNavLink>
        </CNavItem>
      </CHeaderNav>
      <CHeaderNav class="ms-auto"></CHeaderNav>
      <CHeaderNav>
        <CNavItem class="d-flex align-items-center">
          <OfflineDataBadge />
        </CNavItem>
        <li class="nav-item py-1">
          <div class="vr h-100 mx-2 text-body text-opacity-75"></div>
        </li>
        <CNavItem>
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            @click="openQRScanner"
            class="d-flex align-items-center"
          >
            <CIcon icon="cil-qr-code" size="lg" />
          </CButton>
        </CNavItem>
        <li class="nav-item py-1">
          <div class="vr h-100 mx-2 text-body text-opacity-75"></div>
        </li>
        <OnlineStatusToggle />
        <li class="nav-item py-1">
          <div class="vr h-100 mx-2 text-body text-opacity-75"></div>
        </li>
        <LanguageSwitcher />
        <li class="nav-item py-1">
          <div class="vr h-100 mx-2 text-body text-opacity-75"></div>
        </li>
        <CDropdown variant="nav-item" placement="bottom-end">
          <CDropdownToggle :caret="false">
            <CIcon v-if="colorMode === 'dark'" icon="cil-moon" size="lg" />
            <CIcon v-else-if="colorMode === 'light'" icon="cil-sun" size="lg" />
            <CIcon v-else icon="cil-contrast" size="lg" />
          </CDropdownToggle>
          <CDropdownMenu>
            <CDropdownItem
              :active="colorMode === 'light'"
              class="d-flex align-items-center"
              component="button"
              type="button"
              @click="handleThemeChange('light')"
            >
              <CIcon class="me-2" icon="cil-sun" size="lg" /> {{ $t('settings.ui.themeLight') }}
            </CDropdownItem>
            <CDropdownItem
              :active="colorMode === 'dark'"
              class="d-flex align-items-center"
              component="button"
              type="button"
              @click="handleThemeChange('dark')"
            >
              <CIcon class="me-2" icon="cil-moon" size="lg" /> {{ $t('settings.ui.themeDark') }}
            </CDropdownItem>
            <CDropdownItem
              :active="colorMode === 'auto'"
              class="d-flex align-items-center"
              component="button"
              type="button"
              @click="handleThemeChange('auto')"
            >
              <CIcon class="me-2" icon="cil-contrast" size="lg" /> {{ $t('settings.ui.themeAuto') }}
            </CDropdownItem>
          </CDropdownMenu>
        </CDropdown>
        <li class="nav-item py-1">
          <div class="vr h-100 mx-2 text-body text-opacity-75"></div>
        </li>
        <AppHeaderDropdownAccnt />
      </CHeaderNav>
    </CContainer>

    <!-- QR-Code Scanner Modal -->
    <QRCodeScanner
      :visible="showQRScanner"
      @update:visible="showQRScanner = $event"
      @close="closeQRScanner"
    />
  </CHeader>
</template>
