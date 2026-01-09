/**
 * i18n Configuration
 * Mehrsprachigkeits-Unterstützung für die Anwendung
 */

import { createI18n } from 'vue-i18n'
import de from './locales/de.json'
import en from './locales/en.json'

// Hole gespeicherte Sprache aus LocalStorage oder verwende Browser-Sprache
function getInitialLocale() {
  // Zuerst prüfen ob in Config gespeichert
  try {
    const configStr = localStorage.getItem('wls_config')
    if (configStr) {
      const config = JSON.parse(configStr)
      if (config?.ui?.language) {
        return config.ui.language
      }
    }
  } catch (error) {
    console.warn('Fehler beim Laden der gespeicherten Sprache:', error)
  }

  // Fallback auf Browser-Sprache
  const browserLang = navigator.language.split('-')[0]
  return ['de', 'en'].includes(browserLang) ? browserLang : 'de'
}

const i18n = createI18n({
  legacy: false, // Composition API Modus
  locale: getInitialLocale(),
  fallbackLocale: 'de',
  messages: {
    de,
    en
  },
  globalInjection: true, // $t global verfügbar machen
  missingWarn: false,
  fallbackWarn: false
})

export default i18n

// Helper-Funktion zum Ändern der Sprache
export function changeLanguage(locale) {
  if (!['de', 'en'].includes(locale)) {
    console.warn(`Ungültige Sprache: ${locale}, verwende Fallback`)
    return false
  }

  i18n.global.locale.value = locale
  localStorage.setItem('wls_language', locale)
  document.documentElement.setAttribute('lang', locale)

  console.log(`🌐 Sprache geändert: ${locale}`)
  return true
}

// Verfügbare Sprachen
export const availableLocales = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
]

