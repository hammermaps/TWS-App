# Offline-Sync Bugfix: Verhindere records/create im Offline-Modus

## Problem

Im Offline-Modus wurde versucht, `records/create`-API-Aufrufe zu starten, nachdem eine Spülung erfolgt ist. Dies führte zu fehlgeschlagenen API-Requests, auch wenn die Anwendung tatsächlich offline war.

### Ursache

Der `OfflineFlushSyncService` startete die Synchronisation, sobald das Browser-`online`-Event gefeuert wurde, ohne vorher zu verifizieren, ob tatsächlich eine stabile Serververbindung besteht. Dies führte zu:

1. **Falsch-positive Online-Status**: Der Browser meldet `navigator.onLine = true`, aber der Server ist nicht erreichbar
2. **Fehlgeschlagene Sync-Versuche**: `attemptSync()` startete sofort, ohne Konnektivität zu prüfen
3. **Unnötige API-Calls**: `records/create` wurde aufgerufen, obwohl keine Verbindung bestand

## Lösung

### Änderungen in `OfflineFlushSyncService.js`

#### 1. Online-Prüfung in `attemptSync()`

```javascript
async attemptSync() {
  if (this.isSyncing) {
    console.log('🔄 Synchronisation bereits aktiv')
    return
  }

  // ✅ NEU: Prüfe erst, ob wirklich eine Verbindung besteht
  if (!this.isOnline) {
    console.log('📴 Keine Synchronisation möglich: Offline')
    return
  }

  // ✅ NEU: Verifiziere die Konnektivität mit einem echten API-Call
  const isConnected = await this.checkConnectivity()
  if (!isConnected) {
    console.log('📴 Keine Synchronisation möglich: Server nicht erreichbar')
    return
  }

  // ... Rest der Synchronisation
}
```

**Vorteile:**
- Verhindert Sync-Versuche, wenn `isOnline = false`
- Verifiziert mit echtem API-Health-Check, ob der Server erreichbar ist
- Bricht frühzeitig ab, bevor unnötige API-Calls gestartet werden

#### 2. Online-Prüfung in `syncSingleFlush()`

```javascript
async syncSingleFlush(flush) {
  // ✅ NEU: Prüfe, ob wir online sind, bevor wir versuchen zu synchronisieren
  if (!this.isOnline) {
    throw new Error('Keine Internetverbindung verfügbar')
  }

  // ... Rest der Synchronisation
}
```

**Vorteile:**
- Schützt gegen direkte Aufrufe von `syncSingleFlush()`
- Verhindert API-Calls bei Offline-Status
- Wirft expliziten Fehler für besseres Error-Handling

## Flussdiagramm

### Vorher (mit Bug)

```
Browser 'online' Event
    ↓
attemptSync() wird gestartet
    ↓
Synchronisation läuft
    ↓
❌ records/create API-Call (FEHLER: Offline!)
```

### Nachher (mit Fix)

```
Browser 'online' Event
    ↓
attemptSync() wird gestartet
    ↓
Prüfe: isOnline?
    ↓ NEIN → Abbruch ✅
    ↓ JA
    ↓
Prüfe: checkConnectivity() (Health-Check)
    ↓ FEHLER → Abbruch ✅
    ↓ ERFOLG
    ↓
Synchronisation läuft
    ↓
✅ records/create API-Call (NUR wenn wirklich online)
```

## Auswirkungen

### Positive Effekte

1. **Keine fehlgeschlagenen API-Calls mehr** im Offline-Modus
2. **Bessere User Experience**: Keine verwirrenden Fehlermeldungen
3. **Ressourcen-Schonung**: Keine unnötigen Netzwerk-Requests
4. **Robustere Offline-Funktionalität**: Spülungen bleiben sicher in der Queue

### Keine Breaking Changes

- Bestehende Funktionalität bleibt erhalten
- Offline-Spülungen werden weiterhin gespeichert
- Synchronisation erfolgt automatisch, sobald eine echte Verbindung besteht
- Keine Änderungen an der API oder den Datenstrukturen

## Testing

### Testszenarien

1. **Offline-Spülung durchführen**
   - ✅ Spülung wird lokal gespeichert
   - ✅ Keine API-Calls werden gestartet

2. **Browser meldet "Online", aber Server nicht erreichbar**
   - ✅ `checkConnectivity()` schlägt fehl
   - ✅ Synchronisation wird abgebrochen
   - ✅ Keine fehlgeschlagenen `records/create`-Calls

3. **Echte Online-Verbindung**
   - ✅ `checkConnectivity()` erfolgreich
   - ✅ Synchronisation startet
   - ✅ `records/create` wird erfolgreich aufgerufen

4. **Auto-Sync im Offline-Modus**
   - ✅ Auto-Sync prüft `isOnline` vor jedem Versuch
   - ✅ Keine unnötigen Sync-Versuche

## Implementierungsdetails

### Geänderte Dateien

- `/src/stores/OfflineFlushSyncService.js`

### Hinzugefügte Prüfungen

1. **`isOnline`-Check**: Schnelle Prüfung des Browser-Status
2. **`checkConnectivity()`-Call**: Verifizierung mit echtem Health-Check
3. **Early Return**: Frühzeitiger Abbruch bei fehlender Verbindung

### Verwendete APIs

- `navigator.onLine`: Browser-Online-Status
- `checkHealth()`: Server-Health-Check-Endpunkt
- `window.addEventListener('online/offline')`: Event-Listener

## Best Practices

### Empfohlene Nutzung

```javascript
// ✅ Automatischer Sync (mit eingebauter Online-Prüfung)
const syncService = useOfflineFlushSync()
syncService.startAutoSync(5) // Alle 5 Minuten

// ✅ Manueller Sync (mit Konnektivitätsprüfung)
try {
  await syncService.forceSync()
  console.log('Synchronisation erfolgreich')
} catch (error) {
  console.error('Sync fehlgeschlagen:', error.message)
}

// ✅ Status prüfen vor manuellen Aktionen
const status = syncService.getSyncStatus()
if (status.isOnline && !status.isSyncing) {
  // Sicher, Sync-Aktionen durchzuführen
}
```

## Zusammenfassung

Der Bugfix verhindert zuverlässig, dass `records/create`-API-Calls im Offline-Modus gestartet werden, indem vor jeder Synchronisation eine doppelte Prüfung durchgeführt wird:

1. **Browser-Status-Prüfung** (`isOnline`)
2. **Server-Erreichbarkeits-Prüfung** (`checkConnectivity()`)

Dies führt zu einer robusteren Offline-Funktionalität und einer besseren User Experience.

---

**Datum**: 2025-11-01  
**Autor**: GitHub Copilot  
**Version**: 1.0.0

