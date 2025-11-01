// GlobalToken.js - Globale JWT Token Verwaltung
import { ref, watch } from 'vue'

// Globaler Token State
const authToken = ref(null)
const isAuthenticated = ref(false)

// Token aus localStorage laden beim Start
const loadTokenFromStorage = () => {
  try {
    const storedToken = localStorage.getItem('jwt_token')
    if (storedToken) {
      authToken.value = storedToken
      isAuthenticated.value = true
    }
  } catch (error) {
    console.warn('Konnte Token nicht aus localStorage laden:', error)
  }
}

// Token in localStorage speichern
const saveTokenToStorage = (token) => {
  try {
    if (token) {
      localStorage.setItem('jwt_token', token)
    } else {
      localStorage.removeItem('jwt_token')
    }
  } catch (error) {
    console.warn('Konnte Token nicht in localStorage speichern:', error)
  }
}

// Token setzen
const setToken = (token) => {
  authToken.value = token
  isAuthenticated.value = !!token
  saveTokenToStorage(token)
}

// Token löschen
const clearToken = () => {
  authToken.value = null
  isAuthenticated.value = false
  saveTokenToStorage(null)
}

// Token abrufen
const getToken = () => {
  return authToken.value
}

// Authorization Header für API-Calls
const getAuthHeaders = () => {
  if (!authToken.value) return {}
  return {
    'Authorization': `Bearer ${authToken.value}`
  }
}

// Watcher für automatische localStorage Synchronisation
watch(authToken, (newToken) => {
  saveTokenToStorage(newToken)
  isAuthenticated.value = !!newToken
})

// Initial laden
loadTokenFromStorage()

export {
  authToken,
  isAuthenticated,
  setToken,
  clearToken,
  getToken,
  getAuthHeaders,
  loadTokenFromStorage
}
