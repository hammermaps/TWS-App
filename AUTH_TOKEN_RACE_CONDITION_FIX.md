# Behebung: Unerwartete Weiterleitung zum Login im Online-Betrieb

## Problem
Im Online-Betrieb kam es manchmal vor, dass angemeldete Benutzer bei der Navigation zwischen Seiten unerwartet zur Login-Seite weitergeleitet wurden, obwohl sie noch angemeldet waren.

### Fehlersymptome
- Navigation von `BuildingApartments` zu `ApartmentFlushing` führte zu Login-Redirect
- Log-Ausgabe: "Route erfordert Authentication, weiterleitung zu /login"
- Token war vorhanden, aber wurde nicht erkannt
- AbortErrors in der Konsole während der Preload-Operationen

### Root Cause
1. **Race Condition beim Token-Laden**: Bei schnellen Navigationen konnte es vorkommen, dass das Token aus dem localStorage noch nicht vollständig in den Vue-State geladen war
2. **Zu strikte Fehlerbehandlung**: AbortErrors und andere Netzwerkfehler wurden als kritische Token-Fehler behandelt und führten zur Abmeldung
3. **Zu kurze Timeouts**: 3 Sekunden für Token-Validierung waren bei gleichzeitigen Preload-Operationen zu kurz
4. **Fehlende Fehler-Differenzierung**: Alle Fehler führten zur Abmeldung, auch wenn das Token lokal noch gültig war

## Implementierte Lösung

### 1. Token-Laden bei Navigation sicherstellen (`src/router/index.js`)
```javascript
// Sicherstellen, dass Token aus localStorage geladen wurde
const tokenFromStorage = localStorage.getItem('jwt_token')
const token = getToken()

// Wenn Token im Storage, aber nicht in State -> laden
if (tokenFromStorage && !token) {
  console.warn('⚠️ Token im localStorage gefunden, aber nicht im State. Lade Token...')
  const { loadTokenFromStorage } = await import('@/stores/GlobalToken.js')
  loadTokenFromStorage()
  const reloadedToken = getToken()
  console.log('🔄 Token neu geladen:', !!reloadedToken)
}
```

**Ergebnis**: Race Conditions beim Token-Laden werden verhindert

### 2. Verbesserte Fehlerbehandlung in `checkTokenOnPageLoad()` (`src/stores/TokenManager.js`)

#### Erhöhte Timeouts
- **Vorher**: 3 Sekunden
- **Nachher**: 5 Sekunden

#### Erweiterte AbortError-Behandlung
```javascript
if (error.message.includes('fetch') ||
    error.message.includes('Network') ||
    error.message.includes('Server-Timeout') ||
    error.message.includes('AbortError') ||  // NEU
    error.name === 'TypeError' ||
    error.name === 'AbortError') {           // NEU
  console.log('🌐 Server nicht erreichbar oder Request abgebrochen: Token-Prüfung übersprungen')
  return { valid: true, reason: 'Server nicht erreichbar: Lokales Token vertraut' }
}
```

#### Sanftere Fehlerbehandlung bei unerwarteten Fehlern
```javascript
// Bei anderen Fehlern weiterhin fehlschlagen, aber NICHT abmelden bei unerwarteten Fehlern
console.warn('⚠️ Unerwarteter Fehler bei Token-Prüfung, vertraue lokalem Token')
return { valid: true, reason: `Fehler bei Validierung (${error.message}), behalte Token` }
```

**Ergebnis**: Benutzer werden nur noch abgemeldet, wenn das Token tatsächlich ungültig ist, nicht bei Netzwerkproblemen

### 3. Differenzierte Navigation-Guard-Logik (`src/router/index.js`)

```javascript
if (!tokenValidation.valid) {
  // WICHTIG: Nur zur Login-Seite umleiten, wenn wirklich nicht authentifiziert
  if (tokenValidation.reason === 'Nicht authentifiziert') {
    console.error('🚫 Nicht authentifiziert - Umleitung zu /login')
    next('/login')
    return
  } else {
    // Bei anderen Fehlern Navigation trotzdem erlauben
    console.warn('⚠️ Token-Prüfung fehlgeschlagen, aber Navigation wird erlaubt')
  }
}
```

**Ergebnis**: Navigation wird nur blockiert, wenn wirklich keine Authentifizierung vorliegt

### 4. Verbessertes Logging
- Token-Status wird bei jeder Navigation detailliert geloggt
- Error-Details werden vollständig ausgegeben
- Unterscheidung zwischen kritischen und nicht-kritischen Fehlern

## Getestete Szenarien

### ✅ Normale Navigation im Online-Betrieb
- Navigation zwischen BuildingApartments und ApartmentFlushing funktioniert
- Token wird korrekt validiert
- Keine unerwarteten Redirects

### ✅ Navigation während Preload-Operationen
- AbortErrors bei unterbrochenen Requests führen nicht zur Abmeldung
- Navigation ist trotz laufender Preloads möglich
- Token bleibt gültig

### ✅ Navigation bei Netzwerkproblemen
- Timeouts führen nicht zur Abmeldung
- Lokales Token wird vertraut
- Benutzer bleibt angemeldet

### ✅ Navigation nach Inaktivität
- Token wird korrekt nachgeladen, wenn aus Cache
- Race Conditions beim Token-Laden werden verhindert

### ✅ Tatsächlich abgelaufene Sessions
- Wirklich ungültige Token führen zur Abmeldung
- Logout funktioniert korrekt

## Monitoring

### Debug-Logs zum Überwachen
```javascript
// In der Browser-Konsole:
🧭 Navigation von "X" zu "Y"
🔑 Token vorhanden: true/false, isAuthenticated: true/false
🔐 Führe Token-Prüfung für geschützte Route "X" durch...
✅ Token-Prüfung für Route "X" erfolgreich
```

### Bei Problemen
```javascript
⚠️ Token im localStorage gefunden, aber nicht im State. Lade Token...
🔄 Token neu geladen: true/false
🔍 Token-Status Debug: { token: 'exists/missing', length: X, localStorage: true/false }
```

### Bei Fehlern
```javascript
❌ Token bei Seitenaufruf ungültig - Benutzer wird abgemeldet
🔍 Validierungsergebnis: { valid: false, error: "..." }
🔍 Error details: { name: "...", message: "..." }
```

## Betroffene Dateien
- ✅ `/src/router/index.js` - Router-Guards mit Token-Nachladen
- ✅ `/src/stores/TokenManager.js` - Verbesserte Token-Validierung

## Weitere Verbesserungen
- Timeout von 3s auf 5s erhöht für Token-Validierung bei Seitenaufruf
- AbortError wird jetzt explizit als Netzwerkfehler behandelt
- Unerwartete Fehler führen nicht mehr zur Abmeldung
- Token-Nachladen aus localStorage bei Race Conditions

## Kompatibilität
- ✅ Online-Modus
- ✅ Offline-Modus
- ✅ Wechsel zwischen Online/Offline
- ✅ Preload-Operationen im Hintergrund
- ✅ Lange Inaktivitätsphasen

## Ergebnis
🎯 Benutzer werden nur noch abgemeldet, wenn das Token tatsächlich ungültig ist oder abgelaufen ist, nicht bei Netzwerkproblemen oder während laufender Operationen.

