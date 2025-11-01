# ControllerApartments API-Dokumentation

## Übersicht
Der ControllerApartments stellt verschiedene API-Endpunkte zur Verwaltung von Apartments bereit:

- Apartments auflisten, abrufen, erstellen, bearbeiten, löschen
- Synchronisation von Apartments (Offline-Modus)

---

## Endpunkte und Zweck

### 1. Apartments auflisten
**GET /apartments/list**
- Zweck: Alle Apartments auflisten (optional nach Gebäude)
- Erwartet: Optional `buildingId` als Subresource
- Antwort: Array mit Apartmentdaten
- Rückgabewerte pro Apartment:
  - `id`: Apartment-ID
  - `building_id`: Gebäude-ID
  - `number`: Apartment-Nummer
  - `floor`: Etage
  - `min_flush_duration`: Minimale Spüldauer
  - `last_flush_date`: Datum der letzten Spülung (NEU)
  - `next_flush_due`: Nächstes Spüldatum (NEU)
  - `enabled`: Aktiv-Status
  - `sorted`: Sortierreihenfolge
  - `created_at`: Erstellungsdatum
  - `updated_at`: Aktualisierungsdatum
- Beispiel:
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "building_id": 2,
      "number": "A12",
      "floor": "2",
      "min_flush_duration": 20,
      "last_flush_date": "2025-10-10 08:00:00",
      "next_flush_due": "2025-10-17 08:00:00",
      "enabled": true,
      "sorted": 0,
      "created_at": "2025-10-01 12:00:00",
      "updated_at": "2025-10-13 09:00:00"
    }
  ]
}
```

### 2. Einzelnes Apartment abrufen
**GET /apartments/get/{id}**
- Zweck: Apartmentdaten anhand der ID abrufen
- Antwort: Apartmentdaten (siehe Felder oben)
- Beispiel:
```bash
curl -X GET https://example.com/api/apartments/get/5
```

### 3. Apartment erstellen
**POST /apartments/create**
- Zweck: Neues Apartment anlegen (Admin/Supervisor)
- Erwartet: JSON mit `building_id`, `number`, `floor`, `min_flush_duration`, `enabled`, `sorted`
- Antwort: Erfolgs-/Fehlerobjekt mit Apartmentdaten
- Beispiel:
```bash
curl -X POST https://example.com/api/apartments/create -d '{"building_id":1,"number":"A12","floor":"2"}'
```

### 4. Apartment löschen
**DELETE /apartments/remove/{id}**
- Zweck: Apartment löschen (Admin/Supervisor)
- Antwort: Erfolgs-/Fehlerobjekt

### 5. Apartment bearbeiten
**POST /apartments/update/{id}**
- Zweck: Apartmentdaten ändern
- Erwartet: JSON mit Feldern wie `number`, `floor`, `min_flush_duration`, `enabled`, `sorted`
- Antwort: Erfolgs-/Fehlerobjekt

### 6. Apartments synchronisieren
**POST /apartments/sync**
- Zweck: Apartments aus Offline-Modus synchronisieren (Admin/Supervisor)
- Erwartet: Array von Apartments mit Feldern wie `id`, `building_id`, `apartment_number`, `floor`, `rental_status`
- Antwort: Objekt mit Listen der erstellten/aktualisierten Apartments und Fehlern
- Beispiel:
```bash
curl -X POST https://example.com/api/apartments/sync -d '[{"building_id":1,"apartment_number":"A12","floor":2}]'
```

---

## Beispielantworten

**Erfolgreiches Erstellen:**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "building_id": 1,
    "number": "A12",
    "floor": "2",
    "min_flush_duration": 20,
    "last_flush_date": "2025-10-10 08:00:00",
    "next_flush_due": "2025-10-17 08:00:00",
    "enabled": true,
    "sorted": 0
  },
  "message": "Apartment created successfully"
}
```

**Fehlerhafte Anfrage:**
```json
{
  "success": false,
  "error": "Apartment number already exists in this building"
}
```

---

## Hinweise
- Die Felder `last_flush_date` und `next_flush_due` geben den Status der letzten und nächsten Spülung des Apartments an.
- Die Rückgabewerte sind in allen relevanten Endpunkten konsistent.
- Stand: 13.10.2025, letzte Änderung: Felder last_flush_date und next_flush_due ergänzt.
