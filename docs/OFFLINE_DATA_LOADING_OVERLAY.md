# Offline-Daten Loading Overlay - Implementierung

## Übersicht

Diese Implementierung fügt eine Fortschrittsanzeige mit abgedunkeltem Hintergrund hinzu, die während der Offline-Daten-Aktualisierung angezeigt wird.

## Komponenten

### 1. OfflineDataLoadingOverlay.vue
- **Pfad:** `/src/components/OfflineDataLoadingOverlay.vue`
- **Beschreibung:** Zeigt einen Vollbild-Overlay mit Fortschrittsanzeige
- **Features:**
  - Dunkler, verschwommener Hintergrund (backdrop-filter)
  - Animiertes Icon (pulsierend)
  - Fortschrittsbalken mit dynamischer Farbgebung
  - Detail-Anzeige für Konfiguration, Gebäude und Apartments
  - Aktuelles Gebäude wird angezeigt
  - Erfolgsmeldung nach Abschluss
  - Fehlermeldung bei Problemen

### 2. Integration in DefaultLayout.vue
- **Pfad:** `/src/layouts/DefaultLayout.vue`
- **Änderungen:**
  - Import von `OfflineDataLoadingOverlay` und `useOfflineDataPreloader`
  - Reaktive Computed Properties für `isLoading` und `loadingProgress`
  - Overlay wird am Ende des Templates eingefügt

### 3. OfflineDataPreloader.js Verbesserungen
- **Pfad:** `/src/services/OfflineDataPreloader.js`
- **Änderungen:**
  - Progress wird beim Start zurückgesetzt
  - Building-Counter wird inkrementell während des Apartment-Ladens erhöht (statt sofort auf Gesamt)
  - Success-Status bleibt 2 Sekunden sichtbar
  - Error-Status bleibt 3 Sekunden sichtbar

## Fortschritts-Berechnung

Der Gesamtfortschritt wird wie folgt berechnet:

```javascript
- 10% für Konfiguration
- 20% für Gebäude-Liste
- 70% für Apartments (basierend auf Anzahl geladener Gebäude)
```

## Farb-Logik für Fortschrittsbalken

- **0-30%:** Info (Blau)
- **30-70%:** Warning (Gelb)
- **70-100%:** Success (Grün)
- **Bei Fehler:** Danger (Rot)

## i18n-Übersetzungen

### Deutsche Texte (de.json)
```json
"offlineData": {
  "loading": {
    "title": "Offline-Daten werden geladen",
    "statusConfig": "Lade Konfiguration...",
    "statusBuildings": "Lade Gebäude...",
    "statusApartments": "Lade Wohnungen...",
    "statusSuccess": "Erfolgreich geladen!",
    "statusError": "Fehler beim Laden",
    "statusIdle": "Bereit zum Laden",
    "config": "Konfiguration",
    "buildings": "Gebäude",
    "apartments": "Wohnungen",
    "progress": "Fortschritt"
  }
}
```

### Englische Texte (en.json)
Entsprechende englische Übersetzungen wurden ebenfalls hinzugefügt.

## Benutzer-Erfahrung

1. **Start des Preloading:**
   - Overlay erscheint mit Fade-In-Animation
   - Hintergrund wird abgedunkelt und verschwommen
   - Scrollen wird verhindert

2. **Während des Ladens:**
   - Fortschrittsbalken aktualisiert sich kontinuierlich
   - Aktuelles Gebäude wird angezeigt
   - Anzahl geladener Gebäude und Apartments wird live aktualisiert

3. **Nach Abschluss:**
   - Success-Meldung wird 2 Sekunden angezeigt
   - Overlay verschwindet mit Fade-Out-Animation
   - Scrollen wird wieder aktiviert

4. **Bei Fehler:**
   - Error-Meldung wird 3 Sekunden angezeigt
   - Overlay verschwindet danach automatisch

## Triggering

Das Preloading wird automatisch getriggert durch:
- **OnlineStatus-Store** beim App-Start (nach 3 Sekunden)
- **Manuell** über den "Offline-Daten laden" Button im Dashboard
- **Automatisch** wenn Daten älter als 24 Stunden sind

## Technische Details

### Verhindert Scrollen
```javascript
watch(() => props.isVisible, (visible) => {
  if (visible) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
```

### Reaktive Updates
- `isPreloading.value` steuert die Sichtbarkeit
- `preloadProgress.value` enthält alle Status-Informationen
- Beide werden vom `OfflineDataPreloader` Service bereitgestellt

## Testing

Um das Overlay zu testen:
1. Im Dashboard auf "Offline-Daten laden" klicken
2. Oder: App neu laden (triggert automatisches Preloading nach 3 Sekunden)
3. Oder: `await onlineStatusStore.forcePreload()` in der Console ausführen

## Bekannte Einschränkungen

- Cancel-Button ist aktuell deaktiviert (kann später implementiert werden)
- Das Overlay blockiert alle Benutzer-Interaktionen während des Ladens
- Fortschritts-Berechnung ist eine Schätzung basierend auf Gebäude-Anzahl

