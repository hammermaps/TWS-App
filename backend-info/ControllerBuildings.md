# ControllerBuildings

## Zweck
Die Klasse `ControllerBuildings` stellt API-Endpunkte zur Verwaltung von Gebäuden bereit. Sie ermöglicht das Erstellen, Aktualisieren, Löschen, Abfragen und Synchronisieren von Gebäudedaten.

## Endpunkte und Rückgabewerte

### /buildings/list [GET]
Gibt eine Liste aller Gebäude zurück.
- **Rückgabewerte pro Gebäude:**
  - `id`: Gebäude-ID
  - `name`: Name des Gebäudes
  - `hidden`: Status (ob das Gebäude ausgeblendet ist)
  - `sorted`: Sortierreihenfolge
  - `apartments_count`: Anzahl der aktiven Apartments (enabled = true)
  - `created`: Erstellungsdatum
  - `updated`: Aktualisierungsdatum

### /buildings/{id} [GET]
Gibt die Details eines Gebäudes zurück.
- **Rückgabewerte wie oben, inkl. `apartments_count`**

### /buildings/create [POST]
Erstellt ein neues Gebäude.
- **Rückgabe:**
  - `apartments_count` = 0 (neues Gebäude hat noch keine Apartments)

### /buildings/{id} [POST]
Aktualisiert ein Gebäude.
- **Rückgabe:**
  - Aktuelle `apartments_count` für das Gebäude

### /buildings/{id} [DELETE]
Löscht ein Gebäude.

### /buildings/sync [POST]
Synchronisiert Gebäudedaten (offline/online).
- **Rückgabe:**
  - Für jedes Gebäude das Feld `apartments_count`

## apartments_count
Das Feld `apartments_count` gibt die Anzahl der aktiven Apartments (enabled = true) für jedes Gebäude zurück. Die Zählung erfolgt über die Methode `getActiveApartmentsCount($buildingId)`, die alle Apartments mit `enabled = true` für das jeweilige Gebäude zählt.

## Beispielantwort
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Hauptgebäude",
      "hidden": false,
      "sorted": 0,
      "apartments_count": 12,
      "created": "2025-10-01 12:00:00",
      "updated": "2025-10-13 09:00:00"
    }
  ]
}
```

## Hinweise
- Die Zählung der Apartments erfolgt immer aktuell und berücksichtigt nur Apartments mit `enabled = true`.
- Die Logik ist in der Methode `getActiveApartmentsCount` in ControllerBuildings.php implementiert.
- Die Rückgabewerte sind in allen relevanten Endpunkten konsistent.

## Letzte Änderung
13.10.2025: apartments_count in allen Endpunkten ergänzt und Dokumentation aktualisiert.
