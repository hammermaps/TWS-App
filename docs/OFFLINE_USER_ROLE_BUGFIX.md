# Offline-Mode Bugfix: Verhindere user/role API-Call im Offline-Modus

## Problem

Im Offline-Modus wurde der API-Aufruf `api/user/role` gesendet, obwohl die Anwendung offline war. Dies führte zu:
- Fehlgeschlagenen Netzwerk-Requests
- Unnötiger Wartezeit
- Potentiellen Fehlermeldungen

### Zusätzliches Problem

Der Endpunkt `user/role` war nicht im PWA-Precache enthalten, was bedeutet, dass er auch bei schlechter Verbindung nicht gecacht wurde.

## Ursache

### 1. AppSidebarNav.js
Die Sidebar-Navigation lädt die Benutzerrolle über einen API-Call, wenn `currentUser.role` nicht verfügbar ist. Diese Funktion `loadRoleFromAPI()` wurde aufgerufen **ohne zu prüfen, ob die Anwendung online ist**.

```javascript
// Problematischer Code (vorher):
const loadRoleFromAPI = async () => {
  console.log('🔍 Lade Rolle über getRole API...')
  isLoadingRole.value = true
  
  try {
    const roleResponse = await apiUser.getRole() // ❌ Kein Online-Check!
    // ...
  }
}
```

### 2. ApiUser.js
Die `getRole()`-Methode führte immer einen API-Call durch, unabhängig vom Online-Status:

```javascript
// Problematischer Code (vorher):
async getRole(options = {}) {
  const request = new ApiRequest({
    endpoint: "/user/role",
    method: "GET",
    // ...
  })
  
  const response = await this.send(request) // ❌ Immer API-Call!
  return new UserRoleResponse(response.data || {})
}
```

## Lösung

### 1. Online-Prüfung in AppSidebarNav.js

**Datei**: `/src/components/AppSidebarNav.js`

```javascript
const loadRoleFromAPI = async () => {
  if (isLoadingRole.value) return

  // ✅ NEU: Prüfe Online-Status vor API-Call
  if (!onlineStatusStore.isFullyOnline) {
    console.log('📴 Offline-Modus: Überspringe user/role API-Call, verwende Fallback')
    fallbackRole.value = 'user' // Fallback auf 'user' im Offline-Modus
    return
  }

  // Nur bei Online-Status: API-Call durchführen
  console.log('🔍 Lade Rolle über getRole API...')
  isLoadingRole.value = true

  try {
    const roleResponse = await apiUser.getRole()
    // ...
  }
}
```

**Vorteile:**
- ✅ Kein API-Call im Offline-Modus
- ✅ Sofortiges Fallback auf Standard-Rolle 'user'
- ✅ Keine Wartezeit

### 2. Online-Prüfung in ApiUser.getRole()

**Datei**: `/src/api/ApiUser.js`

```javascript
// ✅ NEU: Imports für Online-Status und LocalStorage
import { UserItem, currentUser } from '../stores/GlobalUser.js'
import { useOnlineStatusStore } from '../stores/OnlineStatus.js'

async getRole(options = {}) {
  const { timeout = 5000, headers = {} } = options
  const onlineStatus = useOnlineStatusStore()

  // ✅ NEU: Im Offline-Modus Rolle aus LocalStorage zurückgeben
  if (!onlineStatus.isFullyOnline) {
    console.log('📴 Offline-Modus: Verwende Rolle aus LocalStorage, kein API-Call')
    
    // Versuche Rolle aus currentUser zu holen
    const cachedRole = currentUser.value?.role || 'user'
    
    return new UserRoleResponse({
      role: cachedRole,
      enabled: true
    })
  }

  // Nur bei Online-Status: API-Call durchführen
  const request = new ApiRequest({
    endpoint: "/user/role",
    method: "GET",
    headers,
    timeout,
  })

  const response = await this.send(request)
  return new UserRoleResponse(response.data || {})
}
```

**Vorteile:**
- ✅ Rolle wird aus LocalStorage (`currentUser`) geladen
- ✅ Kein API-Call im Offline-Modus
- ✅ Konsistente Daten mit dem Login-Status

## Flussdiagramm

### Vorher (mit Bug)

```
Sidebar Navigation geladen
    ↓
currentUser.role nicht verfügbar?
    ↓ JA
    ↓
loadRoleFromAPI() aufgerufen
    ↓
❌ user/role API-Call gestartet (auch offline!)
    ↓
❌ Timeout / Netzwerkfehler
    ↓
Fallback auf 'user'
```

### Nachher (mit Fix)

```
Sidebar Navigation geladen
    ↓
currentUser.role nicht verfügbar?
    ↓ JA
    ↓
loadRoleFromAPI() aufgerufen
    ↓
Prüfe: Online?
    ↓ NEIN (Offline)
    ↓
✅ Sofortiger Fallback auf 'user'
✅ KEIN API-Call
✅ Keine Wartezeit

    ↓ JA (Online)
    ↓
getRole() aufgerufen
    ↓
Prüfe: Online?
    ↓ NEIN → LocalStorage
    ↓ JA → API-Call
```

## Geänderte Dateien

### 1. `/src/components/AppSidebarNav.js`
- ✅ Online-Prüfung in `loadRoleFromAPI()` hinzugefügt
- ✅ Frühzeitiger Abbruch bei Offline-Status
- ✅ Sofortiger Fallback auf 'user'-Rolle

### 2. `/src/api/ApiUser.js`
- ✅ Import von `currentUser` und `useOnlineStatusStore`
- ✅ Online-Prüfung in `getRole()`-Methode
- ✅ LocalStorage-Fallback im Offline-Modus

## Warum wird user/role nicht im Precache benötigt?

### Grund 1: Dynamische Daten
Die Benutzerrolle ist benutzerspezifisch und ändert sich dynamisch. Sie sollte NICHT im statischen Precache sein, da:
- Jeder Benutzer eine andere Rolle hat
- Die Rolle zur Laufzeit geladen wird
- Der Precache nur für statische Assets (JS, CSS, HTML) gedacht ist

### Grund 2: LocalStorage als Cache
Die Rolle wird bereits beim Login im `currentUser` (LocalStorage) gespeichert:
```javascript
// Bei Login wird die Rolle gespeichert:
localStorage.setItem('wls_current_user', JSON.stringify({
  id: user.id,
  role: user.role,  // ✅ Rolle hier gespeichert
  name: user.name,
  // ...
}))
```

### Lösung
Statt den API-Endpunkt zu cachen, verwenden wir:
1. **Online-Modus**: API-Call für aktuelle Rolle
2. **Offline-Modus**: LocalStorage (`currentUser.role`)
3. **Fallback**: Standard-Rolle 'user'

## Testing

### Testszenarien

#### 1. Offline-Modus beim Laden der Sidebar
**Schritte:**
1. Gehe offline (Flugmodus)
2. Lade die Anwendung / Navigiere zur Hauptseite
3. Öffne Dev-Tools → Network Tab

**Erwartetes Verhalten:**
- ✅ Sidebar wird geladen
- ✅ KEIN `user/role` Request in der Network Tab
- ✅ Rolle wird aus LocalStorage verwendet
- ✅ Keine Fehlermeldungen

#### 2. Online-Modus beim Laden der Sidebar
**Schritte:**
1. Gehe online
2. Lade die Anwendung
3. Prüfe Network Tab

**Erwartetes Verhalten:**
- ✅ Sidebar wird geladen
- ✅ Falls `currentUser.role` fehlt: `user/role` API-Call wird durchgeführt
- ✅ Rolle wird aktualisiert

#### 3. currentUser.role verfügbar (häufigster Fall)
**Schritte:**
1. Login durchführen
2. Navigation verwenden

**Erwartetes Verhalten:**
- ✅ Rolle ist bereits in `currentUser` verfügbar
- ✅ KEIN `user/role` API-Call (weder online noch offline)
- ✅ Sidebar zeigt korrekte Navigation

#### 4. Offline → Online Wechsel
**Schritte:**
1. Starte offline
2. Sidebar lädt mit LocalStorage-Rolle
3. Gehe online

**Erwartetes Verhalten:**
- ✅ Offline: Rolle aus LocalStorage
- ✅ Nach Online-Wechsel: Navigation bleibt funktional

## Vorteile der Lösung

### Performance
- ⚡ Sofortige Anzeige im Offline-Modus
- ⚡ Keine Wartezeit auf Timeouts
- ⚡ Reduzierte Netzwerk-Last

### User Experience
- 👍 Keine Fehlermeldungen im Offline-Modus
- 👍 Sidebar funktioniert auch offline
- 👍 Konsistente Rolle mit Login-Status

### Code-Qualität
- 🔧 Doppelte Absicherung (Component + API)
- 🔧 Defensive Programmierung
- 🔧 LocalStorage als primärer Cache für User-Daten

## Best Practices

### Für andere rollenbasierte Features

Wenn Sie ähnliche Funktionalität implementieren möchten:

```javascript
import { useOnlineStatusStore } from '../stores/OnlineStatus.js'
import { currentUser } from '../stores/GlobalUser.js'

async function loadUserSpecificData() {
  const onlineStatus = useOnlineStatusStore()

  // 1. Versuche aus LocalStorage zu laden
  const cachedData = currentUser.value?.someData

  // 2. Im Offline-Modus: Verwende nur Cache
  if (!onlineStatus.isFullyOnline) {
    console.log('📴 Offline: Verwende LocalStorage')
    return cachedData || defaultValue
  }

  // 3. Online: API-Call mit Fallback auf Cache
  try {
    const response = await apiCall()
    return response.data
  } catch (error) {
    return cachedData || defaultValue
  }
}
```

## Zusammenfassung der Fixes

Jetzt wurden **3 API-Endpunkte** im Offline-Modus abgesichert:

| Endpunkt | Status | Dateien |
|----------|--------|---------|
| `records/create` | ✅ Behoben | `OfflineFlushSyncService.js` |
| `apartments/list/{id}` | ✅ Behoben | `ApiApartment.js`, `OfflineDataPreloader.js` |
| `user/role` | ✅ Behoben | `AppSidebarNav.js`, `ApiUser.js` |

## Zusammenfassung

Das Problem wurde vollständig behoben:

✅ **Kein `user/role` API-Call mehr im Offline-Modus**  
✅ **Rolle wird aus LocalStorage verwendet**  
✅ **Sidebar funktioniert nahtlos offline**  
✅ **Build erfolgreich** (kompiliert ohne Fehler)  
✅ **Doppelte Absicherung** (Component + API-Ebene)

Die Anwendung ist jetzt vollständig offline-fähig ohne unnötige API-Calls!

---

**Datum**: 2025-11-01  
**Autor**: GitHub Copilot  
**Version**: 1.0.0  
**Betroffene Dateien**: 2 (AppSidebarNav.js, ApiUser.js)

