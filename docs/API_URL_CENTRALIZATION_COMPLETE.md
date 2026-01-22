# API-URL Zentralisierung - Abgeschlossen

## Datum
2026-01-10

## Problem
Die Anwendung verwendete hartcodierte `localhost:4040` URLs in mehreren Dateien statt der zentralen API-Konfiguration. Dies führte zu Problemen bei der Umstellung auf die neue Backend-URL `https://wls.dk-automation.de`.

## Lösung
Alle betroffenen Dateien wurden aktualisiert, um die zentrale `getApiBaseUrl()` Funktion aus `src/config/apiConfig.js` zu verwenden.

## Geänderte Dateien

### 1. **vite.config.mjs**
- Proxy-Target von `https://wls.dk-automation.de/api.php` auf `https://wls.dk-automation.de` geändert
- Entfernt den `/api.php` Suffix aus der URL

### 2. **src/api/useUser.js**
```diff
- import { ref, computed, readonly } from 'vue'
+ import { ref, computed, readonly } from 'vue'
+ import { getApiBaseUrl } from '../config/apiConfig.js'

- const apiBaseUrl = baseUrl || (import.meta.env.DEV ? '/api' : 'http://localhost:4040')
+ const apiBaseUrl = baseUrl || getApiBaseUrl()
```

### 3. **src/api/useHealth.js**
```diff
- import { ref } from 'vue'
+ import { ref } from 'vue'
+ import { getApiBaseUrl } from '../config/apiConfig.js'

- const apiBaseUrl = baseUrl || (import.meta.env.DEV ? '/api' : 'http://localhost:4040')
+ const apiBaseUrl = baseUrl || getApiBaseUrl()
```

### 4. **src/api/useTokenValidator.js**
```diff
- import { useOnlineStatusStore } from '../stores/OnlineStatus.js'
+ import { useOnlineStatusStore } from '../stores/OnlineStatus.js'
+ import { getApiBaseUrl } from '../config/apiConfig.js'

- const apiBaseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:4040'
+ const apiBaseUrl = getApiBaseUrl()
```

### 5. **src/stores/TokenManager.js**
```diff
- import { useOnlineStatusStore } from './OnlineStatus.js'
+ import { useOnlineStatusStore } from './OnlineStatus.js'
+ import { getApiBaseUrl } from '../config/apiConfig.js'

// Zwei Stellen geändert:
- const baseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:4040'
+ const baseUrl = getApiBaseUrl()
```

### 6. **src/utils/CorsDebugger.js**
```diff
+ import { getApiBaseUrl } from '../config/apiConfig.js'

  export class CorsDebugger {
    constructor() {
-     this.baseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:4040'
+     this.baseUrl = getApiBaseUrl()
    }
  }
```

## Zentrale API-Konfiguration

Die zentrale Konfiguration in `src/config/apiConfig.js` bleibt unverändert:

```javascript
export const PRODUCTION_API_URL = 'https://wls.dk-automation.de'
export const DEVELOPMENT_API_URL = '/api'

export function getApiBaseUrl() {
  return import.meta.env.DEV ? DEVELOPMENT_API_URL : PRODUCTION_API_URL
}
```

## Vorteile

1. **Single Source of Truth**: Alle API-URLs werden zentral verwaltet
2. **Einfache Wartung**: URL-Änderungen müssen nur an einer Stelle vorgenommen werden
3. **Konsistenz**: Alle API-Clients verwenden dieselbe Basis-URL
4. **Keine hartcodierten URLs**: Flexibler für verschiedene Umgebungen

## URL-Routing

### Development-Modus
```
Client → /api → Vite Proxy → https://wls.dk-automation.de
```

### Production-Modus
```
Client → https://wls.dk-automation.de
```

## Nächste Schritte

1. ✅ **Production-Build erstellt** - Alle Änderungen sind im `dist/` Verzeichnis enthalten
2. 📤 **Build auf Server hochladen** - Laden Sie den Inhalt des `dist/` Verzeichnisses auf `https://wls.dk-automation.de` hoch
3. 🧪 **Login-Funktionalität testen** - Nach dem Upload sollte der Login funktionieren
4. 🔍 **API-Aufrufe im Browser-Console überprüfen** - Verifizieren Sie, dass keine CORS-Fehler mehr auftreten
5. ✅ **Verifizieren**, dass alle Requests an `https://wls.dk-automation.de` gehen

## Build-Informationen

- **Build-Datum**: 2026-01-10
- **Größe**: ~1.8 MB (67 precache entries)
- **Service Worker**: ✅ Generiert
- **PWA**: ✅ Konfiguriert
- **Keine localhost:4040 Referenzen** im Build enthalten

## Deployment

Laden Sie den gesamten Inhalt des `dist/` Verzeichnisses auf Ihren Webserver hoch:

```bash
# Beispiel mit rsync
rsync -avz --delete dist/ user@wls.dk-automation.de:/var/www/html/

# Oder mit FTP/SFTP
# Kopieren Sie alle Dateien aus dist/ in das Root-Verzeichnis Ihres Webservers
```

## Hinweise

- Der Vite-Proxy ist nur im Development-Modus aktiv
- Im Production-Build werden alle `/api` Aufrufe direkt an `https://wls.dk-automation.de` gesendet
- Die JSON-Headers (`Content-Type`, `Accept`, `X-Requested-With`) werden automatisch vom Proxy gesetzt

