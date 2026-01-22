# Integration Guide - LocalStorage für Apartments

## Übersicht
Dieses System implementiert eine LocalStorage-basierte Datenbank für Apartments, die:
- Sofortige UI-Updates ermöglicht
- Offline-Betrieb vorbereitet
- Automatische Synchronisation mit dem Backend

## Durchgeführte Änderungen

### 1. Neue Datei: `src/stores/ApartmentStorage.js`
- Vollständige LocalStorage-Verwaltung für Apartments
- CRUD-Operationen mit Caching
- Metadaten-Tracking für Synchronisation

### 2. Aktualisiert: `src/api/ApiApartment.js`
- Integration des LocalStorage-Systems
- Alle API-Calls speichern jetzt automatisch in LocalStorage
- Fallback auf Cache-Daten bei Netzwerkfehlern

### 3. Aktualisiert: `src/views/buildings/BuildingApartments.vue`
- Fehler mit `onBeforeRouteEnter` behoben (existiert nicht in Vue Router)
- Automatische Aktualisierung durch Event-Listener
- Lädt Daten aus Cache für sofortige Anzeige

## Noch erforderliche Änderung in ApartmentFlushing.vue

### Zeile 278 ändern von:
```javascript
const { apartment: currentApartment, loading, error, getById: getApartment } = useApiApartment()
```

### Zu:
```javascript
const { apartment: currentApartment, loading, error, getById: getApartment, storage: apartmentStorage } = useApiApartment()
```

### In der stopFlushing-Funktion (nach Zeile 453) hinzufügen:
```javascript
if (result && result.id) {
  console.log('Record erfolgreich erstellt:', result)
  
  // Apartment-Daten neu laden um aktualisierte Spülzeiten zu bekommen
  await getApartment(apartmentId.value)
  
  // Explizit im LocalStorage aktualisieren für sofortige Anzeige in anderen Komponenten
  if (currentApartment.value) {
    apartmentStorage.saveOne(currentApartment.value)
    console.log('Apartment in LocalStorage aktualisiert:', currentApartment.value.id)
  }
}
```

## Funktionsweise

1. **Beim Laden der Apartment-Liste** (BuildingApartments.vue):
   - Daten werden sofort aus LocalStorage geladen (instant UI)
   - Gleichzeitig erfolgt API-Call zum Backend
   - Backend-Daten aktualisieren LocalStorage

2. **Nach Spülbeendigung** (ApartmentFlushing.vue):
   - Record wird im Backend erstellt
   - Apartment-Daten werden neu geladen (enthalten aktualisierte Spülzeiten)
   - LocalStorage wird aktualisiert
   - BuildingApartments.vue erkennt die Änderung und aktualisiert sich

3. **Event-basierte Synchronisation**:
   - Window Focus Events
   - Visibility Change Events
   - LocalStorage Events (über Tabs hinweg)
   - Periodische Updates alle 30 Sekunden

## Offline-Vorbereitung

Das System ist bereits vorbereitet für Offline-Betrieb:
- Alle Apartments werden im LocalStorage gecacht
- Bei Netzwerkfehlern werden Cache-Daten verwendet
- Metadaten tracken letzte Synchronisationszeiten

### Zukünftige Erweiterungen für vollständigen Offline-Betrieb:
1. Service Worker für vollständige Offline-Fähigkeit
2. Sync-Queue für ausstehende Änderungen
3. Conflict-Resolution bei gleichzeitigen Änderungen
4. Background-Sync API Integration

## Verfügbare Storage-Methoden

```javascript
const { storage } = useApiApartment()

// Daten abrufen
storage.getByBuildingId(buildingId)  // Alle Apartments eines Gebäudes
storage.getById(apartmentId)          // Einzelnes Apartment
storage.getAll()                      // Alle gecachten Apartments

// Daten speichern/aktualisieren
storage.saveOne(apartment)            // Einzelnes Apartment speichern
storage.saveMany(apartments)          // Mehrere Apartments speichern
storage.updateOne(id, updates)        // Apartment aktualisieren
storage.replaceForBuilding(buildingId, apartments)  // Alle Apartments eines Gebäudes ersetzen

// Daten löschen
storage.deleteOne(id)                 // Einzelnes Apartment löschen
storage.deleteByBuildingId(buildingId)  // Alle Apartments eines Gebäudes löschen
storage.clearAll()                    // Alle Daten löschen

// Metadaten und Statistiken
storage.getStats()                    // Statistiken über gecachte Daten
storage.getMetadata()                 // Synchronisations-Metadaten
storage.hasDataForBuilding(buildingId)  // Prüfen ob Daten vorhanden

// Import/Export
storage.exportData()                  // Alle Daten exportieren
storage.importData(data)              // Daten importieren
```

## Testing

Nach der Integration testen:
1. Apartment-Liste öffnen → sollte sofort Daten aus Cache zeigen
2. Spülung durchführen und beenden
3. Zurück zur Apartment-Liste navigieren
4. Liste sollte automatisch aktualisiert sein (neue Spülzeiten)
5. Browser-Tab wechseln und zurückkommen → automatische Aktualisierung
6. F5 drücken → Daten bleiben erhalten (aus LocalStorage)

## Browser Console Logs

Das System loggt alle wichtigen Ereignisse:
- "Loaded X apartments from cache"
- "Created apartment and saved to storage"
- "Updated apartment and saved to storage"
- "Storage changed, reloading apartments data"
- "Window focused, reloading apartments data"

