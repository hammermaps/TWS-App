<template>
  <CDropdown variant="nav-item" placement="bottom-end">
    <CDropdownToggle
      placement="bottom-end"
      class="py-0 pe-0"
      :caret="false"
    >
      <span class="language-flag">{{ currentFlag }}</span>
      <span class="language-code d-none d-md-inline ms-2">{{ currentCode }}</span>
    </CDropdownToggle>
    <CDropdownMenu class="pt-0">
      <CDropdownHeader class="bg-body-secondary fw-semibold mb-2">
        {{ $t('settings.ui.language') }}
      </CDropdownHeader>
      <CDropdownItem
        v-for="lang in availableLanguages"
        :key="lang.code"
        @click="changeLanguage(lang.code)"
        :active="currentLanguage === lang.code"
        class="d-flex align-items-center"
      >
        <span class="language-flag me-2">{{ lang.flag }}</span>
        <span>{{ lang.name }}</span>
        <CIcon
          v-if="currentLanguage === lang.code"
          icon="cilCheckAlt"
          class="ms-auto text-success"
        />
      </CDropdownItem>
    </CDropdownMenu>
  </CDropdown>
</template>

<script setup>
import { computed } from 'vue'
import { useLanguageService } from '@/services/LanguageService.js'
import {
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownHeader,
  CDropdownItem
} from '@coreui/vue'
import CIcon from '@coreui/icons-vue'

const languageService = useLanguageService()

const currentLanguage = computed(() => languageService.currentLanguage.value)
const availableLanguages = languageService.availableLanguages

const currentFlag = computed(() => {
  const lang = availableLanguages.find(l => l.code === currentLanguage.value)
  return lang ? lang.flag : '🌐'
})

const currentCode = computed(() => {
  return currentLanguage.value.toUpperCase()
})

const changeLanguage = async (langCode) => {
  if (langCode === currentLanguage.value) return

  console.log('🌐 Wechsle Sprache zu:', langCode)
  const success = await languageService.setLanguage(langCode, true)

  if (success) {
    console.log('✅ Sprache erfolgreich gewechselt')
  } else {
    console.error('❌ Fehler beim Wechseln der Sprache')
  }
}
</script>

<style scoped>
.language-flag {
  font-size: 1.25rem;
  line-height: 1;
}

.language-code {
  font-size: 0.875rem;
  font-weight: 500;
}

.dropdown-item {
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: var(--cui-dropdown-link-hover-bg);
}

.dropdown-item.active {
  background-color: var(--cui-dropdown-link-active-bg);
}
</style>

