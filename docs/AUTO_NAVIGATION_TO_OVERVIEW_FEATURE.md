# Feature: Auto-Navigation zur Übersicht nach letzter Wohnung

## Änderung

Bei aktivierter Auto-Navigation springt die App nach Abschluss der Spülung in der **letzten Wohnung** automatisch zur **Wohnungsübersicht** zurück, statt zur ersten Wohnung zu springen (zirkuläre Navigation).

## Implementierung

**Datei:** `/src/views/apartments/ApartmentFlushing.vue`

**Funktion:** `handleNavigationAfterFlush()`

### Vorher (Zirkuläre Navigation)

```javascript
const handleNavigationAfterFlush = async () => {
  if (autoNavigate.value && nextApartment.value) {
    // Springt IMMER zum nächsten Apartment
    // Bei letzter Wohnung → springt zur ERSTEN Wohnung (zirkulär)
    setTimeout(() => {
      goToNextApartment()
    }, autoNavigateDelay.value)
  }
}
```

### Nachher (Intelligente Navigation)

```javascript
const handleNavigationAfterFlush = async () => {
  if (autoNavigate.value && nextApartment.value) {
    // Sortiere Apartments wie in der Übersicht
    const sortedApartments = [...allApartments.value].sort((a, b) => {
      const sortA = a.sorted || 0
      const sortB = b.sorted || 0
      if (sortA !== sortB) {
        return sortA - sortB
      }
      return (a.number || '').localeCompare(b.number || '')
    })
    
    // Prüfe ob aktuelles Apartment das LETZTE ist
    const currentIndex = sortedApartments.findIndex(apt => apt.id === currentApartment.value.id)
    const isLastApartment = currentIndex === sortedApartments.length - 1
    
    if (isLastApartment) {
      // ✅ Letzte Wohnung → Zurück zur Übersicht
      console.log('🏁 Letztes Apartment erreicht - Springe zur Übersicht zurück')
      setTimeout(() => {
        goBack()
      }, autoNavigateDelay.value)
    } else {
      // ✅ Nicht letzte Wohnung → Weiter zur nächsten
      console.log(`🚀 Navigiere zum nächsten Apartment:`, nextApartment.value.number)
      setTimeout(() => {
        goToNextApartment()
      }, autoNavigateDelay.value)
    }
  }
}
```

## Verhalten

### Szenario 1: Wohnungen 1-5 (5 ist letzte)

**Auto-Navigation aktiv:**
1. Wohnung 1 → Spülung abgeschlossen → **Springt zu Wohnung 2**
2. Wohnung 2 → Spülung abgeschlossen → **Springt zu Wohnung 3**
3. Wohnung 3 → Spülung abgeschlossen → **Springt zu Wohnung 4**
4. Wohnung 4 → Spülung abgeschlossen → **Springt zu Wohnung 5**
5. **Wohnung 5** → Spülung abgeschlossen → **✅ Springt zur Übersicht** (nicht zu Wohnung 1!)

### Szenario 2: Auto-Navigation deaktiviert

- Keine automatische Navigation
- Benutzer bleibt auf aktueller Wohnungsseite
- Manuelle Navigation möglich

## Console-Logs

### Bei letzter Wohnung:
```
🔍 Prüfe Auto-Navigation: { autoNavigate: true, hasNextApartment: true, ... }
🏁 Letztes Apartment erreicht - Springe zur Übersicht zurück
🔙 Führe Navigation zur Übersicht aus
```

### Bei nicht-letzter Wohnung:
```
🔍 Prüfe Auto-Navigation: { autoNavigate: true, hasNextApartment: true, ... }
🚀 Auto-Navigation aktiviert - Navigiere in 2000ms zum nächsten Apartment: 12B
⏭️ Führe Navigation aus zu Apartment: 12B
```

## Vorteile

✅ **Bessere Benutzererfahrung**: Kein unerwartetes Springen zur ersten Wohnung
✅ **Klarer Arbeitsablauf**: Nach allen Wohnungen zurück zur Übersicht
✅ **Logische Navigation**: Ende des Durchlaufs ist eindeutig
✅ **Flexibilität**: Auto-Navigation kann weiterhin aktiviert/deaktiviert werden

## Betroffene Komponenten

- `ApartmentFlushing.vue` - Haupt-Spülseite

## Testing

### Test-Schritte:

1. ✅ Aktiviere Auto-Navigation (Toggle)
2. ✅ Starte Spülung bei **nicht-letzter** Wohnung
3. ✅ Warte bis Spülung abgeschlossen
4. ✅ **Erwartung:** App springt zur nächsten Wohnung

5. ✅ Navigiere zur **letzten** Wohnung in der Liste
6. ✅ Starte Spülung
7. ✅ Warte bis Spülung abgeschlossen
8. ✅ **Erwartung:** App springt zur **Wohnungsübersicht** zurück

### Erwartete Console-Logs:

Bei letzter Wohnung:
```
🏁 Letztes Apartment erreicht - Springe zur Übersicht zurück
🔙 Führe Navigation zur Übersicht aus
```

## Sortierung

Die Prüfung verwendet die **gleiche Sortierung** wie die `nextApartment` computed property:

1. **Primär:** `sorted` Feld (aufsteigend)
2. **Sekundär:** Wohnungsnummer (alphabetisch)

Dies stellt sicher, dass die Reihenfolge konsistent mit der Anzeige in der Übersicht ist.

---

**Status:** ✅ **Implementiert und bereit zum Testen**

Die Auto-Navigation springt jetzt zur Übersicht zurück, wenn die letzte Wohnung abgeschlossen ist! 🎉

