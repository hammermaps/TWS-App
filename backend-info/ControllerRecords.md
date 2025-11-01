# ControllerRecords API-Dokumentation

Die ControllerRecords-Klasse stellt REST-API-Endpunkte zur Verwaltung von Spüldatensätzen bereit. Sie ermöglicht das Erstellen, Aktualisieren, Löschen, Abfragen und Synchronisieren von Records.

## Endpunkte und deren Zweck

### 1. Records-Liste abrufen
**POST/GET /records/list**
- Gibt eine Liste aller Records zurück, optional gefiltert nach building_id, apartment_id, user_id, start_date, end_date.
- Unterstützt Sortierung und Paginierung über folgende optionale Parameter:
  - `limit`: Maximale Anzahl der zurückgegebenen Datensätze
  - `offset`: Startindex für die Rückgabe (z.B. für Paging)
  - `order_by`: Sortierfeld (`start_time`, `end_time`, `created_at`, `duration`)
  - `order`: Sortierreihenfolge (`ASC` oder `DESC`)
- Normale Nutzer sehen nur ihre eigenen Records.
- **Request-Body (POST) Beispiel:**
  ```json
  { "building_id": 1, "start_date": "2025-10-01", "end_date": "2025-10-12", "limit": 10, "offset": 20, "order_by": "start_time", "order": "DESC" }
  ```
- **Antwort:**
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "apartment_id": 2, "building_id": 1, "user_id": 5, "start_time": "2025-10-12 10:00:00", "end_time": "2025-10-12 10:10:00", "duration": 600, "latitude": 51.5, "longitude": 7.4, "location_accuracy": 5.0 }
    ]
  }
  ```

### 2. Einzelnen Record abrufen
**GET /records/get/{id}**
- Gibt die Daten eines Records anhand der ID zurück.
- **Antwort:**
  ```json
  {
    "success": true,
    "data": { "id": 1, "apartment_id": 2, "building_id": 1, "user_id": 5, "start_time": "2025-10-12 10:00:00", "end_time": "2025-10-12 10:10:00", "duration": 600, "latitude": 51.5, "longitude": 7.4, "location_accuracy": 5.0, "created_at": "2025-10-12 10:00:00", "updated_at": "2025-10-12 10:10:00" }
  }
  ```

### 3. Record erstellen
**POST /records/create**
- Erstellt einen neuen Record.
- Normale Nutzer können nur für sich selbst Records erstellen.
- **Request-Body:**
  ```json
  { "apartment_id": 2, "building_id": 1, "user_id": 5, "start_time": "2025-10-12T10:00:00Z", "end_time": "2025-10-12T10:10:00Z", "latitude": 51.5, "longitude": 7.4, "location_accuracy": 5.0 }
  ```
- **Antwort:**
  ```json
  {
    "success": true,
    "data": { "id": 1, "apartment_id": 2, "building_id": 1, "user_id": 5, "start_time": "2025-10-12 10:00:00", "end_time": "2025-10-12 10:10:00", "duration": 600, "latitude": 51.5, "longitude": 7.4, "location_accuracy": 5.0, "created_at": "2025-10-12 10:00:00", "updated_at": "2025-10-12 10:10:00" }
  }
  ```
  
### 4. Record löschen
**DELETE /records/remove/{id}**
- Löscht einen Record anhand der ID.
- Nur Admins, Supervisoren oder der Owner selbst dürfen löschen.
- **Antwort:**
  ```json
  {
    "success": true,
    "message": "Record deleted"
  }
  ```

### 5. Record aktualisieren
**POST /records/update/{id}**
- Aktualisiert die Daten eines Records.
- Nur Admins/Supervisoren dürfen aktualisieren.
- **Request-Body:**
  ```json
  { "start_time": "2025-10-12T10:05:00Z", "end_time": "2025-10-12T10:15:00Z" }
  ```
- **Antwort:**
  ```json
  {
    "success": true,
    "message": "Record updated"
  }
  ```

### 6. Records synchronisieren
**POST /records/sync**
- Synchronisiert eine Liste von Records (z.B. aus Offline-Modus).
- Neue Datensätze werden erstellt, bestehende aktualisiert.
- **Request-Body:**
  ```json
  [
    { "apartment_id": 2, "building_id": 1, "user_id": 5, "start_time": "2025-10-12T10:00:00Z", "end_time": "2025-10-12T10:10:00Z" },
    { "id": 1, "apartment_id": 2, "building_id": 1, "user_id": 5, "start_time": "2025-10-12T10:05:00Z", "end_time": "2025-10-12T10:15:00Z" }
  ]
  ```
- **Antwort:**
  ```json
  {
    "success": true,
    "created": 1,
    "updated": 1,
    "errors": [],
    "records": [ ...aktuelle Record-Liste des Nutzers... ]
  }
  ```

## Beispiel für die Verwendung

### Record erstellen (cURL)
```bash
curl -X POST https://api.example.com/records/create \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"apartment_id":2,"building_id":1,"user_id":5,"start_time":"2025-10-12T10:00:00Z","end_time":"2025-10-12T10:10:00Z"}'
```

### Records-Liste abfragen (cURL)
```bash
curl -X GET https://api.example.com/records/list \
  -H "Authorization: Bearer <TOKEN>"
```

### Records synchronisieren (cURL)
```bash
curl -X POST https://api.example.com/records/sync \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '[{"apartment_id":2,"building_id":1,"user_id":5,"start_time":"2025-10-12T10:00:00Z","end_time":"2025-10-12T10:10:00Z"}]'
```

## Hinweise
- Alle Endpunkte erfordern Authentifizierung.
- Normale Nutzer können nur ihre eigenen Records sehen und erstellen.
- Nur Admins und Supervisoren dürfen Records anderer Nutzer aktualisieren oder löschen.
- Fehler werden als `success: false` und mit passender Fehlermeldung zurückgegeben.
- Duration `duration:600` wird automatisch aus start_time und end_time berechnet.
- Die Parameter `limit`, `offset`, `order_by` und `order` ermöglichen eine flexible Sortierung und Paginierung der Ergebnismenge.
- Sortierfelder: `start_time`, `end_time`, `created_at`, `duration`.
- Stand: 13.10.2025, letzte Änderung: Sortierung und Limits in /records/list ergänzt.
