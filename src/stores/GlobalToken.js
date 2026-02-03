// GlobalToken.js - Globale JWT Token Verwaltung mit IndexedDB
import { ref, watch } from 'vue'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const TOKEN_KEY = 'jwt_token'

// Globaler Token State
const authToken = ref(null)
const isAuthenticated = ref(false)

// Token aus IndexedDB laden beim Start
const loadTokenFromStorage = async () => {
  try {
    const result = await indexedDBHelper.get(STORES.AUTH, TOKEN_KEY)
    if (result && result.value) {
      authToken.value = result.value
      isAuthenticated.value = true
      console.log('🔑 Token aus IndexedDB geladen')
    }
  } catch (error) {
    console.warn('⚠️ Konnte Token nicht aus IndexedDB laden:', error)
  }
}

// Token in IndexedDB speichern
const saveTokenToStorage = async (token) => {
  try {
    if (token) {
      await indexedDBHelper.set(STORES.AUTH, {
        key: TOKEN_KEY,
        value: token
      })
      console.log('💾 Token in IndexedDB gespeichert')
    } else {
      await indexedDBHelper.delete(STORES.AUTH, TOKEN_KEY)
      console.log('🗑️ Token aus IndexedDB entfernt')
    }
  } catch (error) {
    console.warn('⚠️ Konnte Token nicht in IndexedDB speichern:', error)
  }
}

// Token setzen
const setToken = async (token) => {
  authToken.value = token
  isAuthenticated.value = !!token
  await saveTokenToStorage(token)
}

// Token löschen
const clearToken = async () => {
  authToken.value = null
  isAuthenticated.value = false
  await saveTokenToStorage(null)
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

// Watcher für automatische IndexedDB Synchronisation
watch(authToken, async (newToken) => {
  await saveTokenToStorage(newToken)
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
