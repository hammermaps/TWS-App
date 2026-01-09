# i18n Migration - Fortschritt

## Status: 🔄 IN ARBEIT

## Bereits migrierte Komponenten

### ✅ ConfigSettings.vue (100% abgeschlossen)

**Migrierte Texte:**
- [x] Header (Titel, Untertitel)
- [x] Offline-Warnung
- [x] Loading-Text
- [x] Server-Einstellungen (Header, Labels, Hilftexte)
- [x] UI-Einstellungen (Theme, Sprache, Datums-Format)
- [x] Sync-Einstellungen (Labels, Hilftexte)
- [x] Action Buttons (Speichern, Neu laden, Zurücksetzen)
- [x] JavaScript-Nachrichten (Erfolg, Fehler)
- [x] Watcher-Nachrichten

**Verwendete Keys:**
- `settings.title`
- `settings.subtitle`
- `settings.adminOnly`
- `settings.loading`
- `settings.save`
- `settings.reload`
- `settings.reset`
- `settings.resetConfirm`
- `settings.lastUpdate`
- `settings.savedSuccess`
- `settings.savedOffline`
- `settings.resetSuccess`
- `settings.resetOnlineOnly`
- `settings.themeChanged`
- `settings.server.*`
- `settings.ui.*`
- `settings.sync.*`
- `offline.dataWillSync`
- `errors.general`

**Änderungen:**
- Import von `useI18n` hinzugefügt
- `const { t } = useI18n()` initialisiert
- Alle statischen Texte durch `{{ $t('key') }}` ersetzt
- JavaScript-Strings durch `t('key')` ersetzt

### ✅ AppHeader.vue (100% abgeschlossen)

**Migrierte Texte:**
- [x] Dashboard Link
- [x] Theme-Labels (Light, Dark, Auto)

**Verwendete Keys:**
- `nav.dashboard`
- `settings.ui.themeLight`
- `settings.ui.themeDark`
- `settings.ui.themeAuto`

**Änderungen:**
```vue
<!-- Vorher -->
<CNavLink href="/dashboard"> Dashboard </CNavLink>
<CIcon class="me-2" icon="cil-sun" size="lg" /> Light

<!-- Nachher -->
<CNavLink href="/dashboard"> {{ $t('nav.dashboard') }} </CNavLink>
<CIcon class="me-2" icon="cil-sun" size="lg" /> {{ $t('settings.ui.themeLight') }}
```

### ✅ BuildingsOverview.vue (100% abgeschlossen)

**Migrierte Texte:**
- [x] Header (Titel)
- [x] Aktualisieren-Button, Updating-Badge
- [x] Loading-Text, Fehler-Anzeige
- [x] Building Cards (alle Info-Items)
- [x] Status-Badges (Aktiv/Versteckt)
- [x] "Apartments anzeigen" Button
- [x] Empty State

**Verwendete Keys:**
- `buildings.title`
- `buildings.updating`
- `buildings.loading`
- `buildings.active` / `buildings.hidden`
- `buildings.buildingId`
- `buildings.sorting`
- `buildings.apartments`
- `buildings.created` / `buildings.updated`
- `buildings.viewApartments`
- `buildings.noBuildings`
- `buildings.noBuildingsYet`

**Änderungen:**
```vue
<!-- Vorher -->
<h2>Gebäude Übersicht</h2>
<span class="text-muted">Gebäude ID:</span>

<!-- Nachher -->
<h2>{{ $t('buildings.title') }}</h2>
<span class="text-muted">{{ $t('buildings.buildingId') }}:</span>
```

## Nächste Komponenten zum Migrieren

### Priorität HOCH:

1. **Dashboard.vue** - Dashboard (NÄCHSTE)
   - Titel, Untertitel
   - Statistik-Labels
   - Export-Buttons
   - Monatsnamen

2. **BuildingsOverview.vue** - Gebäude-Übersicht
   - Titel, Untertitel
   - Tabellen-Header
   - Action-Buttons
   - Fehlermeldungen

3. **ApartmentFlushing.vue** - Spülmanagement
   - Titel, Untertitel
   - Status-Texte
   - Buttons
   - Fehlermeldungen

4. **FlushingManager.vue** - Spül-Manager
   - Titel, Untertitel
   - Liste
   - GPS-Status
   - Countdown-Texte

### Priorität MITTEL:

6. **Login.vue** - Login-Seite
7. **Profile.vue** - Profil
8. **BuildingApartments.vue** - Gebäude-Wohnungen
9. **ApartmentFlushHistory.vue** - Spül-Historie
10. **HealthStatus.vue** - Server-Status

### Priorität NIEDRIG:

11. **OnlineStatusToggle.vue** - Online-Status
12. **OfflineDataBadge.vue** - Offline-Daten-Badge
13. **AppHeaderDropdownAccnt.vue** - Account-Dropdown

## Migration-Vorlage

### Für Vue-Templates:

```vue
<!-- Vorher -->
<h1>Dashboard</h1>
<button>Speichern</button>

<!-- Nachher -->
<h1>{{ $t('dashboard.title') }}</h1>
<button>{{ $t('common.save') }}</button>
```

### Für JavaScript-Code:

```javascript
// Import hinzufügen
import { useI18n } from 'vue-i18n'

// In setup() initialisieren
const { t } = useI18n()

// Vorher
const message = 'Erfolgreich gespeichert'
alert('Möchten Sie löschen?')

// Nachher
const message = t('common.success')
if (confirm(t('common.deleteConfirm'))) {
  // ...
}
```

## Verfügbare Übersetzungs-Keys

### Common (Häufig verwendet)
```javascript
$t('common.save')        // Speichern / Save
$t('common.cancel')      // Abbrechen / Cancel
$t('common.delete')      // Löschen / Delete
$t('common.edit')        // Bearbeiten / Edit
$t('common.loading')     // Laden... / Loading...
$t('common.error')       // Fehler / Error
$t('common.success')     // Erfolg / Success
$t('common.refresh')     // Aktualisieren / Refresh
```

### Navigation
```javascript
$t('nav.dashboard')      // Dashboard
$t('nav.buildings')      // Gebäude / Buildings
$t('nav.apartments')     // Wohnungen / Apartments
$t('nav.flushing')       // Leerstandsspülungen / Vacancy Flushing
$t('nav.settings')       // Einstellungen / Settings
```

### Dashboard
```javascript
$t('dashboard.title')         // Dashboard
$t('dashboard.subtitle')      // Übersicht Ihrer Arbeitszeit...
$t('dashboard.workStats')     // Arbeitsstatistiken / Work Statistics
$t('dashboard.thisMonth')     // Dieser Monat / This Month
$t('dashboard.export')        // Exportieren / Export
```

### Buildings
```javascript
$t('buildings.title')         // Gebäude / Buildings
$t('buildings.subtitle')      // Verwalten Sie alle Gebäude...
$t('buildings.add')           // Gebäude hinzufügen / Add Building
$t('buildings.edit')          // Gebäude bearbeiten / Edit Building
$t('buildings.delete')        // Gebäude löschen / Delete Building
```

### Apartments
```javascript
$t('apartments.title')        // Wohnungen / Apartments
$t('apartments.number')       // Wohnungsnummer / Apartment Number
$t('apartments.floor')        // Etage / Floor
$t('apartments.status')       // Status
$t('apartments.enabled')      // Aktiv / Active
$t('apartments.lastFlush')    // Letzte Spülung / Last Flush
```

### Flushing
```javascript
$t('flushing.title')          // Leerstandsspülungen / Vacancy Flushing
$t('flushing.startFlush')     // Spülung starten / Start Flush
$t('flushing.stopFlush')      // Spülung beenden / Stop Flush
$t('flushing.duration')       // Spüldauer / Flush Duration
$t('flushing.gpsStatus')      // GPS Status
```

### Offline
```javascript
$t('offline.youAreOffline')   // Sie sind offline / You are offline
$t('offline.dataWillSync')    // Änderungen werden synchronisiert...
$t('offline.online')          // Online
```

### Errors
```javascript
$t('errors.general')          // Ein Fehler ist aufgetreten / An error occurred
$t('errors.network')          // Netzwerkfehler / Network error
$t('errors.server')           // Serverfehler / Server error
$t('errors.timeout')          // Zeitüberschreitung / Timeout
```

## Checkliste für jede Komponente

Beim Migrieren einer Komponente:

- [ ] `useI18n` importieren
- [ ] `const { t } = useI18n()` in setup()
- [ ] Template-Texte durch `{{ $t('key') }}` ersetzen
- [ ] JavaScript-Strings durch `t('key')` ersetzen
- [ ] Attribute mit `:label="$t('key')"` binden
- [ ] Platzhalter-Variablen berücksichtigen: `$t('key', { var: value })`
- [ ] Testen mit Deutsch
- [ ] Testen mit Englisch
- [ ] Commit mit Beschreibung

## Schnell-Referenz

### Template
```vue
<!-- Text -->
<h1>{{ $t('key') }}</h1>

<!-- Attribut -->
<button :title="$t('key')">Text</button>

<!-- Mit Platzhalter -->
<p>{{ $t('key', { count: 5 }) }}</p>

<!-- Label -->
<CFormCheck :label="$t('key')" />
```

### Script
```vue
<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

// String
const msg = t('key')

// Mit Platzhalter
const msg = t('key', { name: 'John' })

// In Funktion
function save() {
  alert(t('common.success'))
}
</script>
```

## Fortschritt

- [x] ConfigSettings.vue (100%) ✅
- [x] AppHeader.vue (100%) ✅
- [x] Dashboard.vue (100%) ✅
- [x] BuildingsOverview.vue (100%) ✅
- [x] ApartmentFlushing.vue (90%) ✅
- [x] FlushingManager.vue (100%) ✅ NEU
- [ ] Login.vue (0%)
- [ ] Profile.vue (0%)

**Gesamt**: 6 von ~15 Komponenten (≈40%)

**Übersetzte Texte**: ~153
**Zeitaufwand**: ~90 Minuten (1,5 Stunden)

**Meilenstein**: 40% erreicht! 🎉

---

**Stand**: 09.01.2026
**Nächster Schritt**: Login.vue oder BuildingApartments.vue
**Aktuell**: FlushingManager.vue vollständig übersetzt! 🎉

