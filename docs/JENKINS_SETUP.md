# Jenkins Build Server - Einrichtungsanleitung

Diese Anleitung beschreibt die Einrichtung eines Jenkins Build Servers für die TWS-App mit Unterstützung für npm (Node.js) und Android Builds.

## 📋 Inhaltsverzeichnis

- [Voraussetzungen](#voraussetzungen)
- [Jenkins Server Installation](#jenkins-server-installation)
- [Node.js Plugin Installation](#nodejs-plugin-installation)
- [Android SDK Einrichtung](#android-sdk-einrichtung)
- [Jenkins Job Konfiguration](#jenkins-job-konfiguration)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Build-Ausführung](#build-ausführung)
- [Fehlerbehebung](#fehlerbehebung)

## 🔧 Voraussetzungen

### System-Anforderungen

- **Betriebssystem**: Linux (Ubuntu 20.04+ empfohlen), Windows Server, oder macOS
- **RAM**: Mindestens 4 GB (8 GB empfohlen)
- **CPU**: Mindestens 2 Cores (4+ empfohlen)
- **Festplatte**: Mindestens 20 GB freier Speicherplatz
- **Java**: OpenJDK 17 oder höher

### Software-Voraussetzungen

- Java Development Kit (JDK) 17+
- Git
- Jenkins 2.400+
- Node.js 18.x oder höher
- npm 9.x oder höher
- Android SDK (nur für Android-Builds)
- Gradle (wird automatisch von Android Projekt verwendet)

## 🚀 Jenkins Server Installation

### Linux (Ubuntu/Debian)

```bash
# Java installieren
sudo apt update
sudo apt install -y openjdk-17-jdk

# Jenkins Repository hinzufügen
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

# Jenkins installieren
sudo apt update
sudo apt install -y jenkins

# Jenkins starten
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Status prüfen
sudo systemctl status jenkins
```

### Windows

1. **Java installieren**:
   - OpenJDK 17 von [Adoptium](https://adoptium.net/) herunterladen und installieren

2. **Jenkins installieren**:
   - Jenkins Windows Installer von [jenkins.io](https://www.jenkins.io/download/) herunterladen
   - Installer ausführen und Anweisungen folgen
   - Jenkins läuft als Windows Service

3. **Jenkins starten**:
   - Jenkins startet automatisch als Service
   - Öffne Browser: `http://localhost:8080`

### macOS

```bash
# Homebrew verwenden
brew install jenkins-lts

# Jenkins starten
brew services start jenkins-lts

# Status prüfen
brew services list
```

### Erste Anmeldung

1. Öffne Browser: `http://localhost:8080`
2. Hole das initiale Admin-Passwort:

```bash
# Linux/macOS
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Windows
# Schaue in: C:\Program Files\Jenkins\secrets\initialAdminPassword
```

3. Installiere empfohlene Plugins
4. Erstelle Admin-Benutzer

## 📦 Node.js Plugin Installation

### Plugin installieren

1. Jenkins Dashboard öffnen
2. **Manage Jenkins** → **Manage Plugins** → **Available plugins**
3. Suche nach "NodeJS"
4. Wähle **NodeJS Plugin** aus
5. Klicke auf **Install without restart**

### Node.js konfigurieren

1. **Manage Jenkins** → **Global Tool Configuration**
2. Scrolle zu **NodeJS** Sektion
3. Klicke auf **Add NodeJS**
4. Konfiguriere wie folgt:

```
Name: NodeJS 18
Install automatically: ✓ (aktiviert)
Version: NodeJS 18.x (neueste LTS)
Global npm packages to install: (leer lassen)
```

5. Klicke auf **Save**

## 📱 Android SDK Einrichtung

### Android SDK Installation (Linux)

```bash
# Android Command Line Tools herunterladen
cd /opt
sudo wget https://dl.google.com/android/repository/commandlinetools-linux-latest.zip

# Entpacken
sudo mkdir -p android-sdk/cmdline-tools
sudo unzip commandlinetools-linux-latest.zip -d android-sdk/cmdline-tools
sudo mv android-sdk/cmdline-tools/cmdline-tools android-sdk/cmdline-tools/latest

# Berechtigungen setzen
sudo chown -R jenkins:jenkins /opt/android-sdk

# SDK Pakete installieren (als jenkins user)
sudo su - jenkins
export ANDROID_SDK_ROOT=/opt/android-sdk
cd /opt/android-sdk/cmdline-tools/latest/bin

./sdkmanager --update
./sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
./sdkmanager --licenses
```

### Android SDK Installation (Windows)

1. **Android Studio installieren**:
   - Von [developer.android.com](https://developer.android.com/studio) herunterladen
   - Installiere mit Standard SDK

2. **SDK Pfad notieren**:
   - Standardpfad: `C:\Users\<USERNAME>\AppData\Local\Android\Sdk`

### Umgebungsvariablen setzen

#### Linux (für Jenkins)

```bash
# Bearbeite Jenkins Umgebungskonfiguration
sudo systemctl edit jenkins

# Füge hinzu:
[Service]
Environment="ANDROID_SDK_ROOT=/opt/android-sdk"
Environment="ANDROID_HOME=/opt/android-sdk"

# Speichern und Jenkins neustarten
sudo systemctl restart jenkins
```

#### Windows

1. **System Properties** → **Environment Variables**
2. Füge neue System-Variable hinzu:
   - Name: `ANDROID_SDK_ROOT`
   - Wert: `C:\Users\<USERNAME>\AppData\Local\Android\Sdk`
3. Füge hinzu:
   - Name: `ANDROID_HOME`
   - Wert: `C:\Users\<USERNAME>\AppData\Local\Android\Sdk`
4. Jenkins Service neustarten

## 🔨 Jenkins Job Konfiguration

### Pipeline Job erstellen

1. **Jenkins Dashboard** → **New Item**
2. Gebe einen Namen ein: `TWS-App-Build`
3. Wähle **Pipeline**
4. Klicke auf **OK**

### Pipeline konfigurieren

#### 1. Allgemeine Einstellungen

- **Description**: `TWS-App Build Pipeline - Web und Android`
- **Discard old builds**: ✓
  - Days to keep builds: `30`
  - Max # of builds to keep: `10`

#### 2. Build Triggers

Wähle eine oder mehrere Optionen:

- **GitHub hook trigger for GITScm polling**: Für automatische Builds bei Git Push
- **Poll SCM**: `H/15 * * * *` (prüft alle 15 Minuten)
- **Build periodically**: `H 2 * * *` (täglicher Build um 2 Uhr nachts)

#### 3. Pipeline Definition

- **Definition**: `Pipeline script from SCM`
- **SCM**: `Git`
- **Repository URL**: `https://github.com/hammermaps/TWS-App.git`
- **Credentials**: Git-Credentials hinzufügen falls privat
- **Branch Specifier**: `*/main` oder `*/master`
- **Script Path**: `Jenkinsfile`

#### 4. Speichern

Klicke auf **Save**

### Multibranch Pipeline (Optional)

Für automatische Builds mehrerer Branches:

1. **New Item** → **Multibranch Pipeline**
2. **Branch Sources** → **Add source** → **Git**
3. **Project Repository**: `https://github.com/hammermaps/TWS-App.git`
4. **Build Configuration**:
   - Mode: `by Jenkinsfile`
   - Script Path: `Jenkinsfile`

## ⚙️ Umgebungsvariablen

### Erforderliche Variablen

Konfiguriere in Jenkins unter **Manage Jenkins** → **Configure System** → **Global properties** → **Environment variables**:

| Variable | Wert | Beschreibung |
|----------|------|--------------|
| `ANDROID_SDK_ROOT` | `/opt/android-sdk` (Linux) oder `C:\Users\...\Sdk` (Windows) | Android SDK Pfad |
| `ANDROID_HOME` | Gleich wie `ANDROID_SDK_ROOT` | Legacy Android SDK Variable |
| `VITE_API_BASE_URL` | `https://wls.dk-automation.de` | Backend API URL |

### Optionale Variablen

| Variable | Wert | Beschreibung |
|----------|------|--------------|
| `NODE_ENV` | `production` | Node.js Umgebung |
| `NPM_CONFIG_CACHE` | `${WORKSPACE}/.npm` | NPM Cache Verzeichnis |

## 🎯 Build-Ausführung

### Manueller Build

1. Öffne den Jenkins Job: `TWS-App-Build`
2. Klicke auf **Build with Parameters**
3. Wähle Build-Optionen:
   - **BUILD_TYPE**: 
     - `web` - Nur Web-App bauen
     - `android` - Nur Android-App bauen
     - `both` - Beides bauen
   - **ANDROID_BUILD_TYPE**: `debug` oder `release`
   - **SKIP_TESTS**: Tests überspringen (optional)
4. Klicke auf **Build**

### Build-Verlauf

- **Console Output**: Zeigt Build-Logs in Echtzeit
- **Build Artifacts**: Herunterladbare Build-Dateien
  - Web: `dist/` Verzeichnis (ZIP)
  - Android: `.apk` Dateien

### Build-Stages

Die Pipeline führt folgende Stages aus:

1. **Checkout**: Code aus Git Repository laden
2. **Environment Info**: System-Informationen anzeigen
3. **Install Dependencies**: `npm ci` ausführen
4. **Lint**: Code-Qualität prüfen (ESLint)
5. **Build Web App**: Vue.js App mit Vite bauen
6. **Build Android App**: Android APK erstellen
7. **Archive Artifacts**: Build-Artefakte speichern
8. **Test Results**: Test-Ergebnisse sammeln (wenn vorhanden)

## 🔐 Credentials Management

### Git Credentials

Falls das Repository privat ist:

1. **Manage Jenkins** → **Manage Credentials**
2. **Stores scoped to Jenkins** → **Global credentials** → **Add Credentials**
3. **Kind**: `Username with password` oder `SSH Username with private key`
4. Credentials eingeben
5. **ID**: `github-credentials` (wird im Jenkinsfile referenziert)

### Android Signing (für Release-Builds)

Für signierte Release-APKs:

1. Erstelle Keystore-Datei:

```bash
keytool -genkey -v -keystore tws-app.keystore \
  -alias tws-app -keyalg RSA -keysize 2048 -validity 10000
```

2. Speichere Keystore in Jenkins:
   - **Manage Credentials** → **Add Credentials**
   - **Kind**: `Secret file`
   - **File**: Upload `tws-app.keystore`
   - **ID**: `android-keystore`

3. Füge Passwörter hinzu:
   - **Kind**: `Secret text`
   - **Secret**: Keystore-Passwort
   - **ID**: `android-keystore-password`

## 📊 Build-Benachrichtigungen

### Email-Benachrichtigungen

1. **Manage Jenkins** → **Configure System**
2. **E-mail Notification**:
   - **SMTP server**: `smtp.gmail.com` (für Gmail)
   - **Use SMTP Authentication**: ✓
   - **User Name**: Deine E-Mail
   - **Password**: App-spezifisches Passwort
   - **Use SSL**: ✓
   - **SMTP Port**: `465`

3. Füge im Jenkinsfile hinzu:

```groovy
post {
    failure {
        emailext (
            subject: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
            body: "Check console output at ${env.BUILD_URL}",
            to: "team@example.com"
        )
    }
}
```

### Slack-Benachrichtigungen

1. Installiere **Slack Notification Plugin**
2. **Manage Jenkins** → **Configure System** → **Slack**
3. Konfiguriere Workspace und Token
4. Füge im Jenkinsfile hinzu:

```groovy
post {
    success {
        slackSend color: 'good', message: "Build Successful: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
    }
}
```

## 🐛 Fehlerbehebung

### Problem: Node.js nicht gefunden

**Symptom**: `node: command not found`

**Lösung**:
1. Prüfe ob NodeJS Plugin installiert ist
2. Konfiguriere Node.js in **Global Tool Configuration**
3. Stelle sicher, dass im Jenkinsfile `tools { nodejs 'NodeJS 18' }` gesetzt ist

### Problem: Android SDK nicht gefunden

**Symptom**: `ANDROID_SDK_ROOT not set`

**Lösung**:
1. Prüfe Umgebungsvariablen in Jenkins
2. Stelle sicher, dass `/opt/android-sdk` existiert und Berechtigungen korrekt sind
3. Starte Jenkins Service neu

### Problem: Gradle Build Fehler

**Symptom**: `Could not find or load main class org.gradle.wrapper.GradleWrapperMain`

**Lösung**:
```bash
cd android
chmod +x gradlew
./gradlew wrapper --gradle-version=8.7
```

### Problem: npm ci schlägt fehl

**Symptom**: `npm ERR! cipm can only install packages when your package.json and package-lock.json`

**Lösung**:
1. Stelle sicher, dass `package-lock.json` im Repository committed ist
2. Alternativ verwende `npm install` statt `npm ci` im Jenkinsfile

### Problem: Speicherplatz voll

**Symptom**: `No space left on device`

**Lösung**:
1. Bereinige alte Builds:

```bash
# Lösche alte Builds (älter als 30 Tage)
find /var/lib/jenkins/jobs/*/builds -type d -mtime +30 -exec rm -rf {} +

# Lösche Workspace
rm -rf /var/lib/jenkins/workspace/*
```

2. Konfiguriere **Discard old builds** in Job-Settings

### Problem: Build dauert zu lange

**Optimierungen**:

1. **npm cache nutzen**:
```groovy
environment {
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
}
```

2. **Parallele Builds** (wenn mehrere Executors verfügbar):
```groovy
stage('Build') {
    parallel {
        stage('Web') { /* ... */ }
        stage('Android') { /* ... */ }
    }
}
```

3. **Gradle Daemon aktivieren**:
```groovy
sh './gradlew assembleDebug --daemon'
```

## 📚 Weitere Ressourcen

### Dokumentation

- [Jenkins Official Documentation](https://www.jenkins.io/doc/)
- [Pipeline Syntax Reference](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Android Build Documentation](https://developer.android.com/studio/build)
- [Capacitor Documentation](https://capacitorjs.com/docs)

### Beispiel-Builds

- **Web-Only Build**:
  ```bash
  BUILD_TYPE=web
  SKIP_TESTS=false
  ```

- **Android Debug Build**:
  ```bash
  BUILD_TYPE=android
  ANDROID_BUILD_TYPE=debug
  ```

- **Full Build (Web + Android Release)**:
  ```bash
  BUILD_TYPE=both
  ANDROID_BUILD_TYPE=release
  SKIP_TESTS=false
  ```

## 🔄 Wartung

### Regelmäßige Aufgaben

1. **Jenkins Updates**:
   - Monatlich Jenkins Core und Plugins aktualisieren
   - Backup vor Updates erstellen

2. **Disk Space Management**:
   - Alte Builds löschen
   - Build-Artefakte archivieren oder löschen

3. **Security**:
   - Credentials regelmäßig rotieren
   - Security-Plugins aktualisieren
   - Zugriff überprüfen

### Backup

```bash
# Jenkins Home Verzeichnis sichern
sudo tar -czf jenkins-backup-$(date +%Y%m%d).tar.gz /var/lib/jenkins

# Wichtige Dateien:
# - jobs/*/config.xml (Job-Konfigurationen)
# - credentials.xml (Credentials)
# - config.xml (Global Config)
```

## 🎓 Best Practices

1. **Verwende Pipeline as Code**: Jenkinsfile im Repository
2. **Nutze Multibranch Pipeline**: Für Feature-Branches
3. **Implementiere Tests**: Unit, Integration, E2E
4. **Artifact Archiving**: Nur notwendige Dateien archivieren
5. **Monitoring**: Build-Zeiten und Erfolgsraten überwachen
6. **Security**: Credentials niemals im Code committen
7. **Documentation**: Build-Prozess dokumentieren

---

**Entwickelt für TWS-App**  
Bei Fragen oder Problemen: [GitHub Issues](https://github.com/hammermaps/TWS-App/issues)
