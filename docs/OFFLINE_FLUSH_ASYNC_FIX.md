# Fix: flushes.sort TypeError behoben

## Problem

```
Fehler: flushes.sort is not a function
```

## Ursache

Die Funktion `getOfflineFlushesForApartment()` in `OfflineFlushStorage.js` ist **async**, wurde aber in `ApartmentFlushing.vue` **ohne await** aufgerufen. Dadurch war `flushes` ein Promise statt ein Array.

**Betroffener Code:**
```javascript
// In ApartmentFlushing.vue - FALSCH
const loadOfflineFlushes = () => {
  const flushes = offlineStorage.getOfflineFlushesForApartment(apartmentId.value)  // ❌ Kein await!
  offlineFlushes.value = flushes.sort(...)  // ❌ TypeError: flushes ist ein Promise!
}
```

## Lösung

### Fix 1: loadOfflineFlushes zu async machen

**Datei:** `/src/views/apartments/ApartmentFlushing.vue`

**Vorher - FALSCH:**
```javascript
const loadOfflineFlushes = () => {
  const flushes = offlineStorage.getOfflineFlushesForApartment(apartmentId.value)
  offlineFlushes.value = flushes.sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
  console.log('📱 Offline-Spülungen geladen:', flushes.length)
}
```

**Nachher - RICHTIG:**
```javascript
const loadOfflineFlushes = async () => {
  try {
    const flushes = await offlineStorage.getOfflineFlushesForApartment(apartmentId.value)
    
    // Sicherstellen, dass flushes ein Array ist
    if (!Array.isArray(flushes)) {
      console.warn('⚠️ flushes ist kein Array:', typeof flushes)
      offlineFlushes.value = []
      return
    }
    
    offlineFlushes.value = flushes.sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
    console.log('📱 Offline-Spülungen geladen:', flushes.length)
  } catch (error) {
    console.error('❌ Fehler beim Laden der Offline-Spülungen:', error)
    offlineFlushes.value = []
  }
}
```

**Verbesserungen:**
- ✅ `async` Keyword hinzugefügt
- ✅ `await` für `getOfflineFlushesForApartment()` 
- ✅ Array-Type-Check hinzugefügt
- ✅ Try-Catch Error-Handling
- ✅ Fallback auf leeres Array bei Fehler

### Fix 2: saveOfflineFlush mit await

Weitere async-Funktionen wurden ebenfalls korrigiert:

**Vorher:**
```javascript
const offlineFlush = offlineStorage.saveOfflineFlush(...)  // ❌ Kein await
```

**Nachher:**
```javascript
const offlineFlush = await offlineStorage.saveOfflineFlush(...)  // ✅ Mit await
```

### Fix 3: addOrUpdateApartment mit await

**Vorher:**
```javascript
apartmentStorage.storage.addOrUpdateApartment(...)  // ❌ Kein await
```

**Nachher:**
```javascript
await apartmentStorage.storage.addOrUpdateApartment(...)  // ✅ Mit await
```

## Betroffene Async-Funktionen in OfflineFlushStorage.js

| Funktion | Async? | Wurde korrigiert? |
|----------|--------|-------------------|
| `saveOfflineFlush()` | ✅ Ja | ✅ Ja |
| `getOfflineFlushesForApartment()` | ✅ Ja | ✅ Ja |
| `updateApartmentAfterOfflineFlush()` | ❌ Nein | N/A |

## Pattern erkannt

Dieses Problem trat mehrfach auf:
1. ✅ `getApartmentsForBuilding()` - Bereits behoben
2. ✅ `getAllByIndex()` mit Boolean - Bereits behoben  
3. ✅ `getOfflineFlushesForApartment()` - **Jetzt behoben**
4. ✅ `saveOfflineFlush()` - **Jetzt behoben**
5. ✅ `addOrUpdateApartment()` - **Jetzt behoben**

### Root Cause

**Viele Funktionen wurden von synchron zu async konvertiert** (z.B. localStorage → IndexedDB), aber nicht alle Aufrufe wurden mit `await` aktualisiert.

## Best Practice: Async/Await Checklist

Bei der Migration zu async-Funktionen:

1. ✅ **Funktion definieren**: `async function foo()`
2. ✅ **Alle Aufrufe finden**: Suche nach `foo(`
3. ✅ **Await hinzufügen**: `await foo()`
4. ✅ **Caller async machen**: Wenn nötig, caller auch async machen
5. ✅ **Error-Handling**: Try-Catch hinzufügen
6. ✅ **Type-Checks**: Sicherstellen, dass Rückgabewerte korrekt sind

## Testing

### Test: Offline-Spülungen laden

```javascript
// In ApartmentFlushing.vue Component
// 1. Navigiere zu einer Apartment-Spülseite
// 2. Führe eine Offline-Spülung durch
// 3. Beobachte Console
```

**Erwartetes Ergebnis:**
- ✅ Keine "flushes.sort is not a function" Fehler
- ✅ Console zeigt: `📱 Offline-Spülungen geladen: X`
- ✅ Offline-Spülungen werden korrekt angezeigt
- ✅ Sortierung funktioniert (neueste zuerst)

## Geänderte Dateien

### ✅ `/src/views/apartments/ApartmentFlushing.vue`
**Änderungen:**
1. `loadOfflineFlushes()` → async mit await
2. `saveOfflineFlush()` → mit await
3. `addOrUpdateApartment()` → mit await
4. Array-Type-Checks hinzugefügt
5. Error-Handling verbessert

### 📚 `/docs/OFFLINE_FLUSH_ASYNC_FIX.md`
**Neu:** Diese Dokumentation

## Zusammenhang mit vorherigen Fixes

Dieses Problem ist Teil einer Serie von async/await-Korrekturen:

| Fix | Problem | Status |
|-----|---------|--------|
| 1 | `apartments.find is not a function` | ✅ Behoben |
| 2 | IndexedDB Boolean-Query | ✅ Behoben |
| 3 | `flushes.sort is not a function` | ✅ **Jetzt behoben** |

Alle drei Probleme haben die gleiche Root Cause: **Fehlende await bei async-Funktionen**

## Prävention

Um solche Fehler zu vermeiden:

### 1. ESLint-Regel aktivieren
```javascript
// eslint.config.mjs
{
  rules: {
    'require-await': 'error',
    '@typescript-eslint/no-floating-promises': 'error'
  }
}
```

### 2. TypeScript verwenden
```typescript
async function foo(): Promise<Array<Flush>> {
  // ...
}

// TypeScript würde Fehler anzeigen, wenn await fehlt
const result = foo()  // ❌ Type 'Promise<Array<Flush>>' is not assignable to type 'Array<Flush>'
```

### 3. Code-Review Checklist
- [ ] Alle async-Funktionen mit await aufrufen?
- [ ] Caller-Funktionen auch async?
- [ ] Error-Handling vorhanden?
- [ ] Type-Checks für Rückgabewerte?

---

**Status:** ✅ **Vollständig behoben**

Der "flushes.sort is not a function" Fehler ist behoben. Alle async-Funktionen in OfflineFlushStorage werden jetzt korrekt mit await aufgerufen! 🎉

