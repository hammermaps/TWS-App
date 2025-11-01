# PWA Setup - Quick Start Guide

## ✅ Was wurde implementiert

Die WLS App wurde erfolgreich zu einer Progressive Web App (PWA) mit vollständiger Online/Offline-Unterstützung umgebaut.

### Neue Features:

1. **📱 PWA-Funktionalität**
   - App kann auf allen Geräten installiert werden
   - Funktioniert offline
   - Service Worker für Caching

2. **🔌 Online/Offline-Management**
   - Automatische Erkennung des Verbindungsstatus
   - Regelmäßige Server-Pings (alle 30 Sekunden)
   - Automatischer Wechsel zu Offline nach 3 fehlgeschlagenen Pings
   - Manuelle Online/Offline-Umschaltung per Checkbox

3. **🎯 Feature-Verfügbarkeit**
   - ✅ Leerstandspülungen: Funktionieren offline
   - ❌ Passwort ändern: Nur online
   - ❌ Statistiken: Nur online
   - ❌ Benutzerverwaltung: Nur online
   - ❌ Gebäudeverwaltung: Nur online

4. **🎨 UI-Komponenten**
   - Status-Toggle im Header mit Dropdown-Details
   - Offline-Banner bei fehlender Verbindung
   - Status-Badges und Icons

## 🚀 Erste Schritte

### 1. Dependencies installieren (bereits erledigt)
```bash
npm install -D vite-plugin-pwa
```

### 2. App starten
```bash
npm run dev
```

### 3. PWA im Browser testen
- Öffne: http://localhost:3001
- Im Header rechts siehst du das neue Status-Icon (WiFi-Symbol)
- Klicke darauf um Details zu sehen und manuell umzuschalten

### 4. Offline-Modus testen

**Methode 1: Manueller Toggle**
1. Klicke auf Status-Icon im Header
2. Aktiviere "Manueller Offline-Modus"
3. Offline-Banner erscheint
4. Versuche eine Leerstandspülung (funktioniert!)
5. Versuche Statistiken zu öffnen (nicht verfügbar)

**Methode 2: Browser DevTools**
1. F12 → Network Tab
2. Wähle "Offline" aus
3. App erkennt automatisch den Offline-Status

**Methode 3: Server nicht erreichbar simulieren**
1. Stoppe das Backend
2. Warte 90 Sekunden (3 Ping-Versuche)
3. App wechselt automatisch zu Offline

## 📦 Neue Dateien

### Core-Implementierung
- `src/stores/OnlineStatus.js` - Zentraler State für Online/Offline-Management
- `src/composables/useFeatureAccess.js` - Helper für Feature-Zugriffskontrolle
- `src/components/OnlineStatusToggle.vue` - Status-Toggle im Header
- `src/components/OfflineModeBanner.vue` - Offline-Benachrichtigungsbanner

### Konfiguration
- `vite.config.mjs` - PWA Plugin konfiguriert
- `public/manifest.json` - Web App Manifest aktualisiert
- `index.html` - PWA Meta-Tags hinzugefügt

### Dokumentation
- `PWA_DOCUMENTATION.md` - Vollständige technische Dokumentation

## 🔧 Angepasste Dateien

- `src/main.js` - OnlineStatus Store initialisiert, PWA Service Worker registriert
- `src/layouts/DefaultLayout.vue` - OfflineModeBanner hinzugefügt
- `src/components/AppHeader.vue` - OnlineStatusToggle hinzugefügt
- `src/views/apartments/ApartmentFlushing.vue` - Verwendet jetzt OnlineStatus Store

## 🎯 Verwendung in eigenen Komponenten

### Online-Status prüfen

```javascript
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

const onlineStatusStore = useOnlineStatusStore()

// Volle Online-Prüfung
if (onlineStatusStore.isFullyOnline) {
  // Online-Operation
}

// Feature-spezifisch
if (onlineStatusStore.isFeatureAvailable('statistics')) {
  // Statistiken laden
}
```

### Feature mit Fehlerbehandlung

```javascript
import { useFeatureAccess } from '@/composables/useFeatureAccess.js'

const { executeIfOnline, showFeatureUnavailableMessage } = useFeatureAccess()

async function changePassword() {
  await executeIfOnline('password-change', async () => {
    // Passwort-Änderung durchführen
  })
}
```

### Bedingte UI in Templates

```vue
<template>
  <CButton 
    v-if="onlineStatusStore.isFullyOnline"
    @click="doOnlineAction"
  >
    Nur Online verfügbar
  </CButton>
  
  <CAlert 
    v-else
    color="warning"
  >
    Diese Funktion erfordert eine Internetverbindung
  </CAlert>
</template>

<script setup>
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
const onlineStatusStore = useOnlineStatusStore()
</script>
```

## 🧪 Testing Checklist

### ✅ Grundfunktionen
- [ ] App startet ohne Fehler
- [ ] Status-Icon ist im Header sichtbar
- [ ] Klick auf Icon öffnet Status-Dropdown
- [ ] Browser-Status wird korrekt angezeigt
- [ ] Server-Status wird korrekt angezeigt

### ✅ Manueller Offline-Modus
- [ ] Checkbox "Manueller Offline-Modus" funktioniert
- [ ] Offline-Banner erscheint
- [ ] Ping-Prüfungen werden gestoppt
- [ ] Status bleibt nach Reload erhalten (localStorage)
- [ ] Button "Online-Modus aktivieren" funktioniert

### ✅ Automatischer Offline-Modus
- [ ] Bei Browser-Offline wird erkannt
- [ ] Bei Server-Ausfall wechselt nach 3 Pings
- [ ] Benachrichtigung erscheint
- [ ] Bei Server-Wiederherstellung wechselt zu Online

### ✅ Leerstandspülungen offline
- [ ] Spülung kann offline durchgeführt werden
- [ ] Daten werden lokal gespeichert
- [ ] "Unsynced"-Badge erscheint
- [ ] Sync-Button erscheint bei Online-Modus
- [ ] Synchronisierung funktioniert

### ✅ Feature-Einschränkungen
- [ ] Passwort-Änderung offline deaktiviert
- [ ] Statistiken offline nicht verfügbar
- [ ] Warnung wird angezeigt

### ✅ PWA-Installation
- [ ] "Installieren"-Prompt erscheint
- [ ] App kann installiert werden
- [ ] Installierte App funktioniert
- [ ] Icons werden korrekt angezeigt

## 🔍 Monitoring & Debugging

### Browser Console
Die App loggt alle wichtigen Events:
```
🚀 Starte Ping-Überwachung...
✅ Server ist wieder erreichbar
❌ Ping fehlgeschlagen
⚠️ Ping fehlgeschlagen (2/3)
🔴 Server nicht erreichbar - Wechsel zu Offline-Modus
📴 Manueller Offline-Modus aktiviert
```

### Chrome DevTools
1. **Application Tab**
   - Service Worker Status
   - Cache Storage
   - Manifest

2. **Network Tab**
   - Offline-Modus simulieren
   - Netzwerk-Throttling

3. **Console Tab**
   - Ping-Logs beobachten
   - Fehler prüfen

## 🚨 Bekannte Einschränkungen

1. **Token-Validierung**: Offline wird der gecachte Token-Status verwendet
2. **Daten-Aktualität**: Offline-Daten können veraltet sein
3. **Sync-Konflikte**: Bei gleichzeitigen Änderungen können Konflikte auftreten
4. **Cache-Größe**: Browser haben Limits für Offline-Storage

## 📱 Mobile Testing

### Android (Chrome)
1. Öffne App im Chrome
2. Menü → "Zum Startbildschirm hinzufügen"
3. App erscheint auf Home-Screen
4. Öffne installierte App
5. Teste Offline-Funktionalität

### iOS (Safari)
1. Öffne App im Safari
2. Teilen-Button → "Zum Home-Bildschirm"
3. App erscheint auf Home-Screen
4. Öffne installierte App
5. Teste Offline-Funktionalität

## 🎨 Anpassungen

### Ping-Intervall ändern
In `src/stores/OnlineStatus.js`:
```javascript
const PING_INTERVAL = 30000 // 30 Sekunden → ändern
const MAX_FAILURES_BEFORE_OFFLINE = 3 // 3 Versuche → ändern
```

### Neue Features als "Offline-fähig" markieren
In `src/stores/OnlineStatus.js`:
```javascript
const requiresOnlineFeatures = computed(() => [
  'password-change',
  'statistics',
  'user-management',
  'building-management'
  // Neue Features hier hinzufügen
])
```

### Toast-Benachrichtigungen integrieren
In `src/stores/OnlineStatus.js`, Funktion `notifyUser()`:
```javascript
function notifyUser(message, type = 'info') {
  // Hier Toast-Bibliothek integrieren
  if (window.showToast) {
    window.showToast(message, type)
  }
}
```

## 📞 Support

Bei Problemen oder Fragen:
1. Console-Logs prüfen
2. `PWA_DOCUMENTATION.md` lesen
3. Network-Tab in DevTools prüfen
4. Service Worker Status prüfen

## 🎉 Fertig!

Die App ist jetzt vollständig als PWA mit Online/Offline-Unterstützung konfiguriert. 

**Wichtigste Punkte:**
- ✅ Leerstandspülungen funktionieren offline
- ✅ Automatische Synchronisierung
- ✅ Benutzerfreundliche Status-Anzeige
- ✅ Installierbar als App
- ✅ Server-Überwachung alle 30 Sekunden

**Nächste Schritte:**
1. App testen (siehe Testing Checklist)
2. Auf Mobilgeräten testen
3. Produktiv deployen
4. Benutzer über neue Offline-Funktionen informieren

