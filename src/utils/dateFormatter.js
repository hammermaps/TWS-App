/**
 * Zentrale Utility-Funktionen für Datumsformatierung
 * Verwendet das Datums-Format aus den Benutzereinstellungen
 */

import { useConfigStorage } from '@/stores/ConfigStorage.js'

/**
 * Konvertiert ein Datums-Format-Pattern in ein Locale-String-Options-Objekt
 * @param {string} formatPattern - Das Format-Pattern (z.B. 'DD.MM.YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY')
 * @returns {object} Options für toLocaleDateString/toLocaleString
 */
function getLocaleOptions(formatPattern) {
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }

  // Bestimme das Locale basierend auf dem Format
  let locale

  switch (formatPattern) {
    case 'DD.MM.YYYY':
      locale = 'de-DE'
      break
    case 'YYYY-MM-DD':
      locale = 'sv-SE' // Schwedisch verwendet YYYY-MM-DD
      break
    case 'MM/DD/YYYY':
      locale = 'en-US'
      break
    default:
      locale = 'de-DE'
  }

  return { locale, options }
}

/**
 * Formatiert ein Datum gemäß den Benutzereinstellungen
 * @param {string|Date} dateInput - Das zu formatierende Datum
 * @param {boolean} includeTime - Ob auch die Uhrzeit angezeigt werden soll
 * @returns {string} Das formatierte Datum
 */
export function formatDate(dateInput, includeTime = false) {
  if (!dateInput) return '-'

  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return '-'

    // Hole das Datums-Format aus den Einstellungen
    const configStorage = useConfigStorage()
    const config = configStorage.loadConfig()
    const dateFormat = config?.ui?.dateFormat || 'DD.MM.YYYY'

    const { locale, options } = getLocaleOptions(dateFormat)

    if (includeTime) {
      const timeOptions = {
        ...options,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }
      return date.toLocaleString(locale, timeOptions)
    }

    return date.toLocaleDateString(locale, options)
  } catch (error) {
    console.warn('Fehler beim Formatieren des Datums:', error)
    return '-'
  }
}

/**
 * Formatiert ein Datum mit Uhrzeit gemäß den Benutzereinstellungen
 * @param {string|Date} dateInput - Das zu formatierende Datum
 * @returns {string} Das formatierte Datum mit Uhrzeit
 */
export function formatDateTime(dateInput) {
  return formatDate(dateInput, true)
}

/**
 * Formatiert nur die Uhrzeit eines Datums
 * @param {string|Date} dateInput - Das zu formatierende Datum
 * @returns {string} Die formatierte Uhrzeit
 */
export function formatTime(dateInput) {
  if (!dateInput) return '-'

  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return '-'

    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch (error) {
    console.warn('Fehler beim Formatieren der Uhrzeit:', error)
    return '-'
  }
}

/**
 * Formatiert ein Datum für Monat/Jahr Anzeige (z.B. "Januar 2026")
 * @param {string|Date} dateInput - Das zu formatierende Datum
 * @returns {string} Der formatierte Monat/Jahr String
 */
export function formatMonthYear(dateInput) {
  if (!dateInput) return '-'

  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return '-'

    // Hole das Datums-Format aus den Einstellungen für Locale
    const configStorage = useConfigStorage()
    const config = configStorage.loadConfig()
    const dateFormat = config?.ui?.dateFormat || 'DD.MM.YYYY'
    const { locale } = getLocaleOptions(dateFormat)

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long'
    })
  } catch (error) {
    console.warn('Fehler beim Formatieren von Monat/Jahr:', error)
    return '-'
  }
}

/**
 * Formatiert ein relatives Datum (z.B. "vor 2 Tagen")
 * @param {string|Date} dateInput - Das zu formatierende Datum
 * @returns {string} Das relative Datum oder formatiertes Datum wenn zu weit zurück
 */
export function formatRelativeDate(dateInput) {
  if (!dateInput) return '-'

  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return '-'

    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Heute'
    if (diffDays === 1) return 'Gestern'
    if (diffDays < 7) return `vor ${diffDays} Tagen`
    if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`
    if (diffDays < 365) return `vor ${Math.floor(diffDays / 30)} Monaten`

    // Für ältere Daten, zeige das formatierte Datum
    return formatDate(date)
  } catch (error) {
    console.warn('Fehler beim Formatieren des relativen Datums:', error)
    return '-'
  }
}

/**
 * Prüft ob ein Datum in der Vergangenheit liegt
 * @param {string|Date} dateInput - Das zu prüfende Datum
 * @returns {boolean} True wenn in der Vergangenheit
 */
export function isPastDate(dateInput) {
  if (!dateInput) return false

  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return false

    return date < new Date()
  } catch (error) {
    return false
  }
}

/**
 * Prüft ob ein Datum in der Zukunft liegt
 * @param {string|Date} dateInput - Das zu prüfende Datum
 * @returns {boolean} True wenn in der Zukunft
 */
export function isFutureDate(dateInput) {
  if (!dateInput) return false

  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return false

    return date > new Date()
  } catch (error) {
    return false
  }
}

