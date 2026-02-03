/**
 * i18n Configuration
 * Mehrsprachigkeits-Unterstützung für die Anwendung
 */

import { createI18n } from 'vue-i18n'
import de from './locales/de.json'
import en from './locales/en.json'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const LANGUAGE_KEY = 'wls_language'

// Hole gespeicherte Sprache aus IndexedDB oder verwende Browser-Sprache
async function getInitialLocale() {
  // Zuerst prüfen ob in Settings gespeichert
  try {
    const result = await indexedDBHelper.get(STORES.SETTINGS, LANGUAGE_KEY)
    if (result && result.value) {
      return result.value
    }
  } catch (error) {
    console.warn('⚠️ Fehler beim Laden der gespeicherten Sprache aus IndexedDB:', error)
  }

  // Dann prüfen ob in Config gespeichert
  try {
    const configResult = await indexedDBHelper.get(STORES.CONFIG, 'wls_config_cache')
    if (configResult && configResult.value && configResult.value.ui && configResult.value.ui.language) {
      return configResult.value.ui.language
    }
  } catch (error) {
    console.warn('⚠️ Fehler beim Laden der Sprache aus Config:', error)
  }

  // Fallback auf Browser-Sprache
  const browserLang = navigator.language.split('-')[0]
  return ['de', 'en'].includes(browserLang) ? browserLang : 'de'
}

// Initialisiere mit deutscher Sprache, wird dann async aktualisiert
const i18n = createI18n({
  legacy: false, // Composition API Modus
  locale: 'de', // Default, wird async aktualisiert
  fallbackLocale: 'de',
  messages: {
    de,
    en
  },
  globalInjection: true, // $t global verfügbar machen
  missingWarn: false,
  fallbackWarn: false
})

// Lade die gespeicherte Sprache asynchron
getInitialLocale().then(locale => {
  if (locale && ['de', 'en'].includes(locale)) {
    i18n.global.locale.value = locale
    document.documentElement.setAttribute('lang', locale)
    console.log('🌐 Gespeicherte Sprache geladen:', locale)
  }
}).catch(error => {
  console.warn('⚠️ Fehler beim Initialisieren der Sprache:', error)
})

export default i18n

// Helper-Funktion zum Ändern der Sprache
export async function changeLanguage(locale) {
  if (!['de', 'en'].includes(locale)) {
    console.warn(`Ungültige Sprache: ${locale}, verwende Fallback`)
    return false
  }

  i18n.global.locale.value = locale
  document.documentElement.setAttribute('lang', locale)

  // Speichere in IndexedDB
  try {
    await indexedDBHelper.set(STORES.SETTINGS, {
      key: LANGUAGE_KEY,
      value: locale
    })
    console.log('🌐 Sprache geändert und in IndexedDB gespeichert:', locale)
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Sprache in IndexedDB:', error)
  }

  return true
}

// Verfügbare Sprachen
export const availableLocales = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
]

