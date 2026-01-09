# Datums-Format Integration

## Übersicht

Das Datums-Format aus den Benutzereinstellungen wird nun konsequent in allen datumsbezogenen Anzeigen in der Anwendung verwendet.

## Implementierte Änderungen

### 1. Zentrale Utility-Funktionen (`src/utils/dateFormatter.js`)

Eine neue Utility-Datei wurde erstellt, die alle Datums-Formatierungsfunktionen zentral bereitstellt:

#### Hauptfunktionen:

- **`formatDate(dateInput, includeTime = false)`**
  - Formatiert ein Datum gemäß den Benutzereinstellungen
  - Unterstützt die Formate: DD.MM.YYYY, YYYY-MM-DD, MM/DD/YYYY
  - Optional mit Uhrzeit

- **`formatDateTime(dateInput)`**
  - Formatiert ein Datum mit Uhrzeit
  - Kurzform von `formatDate(dateInput, true)`

- **`formatTime(dateInput)`**
  - Formatiert nur die Uhrzeit eines Datums
  - Format: HH:MM (24-Stunden-Format)

- **`formatMonthYear(dateInput)`**
  - Formatiert ein Datum für Monat/Jahr Anzeige
  - Beispiel: "Januar 2026"

- **`formatRelativeDate(dateInput)`**
  - Formatiert ein relatives Datum
  - Beispiele: "Heute", "Gestern", "vor 2 Tagen", "vor 3 Wochen"

#### Hilfsfunktionen:

- **`isPastDate(dateInput)`**: Prüft ob ein Datum in der Vergangenheit liegt
- **`isFutureDate(dateInput)`**: Prüft ob ein Datum in der Zukunft liegt

### 2. Aktualisierte Komponenten

Folgende Komponenten wurden aktualisiert, um die zentralen Formatierungsfunktionen zu verwenden:

#### Dashboard (`src/views/dashboard/Dashboard.vue`)
- ✅ Import von `formatDate` und `formatMonthYear`
- ✅ Verwendung in `currentMonth` Computed
- ✅ Verwendung in `availableMonths` Computed
- ✅ Lokale `formatDate` Funktion entfernt

#### HealthStatus (`src/views/dashboard/HealthStatus.vue`)
- ✅ Import von `formatDateTime`
- ✅ Verwendung für Server-Zeit Anzeige

#### FlushingManager (`src/views/apartments/FlushingManager.vue`)
- ✅ Import von `formatDateTime`
- ✅ Verwendung in `formatLastFlush` Funktion

#### BuildingsOverview (`src/views/buildings/BuildingsOverview.vue`)
- ✅ Import von `formatDate`
- ✅ Lokale `formatDate` Funktion entfernt
- ✅ Verwendung für `created` und `updated` Felder

#### ApartmentFlushing (`src/views/apartments/ApartmentFlushing.vue`)
- ✅ Import von `formatDate` und `formatDateTime`
- ✅ Lokale `formatDate` Funktion entfernt
- ✅ Verwendung für `last_flush_date` und `next_flush_due`

#### ApartmentFlushHistory (`src/views/apartments/ApartmentFlushHistory.vue`)
- ✅ Import von `formatDate`, `formatDateTime` und `formatTime`
- ✅ Lokale Format-Funktionen entfernt
- ✅ Verwendung für Spül-Historie Anzeige

### 3. Datums-Format Einstellungen

Die Datums-Format Einstellungen sind bereits in `ConfigSettings.vue` implementiert:

```javascript
ui: {
  theme: 'auto',
  language: 'de',
  dateFormat: 'DD.MM.YYYY',  // ← Datums-Format Einstellung
}
```

Verfügbare Formate:
- `DD.MM.YYYY` - Deutsches Format (Standard)
- `YYYY-MM-DD` - ISO-Format / Schwedisches Format
- `MM/DD/YYYY` - US-amerikanisches Format

## Verwendung

### In einer Vue-Komponente

```javascript
import { formatDate, formatDateTime, formatTime } from '@/utils/dateFormatter.js'

// Datum formatieren
const formattedDate = formatDate('2026-01-09')
// Ausgabe: "09.01.2026" (abhängig von Einstellung)

// Datum mit Uhrzeit formatieren
const formattedDateTime = formatDateTime('2026-01-09T14:30:00')
// Ausgabe: "09.01.2026, 14:30" (abhängig von Einstellung)

// Nur Uhrzeit formatieren
const formattedTime = formatTime('2026-01-09T14:30:00')
// Ausgabe: "14:30"

// Monat/Jahr formatieren
const monthYear = formatMonthYear(new Date())
// Ausgabe: "Januar 2026"
```

### Im Template

```vue
<template>
  <div>
    {{ formatDate(apartment.created) }}
    {{ formatDateTime(record.start_time) }}
  </div>
</template>
```

## Vorteile

1. **Zentrale Verwaltung**: Alle Datums-Formatierungen an einem Ort
2. **Konsistenz**: Gleiche Formatierung überall in der Anwendung
3. **Benutzerfreundlich**: Respektiert die Benutzereinstellungen
4. **Wartbarkeit**: Einfache Anpassungen und Erweiterungen
5. **Fehlerbehandlung**: Robuste Fehlerbehandlung mit Fallback-Werten

## Fehlerbehandlung

Alle Formatierungsfunktionen haben eine integrierte Fehlerbehandlung:

- Bei ungültigen Eingaben wird `-` zurückgegeben
- Bei fehlenden Eingaben (`null`, `undefined`) wird `-` zurückgegeben
- Fehler werden in der Konsole geloggt (nur Warnungen)

## Zukünftige Erweiterungen

Mögliche Erweiterungen:
- Zusätzliche Datums-Formate (z.B. DD/MM/YYYY)
- Zeit-Format Einstellung (12h/24h)
- Lokalisierung für mehr Sprachen
- Relative Datums-Formate für verschiedene Sprachen

## Technische Details

### Locale-Mapping

Die Funktion `getLocaleOptions()` mappt das Format-Pattern auf entsprechende Browser-Locales:

- `DD.MM.YYYY` → `de-DE` (Deutsch)
- `YYYY-MM-DD` → `sv-SE` (Schwedisch, da nativ YYYY-MM-DD)
- `MM/DD/YYYY` → `en-US` (US-Amerikanisch)

### Verwendung von toLocaleDateString/toLocaleString

Die nativen JavaScript-Funktionen `toLocaleDateString()` und `toLocaleString()` werden verwendet, um die Datumsformatierung zu handhaben. Dies stellt sicher, dass die Formatierung den Standards entspricht und von allen modernen Browsern unterstützt wird.

## Testing

Zum Testen der Datums-Formatierung:

1. Öffne die Konfigurationsseite (`/config`)
2. Ändere das Datums-Format unter "Benutzeroberfläche"
3. Navigiere durch die verschiedenen Seiten
4. Überprüfe, ob alle Datumsanzeigen das neue Format verwenden

## Datum

- **Erstellt**: 09.01.2026
- **Letzte Änderung**: 09.01.2026
- **Version**: 1.0.0

