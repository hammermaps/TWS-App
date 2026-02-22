# Automatische Aktualisierung der Wohnungs-Übersicht nach Spülung

## Problem
Nach einer erfolgreichen Spülung im FlushingManager wurde die Wohnungs-Übersicht (BuildingApartments.vue) nicht automatisch aktualisiert. Der Benutzer musste die Seite manuell neu laden, um die aktualisierten Spül-Daten zu sehen.

## Ursache
Das Event-System war bereits implementiert, aber:
1. Das Event wurde möglicherweise in einem Try-Catch-Block unterdrückt
2. Es gab nicht genug Logging, um Probleme zu diagnostizieren
3. Die Event-Dispatch-Logik war nicht robust genug

## Lösung

### 1. Verbessertes Event-Dispatching in ApartmentStorage.js

**Datei:** `/src/stores/ApartmentStorage.js`

**Änderungen:**
- Event-Dispatching wurde aus dem Try-Catch-Block herausgenommen
- Event wird **immer** dispatched, auch wenn die Synchronisation von globalApartments fehlschlägt
- Ausführliches Logging wurde hinzugefügt
- Building-ID wird explizit als String konvertiert

```javascript
// Dispatch a DOM event for other listeners (components) within the same window
// WICHTIG: Dieses Event wird immer dispatched, auch bei Fehlern oben
try {
  console.log('📢 Dispatching wls_apartment_updated event for apartment', apartment.id, 'in building', buildingId)
  window.dispatchEvent(new CustomEvent('wls_apartment_updated', { 
    detail: { 
      buildingId: String(buildingId), 
      apartment: apartment 
    } 
  }))
  console.log('✅ Event wls_apartment_updated erfolgreich dispatched')
} catch (e) {
  console.error('❌ Fehler beim Dispatchen des wls_apartment_updated Events:', e)
}
```

### 2. Verbessertes Event-Handling in BuildingApartments.vue

**Datei:** `/src/views/buildings/BuildingApartments.vue`

**Änderungen:**
- Ausführliches Logging beim Empfangen des Events
- Detaillierte Debug-Ausgaben für Troubleshooting
- Bessere Fehlerbehandlung

```javascript
const apartmentUpdatedHandler = (e) => {
  try {
    console.log('🔔 wls_apartment_updated Event empfangen:', e.detail)
    const detail = e?.detail || {}
    const updatedBuildingId = detail.buildingId
    const updatedApartment = detail.apartment
    
    console.log('🔍 Event Details - Building ID:', updatedBuildingId, 'Current Building ID:', buildingId.value)
    
    if (!updatedApartment) {
      console.warn('⚠️ Kein Apartment im Event-Detail gefunden')
      return
    }

    if (String(updatedBuildingId) !== String(buildingId.value)) {
      console.log('⏭️ Event ignoriert - anderes Gebäude')
      return
    }

    console.log('✅ Event ist für aktuelles Gebäude - aktualisiere Apartment:', updatedApartment.number)

    // Update apartments reactive ref
    const idx = apartments.value.findIndex(a => a.id === updatedApartment.id)
    if (idx >= 0) {
      apartments.value.splice(idx, 1, updatedApartment)
      console.log('✅ Apartment-Update angewendet')
    } else {
      apartments.value.push(updatedApartment)
      console.log('✅ Neues Apartment hinzugefügt')
    }

    // Refresh cache timestamp
    const cacheKey = `apartments_${buildingId.value}_timestamp`
    localStorage.setItem(cacheKey, Date.now().toString())
    calculateCacheAge()
  } catch (err) {
    console.error('❌ Fehler beim Verarbeiten des Events:', err)
  }
}

console.log('📡 Registriere Event-Listener für wls_apartment_updated')
window.addEventListener('wls_apartment_updated', apartmentUpdatedHandler)
```

### 3. Verbessertes Logging im FlushingManager

**Datei:** `/src/views/apartments/FlushingManager.vue`

**Änderungen:**
- Async/Await für updateApartment, um Erfolg zu verifizieren
- Detailliertes Logging beim Update
- Fehlerbehandlung mit spezifischen Meldungen

```javascript
console.log('📢 Aktualisiere ApartmentStorage nach Spülung für Apartment:', updatedApt.number, 'Building:', updatedApt.building_id)
try {
  const success = await apartmentStorage.updateApartment(updatedApt.building_id, updatedApt)
  if (success) {
    console.log('✅ ApartmentStorage erfolgreich aktualisiert - Event sollte dispatched sein')
  } else {
    console.warn('⚠️ ApartmentStorage-Update fehlgeschlagen')
  }
} catch (e) {
  console.error('❌ Fehler beim Aktualisieren des ApartmentStorage nach Spülung:', e)
}
```

### 4. Verbessertes updateApartment im Composable

**Datei:** `/src/stores/ApartmentStorage.js`

**Änderungen:**
- Ausführliches Logging im updateApartment
- Success-Verifizierung
- Bessere Fehlerbehandlung

```javascript
const updateApartment = async (buildingId, apartment) => {
  console.log('🔄 updateApartment aufgerufen für Building:', buildingId, 'Apartment:', apartment.id)
  const success = await storageManager.addOrUpdateApartment(buildingId, apartment)
  if (success) {
    console.log('✅ updateApartment erfolgreich - globalApartments wird aktualisiert')
    // Aktualisiere die reactive Liste
    const index = globalApartments.value.findIndex(apt => apt.id === apartment.id)
    if (index >= 0) {
      globalApartments.value[index] = apartment
      console.log('✅ Apartment in globalApartments aktualisiert (Index:', index, ')')
    } else {
      globalApartments.value.push(apartment)
      console.log('✅ Apartment zu globalApartments hinzugefügt')
    }
  } else {
    console.error('❌ updateApartment fehlgeschlagen')
  }
  return success
}
```

## Event-Flow

```
1. FlushingManager.vue
   └─> Spülung abgeschlossen
       └─> apartmentStorage.updateApartment(buildingId, updatedApartment) aufrufen
           └─> ApartmentStorage.js: updateApartment()
               └─> storageManager.addOrUpdateApartment()
                   ├─> Speichere in IndexedDB
                   ├─> Aktualisiere globalApartments (reactive)
                   └─> Dispatch Event: window.dispatchEvent('wls_apartment_updated', {...})
                       
2. BuildingApartments.vue
   └─> Event-Listener registriert beim onMounted
       └─> Event empfangen: 'wls_apartment_updated'
           ├─> Prüfe Building-ID
           ├─> Aktualisiere apartments.value (reactive)
           └─> UI wird automatisch aktualisiert (Vue Reactivity)
```

## Debugging

Um das Event-System zu debuggen, können folgende Console-Logs überprüft werden:

### Bei Spülung:
```
📢 Aktualisiere ApartmentStorage nach Spülung für Apartment: [Nummer] Building: [ID]
🔄 updateApartment aufgerufen für Building: [ID] Apartment: [ID]
📢 Dispatching wls_apartment_updated event for apartment [ID] in building [ID]
✅ Event wls_apartment_updated erfolgreich dispatched
✅ updateApartment erfolgreich - globalApartments wird aktualisiert
```

### In BuildingApartments.vue:
```
📡 Registriere Event-Listener für wls_apartment_updated
🔔 wls_apartment_updated Event empfangen: {buildingId: "...", apartment: {...}}
🔍 Event Details - Building ID: [ID] Current Building ID: [ID]
✅ Event ist für aktuelles Gebäude - aktualisiere Apartment: [Nummer]
✅ Apartment-Update angewendet in Übersicht: [Nummer]
✅ Cache-Timestamp aktualisiert
```

## Testing

### Testschritte:
1. Öffne BuildingApartments.vue für ein Gebäude
2. Öffne in einem zweiten Tab/Fenster den FlushingManager
3. Führe eine Spülung durch
4. Beobachte die Console-Logs
5. Wechsle zurück zu BuildingApartments.vue
6. Die Spül-Daten sollten automatisch aktualisiert sein (ohne Reload)

### Erwartetes Verhalten:
- ✅ Event wird dispatched (siehe Console)
- ✅ Event wird empfangen (siehe Console)
- ✅ Apartment-Daten werden aktualisiert
- ✅ UI zeigt neue last_flush_date und next_flush_due
- ✅ Cache-Timestamp wird aktualisiert
- ✅ Spül-Status-Badge zeigt korrekten Status (grün für frisch gespült)

## Fallback

Falls das Event-System nicht funktioniert:
- BuildingApartments.vue lädt Daten automatisch beim Tab-Wechsel (focus event)
- BuildingApartments.vue lädt Daten automatisch, wenn Seite sichtbar wird (visibilitychange)
- BuildingApartments.vue hat einen manuellen Refresh-Button

## Technische Details

- **Event-Name:** `wls_apartment_updated`
- **Event-Typ:** CustomEvent
- **Event-Detail:**
  ```javascript
  {
    buildingId: String,
    apartment: Object
  }
  ```
- **Scope:** window (global)
- **Cleanup:** Event-Listener wird bei onBeforeUnmount entfernt

## Vorteile dieser Lösung

1. ✅ **Echtzeit-Updates:** UI aktualisiert sich sofort nach Spülung
2. ✅ **Kein Polling:** Keine unnötigen API-Requests
3. ✅ **Offline-fähig:** Funktioniert auch im Offline-Modus
4. ✅ **Robust:** Ausführliches Logging für Debugging
5. ✅ **Maintainable:** Klare Event-Struktur und Dokumentation
6. ✅ **Performance:** Nur betroffene Apartments werden aktualisiert

