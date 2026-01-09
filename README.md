# TWS-App - Trinkwasser-Leerstandsspülungs-System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.5+-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1+-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.0+-119EFF?style=flat-square&logo=capacitor)](https://capacitorjs.com/)

Eine moderne Progressive Web App (PWA) zur Verwaltung und Durchführung von Leerstandsspülungen in Gebäuden. Die App bietet vollständige Offline-Funktionalität und automatische Datensynchronisation. **Jetzt auch als native Android-App verfügbar!**

## 📋 Inhaltsverzeichnis

- [Über das Projekt](#über-das-projekt)
- [Features](#features)
- [Plattformen](#plattformen)
- [Technologien](#technologien)
- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Entwicklung](#entwicklung)
- [Build & Deployment](#build--deployment)
- [Android App](#android-app)
- [Projektstruktur](#projektstruktur)
- [API-Integration](#api-integration)
- [Offline-Modus](#offline-modus)
- [PWA-Features](#pwa-features)
- [Konfiguration](#konfiguration)
- [Lizenz](#lizenz)

## 🎯 Über das Projekt

Die TWS-App (Trinkwasser-Spülungs-App) ist ein webbasiertes System zur Verwaltung von Leerstandsspülungen in Wohngebäuden. Sie ermöglicht es Hausverwaltern und Technikern, Spülpläne zu erstellen, durchzuführen und zu dokumentieren - auch ohne aktive Internetverbindung.

### Hauptziele

- ✅ **Compliance**: Sicherstellung der Einhaltung von Trinkwasserhygiene-Vorschriften
- ✅ **Effizienz**: Optimierte Workflows für Spülvorgänge
- ✅ **Flexibilität**: Vollständige Offline-Funktionalität
- ✅ **Transparenz**: Lückenlose Dokumentation aller Spülvorgänge

## ✨ Features

### Kernfunktionen

- 🏢 **Gebäudeverwaltung**: Verwaltung mehrerer Gebäude und Apartments
- 🚰 **Spülmanagement**: Planung, Durchführung und Dokumentation von Leerstandsspülungen
- 📊 **Dashboard**: Übersichtliche Darstellung von anstehenden und durchgeführten Spülungen
- 📈 **Statistiken**: Auswertung von Spüldaten und Compliance-Reports
- 👥 **Benutzerverwaltung**: Rollen- und Rechte-System (Admin, Techniker)

## 📱 Plattformen

### Progressive Web App (PWA)

- 📱 **Installierbar**: Funktioniert wie eine native App auf allen Geräten
- 🔌 **Offline-Fähig**: Vollständige Funktionalität ohne Internetverbindung
- 🔄 **Auto-Sync**: Automatische Synchronisation bei Wiederherstellung der Verbindung
- ⚡ **Performance**: Service Worker für schnelle Ladezeiten

### Benutzerfreundlichkeit

- 🌓 **Dark/Light Mode**: Automatische und manuelle Umschaltung
- 📱 **Responsive Design**: Optimiert für Desktop, Tablet und Mobile
- ♿ **Barrierefrei**: WCAG-konformes Design
- 🌐 **Mehrsprachig**: Vorbereitet für Internationalisierung

## 🛠 Technologien

### Frontend Stack

- **Framework**: Vue 3.5+ mit Composition API
- **Build Tool**: Vite 7.1+
- **UI Library**: CoreUI for Vue 5.5+
- **State Management**: Pinia 3.0+
- **Routing**: Vue Router 4.5+
- **HTTP Client**: Axios 1.12+
- **Icons**: CoreUI Icons 3.0+
- **Charts**: Chart.js 4.5+ mit vue-chartjs

### Entwicklungstools

- **Linting**: ESLint 9.32+ mit Vue-Plugin
- **CSS-Präprozessor**: Sass 1.90+
- **Build**: PostCSS mit Autoprefixer
- **PWA**: vite-plugin-pwa 1.1+

## 📦 Voraussetzungen

- **Node.js**: Version 18.x oder höher
- **npm**: Version 9.x oder höher (alternativ yarn/pnpm)
- **Git**: Für Versionskontrolle

## 🚀 Installation

### 1. Repository klonen

```bash
git clone https://github.com/hammermaps/TWS-App.git
cd TWS-App
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren (optional)

Erstelle eine `.env.local` Datei im Projektverzeichnis:

```env
VITE_API_BASE_URL=http://localhost:4040
VITE_APP_TITLE=TWS-App
```

## 💻 Entwicklung

### Development Server starten

```bash
npm run dev
```

Die App ist dann unter `http://localhost:3000` erreichbar.

### Linting

Code-Qualität prüfen:

```bash
npm run lint
```

### Vorschau der Production-Build

```bash
npm run preview
```

## 🏗 Build & Deployment

### Production Build erstellen

```bash
npm run build
```

Die Build-Artefakte werden im `dist/` Verzeichnis erstellt.

### Build-Optimierungen

- Code-Splitting für optimale Ladezeiten
- Tree-Shaking für minimale Bundle-Größe
- Asset-Optimierung (Bilder, Fonts)
- Service Worker für Offline-Caching

## 📱 Android App

Die TWS-App kann als native Android-Anwendung mit Android Studio kompiliert und installiert werden.

### Schnellstart

```bash
# Build Web-App und synchronisiere mit Android
npm run android:build

# Öffne Android Studio
npm run android:open

# Oder direkt auf Gerät ausführen
npm run android:run
```

### Android-spezifische npm Scripts

```bash
npm run android:build    # Web-App bauen und mit Android synchronisieren
npm run android:sync     # Nur synchronisieren (Build muss existieren)
npm run android:open     # Android Studio öffnen
npm run android:run      # Bauen, synchronisieren und auf Gerät ausführen
```

### Voraussetzungen für Android-Entwicklung

- **Android Studio** (neueste stabile Version)
- **JDK 17** (wird mit Android Studio installiert)
- **Android SDK** API Level 22+ (Android 5.1+)

### Dokumentation

- **📘 Ausführliche Anleitung (Deutsch)**: [ANDROID_SETUP.md](ANDROID_SETUP.md)
- **📗 Quick Start (English)**: [ANDROID_QUICKSTART.md](ANDROID_QUICKSTART.md)

### Technische Details

- **Build-Tool**: Capacitor 8.0+
- **Min SDK**: API 22 (Android 5.1 Lollipop)
- **Target SDK**: API 33 (Android 13)
- **App ID**: `de.dk_automation.tws`

## 📁 Projektstruktur

```
TWS-App/
├── android/                # Android-Projekt (Capacitor)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/public/  # Web-App Dateien
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/        # Android-Ressourcen
│   │   └── build.gradle
│   └── build.gradle
├── public/                 # Statische Assets
│   ├── favicon.ico
│   └── manifest.json      # PWA Manifest
├── src/
│   ├── api/               # API-Client-Module
│   │   ├── ApiApartment.js
│   │   ├── ApiBuilding.js
│   │   ├── ApiHealth.js
│   │   ├── ApiRecords.js
│   │   └── ApiUser.js
│   ├── assets/            # Bilder, Icons, Fonts
│   │   ├── brand/         # Logo und Branding
│   │   └── icons/         # Icon-Sets
│   ├── components/        # Wiederverwendbare Komponenten
│   │   ├── AppHeader.vue
│   │   ├── AppSidebar.vue
│   │   ├── LogoPreview.vue
│   │   └── OfflineModeBanner.vue
│   ├── composables/       # Vue Composables
│   │   └── useFeatureAccess.js
│   ├── layouts/           # Layout-Komponenten
│   │   └── DefaultLayout.vue
│   ├── router/            # Vue Router Konfiguration
│   │   └── index.js
│   ├── services/          # Business Logic Services
│   │   └── OfflineDataPreloader.js
│   ├── stores/            # Pinia Stores
│   │   ├── ApartmentStorage.js
│   │   ├── BuildingStorage.js
│   │   ├── GlobalToken.js
│   │   ├── GlobalUser.js
│   │   ├── OnlineStatus.js
│   │   └── TokenManager.js
│   ├── styles/            # SCSS-Dateien
│   │   ├── components/
│   │   └── views/
│   ├── utils/             # Hilfsfunktionen
│   │   └── CorsDebugger.js
│   ├── views/             # Seiten-Komponenten
│   │   ├── apartments/    # Apartment-Verwaltung
│   │   ├── buildings/     # Gebäude-Verwaltung
│   │   ├── dashboard/     # Dashboard
│   │   └── pages/         # Authentifizierung
│   ├── App.vue            # Root-Komponente
│   └── main.js            # App-Einstiegspunkt
├── backend-info/          # API-Dokumentation
├── index.html             # HTML-Template
├── vite.config.mjs        # Vite-Konfiguration
├── eslint.config.mjs      # ESLint-Konfiguration
├── package.json           # Projekt-Abhängigkeiten
└── README.md              # Projekt-Dokumentation
```

## 🔌 API-Integration

### Backend-API

Die App kommuniziert mit einer RESTful PHP-Backend-API:

- **Base URL (Dev)**: `/api` (Proxy via Vite)
- **Base URL (Prod)**: `https://wls.dk-automation.de`

### Haupt-Endpunkte

#### Authentifizierung
- `POST /user/login` - Benutzer-Login
- `POST /user/logout` - Benutzer-Logout
- `GET /user/check-token` - Token validieren

#### Gebäude
- `GET /buildings/list` - Gebäudeliste abrufen
- `POST /buildings/add` - Gebäude hinzufügen
- `PUT /buildings/edit/{id}` - Gebäude bearbeiten
- `DELETE /buildings/delete/{id}` - Gebäude löschen

#### Apartments
- `GET /apartments/list` - Apartment-Liste abrufen
- `POST /apartments/add` - Apartment hinzufügen
- `PUT /apartments/edit/{id}` - Apartment bearbeiten
- `DELETE /apartments/delete/{id}` - Apartment löschen

#### Spül-Records
- `GET /records/list` - Spül-Protokolle abrufen
- `POST /records/add` - Spül-Protokoll erstellen
- `GET /records/history/{apartmentId}` - Spül-Historie eines Apartments

#### Gesundheitsprüfung
- `GET /health/ping` - Server-Verfügbarkeit prüfen

### API-Client-Architektur

Jeder API-Bereich hat eine dedizierte Client-Klasse:

```javascript
import ApiApartment from '@/api/ApiApartment.js'

const apartmentApi = new ApiApartment()
const apartments = await apartmentApi.list()
```

## 🔌 Offline-Modus

### Automatische Offline-Erkennung

Die App überwacht kontinuierlich die Verbindung:

1. **Browser-Status**: Prüft `navigator.onLine`
2. **Server-Erreichbarkeit**: Ping alle 30 Sekunden
3. **Automatische Umschaltung**: Nach 3 fehlgeschlagenen Pings

### Offline-Funktionen

#### Vollständig verfügbar:
- ✅ Leerstandsspülungen durchführen
- ✅ Spül-Protokolle erstellen
- ✅ Gebäude und Apartments anzeigen
- ✅ Spül-Historie einsehen

#### Eingeschränkt verfügbar:
- ⚠️ Statistiken (cached Daten)
- ⚠️ Benutzerverwaltung (nur Anzeige)

#### Nur online verfügbar:
- ❌ Passwort ändern
- ❌ Neue Gebäude/Apartments erstellen
- ❌ Daten-Synchronisation mit Server

### Daten-Synchronisation

```javascript
// Automatische Synchronisation bei Wiederverbindung
import { useOfflineFlushSyncService } from '@/stores/OfflineFlushSyncService.js'

const syncService = useOfflineFlushSyncService()
await syncService.syncPendingFlushes()
```

### Lokale Datenspeicherung

- **Gebäude & Apartments**: LocalStorage
- **Pending Flushes**: LocalStorage (Queue)
- **User & Token**: LocalStorage + SessionStorage
- **Service Worker Cache**: Statische Assets & API-Responses

## 📱 PWA-Features

### Installation

Die App kann auf allen Geräten installiert werden:

- **Android**: "Zum Startbildschirm hinzufügen"
- **iOS**: "Zum Home-Bildschirm" (Safari)
- **Desktop**: Installation über Browser-Menü

### Service Worker

Der Service Worker cached:
- Statische Assets (HTML, CSS, JS, Icons)
- API-Responses (NetworkFirst-Strategie)
- Fonts und Bilder

### Manifest

```json
{
  "name": "TWS Leerstandsspülungs-App",
  "short_name": "TWS App",
  "theme_color": "#321fdb",
  "background_color": "#ffffff",
  "display": "standalone",
  "scope": "/",
  "start_url": "/"
}
```

## ⚙️ Konfiguration

### Vite-Konfiguration

Die `vite.config.mjs` enthält:

- Proxy-Setup für API-Anfragen
- PWA-Plugin-Konfiguration
- Build-Optimierungen
- Path-Aliases (@, ~)

### Umgebungsvariablen

```env
# Development
VITE_API_BASE_URL=/api

# Production
VITE_API_BASE_URL=https://wls.dk-automation.de
```

### ESLint-Konfiguration

```javascript
// eslint.config.mjs
export default [
  { ignores: ['dist/', 'dev-dist/'] },
  ...eslintPluginVue.configs['flat/essential'],
  {
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'vue/multi-word-component-names': 'off',
    }
  }
]
```

## 🔐 Sicherheit

### Authentifizierung

- Token-basierte Authentifizierung (JWT)
- Automatische Token-Validierung alle 5 Minuten
- Sichere Speicherung in LocalStorage
- CSRF-Schutz via Cookies

### Security Headers

Die App implementiert umfassende Security Headers zum Schutz vor XSS und anderen Angriffen:

- ✅ **Content Security Policy (CSP)** - Verhindert XSS-Angriffe
- ✅ **X-Frame-Options** - Schutz vor Clickjacking
- ✅ **X-Content-Type-Options** - Verhindert MIME-Type-Sniffing
- ✅ **Referrer-Policy** - Kontrollierte Referrer-Informationen
- ✅ **Permissions-Policy** - Eingeschränkte Browser-Features

Siehe [SECURITY_HEADERS.md](SECURITY_HEADERS.md) für detaillierte Informationen und Deployment-Konfigurationen.

### Best Practices

- ✅ HTTPS in Production
- ✅ CORS-Konfiguration
- ✅ XSS-Prävention via CSP
- ✅ Input-Validierung
- ✅ Sichere API-Kommunikation

## 🧪 Testing

Derzeit keine automatisierten Tests implementiert.

Geplant:
- [ ] Unit Tests (Vitest)
- [ ] Component Tests (Vue Test Utils)
- [ ] E2E Tests (Playwright/Cypress)

## 📝 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe [LICENSE](LICENSE) für Details.

Copyright © 2025 creativeLabs Łukasz Holeczek

## 👥 Mitwirkende

- **Projektentwicklung**: hammermaps
- **UI/UX Design**: CoreUI Team
- **Backend-API**: DK Automation

## 📞 Support

Bei Fragen oder Problemen:

- 📧 E-Mail: support@dk-automation.de
- 🐛 Issues: [GitHub Issues](https://github.com/hammermaps/TWS-App/issues)

## 🗺️ Roadmap

### Geplante Features

- [x] Native Android-App mit Capacitor
- [ ] iOS-App (Capacitor)
- [ ] Push-Benachrichtigungen für fällige Spülungen
- [ ] QR-Code-Scanner für Apartment-Identifikation
- [ ] Export von Reports (PDF, Excel)
- [ ] Erweiterte Statistiken und Analysen
- [ ] Multi-Tenant-Unterstützung
- [ ] Automatisierte Tests
- [ ] Mehrsprachigkeit (i18n)

## 📚 Weitere Dokumentation

- [Security Headers & CSP](SECURITY_HEADERS.md)
- [Android Setup Anleitung (Deutsch)](ANDROID_SETUP.md)
- [Android Quick Start (English)](ANDROID_QUICKSTART.md)
- [PWA Dokumentation](PWA_DOCUMENTATION.md)
- [Offline-Modus Guide](OFFLINE_PRELOADING_DOCUMENTATION.md)
- [Logo Design Guide](LOGO_README.md)
- [API Controller Docs](backend-info/)

---

**Entwickelt mit ❤️ für bessere Trinkwasserhygiene**
