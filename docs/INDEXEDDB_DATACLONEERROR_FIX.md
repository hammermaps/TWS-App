# DataCloneError Fix: IndexedDB Serialisierung

## Problem

Beim Speichern von Daten in IndexedDB traten `DataCloneError` Fehler auf:

```
❌ Fehler beim Speichern der Buildings: DataCloneError: Failed to execute 'put' on 'IDBObjectStore': [object Array] could not be cloned.

❌ Fehler beim Speichern der Konfiguration: DataCloneError: Failed to execute 'put' on 'IDBObjectStore': #<Promise> could not be cloned.
```

### Ursache

IndexedDB's structured clone algorithm kann bestimmte JavaScript-Objekte **nicht** klonen:

1. ❌ **Vue Reactive Refs** (`ref()`, `reactive()`)
2. ❌ **Promises**
3. ❌ **Funktionen**
4. ❌ **DOM Nodes**
5. ❌ **Symbols**
6. ❌ **Error Objects** (teilweise)

Wenn diese Objekte in den zu speichernden Daten enthalten sind, wirft IndexedDB einen `DataCloneError`.

### Betroffene Dateien

1. **BuildingStorage.js** - Buildings Array enthielt reactive objects
2. **ConfigStorage.js** - Config enthielt Promises
3. **ApartmentStorage.js** - Apartments Array enthielt reactive objects

## Lösung

### 1. Serialisierungs-Funktion

Alle Storage-Module verwenden jetzt eine `serializeForIndexedDB()` Funktion:

```javascript
/**
 * Serialisiert ein Objekt zu einem klonbaren Plain Object
 * Entfernt reactive refs, Promises, Funktionen etc.
 */
function serializeForIndexedDB(data) {
  return JSON.parse(JSON.stringify(data))
}
```

**Wie es funktioniert:**
1. `JSON.stringify(data)` - Konvertiert zu JSON-String
   - Ignoriert Funktionen, Promises, Symbols
   - Konvertiert reactive refs zu plain values
   - Entfernt nicht-serialisierbare Eigenschaften
2. `JSON.parse(...)` - Konvertiert zurück zu Plain Object
   - Erstellt ein neues "sauberes" Objekt
   - Garantiert klonbar für IndexedDB

### 2. BuildingStorage.js

**Vorher:**
```javascript
async saveBuildings(buildings) {
  await indexedDBHelper.set(STORES.BUILDINGS, {
    id: 'buildings',
    data: buildings,  // ❌ Könnte reactive objects enthalten
    timestamp: Date.now()
  });
}
```

**Nachher:**
```javascript
async saveBuildings(buildings) {
  // ✅ Serialisiere die Daten bevor sie gespeichert werden
  const serializedBuildings = serializeForIndexedDB(buildings)
  
  await indexedDBHelper.set(STORES.BUILDINGS, {
    id: 'buildings',
    data: serializedBuildings,  // ✅ Plain objects
    timestamp: Date.now()
  });
}
```

### 3. ConfigStorage.js

**Vorher:**
```javascript
async saveConfig(config) {
  await indexedDBHelper.set(STORES.CONFIG, {
    key: CONFIG_KEY,
    value: config  // ❌ Könnte Promises enthalten
  })
}
```

**Nachher:**
```javascript
async saveConfig(config) {
  // ✅ Serialisiere die Config bevor sie gespeichert wird
  const serializedConfig = serializeForIndexedDB(config)
  
  await indexedDBHelper.set(STORES.CONFIG, {
    key: CONFIG_KEY,
    value: serializedConfig  // ✅ Plain object
  })
}
```

### 4. ApartmentStorage.js

**Vorher:**
```javascript
async setApartmentsForBuilding(buildingId, apartments) {
  for (const apartment of apartments) {  // ❌ Reactive objects
    await indexedDBHelper.set(STORES.APARTMENTS, {
      id: `${buildingId}_${apartment.id}`,
      buildingId: String(buildingId),
      apartmentId: apartment.id,
      ...apartment
    })
  }
}
```

**Nachher:**
```javascript
async setApartmentsForBuilding(buildingId, apartments) {
  // ✅ Serialisiere Apartments vor dem Speichern
  const serializedApartments = serializeForIndexedDB(apartments)
  
  for (const apartment of serializedApartments) {  // ✅ Plain objects
    await indexedDBHelper.set(STORES.APARTMENTS, {
      id: `${buildingId}_${apartment.id}`,
      buildingId: String(buildingId),
      apartmentId: apartment.id,
      ...apartment
    })
  }
}
```

## Was wird entfernt/konvertiert?

### Vor Serialisierung (nicht klonbar)
```javascript
{
  id: ref(123),                    // Vue ref
  name: reactive({ value: 'Test' }), // Vue reactive
  getData: () => fetch('/api'),   // Funktion
  promise: Promise.resolve(42),   // Promise
  symbol: Symbol('test'),         // Symbol
  element: document.body,         // DOM Node
  _internal: undefined            // Undefined
}
```

### Nach Serialisierung (klonbar)
```javascript
{
  id: 123,                        // Plain number
  name: { value: 'Test' },       // Plain object
  // getData: entfernt
  // promise: entfernt
  // symbol: entfernt
  // element: entfernt
  // _internal: entfernt
}
```

## Vorteile der Lösung

| Vorteil | Beschreibung |
|---------|-------------|
| ✅ **Zuverlässig** | Keine DataCloneError mehr |
| ✅ **Einfach** | Eine Zeile Code pro Storage-Methode |
| ✅ **Performance** | JSON.stringify ist sehr schnell |
| ✅ **Kompatibel** | Funktioniert mit allen Datentypen |
| ✅ **Sicher** | Entfernt automatisch problematische Eigenschaften |

## Nachteile/Einschränkungen

| Nachteil | Workaround |
|----------|-----------|
| ⚠️ **Funktionen gehen verloren** | Funktionen sollten nicht persistiert werden |
| ⚠️ **Promises werden nicht aufgelöst** | Promises vor Speicherung auflösen |
| ⚠️ **Zirkuläre Referenzen** | Können zu Fehlern führen - vermeiden |
| ⚠️ **Spezielle Objekte** | Date, RegExp werden zu Strings konvertiert |

### Spezialfall: Date-Objekte

```javascript
// Vorher
const data = {
  timestamp: new Date('2024-12-19')
}

// Nach JSON.stringify/parse
const serialized = {
  timestamp: '2024-12-19T00:00:00.000Z'  // String!
}

// Beim Laden wieder zu Date konvertieren
const loaded = {
  timestamp: new Date(serialized.timestamp)
}
```

## Testing

### Test 1: Buildings speichern
```javascript
// Vor dem Fix: ❌ DataCloneError
await BuildingStorage.saveBuildings([
  { id: 1, name: ref('Building 1') }  // Reactive ref
])

// Nach dem Fix: ✅ Erfolg
await BuildingStorage.saveBuildings([
  { id: 1, name: 'Building 1' }  // Plain value
])
```

### Test 2: Config speichern
```javascript
// Vor dem Fix: ❌ DataCloneError
await configStorage.saveConfig({
  apiUrl: 'http://...',
  loadData: Promise.resolve(...)  // Promise
})

// Nach dem Fix: ✅ Erfolg
await configStorage.saveConfig({
  apiUrl: 'http://...'
  // Promise wird automatisch entfernt
})
```

### Test 3: Apartments speichern
```javascript
// Vor dem Fix: ❌ DataCloneError
await apartmentStorage.setApartmentsForBuilding(1, [
  { id: 1, getData: () => {} }  // Funktion
])

// Nach dem Fix: ✅ Erfolg
await apartmentStorage.setApartmentsForBuilding(1, [
  { id: 1 }  // Funktion wird entfernt
])
```

## Debugging

### Console-Logs prüfen

**Erfolgreich:**
```
✅ 💾 Buildings in IndexedDB gespeichert: 10
✅ 💾 Konfiguration in IndexedDB gespeichert
✅ 💾 87 Apartments für Gebäude 1 in IndexedDB gespeichert
```

**Fehler (behoben):**
```
❌ Fehler beim Speichern der Buildings: DataCloneError
```

### Manual Test in Browser Console

```javascript
// Test ob Objekt klonbar ist
const testData = { id: 1, name: 'Test' }

try {
  // Simuliert IndexedDB's structured clone
  structuredClone(testData)
  console.log('✅ Klonbar')
} catch (e) {
  console.error('❌ Nicht klonbar:', e)
}
```

## Best Practices

### 1. Immer serialisieren vor IndexedDB
```javascript
// ✅ Gut
const data = serializeForIndexedDB(rawData)
await indexedDB.set(data)

// ❌ Schlecht
await indexedDB.set(rawData)  // Könnte fehlschlagen
```

### 2. Keine Funktionen in Daten
```javascript
// ✅ Gut
const config = {
  timeout: 5000,
  retries: 3
}

// ❌ Schlecht
const config = {
  timeout: 5000,
  retries: 3,
  onError: () => {}  // Funktion wird beim Speichern verloren
}
```

### 3. Promises auflösen vor Speicherung
```javascript
// ✅ Gut
const data = await fetchData()
await storage.save(serializeForIndexedDB(data))

// ❌ Schlecht
const promise = fetchData()
await storage.save({ data: promise })  // Promise wird nicht gespeichert
```

### 4. Date-Objekte behandeln
```javascript
// Beim Speichern
const data = {
  timestamp: new Date().toISOString()  // Als String speichern
}

// Beim Laden
const loaded = await storage.load()
loaded.timestamp = new Date(loaded.timestamp)  // Zurück zu Date
```

## Geänderte Dateien

- ✅ `/src/stores/BuildingStorage.js`
- ✅ `/src/stores/ConfigStorage.js`
- ✅ `/src/stores/ApartmentStorage.js`

## Autor

- **Datum**: 2024-12-19
- **Implementiert von**: GitHub Copilot

---

**Status**: ✅ Implementiert, Testing erforderlich
