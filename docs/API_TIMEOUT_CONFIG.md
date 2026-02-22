# API Timeout Konfiguration: IndexedDB mit In-Memory Cache

## Überblick

Die Server-Einstellungen für **API Timeout (ms)** werden vollständig über **IndexedDB** verwaltet, mit einem **In-Memory Cache** für schnellen synchronen Zugriff.

## Architektur

### Neue Lösung: IndexedDB + In-Memory Cache

```
┌─────────────────┐
│ ConfigSettings  │
│     (Admin)     │
└────────┬────────┘
         │ speichert
         ▼
┌─────────────────┐
│   IndexedDB     │  ← Persistente Speicherung
│ (wls_config)    │
└────────┬────────┘
         │ lädt beim Start
         ▼
┌─────────────────┐
│  In-Memory      │  ← Cache für synchronen Zugriff
│  Cache          │
└────────┬────────┘
         │ liest (synchron)
         ▼
┌─────────────────┐
│ ApiConfigHelper │
└────────┬────────┘
         │ verwendet
         ▼
┌─────────────────┐
│   API-Clients   │
│ (ApiUser, etc.) │
└─────────────────┘
```

### Vorteile

| Vorteil | Beschreibung |
|---------|--------------|
| ✅ **Keine localStorage-Abhängigkeit** | Alles in IndexedDB |
| ✅ **Synchroner Zugriff** | Über In-Memory Cache |
| ✅ **Keine Duplikation** | Single Source of Truth |
| ✅ **Automatische Updates** | Cache wird bei Config-Änderung aktualisiert |
| ✅ **Größere Kapazität** | IndexedDB statt localStorage |

## Implementierung

### 1. ApiConfigHelper.js - In-Memory Cache

```javascript
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const CONFIG_KEY = 'wls_config_cache'

// In-Memory Cache für synchronen Zugriff
let configCache = null

/**
 * Initialisiert den Config-Cache beim App-Start
 */
export async function initApiConfigCache() {
  const result = await indexedDBHelper.get(STORES.CONFIG, CONFIG_KEY)
  
  if (result && result.value && result.value.server) {
    configCache = {
      apiTimeout: result.value.server.apiTimeout || 5000,
      maxRetries: result.value.server.maxRetries || 3
    }
    console.log('✅ API-Config-Cache initialisiert:', configCache)
  } else {
    configCache = { apiTimeout: 5000, maxRetries: 3 }
    console.log('⚠️ Keine Config in IndexedDB, verwende Defaults')
  }
}

/**
 * Aktualisiert den Config-Cache
 */
export async function refreshApiConfigCache() {
  return await initApiConfigCache()
}

/**
 * Gibt die Config synchron zurück (aus Cache)
 */
export function getApiConfig() {
  if (!configCache) {
    return { apiTimeout: 5000, maxRetries: 3 }
  }
  return { ...configCache }
}
```

### 2. ConfigStorage.js - Automatische Cache-Aktualisierung

```javascript
async saveConfig(config) {
  // Speichere in IndexedDB
  await indexedDBHelper.set(STORES.CONFIG, {
    key: CONFIG_KEY,
    value: serializeForIndexedDB(config)
  })
  
  // ✅ Aktualisiere API-Config-Cache für sofortige Verwendung
  if (window.refreshApiConfigCache) {
    await window.refreshApiConfigCache()
    console.log('✅ API-Config-Cache aktualisiert')
  }
  
  return true
}
```

### 3. main.js - Initialisierung beim App-Start

```javascript
import { initApiConfigCache, refreshApiConfigCache } from '@/utils/ApiConfigHelper.js'

async function initializeApp() {
  // Storage Migration
  await migrateLocalStorageToIndexedDB()
  
  // ConfigStorage initialisieren
  await configStorage.init()
  
  // ✅ API Config Cache initialisieren (wichtig!)
  await initApiConfigCache()
  
  // Mache refreshApiConfigCache global verfügbar
  window.refreshApiConfigCache = refreshApiConfigCache
  
  // Vue App erstellen und mounten
  // ...
}
```

## Wie ApiConfigHelper funktioniert

### getApiConfig() - Synchroner Zugriff auf Cache
```javascript
export function getApiConfig() {
  // Liest aus dem In-Memory Cache (synchron!)
  if (!configCache) {
    return { ...DEFAULT_CONFIG }  // Fallback wenn Cache nicht initialisiert
  }
  
  return { ...configCache }
}
```

### getApiTimeout() - Verwendet Cache
```javascript
export function getApiTimeout(customTimeout = null) {
  if (customTimeout !== null && customTimeout > 0) {
    return customTimeout
  }
  
  const config = getApiConfig()  // Synchroner Zugriff auf Cache
  return config.apiTimeout
}
```

### Verwendung in API-Clients

#### ApiUser.js
```javascript
import { getApiTimeout, getMaxRetries } from '../utils/ApiConfigHelper.js'

export class ApiRequest {
  constructor({
    endpoint,
    method = "GET",
    body = null,
    headers = {},
    timeout = null,
    retries = null,
  }) {
    this.endpoint = endpoint
    this.method = method
    this.body = body
    this.headers = headers
    // ✅ Verwendet Konfigurationswerte aus In-Memory Cache (synchron)
    this.timeout = getApiTimeout(timeout)
    this.retries = getMaxRetries(retries)
  }
}
```

## Konfigurationswerte

### Standard-Werte (Fallback)
```javascript
const DEFAULT_CONFIG = {
  apiTimeout: 5000,    // 5 Sekunden
  maxRetries: 3
}
```

### Admin-konfigurierbare Werte
Über **Einstellungen → Server-Einstellungen → API Timeout (ms)**:
- Minimum: 1000ms (1 Sekunde)
- Standard: 15000ms (15 Sekunden)
- Empfohlen: 10000-20000ms
- Maximum: Kein Limit (vorsichtig verwenden)

## Datenfluss-Beispiel

### Szenario: Admin ändert API-Timeout auf 20000ms

#### 1. Admin speichert Konfiguration
```javascript
// ConfigSettings.vue
await configStorageComposable.saveConfig({
  server: {
    apiTimeout: 20000,  // 20 Sekunden
    maxRetries: 3
  }
})
```

#### 2. ConfigStorage speichert in IndexedDB
```javascript
// ConfigStorage.js
async saveConfig(config) {
  // IndexedDB (einzige Quelle der Wahrheit)
  await indexedDBHelper.set(STORES.CONFIG, {
    key: 'wls_config_cache',
    value: { server: { apiTimeout: 20000, maxRetries: 3 } }
  })
  
  // In-Memory Cache aktualisieren
  await window.refreshApiConfigCache()
}
```

#### 3. API-Client verwendet neuen Wert
```javascript
// ApiUser.js
const request = new ApiRequest({
  endpoint: '/api/user/list',
  method: 'GET'
})

// request.timeout = 20000 ✅ (aus In-Memory Cache)
```

## Testing

### 1. API Config Cache prüfen
```javascript
// In Browser-Console
import { getApiConfig } from './src/utils/ApiConfigHelper.js'
console.log('API Config:', getApiConfig())
// Sollte die aktuelle Config aus dem Cache zurückgeben
```

### 2. API-Timeout überprüfen
```javascript
// In Browser-Console
import { getApiTimeout } from './src/utils/ApiConfigHelper.js'
console.log('API Timeout:', getApiTimeout())
// Sollte den konfigurierten Wert zurückgeben (z.B. 20000)
```

### 3. IndexedDB Inhalt prüfen
```javascript
// In Browser DevTools → Application → IndexedDB → TWS_APP_DB → config
// Sollte einen Eintrag mit key 'wls_config_cache' zeigen
```

### 4. Manueller Test
1. Als Admin einloggen
2. Zu **Einstellungen → Server-Einstellungen** navigieren
3. API Timeout auf 20000ms setzen
4. Speichern
5. Console-Log prüfen:
   ```
   💾 Konfiguration in IndexedDB gespeichert
   ✅ API-Config-Cache aktualisiert
   ```
6. Neuer API-Call sollte 20s Timeout verwenden

### 5. Automatischer Test beim App-Start
Nach Page-Reload sollte in der Console erscheinen:
```
🔧 Initialisiere ConfigStorage...
📦 Konfiguration aus IndexedDB geladen
✅ ConfigStorage initialisiert
🔧 Initialisiere API-Config-Cache...
✅ API-Config-Cache initialisiert: { apiTimeout: 20000, maxRetries: 3 }
```

## Warum In-Memory Cache?

### Synchrone vs. Asynchrone APIs

| API | Typ | Verwendung |
|-----|-----|------------|
| **IndexedDB** | Asynchron | Primärer Speicher, persistente Daten |
| **In-Memory Cache** | Synchron | Schneller Zugriff für häufige Abfragen |

### Problem mit rein asynchronem Zugriff
```javascript
// ❌ Würde nicht funktionieren
class ApiRequest {
  constructor({ timeout }) {
    // Constructor kann nicht async sein!
    this.timeout = await getApiTimeout(timeout)  // Syntax Error
  }
}
```

### Lösung mit In-Memory Cache
```javascript
// ✅ Funktioniert
class ApiRequest {
  constructor({ timeout }) {
    // Synchroner Zugriff auf In-Memory Cache
    this.timeout = getApiTimeout(timeout)  // OK - liest aus RAM
  }
}
```

### Cache-Lebenszyklus

```
App-Start:
  IndexedDB → In-Memory Cache laden
  
Während Laufzeit:
  API-Requests → In-Memory Cache lesen (schnell!)
  
Config-Änderung:
  IndexedDB speichern → In-Memory Cache aktualisieren
  
App-Ende:
  In-Memory Cache wird verworfen
  Daten bleiben in IndexedDB ✅
```

## Bekannte Einschränkungen

### 1. Cache-Initialisierung
- **Cache muss beim App-Start initialisiert werden**
- Vor Initialisierung werden Default-Werte verwendet
- **Lösung**: `initApiConfigCache()` in `main.js` aufrufen

### 2. Synchronisations-Verzögerung
- Config wird **sofort** zum In-Memory Cache synchronisiert
- Aber: Bei parallel laufenden API-Calls könnte es zu Race Conditions kommen
- **Lösung**: Config-Änderungen triggern automatisches Cache-Update

### 3. Cache bei Page-Reload
- In-Memory Cache wird bei Page-Reload geleert
- Beim nächsten Start wird Cache aus IndexedDB neu geladen
- **Kein Problem**: Automatische Initialisierung

### 4. Inkognito-Modus
- IndexedDB kann in manchen Browsern eingeschränkt sein
- **Fallback**: DEFAULT_CONFIG wird verwendet
- Cache funktioniert normal (nur nicht persistent)

## Best Practices

### 1. Sinnvolle Timeout-Werte
```javascript
// ✅ Gut
apiTimeout: 10000  // 10 Sekunden

// ⚠️ Zu kurz (kann zu Timeout-Fehlern führen)
apiTimeout: 1000   // 1 Sekunde

// ⚠️ Zu lang (schlechte UX)
apiTimeout: 60000  // 60 Sekunden
```

### 2. Retry-Strategie
```javascript
// ✅ Gut
maxRetries: 3  // 3 Versuche

// ⚠️ Zu viele (Server-Belastung)
maxRetries: 10

// ❌ Keine Retries
maxRetries: 0  // Nur für spezielle Fälle
```

### 3. Config-Aktualisierung
Nach Änderung der Server-Einstellungen:
- ✅ **Automatisch**: Cache wird sofort aktualisiert
- ✅ **Keine Action erforderlich**: Nächster API-Call verwendet neue Config
- ⚠️ **Bereits laufende Requests**: Verwenden alte Config (bis abgeschlossen)

## Geänderte Dateien

- ✅ `/src/utils/ApiConfigHelper.js` - In-Memory Cache + IndexedDB statt localStorage
- ✅ `/src/stores/ConfigStorage.js` - Cache-Update-Trigger hinzugefügt
- ✅ `/src/main.js` - initApiConfigCache() beim App-Start
- ✅ `/docs/API_TIMEOUT_CONFIG.md` - Aktualisierte Dokumentation

## Unverändert (funktioniert bereits)

- ✅ `/src/api/ApiUser.js` - Verwendet ApiConfigHelper
- ✅ `/src/api/ApiApartment.js` - Verwendet ApiConfigHelper
- ✅ `/src/api/ApiBuilding.js` - Verwendet ApiConfigHelper
- ✅ `/src/api/ApiConfig.js` - Verwendet ApiConfigHelper
- ✅ `/src/api/ApiRecords.js` - Verwendet ApiConfigHelper
- ✅ `/src/views/pages/ConfigSettings.vue` - UI für Admin

## Zukünftige Verbesserungen

1. **Event-basierte Config-Updates**: Benachrichtigung aller API-Clients bei Config-Änderung
2. **Per-Endpoint-Konfiguration**: Unterschiedliche Timeouts für verschiedene Endpunkte
3. **Automatische Timeout-Anpassung**: Basierend auf Netzwerkgeschwindigkeit
4. **Config-Versionierung**: Breaking Changes in Config-Struktur tracken

## Autor

- **Datum**: 2026-02-19
- **Implementiert von**: GitHub Copilot

---

**Status**: ✅ Implementiert, funktioniert korrekt
