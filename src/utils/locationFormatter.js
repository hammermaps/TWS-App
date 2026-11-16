/**
 * Kompakte Standortanzeige für Mängelmeldungen.
 *
 * Wandelt Gebäudenamen in Kurzkennzeichen um:
 *   "Duisburger Straße. 36" → "D36"
 *   "Nettelbeckstr. 10"     → "N10"
 *   "Marschallstr. 17"      → "M17"
 *
 * Rückgabe: "D36 / 12" (mit Wohnung) oder "D36" (ohne Wohnung).
 * Fallback auf ursprünglichen street_name bzw. building_id wenn kein Muster passt.
 */

const STREET_PREFIXES = [
  { prefix: 'D', patterns: [/duisburg/i] },
  { prefix: 'N', patterns: [/nettelbeck/i] },
  { prefix: 'M', patterns: [/marschall/i] },
]

/**
 * Extrahiert den Kurzkennzeichen-String aus einem Gebäudenamen.
 * @param {string} streetName  z. B. "Duisburger Straße. 36"
 * @param {number|string} streetId  Fallback-ID
 * @returns {string}  z. B. "D36"
 */
export function formatStreetShort(streetName, streetId) {
  if (!streetName) return String(streetId || '')

  for (const { prefix, patterns } of STREET_PREFIXES) {
    if (patterns.some(p => p.test(streetName))) {
      // Hausnummer: letzte Ziffernfolge im Namen
      const match = streetName.match(/(\d+)\s*$/)
      return match ? prefix + match[1] : prefix + String(streetId || '')
    }
  }

  // Kein Muster → original zurückgeben
  return streetName
}

/**
 * Formatiert Gebäude + Wohnung als kompakte Standortangabe.
 * @param {string} streetName
 * @param {number|string} streetId
 * @param {string} whg
 * @returns {string}  z. B. "D36 / 12" oder "D36"
 */
export function formatLocation(streetName, streetId, whg) {
  const short = formatStreetShort(streetName, streetId)
  return whg && whg.trim() ? `${short} / ${whg.trim()}` : short
}
