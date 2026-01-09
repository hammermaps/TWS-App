# Security Headers Implementation

## Content Security Policy (CSP)

Die TWS-App implementiert eine Content Security Policy (CSP) zum Schutz vor Cross-Site Scripting (XSS) und anderen Code-Injection-Angriffen.

### Implementierte CSP-Richtlinie

**Für Development (mit HMR WebSocket-Unterstützung):**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://wls.dk-automation.de ws://localhost:* wss://localhost:*; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

**Für Production:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://wls.dk-automation.de; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

> **Hinweis zu `'unsafe-eval'`:** Diese Direktive ist aktuell notwendig für vue-i18n (Internationalisierung) in Composition API-Modus, da die Message-Compiler-Funktion `new Function()` verwendet. Dies ist eine bekannte Einschränkung. Für strengere Sicherheit könnte zukünftig auf pre-compiled Messages umgestellt werden.

> **Hinweis zu `frame-ancestors`:** Die `frame-ancestors`-Direktive funktioniert nur über HTTP-Header, nicht über Meta-Tags. In der `index.html` ist sie daher nicht enthalten, in den Server-Konfigurationen aber schon.

### CSP-Direktiven Erklärung

- **`default-src 'self'`**: Standardmäßig dürfen nur Ressourcen vom gleichen Origin geladen werden
- **`script-src 'self' 'unsafe-inline' 'unsafe-eval'`**: JavaScript von eigener Domain, inline und eval
  - `'unsafe-inline'`: Benötigt für Vue SFC und Vite HMR
  - `'unsafe-eval'`: Benötigt für vue-i18n Message Compilation (Composition API Modus)
- **`style-src 'self' 'unsafe-inline'`**: CSS nur von eigener Domain und inline (benötigt für Vue SFC)
- **`img-src 'self' data: https:`**: Bilder von eigener Domain, Data-URIs und HTTPS-Quellen
- **`font-src 'self' data:`**: Schriften von eigener Domain und Data-URIs
- **`connect-src 'self' https://wls.dk-automation.de`**: API-Verbindungen zur Backend-API
  - Im Development zusätzlich: `ws://localhost:* wss://localhost:*` für Vite HMR (Hot Module Replacement)
- **`frame-ancestors 'none'`**: Verhindert Einbettung in Frames (Clickjacking-Schutz)
- **`base-uri 'self'`**: Beschränkt `<base>`-Tag auf eigene Domain
- **`form-action 'self'`**: Formulare dürfen nur an eigene Domain gesendet werden

### Zusätzliche Security Headers

Neben CSP werden folgende Security Headers implementiert:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

#### Header-Erklärung

- **`X-Frame-Options: DENY`**: Verhindert Einbettung in Frames (zusätzlich zu CSP)
- **`X-Content-Type-Options: nosniff`**: Verhindert MIME-Type-Sniffing
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Kontrolliert Referrer-Informationen
- **`Permissions-Policy`**: Deaktiviert nicht benötigte Browser-Features

## Development-Modus

Im Development-Modus werden die Security Headers automatisch durch die Vite-Konfiguration gesetzt:

```javascript
// vite.config.mjs
server: {
  headers: {
    'Content-Security-Policy': "...",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
}
```

## Production-Deployment

### Nginx-Konfiguration

Für Production-Deployments mit Nginx fügen Sie folgende Header-Konfiguration hinzu:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL-Konfiguration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Root-Verzeichnis
    root /var/www/tws-app/dist;
    index index.html;

    # Security Headers
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://wls.dk-automation.de; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # SPA-Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache-Control für statische Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache-Konfiguration (.htaccess)

Für Apache-Server mit mod_headers aktiviert:

```apache
<IfModule mod_headers.c>
    # Content Security Policy
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://wls.dk-automation.de; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    
    # Additional Security Headers
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

# SPA-Routing
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

### Caddy-Konfiguration

Für Caddy-Server:

```caddy
your-domain.com {
    root * /var/www/tws-app/dist
    encode gzip zstd

    # Security Headers
    header {
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://wls.dk-automation.de; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }

    # SPA-Routing
    try_files {path} /index.html
    file_server
}
```

## CSP-Validierung

### Browser DevTools

Nach der Implementierung können Sie die CSP in den Browser DevTools überprüfen:

1. Öffnen Sie die Browser DevTools (F12)
2. Wechseln Sie zum "Console"-Tab
3. Laden Sie die Anwendung neu
4. Überprüfen Sie auf CSP-Verletzungen (CSP violations)

Keine Fehlermeldungen bedeutet, dass die CSP korrekt konfiguriert ist.

### Online-Tools

- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - Google CSP-Bewertungstool
- [Security Headers](https://securityheaders.com/) - Umfassende Header-Analyse

## Wartung und Updates

### Backend-API-URL ändern

Falls sich die Backend-API-URL ändert, muss die `connect-src`-Direktive angepasst werden:

```
connect-src 'self' https://neue-api-url.de
```

### Externe Ressourcen hinzufügen

Falls externe Ressourcen (CDNs, Fonts, etc.) hinzugefügt werden, müssen die entsprechenden Direktiven erweitert werden:

**Beispiel für Google Fonts:**
```
font-src 'self' data: https://fonts.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```

**Beispiel für CDN-JavaScript:**
```
script-src 'self' 'unsafe-inline' https://cdn.example.com;
```

## Bekannte Einschränkungen

### `'unsafe-inline'` für Scripts und Styles

Aktuell benötigt für:
- Vue Single File Components (SFC)
- Vite Hot Module Replacement (HMR) im Development-Modus
- Inline-Scripts im `index.html` (Theme-Detection)

**Zukünftige Verbesserungen**: Migration zu `nonce`-basierter CSP oder Hash-basierter CSP für strengere Sicherheit.

### `'unsafe-eval'` für Scripts

Aktuell benötigt für:
- **vue-i18n Message Compilation**: Die Internationalisierungsbibliothek verwendet `new Function()` für die Message-Compilation im Composition API-Modus

**Sicherheitsimplikationen**: 
- `'unsafe-eval'` erlaubt die dynamische Ausführung von JavaScript-Code
- Dies schwächt die XSS-Protection der CSP ab, bietet aber immer noch deutlich mehr Schutz als keine CSP
- Das Risiko ist bei vertrauenswürdigen Bibliotheken wie vue-i18n überschaubar

**Zukünftige Verbesserungen**:
1. **Pre-compiled Messages**: Verwendung von @intlify/unplugin-vue-i18n für Build-Zeit-Compilation
2. **Runtime-Only Mode**: Umstellung auf einen Modus ohne Message-Compilation
3. **Alternative i18n-Lösung**: Evaluierung von Alternativen, die ohne eval auskommen

**Migration zu strengerer CSP**:
```bash
# Installation des Pre-Compilation-Plugins
npm install -D @intlify/unplugin-vue-i18n

# Vite-Konfiguration erweitern
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

plugins: [
  VueI18nPlugin({
    /* options */
  })
]
```

## Sicherheitsbewertung

### Aktuelle Schutzmaßnahmen

✅ **Verhindert**:
- Laden von Scripts/Styles von unbekannten Domains
- Clickjacking-Angriffe (frame-ancestors, X-Frame-Options)
- MIME-Type-Sniffing (X-Content-Type-Options)
- Base-Tag-Injection
- Form-Hijacking

⚠️ **Eingeschränkter Schutz**:
- XSS-Angriffe: Durch `'unsafe-inline'` und `'unsafe-eval'` abgeschwächt, aber deutlich besser als ohne CSP
- Die Verwendung von `'unsafe-eval'` ist auf vertrauenswürdige Bibliotheken beschränkt

❌ **Nicht geschützt**:
- Server-seitige Angriffe (SQL-Injection, etc.) - werden durch andere Maßnahmen im Backend adressiert

### Sicherheitsbewertung

**CSP-Level**: Moderat (7/10)
- Grundlegender Schutz vorhanden
- Einschränkungen durch Framework-Anforderungen
- Deutliche Verbesserung gegenüber keiner CSP
- Raum für zukünftige Verbesserungen

## Best Practices

1. **HTTPS verwenden**: CSP ist am effektivsten mit HTTPS
2. **Regelmäßige Überprüfung**: Testen Sie die CSP nach jedem Deployment
3. **Monitoring**: Implementieren Sie CSP-Reporting für Produktions-Umgebungen
4. **Strikte Policies**: Vermeiden Sie `'unsafe-inline'` und `'unsafe-eval'` wenn möglich

## Bekannte Einschränkungen

- **`'unsafe-inline'` für Scripts und Styles**: Aktuell benötigt für Vue SFC und Vite HMR im Development-Modus
- **Zukünftige Verbesserungen**: Migration zu `nonce`-basierter CSP oder Hash-basierter CSP für strengere Sicherheit

## Troubleshooting

### CSP blockiert legitime Ressourcen

**Problem**: Legitime Ressourcen werden durch CSP blockiert

**Lösung**: 
1. Prüfen Sie die Browser-Konsole auf spezifische CSP-Violations
2. Erweitern Sie die entsprechende Direktive um die benötigte Quelle
3. Testen Sie die Änderungen gründlich

### Service Worker funktioniert nicht

**Problem**: PWA Service Worker wird durch CSP blockiert

**Lösung**: Service Worker sind mit der aktuellen CSP-Konfiguration kompatibel (`script-src 'self'`)

### API-Anfragen werden blockiert

**Problem**: API-Anfragen werden blockiert

**Lösung**: Stellen Sie sicher, dass die Backend-URL in `connect-src` enthalten ist:
```
connect-src 'self' https://wls.dk-automation.de
```

## Weitere Informationen

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP: Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Can I Use: CSP](https://caniuse.com/contentsecuritypolicy)

---

**Aktualisiert**: Januar 2026
**Version**: 1.0.0
