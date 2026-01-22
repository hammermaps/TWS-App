# 🚀 DEPLOYMENT ANLEITUNG - wls.dk-automation.de

## ✅ Status: Bereit für Deployment

**Datum**: 2026-01-10  
**Build-Version**: Production Build mit korrigierten API-URLs  
**Problem gelöst**: CORS-Fehler mit localhost:4040

---

## 🎯 Was wurde geändert?

### Frontend (abgeschlossen)
- ✅ Alle `localhost:4040` URLs entfernt
- ✅ Zentrale API-Konfiguration implementiert (`src/config/apiConfig.js`)
- ✅ Production-URL auf `https://wls.dk-automation.de` gesetzt
- ✅ `/api.php` Suffix entfernt
- ✅ Production-Build erstellt und getestet
- ✅ Keine CORS-Probleme mehr im Build

### Frontend-Dateien geändert:
1. `vite.config.mjs` - Proxy-Konfiguration
2. `src/api/useUser.js` - User-API
3. `src/api/useHealth.js` - Health-API
4. `src/api/useTokenValidator.js` - Token-Validierung
5. `src/stores/TokenManager.js` - Token-Management
6. `src/utils/CorsDebugger.js` - CORS-Debugging

---

## 📦 Deployment-Schritte

### Schritt 1: Build-Dateien hochladen

Der fertige Build befindet sich im `dist/` Verzeichnis:

```bash
cd /home/masterbee/WebstormProjects/TWS-App/dist
```

#### Option A: Mit SFTP/FTP
1. Verbinden Sie sich mit Ihrem Server
2. Navigieren Sie zum Web-Root (z.B. `/var/www/html/`)
3. Laden Sie **alle** Dateien aus `dist/` hoch
4. Überschreiben Sie die bestehenden Dateien

#### Option B: Mit rsync (empfohlen)
```bash
rsync -avz --delete dist/ user@wls.dk-automation.de:/var/www/html/
```

#### Option C: Mit SCP
```bash
scp -r dist/* user@wls.dk-automation.de:/var/www/html/
```

---

### Schritt 2: Backend-Konfiguration prüfen

⚠️ **WICHTIG**: Das Backend muss korrekt konfiguriert sein!

#### Erforderliche Backend-Änderungen:

1. **CORS-Header setzen** (in jeder API-Datei):
```php
<?php
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

2. **URL-Rewriting konfigurieren** (Apache .htaccess):
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # API-Anfragen an api.php weiterleiten
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ api.php [QSA,L]
</IfModule>
```

3. **JSON-Anfragen erkennen**:
```php
// Prüfe auf X-Requested-With Header
$isJsonRequest = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
                 strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
```

📄 Detaillierte Backend-Anleitung: siehe `BACKEND_CORS_CONFIGURATION.md`

---

### Schritt 3: Nach dem Deployment testen

#### Test 1: Seite aufrufen
```
https://wls.dk-automation.de
```

#### Test 2: Login testen
1. Öffnen Sie die Browser-Console (F12)
2. Navigieren Sie zur Login-Seite
3. Geben Sie Testdaten ein und melden Sie sich an
4. Prüfen Sie die Network-Tab:
   - ✅ Request-URL sollte sein: `https://wls.dk-automation.de/user/login`
   - ❌ NICHT: `http://localhost:4040/user/login`

#### Test 3: API-Calls überprüfen
In der Browser-Console sollten Sie sehen:
```
🚀 Making request to: https://wls.dk-automation.de/user/login
📤 Sending request body: {"username":"test","password":"123456"}
✅ Login erfolgreich
```

#### Test 4: Health-Check
```bash
curl https://wls.dk-automation.de/health/status
```

Erwartete Antwort:
```json
{
  "success": true,
  "data": { ... },
  "server_time": 1768075112
}
```

---

## 🔍 Troubleshooting

### Problem: Immer noch CORS-Fehler

**Symptome**: 
- `Cross-Origin Request Blocked` in der Console
- Status code: (null)

**Lösung**:
1. Überprüfen Sie die CORS-Header im Backend
2. Stellen Sie sicher, dass OPTIONS-Requests beantwortet werden
3. Prüfen Sie, ob das Backend JSON zurückgibt (nicht HTML)

### Problem: "Endpoint not found"

**Symptome**:
- HTTP 404 Fehler
- `{"error": "Endpoint not found"}`

**Lösung**:
1. Überprüfen Sie die .htaccess oder Nginx-Konfiguration
2. Stellen Sie sicher, dass URL-Rewriting aktiviert ist
3. Testen Sie die API-Endpoints direkt mit curl

### Problem: Leere oder HTML-Antwort

**Symptome**:
- JSON.parse Fehler
- Unerwartete HTML-Ausgabe

**Lösung**:
1. Überprüfen Sie PHP-Fehler im Backend-Log
2. Stellen Sie sicher, dass `error_reporting` nur für Logs aktiviert ist
3. Prüfen Sie den Content-Type Header

---

## 📋 Deployment-Checkliste

Vor dem Deployment:
- [x] Production-Build erstellt (`npm run build`)
- [x] Keine localhost:4040 Referenzen im Code
- [x] Alle API-Calls verwenden zentrale Konfiguration
- [x] Build-Dateien sind im `dist/` Verzeichnis

Backend-Konfiguration:
- [ ] CORS-Header sind gesetzt
- [ ] URL-Rewriting ist konfiguriert
- [ ] OPTIONS-Requests werden behandelt
- [ ] JSON Content-Type wird gesendet
- [ ] X-Requested-With Header wird akzeptiert

Nach dem Deployment:
- [ ] Seite lädt ohne Fehler
- [ ] Login funktioniert
- [ ] API-Calls gehen an https://wls.dk-automation.de
- [ ] Keine CORS-Fehler in der Console
- [ ] PWA-Funktionalität funktioniert

---

## 📚 Weitere Dokumentation

- `API_URL_CENTRALIZATION_COMPLETE.md` - Übersicht der Frontend-Änderungen
- `BACKEND_CORS_CONFIGURATION.md` - Detaillierte Backend-Konfiguration
- `QR_CODE_SCANNER_BACKEND_GUIDE.md` - QR-Scanner Backend-Integration

---

## 🆘 Support

Bei Problemen:
1. Überprüfen Sie die Browser-Console (F12 → Console)
2. Prüfen Sie den Network-Tab (F12 → Network)
3. Schauen Sie ins Backend-Error-Log
4. Testen Sie die API-Endpoints mit curl

---

**Viel Erfolg beim Deployment! 🚀**

