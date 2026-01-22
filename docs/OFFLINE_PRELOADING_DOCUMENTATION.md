# Offline-Daten Preloading Dokumentation

## Übersicht

Das Offline-Daten Preloading-System lädt automatisch alle Gebäude und Apartments für den Offline-Modus vor. Dies ermöglicht es Benutzern, die App vollständig offline zu nutzen, nachdem die Daten einmal geladen wurden.

## Komponenten

### 1. OfflineDataPreloader Service
**Pfad:** `/src/services/OfflineDataPreloader.js`

Hauptservice für das Vorladen von Daten.

#### Wichtigste Methoden:

- **`preloadAllData()`**: Lädt alle Gebäude und deren Apartments
- **`isDataPreloaded()`**: Prüft, ob Daten bereits geladen wurden
- **`shouldRefreshData(maxAgeHours = 24)`**: Prüft, ob ein Refresh empfohlen wird
- **`getPreloadStats()`**: Gibt Statistiken über geladene Daten zurück
- **`clearPreloadedData()`**: Löscht alle vorgeladenen Daten

#### Verwendung:

```javascript
import { useOfflineDataPreloader } from '@/services/OfflineDataPreloader.js'

const preloader = useOfflineDataPreloader()

// Daten laden
await preloader.preloadAllData()

// Status prüfen
const stats = preloader.getPreloadStats()
console.log(`${stats.buildingsCount} Gebäude, ${stats.apartmentsCount} Apartments geladen`)
```

### 2. OnlineStatus Store (erweitert)
**Pfad:** `/src/stores/OnlineStatus.js`

Der OnlineStatus Store wurde erweitert, um automatisches Preloading zu unterstützen.

#### Neue Methoden:

- **`triggerPreloadIfNeeded()`**: Startet Preloading wenn Daten fehlen oder veraltet sind
- **`forcePreload()`**: Erzwingt Preloading unabhängig vom Status

#### Automatisches Preloading:

Das Preloading wird automatisch ausgelöst:
- **3 Sekunden nach App-Start** (wenn online)
- **Beim Wiederherstellen der Verbindung** nach Offline-Phase
- **Beim manuellen Online-Schalten**
- **Beim Browser-Event "online"** (mit 2 Sekunden Verzögerung)

### 3. OfflineDataPreloadCard Komponente
**Pfad:** `/src/components/OfflineDataPreloadCard.vue`

Zeigt den Status der vorgeladenen Daten an und ermöglicht manuelles Laden/Aktualisieren.

#### Features:

- ✅ **Echtzeit-Fortschrittsanzeige** während des Ladens
- ✅ **Statistik-Übersicht** (Anzahl Gebäude/Apartments)
- ✅ **Zeitstempel** der letzten Aktualisierung
- ✅ **Warnung** bei veralteten Daten (älter als 24 Stunden)
- ✅ **Detailansicht** mit allen geladenen Gebäuden (ausklappbar)
- ✅ **Manuelle Aktualisierung** per Button

#### Props:

```javascript
{
  alwaysShow: {
    type: Boolean,
    default: false  // Wenn true, wird Karte immer angezeigt
  }
}
```

#### Verwendung:

```vue
<template>
  <OfflineDataPreloadCard />
  <!-- oder -->
  <OfflineDataPreloadCard :always-show="true" />
</template>

<script setup>
import OfflineDataPreloadCard from '@/components/OfflineDataPreloadCard.vue'
</script>
```

### 4. OfflineDataBadge Komponente
**Pfad:** `/src/components/OfflineDataBadge.vue`

Kompaktes Badge für den Header, zeigt Status der Offline-Daten an.

#### Features:

- 🔵 **Blau**: Daten werden geladen
- 🟢 **Grün**: Daten aktuell und verfügbar
- 🟡 **Gelb**: Daten veraltet (Aktualisierung empfohlen)
- ⚫ **Grau**: Keine Daten vorhanden

#### Props:

```javascript
{
  compact: {
    type: Boolean,
    default: false  // Wenn true, zeigt nur Icon ohne Text
  }
}
```

#### Verwendung:

```vue
<template>
  <OfflineDataBadge />
  <!-- oder kompakt -->
  <OfflineDataBadge :compact="true" />
</template>

<script setup>
import OfflineDataBadge from '@/components/OfflineDataBadge.vue'
</script>
```

## Integration

### Im Dashboard integriert

Die `OfflineDataPreloadCard` wurde automatisch ins Dashboard integriert:

```vue
<!-- src/views/dashboard/Dashboard.vue -->
<template>
  <div class="dashboard">
    <!-- Header -->
    ...
    
    <!-- Offline Data Preload Card -->
    <OfflineDataPreloadCard />
    
    <!-- Rest des Dashboards -->
    ...
  </div>
</template>
```

### Im Header integriert

Das `OfflineDataBadge` wurde in den App-Header integriert:

```vue
<!-- src/components/AppHeader.vue -->
<CHeaderNav>
  <CNavItem class="d-flex align-items-center">
    <OfflineDataBadge />
  </CNavItem>
  <!-- ... -->
  <OnlineStatusToggle />
</CHeaderNav>
```

## Datenfluss

### 1. Initialisierung beim App-Start

```
App startet
  ↓
OnlineStatus Store initialisiert
  ↓
Nach 3 Sekunden: triggerPreloadIfNeeded()
  ↓
Prüfung: Sind Daten vorhanden und aktuell?
  ↓
Nein → preloadAllData()
  ↓
Lade alle Gebäude
  ↓
Für jedes Gebäude: Lade Apartments (parallel)
  ↓
Speichere in LocalStorage
  ↓
Aktualisiere UI-Komponenten
```

### 2. Speicherstruktur

#### Gebäude:
```javascript
// LocalStorage Key: 'buildings'
[
  {
    id: 1,
    name: "Gebäude A",
    hidden: false,
    sorted: 0,
    apartments_count: 25,
    created: "2024-01-01T00:00:00Z",
    updated: "2024-01-01T00:00:00Z"
  },
  ...
]
```

#### Apartments:
```javascript
// LocalStorage Key: 'wls_apartments_db'
{
  "1": [  // Building ID
    {
      id: 101,
      building_id: 1,
      number: "A1",
      floor: "EG",
      min_flush_duration: 20,
      enabled: 1,
      sorted: 0,
      ...
    },
    ...
  ],
  "2": [...],
  ...
}
```

#### Metadaten:
```javascript
// LocalStorage Key: 'wls_preload_metadata'
{
  timestamp: "2024-11-01T12:00:00Z",
  buildingsCount: 5,
  apartmentsCount: 125,
  buildingDetails: [
    { id: 1, name: "Gebäude A", apartmentsCount: 25 },
    { id: 2, name: "Gebäude B", apartmentsCount: 30 },
    ...
  ]
}
```

## Konfiguration

### Aktualisierungs-Intervall

Standardmäßig wird eine Aktualisierung empfohlen, wenn Daten älter als **24 Stunden** sind.

Dies kann angepasst werden:

```javascript
const preloader = useOfflineDataPreloader()

// Prüfe ob älter als 12 Stunden
if (preloader.shouldRefreshData(12)) {
  await preloader.preloadAllData()
}
```

### API-Timeout

Der Preloader verwendet einen längeren Timeout für API-Requests:

```javascript
// Standard: 5000ms
// Preloading: 10000ms

const apartmentsResponse = await this.apartmentApi.list({ 
  building_id: buildingId,
  timeout: 10000
})
```

## Fehlerbehandlung

### Bei Netzwerkfehlern

- Einzelne fehlgeschlagene Gebäude brechen den Gesamtvorgang nicht ab
- Fehler werden geloggt, aber der Preload-Prozess läuft weiter
- Bei komplettem Fehler wird Status auf 'error' gesetzt

### Fallback auf gecachte Daten

Wenn API-Requests fehlschlagen, verwendet die App automatisch die gecachten Daten aus LocalStorage:

```javascript
// Automatisch in ApiApartment.list()
catch (error) {
  const cachedApartments = storage.storage.getApartmentsForBuilding(buildingId)
  if (cachedApartments.length > 0) {
    return new ApiApartmentListResponse({
      items: cachedApartments,
      success: true,
      error: 'Daten aus lokalem Speicher (Offline)'
    })
  }
}
```

## Monitoring & Debugging

### Console-Logs

Das System gibt detaillierte Console-Logs aus:

```
🚀 Starte Preloading von Gebäuden und Apartments für Offline-Modus...
📋 Lade Gebäude...
✅ 5 Gebäude geladen
💾 Gebäude in LocalStorage gespeichert
🏢 Lade Apartments für alle Gebäude...
  📦 Lade Apartments für Gebäude: Gebäude A (ID: 1)
    ✓ 25 Apartments geladen für Gebäude A
  📦 Lade Apartments für Gebäude: Gebäude B (ID: 2)
    ✓ 30 Apartments geladen für Gebäude B
✅ Insgesamt 125 Apartments geladen
🎉 Preloading abgeschlossen!
```

### Statistiken abrufen

```javascript
const preloader = useOfflineDataPreloader()
const stats = preloader.getPreloadStats()

console.log(stats)
// {
//   preloaded: true,
//   buildingsCount: 5,
//   apartmentsCount: 125,
//   lastPreload: "2024-11-01T12:00:00Z",
//   hoursSinceLastPreload: 2,
//   needsRefresh: false,
//   buildings: [...]
// }
```

### Fortschritt überwachen

```javascript
const preloader = useOfflineDataPreloader()

// Reaktiver Zugriff auf Fortschritt
watch(preloader.preloadProgress, (progress) => {
  console.log(`
    Status: ${progress.status}
    Gebäude: ${progress.buildings}/${progress.totalBuildings}
    Apartments: ${progress.apartments}
    Aktuell: ${progress.currentBuilding}
  `)
})
```

## Best Practices

### 1. Preloading beim Login

```javascript
// In Login-Handler
async function handleLogin() {
  const loginSuccess = await performLogin()
  
  if (loginSuccess) {
    // Starte Preloading im Hintergrund
    const onlineStatusStore = useOnlineStatusStore()
    onlineStatusStore.triggerPreloadIfNeeded()
  }
}
```

### 2. Manueller Refresh vor Offline-Gehen

```vue
<template>
  <CButton @click="prepareOfflineMode">
    Für Offline-Modus vorbereiten
  </CButton>
</template>

<script setup>
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const onlineStatusStore = useOnlineStatusStore()

async function prepareOfflineMode() {
  await onlineStatusStore.forcePreload()
  // Optional: Wechsel in Offline-Modus
  onlineStatusStore.setManualOffline(true)
}
</script>
```

### 3. Status-Anzeige für Benutzer

```vue
<template>
  <div v-if="preloader.isPreloading.value">
    <CSpinner />
    Lade Offline-Daten...
  </div>
</template>

<script setup>
import { useOfflineDataPreloader } from '@/services/OfflineDataPreloader.js'

const preloader = useOfflineDataPreloader()
</script>
```

## Bekannte Einschränkungen

1. **Speicherplatz**: Bei sehr vielen Gebäuden/Apartments kann LocalStorage an Grenzen stoßen (normalerweise 5-10MB)
2. **Parallele Requests**: Zu viele parallele API-Requests könnten Server belasten (aktuell unbegrenzt parallel)
3. **Keine Delta-Updates**: Kompletter Reload aller Daten, keine inkrementellen Updates

## Zukünftige Verbesserungen

- [ ] Inkrementelle Updates statt kompletter Reload
- [ ] Komprimierung der gespeicherten Daten
- [ ] Prioritäts-basiertes Laden (häufig genutzte Gebäude zuerst)
- [ ] Background-Sync API für automatische Updates im Hintergrund
- [ ] IndexedDB statt LocalStorage für größere Datenmengen
- [ ] Selektives Preloading (nur bestimmte Gebäude)

## Troubleshooting

### Problem: Daten werden nicht geladen

**Lösung:**
```javascript
// Prüfe Online-Status
const onlineStatusStore = useOnlineStatusStore()
console.log('Online:', onlineStatusStore.isFullyOnline)

// Prüfe Preloader-Status
const preloader = useOfflineDataPreloader()
console.log('Is Preloading:', preloader.isPreloading.value)
console.log('Error:', preloader.preloadError.value)
```

### Problem: Daten veraltet

**Lösung:**
```javascript
// Erzwinge Reload
await onlineStatusStore.forcePreload()
```

### Problem: LocalStorage voll

**Lösung:**
```javascript
// Lösche alte Daten
const preloader = useOfflineDataPreloader()
preloader.clearPreloadedData()

// Lade neu
await preloader.preloadAllData()
```

