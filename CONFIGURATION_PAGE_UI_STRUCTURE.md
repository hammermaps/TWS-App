# Konfigurationsseite - UI Struktur

## Seitenaufbau

```
┌─────────────────────────────────────────────────────────────────┐
│ [Header] Konfiguration                                          │
│ Verwalten Sie hier die Anwendungskonfiguration...              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✓ Erfolgsmeldung (wenn vorhanden)                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✗ Fehlermeldung (wenn vorhanden)                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ⚠ Offline-Warnung (nur wenn offline)                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Card] VDI 6023 Spülungseinstellungen           [Badge: Global]│
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ Mindestdurchfluss    │ │ Spüldauer            │             │
│ │ [3.0] l/min          │ │ [3] Minuten          │             │
│ └──────────────────────┘ └──────────────────────┘             │
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ Temp. Kaltwasser Max.│ │ Temp. Warmwasser Min.│             │
│ │ [25.0] °C            │ │ [55.0] °C            │             │
│ └──────────────────────┘ └──────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Card] Server-Einstellungen                [Badge: Nur Admin]  │
│ (Nur für Administratoren sichtbar)                              │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ API Timeout          │ │ Max. Retry Versuche  │             │
│ │ [5000] ms            │ │ [3]                  │             │
│ └──────────────────────┘ └──────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Card] Benutzeroberfläche                                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ Design-Theme         │ │ Sprache              │             │
│ │ [v Automatisch]      │ │ [v Deutsch]          │             │
│ └──────────────────────┘ └──────────────────────┘             │
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ Datums-Format        │ │ [✓] Kompaktmodus     │             │
│ │ [v DD.MM.YYYY]       │ │     aktivieren       │             │
│ └──────────────────────┘ └──────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Card] Benachrichtigungen                                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ [✓] Benachrichtigungen│ │ [✓] Benachrichtigungston         │
│ │     aktivieren       │ │                      │             │
│ └──────────────────────┘ └──────────────────────┘             │
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ [✓] Spülungs-        │ │ [✓] Sync-Status      │             │
│ │     Erinnerungen     │ │     Benachrichtigungen│             │
│ └──────────────────────┘ └──────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Card] Synchronisation                                          │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ [✓] Automatische     │ │ Sync-Intervall       │             │
│ │     Synchronisation  │ │ [15] Minuten         │             │
│ └──────────────────────┘ └──────────────────────┘             │
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ [✓] Beim Start       │ │ [✓] Nur über WLAN    │             │
│ │     synchronisieren  │ │     synchronisieren  │             │
│ └──────────────────────┘ └──────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Button: Speichern] [Button: Neu laden] [Button: Zurücksetzen] │
│                                                                 │
│                             Letzte Aktualisierung: 01.11.2025...│
└─────────────────────────────────────────────────────────────────┘
```

## Responsive Layout

### Desktop (lg/xl)
- Breite: 10/12 bzw. 8/12 Spalten
- Zweispaltige Anordnung der Eingabefelder
- Alle Karten sichtbar

### Tablet (md)
- Breite: 100%
- Zweispaltige Anordnung der Eingabefelder
- Optimierte Abstände

### Mobile (sm/xs)
- Breite: 100%
- Einspaltige Anordnung
- Gestapelte Buttons

## Farbcodes und Badges

### Badges
- **Global** (primary): Blau - Kennzeichnet globale Admin-Einstellungen
- **Nur Admin** (danger): Rot - Kennzeichnet Admin-only Bereiche

### Alerts
- **Success** (success): Grün - Erfolgsmeldungen
- **Error** (danger): Rot - Fehlermeldungen
- **Warning** (warning): Gelb - Offline-Warnung, wichtige Hinweise

### Buttons
- **Speichern** (primary): Blau - Primäraktion
- **Neu laden** (secondary outline): Grau - Sekundäraktion
- **Zurücksetzen** (danger outline): Rot - Destruktive Aktion

## Icons (CoreUI)

- `cilSettings` - Haupticon für Konfiguration
- `cilWater` - VDI 6023 Spülungseinstellungen
- `cilServer` - Server-Einstellungen
- `cilColorPalette` - Benutzeroberfläche
- `cilBell` - Benachrichtigungen
- `cilSync` - Synchronisation
- `cilSave` - Speichern
- `cilReload` - Neu laden
- `cilTrash` - Zurücksetzen
- `cilWarning` - Warnung

## Interaktionsflows

### Erfolgreicher Speichervorgang (Online)

```
1. Benutzer klickt "Speichern"
   ↓
2. Button zeigt Spinner "Speichere..."
   ↓
3. API-Request an /config/set
   ↓
4. Response verarbeiten
   ↓
5. LocalStorage aktualisieren
   ↓
6. Success-Alert anzeigen: "Konfiguration erfolgreich gespeichert!"
   ↓
7. Timestamp aktualisieren
```

### Speichervorgang Offline

```
1. Benutzer klickt "Speichern"
   ↓
2. Offline-Status erkannt
   ↓
3. In LocalStorage speichern
   ↓
4. Zur Sync-Queue hinzufügen
   ↓
5. Success-Alert: "Konfiguration lokal gespeichert. Wird synchronisiert..."
   ↓
6. Wenn online → Automatische Synchronisation
```

### Zurücksetzen (Admin only)

```
1. Admin klickt "Zurücksetzen"
   ↓
2. Bestätigungsdialog: "Möchten Sie wirklich zurücksetzen?"
   ↓
3. Bei Ja: API-Request an /config/reset
   ↓
4. Konfiguration neu laden
   ↓
5. Success-Alert: "Konfiguration wurde auf Standardwerte zurückgesetzt"
```

## Validierung

### Client-seitige Validierung

- Numerische Felder: Automatisch durch `type="number"`
- Pflichtfelder: Aktuell alle optional
- Min/Max Werte: Durch `step` und `min` Attribute

### Server-seitige Validierung

- Backend validiert alle Eingaben
- Fehler werden in Error-Alert angezeigt
- Fehlermeldungen vom Server werden übernommen

## Accessibility

- Labels für alle Formularfelder
- Beschreibende Hilfstexte (CFormText)
- Disabled-State für nicht editierbare Felder
- Semantisches HTML (Card, Form, Button)
- Fokus-Management durch CoreUI

## Performance

- Lazy Loading der Route (Webpack Code Splitting)
- Effizientes LocalStorage-Management
- Debouncing für API-Requests (durch Vue)
- Minimale Re-Renders durch reactive refs

## Barrierefreiheit

- ARIA-Labels durch CoreUI Komponenten
- Keyboard-Navigation möglich
- Screen Reader kompatibel
- Kontrastverhältnisse eingehalten
