# Konfigurationsseite - Dokumentation

## Übersicht

Die neue Konfigurationsseite ermöglicht die Verwaltung der Anwendungseinstellungen sowohl für Administratoren (globale Konfiguration) als auch für einzelne Benutzer (benutzerspezifische Konfiguration).

## Zugriff

- **Route**: `/settings` oder `#/settings`
- **Navigation**: Über das Seitenmenü unter "Einstellungen" → "Konfiguration"
- **Berechtigung**: Authentifizierte Benutzer (alle Rollen)
- **Offline-Verfügbarkeit**: ✅ Ja (mit lokaler Speicherung und Synchronisation)

## Features

### 1. Globale vs. Benutzerspezifische Konfiguration

- **Globale Konfiguration**: Wird übergreifend als Kern-Konfiguration der App verwendet
  - Nur von Administratoren änderbar
  - Gilt als Standard für alle Benutzer
  - Gekennzeichnet mit "Global" oder "Nur Admin" Badge

- **Benutzerspezifische Konfiguration**: 
  - Jeder Benutzer kann eigene Werte setzen
  - Überschreibt globale Einstellungen
  - Wird pro Benutzer gespeichert

### 2. Konfigurationsbereiche

#### 2.1 VDI 6023 Spülungseinstellungen
**Badge**: Global (nur Admin)

Konfigurationsparameter für Trinkwasserspülungen nach VDI 6023:

- **Mindestdurchfluss (l/min)**: `vdi6023.minFlowRate`
  - Standard: 3.0 l/min
  - Typ: Dezimalzahl
  - Beschreibung: Minimaler Durchfluss für ordnungsgemäße Spülung

- **Spüldauer (Minuten)**: `vdi6023.flushDuration`
  - Standard: 3 Minuten
  - Typ: Ganzzahl
  - Beschreibung: Standarddauer einer Spülung

- **Temperatur Kaltwasser Max. (°C)**: `vdi6023.coldWaterMaxTemp`
  - Standard: 25.0 °C
  - Typ: Dezimalzahl
  - Beschreibung: Maximale Kaltwassertemperatur

- **Temperatur Warmwasser Min. (°C)**: `vdi6023.hotWaterMinTemp`
  - Standard: 55.0 °C
  - Typ: Dezimalzahl
  - Beschreibung: Minimale Warmwassertemperatur

#### 2.2 Server-Einstellungen
**Badge**: Nur Admin (nur sichtbar für Administratoren)

- **API Timeout (ms)**: `server.apiTimeout`
  - Standard: 5000 ms
  - Typ: Ganzzahl
  - Beschreibung: Standard-Timeout für API-Anfragen

- **Max. Retry Versuche**: `server.maxRetries`
  - Standard: 3
  - Typ: Ganzzahl
  - Beschreibung: Maximale Anzahl von Wiederholungen bei Fehlern

#### 2.3 Benutzeroberfläche
**Für alle Benutzer verfügbar**

- **Design-Theme**: `ui.theme`
  - Optionen: Automatisch (System), Hell, Dunkel
  - Standard: Automatisch
  - Beschreibung: Farbschema der Anwendung

- **Sprache**: `ui.language`
  - Optionen: Deutsch, English
  - Standard: Deutsch
  - Beschreibung: Anzeigesprache der Benutzeroberfläche

- **Datums-Format**: `ui.dateFormat`
  - Optionen: DD.MM.YYYY, YYYY-MM-DD, MM/DD/YYYY
  - Standard: DD.MM.YYYY
  - Beschreibung: Format für Datumsanzeigen

- **Kompaktmodus aktivieren**: `ui.compactMode`
  - Typ: Boolean
  - Standard: false
  - Beschreibung: Reduzierte Darstellung für mehr Inhalt

#### 2.4 Benachrichtigungen
**Für alle Benutzer verfügbar**

- **Benachrichtigungen aktivieren**: `notifications.enabled`
  - Typ: Boolean
  - Standard: true
  - Beschreibung: Hauptschalter für alle Benachrichtigungen

- **Benachrichtigungston**: `notifications.sound`
  - Typ: Boolean
  - Standard: true
  - Beschreibung: Akustische Signale bei Benachrichtigungen

- **Spülungs-Erinnerungen**: `notifications.flushReminders`
  - Typ: Boolean
  - Standard: true
  - Beschreibung: Erinnerungen für fällige Spülungen

- **Sync-Status Benachrichtigungen**: `notifications.syncStatus`
  - Typ: Boolean
  - Standard: true
  - Beschreibung: Benachrichtigungen über Synchronisationsstatus

#### 2.5 Synchronisation
**Für alle Benutzer verfügbar**

- **Automatische Synchronisation**: `sync.autoSync`
  - Typ: Boolean
  - Standard: true
  - Beschreibung: Daten automatisch synchronisieren, wenn online

- **Sync-Intervall (Minuten)**: `sync.syncInterval`
  - Standard: 15 Minuten
  - Typ: Ganzzahl
  - Beschreibung: Zeitabstand zwischen automatischen Synchronisationen

- **Beim Start synchronisieren**: `sync.syncOnStartup`
  - Typ: Boolean
  - Standard: true
  - Beschreibung: Synchronisation beim App-Start durchführen

- **Nur über WLAN synchronisieren**: `sync.wifiOnly`
  - Typ: Boolean
  - Standard: false
  - Beschreibung: Synchronisation nur bei WLAN-Verbindung

### 3. Aktionsbuttons

- **Speichern**: Speichert die aktuellen Einstellungen
  - Online: Speichert auf Server und lokal
  - Offline: Speichert lokal und fügt zur Sync-Queue hinzu
  
- **Neu laden**: Lädt die Konfiguration vom Server neu
  - Verwirft ungespeicherte Änderungen
  
- **Zurücksetzen** (nur Admin): Setzt alle Einstellungen auf Standardwerte zurück
  - Nur online verfügbar
  - Erfordert Bestätigung

### 4. Offline-Modus

#### Offline-Funktionalität

- ✅ **Konfiguration anzeigen**: Aus LocalStorage
- ✅ **Konfiguration bearbeiten**: Lokale Änderungen möglich
- ✅ **Konfiguration speichern**: In LocalStorage und Sync-Queue
- ❌ **Zurücksetzen**: Nur online möglich

#### Offline-Warnung

Wenn offline, wird eine Warnung angezeigt:
> ⚠️ Sie sind offline. Änderungen werden lokal gespeichert und synchronisiert, sobald Sie wieder online sind.

#### Synchronisation

Offline gespeicherte Änderungen werden automatisch synchronisiert wenn:
- Die Internetverbindung wiederhergestellt wird
- Der Server wieder erreichbar ist
- Der Benutzer manuell online geht

Die Synchronisation erfolgt über den `ConfigSyncService` mit:
- Automatischer Retry-Logik (bis zu 3 Versuche)
- Queue-basierter Verwaltung ausstehender Änderungen
- Fehlerbehandlung und Statusmeldungen

### 5. Preloading

Die Konfiguration wird automatisch vorgeladen durch den `OfflineDataPreloader`:
- Beim App-Start (3 Sekunden Verzögerung)
- Beim Wiederherstellen der Verbindung
- Beim manuellen Online-Schalten

Dies ermöglicht:
- Sofortigen Zugriff auf Einstellungen offline
- Konsistente Darstellung auch ohne Verbindung
- Vermeidung von Fehlermeldungen

### 6. Datenspeicherung

#### LocalStorage Keys

- `wls_config_cache`: Gecachte Konfigurationsdaten
- `wls_config_last_update`: Zeitstempel der letzten Aktualisierung
- `wls_config_sync_queue`: Queue mit ausstehenden Änderungen

#### API-Endpunkte

Verwendet die bestehenden API-Endpunkte:
- `GET /config/get`: Konfiguration abrufen
- `POST /config/set`: Konfiguration setzen
- `DELETE /config/reset`: Auf Standardwerte zurücksetzen (nur Admin)
- `PUT /config/remove`: Werte gezielt entfernen (aktuell nicht in UI verwendet)

## Implementierte Dateien

### Frontend-Komponenten

1. **src/views/pages/ConfigSettings.vue**
   - Hauptkomponente der Konfigurationsseite
   - Formular mit allen Einstellungen
   - Offline-Support und Fehlerbehandlung

### Services

2. **src/stores/ConfigStorage.js**
   - LocalStorage-Verwaltung für Konfiguration
   - Cache-Verwaltung und Statistiken

3. **src/services/ConfigSyncService.js**
   - Synchronisationslogik für Offline-Änderungen
   - Queue-Verwaltung und Retry-Mechanismus

### Integration

4. **src/services/OfflineDataPreloader.js** (erweitert)
   - Automatisches Preloading der Konfiguration
   - Integration mit bestehendem Preload-System

5. **src/stores/OnlineStatus.js** (erweitert)
   - Automatische Sync-Trigger
   - Integration in Online/Offline-Events

6. **src/router/index.js** (erweitert)
   - Route für `/settings`
   - Offline-Support aktiviert

7. **src/_nav.js** (erweitert)
   - Navigationseintrag "Konfiguration"

## Verwendung der Konfigurationswerte

Die gespeicherten Konfigurationswerte können im gesamten Projekt verwendet werden:

```javascript
import { useConfigStorage } from '@/stores/ConfigStorage.js'

const configStorage = useConfigStorage()

// Konfiguration laden
const config = configStorage.loadConfig()

// Werte verwenden
if (config) {
  const minFlowRate = config.vdi6023.minFlowRate
  const theme = config.ui.theme
  // ...
}
```

## Sicherheit

- **Admin-Berechtigungen**: Geprüft durch `isAdmin` aus `GlobalUser.js`
- **Server-seitige Validierung**: Backend prüft Berechtigungen
- **Input-Validierung**: Numerische Eingaben werden validiert
- **XSS-Schutz**: Vue.js automatisches Escaping

## Testing

### Manuelles Testing

1. Als normaler Benutzer einloggen
   - ✅ VDI 6023 Felder sind disabled
   - ✅ Server-Einstellungen sind nicht sichtbar
   - ✅ UI-Einstellungen können geändert werden

2. Als Administrator einloggen
   - ✅ Alle Felder sind editierbar
   - ✅ Server-Einstellungen sind sichtbar
   - ✅ Zurücksetzen-Button ist verfügbar

3. Offline-Modus testen
   - ✅ Konfiguration wird aus Cache geladen
   - ✅ Änderungen werden lokal gespeichert
   - ✅ Warnung wird angezeigt
   - ✅ Sync erfolgt nach Wiederverbindung

### Automatische Tests

Aktuell keine Unit-Tests implementiert (siehe existierende Test-Infrastruktur im Projekt).

## Zukünftige Erweiterungen

Mögliche Erweiterungen der Konfigurationsseite:

1. **Import/Export**: Konfiguration als JSON exportieren/importieren
2. **Versionierung**: Historie von Konfigurationsänderungen
3. **Validierung**: Erweiterte Validierungsregeln für Eingaben
4. **Vorlagen**: Vordefinierte Konfigurationsprofile
5. **Gruppen-Konfiguration**: Konfiguration für Benutzergruppen
6. **Audit-Log**: Protokollierung von Änderungen

## Support

Bei Fragen oder Problemen:
- Siehe API-Dokumentation: `backend-info/ControllerConfig.md`
- Konsolen-Logs prüfen (ausführliche Logging implementiert)
- LocalStorage-Status prüfen (Browser DevTools)
