# QR-Code Scanner - Zugriffspunkte und Links

**Datum:** 2026-01-09
**Status:** ✅ Vollständig implementiert

## Übersicht

Der QR-Code Scanner ist jetzt an mehreren Stellen in der Anwendung zugänglich.

## Zugriffspunkte

### 1. Header (App-weit verfügbar)

**Standort:** In der oberen Navigation (AppHeader.vue)
**Icon:** 📱 QR-Code Icon
**Verfügbarkeit:** Auf jeder Seite der Anwendung

```vue
<CButton
  color="primary"
  variant="ghost"
  size="sm"
  @click="openQRScanner">
  <CIcon icon="cil-qr-code" size="lg" />
</CButton>
```

**Funktionsweise:**
- Öffnet Scanner als Modal
- Bleibt auf aktueller Seite
- Schneller Zugriff von überall

### 2. Dashboard (Hauptseite)

**Standort:** Dashboard-Seite (Dashboard.vue)
**Button:** "QR-Code Scanner" Button neben "Aktualisieren"
**Farbe:** Grün (Success)

```vue
<CButton
  color="success"
  variant="outline"
  @click="openQRScanner">
  <CIcon icon="cil-qr-code" class="me-2" />
  {{ $t('qrScanner.title') }}
</CButton>
```

**Funktionsweise:**
- Öffnet Scanner als Modal
- Integriert in Dashboard-Workflow

### 3. Navigation (Sidebar)

**Standort:** Haupt-Navigation (_nav.js)
**Position:** Unter "Gebäude & Wohnungen"
**Route:** `/qr-scanner`
**Badge:** SCAN (Info)

```javascript
{
  component: 'CNavItem',
  name: 'QR-Code Scanner',
  to: '/qr-scanner',
  icon: 'cilQrCode',
  badge: {
    color: 'info',
    text: 'SCAN',
  },
  requiresOnline: false
}
```

**Funktionsweise:**
- Navigiert zu dedizierter Scanner-Seite
- Zeigt Anleitung und Historie
- Vollständige Scanner-Erfahrung

### 4. Dedizierte Scanner-Seite

**Route:** `/qr-scanner`
**Komponente:** `QRScannerPage.vue`
**Features:**
- Große "Scannen starten" Schaltfläche
- Info-Cards mit Erklärungen
- Scan-Historie (letzte 10 Scans)
- Detaillierte Anleitung

**Inhalt:**
```
┌─────────────────────────────────────────┐
│ 📱 QR-Code Scanner                       │
│ "Scannen starten" Button (groß)         │
└─────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ Info-Cards:                               │
│ - Wie es funktioniert                     │
│ - Schneller Zugriff                       │
│ - Offline-Fähig                           │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ Letzte Scans (Tabelle)                    │
│ - Zeitstempel                             │
│ - Apartment                               │
│ - Gebäude                                 │
│ - "Zur Spülung" Button                   │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ Anleitung                                 │
│ - Voraussetzungen                         │
│ - Schritt-für-Schritt                     │
└───────────────────────────────────────────┘
```

## Benutzer-Flows

### Flow 1: Schneller Scan (Header)
1. Benutzer klickt QR-Icon im Header
2. Scanner öffnet sich als Modal
3. Benutzer scannt QR-Code
4. Automatische Navigation zur Spülungsseite
5. Modal schließt sich automatisch

**Verwendung:** Wenn Benutzer bereits weiß, wo er hin will

### Flow 2: Dashboard-Scan
1. Benutzer ist auf Dashboard
2. Klickt "QR-Code Scanner" Button
3. Scanner öffnet sich als Modal
4. Scan und Navigation
5. Zurück zum Dashboard

**Verwendung:** Während der Arbeit am Dashboard

### Flow 3: Dedizierte Scanner-Seite
1. Benutzer navigiert zu `/qr-scanner`
2. Sieht Anleitung und Historie
3. Klickt "Scannen starten"
4. Scanner öffnet sich
5. Nach Scan: Option zur Spülungsseite oder erneut scannen
6. Scan wird in Historie gespeichert

**Verwendung:** Erstes Mal scannen, Historie durchsehen, mehrere Scans

## Features

### Scan-Historie

**Speicherort:** LocalStorage (`qr_scan_history`)
**Kapazität:** Letzte 10 Scans
**Daten pro Scan:**
```json
{
  "timestamp": "2026-01-09T10:30:00Z",
  "apartment": {
    "id": 1,
    "number": "101",
    "floor": "1",
    "building_id": 1
  },
  "building": {
    "id": 1,
    "name": "Hauptgebäude"
  }
}
```

**Funktionen:**
- Anzeige in Tabelle
- "Zur Spülung" Button pro Eintrag
- Automatisches Limit (10 Einträge)
- Persistent über Sessions

### Offline-Funktionalität

**Alle Zugriffspunkte funktionieren offline:**
- ✅ Header-Icon
- ✅ Dashboard-Button
- ✅ Navigation-Link
- ✅ Scanner-Seite

**Voraussetzung:** Apartments müssen vorher geladen sein (Offline-Preloading)

## Responsive Design

### Desktop
- Alle Buttons sichtbar
- Vollständige Tabelle auf Scanner-Seite
- Große Info-Cards

### Tablet
- Header-Icon kompakt
- Tabelle scrollbar
- Cards gestapelt

### Mobile
- Header-Icon prominent
- Kompakte Button-Texte
- Optimierte Tabelle
- Einzelne Spalte für Info-Cards

## Tastenkombinationen (Optional für später)

Mögliche Shortcuts:
- `Ctrl+Q`: QR-Scanner öffnen
- `Esc`: Scanner schließen
- `Ctrl+Shift+Q`: Zur Scanner-Seite navigieren

## Analytics / Tracking (Optional)

Mögliche Metriken:
- Anzahl Scans pro Tag
- Meist gescannte Apartments
- Durchschnittliche Scan-Zeit
- Fehlerrate

## Sicherheit

### Kamera-Berechtigung
- Wird nur angefordert, wenn Scanner geöffnet wird
- Benutzer kann ablehnen
- Klare Fehlermeldung bei Ablehnung

### QR-Code-Validierung
- UUID-Format-Check
- Apartment-Existenz-Prüfung
- Zugriffskontrolle (enabled/disabled)

## Dateien

### Neue Dateien:
1. ✅ `/src/views/scanner/QRScannerPage.vue` - Dedizierte Scanner-Seite
2. ✅ `/src/components/QRCodeScanner.vue` - Scanner-Komponente (bereits vorhanden)

### Geänderte Dateien:
1. ✅ `/src/components/AppHeader.vue` - QR-Icon hinzugefügt
2. ✅ `/src/views/dashboard/Dashboard.vue` - QR-Button hinzugefügt
3. ✅ `/src/_nav.js` - Navigation erweitert
4. ✅ `/src/router/index.js` - Route hinzugefügt
5. ✅ `/src/i18n/locales/de.json` - Übersetzungen erweitert
6. ✅ `/src/i18n/locales/en.json` - Übersetzungen erweitert

### Backend-Dateien:
1. ✅ `/backend/controllers/ControllerApartments.php` - Syntaxfehler behoben

## Testing

### Manuell testen:

1. **Header-Icon:**
   ```
   1. Auf beliebige Seite navigieren
   2. QR-Icon im Header klicken
   3. Scanner öffnet sich ✓
   ```

2. **Dashboard-Button:**
   ```
   1. Zum Dashboard navigieren
   2. "QR-Code Scanner" Button klicken
   3. Scanner öffnet sich ✓
   ```

3. **Navigation:**
   ```
   1. "QR-Code Scanner" in Sidebar klicken
   2. Scanner-Seite lädt ✓
   3. "Scannen starten" klicken ✓
   ```

4. **Scan-Historie:**
   ```
   1. QR-Code scannen
   2. Zur Scanner-Seite navigieren
   3. Scan in Historie sichtbar ✓
   4. "Zur Spülung" klicken ✓
   ```

## Benutzer-Anleitung

### Für Benutzer (Kurzanleitung):

**Option 1 - Schnell:**
1. QR-Icon oben rechts klicken 📱
2. QR-Code scannen
3. Fertig!

**Option 2 - Mit Historie:**
1. "QR-Code Scanner" in Menü klicken
2. "Scannen starten" klicken
3. QR-Code scannen
4. Letzte Scans in Tabelle sehen

### Für Administratoren:

1. QR-Codes generieren:
   - Backend: `GET /apartments/{id}/qr-code`
   - Lädt PNG-Datei herunter

2. QR-Codes drucken und anbringen

3. Benutzer schulen:
   - Scanner-Seite zeigen
   - Erste Scans gemeinsam durchführen

## Zusammenfassung

Der QR-Code Scanner ist jetzt über **4 verschiedene Wege** zugänglich:

1. ✅ **Header** - Schnellzugriff von überall
2. ✅ **Dashboard** - Integration in Hauptseite
3. ✅ **Navigation** - Dedizierter Menüpunkt
4. ✅ **Scanner-Seite** - Vollständige Erfahrung mit Historie

Alle Wege funktionieren **online und offline** und bieten eine nahtlose Benutzererfahrung! 🎉

