# Offline-Token-Validierung

## Problem
Im Offline-Modus wurde die Token-Validierung weiter ausgeführt, was zu unnötigen Netzwerkversuchen und möglicherweise zum Logout führen konnte. Das Login sollte im Offline-Modus bestehen bleiben.

## Lösung
Die Token-Validierung wurde so angepasst, dass sie im Offline-Modus pausiert wird und das aktive Login erhalten bleibt.

## Geänderte Dateien

### 1. `/src/api/useTokenValidator.js`
**Änderungen:**
- Import von `watch` und `useOnlineStatusStore` hinzugefügt
- `onlineStatusStore` zur Composable-Funktion hinzugefügt
- `performValidation()` prüft jetzt `onlineStatusStore.isFullyOnline` vor der Token-Validierung
- Im Offline-Modus wird die Token-Prüfung übersprungen und ein gültiges Ergebnis zurückgegeben
- Watcher für `onlineStatusStore.isFullyOnline` hinzugefügt:
  - Bei Offline: Loggt, dass Token-Validierung pausiert wird
  - Bei Online-Rückkehr: Führt sofort eine Validierung durch

**Verhalten:**
```javascript
// Offline-Modus
if (!onlineStatusStore.isFullyOnline) {
  console.log('Token-Validierung übersprungen (Offline-Modus) - Login bleibt aktiv')
  return { valid: true, reason: 'Offline-Modus - Token-Prüfung pausiert', skipped: true }
}
```

### 2. `/src/stores/TokenManager.js`
**Änderungen:**
- Import von `useOnlineStatusStore` hinzugefügt
- `checkTokenOnPageLoad()` verwendet jetzt `onlineStatusStore.isFullyOnline` statt `navigator.onLine`
- `performTokenCheck()` verwendet jetzt `onlineStatusStore.isFullyOnline` statt `navigator.onLine`
- Beide Funktionen geben im Offline-Modus ein gültiges Ergebnis zurück

**Verhalten bei Seitenaufruf:**
```javascript
if (!onlineStatusStore.isFullyOnline) {
  console.log('📴 Offline-Modus: Token-Prüfung übersprungen, Login bleibt aktiv')
  return { valid: true, reason: 'Offline-Modus: Lokales Token vertraut, Login aktiv' }
}
```

**Verhalten bei automatischer Prüfung:**
```javascript
if (!onlineStatusStore.isFullyOnline) {
  console.log('📴 Offline-Modus: Automatische Token-Prüfung übersprungen, Login bleibt aktiv')
  return { valid: true, reason: 'Offline-Modus: Token-Prüfung übersprungen, Login aktiv' }
}
```

## Funktionsweise

### Online-Modus (Normal)
1. Token-Validierung läuft alle 5 Minuten
2. Bei Seitenaufruf wird Token geprüft
3. Bei ungültigem Token wird der Benutzer abgemeldet

### Offline-Modus (Neu)
1. Token-Validierung wird **nicht** durchgeführt (übersprungen)
2. Das lokale Token wird als gültig betrachtet
3. Der Benutzer bleibt eingeloggt
4. Bei Seitenaufrufen wird die Token-Prüfung übersprungen
5. Der Session-Timer läuft weiter (Aktivitäts-Tracking funktioniert)

### Übergang Online → Offline
1. `OnlineStatus.isFullyOnline` wird `false`
2. Token-Validierung wird pausiert (gibt immer `valid: true` zurück)
3. Benutzer bleibt eingeloggt
4. Konsolen-Log: "🔴 Offline-Modus erkannt - Token-Validierung wird pausiert"

### Übergang Offline → Online
1. `OnlineStatus.isFullyOnline` wird `true`
2. Token-Validierung wird reaktiviert
3. Sofortige Token-Prüfung wird durchgeführt
4. Konsolen-Log: "🟢 Online-Modus wiederhergestellt - Token-Validierung aktiv"
5. Bei ungültigem Token wird der Benutzer jetzt abgemeldet

## Vorteile

### Benutzererfahrung
- ✅ Kein unerwarteter Logout im Offline-Modus
- ✅ Nahtlose Arbeit mit gecachten Daten
- ✅ Leerstandspülungen können offline durchgeführt werden
- ✅ Keine Fehlermeldungen wegen fehlgeschlagener Token-Validierung

### Technisch
- ✅ Keine unnötigen Netzwerkanfragen im Offline-Modus
- ✅ Konsistentes Verhalten mit anderen Offline-Features
- ✅ Verwendet zentralen `OnlineStatus` Store
- ✅ Automatische Reaktivierung bei Online-Rückkehr

### Sicherheit
- ✅ Token wird nicht gelöscht im Offline-Modus
- ✅ Bei Online-Rückkehr wird Token sofort validiert
- ✅ Ungültige Token führen nach Online-Rückkehr zum Logout

## Integration mit OnlineStatus Store

Die Token-Validierung nutzt den zentralen `OnlineStatus` Store, der folgende Zustände berücksichtigt:

```javascript
const isFullyOnline = computed(() => {
  return !manualOfflineMode.value && isOnline.value && isServerReachable.value
})
```

**Offline-Bedingungen:**
- Manueller Offline-Modus aktiviert
- Browser ist offline (`navigator.onLine === false`)
- Server ist nicht erreichbar (nach 3 fehlgeschlagenen Pings)

## Testing

### Manueller Test
1. Anmelden und zum Dashboard navigieren
2. Offline-Modus aktivieren (Toggle in der Header-Bar)
3. Warten (> 5 Minuten) → Benutzer bleibt eingeloggt
4. Zwischen Seiten navigieren → Kein Logout
5. Online-Modus aktivieren → Token wird sofort geprüft

### Konsolenausgabe (Offline)
```
🔴 Offline-Modus erkannt - Token-Validierung wird pausiert
Token-Validierung übersprungen (Offline-Modus) - Login bleibt aktiv
📴 Offline-Modus: Automatische Token-Prüfung übersprungen, Login bleibt aktiv
```

### Konsolenausgabe (Online-Rückkehr)
```
🟢 Online-Modus wiederhergestellt - Token-Validierung aktiv
🔍 Automatische Token-Prüfung wird durchgeführt...
✅ Token ist gültig
```

## Kompatibilität

### Bestehende Features
- ✅ Funktioniert mit bestehendem Offline-Flush-System
- ✅ Kompatibel mit OnlineRequiredWrapper-Komponente
- ✅ Integriert mit Offline-Banner
- ✅ Nutzt denselben OnlineStatus Store wie andere Offline-Features

### Router Guards
- Router Guards prüfen weiterhin `requiresOnline` Meta-Felder
- Im Offline-Modus werden Online-Only-Seiten blockiert
- Token-Authentication bleibt aktiv im Offline-Modus

## Zukünftige Erweiterungen

### Mögliche Verbesserungen
1. **Token-Ablauf im Offline-Modus tracken**
   - Lokale Timer für Token-Ablauf
   - Warnung wenn Token bald abläuft
   - Automatischer Logout nach X Stunden Offline

2. **Offline-Session-Limits**
   - Maximale Offline-Dauer konfigurierbar
   - Nach X Stunden Offline: Neuanmeldung erforderlich

3. **Sync-Status-Anzeige**
   - Zeige letzte erfolgreiche Token-Validierung an
   - Warne wenn zu lange offline

## Changelog

### Version 1.0 (2025-01-11)
- ✅ Token-Validierung pausiert im Offline-Modus
- ✅ Login bleibt im Offline-Modus aktiv
- ✅ Integration mit OnlineStatus Store
- ✅ Automatische Reaktivierung bei Online-Rückkehr
- ✅ Konsolen-Logging für Debugging

