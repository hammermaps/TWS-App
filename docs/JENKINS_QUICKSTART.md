# Jenkins Build - Kurzanleitung

Schnellreferenz für den Jenkins Build der TWS-App.

## 🚀 Schnellstart

### Voraussetzungen prüfen

```bash
# Java Version prüfen
java -version  # Muss >= 17 sein

# Node.js Version prüfen
node --version  # Muss >= 18 sein

# npm Version prüfen
npm --version  # Muss >= 9 sein
```

### Jenkins Installation (Ubuntu)

```bash
# Java installieren
sudo apt update && sudo apt install -y openjdk-17-jdk

# Jenkins installieren
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | \
  sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | \
  sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update && sudo apt install -y jenkins

# Jenkins starten
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Initial Password anzeigen
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### Android SDK Setup (Linux)

```bash
# Android Command Line Tools installieren
cd /opt
sudo wget https://dl.google.com/android/repository/commandlinetools-linux-latest.zip
sudo mkdir -p android-sdk/cmdline-tools
sudo unzip commandlinetools-linux-latest.zip -d android-sdk/cmdline-tools
sudo mv android-sdk/cmdline-tools/cmdline-tools android-sdk/cmdline-tools/latest
sudo chown -R jenkins:jenkins /opt/android-sdk

# SDK Pakete installieren
sudo su - jenkins
export ANDROID_SDK_ROOT=/opt/android-sdk
cd /opt/android-sdk/cmdline-tools/latest/bin
./sdkmanager --update
./sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
./sdkmanager --licenses

# Umgebungsvariablen setzen
exit
sudo systemctl edit jenkins
# Füge hinzu:
# [Service]
# Environment="ANDROID_SDK_ROOT=/opt/android-sdk"
# Environment="ANDROID_HOME=/opt/android-sdk"

sudo systemctl restart jenkins
```

## 📋 Jenkins Pipeline Job erstellen

### 1. Job anlegen

1. Jenkins Dashboard → **New Item**
2. Name: `TWS-App-Build`
3. Typ: **Pipeline**
4. **OK** klicken

### 2. Pipeline konfigurieren

**Pipeline Definition:**
- Definition: `Pipeline script from SCM`
- SCM: `Git`
- Repository URL: `https://github.com/hammermaps/TWS-App.git`
- Branch: `*/main`
- Script Path: `Jenkinsfile`

**Build Triggers:**
- ☑ Poll SCM: `H/15 * * * *` (alle 15 Min)
- oder: ☑ Build periodically: `H 2 * * *` (täglich 2 Uhr)

### 3. Node.js Plugin installieren

1. **Manage Jenkins** → **Manage Plugins** → **Available**
2. Suche: `NodeJS`
3. Installieren: **NodeJS Plugin**

### 4. Node.js konfigurieren

1. **Manage Jenkins** → **Global Tool Configuration**
2. **NodeJS** → **Add NodeJS**
   - Name: `NodeJS 18`
   - Version: `NodeJS 18.x` (latest LTS)
   - Install automatically: ✓

## 🎯 Build ausführen

### Manueller Build

1. Job öffnen: `TWS-App-Build`
2. **Build with Parameters**
3. Parameter wählen:
   - **BUILD_TYPE**: `web` | `android` | `both`
   - **ANDROID_BUILD_TYPE**: `debug` | `release`
   - **SKIP_TESTS**: `false` | `true`
4. **Build** klicken

### Build-Parameter

| Parameter | Optionen | Beschreibung |
|-----------|----------|--------------|
| BUILD_TYPE | web | Nur Web-App bauen |
| | android | Nur Android-App bauen |
| | both | Web + Android bauen |
| ANDROID_BUILD_TYPE | debug | Debug-APK erstellen |
| | release | Release-APK erstellen |
| SKIP_TESTS | false | Tests ausführen |
| | true | Tests überspringen |

## 📦 Build-Artefakte

### Speicherorte

- **Web-Build**: `dist/` Verzeichnis
- **Android Debug**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Android Release**: `android/app/build/outputs/apk/release/app-release.apk`

### Download

1. Build-Job öffnen
2. Build-Nummer wählen
3. **Build Artifacts** → Datei herunterladen

## 🔧 Lokaler Test des Jenkinsfile

```bash
# Repository klonen
git clone https://github.com/hammermaps/TWS-App.git
cd TWS-App

# Dependencies installieren
npm ci

# Web-Build testen
npm run build

# Android-Build testen
npm run android:build

# Lint testen
npm run lint
```

## 📊 Build-Stages Übersicht

```
1. Checkout              → Code aus Git laden
2. Environment Info      → System-Infos anzeigen
3. Install Dependencies  → npm ci ausführen
4. Lint                  → ESLint ausführen (optional)
5. Build Web App         → Vite Build (bei BUILD_TYPE=web/both)
6. Build Android App     → Gradle Build (bei BUILD_TYPE=android/both)
7. Archive Artifacts     → Build-Dateien speichern
8. Test Results          → Test-Reports sammeln (optional)
```

## 🐛 Häufige Probleme

### Node.js nicht gefunden

```bash
# Lösung: NodeJS Plugin installieren und konfigurieren
Manage Jenkins → Global Tool Configuration → NodeJS
```

### Android SDK nicht gefunden

```bash
# Lösung: Umgebungsvariablen setzen
sudo systemctl edit jenkins
# Füge hinzu:
[Service]
Environment="ANDROID_SDK_ROOT=/opt/android-sdk"
```

### Build schlägt fehl: "npm ci"

```bash
# Lösung 1: package-lock.json ins Repository committen
git add package-lock.json
git commit -m "Add package-lock.json"

# Lösung 2: In Jenkinsfile "npm ci" durch "npm install" ersetzen
```

### Gradle wrapper nicht ausführbar

```bash
# Lösung: Rechte setzen
cd android
chmod +x gradlew
git add gradlew
git commit -m "Make gradlew executable"
```

## ⚙️ Umgebungsvariablen

### Erforderlich

```bash
ANDROID_SDK_ROOT=/opt/android-sdk
ANDROID_HOME=/opt/android-sdk
```

### Optional

```bash
NODE_ENV=production
VITE_API_BASE_URL=https://wls.dk-automation.de
NPM_CONFIG_CACHE=${WORKSPACE}/.npm
```

## 📝 Nützliche Jenkins CLI Befehle

```bash
# Build starten
java -jar jenkins-cli.jar -s http://localhost:8080/ build TWS-App-Build

# Build-Status prüfen
java -jar jenkins-cli.jar -s http://localhost:8080/ get-build TWS-App-Build 1

# Console Output anzeigen
java -jar jenkins-cli.jar -s http://localhost:8080/ console TWS-App-Build 1
```

## 🔐 Credentials

### Git Credentials (für private Repos)

1. **Manage Jenkins** → **Manage Credentials**
2. **Add Credentials**
   - Kind: `Username with password`
   - Username: Git-Username
   - Password: Personal Access Token
   - ID: `github-credentials`

### Android Keystore (für Release-Builds)

```bash
# Keystore erstellen
keytool -genkey -v -keystore tws-app.keystore \
  -alias tws-app -keyalg RSA -keysize 2048 -validity 10000

# In Jenkins hochladen
Manage Credentials → Add → Secret file
```

## 📚 Weiterführende Dokumentation

- **Ausführliche Anleitung**: [JENKINS_SETUP.md](JENKINS_SETUP.md)
- **English Version**: [JENKINS_SETUP_EN.md](JENKINS_SETUP_EN.md)
- **Android Setup**: [ANDROID_SETUP.md](ANDROID_SETUP.md)

## 💡 Tipps

### Build-Zeit optimieren

```groovy
// In Jenkinsfile:
environment {
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"  // npm cache nutzen
}

// Parallele Builds
stage('Build') {
    parallel {
        stage('Web') { ... }
        stage('Android') { ... }
    }
}
```

### Disk Space sparen

```bash
# Alte Builds löschen
find /var/lib/jenkins/jobs/*/builds -type d -mtime +30 -exec rm -rf {} +

# Workspace aufräumen
rm -rf /var/lib/jenkins/workspace/*
```

### Benachrichtigungen

```groovy
// Email bei Fehler
post {
    failure {
        emailext subject: "Build Failed: ${env.JOB_NAME}",
                 body: "Check ${env.BUILD_URL}",
                 to: "team@example.com"
    }
}
```

## ✅ Checkliste vor dem ersten Build

- [ ] Jenkins installiert und läuft
- [ ] NodeJS Plugin installiert
- [ ] Node.js 18 konfiguriert
- [ ] Android SDK installiert (für Android-Builds)
- [ ] Umgebungsvariablen gesetzt
- [ ] Git Repository zugänglich
- [ ] Pipeline Job erstellt
- [ ] Jenkinsfile im Repository vorhanden
- [ ] Erster Test-Build erfolgreich

---

**Bei Problemen:**
- Console Output prüfen
- [Troubleshooting Guide](JENKINS_SETUP.md#fehlerbehebung)
- [GitHub Issues](https://github.com/hammermaps/TWS-App/issues)
