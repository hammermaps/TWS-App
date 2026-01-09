# API Timeout und Retry-Konfiguration - Implementierung

## Übersicht

Die API-Timeout- und Max-Retry-Werte aus den Server-Einstellungen (`/settings`) werden jetzt dynamisch in allen API-Calls verwendet. Diese Implementierung umfasst:

1. **Zentrales Config-Helper-Utility** für Timeout und Retry-Werte
2. **Fallback-Mechanismus** für fehlende Konfiguration
3. **Offline-Modus-Unterstützung**
4. **Integration in alle API-Dateien**

---

## 1. ApiConfigHelper - Zentrale Konfigurationsverwaltung

### Datei: `/src/utils/ApiConfigHelper.js`

Dieses neue Utility stellt zentrale Funktionen bereit, um die API-Konfigurationswerte zu laden:

#### Hauptfunktionen:

```javascript
// Lädt die komplette API-Konfiguration
getApiConfig() 
// Returns: { apiTimeout: number, maxRetries: number }

// Gibt den Timeout-Wert zurück (mit Custom-Override-Möglichkeit)
getApiTimeout(customTimeout = null)

// Gibt die Max-Retry-Anzahl zurück (mit Custom-Override-Möglichkeit)
getMaxRetries(customRetries = null)

// Prüft, ob die App im Offline-Modus ist
isOfflineMode()

// Gibt alle Request-Optionen zurück
getRequestOptions(options = {})
```

#### Fallback-Werte:

```javascript
const DEFAULT_CONFIG = {
  apiTimeout: 5000,    // 5 Sekunden
  maxRetries: 3        // 3 Versuche
}
```

Diese Werte werden verwendet, wenn:
- Keine Konfiguration im LocalStorage gefunden wird
- Die Konfiguration fehlerhaft ist
- Beim ersten Start der Anwendung

---

## 2. Datenquelle und Speicherung

### Konfiguration wird geladen aus:

1. **LocalStorage** (`wls_config_cache`)
   - Wird von `ConfigSettings.vue` gespeichert
   - Enthält alle Konfigurationswerte inkl. `server.apiTimeout` und `server.maxRetries`

2. **Fallback auf Standardwerte**, wenn LocalStorage leer ist

### Konfigurationsstruktur im LocalStorage:

```json
{
  "server": {
    "apiTimeout": 5000,
    "maxRetries": 3
  },
  "ui": { ... },
  "notifications": { ... },
  "sync": { ... }
}
```

---

## 3. Integration in API-Dateien

Alle API-Dateien wurden aktualisiert, um die Konfigurationswerte zu verwenden:

### Aktualisierte Dateien:

- ✅ `/src/api/ApiConfig.js`
- ✅ `/src/api/ApiUser.js`
- ✅ `/src/api/ApiBuilding.js`
- ✅ `/src/api/ApiApartment.js`
- ✅ `/src/api/ApiRecords.js`
- ✅ `/src/api/ApiHealth.js`
- ✅ `/src/services/OfflineDataPreloader.js`

### Änderungen in den API-Dateien:

#### Import hinzugefügt:
```javascript
import { getApiTimeout, getMaxRetries } from '../utils/ApiConfigHelper.js'
```

#### ApiRequest-Konstruktor aktualisiert:
```javascript
export class ApiRequest {
    constructor({
        endpoint,
        method = "GET",
        body = null,
        headers = {},
        timeout = null,      // ← null statt 5000
        retries = null,      // ← null statt 2
    }) {
        this.endpoint = endpoint
        this.method = method
        this.body = body
        this.headers = headers
        // Verwende Konfigurationswerte mit Fallback
        this.timeout = getApiTimeout(timeout)
        this.retries = getMaxRetries(retries)
    }
}
```

#### API-Methoden aktualisiert:
```javascript
// Vorher:
async list(options = {}) {
    const { timeout = 5000, headers = {} } = options
    // ...
}

// Nachher:
async list(options = {}) {
    const { timeout = null, headers = {} } = options
    // ← null wird automatisch durch ApiRequest in den Config-Wert umgewandelt
}
```

---

## 4. Verwendung in der Anwendung

### Automatische Verwendung

Alle API-Calls verwenden jetzt automatisch die konfigurierten Werte:

```javascript
// Beispiel: Building API
const apiBuilding = new ApiBuilding()
const buildings = await apiBuilding.list()
// → Verwendet automatisch apiTimeout und maxRetries aus der Konfiguration
```

### Custom-Override möglich

Falls für einen speziellen API-Call andere Werte benötigt werden:

```javascript
// Mit Custom-Timeout
const buildings = await apiBuilding.list({ 
    timeout: 10000  // 10 Sekunden für diesen speziellen Call
})

// Mit Custom-Retry
const request = new ApiRequest({
    endpoint: "/special/endpoint",
    method: "GET",
    timeout: 15000,
    retries: 5
})
```

---

## 5. Offline-Modus-Berücksichtigung

### Automatische Offline-Erkennung

Der `ApiConfigHelper` prüft den Online-Status aus:
1. **LocalStorage** (`wls_online_status`)
2. **Navigator API** als Fallback (`navigator.onLine`)

### Verwendung:

```javascript
import { isOfflineMode, getRequestOptions } from '@/utils/ApiConfigHelper.js'

// Prüfen, ob offline
if (isOfflineMode()) {
    console.log('App ist offline - verwende gecachte Daten')
}

// Request-Optionen mit Offline-Info
const options = getRequestOptions({
    timeout: 10000,  // Optional
    retries: 3       // Optional
})
// Returns: { timeout, retries, isOffline }
```

---

## 6. Konfiguration ändern

### In der UI (Admin-Benutzer)

1. Navigiere zu `/settings`
2. Scrolle zu "Server-Einstellungen" (nur für Admins sichtbar)
3. Ändere die Werte:
   - **API Timeout (ms)**: z.B. 5000 (Standard: 5 Sekunden)
   - **Max. Retry Versuche**: z.B. 3 (Standard: 3 Versuche)
4. Klicke auf "Speichern"

### Programmatisch

```javascript
import { useConfigStorage } from '@/stores/ConfigStorage.js'

const configStorage = useConfigStorage()

// Aktuelle Konfiguration laden
const config = configStorage.loadConfig()

// Werte ändern
config.server.apiTimeout = 10000
config.server.maxRetries = 5

// Speichern
configStorage.saveConfig(config)

// Ab jetzt werden alle neuen API-Calls die neuen Werte verwenden
```

---

## 7. Testen der Implementierung

### Test 1: Standard-Werte verwenden

```javascript
// Keine Konfiguration gesetzt
localStorage.removeItem('wls_config_cache')

// API-Call durchführen
const buildings = await apiBuilding.list()
// → Verwendet Fallback: timeout=5000ms, retries=3
```

### Test 2: Custom-Konfiguration

```javascript
// Konfiguration setzen
const config = {
    server: {
        apiTimeout: 8000,
        maxRetries: 5
    }
}
localStorage.setItem('wls_config_cache', JSON.stringify(config))

// API-Call durchführen
const buildings = await apiBuilding.list()
// → Verwendet: timeout=8000ms, retries=5
```

### Test 3: Timeout-Verhalten

```javascript
// Sehr kurzen Timeout setzen (zum Testen)
const config = {
    server: {
        apiTimeout: 100,  // 100ms - wird wahrscheinlich timeout
        maxRetries: 2
    }
}
localStorage.setItem('wls_config_cache', JSON.stringify(config))

// API-Call durchführen
const buildings = await apiBuilding.list()
// → Sollte nach 100ms + 2 Retries fehlschlagen
```

---

## 8. Vorteile der Implementierung

### ✅ Zentrale Verwaltung
- Alle API-Timeouts werden an **einer Stelle** konfiguriert
- Keine hartcodierten Werte mehr in den API-Dateien

### ✅ Benutzerfreundlich
- Admins können Timeouts in der UI anpassen
- Keine Code-Änderungen nötig für Timeout-Anpassungen

### ✅ Offline-Support
- Konfiguration wird im LocalStorage gespeichert
- Funktioniert auch offline

### ✅ Fallback-Sicherheit
- Standardwerte greifen bei fehlender Konfiguration
- App ist immer funktionsfähig

### ✅ Flexibilität
- Custom-Overrides für spezielle API-Calls möglich
- Verschiedene Timeout-Werte für verschiedene Endpunkte

---

## 9. Debugging

### Konfiguration überprüfen:

```javascript
import { getApiConfig } from '@/utils/ApiConfigHelper.js'

// Aktuelle Konfiguration anzeigen
const config = getApiConfig()
console.log('Current API Config:', config)
// Output: { apiTimeout: 5000, maxRetries: 3 }
```

### LocalStorage inspizieren:

```javascript
// Im Browser Console
const config = localStorage.getItem('wls_config_cache')
console.log(JSON.parse(config))
```

### Request-Timeout in DevTools:

1. Öffne Chrome DevTools → Network Tab
2. Führe einen API-Call aus
3. Schaue in "Timing" → Wie lange dauerte der Request?
4. Bei Timeout: Status = "canceled" oder "failed"

---

## 10. Fehlerbehebung

### Problem: API-Calls verwenden immer Standard-Timeout

**Lösung:**
- Prüfe, ob die Konfiguration korrekt im LocalStorage gespeichert ist
- Stelle sicher, dass die Settings-Seite nach dem Speichern neu geladen wird
- Lösche den Browser-Cache und teste erneut

### Problem: Timeout ist zu kurz

**Lösung:**
- Erhöhe `apiTimeout` in den Settings
- Für Preload-Operationen: Verwende einen höheren Wert (z.B. 30000ms)

### Problem: Zu viele Retries

**Lösung:**
- Reduziere `maxRetries` in den Settings
- Bei langsamer Verbindung: Retries können die Wartezeit verlängern

---

## 11. Migration von alten API-Calls

Falls noch alte API-Calls mit hartcodierten Timeouts existieren:

### Vorher:
```javascript
const response = await fetch('/api/endpoint', {
    method: 'GET',
    headers: { ... },
    timeout: 5000  // Hardcoded
})
```

### Nachher:
```javascript
import { getApiTimeout } from '@/utils/ApiConfigHelper.js'

const response = await fetch('/api/endpoint', {
    method: 'GET',
    headers: { ... },
    timeout: getApiTimeout()  // Dynamisch aus Config
})
```

---

## Zusammenfassung

Die Implementierung ermöglicht eine **zentrale, benutzerfreundliche Verwaltung** von API-Timeouts und Retry-Versuchen. Alle API-Calls nutzen jetzt die konfigurierten Werte mit einem robusten Fallback-Mechanismus. Die Lösung ist offline-fähig und bietet Flexibilität für spezielle Anwendungsfälle.

**Nächste Schritte:**
- Teste die Implementierung mit verschiedenen Timeout-Werten
- Überwache API-Performance in Production
- Passe Default-Werte bei Bedarf an

