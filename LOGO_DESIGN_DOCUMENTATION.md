# WLS App Logo Design - Dokumentation

## Übersicht

Das neue Logo-Design für die WLS App wurde mit einem modernen, professionellen Ansatz erstellt und kombiniert:
- **Symbolik**: Ein stilisiertes "W" mit Wellen-Motiv
- **Farbschema**: Moderne Gradient-Farben (Blau bis Violett)
- **Vielseitigkeit**: Funktioniert sowohl als Volllogo als auch als kompaktes Icon

## Logo-Varianten

### 1. Vollständiges Logo (`logo.js`)
**Abmessungen**: 380 x 80 px

#### Komponenten:
- **Icon-Bereich** (links):
  - Kreisförmiger Rahmen mit Gradient
  - Stilisiertes W mit Wellen-Effekt
  - Drei Akzent-Punkte für visuelle Balance
  - Untere Wellen-Linie als Designelement

- **Text-Bereich** (rechts):
  - "WLS" in modernem, klarem Schriftbild
  - "APP" als Subtext mit reduzierter Opacity

#### Farbpalette:
```css
Primär-Gradient:
- Start: #2563eb (Blau)
- Ende:  #7c3aed (Violett)

Text: currentColor (passt sich dem Theme an)
```

### 2. Kompaktes Icon (`sygnet.js`)
**Abmessungen**: 80 x 80 px

#### Komponenten:
- Äußerer Ring mit Glow-Effekt (Opacity 0.3)
- Innerer Kreis als subtiler Background
- Zentrales W-Symbol mit Wellen
- Drei Akzent-Punkte
- Untere Wellen-Linie
- Dezente Highlight-Linien oben

#### Verwendung:
- Minimierte Sidebar
- Favicon
- App-Icons
- Social Media Avatare

## Design-Philosophie

### Symbolik
- **W-Form**: Steht für "WLS" und vermittelt Bewegung
- **Wellen**: Symbolisieren Fluss, Dynamik und moderne Technologie
- **Kreisform**: Vollständigkeit und Zusammenhalt
- **Gradient**: Modernität und Innovation

### Farben
Die gewählten Farben (Blau → Violett) vermitteln:
- **Blau (#2563eb)**: Vertrauen, Professionalität, Stabilität
- **Violett (#7c3aed)**: Innovation, Kreativität, Premium-Qualität

### Typografie
- Klare, geometrische Formen
- Gute Lesbarkeit auch bei kleinen Größen
- Moderne Sans-Serif Ästhetik

## Technische Details

### SVG-Format
Beide Logos sind als SVG-Pfade definiert:
- Vektorbasiert = verlustfrei skalierbar
- Kleine Dateigröße
- Perfekt für Web und Print

### Gradient-Definition
```svg
<linearGradient id="wlsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
  <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
</linearGradient>
```

### Responsive Verhalten
- **Desktop**: Vollständiges Logo sichtbar
- **Mobile**: Automatische Anpassung
- **Minimierte Sidebar**: Nur Icon sichtbar

## Implementierung

### In AppSidebarBrand Komponente
```vue
<template>
  <RouterLink custom to="/" v-slot="{ href, navigate }">
    <CSidebarBrand v-bind="$attrs" as="a" :href="href" @click="navigate">
      <!-- Vollständiges Logo -->
      <div class="sidebar-brand-full">
        <CIcon :icon="logo" :height="32" />
      </div>
      
      <!-- Kompaktes Icon -->
      <div class="sidebar-brand-narrow">
        <CIcon :icon="sygnet" :height="32" />
      </div>
    </CSidebarBrand>
  </RouterLink>
</template>
```

## Anpassungen

### Logo-Höhe ändern
```vue
<CIcon :icon="logo" :height="40" />
```

### Farben anpassen
Bearbeite die Gradient-Definition in `logo.js` und `sygnet.js`:
```javascript
<stop offset="0%" style="stop-color:#DEINE_FARBE_1;stop-opacity:1" />
<stop offset="100%" style="stop-color:#DEINE_FARBE_2;stop-opacity:1" />
```

### Alternative Farbschemata

#### Option 1: Grün-Gradient (Eco/Tech)
```css
Start: #10b981 (Grün)
Ende:  #06b6d4 (Cyan)
```

#### Option 2: Warm-Gradient (Energie)
```css
Start: #f59e0b (Orange)
Ende:  #ef4444 (Rot)
```

#### Option 3: Monochrom (Elegant)
```css
Start: #374151 (Dunkelgrau)
Ende:  #6b7280 (Grau)
```

## Exportieren für andere Verwendungen

### Als PNG exportieren
```bash
# Für Favicon (verschiedene Größen)
# Nutze ein Tool wie Inkscape oder einen Online-Konverter
```

### Als Webfont-Icon
```bash
# Konvertiere SVG zu Icon-Font
# Tools: IcoMoon, Fontello
```

## Barrierefreiheit

### Kontrast
- ✅ Gradient bietet guten Kontrast auf dunklem Hintergrund
- ✅ `currentColor` passt sich automatisch an
- ✅ Mindestgröße 32px für gute Lesbarkeit

### Alternative Darstellung
Für hohen Kontrast-Modus wird `currentColor` verwendet, was automatische Anpassung garantiert.

## Browser-Kompatibilität

✅ Chrome/Edge (alle Versionen mit SVG-Support)
✅ Firefox (alle Versionen mit SVG-Support)
✅ Safari (alle Versionen mit SVG-Support)
✅ Mobile Browser (iOS Safari, Chrome Mobile)

## Dateien

- `/src/assets/brand/logo.js` - Vollständiges Logo
- `/src/assets/brand/sygnet.js` - Kompaktes Icon
- `/src/components/AppSidebarBrand.vue` - Implementierung

## Version History

### v2.0 (2025-01-11)
- ✨ Neues modernes Design
- ✨ Gradient-Farbschema
- ✨ Wellen-Symbolik
- ✨ Verbesserte Skalierbarkeit
- ✨ Optimiert für Dark Mode

### v1.0 (Original)
- CoreUI Standard-Logo

## Lizenz

Das Logo ist Teil der WLS App und unterliegt der gleichen Lizenz wie das Projekt.

---

**Design erstellt**: November 2025
**Designer**: GitHub Copilot
**Format**: SVG (Scalable Vector Graphics)

