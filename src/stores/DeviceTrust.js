// DeviceTrust.js - Speichert das "Gerät merken"-Token für 2FA (siehe TwoFactorAuthHelper
// im ProxyServer-Backend). Gleiches Muster wie GlobalToken.js, aber bewusst getrennt: das
// Device-Trust-Token überlebt einen Logout (es identifiziert das Gerät, nicht die Session)
// und wird bei jedem Login mitgeschickt, um die 2FA-Abfrage zu überspringen.
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const DEVICE_TRUST_KEY = 'two_factor_device_trust_token'

let cachedToken = null
let loaded = false

const loadDeviceTrustToken = async () => {
  try {
    const result = await indexedDBHelper.get(STORES.AUTH, DEVICE_TRUST_KEY)
    cachedToken = result && result.value ? result.value : null
  } catch (error) {
    console.warn('⚠️ Konnte Device-Trust-Token nicht aus IndexedDB laden:', error)
    cachedToken = null
  } finally {
    loaded = true
  }
}

// Beim Modul-Load einmalig laden, damit der erste Login-Versuch nach App-Start
// das Token bereits kennt (ansonsten müsste jeder Aufrufer erst awaiten).
const initialLoad = loadDeviceTrustToken()

const getDeviceTrustToken = async () => {
  if (!loaded) {
    await initialLoad
  }
  return cachedToken
}

const setDeviceTrustToken = async (token) => {
  cachedToken = token || null
  try {
    if (token) {
      await indexedDBHelper.set(STORES.AUTH, { key: DEVICE_TRUST_KEY, value: token })
    } else {
      await indexedDBHelper.delete(STORES.AUTH, DEVICE_TRUST_KEY)
    }
  } catch (error) {
    console.warn('⚠️ Konnte Device-Trust-Token nicht in IndexedDB speichern:', error)
  }
}

const clearDeviceTrustToken = async () => {
  await setDeviceTrustToken(null)
}

export {
  getDeviceTrustToken,
  setDeviceTrustToken,
  clearDeviceTrustToken
}
