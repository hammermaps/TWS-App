# Synchronisations-Optionen Integration - Implementierung

## Status: ✅ IMPLEMENTIERT

Die Synchronisations-Optionen auf der Konfigurationsseite sind nun vollständig implementiert und funktionsfähig.

## Implementierte Features

### 1. ✅ syncOnStartup - Synchronisation beim App-Start

**Datei**: `src/App.vue`

Wenn aktiviert, werden ausstehende Konfigurationsänderungen beim App-Start automatisch synchronisiert.

```javascript
// In App.vue onMounted
const syncConfigOnStartup = async () => {
  const config = configStorage.loadConfig()
  
  if (config?.sync?.syncOnStartup && navigator.onLine) {
    await configSync.syncPending()
  }
}
```

**Ablauf**:
1. App startet
2. Config wird geladen
3. Wenn `syncOnStartup = true` und Online → Sync wird ausgeführt
4. Alle ausstehenden Änderungen werden zum Server gesendet

### 2. ✅ autoSync - Automatische Synchronisation bei Online-Wechsel

**Datei**: `src/stores/OnlineStatus.js`

Wenn aktiviert, werden Konfigurationsänderungen automatisch synchronisiert, sobald das Gerät wieder online ist.

```javascript
// In OnlineStatus.js
async function syncConfigChanges() {
  const config = configStorage.loadConfig()
  
  if (!config?.sync?.autoSync) {
    return // Überspringe wenn deaktiviert
  }
  
  await configSyncService.syncPending()
}
```

**Ablauf**:
1. Benutzer ist offline und ändert Konfiguration
2. Änderung wird zur Sync-Queue hinzugefügt
3. Gerät wird wieder online
4. Wenn `autoSync = true` → Automatische Synchronisation startet
5. Alle ausstehenden Änderungen werden zum Server gesendet

### 3. ✅ syncInterval - Intervall-basierte Synchronisation

**Datei**: `src/services/AutoSyncService.js` (NEU)

Wenn aktiviert, wird periodisch (alle X Minuten) eine Synchronisation durchgeführt.

```javascript
export class AutoSyncService {
  start(intervalMinutes) {
    // Periodische Synchronisation alle X Minuten
    this.intervalId = setInterval(() => {
      if (navigator.onLine) {
        configSync.syncPending()
      }
    }, intervalMinutes * 60 * 1000)
  }
}
```

**Ablauf**:
1. App startet
2. Wenn `autoSync = true` und `syncInterval > 0` → AutoSync Service startet
3. Alle X Minuten wird geprüft ob ausstehende Änderungen existieren
4. Wenn ja und Online → Synchronisation wird durchgeführt

## Geänderte/Neue Dateien

### Neue Dateien:
1. **`src/services/AutoSyncService.js`** (NEU)
   - Kompletter Service für intervall-basierte Synchronisation
   - Start/Stop/Update Funktionen
   - Status-Tracking

### Geänderte Dateien:
1. **`src/App.vue`**
   - Import von ConfigStorage, ConfigSyncService, AutoSyncService
   - `syncConfigOnStartup()` Funktion hinzugefügt
   - `startAutoSync()` Funktion hinzugefügt
   - `onMounted` Hook erweitert
   - `onUnmounted` Hook hinzugefügt (Cleanup)

2. **`src/stores/OnlineStatus.js`**
   - Import von ConfigStorage hinzugefügt
   - `syncConfigChanges()` prüft jetzt `autoSync` Einstellung

3. **`src/views/pages/ConfigSettings.vue`**
   - Import von AutoSyncService hinzugefügt
   - Watcher für `autoSync` Einstellung
   - Watcher für `syncInterval` Einstellung
   - Automatisches Starten/Stoppen des AutoSync Service

## Verwendung

### In den Einstellungen

Navigiere zu `/settings` → Server-Einstellungen → Synchronisation

1. **Automatische Synchronisation** (autoSync)
   - ☑️ Aktiviert: Synchronisiert automatisch bei Online-Wechsel
   - ☐ Deaktiviert: Nur manuelle Synchronisation

2. **Sync-Intervall (Minuten)** (syncInterval)
   - Wert: 1-999 Minuten
   - Nur aktiv wenn "Automatische Synchronisation" aktiviert ist
   - Standard: 15 Minuten

3. **Beim Start synchronisieren** (syncOnStartup)
   - ☑️ Aktiviert: Synchronisiert beim App-Start
   - ☐ Deaktiviert: Keine Synchronisation beim Start

## Technische Details

### Sync-Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Benutzer ändert Konfiguration                           │
│    → ConfigStorage speichert lokal                          │
│    → Bei Offline: Zur Sync-Queue hinzufügen                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Synchronisations-Trigger                                 │
│    a) App-Start (wenn syncOnStartup = true)                 │
│    b) Online-Wechsel (wenn autoSync = true)                 │
│    c) Intervall (wenn syncInterval > 0)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ConfigSyncService.syncPending()                          │
│    → Lädt Sync-Queue                                        │
│    → Sendet Änderungen zum Server                           │
│    → Markiert als synchronisiert                            │
│    → Entfernt aus Queue                                     │
└─────────────────────────────────────────────────────────────┘
```

### Fehlerbehandlung

- **Offline**: Keine Sync-Versuche, Änderungen bleiben in Queue
- **Server nicht erreichbar**: Retry nach 3 Fehlversuchen
- **Fehler**: Wird geloggt, aber App läuft weiter
- **Hintergrund**: Alle Syncs sind nicht-blockierend

### Performance

- ✅ Minimale Batterie-Nutzung (nur wenn online)
- ✅ Kein Polling bei Offline-Modus
- ✅ Intelligentes Intervall (min. 1 Minute, empfohlen 15+)
- ✅ Cleanup bei App-Beendigung

## Testing

### Test 1: syncOnStartup ✅

1. Online sein und Config ändern
2. Offline gehen
3. App neu starten (online)
4. **Erwartung**: Console zeigt "Synchronisiere ausstehende Config-Änderungen..."
5. **Ergebnis**: ✅ Änderung wird synchronisiert

### Test 2: autoSync ✅

1. Online sein
2. autoSync aktivieren in Einstellungen
3. Offline gehen
4. Config ändern (wird lokal gespeichert)
5. Wieder online gehen
6. **Erwartung**: Automatische Synchronisation startet
7. **Ergebnis**: ✅ Änderung wird automatisch synchronisiert

### Test 3: syncInterval ✅

1. autoSync aktivieren
2. syncInterval auf 1 Minute setzen
3. Config ändern (online oder offline)
4. Warten 1-2 Minuten
5. **Erwartung**: Automatische Synchronisation alle 1 Minute
6. **Ergebnis**: ✅ Periodische Synchronisation funktioniert

### Test 4: Einstellungen ändern ✅

1. autoSync aktivieren → AutoSync Service startet
2. autoSync deaktivieren → AutoSync Service stoppt
3. syncInterval ändern → Intervall wird neu gesetzt
4. **Erwartung**: Sofortige Reaktion auf Änderungen
5. **Ergebnis**: ✅ Watcher funktionieren korrekt

## Logs & Debugging

Die Implementierung loggt alle wichtigen Events:

```javascript
// App Start
🔄 Config-Synchronisation beim Start aktiviert
📤 Synchronisiere ausstehende Config-Änderungen...
✅ Config-Synchronisation erfolgreich: 1 Items

// Auto Sync
🚀 AutoSync: Starte automatische Synchronisation (15 Min.)
🔄 AutoSync: Starte periodische Synchronisation...
✅ AutoSync: Erfolgreich - 1 Items synchronisiert

// Online-Wechsel
🔄 Synchronisiere Konfigurationsänderungen (autoSync)...
✅ 1 Konfigurationsänderungen synchronisiert

// Einstellungen
🔄 AutoSync Einstellung geändert: true
✅ AutoSync aktiviert
🔄 Sync-Intervall geändert: 15 → 5
✅ Sync-Intervall aktualisiert
```

## Best Practices

### Empfohlene Einstellungen

**Für mobile Geräte**:
```javascript
sync: {
  autoSync: true,        // ✅ Aktiviert
  syncInterval: 30,      // 30 Minuten (Batterie-schonend)
  syncOnStartup: true    // ✅ Aktiviert
}
```

**Für Desktop/Server**:
```javascript
sync: {
  autoSync: true,        // ✅ Aktiviert
  syncInterval: 5,       // 5 Minuten (schnellere Updates)
  syncOnStartup: true    // ✅ Aktiviert
}
```

**Für Offline-First**:
```javascript
sync: {
  autoSync: false,       // ❌ Deaktiviert (manuell)
  syncInterval: 0,       // Kein Intervall
  syncOnStartup: true    // ✅ Nur beim Start
}
```

## Wartung

### Neue Sync-Option hinzufügen

1. Füge Option in `defaultConfig` in ConfigSettings.vue hinzu
2. Füge UI-Element in Template hinzu
3. Implementiere Logik in entsprechendem Service
4. Füge Watcher hinzu (falls benötigt)
5. Update Dokumentation

### Debugging

- Prüfe Console-Logs für "AutoSync", "Config-Sync", "syncOnStartup"
- Prüfe LocalStorage: `wls_config_sync_queue`
- Prüfe Status mit `autoSyncService.getStatus()`

## Bekannte Einschränkungen

- ⚠️ Minimales Intervall: 1 Minute
- ⚠️ Sync nur wenn online (keine Offline-Queuing für andere Services)
- ⚠️ Keine Priorisierung von Sync-Items

## Zukünftige Erweiterungen

Mögliche Erweiterungen:
- 📊 UI-Anzeige für Sync-Status
- 🔔 Benachrichtigungen bei erfolgreicher Sync
- ⚡ Intelligentes Intervall (adaptiv basierend auf Änderungen)
- 🔄 Sync für andere Datentypen (nicht nur Config)

---

**Stand**: 09.01.2026
**Version**: 1.0.0
**Status**: ✅ Vollständig implementiert und getestet
**Autor**: AI Assistant

