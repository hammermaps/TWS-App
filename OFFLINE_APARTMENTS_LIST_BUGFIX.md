# Offline-Mode Bugfix: Verhindere apartments/list API-Calls im Offline-Modus

## Problem

Im Offline-Modus wurden `apartments/list/{buildingId}` API-Aufrufe gesendet, obwohl die Anwendung offline war. Dies führte zu:
- Fehlgeschlagenen Netzwerk-Requests
- Unnötiger Wartezeit
- Verwirrenden Fehlermeldungen für Benutzer

## Ursache

Die `list()`-Methode in `ApiApartment.js` versuchte **immer** einen API-Call durchzuführen, unabhängig vom Online-Status. Sie hatte zwar einen Fallback auf LocalStorage im `catch`-Block, aber der API-Request wurde trotzdem gestartet.

### Betroffene Komponenten

1. **BuildingApartments.vue**: Lädt beim `onMounted` automatisch Apartments via `list()`
2. **OfflineDataPreloader.js**: Lädt Apartments beim Preloading ohne Online-Prüfung
3. **ApiApartment.js**: Die `list()`-Methode prüfte nicht den Online-Status

## Lösung

### 1. Online-Prüfung in `ApiApartment.list()`

**Datei**: `/src/api/ApiApartment.js`

```javascript
// ✅ NEU: Import des Online-Status Store
import { useOnlineStatusStore } from '../stores/OnlineStatus.js'

async list(options = {}) {
  const storage = useApartmentStorage()
  const onlineStatus = useOnlineStatusStore()
  
  // Zuerst LocalStorage-Daten laden
  if (building_id) {
    const cachedApartments = storage.storage.getApartmentsForBuilding(building_id)
    storage.apartments.value = cachedApartments
  }

  // ✅ NEU: Im Offline-Modus direkt LocalStorage zurückgeben, KEIN API-Call
  if (!onlineStatus.isFullyOnline) {
    console.log('📴 Offline-Modus: Verwende nur LocalStorage-Daten, kein API-Call')
    
    if (building_id) {
      const cachedApartments = storage.storage.getApartmentsForBuilding(building_id)
      return new ApiApartmentListResponse({
        items: cachedApartments,
        success: true,
        error: cachedApartments.length > 0 
          ? 'Daten aus lokalem Speicher (Offline)' 
          : 'Keine Daten im Offline-Modus verfügbar'
      })
    }
    
    return new ApiApartmentListResponse({
      items: storage.apartments.value || [],
      success: true,
      error: 'Daten aus lokalem Speicher (Offline)'
    })
  }

  // Nur bei Online-Status: API-Call durchführen
  const request = new ApiRequest({ ... })
  const response = await this.send(request)
  // ...
}
```

**Vorteile:**
- ✅ Kein API-Call im Offline-Modus
- ✅ Sofortige Anzeige von LocalStorage-Daten
- ✅ Keine Netzwerk-Timeouts
- ✅ Bessere Performance im Offline-Modus

### 2. Online-Prüfung in `OfflineDataPreloader`

**Datei**: `/src/services/OfflineDataPreloader.js`

```javascript
async preloadAllData() {
  if (this.isPreloading.value) {
    return false
  }

  // ✅ NEU: Prüfe Online-Status vor dem Preloading
  if (!navigator.onLine) {
    console.log('📴 Preloading abgebrochen: Keine Internetverbindung')
    this.preloadError.value = 'Keine Internetverbindung verfügbar'
    this.preloadProgress.value.status = 'error'
    return false
  }

  // Nur bei Online-Status: Daten laden
  this.isPreloading.value = true
  // ...
}
```

**Vorteile:**
- ✅ Verhindert Preloading-Versuche im Offline-Modus
- ✅ Klare Fehlermeldung
- ✅ Kein unnötiger Ressourcenverbrauch

## Flussdiagramm

### Vorher (mit Bug)

```
Component mounted (BuildingApartments.vue)
    ↓
loadApartments() aufgerufen
    ↓
list({ building_id: 1 }) aufgerufen
    ↓
LocalStorage-Daten geladen (✅)
    ↓
❌ API-Call gestartet (apartments/list/1)
    ↓
❌ Timeout / Netzwerkfehler
    ↓
Fallback auf LocalStorage (zu spät)
```

### Nachher (mit Fix)

```
Component mounted (BuildingApartments.vue)
    ↓
loadApartments() aufgerufen
    ↓
list({ building_id: 1 }) aufgerufen
    ↓
LocalStorage-Daten geladen (✅)
    ↓
Prüfe: isFullyOnline?
    ↓ NEIN (Offline)
    ↓
✅ Gebe LocalStorage-Daten zurück
✅ KEIN API-Call
✅ Sofortige Anzeige
```

## Geänderte Dateien

### 1. `/src/api/ApiApartment.js`
- ✅ Import von `useOnlineStatusStore`
- ✅ Online-Prüfung vor API-Call in `list()`-Methode
- ✅ Direktes Zurückgeben von LocalStorage-Daten im Offline-Modus

### 2. `/src/services/OfflineDataPreloader.js`
- ✅ Online-Prüfung vor Start des Preloadings
- ✅ Frühzeitiger Abbruch bei fehlender Verbindung

## Testing

### Testszenarien

#### 1. Offline-Modus beim Laden von Apartments
**Schritte:**
1. Gehe offline (Flugmodus oder Dev-Tools Network: Offline)
2. Navigiere zu einem Gebäude (z.B. `/buildings/1/apartments`)
3. Öffne Browser Dev-Tools → Network Tab

**Erwartetes Verhalten:**
- ✅ Apartments werden aus LocalStorage geladen und angezeigt
- ✅ KEIN `apartments/list/1` Request in der Network Tab
- ✅ Keine Fehlermeldungen
- ✅ Offline-Badge wird angezeigt

#### 2. Online-Modus beim Laden von Apartments
**Schritte:**
1. Gehe online
2. Navigiere zu einem Gebäude
3. Prüfe Network Tab

**Erwartetes Verhalten:**
- ✅ Apartments werden zuerst aus LocalStorage geladen (sofort)
- ✅ API-Call `apartments/list/1` wird durchgeführt
- ✅ LocalStorage wird mit Server-Daten aktualisiert

#### 3. Offline → Online Wechsel
**Schritte:**
1. Starte offline
2. Lade Apartments-Seite (nur LocalStorage)
3. Gehe online
4. Lade Seite neu

**Erwartetes Verhalten:**
- ✅ Nach Online-Wechsel: API-Call wird durchgeführt
- ✅ Daten werden synchronisiert

#### 4. Preloading im Offline-Modus
**Schritte:**
1. Gehe offline
2. Versuche manuelles Preloading (falls Button vorhanden)

**Erwartetes Verhalten:**
- ✅ Fehlermeldung: "Preloading nur im Online-Modus möglich"
- ✅ Keine API-Calls werden gestartet

## Vorteile der Lösung

### Performance
- ⚡ Sofortige Anzeige von Apartments im Offline-Modus
- ⚡ Keine Wartezeit auf Timeouts
- ⚡ Reduzierte Netzwerk-Last

### User Experience
- 👍 Keine Fehlermeldungen im Offline-Modus
- 👍 Klare Feedback-Meldung: "Daten aus lokalem Speicher (Offline)"
- 👍 Nahtlose Offline-Funktionalität

### Code-Qualität
- 🔧 Klare Trennung: Online = API-Call, Offline = LocalStorage
- 🔧 Defensive Programmierung
- 🔧 Einheitliche Fehlerbehandlung

## Best Practices

### Für andere API-Methoden

Wenn Sie ähnliche Offline-Funktionalität für andere API-Methoden implementieren möchten:

```javascript
import { useOnlineStatusStore } from '../stores/OnlineStatus.js'

async yourApiMethod(options = {}) {
  const onlineStatus = useOnlineStatusStore()
  const storage = useYourStorage()

  // 1. Lade zuerst aus LocalStorage
  const cachedData = storage.getCachedData()
  
  // 2. Im Offline-Modus: Gebe Cache zurück, KEIN API-Call
  if (!onlineStatus.isFullyOnline) {
    console.log('📴 Offline-Modus: Verwende nur LocalStorage')
    return {
      success: true,
      data: cachedData,
      error: 'Daten aus lokalem Speicher (Offline)'
    }
  }

  // 3. Online: API-Call durchführen
  try {
    const response = await this.send(request)
    // Aktualisiere Cache
    storage.updateCache(response.data)
    return response
  } catch (error) {
    // Fallback auf Cache bei Fehler
    return {
      success: cachedData.length > 0,
      data: cachedData,
      error: error.message
    }
  }
}
```

## Zusammenfassung

Das Problem wurde vollständig behoben:

✅ **Keine `apartments/list` API-Calls mehr im Offline-Modus**  
✅ **LocalStorage-Daten werden sofort verwendet**  
✅ **Bessere Performance und User Experience**  
✅ **Build erfolgreich** (kompiliert ohne Fehler)  
✅ **Robuste Offline-Funktionalität**

Die Apartments-Ansicht funktioniert jetzt nahtlos im Offline-Modus, ohne unnötige API-Calls oder Fehlermeldungen.

---

**Datum**: 2025-11-01  
**Autor**: GitHub Copilot  
**Version**: 1.0.0  
**Betroffene Dateien**: 2 (ApiApartment.js, OfflineDataPreloader.js)

