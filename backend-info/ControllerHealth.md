# ControllerHealth API-Dokumentation

Die ControllerHealth-Klasse stellt REST-API-Endpunkte zur Überprüfung des Server- und Dienstestatus bereit. Sie dient zur Überwachung und Diagnose der wichtigsten Systemkomponenten.

## Endpunkte und deren Zweck

### 1. Server- und Dienstestatus abrufen
**GET /health/status**
- Prüft den Zustand von Datenbank, Filesystem und Cache.
- Gibt den Gesamtstatus ("healthy" oder "degraded") und Detailinfos zurück.
- **Antwort:**
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "server": "Development Server",
      "server_info": {
        "version": "1.0.0",
        "uptime": "5 days",
        "load": "0.12",
        "memory_usage": { "used": 12345678, "peak": 23456789, "limit": 134217728 }
      },
      "services": {
        "database": true,
        "filesystem": true,
        "cache": true
      }
    }
  }
  ```
  Falls ein Service nicht gesund ist, wird `status: degraded` und HTTP 503 gesendet.

### 2. Ping-Endpoint
**GET /health/ping**
- Antwortet immer mit "pong".
- Wird für Load Balancer und einfache Verfügbarkeitsprüfungen genutzt.
- **Antwort:**
  ```json
  {
    "success": true,
    "data": { "message": "pong" }
  }
  ```

### 3. Systeminformationen abrufen (nur Admin)
**GET /health/system**
- Zeigt detaillierte Informationen zu PHP, Server und Datenbank.
- Nur für authentifizierte Admins.
- **Antwort:**
  ```json
  {
    "success": true,
    "data": {
      "php": { "version": "8.2.0", "sapi": "fpm-fcgi" },
      "server": { "os": "Linux ...", "software": "Apache/2.4.41" },
      "database": { "driver": "mysql", "version": "8.0.32", "connection_status": "..." }
    }
  }
  ```

## Beispiel für die Verwendung

### Status abfragen (cURL)
```bash
curl -X GET https://api.example.com/health/status
```

### Ping abfragen (cURL)
```bash
curl -X GET https://api.example.com/health/ping
```

### Systeminfo für Admin (cURL)
```bash
curl -X GET https://api.example.com/health/system \
  -H "Authorization: Bearer <TOKEN>"
```

## Hinweise
- Alle Endpunkte liefern JSON-Antworten.
- Der Endpunkt /health/system ist nur für Admins zugänglich.
- Fehler werden als `success: false` und mit passender Fehlermeldung zurückgegeben.

