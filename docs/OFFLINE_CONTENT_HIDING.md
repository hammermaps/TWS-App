# Offline-Modus: Seiten & Inhalte ausblenden - Dokumentation

## ✅ Implementierte Features

Die App blendet jetzt automatisch nicht verfügbare Seiten und Inhalte im Offline-Modus aus.

## 🎯 Änderungen im Detail

### 1. Navigation (_nav.js)

Alle Navigationsitems haben jetzt ein `requiresOnline` Flag:

```javascript
{
  component: 'CNavItem',
  name: 'Health Status',
  to: '/health-status',
  icon: 'cilHeart',
  requiresOnline: true  // ← Nur online sichtbar
}
```

**Status:**
- ✅ Dashboard: Offline verfügbar (requiresOnline: false)
- ❌ Health Status: Nur online (requiresOnline: true)
- ✅ Gebäude: Offline verfügbar (requiresOnline: false)
- ✅ Profile ansehen: Offline verfügbar (requiresOnline: false)
- ❌ Profil bearbeiten: Nur online (requiresOnline: true)

### 2. Router (index.js)

Alle Routes haben ein `requiresOnline` Meta-Flag:

```javascript
{
  path: '/profile',
  name: 'Profile',
  meta: { 
    requiresAuth: true, 
    requiresOnline: true  // ← Route nur online zugänglich
  }
}
```

**Router-Guard prüft Online-Status:**
- Bei Versuch eine `requiresOnline: true` Route offline zu öffnen:
  - ❌ Navigation wird blockiert
  - ⚠️ Benutzer erhält Warnung
  - ↩️ Bleibt auf aktueller Seite oder geht zum Dashboard

### 3. Sidebar-Navigation (AppSidebarNav.js)

Die Sidebar filtert Menüeinträge basierend auf Online-Status:

```javascript
const filteredNav = computed(() => {
  const isOnline = onlineStatusStore.isFullyOnline
  
  return nav.filter(item => {
    // Blende Items mit requiresOnline: true im Offline-Modus aus
    if (item.requiresOnline === true && !isOnline) {
      return false
    }
    return true
  })
})
```

**Verhalten:**
- 🟢 Online: Alle Menüeinträge sichtbar
- 🔴 Offline: Nur Einträge mit `requiresOnline: false` sichtbar
- 📱 Live-Updates: Menü aktualisiert sich automatisch bei Status-Änderung

### 4. OnlineRequiredWrapper Komponente

Neue Wrapper-Komponente für Online-Only-Seiten:

```vue
<OnlineRequiredWrapper>
  <!-- Seiteninhalt hier -->
</OnlineRequiredWrapper>
```

**Features:**
- ⚠️ Zeigt Offline-Warnung wenn Seite nicht verfügbar
- 🚫 Blockiert Inhalt im Offline-Modus
- 📝 Erklärt warum Seite nicht verfügbar ist
- 💡 Gibt Hinweise zur Wiederherstellung

**Angewendet auf:**
- ✅ Profile.vue (Profil bearbeiten)
- ✅ HealthStatus.vue (Health Status)

### 5. Visuelle Hinweise

**Offline-Warnung:**
```
┌─────────────────────────────────────────────────┐
│ ⚠️  Offline-Modus: Seite nicht verfügbar        │
│                                                  │
│ Diese Seite erfordert eine aktive Internet-     │
│ verbindung und ist im Offline-Modus nicht       │
│ verfügbar.                                       │
│                                                  │
│ ─────────────────────────────────────────────── │
│                                                  │
│ Verbindungsstatus: Offline (Server nicht        │
│ erreichbar)                                      │
└─────────────────────────────────────────────────┘

        📴
 Seite offline nicht verfügbar
 
 Bitte stellen Sie eine Internetverbindung her,
 um auf diese Seite zuzugreifen.
```

## 📊 Feature-Matrix (aktualisiert)

```
┌─────────────────────────┬─────────┬────────────┬──────────────┐
│ Feature                 │ Online  │ Offline    │ In Sidebar   │
├─────────────────────────┼─────────┼────────────┼──────────────┤
│ Dashboard               │   ✅    │     ✅     │      ✅      │
├─────────────────────────┼─────────┼────────────┼──────────────┤
│ Health Status           │   ✅    │     ❌     │      ❌      │
├─────────────────────────┼─────────┼────────────┼──────────────┤
│ Gebäude                 │   ✅    │     ✅     │      ✅      │
├─────────────────────────┼─────────┼────────────┼──────────────┤
│ Apartments              │   ✅    │     ✅     │      ✅      │
├─────────────────────────┼─────────┼────────────┼──────────────┤
│ Leerstandspülungen      │   ✅    │     ✅     │      ✅      │
├─────────────────────────┼─────────┼────────────┼──────────────┤
│ Spülhistorie            │   ✅    │     ✅     │      ✅      │
├─────────────────────────┼─────────┼────────────┼──────────────┤
│ Profil ansehen          │   ✅    │     ✅     │      ✅      │
├─────────────────────────┼─────────┼────────────┼──────────────┤
│ Profil bearbeiten       │   ✅    │     ❌     │      ❌      │
│ (Passwort ändern)       │         │            │              │
└─────────────────────────┴─────────┴────────────┴──────────────┘

Legende:
✅ = Verfügbar/Sichtbar
❌ = Nicht verfügbar/Ausgeblendet
```

## 🔄 Ablauf bei Offline-Navigation

### Szenario 1: Versuch Online-Only-Seite zu öffnen (Offline)

```
User klickt auf "Profil bearbeiten"
           ↓
Router beforeEach Guard
           ↓
Prüft: to.meta.requiresOnline === true
           ↓
Prüft: onlineStatusStore.isFullyOnline === false
           ↓
     🚫 BLOCKIERT
           ↓
Zeigt Toast/Alert: "Seite offline nicht verfügbar"
           ↓
Navigation wird verhindert (next(false))
           ↓
User bleibt auf aktueller Seite
```

### Szenario 2: User wechselt von Online zu Offline

```
User aktiviert manuellen Offline-Modus
           ↓
onlineStatusStore.setManualOffline(true)
           ↓
Sidebar computed property reagiert
           ↓
filteredNav wird neu berechnet
           ↓
Menüeinträge mit requiresOnline: true ausgeblendet
           ↓
Sidebar aktualisiert sich automatisch
           ↓
User sieht nur noch offline-fähige Menüeinträge
```

### Szenario 3: User ist bereits auf Online-Only-Seite

```
User ist auf "Health Status" Seite (Online)
           ↓
Verbindung bricht ab / User geht offline
           ↓
OnlineRequiredWrapper erkennt Status-Änderung
           ↓
Zeigt Offline-Warnung am Seitenanfang
           ↓
Versteckt Seiteninhalt (v-if="!showWarning")
           ↓
Zeigt alternative Offline-Ansicht
           ↓
User sieht Hinweis, kann aber nicht mehr nutzen
```

## 📝 Neue Dateien

```
src/components/OnlineRequiredWrapper.vue  ← Wrapper für Online-Only-Seiten
```

## 🔧 Geänderte Dateien

```
✓ src/_nav.js                             ← requiresOnline Flags hinzugefügt
✓ src/router/index.js                     ← requiresOnline Meta + Guard
✓ src/components/AppSidebarNav.js         ← Online-Status-Filterung
✓ src/views/pages/Profile.vue            ← OnlineRequiredWrapper integriert
✓ src/views/dashboard/HealthStatus.vue   ← OnlineRequiredWrapper integriert
```

## 🎨 UI/UX Verbesserungen

### Sidebar im Offline-Modus

**Vorher (Online):**
```
┌─────────────────────┐
│ Dashboard           │
│ Health Status       │
│─────────────────────│
│ Gebäude             │
│─────────────────────│
│ Profile             │
│ Profil bearbeiten   │
└─────────────────────┘
```

**Nachher (Offline):**
```
┌─────────────────────┐
│ Dashboard           │
│ [Health Status] ← Ausgeblendet
│─────────────────────│
│ Gebäude             │
│─────────────────────│
│ Profile             │
│ [Profil bearbeiten] ← Ausgeblendet
└─────────────────────┘
```

### Router-Blockierung

**Toast-Benachrichtigung:**
```javascript
"Die Seite 'Health Status' ist offline nicht verfügbar. 
 Bitte stellen Sie eine Internetverbindung her."
```

### Seiten-Warnung

**OnlineRequiredWrapper zeigt:**
- ⚠️ Große Warnung am Seitenanfang
- 📝 Erklärender Text
- 📊 Aktueller Verbindungsstatus
- 💡 Hinweise zur Lösung (z.B. "Manuellen Offline-Modus deaktivieren")
- 🎨 Alternative Offline-Ansicht mit Icon

## 🧪 Testing

### Test 1: Sidebar-Filterung
```bash
✓ App starten (online)
✓ Alle Menüeinträge sichtbar
✓ Manuell auf Offline stellen
✓ "Health Status" verschwindet aus Sidebar
✓ "Profil bearbeiten" verschwindet aus Sidebar
✓ Andere Einträge bleiben sichtbar
✓ Zurück auf Online stellen
✓ Alle Einträge wieder sichtbar
```

### Test 2: Route-Blockierung
```bash
✓ App starten (online)
✓ Navigiere zu "Health Status" (funktioniert)
✓ Wechsle zu Dashboard
✓ Gehe offline (manuell oder Browser DevTools)
✓ Versuche "Health Status" zu öffnen (per URL oder Link)
✓ Navigation wird blockiert
✓ Toast-Warnung erscheint
✓ Bleibe auf Dashboard
```

### Test 3: OnlineRequiredWrapper
```bash
✓ App starten (online)
✓ Öffne "Profil bearbeiten"
✓ Seite lädt normal
✓ Gehe offline
✓ Offline-Warnung erscheint am Seitenanfang
✓ Formular wird ausgeblendet
✓ Alternative Offline-Ansicht sichtbar
✓ Gehe wieder online
✓ Warnung verschwindet
✓ Formular wird wieder angezeigt
```

### Test 4: Live-Updates
```bash
✓ App starten (online)
✓ Sidebar: Alle Items sichtbar
✓ Klick auf Online-Status-Toggle im Header
✓ Aktiviere "Manueller Offline-Modus"
✓ Sidebar aktualisiert sich sofort
✓ Online-Only-Items verschwinden
✓ Deaktiviere "Manueller Offline-Modus"
✓ Sidebar aktualisiert sich sofort
✓ Alle Items wieder sichtbar
```

## 🔍 Debugging

### Console-Logs

**Sidebar-Filterung:**
```
🎯 Filtere Navigation für Rolle: user | Online: false
✅ Zeige Item: "Dashboard"
🔴 Item "Health Status" - Offline nicht verfügbar
✅ Zeige Item: "Gebäude"
✅ Zeige Item: "Profile"
🔴 Item "Profil bearbeiten" - Offline nicht verfügbar
📋 Gefilterte Navigation Items: 3
```

**Router-Guard:**
```
🧭 Navigation von "Dashboard" zu "HealthStatus"
🔴 Route "HealthStatus" erfordert Online-Verbindung, aber App ist offline
[Toast] Die Seite "Health Status" ist offline nicht verfügbar...
```

## 💡 Neue Seiten hinzufügen

### Als Online-Only markieren

**1. In _nav.js:**
```javascript
{
  component: 'CNavItem',
  name: 'Neue Seite',
  to: '/neue-seite',
  icon: 'cilStar',
  requiresOnline: true  // ← Nur online
}
```

**2. In router/index.js:**
```javascript
{
  path: '/neue-seite',
  name: 'NeueSei te',
  meta: { 
    requiresAuth: true, 
    requiresOnline: true  // ← Nur online
  },
  component: () => import('@/views/NeueSeit e.vue')
}
```

**3. In der View:**
```vue
<template>
  <OnlineRequiredWrapper>
    <!-- Seiteninhalt -->
  </OnlineRequiredWrapper>
</template>

<script setup>
import OnlineRequiredWrapper from '@/components/OnlineRequiredWrapper.vue'
</script>
```

### Als Offline-fähig markieren

**1. In _nav.js:**
```javascript
{
  component: 'CNavItem',
  name: 'Neue Seite',
  to: '/neue-seite',
  icon: 'cilStar',
  requiresOnline: false  // ← Offline verfügbar
}
```

**2. In router/index.js:**
```javascript
{
  path: '/neue-seite',
  name: 'NeueSeit e',
  meta: { 
    requiresAuth: true, 
    requiresOnline: false  // ← Offline verfügbar
  },
  component: () => import('@/views/NeueSeit e.vue')
}
```

**3. In der View:**
```vue
<template>
  <!-- Normaler Inhalt ohne Wrapper -->
  <div>
    <!-- Zeige optional eigene Offline-Hinweise für Features -->
    <CAlert v-if="!isOnline && needsOnlineFeature" color="warning">
      Diese Funktion ist offline eingeschränkt
    </CAlert>
    <!-- Rest des Inhalts -->
  </div>
</template>
```

## ✅ Checkliste: Offline-Filterung

- [x] Navigation: requiresOnline Flags hinzugefügt
- [x] Router: requiresOnline Meta-Flags hinzugefügt
- [x] Router: Guard für Online-Status implementiert
- [x] Sidebar: Online-Status-Filterung implementiert
- [x] OnlineRequiredWrapper erstellt
- [x] Profile.vue: Wrapper integriert
- [x] HealthStatus.vue: Wrapper integriert
- [x] Live-Updates: Sidebar reagiert auf Status-Änderungen
- [x] Fehlermeldungen: Toast/Alert bei blockierter Navigation
- [x] Dokumentation erstellt

## 🎉 Ergebnis

**✅ Vollständig implementiert!**

Die App blendet jetzt intelligent nicht verfügbare Seiten im Offline-Modus aus:
- 🔍 Sidebar zeigt nur verfügbare Einträge
- 🚫 Router blockiert Zugriff auf Online-Only-Seiten
- ⚠️ Benutzerfreundliche Warnungen und Hinweise
- 🔄 Live-Updates bei Status-Änderungen
- 📱 Konsistente UX im gesamten Offline-Modus

---

**Implementiert**: 2025-11-01  
**Version**: 1.1.0  
**Status**: ✅ Produktionsbereit

