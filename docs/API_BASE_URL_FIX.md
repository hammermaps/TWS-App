# API Base URL Import-Fix

## Problem
Die Anwendung zeigte den Fehler: `Uncaught ReferenceError: getApiBaseUrl is not defined` in mehreren API-Client-Klassen.

## Ursache
Die Funktion `getApiBaseUrl()` wurde in verschiedenen API-Client-Dateien verwendet, aber nicht importiert.

## Lösung

### 1. Import in allen betroffenen Dateien hinzugefügt

Die folgenden Dateien wurden korrigiert, indem der Import hinzugefügt wurde:

```javascript
import { getApiBaseUrl } from '../config/apiConfig.js'
```

**Betroffene Dateien:**
- `/src/api/ApiConfig.js`
- `/src/api/ApiHealth.js`
- `/src/api/ApiRecords.js`
- `/src/api/ApiUser.js`
- `/src/api/ApiApartment.js`
- `/src/api/ApiBuilding.js`

### 2. Production API URL korrigiert

Die `PRODUCTION_API_URL` in `/src/config/apiConfig.js` wurde auf die Basis-URL gesetzt:

```javascript
export const PRODUCTION_API_URL = 'https://wls.dk-automation.de'
```

Die Vite Proxy-Konfiguration wurde ebenfalls angepasst:

```javascript
rewrite: (path) => path.replace(/^\/api/, '')
```

## Warum diese Änderung notwendig war

### Development-Modus
- API-Anfragen: `/api/health/status`
- Vite-Proxy leitet um zu: `https://wls.dk-automation.de/health/status`

### Production-Modus
- API-Anfragen: `https://wls.dk-automation.de/health/status`
- Direkte Verbindung ohne Proxy

## Verwendung

Die `getApiBaseUrl()`-Funktion wird automatisch in den API-Client-Klassen verwendet:

```javascript
export class ApiHealthClient {
  constructor(baseUrl = null) {
    this.baseUrl = baseUrl || getApiBaseUrl()
    // ...
  }
}
```

## Testen

### Development
```bash
npm run dev
```
Die Anwendung sollte sich mit dem Backend über den Vite-Proxy verbinden.

### Production Build
```bash
npm run build
```
Der Build sollte die Production-URL verwenden.

## Status
✅ Alle Imports korrigiert
✅ Production-URL angepasst
✅ Keine Fehler mehr beim Laden der Module

