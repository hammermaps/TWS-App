# CSS Export Dokumentation
## Übersicht
Alle CSS-Codes aus Vue-Komponenten wurden in separate `.css`-Dateien exportiert und in die jeweiligen Komponenten eingebunden.
## Verzeichnisstruktur
```
src/styles/
├── components/          # Komponenten-spezifische CSS-Dateien
│   ├── AppSidebarBrand.css
│   ├── LogoPreview.css
│   ├── OfflineDataBadge.css
│   ├── OfflineDataPreloadCard.css
│   ├── OfflineFlushStatusCard.css
│   ├── OfflineModeBanner.css
│   ├── OnlineRequiredWrapper.css
│   ├── OnlineStatusToggle.css
│   └── index.css        # Import-Index für alle Komponenten-Styles
│
└── views/               # View-spezifische CSS-Dateien
    ├── ApartmentFlushing.css
    ├── ApartmentFlushHistory.css
    ├── BuildingApartments.css
    ├── BuildingsOverview.css
    ├── Dashboard.css
    ├── FlushingManager.css
    ├── HealthStatus.css
    ├── Login.css
    ├── LogoTestView.css
    ├── Profile.css
    └── index.css        # Import-Index für alle View-Styles
```
## Einbindung in Vue-Komponenten
Die CSS-Dateien werden mit dem `src`-Attribut im `<style>`-Tag eingebunden:
### Komponenten-Beispiel:
```vue
<style scoped src="@/styles/components/OfflineModeBanner.css"></style>
```
### View-Beispiel:
```vue
<style scoped src="@/styles/views/Dashboard.css"></style>
```
## Vorteile dieser Struktur
1. **Wartbarkeit**: CSS-Code ist getrennt von der Vue-Logik
2. **Wiederverwendbarkeit**: CSS kann leichter zwischen Komponenten geteilt werden
3. **Übersichtlichkeit**: Bessere Code-Organisation
4. **Performance**: Browser können CSS-Dateien cachen
5. **Entwicklung**: Einfacheres CSS-Debugging und -Bearbeitung
## Index-Dateien
Die `index.css`-Dateien ermöglichen das zentrale Importieren aller Styles:
### Komponenten-Index (`src/styles/components/index.css`):
```css
@import './AppSidebarBrand.css';
@import './LogoPreview.css';
@import './OfflineDataBadge.css';
/* ... weitere Imports */
```
### Views-Index (`src/styles/views/index.css`):
```css
@import './ApartmentFlushing.css';
@import './ApartmentFlushHistory.css';
@import './BuildingApartments.css';
/* ... weitere Imports */
```
## Betroffene Dateien
### Komponenten (8 Dateien):
- `src/components/AppSidebarBrand.vue`
- `src/components/LogoPreview.vue`
- `src/components/OfflineDataBadge.vue`
- `src/components/OfflineDataPreloadCard.vue`
- `src/components/OfflineFlushStatusCard.vue`
- `src/components/OfflineModeBanner.vue`
- `src/components/OnlineRequiredWrapper.vue`
- `src/components/OnlineStatusToggle.vue`
### Views (10 Dateien):
- `src/views/apartments/ApartmentFlushing.vue`
- `src/views/apartments/ApartmentFlushHistory.vue`
- `src/views/apartments/FlushingManager.vue`
- `src/views/buildings/BuildingApartments.vue`
- `src/views/buildings/BuildingsOverview.vue`
- `src/views/dashboard/Dashboard.vue`
- `src/views/dashboard/HealthStatus.vue`
- `src/views/pages/Login.vue`
- `src/views/pages/Profile.vue`
- `src/views/LogoTestView.vue`
## Änderungen
Alle Inline-`<style scoped>`-Blöcke wurden durch externe CSS-Referenzen ersetzt:
**Vorher:**
```vue
<style scoped>
.my-class {
  color: red;
}
</style>
```
**Nachher:**
```vue
<style scoped src="@/styles/components/MyComponent.css"></style>
```
## Datum der Implementierung
**1. November 2025**
## Status
✅ **Vollständig implementiert und getestet**
