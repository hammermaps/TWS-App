# PWA und Online/Offline-Modus Dokumentation

## Übersicht

Die WLS Leerstandsspülung App wurde als Progressive Web App (PWA) mit umfassender Online/Offline-Unterstützung implementiert. Die App ermöglicht es Benutzern, Leerstandspülungen auch ohne Internetverbindung durchzuführen und synchronisiert die Daten automatisch, sobald eine Verbindung wiederhergestellt ist.

## 📱 PWA-Features

### Installation
Die App kann auf allen unterstützten Geräten installiert werden:
- **Android**: "Zum Startbildschirm hinzufügen"
- **iOS**: "Zum Home-Bildschirm" über Safari
- **Desktop**: Installation über Browser-Menü (Chrome, Edge, etc.)

### Offline-Funktionalität
- Service Worker cached alle statischen Ressourcen
- API-Anfragen werden mit NetworkFirst-Strategie gecacht
- Automatische Synchronisierung bei Wiederherstellung der Verbindung

## 🔌 Online/Offline-Status-Verwaltung

### Automatische Erkennung

Die App überwacht kontinuierlich die Verbindung zum Server:

1. **Browser-Status**: Prüft `navigator.onLine`
2. **Server-Erreichbarkeit**: Regelmäßige Ping-Anfragen (alle 30 Sekunden)
3. **Automatische Umschaltung**: Bei 3 aufeinanderfolgenden fehlgeschlagenen Pings wechselt die App automatisch in den Offline-Modus

### Manueller Modus

Benutzer können manuell zwischen Online- und Offline-Modus wechseln:

- **Manuell Offline**: Deaktiviert Ping-Prüfungen und versetzt die App in den Offline-Modus
- **Manuell Online**: Reaktiviert Ping-Überwachung und versucht Serververbindung

### Verbindungsstatus-Anzeige

Im Header der App wird der aktuelle Status angezeigt:

- 🟢 **Online**: Volle Funktionalität verfügbar
- 🟡 **Offline (Server nicht erreichbar)**: Automatisch in Offline-Modus
- 🔴 **Offline (Keine Netzwerkverbindung)**: Kein Internet verfügbar
- ⚫ **Offline (Manuell)**: Benutzer hat manuell offline geschaltet

## 🎯 Feature-Verfügbarkeit

### Immer verfügbar (Online & Offline)
- ✅ **Leerstandspülungen durchführen**
- ✅ **Gebäude und Apartments anzeigen** (gecachte Daten)
- ✅ **Spülhistorie anzeigen** (lokale Daten)
- ✅ **Navigation in der App**

### Nur im Online-Modus
- ❌ **Passwort ändern**
- ❌ **Statistiken anzeigen**
- ❌ **Benutzerverwaltung**
- ❌ **Gebäudeverwaltung** (Neue Gebäude erstellen/bearbeiten)

## 🛠️ Technische Implementierung

### Komponenten

#### 1. **OnlineStatus Store** (`src/stores/OnlineStatus.js`)
Zentraler State-Manager für Online/Offline-Status:

```javascript
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const onlineStatusStore = useOnlineStatusStore()

// Status prüfen
const isOnline = onlineStatusStore.isFullyOnline
const connectionStatus = onlineStatusStore.connectionStatus

// Features prüfen
const canChangePassword = onlineStatusStore.isFeatureAvailable('password-change')

// Manuell umschalten
onlineStatusStore.setManualOffline(true) // Offline-Modus aktivieren
onlineStatusStore.setManualOffline(false) // Online-Modus aktivieren

// Manueller Ping
onlineStatusStore.pingServer()
```

**Wichtige Properties:**
- `isFullyOnline`: Kombination aus Browser-Status, Server-Erreichbarkeit und manuellem Modus
- `isServerReachable`: Server kann erreicht werden
- `manualOfflineMode`: Benutzer hat manuell offline geschaltet
- `connectionStatus`: Detaillierte Status-Informationen (status, label, color, icon)
- `lastPingTime`: Zeitpunkt des letzten Pings
- `consecutiveFailures`: Anzahl aufeinanderfolgender fehlgeschlagener Pings

**Wichtige Methoden:**
- `initialize()`: Initialisiert Überwachung und lädt gespeicherten Zustand
- `pingServer()`: Führt sofort einen Ping aus
- `setManualOffline(offline)`: Setzt manuellen Offline-Modus
- `isFeatureAvailable(featureName)`: Prüft ob Feature verfügbar ist
- `cleanup()`: Räumt Intervalle auf

#### 2. **OnlineStatusToggle Komponente** (`src/components/OnlineStatusToggle.vue`)
Dropdown im Header zum Anzeigen und Steuern des Verbindungsstatus:

- Zeigt aktuellen Status mit Icon und Badge
- Detail-Informationen über Browser- und Server-Status
- Checkbox für manuellen Offline-Modus
- Button für manuellen Ping
- Liste der eingeschränkten Features im Offline-Modus

#### 3. **OfflineModeBanner Komponente** (`src/components/OfflineModeBanner.vue`)
Banner-Benachrichtigung bei Offline-Status:

- Wird automatisch angezeigt wenn nicht online
- Zeigt Grund für Offline-Status
- Button zum Aktivieren des Online-Modus (bei manuellem Offline)
- Button zum Erneuten Verbinden (bei Server-Ausfall)

#### 4. **useFeatureAccess Composable** (`src/composables/useFeatureAccess.js`)
Hilfsfunktionen für Feature-Zugriffskontrolle:

```javascript
import { useFeatureAccess } from '@/composables/useFeatureAccess.js'

const { 
  hasOnlineAccess,
  canChangePassword,
  canViewStatistics,
  canManageBuildings,
  executeIfOnline,
  showFeatureUnavailableMessage
} = useFeatureAccess()

// Feature-spezifische Prüfung
if (canChangePassword.value) {
  // Passwort ändern
}

// Mit automatischer Fehlerbehandlung
executeIfOnline('statistics', async () => {
  // Statistiken laden
})
```

### Service Worker

Der Service Worker wird automatisch von Vite PWA Plugin generiert:

- Cached alle statischen Ressourcen (JS, CSS, HTML, Bilder)
- NetworkFirst-Strategie für API-Anfragen
- Automatische Updates bei neuen Versionen

### Vite-Konfiguration

```javascript
// vite.config.mjs
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'WLS Leerstandsspülung App',
        short_name: 'WLS App',
        // ...
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/wls\.dk-automation\.de\/api\/.*/i,
            handler: 'NetworkFirst',
            // ...
          }
        ]
      }
    })
  ]
})
```

## 📊 Ping-Überwachung

### Konfiguration

In `OnlineStatus.js`:
```javascript
const PING_INTERVAL = 30000 // 30 Sekunden
const MAX_FAILURES_BEFORE_OFFLINE = 3 // Nach 3 Fehlern -> Offline
```

### Ablauf

1. **Initialisierung**: App startet mit automatischer Ping-Überwachung
2. **Erster Ping**: Sofort beim Start
3. **Regelmäßige Pings**: Alle 30 Sekunden
4. **Bei Erfolg**: 
   - `consecutiveFailures` wird auf 0 zurückgesetzt
   - Status bleibt online
5. **Bei Fehler**: 
   - `consecutiveFailures` wird erhöht
   - Nach 3 Fehlern: Automatischer Wechsel zu Offline
   - Benachrichtigung an Benutzer

### Health-Check Endpoint

Die Ping-Funktion verwendet `ApiHealth.ping()`:

```javascript
// src/api/ApiHealth.js
async function ping() {
  const response = await axios.get('/api/health/ping')
  return response.data
}
```

## 🔄 Offline-Synchronisierung

Die vorhandene Offline-Flush-Synchronisierung wurde erweitert:

### Bestehende Funktionalität
- Spülungen werden lokal in `OfflineFlushStorage` gespeichert
- `OfflineFlushSyncService` synchronisiert automatisch
- Sync-Status wird in UI angezeigt

### Integration mit Online-Status
```javascript
// In ApartmentFlushing.vue
const isOnline = computed(() => onlineStatusStore.isFullyOnline)

// Sync nur wenn online
if (isOnline.value && hasUnsyncedFlushes) {
  await syncService.forceSync()
}
```

## 🎨 UI/UX-Features

### Status-Badges
- Farbkodierte Badges für schnelle visuelle Identifikation
- Animierte Icons während Ping-Prüfung
- Pulse-Animation für bessere Sichtbarkeit

### Benachrichtigungen
- Toast-Benachrichtigungen bei Status-Änderungen
- Warnungen vor nicht verfügbaren Features
- Erfolgsbestätigungen bei Synchronisierung

### Banner
- Slide-Down-Animation für Offline-Banner
- Kontextabhängige Aktions-Buttons
- Automatisches Ausblenden wenn wieder online

## 🚀 Verwendung in neuen Komponenten

### Status-Prüfung

```javascript
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const onlineStatusStore = useOnlineStatusStore()

// Einfache Prüfung
if (onlineStatusStore.isFullyOnline) {
  // Online-Operation
}

// Feature-spezifische Prüfung
if (onlineStatusStore.isFeatureAvailable('statistics')) {
  // Statistiken laden
}
```

### Feature mit Offline-Fallback

```javascript
import { useFeatureAccess } from '@/composables/useFeatureAccess.js'

const { executeIfOnline } = useFeatureAccess()

async function loadData() {
  const success = await executeIfOnline('statistics', async () => {
    // Daten vom Server laden
    const data = await api.getStatistics()
    return data
  })
  
  if (!success) {
    // Fallback: Gecachte Daten verwenden
    loadCachedData()
  }
}
```

### Bedingte UI-Elemente

```vue
<template>
  <div>
    <!-- Nur online anzeigen -->
    <CButton 
      v-if="onlineStatusStore.isFullyOnline"
      @click="changePassword"
    >
      Passwort ändern
    </CButton>
    
    <!-- Offline-Warnung -->
    <CAlert 
      v-if="!onlineStatusStore.isFullyOnline"
      color="warning"
    >
      Diese Funktion ist offline nicht verfügbar
    </CAlert>
  </div>
</template>
```

## 📝 Best Practices

### 1. Immer den Store verwenden
❌ **Nicht**: `if (navigator.onLine)`
✅ **Sondern**: `if (onlineStatusStore.isFullyOnline)`

### 2. Feature-Checks vor API-Aufrufen
```javascript
if (onlineStatusStore.isFeatureAvailable('statistics')) {
  await loadStatistics()
} else {
  showOfflineMessage()
}
```

### 3. Graceful Degradation
- Offline-Alternativen anbieten
- Gecachte Daten nutzen
- Benutzer über Einschränkungen informieren

### 4. Benutzerfreundliche Fehlermeldungen
```javascript
if (!isOnline) {
  showToast(
    'Diese Funktion erfordert eine Internetverbindung', 
    'warning'
  )
}
```

## 🔧 Wartung & Debugging

### Console-Befehle

```javascript
// In Browser-Console verfügbar:

// Online-Status prüfen
const store = useOnlineStatusStore()
console.log('Online:', store.isFullyOnline)
console.log('Status:', store.connectionStatus)

// Manueller Ping
store.pingServer()

// Status ändern
store.setManualOffline(true)
store.setManualOffline(false)
```

### Logging

Die Store-Implementierung loggt alle wichtigen Events:
- `🚀 Starte Ping-Überwachung...`
- `✅ Server ist wieder erreichbar`
- `❌ Ping fehlgeschlagen`
- `⚠️ Ping fehlgeschlagen (x/3)`
- `🔴 Server nicht erreichbar - Wechsel zu Offline-Modus`
- `📴 Manueller Offline-Modus aktiviert`
- `📶 Manueller Online-Modus aktiviert`

## 🧪 Testing

### Offline-Modus testen

1. **Browser DevTools**:
   - Chrome/Edge: DevTools → Network → "Offline" auswählen
   - Firefox: DevTools → Network → "Offline" auswählen

2. **Manueller Modus**:
   - Klick auf Status-Icon im Header
   - Checkbox "Manueller Offline-Modus" aktivieren

3. **Server-Ausfall simulieren**:
   - Backend-Server stoppen
   - Nach 3 Ping-Versuchen (ca. 90 Sekunden) wechselt App zu Offline

### PWA-Installation testen

1. **Desktop**: Chrome → Menü → "App installieren"
2. **Android**: Chrome → Menü → "Zum Startbildschirm hinzufügen"
3. **iOS**: Safari → Teilen → "Zum Home-Bildschirm"

## 🔐 Sicherheit

### Lokale Speicherung
- Offline-Daten werden im Browser gespeichert (localStorage/IndexedDB)
- Bei Logout werden alle lokalen Daten gelöscht
- Sensible Daten werden nicht gecacht

### Token-Verwaltung
- Token werden nur online validiert
- Offline-Modus nutzt gecachte Token-Informationen
- Bei Token-Ablauf erfolgt automatischer Logout wenn online

## 📱 Mobile Optimierungen

- Touch-optimierte UI-Elemente
- Responsive Design für alle Bildschirmgrößen
- Reduzierte Datenübertragung im Offline-Modus
- Optimierte Performance durch Service Worker

## 🎯 Zukünftige Erweiterungen

Mögliche Verbesserungen:

1. **Push-Benachrichtigungen**: Bei wichtigen Events
2. **Background Sync**: Automatische Synchronisierung im Hintergrund
3. **Periodic Background Sync**: Regelmäßige Updates im Hintergrund
4. **Advanced Caching**: Intelligentere Cache-Strategien
5. **Offline-Formular-Validierung**: Verbesserte Offline-Erfahrung
6. **Conflict Resolution**: Bessere Behandlung von Sync-Konflikten

## 📚 Ressourcen

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Web App Manifest](https://web.dev/add-manifest/)

