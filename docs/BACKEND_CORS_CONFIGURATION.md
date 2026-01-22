# Backend CORS-Konfiguration für wls.dk-automation.de

## Datum
2026-01-10

## Überblick

Die Frontend-Anwendung läuft auf `https://wls.dk-automation.de` und macht API-Anfragen an dasselbe Domain. Da die Anfragen von derselben Domain kommen, sollten keine CORS-Probleme auftreten.

## Erforderliche Backend-Konfiguration

### PHP CORS-Header

Stellen Sie sicher, dass Ihr Backend die folgenden CORS-Header sendet:

```php
<?php
// CORS Headers - Sollten am Anfang jeder API-Datei stehen
header('Access-Control-Allow-Origin: https://wls.dk-automation.de');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=UTF-8');

// Preflight-Request behandeln
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
```

### Wichtige Header-Checks

1. **X-Requested-With**: Das Frontend sendet immer `X-Requested-With: XMLHttpRequest`
2. **Content-Type**: Alle Anfragen verwenden `Content-Type: application/json`
3. **Accept**: Das Frontend erwartet `Accept: application/json`

### Erkennung von JSON-Anfragen im Backend

```php
<?php
// Prüfen ob es eine JSON-Anfrage ist
$isJsonRequest = false;

// Option 1: Via X-Requested-With Header
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
    $isJsonRequest = true;
}

// Option 2: Via Content-Type Header
if (isset($_SERVER['CONTENT_TYPE']) && 
    strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    $isJsonRequest = true;
}

// Option 3: Via Accept Header
if (isset($_SERVER['HTTP_ACCEPT']) && 
    strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
    $isJsonRequest = true;
}

if ($isJsonRequest) {
    // JSON-Antwort senden
    header('Content-Type: application/json');
    // ... Ihre API-Logik
} else {
    // HTML-Antwort oder Fehler
    http_response_code(400);
    echo json_encode(['error' => 'JSON-Anfrage erwartet']);
}
?>
```

## API-Endpoints

Alle API-Endpoints sollten unter `https://wls.dk-automation.de/` erreichbar sein:

```
https://wls.dk-automation.de/health/status
https://wls.dk-automation.de/health/ping
https://wls.dk-automation.de/user/login
https://wls.dk-automation.de/user/register
https://wls.dk-automation.de/buildings
https://wls.dk-automation.de/apartments
https://wls.dk-automation.de/records
https://wls.dk-automation.de/config
```

**Wichtig**: Die URLs enthalten **NICHT** mehr `/api.php` am Ende!

## URL-Rewriting (Apache)

Wenn Sie Apache verwenden, benötigen Sie möglicherweise URL-Rewriting:

```apache
# .htaccess
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # API-Anfragen an api.php weiterleiten
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ api.php [QSA,L]
</IfModule>
```

## URL-Rewriting (Nginx)

Für Nginx:

```nginx
location / {
    try_files $uri $uri/ /api.php?$query_string;
}

# Speziell für API-Requests
location ~ ^/(health|user|buildings|apartments|records|config) {
    try_files $uri /api.php?$query_string;
    
    # CORS Headers
    add_header 'Access-Control-Allow-Origin' 'https://wls.dk-automation.de' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    if ($request_method = 'OPTIONS') {
        return 200;
    }
}
```

## Testing

### Test 1: Health-Endpoint
```bash
curl -X GET https://wls.dk-automation.de/health/status \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Accept: application/json"
```

### Test 2: Login-Endpoint
```bash
curl -X POST https://wls.dk-automation.de/user/login \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Accept: application/json" \
  -d '{"username":"test","password":"123456"}'
```

### Expected Response
```json
{
  "success": true,
  "data": { ... },
  "error": "",
  "server_time": 1768075112,
  "response_time": 0.05
}
```

## Troubleshooting

### Problem: "Endpoint not found"

**Ursache**: URL-Rewriting funktioniert nicht oder der Endpoint existiert nicht

**Lösung**: 
1. Überprüfen Sie die .htaccess oder Nginx-Konfiguration
2. Stellen Sie sicher, dass mod_rewrite aktiviert ist (Apache)
3. Prüfen Sie die Backend-Logs

### Problem: CORS-Fehler trotz korrekter Header

**Ursache**: Preflight-Requests (OPTIONS) werden nicht korrekt behandelt

**Lösung**: Stellen Sie sicher, dass OPTIONS-Requests mit Status 200 beantwortet werden

### Problem: "Invalid JSON"

**Ursache**: Das Backend sendet HTML statt JSON

**Lösung**: 
1. Überprüfen Sie den Content-Type Header
2. Stellen Sie sicher, dass keine PHP-Fehler oder Warnings ausgegeben werden
3. Aktivieren Sie error_reporting nur für Logs, nicht für die Ausgabe

## Wichtige Checks

- [ ] CORS-Header werden gesendet
- [ ] OPTIONS-Requests werden behandelt
- [ ] Content-Type ist application/json
- [ ] Keine `/api.php` in den URLs
- [ ] URL-Rewriting funktioniert
- [ ] X-Requested-With Header wird akzeptiert
- [ ] Session-Cookies werden korrekt gesetzt (mit SameSite=None; Secure für HTTPS)

