# Apartments-Auswahl - Timeout-Erhöhung und Preloading

## Problem
Bei der Auswahl der Apartments kam es zu Timeout-Fehlern ("Request timeout").

## Lösung

### 1. Timeout-Erhöhung

**Datei:** `src/api/ApiApartment.js`

Die Timeouts wurden erhöht, um längere Ladezeiten zu ermöglichen:

- **`list()`**: Timeout von 5 Sekunden auf **30 Sekunden** erhöht
- **`getById()`**: Timeout von 5 Sekunden auf **15 Sekunden** erhöht

```javascript
// Vorher
async list(options = {}) {
    const { timeout = 5000, headers = {}, building_id } = options
    // ...
}

// Nachher
async list(options = {}) {
    const { timeout = 30000, headers = {}, building_id } = options // 30 Sekunden
    // ...
}
```

### 2. View-Level Cache und Background Updates

**Datei:** `src/views/buildings/BuildingApartments.vue`

Ein intelligentes Cache- und Preloading-System wurde implementiert:

#### Features:

1. **Sofortiges Laden aus dem Cache**
   - Apartments werden aus dem ApartmentStorage (LocalStorage) geladen
   - Nutzer sehen sofort Daten ohne Wartezeit

2. **Hintergrund-Aktualisierung**
   - Nach dem Cache-Load wird im Hintergrund die API abgefragt
   - Daten werden automatisch aktualisiert ohne den Nutzer zu blockieren

3. **Cache-Status-Anzeige**
   - Anzeige, wann die Daten zuletzt aktualisiert wurden
   - Format: "vor X Minuten aktualisiert"

4. **Aktualisierungs-Indikator**
   - Badge zeigt an, wenn im Hintergrund aktualisiert wird
   - Kein blockierender Lade-Spinner

#### Implementierung:

```javascript
// Cache laden und im Hintergrund aktualisieren
const loadApartments = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cachedApartments = storage.storage.getApartmentsForBuilding(buildingId.value)
    if (cachedApartments && cachedApartments.length > 0) {
      apartments.value = cachedApartments
      
      // Im Hintergrund aktualisieren
      isPreloading.value = true
      try {
        await list({ building_id: buildingId.value })
        localStorage.setItem(`apartments_${buildingId.value}_timestamp`, Date.now().toString())
      } finally {
        isPreloading.value = false
      }
      return
    }
  }
  
  // Normales Laden
  await list({ building_id: buildingId.value })
  localStorage.setItem(`apartments_${buildingId.value}_timestamp`, Date.now().toString())
}
```

### 3. Verwendeter Storage

**Datei:** `src/stores/ApartmentStorage.js`

Der bereits vorhandene ApartmentStorage wird verwendet:
- Speichert Apartments pro Gebäude im LocalStorage
- Lädt Apartments aus dem LocalStorage
- Key-Format: `apartments_building_{building_id}`

### 4. UI-Verbesserungen

**Header mit Cache-Info:**
```vue
<small v-if="cacheStatusText" class="text-muted">
  <CIcon icon="cil-clock" class="me-1" size="sm" />
  {{ cacheStatusText }}
</small>
```

**Aktualisierungs-Badge:**
```vue
<CBadge v-if="isPreloading" color="info" class="me-2">
  <CIcon icon="cil-sync" class="me-1" size="sm" />
  Wird aktualisiert...
</CBadge>
```

**Verbessertes Loading:**
- Loading-Spinner nur bei leerem Cache
- Wenn Cache vorhanden, werden Daten sofort angezeigt
- Hintergrund-Update läuft ohne UI-Blockierung

## Vorteile

1. **Schnellere Benutzererfahrung**
   - Sofortiges Laden aus dem Cache
   - Kein Warten auf langsame API-Anfragen

2. **Besseres Fehler-Handling**
   - 30 Sekunden Timeout für langsame Verbindungen
   - Cache als Fallback bei Netzwerkproblemen
   - Bereits vorhandenes Offline-Fallback in ApiApartment

3. **Transparenz**
   - Nutzer sehen, wann Daten aktualisiert wurden
   - Klare Anzeige bei Hintergrund-Updates

4. **Offline-Fähigkeit**
   - Apartments bleiben im Cache verfügbar
   - Integriert mit bestehendem Offline-Modus

## Technische Details

### Timeout-Werte:
- **Apartments-Liste**: 30 Sekunden
- **Einzelnes Apartment**: 15 Sekunden
- **Standard-Operationen**: Unverändert

### Cache-Speicherung:
- **Key-Format**: `apartments_building_{building_id}` (im ApartmentStorage)
- **Timestamp-Key**: `apartments_{building_id}_timestamp` (LocalStorage)
- **Speicherort**: LocalStorage

### Bestehende Features bleiben erhalten:
- ✅ Offline-Modus-Integration
- ✅ Automatisches LocalStorage-Update nach API-Call
- ✅ Retry-Logik bei Netzwerkfehlern
- ✅ Fallback auf Cache bei Fehler

## Integration mit bestehendem System

Die Lösung integriert sich nahtlos mit dem bestehenden System:

1. **ApartmentStorage**: Verwendet bereits vorhandene Storage-Funktionen
2. **Offline-Modus**: Respektiert den Online-Status
3. **API-Struktur**: Nutzt bestehende API-Methoden
4. **Cache-Verwaltung**: Automatisch durch ApiApartment.list()

## Testing

### Manueller Test:
1. Navigiere zu einem Gebäude
2. Öffne die Apartments-Liste
3. Beim ersten Laden sollte ein Spinner erscheinen
4. Nach dem Laden sollte der Cache-Status angezeigt werden
5. Navigiere zurück und erneut zu den Apartments → Daten erscheinen sofort
6. Das "Wird aktualisiert..."-Badge sollte während der Hintergrund-Aktualisierung erscheinen

### Edge Cases:
- ✅ Leerer Cache → Normales Laden
- ✅ Vorhandener Cache → Sofortiges Laden + Hintergrund-Update
- ✅ Offline-Modus → Nur Cache-Daten
- ✅ Netzwerkfehler → Fallback auf Cache
- ✅ Erzwungenes Neuladen → Cache wird überschrieben
- ✅ Wechsel zwischen Gebäuden → Korrekter Cache pro Gebäude

## Unterschied zu Gebäude-Preloading

**Gebäude:**
- App-Level Preloading beim Start
- Globaler Cache für alle Gebäude

**Apartments:**
- View-Level Caching
- Cache pro Gebäude (building_id)
- Kein App-Level Preload (zu viele Daten)

## Weitere Optimierungsmöglichkeiten

1. **Intelligentes Prefetching**
   - Apartments des nächsten Gebäudes vorladen
   - Basierend auf Navigationshistorie

2. **Cache-Invalidierung**
   - Automatisches Neuladen nach X Stunden
   - Invalidierung nach Änderungen

3. **Batch-Loading**
   - Mehrere Gebäude gleichzeitig laden
   - Für häufig besuchte Gebäude

4. **Progressive Enhancement**
   - Schrittweises Laden bei sehr vielen Apartments
   - Virtualisierung der Tabelle

## Zusammenfassung

Die Implementierung löst das Timeout-Problem durch:

1. **Erhöhte Timeouts** (30 Sekunden für Liste)
2. **Cache-System** für sofortigen Zugriff
3. **Hintergrund-Updates** ohne Wartezeit
4. **Besseres UX** mit klaren Status-Anzeigen
5. **Nahtlose Integration** mit bestehendem Offline-System

Die Lösung verbessert die Performance erheblich und macht die App robuster gegenüber langsamen Verbindungen, während alle bestehenden Features erhalten bleiben.

