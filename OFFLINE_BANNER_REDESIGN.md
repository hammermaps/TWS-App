# Offline Banner Redesign - Dokumentation

## 🎨 Komplette Überarbeitung der OfflineModeBanner-Komponente

Die Offline-Banner-Komponente wurde komplett überarbeitet und modernisiert, um besser zum Template-Design zu passen und eine bessere User Experience zu bieten.

---

## 📋 Übersicht der Änderungen

### 1. Von CAlert zu Custom Banner
**Vorher:** Einfache CoreUI CAlert-Komponente
**Nachher:** Vollständig angepasstes Banner-Design mit Gradient-Hintergrund

### 2. Moderneres Design
- **Gradient-Hintergründe** mit Backdrop-Filter-Effekt
- **Icon-Wrapper** mit glassmorphism Design
- **Bessere Typografie** mit klarer Hierarchie
- **Status-Badge** zur schnellen Identifikation
- **Responsive Layout** für Mobile und Desktop

---

## 🎯 Hauptfeatures

### Visual Design

#### Banner-Layout
```
┌────────────────────────────────────────────────────────────────────┐
│ [🔵 Icon]  Status-Label [BADGE]                   [Action Button]  │
│            Detaillierte Beschreibung mit spezifischen Infos         │
└────────────────────────────────────────────────────────────────────┘
```

#### Icon-Wrapper
- **48x48px** Container mit abgerundeten Ecken (12px radius)
- **Backdrop-Filter** für glassmorphism Effekt
- **Responsive**: 40x40px auf Mobile

#### Status-Badge
- **Farbcodiert** nach Offline-Grund
- **Text-Transform**: UPPERCASE für bessere Lesbarkeit
- **Kompakt**: 0.65rem Font-Size

---

## 🎨 Farbsystem & Modi

### Banner-Varianten

#### 1. **Secondary (Manueller Modus)**
- **Light Mode**: Gradient von grau (15% → 5% opacity)
- **Dark Mode**: Gradient von grau (25% → 10% opacity)
- **Border**: Grau mit entsprechender Opacity
- **Icon**: 🌙 Mond

#### 2. **Danger (Netzwerk Offline)**
- **Light Mode**: Gradient von rot (15% → 5% opacity)
- **Dark Mode**: Gradient von rot (25% → 10% opacity)
- **Border**: Rot mit höherer Opacity
- **Icon**: 📵 WiFi Off

#### 3. **Warning (Server Offline)**
- **Light Mode**: Gradient von gelb (15% → 5% opacity)
- **Dark Mode**: Gradient von gelb (25% → 10% opacity)
- **Border**: Gelb mit hoher Opacity
- **Icon**: ☁️ Cloud Download

#### 4. **Info (Allgemein)**
- **Light Mode**: Gradient von cyan (15% → 5% opacity)
- **Dark Mode**: Gradient von cyan (25% → 10% opacity)
- **Border**: Cyan mit mittlerer Opacity
- **Icon**: ℹ️ Info

---

## 🔄 Dynamisches Verhalten

### Status-spezifische Anzeige

#### 1. **Offline (Manuell)**
```vue
📄 Text: "Offline (Manuell)" [MANUELL]
🌙 Icon: cil-moon
📝 Beschreibung: "Automatische Überwachung ist deaktiviert"
🔘 Button: "Online-Modus aktivieren" (cil-wifi-signal-4)
```

#### 2. **Offline (Netzwerk)**
```vue
📄 Text: "Offline (Netzwerk)" [NETZWERK]
📵 Icon: cil-wifi-signal-off
📝 Beschreibung: "Keine Netzwerkverbindung erkannt"
🔘 Button: "Keine Verbindung" (disabled)
```

#### 3. **Offline (Server)**
```vue
📄 Text: "Offline (Server)" [SERVER]
☁️ Icon: cil-cloud-download
📝 Beschreibung: "Server ist nicht erreichbar"
🔘 Button: "Erneut verbinden" / "Prüfe..." (mit Animation)
```

### Loading States
- **Retry Button**: Zeigt rotierendes Icon während der Prüfung
- **Text-Wechsel**: "Erneut verbinden" → "Prüfe..."
- **Disabled State**: Button deaktiviert während Prüfung

---

## 🎭 Animationen

### 1. Slide-Down Transition
```css
Dauer: 0.4s
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Effect: Banner gleitet von oben herein
```

### 2. Icon Rotation
```css
Dauer: 1s linear infinite
Effect: Rotiert während Connection Check
```

### 3. Hover Effects
```css
Transform: translateY(-1px)
Shadow: 0 4px 8px rgba(0, 0, 0, 0.1)
Transition: 0.2s ease
```

---

## 📱 Responsive Design

### Desktop (> 768px)
- Volle Breite mit horizontalem Layout
- Icon links, Text mittig, Button rechts
- Icon: 48x48px

### Mobile (≤ 768px)
- Stack-Layout (vertikal)
- Icon: 40x40px
- Button: Volle Breite
- Kleinere Schriftgrößen

### Breakpoints
```css
@media (max-width: 768px) {
  .banner-title: 0.9rem
  .banner-description: 0.8rem
  .banner-icon-wrapper: 40px x 40px
}
```

---

## 🎨 CSS-Struktur

### Glassmorphism Effect
```css
backdrop-filter: blur(10px);
background: rgba(255, 255, 255, 0.3);
border: 1px solid rgba(255, 255, 255, 0.3);
```

### Gradient Backgrounds
```css
background: linear-gradient(
  135deg,
  rgba(color, 0.15),
  rgba(color, 0.05)
);
```

### Border Bottom
```css
border-bottom: 2px solid rgba(color, opacity);
```

---

## 🔧 Technische Details

### Computed Properties

#### `getBannerClass`
Generiert dynamische CSS-Klasse basierend auf Status:
- `banner-secondary`
- `banner-danger`
- `banner-warning`
- `banner-info`

#### `getBannerBadgeColor`
Bestimmt Badge-Farbe:
- `secondary` (Manuell)
- `danger` (Netzwerk)
- `warning` (Server)
- `info` (Default)

#### `getStatusText`
Kurze Status-Beschreibung für Badge:
- "MANUELL"
- "NETZWERK"
- "SERVER"
- "OFFLINE"

### Komponenten-Imports
```javascript
import { CButton, CBadge } from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
```

**Entfernt:** `CAlert` (nicht mehr benötigt)

---

## 🎯 User Experience Verbesserungen

### 1. **Klarere Informationen**
- Status-Badge für schnelle Identifikation
- Spezifische Icons für jeden Offline-Grund
- Detaillierte Beschreibungen

### 2. **Bessere Interaktion**
- Hover-Effekte für Buttons
- Loading-States mit Animation
- Disabled-States für nicht verfügbare Aktionen

### 3. **Visuelles Feedback**
- Farbcodierung nach Schweregrad
- Gradient-Hintergründe für moderne Optik
- Smooth Transitions

### 4. **Accessibility**
- Große Touch-Targets für Mobile
- Klare Kontraste
- Semantische HTML-Struktur

---

## 🌓 Dark Mode Integration

### Automatische Erkennung
1. **System Preference**: `@media (prefers-color-scheme: dark)`
2. **CoreUI Theme**: `[data-coreui-theme="dark"]`

### Dark Mode Anpassungen
- **Hellere Borders**: Bessere Sichtbarkeit
- **Höhere Opacity**: Stärkere Gradients
- **Angepasste Glassmorphism**: Dunklere Backgrounds
- **Button-Styling**: Hellere Farben für Kontrast

---

## 📊 Vorher/Nachher Vergleich

### Vorher ❌
- Einfache CAlert-Box
- Keine Gradient-Effekte
- Einfacher Text ohne Badge
- Basic Button-Styling
- Kein Icon-Wrapper

### Nachher ✅
- **Custom Banner-Design** mit Gradient
- **Glassmorphism** Icon-Wrapper
- **Status-Badge** für schnelle Info
- **Moderne Buttons** mit Hover-Effekten
- **Vollständiger Dark Mode** Support
- **Responsive Design** für alle Geräte
- **Smooth Animations** und Transitions

---

## 🚀 Integration

### Verwendung im Layout
```vue
<template>
  <div>
    <AppHeader />
    <OfflineModeBanner />  <!-- Banner direkt unter Header -->
    <div class="body">
      <router-view />
    </div>
  </div>
</template>
```

### Automatische Anzeige
- **Wird angezeigt**: Wenn `!onlineStatusStore.isFullyOnline`
- **Wird versteckt**: Wenn vollständig online
- **Animation**: Smooth Slide-Down Transition

---

## 🎉 Ergebnis

Ein modernes, visuell ansprechendes Offline-Banner, das:
- ✅ Perfekt ins Template integriert ist
- ✅ Light & Dark Mode vollständig unterstützt
- ✅ Responsive für alle Geräte funktioniert
- ✅ Klare Informationen und Aktionen bietet
- ✅ Moderne UI-Patterns verwendet
- ✅ Glassmorphism und Gradient-Effekte nutzt
- ✅ Smooth Animationen für bessere UX bietet

Das Banner ist jetzt ein professionelles, modernes UI-Element, das die User Experience erheblich verbessert! 🎨✨

