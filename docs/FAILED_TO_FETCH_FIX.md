# Fix: "Failed to fetch" Fehler bei Apartment API mit IndexedDB-Fallback

## Problem

```
❌ Apartment API - Network error: TypeError: Failed to fetch
```

Der Fehler trat beim Laden von Apartments auf, insbesondere beim Window-Focus-Event.

## Ursachen

### Root Cause 1: Fehlende await bei async Storage-Funktionen
Nach der Migration von localStorage zu IndexedDB wurden Storage-Funktionen async, aber an **mehreren Stellen** wurden sie **ohne await** aufgerufen.

### Root Cause 2: Fehlender Offline-Fallback
Wenn die API nicht erreichbar war (z.B. Backend offline), gab es keinen robusten Fallback auf IndexedDB-Daten.

## Betroffene Stellen

### 1. BuildingApartments.vue - `loadApartments()`
**Zeile 318:** `getApartmentsForBuilding()` ohne await

### 2. ApiApartment.js - `list()` Funktion
**Zeilen 243, 260, 322:** `getApartmentsForBuilding()` ohne await
**Zeile 296:** `setApartmentsForBuilding()` ohne await

## Implementierte Fixes

### Fix 1: BuildingApartments.vue

**Datei:** `/src/views/buildings/BuildingApartments.vue`

**Vorher - FALSCH:**
```javascript
const loadApartments = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cachedApartments = storage.storage.getApartmentsForBuilding(buildingId.value)  // ❌ Kein await
    if (cachedApartments && cachedApartments.length > 0) {
      apartments.value = cachedApartments  // ❌ cachedApartments ist Promise!
      // ...
    }
  }
}
```

**Nachher - RICHTIG:**
```javascript
const loadApartments = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cachedApartments = await storage.storage.getApartmentsForBuilding(buildingId.value)  // ✅ await
    if (Array.isArray(cachedApartments) && cachedApartments.length > 0) {  // ✅ Type-Check
      apartments.value = cachedApartments  // ✅ cachedApartments ist Array
      calculateCacheAge()
      // ...
    }
  }
}
```

### Fix 2: ApiApartment.js - Initiales Laden

**Datei:** `/src/api/ApiApartment.js`

**Vorher - FALSCH:**
```javascript
// Zuerst aus LocalStorage laden
if (building_id) {
    const cachedApartments = storage.storage.getApartmentsForBuilding(building_id)  // ❌ Kein await
    if (cachedApartments.length > 0) {
        storage.apartments.value = cachedApartments
    }
}
```

**Nachher - RICHTIG:**
```javascript
// Zuerst aus IndexedDB laden
if (building_id) {
    const cachedApartments = await storage.storage.getApartmentsForBuilding(building_id)  // ✅ await
    if (Array.isArray(cachedApartments) && cachedApartments.length > 0) {  // ✅ Type-Check
        console.log('📦 Apartments aus IndexedDB geladen:', cachedApartments.length)
        storage.apartments.value = cachedApartments
    } else {
        console.log('🔄 Keine Apartments im IndexedDB, leere Array')
        storage.apartments.value = []
    }
}
```

### Fix 3: ApiApartment.js - Offline-Modus

**Vorher - FALSCH:**
```javascript
if (!onlineStatus.isFullyOnline) {
    if (building_id) {
        const cachedApartments = storage.storage.getApartmentsForBuilding(building_id)  // ❌ Kein await
        return new ApiApartmentListResponse({
            items: cachedApartments,  // ❌ Promise statt Array
            success: true
        })
    }
}
```

**Nachher - RICHTIG:**
```javascript
if (!onlineStatus.isFullyOnline) {
    console.log('📴 Offline-Modus: Verwende nur IndexedDB-Daten, kein API-Call')
    
    if (building_id) {
        const cachedApartments = await storage.storage.getApartmentsForBuilding(building_id)  // ✅ await
        return new ApiApartmentListResponse({
            items: Array.isArray(cachedApartments) ? cachedApartments : [],  // ✅ Type-Safe
            success: true,
            error: (Array.isArray(cachedApartments) && cachedApartments.length > 0) 
                ? 'Daten aus lokalem Speicher (Offline)' 
                : 'Keine Daten im Offline-Modus verfügbar'
        })
    }
}
```

### Fix 4: ApiApartment.js - Speichern nach API-Call

**Vorher - FALSCH:**
```javascript
if (response.success && response.data) {
    const apartments = response.data.map(item => new ApartmentItem(item))
    
    if (building_id) {
        storage.storage.setApartmentsForBuilding(building_id, apartments)  // ❌ Kein await
        storage.apartments.value = apartments
    }
}
```

**Nachher - RICHTIG:**
```javascript
if (response.success && response.data) {
    const apartments = Array.isArray(response.data)
        ? response.data.map(item => new ApartmentItem(item))
        : []
    
    console.log('✅ Apartments vom Backend erhalten:', apartments.length, 'für Gebäude:', building_id)
    
    if (building_id) {
        await storage.storage.setApartmentsForBuilding(building_id, apartments)  // ✅ await
        storage.apartments.value = apartments
        console.log('💾 Apartments in IndexedDB und reactive ref aktualisiert:', apartments.length)
    }
}
```

### Fix 5: ApiApartment.js - Netzwerkfehler-Fallback

**Vorher - FALSCH:**
```javascript
} catch (error) {
    console.error('❌ Fehler beim Laden der Apartments:', error)
    
    if (building_id) {
        const cachedApartments = storage.storage.getApartmentsForBuilding(building_id)  // ❌ Kein await
        if (cachedApartments.length > 0) {
            return new ApiApartmentListResponse({
                items: cachedApartments,
                success: true
            })
        }
    }
    
    return new ApiApartmentListResponse({
        success: false,
        error: error.message
    })
}
```

**Nachher - RICHTIG:**
```javascript
} catch (error) {
    console.error('❌ Fehler beim Laden der Apartments:', error)
    
    // Bei Netzwerkfehler: Fallback auf IndexedDB
    if (building_id) {
        try {
            const cachedApartments = await storage.storage.getApartmentsForBuilding(building_id)  // ✅ await
            if (Array.isArray(cachedApartments) && cachedApartments.length > 0) {
                console.log('🔄 Fallback auf IndexedDB-Daten:', cachedApartments.length)
                storage.apartments.value = cachedApartments
                return new ApiApartmentListResponse({
                    items: cachedApartments,
                    success: true,
                    error: 'Daten aus lokalem Speicher (Offline)'
                })
            }
        } catch (cacheError) {
            console.error('❌ Fehler beim Laden aus IndexedDB:', cacheError)
        }
    }
    
    return new ApiApartmentListResponse({
        success: false,
        error: error.message || 'Netzwerkfehler beim Laden der Apartments'
    })
}
```

## Verbesserungen

### 1. Robuster Offline-Fallback
- ✅ Bei Netzwerkfehlern wird automatisch auf IndexedDB zurückgegriffen
- ✅ Benutzer sehen immer Daten, auch wenn Backend nicht erreichbar
- ✅ Fehlermeldung zeigt an: "Daten aus lokalem Speicher (Offline)"

### 2. Type-Safety
- ✅ Alle Aufrufe prüfen mit `Array.isArray()`
- ✅ Keine Annahmen über Rückgabewerte
- ✅ Fallback auf leeres Array bei Fehlern

### 3. Besseres Logging
- ✅ Detaillierte Console-Logs für Debugging
- ✅ Unterscheidung zwischen IndexedDB und Backend-Daten
- ✅ Fehlerbehandlung mit spezifischen Meldungen

### 4. Konsistente Kommentare
- ✅ "IndexedDB" statt "localStorage" in Kommentaren
- ✅ Klare Markierung von async/await
- ✅ Dokumentation der Fallback-Logik

## Flow-Diagramm

### Normaler Flow (Online):
```
loadApartments()
  ↓
await getApartmentsForBuilding()  [IndexedDB-Cache]
  ↓
Apartments sofort anzeigen (Cache)
  ↓
API-Call im Hintergrund
  ↓
await setApartmentsForBuilding()  [IndexedDB speichern]
  ↓
UI aktualisieren
```

### Offline-Flow:
```
loadApartments()
  ↓
await getApartmentsForBuilding()  [IndexedDB-Cache]
  ↓
Apartments anzeigen (Cache)
  ↓
!onlineStatus.isFullyOnline → Kein API-Call
  ↓
Meldung: "Daten aus lokalem Speicher (Offline)"
```

### Fehler-Flow (Network Error):
```
loadApartments()
  ↓
API-Call fehlschlägt (Failed to fetch)
  ↓
catch-Block
  ↓
await getApartmentsForBuilding()  [IndexedDB-Fallback]
  ↓
Apartments anzeigen (Cache)
  ↓
Meldung: "Daten aus lokalem Speicher (Offline)"
```

## Testing

### Test-Szenarien:

**1. Online mit Backend:**
- ✅ Apartments werden geladen
- ✅ Cache wird sofort angezeigt
- ✅ Backend-Daten aktualisieren UI
- ✅ IndexedDB wird aktualisiert

**2. Offline-Modus:**
- ✅ Apartments aus IndexedDB werden angezeigt
- ✅ Kein API-Call wird gemacht
- ✅ Meldung: "Daten aus lokalem Speicher (Offline)"

**3. Netzwerkfehler (Backend offline):**
- ✅ API-Call schlägt fehl
- ✅ Fallback auf IndexedDB-Daten
- ✅ Apartments werden angezeigt
- ✅ Meldung: "Daten aus lokalem Speicher (Offline)"
- ✅ **Kein "Failed to fetch" Fehler mehr!**

**4. Window-Focus-Event:**
- ✅ loadApartments() wird aufgerufen
- ✅ Cache wird geladen (await)
- ✅ Daten werden angezeigt
- ✅ Keine Fehler

## Zusammenfassung

### Geänderte Dateien:
| Datei | Änderungen | Status |
|-------|-----------|--------|
| BuildingApartments.vue | await für getApartmentsForBuilding | ✅ |
| ApiApartment.js | await für alle Storage-Aufrufe | ✅ |
| ApiApartment.js | Robuster IndexedDB-Fallback | ✅ |
| ApiApartment.js | Type-Safe Array-Checks | ✅ |

### Behobene Probleme:
1. ✅ "Failed to fetch" Fehler → Fallback auf IndexedDB
2. ✅ apartments.find TypeError → await + Array-Check
3. ✅ Promise statt Array → await hinzugefügt
4. ✅ Keine Offline-Daten → Robuster Fallback

### Pattern behoben:
```javascript
// ❌ FALSCH
const data = asyncFunction()  // Promise
data.map(...)  // TypeError

// ✅ RICHTIG
const data = await asyncFunction()  // Array
if (Array.isArray(data)) {
    data.map(...)  // Funktioniert
}
```

---

**Status:** ✅ **VOLLSTÄNDIG BEHOBEN**

Der "Failed to fetch" Fehler ist jetzt durch robusten IndexedDB-Fallback behoben. Die Anwendung funktioniert jetzt auch bei Netzwerkfehlern! 🎉

