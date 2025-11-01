# Dokumentation: Überarbeitetes Leerstandspülungs-System

## Übersicht

Das Leerstandspülungs-System wurde komplett überarbeitet, um folgende Anforderungen zu erfüllen:

1. **LocalStorage-Integration**: Alle relevanten Daten (User-ID, Apartment-Daten) werden aus dem LocalStorage geladen
2. **Mindestspüldauer**: Eine Spülung muss mindestens die konfigurierte `min_flush_duration` (in Sekunden) laufen
3. **Lokaler Timer**: Die Zeit läuft lokal im Frontend, ohne Backend-Calls während der Spülung
4. **Backend-Call beim Stoppen**: Erst wenn der User die Spülung nach Erreichen der Mindestdauer stoppt, wird ein Record ans Backend gesendet

## Architektur

### 1. LocalStorage-Persistierung

#### GlobalUser Store (`src/stores/GlobalUser.js`)

Der GlobalUser Store wurde erweitert um:

```javascript
// User-Daten werden automatisch im LocalStorage gespeichert
setUser(userData)  // Speichert auch in localStorage['wls_current_user']

// User-Daten aus LocalStorage laden
getCurrentUser()  // Lädt automatisch aus LocalStorage falls nicht im Memory

// Beim App-Start User aus LocalStorage laden
initUserFromLocalStorage()
```

**Wichtig**: Die User-ID ist jetzt immer verfügbar über:
- `getCurrentUser().id` (aus GlobalUser Store)
- `JSON.parse(localStorage.getItem('wls_current_user')).id` (direkter Zugriff)

### 2. Apartment-API (`src/api/ApiApartment.js`)

#### Neue Funktion: `createFlushRecord()`

Ersetzt die alte `flush()` Funktion. Wird erst aufgerufen, nachdem der User die Spülung stoppt.

**Parameter:**
```javascript
{
  startTime: ISO-Zeitstempel (wann wurde START gedrückt),
  endTime: ISO-Zeitstempel (wann wurde STOPP gedrückt),
  duration: Tatsächliche Dauer in Sekunden
}
```

**Funktionsweise:**
1. Lädt Apartment-Daten aus LocalStorage
2. Holt User-ID aus GlobalUser Store oder direkt aus LocalStorage
3. Sendet POST-Request an `/records/create`
4. Aktualisiert LocalStorage und reaktive Refs mit neuen Spül-Daten

**Backend-Payload:**
```json
{
  "apartment_id": 123,
  "building_id": 5,
  "user_id": 42,
  "start_time": "2025-10-17T10:30:00.000Z",
  "end_time": "2025-10-17T10:31:25.000Z"
}
```

### 3. Spül-Komponente (`src/views/apartments/ApartmentFlushing.vue`)

#### Neuer Ablauf

**1. Spülung starten (START-Button):**
```javascript
startFlushing() {
  isFlushingActive.value = true
  flushStartTime.value = Date.now()
  flushStartTimeISO.value = new Date().toISOString()
  elapsedTime.value = 0
  startTimer()  // Lokaler setInterval-Timer
}
```

- Kein Backend-Call!
- Timer läuft lokal
- UI zeigt Fortschritt in Echtzeit

**2. Während der Spülung:**
```javascript
// Timer aktualisiert jede Sekunde
flushTimer = setInterval(() => {
  elapsedTime.value = Math.floor((now - flushStartTime.value) / 1000)
}, 1000)

// Prüfung ob Mindestdauer erreicht
canStopFlushing = computed(() => {
  return elapsedTime.value >= currentApartment.value.min_flush_duration
})
```

- STOPP-Button ist **disabled** bis `min_flush_duration` erreicht
- Progress-Ring zeigt visuell den Fortschritt:
  - 🔴 Rot (0-50%): Noch nicht genug
  - 🟡 Gelb (50-99%): Fast erreicht
  - 🟢 Grün (100%+): Mindestdauer erreicht, kann gestoppt werden

**3. Spülung stoppen (STOPP-Button nach min_flush_duration):**
```javascript
stopFlushing() {
  // Prüfung ob Mindestdauer erreicht
  if (!canStopFlushing.value) {
    error = "Mindestdauer noch nicht erreicht"
    return
  }

  clearTimer()
  
  // JETZT erst Backend-Call
  await createFlushRecord(apartmentId, {
    startTime: flushStartTimeISO.value,
    endTime: new Date().toISOString(),
    duration: elapsedTime.value
  })
  
  // UI zurücksetzen
  isFlushingActive.value = false
  elapsedTime.value = 0
}
```

## UI-Komponenten

### Progress-Ring (SVG Circle)

```vue
<circle
  :stroke="getCountdownColor()"
  :stroke-dashoffset="strokeDashoffset"
/>
```

- Füllt sich während der Spülung
- Farbe ändert sich basierend auf Fortschritt
- Vollständige visuelle Feedback

### Status-Badge

Zeigt aktuellen Status:
- ⏸️ "Noch nie gespült" (grau)
- ℹ️ "Bereit für Spülung" (blau)
- ⏯️ "Spülung läuft..." (gelb)
- ✅ "Mindestdauer erreicht - Kann gestoppt werden" (grün)

### Zentraler Start/Stop-Button

- **START** (blau): Startet lokalen Timer
- **STOPP** (rot, disabled bis Mindestdauer): Sendet Record ans Backend
- Zeigt aktuelle Laufzeit und verbleibende Zeit bis Minimum

## Datenfluss

```
1. User klickt START
   └─> Lokaler Timer startet
       └─> UI aktualisiert sich jede Sekunde
           └─> Progress-Ring füllt sich
               └─> Bei min_flush_duration: STOPP-Button wird enabled

2. User klickt STOPP (nach min_flush_duration)
   └─> Timer stoppt
       └─> Backend-Call: createFlushRecord()
           ├─> User-ID aus LocalStorage
           ├─> Apartment-Daten aus LocalStorage
           └─> POST /records/create
               └─> Success: LocalStorage + UI aktualisieren
                   └─> Optional: Auto-Navigation zur nächsten Wohnung
```

## LocalStorage-Struktur

### User-Daten
```javascript
localStorage['wls_current_user'] = {
  "id": 42,
  "username": "max.mustermann",
  "name": "Max Mustermann",
  "email": "max@example.com",
  "role": "user",
  "enabled": true,
  ...
}
```

### Apartment-Daten
```javascript
localStorage['wls_apartments_db'] = {
  "5": [  // building_id
    {
      "id": 123,
      "building_id": 5,
      "number": "101",
      "floor": "1",
      "min_flush_duration": 30,  // Sekunden!
      "last_flush_date": "2025-10-17T10:31:25.000Z",
      "next_flush_due": "2025-10-24T10:31:25.000Z",
      ...
    }
  ]
}
```

## Fehlerbehandlung

### Keine User-ID gefunden
```javascript
if (!currentUserId) {
  throw new Error('Keine User-ID gefunden. Bitte einloggen.')
}
```
→ User muss sich (erneut) einloggen

### Mindestdauer nicht erreicht
```javascript
if (!canStopFlushing.value) {
  error = `Mindestspüldauer von ${min_flush_duration}s noch nicht erreicht`
}
```
→ STOPP-Button bleibt disabled

### Backend-Fehler beim Speichern
```javascript
try {
  await createFlushRecord(...)
} catch (err) {
  error = err.message
  // UI-State wird trotzdem zurückgesetzt
  isFlushingActive = false
}
```
→ Fehler wird angezeigt, Timer stoppt trotzdem

## Features

### ✅ Auto-Navigation
- Checkbox "Zur nächsten Wohnung springen"
- Nach erfolgreichem Stoppen: Automatisch zur nächsten Wohnung navigieren
- 1.5 Sekunden Verzögerung für bessere UX

### ✅ Echtzeit-Feedback
- Sekunden-genaue Anzeige der Laufzeit
- Verbleibende Zeit bis Mindestdauer
- Visueller Fortschritts-Ring
- Farbcodierung (Rot → Gelb → Grün)

### ✅ Offline-Ready
- Alle Daten aus LocalStorage
- User-ID immer verfügbar
- Apartment-Daten gecacht
- Funktioniert auch bei Seitenreload während Spülung (Timer geht verloren, aber Daten bleiben)

## Konfiguration

### Mindestspüldauer anpassen
Backend: `/apartments/update` endpoint
```json
{
  "id": 123,
  "min_flush_duration": 45  // Sekunden
}
```

### Spül-Intervall (nächste Spülung)
Wird vom Backend nach erfolgreicher Spülung berechnet:
```json
{
  "next_flush_due": "2025-10-24T10:00:00.000Z"
}
```

## Testing

### Manueller Test-Ablauf

1. **Login durchführen**
   - User-Daten werden in LocalStorage gespeichert
   - Überprüfen: `localStorage.getItem('wls_current_user')`

2. **Apartment auswählen**
   - Zu Gebäude navigieren
   - Apartment für Spülung wählen
   - "Spülung starten" klicken

3. **Spülung starten**
   - START-Button klicken
   - Timer sollte bei 0 starten und hochzählen
   - Progress-Ring sollte sich füllen
   - STOPP-Button sollte disabled sein

4. **Warten auf Mindestdauer**
   - Timer läuft bis `min_flush_duration` erreicht
   - Ring wird grün
   - STOPP-Button wird enabled
   - Status ändert sich zu "Kann gestoppt werden"

5. **Spülung stoppen**
   - STOPP-Button klicken
   - Backend-Call wird ausgeführt
   - Success-Meldung erscheint
   - `last_flush_date` wird aktualisiert
   - Optional: Navigation zur nächsten Wohnung

### Browser DevTools

**Console-Logs prüfen:**
```
🚿 Starte Spülung für Apartment: 101
✅ User-ID aus GlobalUser Store: 42
📤 Erstelle Spül-Record: {...}
✅ Spül-Record erfolgreich erstellt für Apartment: 101
💾 Apartments in LocalStorage und reactive ref aktualisiert: 12
```

**LocalStorage inspizieren:**
```javascript
// In Browser Console
JSON.parse(localStorage.getItem('wls_current_user'))
JSON.parse(localStorage.getItem('wls_apartments_db'))
```

## Migration von alter zu neuer Version

### Alte Funktion (entfernt)
```javascript
// ❌ Alte flush() Funktion - wurde entfernt
flush(apartmentId, { duration })
```

### Neue Funktion
```javascript
// ✅ Neue createFlushRecord() Funktion
createFlushRecord(apartmentId, { startTime, endTime, duration })
```

### Breaking Changes
- Keine direkten Breaking Changes für andere Komponenten
- `flush()` wurde durch `createFlushRecord()` ersetzt
- Nur `ApartmentFlushing.vue` nutzt diese Funktion

## Best Practices

1. **Immer Mindestdauer einhalten**: Backend sollte auch prüfen
2. **User-ID validieren**: Vor jedem Record-Create
3. **LocalStorage synchron halten**: Nach jedem Backend-Update
4. **Timer cleanup**: Bei Component unmount immer clearInterval()
5. **Fehlerbehandlung**: UI-State auch bei Fehlern zurücksetzen

## Zukünftige Erweiterungen

- [ ] Spülung pausieren/fortsetzen
- [ ] Offline-Queue für Records (bei fehlendem Internet)
- [ ] Statistiken: Durchschnittliche Spüldauer pro Apartment
- [ ] Push-Benachrichtigungen bei überfälligen Spülungen
- [ ] Bulk-Spülung für mehrere Apartments
- [ ] Spül-Protokoll mit Zeitverlauf-Diagramm

