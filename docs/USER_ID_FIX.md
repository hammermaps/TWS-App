# Fix: "Keine User-ID gefunden" bei Spülungseintrag

## Problem

Beim Erstellen einer neuen Spülung erschien die Fehlermeldung:
```
Fehler: Keine User-ID gefunden. Bitte einloggen.
```

Obwohl der Benutzer eingeloggt war.

## Ursache

### Root Cause
Nach der Migration von **localStorage** zu **IndexedDB** wurde die `getCurrentUser()` Funktion **async**, aber an mehreren Stellen wurde sie **ohne await** aufgerufen.

### Betroffene Stellen

1. **ApiApartment.js** - `createFlushRecord()` Funktion
   - `getCurrentUser()` ohne await
   - Fallback verwendete localStorage statt IndexedDB

2. **ApartmentFlushHistory.vue** - `loadUserName()` Funktion
   - `getCurrentUser()` ohne await
   - Fallback verwendete localStorage statt IndexedDB

## Implementierte Lösungen

### Fix 1: ApiApartment.js - User-ID Laden korrigiert

**Datei:** `/src/api/ApiApartment.js`

**Änderungen:**
1. ✅ IndexedDB-Imports hinzugefügt
2. ✅ `getCurrentUser()` mit await aufgerufen
3. ✅ localStorage-Fallback durch IndexedDB ersetzt

**Vorher - FALSCH:**
```javascript
try {
    const { getCurrentUser } = await import('../stores/GlobalUser.js')
    const currentUser = getCurrentUser()  // ❌ Kein await - gibt Promise zurück!
    if (currentUser && currentUser.id) {
        currentUserId = currentUser.id
    }
} catch (error) {
    console.warn('⚠️ Konnte User nicht aus GlobalUser laden:', error)
}

// Fallback: Prüfe LocalStorage direkt
if (!currentUserId) {
    const userDataStr = localStorage.getItem('wls_current_user')  // ❌ localStorage existiert nicht mehr
    if (userDataStr) {
        const userData = JSON.parse(userDataStr)
        currentUserId = userData.id
    }
}

if (!currentUserId) {
    throw new Error('Keine User-ID gefunden. Bitte einloggen.')  // ❌ Fehler!
}
```

**Nachher - RICHTIG:**
```javascript
try {
    const { getCurrentUser } = await import('../stores/GlobalUser.js')
    const currentUser = await getCurrentUser()  // ✅ await hinzugefügt!
    if (currentUser && currentUser.id) {
        currentUserId = currentUser.id
        console.log('✅ User-ID aus GlobalUser Store:', currentUserId)
    }
} catch (error) {
    console.warn('⚠️ Konnte User nicht aus GlobalUser laden:', error)
}

// Fallback: Prüfe IndexedDB direkt
if (!currentUserId) {
    try {
        const userResult = await indexedDBHelper.get(STORES.USER, 'wls_current_user')  // ✅ IndexedDB
        if (userResult && userResult.value && userResult.value.id) {
            currentUserId = userResult.value.id
            console.log('✅ User-ID aus IndexedDB:', currentUserId)
        }
    } catch (error) {
        console.warn('⚠️ Konnte User nicht aus IndexedDB laden:', error)
    }
}

if (!currentUserId) {
    console.error('❌ Keine User-ID gefunden - weder in GlobalUser noch in IndexedDB')
    throw new Error('Keine User-ID gefunden. Bitte einloggen.')
}
```

**Imports hinzugefügt:**
```javascript
import indexedDBHelper, { STORES } from '../utils/IndexedDBHelper.js'
```

### Fix 2: ApartmentFlushHistory.vue - User-Name Laden korrigiert

**Datei:** `/src/views/apartments/ApartmentFlushHistory.vue`

**Änderungen:**
1. ✅ IndexedDB-Imports hinzugefügt
2. ✅ `getCurrentUser()` mit await aufgerufen
3. ✅ localStorage-Fallback durch IndexedDB ersetzt

**Vorher - FALSCH:**
```javascript
// 2. Versuche den aktuellen Benutzer aus GlobalUser zu laden
const currentUser = getCurrentUser()  // ❌ Kein await
if (currentUser && currentUser.id === userId && currentUser.name) {
    userCache.value.set(userId, currentUser.name)
    return currentUser.name
}

// 3. Fallback: LocalStorage
const userDataStr = localStorage.getItem('wls_current_user')  // ❌ Existiert nicht
if (userDataStr) {
    const userData = JSON.parse(userDataStr)
    if (userData.id === userId && userData.name) {
        return userData.name
    }
}
```

**Nachher - RICHTIG:**
```javascript
// 2. Versuche den aktuellen Benutzer aus GlobalUser zu laden
const currentUser = await getCurrentUser()  // ✅ await hinzugefügt
if (currentUser && currentUser.id === userId && currentUser.name) {
    userCache.value.set(userId, currentUser.name)
    userNames.value.set(userId, currentUser.name)
    return currentUser.name
}

// 3. Fallback: IndexedDB
try {
    const userResult = await indexedDBHelper.get(STORES.USER, 'wls_current_user')  // ✅ IndexedDB
    if (userResult && userResult.value && userResult.value.id === userId && userResult.value.name) {
        userCache.value.set(userId, userResult.value.name)
        userNames.value.set(userId, userResult.value.name)
        return userResult.value.name
    }
} catch (error) {
    console.warn('⚠️ Fehler beim Laden aus IndexedDB:', error)
}
```

**Imports hinzugefügt:**
```javascript
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'
```

## Technische Details

### GlobalUser.js - getCurrentUser() Funktion

```javascript
// Aktuellen User abrufen (mit IndexedDB-Fallback)
const getCurrentUser = async () => {  // ← async Funktion!
  // Wenn kein User im Memory, versuche aus IndexedDB zu laden
  if (!currentUser.value) {
    try {
      const result = await indexedDBHelper.get(STORES.USER, USER_KEY)
      if (result && result.value) {
        currentUser.value = new UserItem(result.value)
        console.log('📦 User aus IndexedDB geladen:', currentUser.value.id)
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Users aus IndexedDB:', error)
    }
  }
  return currentUser.value
}
```

**Wichtig:** Diese Funktion ist **async** und **muss** mit await aufgerufen werden!

### User-Speicherung in IndexedDB

**Struktur:**
```javascript
{
  key: 'wls_current_user',
  value: {
    id: 5,
    username: 'masterbee',
    name: 'Master Bee',
    email: 'master@example.com',
    role: 'admin',
    enabled: true,
    // ... weitere Felder
  }
}
```

**Store:** `STORES.USER` (IndexedDB)

## Flow-Diagramm

### Vorher (FALSCH):
```
createFlushRecord()
  ↓
getCurrentUser() (ohne await)
  ↓
Promise<User> (nicht aufgelöst!)
  ↓
currentUser ist Promise, nicht User
  ↓
currentUser.id ist undefined
  ↓
❌ Fehler: "Keine User-ID gefunden"
```

### Nachher (RICHTIG):
```
createFlushRecord()
  ↓
await getCurrentUser()
  ↓
User-Objekt aus IndexedDB geladen
  ↓
currentUser ist User-Objekt
  ↓
currentUser.id = 5
  ↓
✅ Spülung wird erstellt
```

## Testing

### Test-Schritte:

1. ✅ Einloggen als Benutzer
2. ✅ Zu Apartment-Spülseite navigieren
3. ✅ Spülung starten und durchführen
4. ✅ Spülung abschließen
5. ✅ Prüfen: Keine "Keine User-ID gefunden" Fehler

### Erwartetes Vergebnis:

**Console-Logs bei erfolgreicher Spülung:**
```
✅ User-ID aus GlobalUser Store: 5
📤 Erstelle Spül-Record: {apartment_id: 42, building_id: 1, user_id: 5, ...}
✅ Spülung erfolgreich erstellt
```

**Keine Fehlermeldungen!**

### Fallback-Test:

Wenn GlobalUser.getCurrentUser() fehlschlägt:
```
⚠️ Konnte User nicht aus GlobalUser laden: [Error]
✅ User-ID aus IndexedDB: 5
📤 Erstelle Spül-Record: {...}
```

## Zusammenfassung der Änderungen

### Geänderte Dateien:

1. ✅ `/src/api/ApiApartment.js`
   - IndexedDB-Import hinzugefügt
   - `getCurrentUser()` mit await
   - IndexedDB-Fallback statt localStorage

2. ✅ `/src/views/apartments/ApartmentFlushHistory.vue`
   - IndexedDB-Import hinzugefügt
   - `getCurrentUser()` mit await
   - IndexedDB-Fallback statt localStorage

3. ✅ `/docs/USER_ID_FIX.md`
   - Diese Dokumentation

### Pattern-Fehler behoben:

```javascript
// ❌ FALSCH
const user = getCurrentUser()  // Promise!
user.id  // undefined

// ✅ RICHTIG
const user = await getCurrentUser()  // User-Objekt
user.id  // 5
```

## Best Practices

### 1. Immer await bei async-Funktionen:
```javascript
const result = await asyncFunction()
```

### 2. IndexedDB statt localStorage:
```javascript
// ❌ Alt
const data = localStorage.getItem('key')

// ✅ Neu
const result = await indexedDBHelper.get(STORES.USER, 'key')
const data = result?.value
```

### 3. Mehrere Fallback-Ebenen:
```javascript
// 1. Primär: GlobalUser Store
const user = await getCurrentUser()

// 2. Fallback: IndexedDB direkt
if (!user) {
    const result = await indexedDBHelper.get(STORES.USER, 'key')
    user = result?.value
}

// 3. Error handling
if (!user) {
    throw new Error('User nicht gefunden')
}
```

## Verwandte Fixes

Dieser Fix ist Teil einer Serie von localStorage → IndexedDB Migrationen:

| Fix # | Problem | Datei | Status |
|-------|---------|-------|--------|
| 1 | apartments.find TypeError | Mehrere | ✅ Behoben |
| 2 | flushes.sort TypeError | ApartmentFlushing.vue | ✅ Behoben |
| 3 | IndexedDB Boolean-Query | IndexedDBHelper.js | ✅ Behoben |
| 4 | **Keine User-ID gefunden** | **ApiApartment.js** | ✅ **Behoben** |

**Root Cause aller Fixes:** Migration localStorage → IndexedDB machte Funktionen async, aber nicht alle Aufrufe wurden mit await aktualisiert.

---

**Status:** ✅ **VOLLSTÄNDIG BEHOBEN**

Das Problem "Keine User-ID gefunden" beim Erstellen einer Spülung ist jetzt behoben. Die User-ID wird korrekt aus IndexedDB geladen! 🎉

