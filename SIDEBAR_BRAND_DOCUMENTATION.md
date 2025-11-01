# AppSidebarBrand Komponente

## Übersicht

Die `AppSidebarBrand` Komponente ist eine wiederverwendbare Vue 3 Komponente, die das Branding-Logo in der Sidebar anzeigt. Sie unterstützt zwei Ansichten:
- **Vollständiges Logo** für die ausgeklappte Sidebar
- **Kompaktes Logo** (Sygnet) für die minimierte Sidebar

## 🎨 Neues Logo-Design (v2.0)

Das Logo wurde mit einem modernen, professionellen Design aktualisiert:
- **Gradient-Farbschema**: Blau (#2563eb) → Violett (#7c3aed)
- **Symbolik**: Stilisiertes "W" mit Wellen-Motiv
- **Format**: Vektorbasierte SVG-Grafiken
- **Optimiert**: Für Light & Dark Mode

📖 **Vollständige Logo-Dokumentation**: [LOGO_DESIGN_DOCUMENTATION.md](./LOGO_DESIGN_DOCUMENTATION.md)

## Features

✨ **Responsive Design** - Passt sich automatisch an verschiedene Bildschirmgrößen an
🎨 **Anpassbar** - Konfigurierbare Höhe und optionaler Titel
🔗 **RouterLink Integration** - Verlinkt zur Startseite
⚡ **Smooth Transitions** - Weiche Übergänge beim Hover-Effekt

## Verwendung

### Basis-Verwendung

```vue
<AppSidebarBrand />
```

### Mit optionalem Titel

```vue
<AppSidebarBrand :show-title="true" title="WLS App" />
```

### Mit angepasster Logo-Höhe

```vue
<AppSidebarBrand :logo-height="40" />
```

### Vollständige Konfiguration

```vue
<AppSidebarBrand 
  :logo-height="36" 
  :show-title="true" 
  title="Meine App" 
/>
```

## Props

| Prop | Typ | Standard | Beschreibung |
|------|-----|----------|--------------|
| `logoHeight` | Number | 32 | Höhe des Logos in Pixeln |
| `showTitle` | Boolean | false | Zeigt den Titel neben dem Logo an |
| `title` | String | 'WLS App' | Der anzuzeigende Titel-Text |

## Integration in AppSidebar

Die Komponente ist bereits in `AppSidebar.vue` integriert:

```vue
<CSidebarHeader class="border-bottom">
  <AppSidebarBrand />
  <CCloseButton class="d-lg-none" dark @click="sidebar.toggleVisible()" />
</CSidebarHeader>
```

## Logo-Assets

Die Komponente verwendet zwei Logo-Varianten:

### Vollständiges Logo (`logo.js`)
- Wird in der ausgeklappten Sidebar angezeigt
- Enthält das komplette Branding mit Text

### Kompaktes Logo (`sygnet.js`)
- Wird in der minimierten Sidebar angezeigt
- Nur das Icon ohne Text

Beide Logos befinden sich in: `src/assets/brand/`

## Styling

Die Komponente verwendet globale Styles, um korrekt mit dem CoreUI Sidebar-System zu funktionieren:

- `.app-sidebar-brand` - Haupt-Container mit Flexbox-Layout
- `.sidebar-brand-full` - Container für das vollständige Logo
- `.sidebar-brand-narrow` - Container für das kompakte Logo
- `.brand-title` - Optional angezeigter Titel-Text

## Responsive Breakpoints

- **Mobile** (< 768px): Reduziertes Padding und kleinere Schriftgröße
- **Desktop** (≥ 768px): Standard-Layout

## Customization

### Eigenes Logo verwenden

1. Erstelle deine Logo-Dateien in `src/assets/brand/`:
   - `logo.js` - Vollständiges Logo
   - `sygnet.js` - Kompaktes Icon

2. Exportiere die SVG-Pfade im gleichen Format wie die vorhandenen Dateien

### Styling anpassen

Die Styles können in der Komponente direkt angepasst werden oder über CSS-Variablen überschrieben werden.

## Barrierefreiheit

- ✅ Semantisches HTML mit RouterLink
- ✅ Keyboard-Navigation unterstützt
- ✅ Fokus-Styles vererbt vom CoreUI Theme

## Browser-Support

Die Komponente funktioniert in allen modernen Browsern:
- Chrome/Edge (aktuell)
- Firefox (aktuell)
- Safari (aktuell)

## Weitere Informationen

- [CoreUI Sidebar Dokumentation](https://coreui.io/vue/docs/components/sidebar.html)
- [Vue Router Dokumentation](https://router.vuejs.org/)

