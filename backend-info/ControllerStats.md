# ControllerStats API-Dokumentation

## Übersicht
Der ControllerStats stellt zwei API-Endpunkte bereit, um Arbeitsstatistiken und Monatsdaten zu liefern:

- **GET /stats/work/{id}**: Liefert umfangreiche Arbeitsstatistiken für einen Benutzer.
- **GET /stats/export/{month}**: Exportiert alle Arbeitsdaten eines Monats als Array.

---

## Endpunkt: `GET /stats/work/{id}`

### Zweck
Ermittelt alle Arbeitsstatistiken für einen Benutzer (z.B. Anzahl Einträge, Dauer, Tages-, Gebäude-, Wohnungs-, Stunden-, Wochen-, Monatsstatistiken, Effizienz, GPS, Durchschnittswerte).

### Request
- **Pfadparameter:** `{id}` (Benutzer-ID, optional. Wenn nicht angegeben, wird die eigene UID verwendet)
- **Methode:** GET

### Response
- **Status 200:**
  ```json
  {
    "success": true,
    "data": {
      "user_id": 42,
      "total_entries": 123,
      "total_duration_seconds": 45678,
      "total_duration_formatted": "12h 41m 18s",
      "total_days_worked": 17,
      "daily_statistics": [ ... ],
      "building_statistics": [ ... ],
      "apartment_statistics": [ ... ],
      "hourly_statistics": [ ... ],
      "weekday_statistics": [ ... ],
      "monthly_statistics": [ ... ],
      "efficiency_metrics": { ... },
      "gps_statistics": { ... },
      "averages": { ... }
    }
  }
  ```
- **Status 400/404/500:** Fehlerobjekt mit `success: false` und Fehlerbeschreibung

### Beispiel
```bash
curl -X GET https://example.com/api/stats/work/42
```

---

## Endpunkt: `GET /stats/export/{month}`

### Zweck
Exportiert alle Arbeitsdaten eines Monats (Format YYYY-MM) als Array, inkl. Zusammenfassungen pro Benutzer und Gebäude. Die Daten können für PDF/CSV-Export weiterverarbeitet werden.

### Request
- **Pfadparameter:** `{month}` (Format: YYYY-MM, z.B. 2025-10)
- **Methode:** GET

### Response
- **Status 200:**
  ```json
  {
    "success": true,
    "data": {
      "export_month": "2025-10",
      "export_date": "2025-10-12 14:00:00",
      "total_records": 99,
      "total_duration_seconds": 12345,
      "total_duration_formatted": "3h 25m 45s",
      "period_start": "2025-10-01 00:00:00",
      "period_end": "2025-10-31 23:59:59",
      "records": [ ... ],
      "summary": {
        "users": [ ... ],
        "buildings": [ ... ]
      }
    }
  }
  ```
- **Status 400/500:** Fehlerobjekt mit `success: false` und Fehlerbeschreibung

### Beispiel
```bash
curl -X GET https://example.com/api/stats/export/2025-10
```

---

## Hinweise zur Verwendung
- Die Endpunkte sind für die Analyse und den Export von Arbeitsdaten konzipiert.
- Die Antwortdaten sind für die Weiterverarbeitung (z.B. Visualisierung, PDF/CSV-Export) geeignet.
- Fehler werden als JSON mit `success: false` und einer Fehlerbeschreibung zurückgegeben.

## Felder in den Antworten
- **daily_statistics**: Array mit Tagesdaten (Datum, Einträge, Dauer, Gebäude, Arbeitszeitspanne)
- **building_statistics**: Array mit Statistiken pro Gebäude
- **apartment_statistics**: Array mit Statistiken pro Wohnung
- **hourly_statistics**: Array mit Statistiken pro Stunde
- **weekday_statistics**: Array mit Statistiken pro Wochentag
- **monthly_statistics**: Array mit Statistiken pro Monat
- **efficiency_metrics**: Kürzeste, längste und Median-Dauer
- **gps_statistics**: GPS-Genauigkeit und Anzahl
- **averages**: Durchschnittswerte

## Beispiel für Weiterverarbeitung
Die exportierten Daten können direkt für die Erstellung von Berichten, Statistiken oder für den CSV/PDF-Export genutzt werden.
