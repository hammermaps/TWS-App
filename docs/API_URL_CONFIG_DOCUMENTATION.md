# API URL Konfiguration - Dokumentation

## Übersicht

Die Backend-URLs wurden in eine zentrale Konfigurationsdatei ausgelagert, um die Wartbarkeit zu verbessern und Änderungen an einer Stelle vorzunehmen.

## Zentrale Konfigurationsdatei

**Datei:** `src/config/apiConfig.js`

Diese Datei enthält:
- Production URL: `https://wls.dk-automation.de/api.php`
- Development URL: `/api` (wird durch Vite Proxy umgeleitet)
- Hilfsfunktion `getApiBaseUrl()` für automatische Environment-Erkennung
- Weitere API-Konfigurationen (Endpoints, Timeouts, etc.)

## Verwendung

### Import in API-Klassen

```javascript
import { getApiBaseUrl } from '../config/apiConfig.js'

export class ApiExample {
  constructor(baseUrl = null) {
    this.baseUrl = baseUrl || getApiBaseUrl()
  }
}
```

### Aktualisierte Dateien

Folgende API-Dateien verwenden jetzt die zentrale Konfiguration:

1. ✅ `src/api/ApiHealth.js`
2. ✅ `src/api/ApiApartment.js`
3. ✅ `src/api/ApiConfig.js`
4. ✅ `src/api/ApiBuilding.js`
5. ✅ `src/api/ApiRecords.js`
6. ✅ `src/api/ApiUser.js`
7. ✅ `src/api/useTokenStatus.js`

### Vite Proxy Konfiguration

**Datei:** `vite.config.mjs`

Der Development-Proxy leitet `/api` auf `https://wls.dk-automation.de/api.php` um:

```javascript
proxy: {
  '/api': {
    target: 'https://wls.dk-automation.de',
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/api/, '/api.php'),
  }
}
```

## URL-Änderung

Um die Backend-URL zu ändern, bearbeite **nur** die Datei `src/config/apiConfig.js`:

```javascript
// Produktions-URL ändern
export const PRODUCTION_API_URL = 'https://neue-url.de/api.php'
```

**Wichtig:** Nach Änderung der Production-URL auch die `vite.config.mjs` anpassen:
- Proxy `target` 
- Workbox `runtimeCaching` URL-Pattern

## Environment-Verhalten

### Development-Modus (`npm run dev`)
- Verwendet `/api` als Base URL
- Vite Proxy leitet auf `https://wls.dk-automation.de/api.php` um
- Hot Module Replacement aktiv
- CORS-Probleme werden durch Proxy vermieden

### Production-Modus (`npm run build`)
- Verwendet direkt `https://wls.dk-automation.de/api.php`
- Keine Proxy-Umleitung
- Optimierter und minifizierter Code

### Debug-Build für Production (`npm run build -- --mode development`)
- Production-Build mit Development-Features:
  - Source Maps
  - Kein Minification
  - Vue DevTools aktiv
  - Verwendet Production-URL

## Vorteile der Zentralisierung

1. **Wartbarkeit**: URL-Änderungen nur an einer Stelle
2. **Konsistenz**: Alle API-Clients verwenden die gleiche Konfiguration
3. **Übersichtlichkeit**: Klare Trennung von Konfiguration und Logik
4. **Erweiterbarkeit**: Einfaches Hinzufügen weiterer Konfigurationen
5. **Testing**: Einfaches Überschreiben der Base URL für Tests

## Weitere Konfigurationen

Die `apiConfig.js` kann erweitert werden für:
- API-Versionierung
- Feature-Flags
- Rate-Limiting-Parameter
- Custom Headers
- Weitere Environment-spezifische Einstellungen

## Troubleshooting

### Problem: API-Anfragen schlagen fehl
1. Prüfe `src/config/apiConfig.js` auf korrekte URL
2. Prüfe `vite.config.mjs` Proxy-Konfiguration
3. Prüfe Browser Console auf CORS-Fehler
4. Verifiziere Backend-Erreichbarkeit

### Problem: Development-Proxy funktioniert nicht
1. Starte Dev-Server neu: `npm run dev`
2. Prüfe `vite.config.mjs` auf Syntax-Fehler
3. Prüfe Port-Verfügbarkeit (3001)

## Changelog

**2026-01-10**
- Zentrale API-Konfiguration erstellt
- Alle API-Dateien migriert
- Backend-URL auf `https://wls.dk-automation.de/api.php` geändert
- Dokumentation erstellt

