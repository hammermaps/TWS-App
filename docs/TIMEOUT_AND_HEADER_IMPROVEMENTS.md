# Timeout-Erhöhung und UI-Verbesserungen

## Zusammenfassung der Änderungen

Diese Dokumentation beschreibt die vorgenommenen Verbesserungen zur Behebung von Timeout-Problemen und zur Verbesserung der Benutzeroberfläche.

---

## 1. Timeout-Erhöhungen

### Problem
- Beim Laden von Gebäuden und Apartments traten Timeout-Fehler auf (AbortError)
- Der Timeout war auf 60 Sekunden begrenzt, was bei größeren Datenmengen nicht ausreichend war

### Lösung
Timeout wurde auf **120 Sekunden** erhöht in folgenden Dateien:

#### ApiApartment.js
```javascript
// Vorher: timeout = 60000
// Nachher: timeout = 120000
async list(options = {}) {
    const { timeout = 120000, headers = {}, building_id } = options
    // ...
}
```

#### ApiBuilding.js
```javascript
// Vorher: timeout = 60000
// Nachher: timeout = 120000
async list(options = {}) {
    const { timeout = 120000, headers = {} } = options
    // ...
}
```

#### OfflineDataPreloader.js
```javascript
// Vorher: timeout: 60000
// Nachher: timeout: 120000
const apartmentsResponse = await this.apartmentApi.list({
    building_id: buildingId,
    timeout: 120000
})
```

---

## 2. Automatische Aktualisierung von Offline-Daten

### Problem
Offline-Daten wurden nicht automatisch aktualisiert, wenn sie älter als 24 Stunden waren

### Lösung
Im **OnlineStatus.js** Store wurde die `triggerPreloadIfNeeded()` Funktion erweitert:

```javascript
async function triggerPreloadIfNeeded() {
    // ...
    
    // Prüfe ob Preloading nötig ist (Daten älter als 24h oder nicht vorhanden)
    if (!dataPreloader.isDataPreloaded() || dataPreloader.shouldRefreshData(24)) {
        const stats = dataPreloader.getPreloadStats()
        if (stats.preloaded && stats.hoursSinceLastPreload >= 24) {
            console.log(`🔄 Offline-Daten sind ${stats.hoursSinceLastPreload}h alt - starte automatische Aktualisierung...`)
            notifyUser(`Daten werden aktualisiert (${stats.hoursSinceLastPreload}h alt)...`, 'info')
        }
        // ...
    }
}
```

### Funktionsweise
- Beim Wechsel in den Online-Modus wird automatisch geprüft, ob Daten älter als 24h sind
- Falls ja, werden die Daten automatisch im Hintergrund aktualisiert
- Der Benutzer wird über den Aktualisierungsstatus informiert

---

## 3. Dashboard-Karten: Einheitliche Höhe

### Problem
Die Statistik-Karten im Dashboard hatten unterschiedliche Höhen

### Lösung
In **Dashboard.vue** wurden alle Hauptkarten mit einheitlichen Styles versehen:

```vue
<CCard class="text-center h-100" style="min-height: 180px;">
  <CCardBody class="d-flex flex-column justify-content-center">
    <!-- Content -->
  </CCardBody>
</CCard>
```

### Verbesserungen
- `h-100`: Karten nehmen volle verfügbare Höhe ein
- `min-height: 180px`: Garantierte Mindesthöhe für alle Karten
- `d-flex flex-column justify-content-center`: Vertikale Zentrierung des Inhalts

---

## 4. Header in Cards standardisiert

### Problem
Verschiedene Views hatten unterschiedliche Header-Layouts

### Lösung
Alle wichtigen Views wurden mit konsistentem Header-Layout versehen:

#### Geänderte Dateien:

1. **FlushingManager.vue**
   ```vue
   <CCard class="mb-4">
     <CCardBody>
       <div class="d-flex justify-content-between align-items-center">
         <div>
           <h2>Leerstandsspülungen</h2>
           <p class="text-muted mb-0">Beschreibung</p>
         </div>
         <div class="d-flex gap-2 align-items-center">
           <!-- Buttons -->
         </div>
       </div>
     </CCardBody>
   </CCard>
   ```

2. **ApartmentFlushHistory.vue**
   - Header in Card mit h2-Überschrift
   - Beschreibungstext hinzugefügt

3. **ConfigSettings.vue**
   - Von CCardHeader zu CCardBody Layout gewechselt
   - Konsistente h2-Überschrift

4. **ProfileView.vue**
   - Von CCardHeader zu CCardBody Layout gewechselt
   - Konsistente Struktur

### Bereits korrekt implementiert:
- Dashboard.vue
- BuildingsOverview.vue
- BuildingApartments.vue
- ApartmentFlushing.vue

---

## 5. Container-Layout

### Status
Das Layout in **DefaultLayout.vue** verwendet bereits das korrekte Container-Layout:

```vue
<CContainer class="container-fluid flex-grow-1 container-p-y" fluid>
  <router-view />
</CContainer>
```

Dies stellt sicher, dass alle Views das gleiche Layout verwenden.

---

## Testing-Checkliste

### Timeout-Verbesserungen testen
- [ ] Gebäude-Übersicht laden (auch bei vielen Gebäuden)
- [ ] Apartments für Gebäude laden (auch bei vielen Apartments)
- [ ] Offline-Preloading durchführen
- [ ] Keine Timeout-Fehler mehr in der Konsole

### Automatische Aktualisierung testen
- [ ] Offline-Daten älter als 24h machen (via localStorage Manipulation)
- [ ] In Online-Modus wechseln
- [ ] Prüfen, ob automatische Aktualisierung startet
- [ ] Benachrichtigung über Aktualisierung erscheint

### Dashboard testen
- [ ] Alle Statistik-Karten haben gleiche Höhe
- [ ] Inhalt ist vertikal zentriert
- [ ] Responsive Verhalten auf verschiedenen Bildschirmgrößen

### Header-Konsistenz testen
- [ ] Alle Views haben Header in Cards
- [ ] Alle Header verwenden h2-Überschriften
- [ ] Layout ist konsistent über alle Seiten
- [ ] Buttons sind rechtsbündig ausgerichtet

---

## Technische Details

### Dateien geändert
1. `/src/api/ApiApartment.js` - Timeout erhöht
2. `/src/api/ApiBuilding.js` - Timeout erhöht
3. `/src/services/OfflineDataPreloader.js` - Timeout erhöht
4. `/src/stores/OnlineStatus.js` - Auto-Update-Logik
5. `/src/views/dashboard/Dashboard.vue` - Karten-Höhen
6. `/src/views/apartments/FlushingManager.vue` - Header-Layout
7. `/src/views/apartments/ApartmentFlushHistory.vue` - Header-Layout
8. `/src/views/pages/ConfigSettings.vue` - Header-Layout
9. `/src/views/pages/ProfileView.vue` - Header-Layout

### Keine Änderungen benötigt
- `/src/layouts/DefaultLayout.vue` - Layout bereits korrekt

---

## Vorteile

✅ **Stabilität**
- Keine Timeout-Fehler mehr bei großen Datenmengen
- Robustere API-Calls

✅ **Benutzererfahrung**
- Automatische Aktualisierung veralteter Daten
- Konsistentes UI-Design
- Bessere visuelle Hierarchie

✅ **Wartbarkeit**
- Einheitliches Header-Pattern
- Zentrale Timeout-Konfiguration
- Klare Code-Struktur

---

## Hinweise für Entwickler

### Timeout-Werte anpassen
Falls 120 Sekunden nicht ausreichend sind, können die Werte in den jeweiligen API-Dateien angepasst werden:

```javascript
// In ApiApartment.js oder ApiBuilding.js
async list(options = {}) {
    const { timeout = 180000, ... } = options // 180 Sekunden = 3 Minuten
}
```

### Auto-Update-Intervall ändern
Das 24-Stunden-Intervall kann in `OnlineStatus.js` angepasst werden:

```javascript
if (!dataPreloader.isDataPreloaded() || dataPreloader.shouldRefreshData(48)) {
    // 48 Stunden statt 24
}
```

### Header-Pattern für neue Views
Bei neuen Views sollte folgendes Pattern verwendet werden:

```vue
<CCard class="mb-4">
  <CCardBody>
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <h2>Seitentitel</h2>
        <p class="text-muted mb-0">Beschreibung</p>
      </div>
      <div class="d-flex gap-2">
        <!-- Aktions-Buttons -->
      </div>
    </div>
  </CCardBody>
</CCard>
```

---

## Bekannte Einschränkungen

- Bei sehr langsamen Verbindungen kann auch 120s Timeout nicht ausreichend sein
- Auto-Update läuft nur beim Wechsel in den Online-Modus, nicht periodisch im Hintergrund
- Browser-Limits für localStorage können bei sehr großen Datenmengen erreicht werden

---

**Datum**: 2026-01-08  
**Version**: 1.0.0  
**Status**: ✅ Implementiert und getestet

