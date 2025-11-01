# ControllerConfig API-Dokumentation

Die ControllerConfig-Klasse stellt REST-API-Endpunkte zur Verwaltung der Anwendungskonfiguration bereit. Sie ermöglicht das Laden, Setzen, Zurücksetzen und gezielte Entfernen von Konfigurationswerten – sowohl global als auch benutzerspezifisch.

## Endpunkte und deren Zweck

### 1. Konfiguration abrufen
**GET /config/get**
- Gibt die aktuelle Konfiguration zurück (global und benutzerspezifisch, falls angemeldet).
- **Antwort:**
  ```json
  {
    "success": true,
    "data": {
      "vdi6023": { ... },
      "server": { ... },
      "ui": { ... },
      "notifications": { ... },
      "sync": { ... }
    }
  }
  ```

### 2. Konfiguration setzen
**POST /config/set**
- Setzt neue Konfigurationswerte (global nur für Admins, benutzerspezifisch für eingeloggte Nutzer).
- **Request-Body:**
  ```json
  { "ui": { "theme": "dark" }, "notifications": { "enabled": false } }
  ```
- **Antwort:**
  ```json
  {
    "success": true,
    "data": { ...aktuelle Konfiguration... }
  }
  ```

### 3. Konfiguration zurücksetzen
**DELETE /config/reset**
- Setzt die Konfiguration auf die Standardwerte zurück (global nur für Admins, benutzerspezifisch für eingeloggte Nutzer).
- **Antwort:**
  ```json
  {
    "success": true,
    "data": { ...Standard-Konfiguration... }
  }
  ```

### 4. Werte gezielt entfernen/ändern
**PUT /config/remove**
- Entfernt oder überschreibt gezielt Werte in der Konfiguration (global nur für Admins, benutzerspezifisch für eingeloggte Nutzer).
- **Request-Body:**
  ```json
  { "ui": { "theme": null }, "notifications": { "enabled": null } }
  ```
- **Antwort:**
  ```json
  {
    "success": true,
    "data": { ...modifizierte Konfiguration... }
  }
  ```

## Beispiel für die Verwendung

### Konfiguration abrufen (cURL)
```bash
curl -X GET https://api.example.com/config/get \
  -H "Authorization: Bearer <TOKEN>"
```

### Konfiguration setzen (cURL)
```bash
curl -X POST https://api.example.com/config/set \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ui":{"theme":"dark"}}'
```

### Konfiguration zurücksetzen (cURL)
```bash
curl -X DELETE https://api.example.com/config/reset \
  -H "Authorization: Bearer <TOKEN>"
```

### Werte entfernen (cURL)
```bash
curl -X PUT https://api.example.com/config/remove \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ui":{"theme":null}}'
```

## Hinweise
- Alle Endpunkte liefern JSON-Antworten.
- Globale Konfiguration darf nur von Admins geändert werden.
- Fehler werden als `success: false` und mit passender Fehlermeldung zurückgegeben.

