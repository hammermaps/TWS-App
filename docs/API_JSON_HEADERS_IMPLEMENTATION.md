# API JSON Headers Implementation

## Übersicht
Alle API-Calls senden jetzt konsistent JSON-spezifische Header, damit PHP-Backend die Anfragen korrekt als JSON-Requests erkennen kann.

## Implementierte Header

### 1. Content-Type: application/json
- Gibt an, dass der Request-Body im JSON-Format ist
- Wird bei POST, PUT, PATCH, DELETE Requests gesendet

### 2. Accept: application/json
- Gibt an, dass der Client eine JSON-Response erwartet
- Wird bei ALLEN Requests gesendet (GET, POST, PUT, PATCH, DELETE)

### 3. X-Requested-With: XMLHttpRequest
- Identifiziert die Anfrage als AJAX-Request
- Hilft PHP zu erkennen, dass es sich um eine asynchrone Anfrage handelt
- Wird bei ALLEN Requests gesendet

## Geänderte Dateien

### 1. Vite Proxy Konfiguration
**Datei:** `/vite.config.mjs`

```javascript
proxy.on('proxyReq', (proxyReq, req, res) => {
  console.log('📤 Sending Request:', req.method, req.url)
  // Stelle sicher, dass JSON-Headers für alle Requests gesetzt sind
  proxyReq.setHeader('Content-Type', 'application/json')
  proxyReq.setHeader('Accept', 'application/json')
  // X-Requested-With Header für Backend-Erkennung
  proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest')
})
```

**Änderung:** Header werden jetzt für ALLE Requests gesetzt, nicht nur für POST/PUT/PATCH.

### 2. API Client Klassen

Alle API-Client-Klassen wurden aktualisiert, um die Header zu senden:

#### ApiConfig.js
```javascript
const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'http://localhost:3001',
    ...request.headers,
    ...getAuthHeaders()
}
```

#### ApiBuilding.js
```javascript
const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'http://localhost:3001',
    ...request.headers,
    ...getAuthHeaders()
}
```

#### ApiApartment.js
```javascript
const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'http://localhost:3001',
    ...request.headers,
    ...getAuthHeaders()
}
```

#### ApiRecords.js
```javascript
const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'http://localhost:3001',
    ...request.headers,
    ...getAuthHeaders()
}
```

#### ApiUser.js
```javascript
const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'http://localhost:3001',
    ...request.headers,
    ...getAuthHeaders()
}
```

#### ApiHealth.js (Axios)
```javascript
this.client = axios.create({
  baseURL: this.baseUrl,
  timeout: getApiTimeout(null),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
})
```

## PHP Backend - Header-Erkennung

Das PHP-Backend kann nun die JSON-Anfragen erkennen mit:

```php
// Prüfe ob es sich um eine JSON-Anfrage handelt
$isJson = false;

// Methode 1: Content-Type Header prüfen
if (isset($_SERVER['CONTENT_TYPE']) && 
    strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    $isJson = true;
}

// Methode 2: Accept Header prüfen
if (isset($_SERVER['HTTP_ACCEPT']) && 
    strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
    $isJson = true;
}

// Methode 3: X-Requested-With Header prüfen (AJAX)
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
    $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
    $isJson = true;
}

// JSON-Input parsen
if ($isJson) {
    $input = json_decode(file_get_contents('php://input'), true);
}
```

## Vorteile

1. **Konsistente API-Kommunikation**: Alle Requests verwenden dieselben Header
2. **Backend-Erkennung**: PHP kann eindeutig JSON-Requests identifizieren
3. **AJAX-Erkennung**: X-Requested-With ermöglicht Unterscheidung zwischen AJAX und normalen Requests
4. **CORS-Kompatibilität**: Korrekte Header für Cross-Origin Requests

## Testing

### Development Mode
```bash
npm run dev
```

Überprüfen Sie in den Browser-DevTools (Network Tab), dass alle Requests folgende Header haben:
- `Content-Type: application/json`
- `Accept: application/json`
- `X-Requested-With: XMLHttpRequest`

### Production Build
```bash
npm run build
npm run preview
```

Die Header sollten auch im Production-Build korrekt gesetzt sein.

## Status
✅ Vite Proxy-Konfiguration aktualisiert
✅ Alle 6 API-Client-Klassen aktualisiert
✅ Header werden für alle Request-Typen gesendet
✅ Keine Fehler beim Build

