<template>
  <div class="wrapper min-vh-100 d-flex flex-row align-items-center">
    <CContainer>
      <CRow class="justify-content-center">
        <CCol :md="8">
          <CCardGroup>
            <CCard class="p-4">
              <CCardBody>
                <CForm @submit.prevent="handleLogin">
                  <h1>Login</h1>
                  <p class="text-body-secondary">Melden Sie sich in Ihrem Konto an</p>

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
                      placeholder="Benutzername"
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
                      placeholder="Passwort"
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
                        {{ isLoading ? 'Anmelden...' : 'Anmelden' }}
                      </CButton>
                    </CCol>
                    <CCol :xs="6" class="text-end">
                      <CButton
                        color="link"
                        class="px-0"
                        @click="forgotPassword"
                        :disabled="isLoading"
                      >
                        Passwort vergessen?
                      </CButton>
                    </CCol>
                  </CRow>
                </CForm>
              </CCardBody>
            </CCard>

            <CCard class="text-white bg-primary py-5" style="width: 44%">
              <CCardBody class="text-center">
                <div>
                  <h2>Registrieren</h2>
                  <p>
                    Noch kein Konto? Erstellen Sie jetzt ein neues Konto
                    und nutzen Sie alle Funktionen unserer Plattform.
                  </p>
                  <RouterLink to="/register">
                    <CButton color="primary" variant="outline" class="mt-3">
                      Jetzt registrieren!
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
  CSpinner
} from '@coreui/vue'
import CIcon from '@coreui/icons-vue'
import { useUser } from '../../api/useUser.js'

const router = useRouter()

// User Composable - Verwende Proxy-URL im Development-Mode
const {
  login,
  isLoading,
  hasError,
  error,
  clearError,
  isAuthenticated
} = useUser() // Keine hardcodierte URL - verwende automatische Proxy-Erkennung

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

// Methods
const handleLogin = async () => {
  clearError()

  if (!canSubmit.value) return

  try {
    const result = await login({
      username: loginForm.username.trim(),
      password: loginForm.password
    })

    if (result.success) {
      successMessage.value = 'Login erfolgreich! Weiterleitung...'

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
  alert('Passwort vergessen Funktion wird noch implementiert')
}

// Lifecycle
onMounted(() => {
  // Wenn bereits angemeldet, zur Dashboard weiterleiten
  if (isAuthenticated.value) {
    router.push('/dashboard')
  }
})
</script>

<style scoped src="@/styles/views/Login.css"></style>
