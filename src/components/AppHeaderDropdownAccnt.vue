<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CDropdownHeader,
  CDropdownDivider,
  CAvatar
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue';
import { useUser } from '../api/useUser.js'
import { ApiUser } from '../api/ApiUser.js'
import defaultAvatar from '@/assets/images/avatars/8.jpg'

const router = useRouter()
const { t } = useI18n()
const { logout, currentUser, isAuthenticated } = useUser()

const avatar = ref(defaultAvatar)
const apiUser = new ApiUser()

const loadAvatar = async () => {
  if (!currentUser.value?.id) return
  const result = await apiUser.getProfileImage(currentUser.value.id, { ttlMinutes: 24 * 60 })
  avatar.value = result.success && result.data?.base64 ? result.data.base64 : defaultAvatar
}

onMounted(loadAvatar)
watch(() => currentUser.value?.id, loadAvatar)

const handleLogout = async () => {
  try {
    await logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
    // Auch bei Fehler zur Login-Seite weiterleiten
    router.push('/login')
  }
}

// Navigation Handler für Profil-Links - verbessert mit Fehlerbehandlung
const navigateToProfileView = async () => {
  console.log('🔄 Navigiere zu Profil anzeigen...')
  try {
    await router.push('/profile/view')
    console.log('✅ Navigation zu ProfileView erfolgreich')
  } catch (error) {
    console.error('❌ Fehler bei Navigation zu ProfileView:', error)
    // Fallback mit Namen
    try {
      await router.push({ name: 'ProfileView' })
    } catch (fallbackError) {
      console.error('❌ Fallback Navigation fehlgeschlagen:', fallbackError)
    }
  }
}

const navigateToProfile = async () => {
  console.log('🔄 Navigiere zu Profil bearbeiten...')
  try {
    await router.push('/profile')
    console.log('✅ Navigation zu Profile erfolgreich')
  } catch (error) {
    console.error('❌ Fehler bei Navigation zu Profile:', error)
    // Fallback mit Namen
    try {
      await router.push({ name: 'Profile' })
    } catch (fallbackError) {
      console.error('❌ Fallback Navigation fehlgeschlagen:', fallbackError)
    }
  }
}
</script>

<template>
  <CDropdown placement="bottom-end" variant="nav-item">
    <CDropdownToggle class="py-0 pe-0" :caret="false">
      <CAvatar :src="avatar" size="md" @error="avatar = defaultAvatar" />
    </CDropdownToggle>
    <CDropdownMenu class="pt-0">
      <CDropdownHeader
        component="h6"
        class="bg-body-secondary text-body-secondary fw-semibold my-2"
      >
        {{ currentUser?.username || t('common.user') }}
      </CDropdownHeader>
      <CDropdownItem @click="navigateToProfileView" v-if="isAuthenticated">
        <CIcon icon="cil-user" class="me-2" />
        {{ t('profile.viewProfile') }}
      </CDropdownItem>
      <CDropdownItem @click="navigateToProfile" v-if="isAuthenticated">
        <CIcon icon="cil-settings" class="me-2" />
        {{ t('profile.editProfile') }}
      </CDropdownItem>
      <CDropdownDivider />
      <CDropdownItem @click="handleLogout">
        <CIcon icon="cil-account-logout" class="me-2" />
        {{ t('nav.logout') }}
      </CDropdownItem>
    </CDropdownMenu>
  </CDropdown>
</template>
