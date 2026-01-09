<template>
  <div class="wrapper min-vh-100 d-flex flex-row align-items-center">
    <CContainer>
      <CRow class="justify-content-center">
        <CCol :md="8">
          <CCardGroup>
            <CCard class="p-4">
              <CCardBody>
                <CForm @submit.prevent="handleLogin">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h1>{{ $t('auth.login') }}</h1>
                      <p class="text-body-secondary mb-0">{{ $t('auth.loginSubtitle') }}</p>
                    </div>
                    <!-- Language Selector -->
                    <CDropdown variant="btn-group" placement="bottom-end" class="language-selector">
                      <CDropdownToggle color="light" size="sm" class="border">
                        {{ currentLocale.flag }}
                      </CDropdownToggle>
                      <CDropdownMenu>
                        <CDropdownItem
                          v-for="locale in availableLocales"
                          :key="locale.code"
                          @click="switchLanguage(locale.code)"
                          :active="locale.code === currentLocale.code"
                        >
                          {{ locale.flag }} {{ locale.name }}
                        </CDropdownItem>
                      </CDropdownMenu>
                    </CDropdown>
                  </div>

                  <!-- Error Alert -->
                  <CAlert
                    v-if="hasError"
                    color="danger"
                    :visible="true"
                    dismissible
                    @close="clearError"
                  >
                    {{ error }}
                  </CAlert>

                  <!-- Success Alert -->
                  <CAlert
                    v-if="successMessage"
                    color="success"
                    :visible="true"
                    dismissible
                    @close="successMessage = ''"
                  >
                    {{ successMessage }}
                  </CAlert>

                  <CInputGroup class="mb-3">
                    <CInputGroupText>
                      <CIcon icon="cil-user" />
                    </CInputGroupText>
                    <CFormInput
                      v-model="loginForm.username"
                      :placeholder="$t('auth.username')"
                      autocomplete="username"
                      :disabled="isLoading"
                      required
                    />
                  </CInputGroup>

                  <CInputGroup class="mb-4">
                    <CInputGroupText>
                      <CIcon icon="cil-lock-locked" />
                    </CInputGroupText>
                    <CFormInput
                      v-model="loginForm.password"
                      type="password"
                      :placeholder="$t('auth.password')"
                      autocomplete="current-password"
                      :disabled="isLoading"
                      required
                    />
                  </CInputGroup>

                  <CRow>
                    <CCol :xs="6">
                      <CButton
                        type="submit"
                        color="primary"
                        class="px-4"
                        :disabled="isLoading || !loginForm.username || !loginForm.password"
                      >
                        <CSpinner
                          v-if="isLoading"
                          size="sm"
                          class="me-2"
                        />
                        {{ isLoading ? $t('auth.loggingIn') : $t('auth.login') }}
                      </CButton>
                    </CCol>
                    <CCol :xs="6" class="text-end">
                      <CButton
                        color="link"
                        class="px-0"
                        @click="forgotPassword"
                        :disabled="isLoading"
                      >
                        {{ $t('auth.forgotPassword') }}
                      </CButton>
                    </CCol>
                  </CRow>
                </CForm>
              </CCardBody>
            </CCard>

            <CCard class="text-white bg-primary py-5" style="width: 44%">
              <CCardBody class="text-center">
                <div>
                  <h2>{{ $t('auth.register') }}</h2>
                  <p>
                    {{ $t('auth.registerText') }}
                  </p>
                  <RouterLink to="/register">
                    <CButton color="primary" variant="outline" class="mt-3">
                      {{ $t('auth.registerNow') }}
                    </CButton>
                  </RouterLink>
                </div>
              </CCardBody>
            </CCard>
          </CCardGroup>
        </CCol>
      </CRow>
    </CContainer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardGroup,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CButton,
  CAlert,
  CSpinner,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem
} from '@coreui/vue'
import CIcon from '@coreui/icons-vue'
import { useUser } from '../../api/useUser.js'
import { availableLocales, changeLanguage } from '../../i18n/index.js'

const router = useRouter()
const { t, locale } = useI18n()

// User Composable
const {
  login,
  isLoading,
  hasError,
  error,
  clearError,
  isAuthenticated
} = useUser()

// Reactive Data
const loginForm = reactive({
  username: '',
  password: ''
})

const successMessage = ref('')

// Computed Properties
const canSubmit = computed(() => {
  return loginForm.username.trim() !== '' &&
         loginForm.password.trim() !== '' &&
         !isLoading.value
})

const currentLocale = computed(() => {
  return availableLocales.find(l => l.code === locale.value) || availableLocales[0]
})

// Methods
const switchLanguage = (newLocale) => {
  changeLanguage(newLocale)
}

const handleLogin = async () => {
  clearError()

  if (!canSubmit.value) return

  try {
    const result = await login({
      username: loginForm.username.trim(),
      password: loginForm.password
    })

    if (result.success) {
      successMessage.value = t('auth.loginSuccess')

      // Reset form
      loginForm.username = ''
      loginForm.password = ''

      // Redirect nach 1 Sekunde
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    }
  } catch (err) {
    console.error('Login error:', err)
  }
}

const forgotPassword = () => {
  // TODO: Implementierung für Passwort vergessen
  alert(t('auth.forgotPasswordNotImplemented'))
}

// Lifecycle
onMounted(() => {
  // Wenn bereits angemeldet, zur Dashboard weiterleiten
  if (isAuthenticated.value) {
    router.push('/dashboard')
  }
})
</script>

<style scoped>
.language-selector {
  min-width: 100px;
}

.language-selector .dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wrapper {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Verbesserte Dropdown-Darstellung */
:deep(.dropdown-item.active) {
  background-color: var(--cui-primary);
  color: white;
}

:deep(.dropdown-item:hover) {
  background-color: var(--cui-secondary);
  cursor: pointer;
}
</style>
