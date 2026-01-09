# API Timeout und Retry Konfiguration - Quick Summary

## ✅ Implementierung abgeschlossen

### Was wurde geändert?

1. **Neues Utility erstellt**: `/src/utils/ApiConfigHelper.js`
   - Zentrale Verwaltung für API-Timeout und Retry-Werte
   - Lädt Konfiguration aus LocalStorage (`wls_config_cache`)
   - Fallback auf Standardwerte: `apiTimeout: 5000ms`, `maxRetries: 3`

2. **Alle API-Dateien aktualisiert**:
   - ✅ ApiConfig.js
   - ✅ ApiUser.js
   - ✅ ApiBuilding.js
   - ✅ ApiApartment.js
   - ✅ ApiRecords.js
   - ✅ ApiHealth.js
   - ✅ OfflineDataPreloader.js

3. **Statische Werte entfernt**:
   - Alle `timeout = 5000` durch `timeout = null` ersetzt
   - Alle `retries = 2` durch `retries = null` ersetzt
   - `ApiRequest` verwendet jetzt `getApiTimeout()` und `getMaxRetries()`

4. **Offline-Modus berücksichtigt**:
   - `isOfflineMode()` prüft Online-Status
   - Funktioniert auch offline durch LocalStorage

### Wie funktioniert es?

```javascript
// 1. User ändert Einstellungen in /settings
server: {
  apiTimeout: 8000,
  maxRetries: 5
}

// 2. Wird im LocalStorage gespeichert
localStorage.setItem('wls_config_cache', JSON.stringify(config))

// 3. API-Calls verwenden automatisch die neuen Werte
const buildings = await apiBuilding.list()
// → Verwendet: timeout=8000ms, retries=5
```

### Settings-Seite

**URL**: `http://localhost:3001/#/settings`

**Sektion**: "Server-Einstellungen" (nur für Admins)

**Felder**:
- API Timeout (ms) - Standard: 5000
- Max. Retry Versuche - Standard: 3

### Testing

```bash
# Build erfolgreich
npm run build
# ✅ Keine Fehler

# Testen in Browser
1. Öffne http://localhost:3001/#/settings
2. Ändere "API Timeout (ms)" auf 8000
3. Ändere "Max. Retry Versuche" auf 5
4. Speichern
5. API-Calls verwenden jetzt die neuen Werte
```

### Dokumentation

Vollständige Dokumentation: `/API_CONFIG_TIMEOUT_IMPLEMENTATION.md`

---

## Zusammenfassung

Die Server-Einstellungen (API Timeout und Max. Retry Versuche) werden jetzt **dynamisch in allen API-Calls verwendet**. Es gibt einen **robusten Fallback-Mechanismus** und die Lösung ist **offline-fähig**. ✅

