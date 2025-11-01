# Test-Anleitung: Offline-Token-Validierung

## Vorbereitung
1. Anwendung starten: `npm run dev`
2. Im Browser öffnen: `http://localhost:5173`
3. Browser-Konsole öffnen (F12)

## Test 1: Token-Validierung im Online-Modus

### Schritte
1. Anmelden mit gültigen Credentials
2. Zur Dashboard-Seite navigieren
3. Konsole beobachten

### Erwartetes Verhalten
```
✅ Token-Prüfung für Route "Dashboard" erfolgreich
🔄 Token-Überwachung gestartet (alle 5 Minuten)
🟢 Online-Modus wiederhergestellt - Token-Validierung aktiv
```

### Ergebnis
- ✅ Token wird validiert
- ✅ Benutzer bleibt eingeloggt
- ✅ Automatische Prüfung läuft alle 5 Minuten

---

## Test 2: Manueller Offline-Modus

### Schritte
1. Eingeloggt sein (siehe Test 1)
2. Auf Offline-Toggle in Header-Bar klicken
3. Konsole beobachten
4. 5+ Minuten warten
5. Zwischen Seiten navigieren

### Erwartetes Verhalten (beim Umschalten auf Offline)
```
📴 Manueller Offline-Modus aktiviert
🔴 Offline-Modus erkannt - Token-Validierung wird pausiert
```

### Erwartetes Verhalten (während Offline)
```
📴 Offline-Modus: Token-Prüfung übersprungen, Login bleibt aktiv
📴 Offline-Modus: Automatische Token-Prüfung übersprungen, Login bleibt aktiv
Token-Validierung übersprungen (Offline-Modus) - Login bleibt aktiv
```

### Erwartetes Verhalten (Zurück auf Online)
```
📶 Manueller Online-Modus aktiviert
🟢 Online-Modus wiederhergestellt - Token-Validierung aktiv
🔍 Automatische Token-Prüfung wird durchgeführt...
✅ Token ist gültig
```

### Ergebnis
- ✅ Kein Logout im Offline-Modus
- ✅ Navigation funktioniert weiterhin
- ✅ Token-Prüfung wird pausiert
- ✅ Bei Online-Rückkehr wird Token validiert

---

## Test 3: Browser Offline (Netzwerkverbindung getrennt)

### Schritte
1. Eingeloggt sein
2. Browser DevTools öffnen (F12)
3. Network Tab → "Offline" auswählen
4. Konsole beobachten
5. Seiten navigieren

### Erwartetes Verhalten
```
🌐 Browser ist offline
🔴 Server nicht erreichbar - Wechsel zu Offline-Modus
📴 Offline-Modus: Token-Prüfung übersprungen, Login bleibt aktiv
```

### Ergebnis
- ✅ OnlineStatus erkennt Browser-Offline
- ✅ Automatischer Wechsel in Offline-Modus
- ✅ Token-Validierung pausiert
- ✅ Benutzer bleibt eingeloggt

---

## Test 4: Server nicht erreichbar (Ping-Fehler)

### Schritte
1. Eingeloggt sein
2. Backend-Server stoppen (oder in `OnlineStatus.js` `MAX_FAILURES_BEFORE_OFFLINE` auf 1 setzen)
3. 30+ Sekunden warten (1 Ping-Intervall)
4. Konsole beobachten

### Erwartetes Verhalten
```
❌ Ping fehlgeschlagen
⚠️ Ping fehlgeschlagen (1/3)
⚠️ Ping fehlgeschlagen (2/3)
⚠️ Ping fehlgeschlagen (3/3)
🔴 Server nicht erreichbar - Wechsel zu Offline-Modus
📴 Offline-Modus: Token-Prüfung übersprungen, Login bleibt aktiv
```

### Ergebnis
- ✅ Nach 3 fehlgeschlagenen Pings: Offline-Modus
- ✅ Token-Validierung pausiert
- ✅ Benutzer bleibt eingeloggt

---

## Test 5: Token-Validierung bei Seitenaufruf (Offline)

### Schritte
1. Offline-Modus aktivieren
2. Zwischen verschiedenen Seiten navigieren:
   - Dashboard
   - Gebäude-Übersicht
   - Apartment-Details
3. Konsole beobachten

### Erwartetes Verhalten
```
🧭 Navigation von "Dashboard" zu "BuildingsOverview"
🔍 Token-Prüfung bei Seitenaufruf für Route: BuildingsOverview
📴 Offline-Modus: Token-Prüfung übersprungen, Login bleibt aktiv
✅ Navigation zu "BuildingsOverview" abgeschlossen
```

### Ergebnis
- ✅ Navigation funktioniert
- ✅ Token-Prüfung wird übersprungen
- ✅ Kein Logout
- ✅ SessionStorage wird trotzdem aktualisiert

---

## Test 6: Langzeit-Offline (> 5 Minuten)

### Schritte
1. Offline-Modus aktivieren
2. 6 Minuten warten (länger als Token-Check-Intervall)
3. Konsole beobachten
4. Zwischen Seiten navigieren

### Erwartetes Verhalten
```
// Nach 5 Minuten
📴 Offline-Modus: Automatische Token-Prüfung übersprungen, Login bleibt aktiv

// Navigation
📴 Offline-Modus: Token-Prüfung übersprungen, Login bleibt aktiv

// Weiterhin eingeloggt
```

### Ergebnis
- ✅ Benutzer bleibt eingeloggt (auch nach > 5 Minuten)
- ✅ Token-Checks werden kontinuierlich übersprungen
- ✅ Keine Fehler oder Timeouts

---

## Test 7: Online-Rückkehr nach langem Offline

### Schritte
1. Offline-Modus aktivieren
2. 10 Minuten warten
3. Online-Modus aktivieren
4. Konsole beobachten

### Erwartetes Verhalten
```
📶 Manueller Online-Modus aktiviert
🟢 Online-Modus wiederhergestellt - Token-Validierung aktiv
🔍 Automatische Token-Prüfung wird durchgeführt...
🍪 PHPSESSID: [cookie-value]
✅ Token ist gültig
```

### Ergebnis
- ✅ Sofortige Token-Validierung bei Online-Rückkehr
- ✅ Bei gültigem Token: Benutzer bleibt eingeloggt
- ✅ Bei ungültigem Token: Automatischer Logout

---

## Test 8: Leerstandspülung im Offline-Modus

### Schritte
1. Offline-Modus aktivieren
2. Zu Gebäude → Apartment navigieren
3. Leerstandspülung durchführen
4. Daten werden lokal gespeichert
5. Online-Modus aktivieren
6. Sync sollte automatisch starten

### Erwartetes Verhalten (Offline)
```
📴 Offline-Modus: Token-Prüfung übersprungen, Login bleibt aktiv
✅ Leerstandspülung lokal gespeichert
💾 Flush-Record in Offline-Queue gespeichert
```

### Erwartetes Verhalten (Online)
```
🟢 Online-Modus wiederhergestellt - Token-Validierung aktiv
🔍 Automatische Token-Prüfung wird durchgeführt...
✅ Token ist gültig
🔄 Starte Offline-Flush-Sync...
✅ Flush-Record erfolgreich synchronisiert
```

### Ergebnis
- ✅ Leerstandspülung im Offline-Modus möglich
- ✅ Token bleibt während Offline-Arbeit gültig
- ✅ Automatische Synchronisation bei Online-Rückkehr

---

## Debugging-Tipps

### Konsolen-Filter verwenden
```javascript
// Nur Token-Validierung anzeigen
"Token-"

// Nur Offline-Modus anzeigen
"Offline-Modus"

// Nur Online-Status anzeigen
"Online-Modus"
```

### Store-Status prüfen (in Browser-Konsole)
```javascript
// Pinia Store importieren
const { useOnlineStatusStore } = await import('./src/stores/OnlineStatus.js')
const onlineStore = useOnlineStatusStore()

// Status prüfen
console.log('isFullyOnline:', onlineStore.isFullyOnline)
console.log('manualOfflineMode:', onlineStore.manualOfflineMode)
console.log('isServerReachable:', onlineStore.isServerReachable)
console.log('connectionStatus:', onlineStore.connectionStatus)
```

### Token-Manager-Status prüfen
```javascript
// In Browser-Konsole
const { lastTokenCheck, tokenCheckActive } = await import('./src/stores/TokenManager.js')
console.log('lastTokenCheck:', lastTokenCheck.value)
console.log('tokenCheckActive:', tokenCheckActive.value)
```

---

## Zusammenfassung

### Was funktioniert jetzt
✅ Token-Validierung pausiert im Offline-Modus  
✅ Login bleibt im Offline-Modus bestehen  
✅ Keine unnötigen Netzwerkanfragen im Offline-Modus  
✅ Automatische Reaktivierung bei Online-Rückkehr  
✅ Sofortige Token-Validierung nach Online-Rückkehr  
✅ Leerstandspülungen offline möglich  
✅ Navigation funktioniert offline  

### Was sich geändert hat
- `useTokenValidator.js`: Prüft `isFullyOnline` vor Token-Validierung
- `TokenManager.js`: Prüft `isFullyOnline` vor Token-Checks
- Beide nutzen den zentralen `OnlineStatus` Store
- Token-Checks werden übersprungen, aber Timer läuft weiter

### Bekannte Einschränkungen
- Token-Ablauf wird im Offline-Modus nicht lokal getrackt
- Nach sehr langer Offline-Zeit (> Token-Gültigkeit) kann Token bei Online-Rückkehr ungültig sein
- Empfehlung: Bei Offline-Arbeit regelmäßig Online-Verbindung herstellen zur Token-Aktualisierung

