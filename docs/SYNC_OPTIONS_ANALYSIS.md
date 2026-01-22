# Synchronisations-Optionen Integration - Analyse

## Status: ❌ NICHT IMPLEMENTIERT

Die Synchronisations-Optionen auf der Konfigurationsseite werden **aktuell nicht verwendet**.

## Problembeschreibung

In `ConfigSettings.vue` gibt es folgende Sync-Optionen:

```javascript
sync: {
  autoSync: true,           // ❌ Wird nicht verwendet
  syncInterval: 15,         // ❌ Wird nicht verwendet  
  syncOnStartup: true,      // ❌ Wird nicht verwendet
}
```

### Was existiert bereits:

1. ✅ **UI Einstellungen** in `ConfigSettings.vue`
2. ✅ **ConfigSyncService** - Service für Config-Synchronisation
3. ✅ **ConfigStorage** - Speicherung der Einstellungen
4. ❌ **Keine Verwendung** der Sync-Einstellungen

### Was fehlt:

1. ❌ Automatische Synchronisation basierend auf `autoSync`
2. ❌ Interval-basierte Synchronisation basierend auf `syncInterval`
3. ❌ Synchronisation beim App-Start basierend auf `syncOnStartup`
4. ❌ Integration in die App-Lifecycle

## Wo sollten die Optionen verwendet werden?

### 1. App.vue - Beim Start
```vue
<script setup>
import { onBeforeMount } from 'vue'
import { useConfigStorage } from '@/stores/ConfigStorage.js'
import { useConfigSyncService } from '@/services/ConfigSyncService.js'

onBeforeMount(async () => {
  const configStorage = useConfigStorage()
  const config = configStorage.loadConfig()
  
  // Sync beim Start, wenn aktiviert
  if (config?.sync?.syncOnStartup) {
    const configSync = useConfigSyncService()
    await configSync.syncPending()
  }
})
</script>
```

### 2. Neuer Service: AutoSyncService.js
```javascript
// Automatische periodische Synchronisation
export class AutoSyncService {
  constructor() {
    this.intervalId = null
  }
  
  start(intervalMinutes) {
    if (this.intervalId) return
    
    const configSync = useConfigSyncService()
    this.intervalId = setInterval(() => {
      if (navigator.onLine) {
        configSync.syncPending()
      }
    }, intervalMinutes * 60 * 1000)
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
```

### 3. OnlineStatus.js - Bei Online-Wechsel
```javascript
// Wenn Online-Status wechselt
watch(isOnline, (online) => {
  if (online && config?.sync?.autoSync) {
    configSync.syncPending()
  }
})
```

## Empfohlene Implementierung

### Phase 1: Grundlegende Integration (Priorität: HOCH)

1. **Sync beim App-Start** (`syncOnStartup`)
   - In `App.vue` `onBeforeMount` Hook
   - Nur wenn Online und Option aktiviert

2. **Automatische Sync bei Online** (`autoSync`)
   - In `OnlineStatus.js` Store
   - Wenn Gerät wieder online geht

### Phase 2: Erweiterte Features (Priorität: MITTEL)

3. **Interval-basierte Synchronisation** (`syncInterval`)
   - Neuer `AutoSyncService`
   - Registriert in `App.vue`
   - Start/Stop basierend auf Einstellung

4. **UI-Feedback**
   - Sync-Status anzeigen
   - Letzte Synchronisation
   - Anzahl ausstehender Änderungen

## Code-Locations

### Dateien, die geändert werden müssen:

| Datei | Was hinzufügen |
|-------|----------------|
| `src/App.vue` | syncOnStartup Implementation |
| `src/stores/OnlineStatus.js` | autoSync bei Online-Wechsel |
| `src/services/AutoSyncService.js` | NEU: Interval-Service |
| `src/services/ConfigSyncService.js` | Logging verbessern |

### Dateien, die bereits OK sind:

- ✅ `src/views/pages/ConfigSettings.vue` - UI ist fertig
- ✅ `src/stores/ConfigStorage.js` - Speicherung funktioniert
- ✅ `src/services/ConfigSyncService.js` - Service ist fertig

## Technische Details

### Sync-Flow:

```
1. Benutzer ändert Einstellung → Speichert in ConfigStorage
2. Wenn Offline → Zur Sync-Queue hinzufügen
3. Wenn Online:
   a) autoSync = true → Sofort synchronisieren
   b) syncInterval > 0 → Periodisch synchronisieren
4. Bei App-Start:
   - syncOnStartup = true → Sync-Queue abarbeiten
```

### Berücksichtigung:

- ⚠️ **Offline-Modus**: Keine Sync-Versuche wenn offline
- ⚠️ **Batterie**: Interval nicht zu kurz (min. 5 Minuten)
- ⚠️ **Netzwerk**: Retry-Logik bei Fehlern
- ⚠️ **Performance**: Sync im Hintergrund, nicht blockierend

## Testing

Nach Implementierung testen:

1. **syncOnStartup**:
   - Offline Config ändern
   - App neu starten (online)
   - Prüfen: Synchronisation erfolgt

2. **autoSync**:
   - Offline Config ändern
   - Online gehen
   - Prüfen: Automatische Synchronisation

3. **syncInterval**:
   - Interval auf 1 Minute setzen
   - Warten
   - Prüfen: Periodische Synchronisation

## Aufwand

**Geschätzt**: 2-3 Stunden

- Phase 1 (syncOnStartup + autoSync): 1 Stunde
- Phase 2 (syncInterval + AutoSyncService): 1 Stunde
- Testing & Dokumentation: 30-60 Minuten

## Priorität

**MITTEL-HOCH**

Die Funktionalität ist teilweise vorhanden (manuell über Button), aber die automatischen Optionen fehlen noch.

---

**Stand**: 09.01.2026
**Status**: ❌ Nicht implementiert, Konzept erstellt

