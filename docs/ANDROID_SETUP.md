# Android Studio Setup und Build-Anleitung

## Übersicht

Diese Anleitung beschreibt, wie Sie die TWS-App als native Android-App mit Android Studio öffnen, bearbeiten und erstellen können. Die App basiert auf Capacitor, das die Vue.js Web-App in eine native Android-Anwendung verpackt.

## Voraussetzungen

### Erforderliche Software

1. **Node.js** (Version 18.x oder höher)
   - Download: https://nodejs.org/

2. **Android Studio** (neueste stabile Version)
   - Download: https://developer.android.com/studio
   - Empfohlen: Android Studio Hedgehog (2023.1.1) oder neuer

3. **JDK** (Java Development Kit)
   - JDK 17 wird empfohlen
   - Wird normalerweise mit Android Studio installiert
   - Alternative: https://adoptium.net/

4. **Android SDK**
   - Wird mit Android Studio installiert
   - Mindestens Android API Level 22 (Android 5.1)
   - Empfohlen: API Level 33 oder höher (Android 13+)

## Installation und Ersteinrichtung

### 1. Repository klonen und Abhängigkeiten installieren

```bash
# Repository klonen
git clone https://github.com/hammermaps/TWS-App.git
cd TWS-App

# Checkout des Android-Branches (falls nicht Standard)
git checkout copilot/create-android-app-branch

# Node.js Abhängigkeiten installieren
npm install
```

### 2. Android Studio konfigurieren

#### SDK Installation überprüfen

1. Android Studio öffnen
2. **Tools → SDK Manager** öffnen
3. Im Tab **SDK Platforms** sicherstellen, dass folgende installiert sind:
   - Android 13.0 (API Level 33) oder höher ✅
   - Android 5.1 (API Level 22) - Mindestanforderung

4. Im Tab **SDK Tools** sicherstellen, dass folgende installiert sind:
   - Android SDK Build-Tools ✅
   - Android SDK Command-line Tools ✅
   - Android SDK Platform-Tools ✅
   - Android Emulator (optional für Emulator-Tests) ✅

#### Umgebungsvariablen einrichten

**Windows:**
```cmd
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
```

**macOS/Linux:**
```bash
# In ~/.bashrc, ~/.zshrc oder ähnlich hinzufügen:
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# oder
export ANDROID_HOME=$HOME/Android/Sdk          # Linux

export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

Nach dem Setzen der Variablen Terminal neu starten oder `source ~/.bashrc` ausführen.

### 3. Web-App bauen und Android-Projekt synchronisieren

```bash
# Web-App bauen (Vue.js → dist/)
npm run build

# Android-Projekt mit aktuellem Build synchronisieren
npm run android:sync
```

## Android Studio öffnen und Projekt laden

### Methode 1: Über npm Script (Empfohlen)

```bash
npm run android:open
```

Dies öffnet automatisch Android Studio mit dem Android-Projekt.

### Methode 2: Manuell

1. Android Studio starten
2. **File → Open** wählen
3. Zum Projektverzeichnis navigieren
4. Den Ordner `android/` auswählen und öffnen
5. Gradle Sync abwarten (kann beim ersten Mal einige Minuten dauern)

## Build-Prozess in Android Studio

### Debug-Build erstellen

1. In Android Studio das Projekt öffnen (siehe oben)
2. Warten bis Gradle Sync abgeschlossen ist
3. **Build → Make Project** (oder Strg+F9 / Cmd+F9)
4. Bei Erfolg erscheint "BUILD SUCCESSFUL" in der Build-Ausgabe

### APK erstellen

#### Debug APK (zum Testen)

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Warten auf Build-Abschluss
3. APK befindet sich in: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Signed Release APK (für Veröffentlichung)

1. **Build → Generate Signed Bundle / APK**
2. **APK** auswählen und **Next** klicken
3. Keystore erstellen oder vorhandenen auswählen:
   - **Create new...** für neuen Keystore
   - Keystore-Pfad, Passwort und Alias angeben
   - Key-Informationen ausfüllen (Name, Organisation, etc.)
4. **Next** klicken
5. Build-Variante **release** auswählen
6. Signatur-Versionen V1 und V2 aktivieren
7. **Finish** klicken
8. Signierte APK befindet sich in: `android/app/build/outputs/apk/release/app-release.apk`

**Wichtig:** Keystore-Datei sicher aufbewahren! Ohne sie können keine Updates der App veröffentlicht werden.

## App auf Gerät/Emulator ausführen

### Auf physischem Android-Gerät

1. **USB-Debugging auf dem Gerät aktivieren:**
   - Einstellungen → Über das Telefon
   - Build-Nummer 7x antippen (Entwickleroptionen aktivieren)
   - Zurück zu Einstellungen → Entwickleroptionen
   - USB-Debugging aktivieren

2. **Gerät per USB verbinden**

3. **In Android Studio:**
   - Gerät im Dropdown oben auswählen
   - **Run → Run 'app'** (oder ▶️ Button klicken)
   - Bei erster Verbindung: USB-Debugging auf Gerät erlauben

### Auf Android Emulator

1. **Emulator erstellen (falls noch nicht vorhanden):**
   - **Tools → Device Manager**
   - **Create Device** klicken
   - Gerät auswählen (z.B. Pixel 5) → **Next**
   - System Image auswählen (z.B. API 33) → **Next**
   - Emulator benennen → **Finish**

2. **App im Emulator starten:**
   - Emulator im Dropdown auswählen
   - **Run → Run 'app'** (oder ▶️ Button)

### Mit npm Script (Terminal)

```bash
# Baut die Web-App, synchronisiert und startet auf verbundenem Gerät/Emulator
npm run android:run
```

## Entwicklungs-Workflow

### Typischer Workflow für Code-Änderungen

```bash
# 1. Änderungen an Vue.js Code vornehmen
# (Dateien in src/ bearbeiten)

# 2. Web-App neu bauen
npm run build

# 3. Änderungen ins Android-Projekt synchronisieren
npm run android:sync

# 4. In Android Studio: Run klicken oder
npm run android:run
```

### Live Reload für schnellere Entwicklung (Optional)

Für schnellere Entwicklungszyklen kann die App auch direkt mit dem Development Server verbunden werden:

1. **Development Server starten:**
   ```bash
   npm run dev
   ```
   Der Server läuft auf `http://localhost:3001`

2. **In `capacitor.config.json` temporär hinzufügen:**
   ```json
   {
     "server": {
       "url": "http://192.168.1.X:3001",
       "cleartext": true
     }
   }
   ```
   (192.168.1.X mit Ihrer lokalen IP-Adresse ersetzen)

3. **Android-App neu starten**

**Wichtig:** Vor dem Release-Build den `server.url` wieder entfernen!

## npm Scripts Übersicht

```bash
# Standard Web-Entwicklung
npm run dev          # Development Server starten
npm run build        # Production Build erstellen
npm run preview      # Production Build lokal testen
npm run lint         # Code-Qualität prüfen

# Android-spezifische Scripts
npm run android:build  # Web-App bauen und mit Android synchronisieren
npm run android:sync   # Nur synchronisieren (Build muss existieren)
npm run android:open   # Android Studio öffnen
npm run android:run    # Bauen, synchronisieren und auf Gerät ausführen
```

## Projektstruktur

```
TWS-App/
├── android/                    # Android-Projekt (von Capacitor generiert)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/public/  # Web-App Dateien (dist/ Kopie)
│   │   │   ├── java/           # Android Java/Kotlin Code
│   │   │   ├── res/            # Android Ressourcen (Icons, Strings)
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle        # App-spezifische Build-Konfiguration
│   ├── build.gradle            # Projekt-Level Build-Konfiguration
│   └── gradle/                 # Gradle Wrapper
├── src/                        # Vue.js Quellcode
├── dist/                       # Build-Ausgabe (wird nach android/ kopiert)
├── capacitor.config.json       # Capacitor Konfiguration
└── package.json                # npm Abhängigkeiten und Scripts
```

## Anpassungen und Konfiguration

### App-Name ändern

**In `android/app/src/main/res/values/strings.xml`:**
```xml
<string name="app_name">TWS Leerstandsspülung App</string>
<string name="title_activity_main">TWS App</string>
```

### App-Icon ändern

1. Neue Icons vorbereiten (verschiedene Auflösungen)
2. Icons in `android/app/src/main/res/mipmap-*/` ersetzen:
   - `mipmap-hdpi/`
   - `mipmap-mdpi/`
   - `mipmap-xhdpi/`
   - `mipmap-xxhdpi/`
   - `mipmap-xxxhdpi/`

Alternativ: Android Studio's Image Asset Studio verwenden:
- **Rechtsklick auf res/ → New → Image Asset**

### App-ID (Package Name) ändern

**In `capacitor.config.json`:**
```json
{
  "appId": "de.dk_automation.tws"
}
```

Nach Änderung: `npm run android:sync` ausführen

### Android-Version und SDK-Level

**In `android/app/build.gradle`:**
```gradle
android {
    compileSdkVersion 33
    defaultConfig {
        applicationId "de.dk_automation.tws"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
}
```

### Berechtigungen hinzufügen

**In `android/app/src/main/AndroidManifest.xml`:**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<!-- Weitere Berechtigungen nach Bedarf -->
```

## Häufige Probleme und Lösungen

### Problem: "SDK location not found"

**Lösung:**
- Android SDK installieren (über Android Studio SDK Manager)
- ANDROID_HOME Umgebungsvariable setzen (siehe oben)
- Android Studio neu starten

### Problem: Gradle Sync schlägt fehl

**Lösung:**
```bash
# Gradle Cache leeren
cd android
./gradlew clean

# Oder in Android Studio:
# File → Invalidate Caches → Invalidate and Restart
```

### Problem: "Could not resolve all dependencies"

**Lösung:**
- Internetverbindung prüfen
- Proxy-Einstellungen in Android Studio prüfen (falls hinter Firewall)
- Gradle Wrapper aktualisieren:
  ```bash
  cd android
  ./gradlew wrapper --gradle-version 8.0
  ```

### Problem: App startet nicht / zeigt leeren Bildschirm

**Lösung:**
1. Web-App Build ist aktuell?
   ```bash
   npm run build
   npm run android:sync
   ```

2. `capacitor.config.json` prüfen - keine Development Server URL aktiv

3. Android Logcat in Android Studio prüfen auf JavaScript-Fehler

### Problem: Build-Fehler "Duplicate class"

**Lösung:**
- Meist durch Konflikte in Abhängigkeiten
- In `android/app/build.gradle` Ausschlüsse hinzufügen:
  ```gradle
  configurations {
      all*.exclude group: 'com.google.android.gms', module: 'play-services-measurement'
  }
  ```

### Problem: USB-Gerät wird nicht erkannt

**Lösung:**
- USB-Debugging aktiviert? (siehe Anleitung oben)
- USB-Treiber installiert? (Windows)
- Anderes USB-Kabel verwenden
- `adb devices` im Terminal ausführen zur Diagnose

## Weiterführende Ressourcen

### Dokumentation

- **Capacitor Dokumentation**: https://capacitorjs.com/docs
- **Android Developer Guide**: https://developer.android.com/guide
- **Capacitor Android**: https://capacitorjs.com/docs/android
- **Vue.js Dokumentation**: https://vuejs.org/guide/

### Capacitor Plugins

Falls zusätzliche native Features benötigt werden:

- **Official Plugins**: https://capacitorjs.com/docs/plugins
- **Community Plugins**: https://github.com/capacitor-community

Beispiele:
- Camera: `npm install @capacitor/camera`
- Geolocation: `npm install @capacitor/geolocation`
- Push Notifications: `npm install @capacitor/push-notifications`

### Build-Automatisierung

Für CI/CD und automatisierte Builds siehe:
- **Fastlane**: https://fastlane.tools/
- **GitHub Actions**: https://github.com/features/actions

## Deployment und Veröffentlichung

### Google Play Store

1. **Signierte Release APK erstellen** (siehe oben)

2. **Google Play Console Account erstellen:**
   - https://play.google.com/console
   - Einmalige Gebühr: 25 USD

3. **App in Play Console erstellen:**
   - Neue App erstellen
   - App-Details ausfüllen
   - Store-Listing Informationen
   - Screenshots und Grafiken hochladen

4. **Release erstellen:**
   - Production, Beta oder Alpha Track wählen
   - APK oder App Bundle hochladen
   - Release Notes hinzufügen
   - Review einreichen

### Alternative Distribution

- **Direkter APK Download** von eigener Website
- **Firebase App Distribution** für Beta-Tests
- **Amazon Appstore** als Alternative zu Google Play

## Support und Hilfe

Bei Fragen oder Problemen:

- **GitHub Issues**: https://github.com/hammermaps/TWS-App/issues
- **Capacitor Community**: https://ionic.io/community
- **Android Developer Community**: https://developer.android.com/community

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe [LICENSE](../LICENSE) für Details.

---

**Stand:** Januar 2026  
**Version:** 1.0.0  
**Capacitor Version:** 8.0+  
**Android Min SDK:** 22 (Android 5.1)  
**Android Target SDK:** 33 (Android 13)
