# Gebäude Übersicht - Timeout-Erhöhung und Preloading

## Problem
Bei der Gebäude-Übersicht kam es zu Timeout-Fehlern, da die Anfrage zu lange dauerte.

## Lösung

### 1. Timeout-Erhöhung

**Datei:** `src/api/ApiBuilding.js`

Die Timeouts wurden erhöht, um längere Ladezeiten zu ermöglichen:

- **`list()`**: Timeout von 5 Sekunden auf **30 Sekunden** erhöht
- **`getById()`**: Timeout von 5 Sekunden auf **15 Sekunden** erhöht

```javascript
// Vorher
async list(options = {}) {
    const { timeout = 5000, headers = {} } = options
    // ...
}

// Nachher
async list(options = {}) {
    const { timeout = 30000, headers = {} } = options // 30 Sekunden
    // ...
}
```

### 2. App-Level Preloading

**Datei:** `src/App.vue`

Gebäude werden bereits beim App-Start im Hintergrund vorgeladen:

```javascript
const preloadBuildings = async () => {
  try {
    const apiBuilding = new ApiBuilding()
    const response = await apiBuilding.list({ timeout: 30000 })
    
    if (response.items && response.items.length > 0) {
      BuildingStorage.saveBuildings(response.items)
      localStorage.setItem('buildings_timestamp', Date.now().toString())
      console.log('✅ Gebäude erfolgreich vorgeladen:', response.items.length)
    }
  } catch (error) {
    console.warn('⚠️ Gebäude-Preload fehlgeschlagen:', error.message)
  }
}
```

**Vorteile:**
- Gebäude sind bereits geladen, wenn der Nutzer zur Gebäude-Übersicht navigiert
- Non-blocking: Fehler beim Preload blockieren nicht den App-Start
- Automatisches Preloading bei jedem App-Start

### 3. View-Level Cache und Background Updates

**Datei:** `src/views/buildings/BuildingsOverview.vue`

Ein intelligentes Cache- und Preloading-System wurde implementiert:

#### Features:

1. **Sofortiges Laden aus dem Cache**
   - Beim ersten Laden werden Gebäude aus dem LocalStorage geladen
   - Nutzer sehen sofort Daten, ohne auf die API warten zu müssen

2. **Hintergrund-Aktualisierung**
   - Nach dem Laden aus dem Cache wird im Hintergrund die API abgefragt
   - Die Daten werden automatisch aktualisiert ohne den Nutzer zu blockieren

3. **Cache-Status-Anzeige**
   - Der Nutzer sieht, wann die Daten zuletzt aktualisiert wurden
   - Anzeige: "vor X Minuten aktualisiert"

4. **Aktualisierungs-Indikator**
   - Ein Badge zeigt an, wenn im Hintergrund aktualisiert wird
   - Der Nutzer wird nicht durch Lade-Spinner blockiert

#### Implementierung:

```javascript
// Cache laden und im Hintergrund aktualisieren
const loadBuildings = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cachedBuildings = BuildingStorage.getBuildings()
    if (cachedBuildings && cachedBuildings.length > 0) {
      buildings.value = cachedBuildings
      
      // Im Hintergrund aktualisieren
      isPreloading.value = true
      try {
        await list()
        BuildingStorage.saveBuildings(buildings.value)
        localStorage.setItem('buildings_timestamp', Date.now().toString())
      } finally {
        isPreloading.value = false
      }
      return
    }
  }
  
  // Normales Laden
  await list()
  BuildingStorage.saveBuildings(buildings.value)
  localStorage.setItem('buildings_timestamp', Date.now().toString())
}
```

### 4. Verwendeter Storage

**Datei:** `src/stores/BuildingStorage.js`

Der bereits vorhandene BuildingStorage wird verwendet:
- Speichert Gebäude im LocalStorage
- Lädt Gebäude aus dem LocalStorage
- Ermöglicht das Löschen des Caches

### 5. UI-Verbesserungen

**Header mit Cache-Info:**
```vue
<div>
  <h2>Gebäude Übersicht</h2>
  <small v-if="cacheStatusText" class="text-muted">
    <CIcon icon="cil-clock" class="me-1" size="sm" />
    {{ cacheStatusText }}
  </small>
</div>
```

**Aktualisierungs-Badge:**
```vue
<CBadge v-if="isPreloading" color="info" class="me-2">
  <CIcon icon="cil-sync" class="me-1" size="sm" />
  Wird aktualisiert...
</CBadge>
```

## Vorteile

1. **Schnellere Benutzererfahrung**
   - Gebäude werden bereits beim App-Start geladen
   - Sofortiges Laden aus dem Cache in der View
   - Kein Warten auf langsame API-Anfragen

2. **Besseres Fehler-Handling**
   - Längere Timeouts vermeiden unnötige Abbrüche
   - Cache als Fallback bei Netzwerkproblemen
   - Fehler beim Preload blockieren nicht den App-Start

3. **Transparenz**
   - Nutzer sehen, wann Daten aktualisiert wurden
   - Klare Anzeige bei Hintergrund-Updates

4. **Offline-Fähigkeit**
   - Daten bleiben im Cache verfügbar
   - Funktioniert auch bei temporären Netzwerkausfällen

## Technische Details

### Preloading-Strategie:
1. **App-Start**: Gebäude werden im Hintergrund geladen (`App.vue`)
2. **View-Load**: Cache wird sofort angezeigt (`BuildingsOverview.vue`)
3. **Background-Update**: Daten werden im Hintergrund aktualisiert

### Timeout-Werte:
- **Gebäude-Liste**: 30 Sekunden
- **Einzelnes Gebäude**: 15 Sekunden
- **Standard-Operationen**: 5 Sekunden (unverändert)

### Cache-Speicherung:
- **Key**: `buildings` (Array von Gebäuden)
- **Timestamp-Key**: `buildings_timestamp` (Zeitstempel des letzten Updates)
- **Speicherort**: LocalStorage

### Retry-Logik:
Die bestehende Retry-Logik in `ApiBuilding.send()` bleibt aktiv:
- Bis zu 2 Wiederholungen bei Netzwerkfehlern
- Exponentieller Backoff zwischen Versuchen

## Testing

### Manueller Test:
1. Öffne die App → Gebäude werden im Hintergrund geladen (Console-Log prüfen)
2. Navigiere zur Gebäude-Übersicht → Daten erscheinen sofort aus dem Cache
3. Beim ersten Laden sollte der Cache-Status angezeigt werden
4. Das "Wird aktualisiert..."-Badge sollte während der Hintergrund-Aktualisierung sichtbar sein
5. Klicke auf "Aktualisieren" → Erzwungenes Neuladen

### Edge Cases:
- ✅ Leerer Cache → Normales Laden
- ✅ Vorhandener Cache → Sofortiges Laden + Hintergrund-Update
- ✅ Netzwerkfehler beim Preload → App startet trotzdem
- ✅ Netzwerkfehler in View → Cache bleibt verfügbar
- ✅ Erzwungenes Neuladen → Cache wird überschrieben

### Console-Logs:
Bei erfolgreichem Preload:
```
✅ Gebäude erfolgreich vorgeladen: 12
```

Bei Fehler beim Preload:
```
⚠️ Gebäude-Preload fehlgeschlagen: Request timeout
```

## Weitere Optimierungsmöglichkeiten

1. **Service Worker Integration**
   - Noch besseres Offline-Handling
   - Background Sync für automatische Updates

2. **IndexedDB statt LocalStorage**
   - Größere Speicherkapazität
   - Bessere Performance bei großen Datenmengen

3. **Intelligente Cache-Invalidierung**
   - Automatisches Neuladen nach X Stunden
   - Invalidierung bei bestimmten Aktionen

4. **Progressive Loading**
   - Schrittweises Laden großer Listen
   - Lazy Loading für Details

5. **Prefetching weiterer Daten**
   - Apartments vorladen
   - Konfigurationsdaten vorladen

## Zusammenfassung

Die Implementierung löst das Timeout-Problem durch:
1. **Erhöhte Timeouts** für ausreichend Zeit bei langsamen Verbindungen
2. **App-Level Preloading** für sofort verfügbare Daten
3. **Cache-System** für sofortigen Zugriff auf bereits geladene Daten
4. **Hintergrund-Updates** für aktualisierte Daten ohne Wartezeit
5. **Besseres UX** mit klaren Status-Anzeigen

Die Lösung verbessert sowohl die Performance als auch die Benutzererfahrung erheblich und macht die App robuster gegenüber langsamen Netzwerkverbindungen.

