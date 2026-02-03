# Jenkins Configuration Files

Dieses Verzeichnis enthält vorkonfigurierte Jenkins-Konfigurationsdateien für die TWS-App.

## 📁 Dateien

### `job-config.xml`

Vorkonfigurierte Jenkins Pipeline Job-Konfiguration.

**Enthält:**
- Build-Parameter (BUILD_TYPE, ANDROID_BUILD_TYPE, SKIP_TESTS)
- Build-Trigger (täglich um 2 Uhr, SCM-Polling alle 15 Min)
- Git-Repository-Konfiguration
- Jenkinsfile-Pfad
- Build-History-Verwaltung (30 Tage, max 10 Builds)

## 🚀 Verwendung

### Option 1: Job-Konfiguration importieren (GUI)

1. Jenkins Dashboard öffnen
2. **Manage Jenkins** → **Manage Plugins**
3. **Available** Tab → "Job Import Plugin" suchen und installieren (optional)
4. **New Item** → Name eingeben → **Pipeline** auswählen
5. Im Job-Konfiguration: **Configure** → **Pipeline** Sektion
6. Inhalt von `job-config.xml` manuell übertragen:
   - Parameters definieren
   - Build Triggers setzen
   - Pipeline Definition: "Pipeline script from SCM"
   - SCM: Git → Repository URL eingeben
   - Script Path: `Jenkinsfile`

### Option 2: Job über CLI importieren

```bash
# Jenkins CLI herunterladen
wget http://localhost:8080/jnlpJars/jenkins-cli.jar

# Job erstellen
java -jar jenkins-cli.jar -s http://localhost:8080/ create-job TWS-App-Build < jenkins/job-config.xml

# Bei Authentifizierung erforderlich:
java -jar jenkins-cli.jar -s http://localhost:8080/ -auth username:password create-job TWS-App-Build < jenkins/job-config.xml
```

### Option 3: Job über API importieren

```bash
# Mit curl
curl -X POST "http://localhost:8080/createItem?name=TWS-App-Build" \
  --user "username:password" \
  --header "Content-Type: application/xml" \
  --data-binary @jenkins/job-config.xml
```

### Option 4: Manuell Jenkinsfile verwenden (empfohlen)

Die einfachste Methode ist, einfach eine neue Pipeline zu erstellen und auf das Jenkinsfile im Repository zu verweisen:

1. **New Item** → Name: `TWS-App-Build` → **Pipeline**
2. **Pipeline** Sektion:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `https://github.com/hammermaps/TWS-App.git`
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
3. **Save**

## ⚙️ Konfiguration anpassen

### Repository URL ändern

Wenn Sie einen Fork verwenden, bearbeiten Sie `job-config.xml`:

```xml
<url>https://github.com/IHR-USERNAME/TWS-App.git</url>
```

### Build-Trigger anpassen

#### Täglicher Build (Standard: 2 Uhr)

```xml
<spec>H 2 * * *</spec>
```

Andere Zeiten:
- `H 0 * * *` - Mitternacht
- `H 12 * * *` - Mittag
- `H 18 * * *` - 18 Uhr

#### SCM Polling (Standard: alle 15 Min)

```xml
<spec>H/15 * * * *</spec>
```

Andere Intervalle:
- `H/5 * * * *` - Alle 5 Minuten
- `H/30 * * * *` - Alle 30 Minuten
- `H * * * *` - Stündlich

### Build-Historie anpassen

```xml
<daysToKeep>30</daysToKeep>      <!-- Builds 30 Tage aufbewahren -->
<numToKeep>10</numToKeep>        <!-- Max 10 Builds behalten -->
```

## 🔐 Credentials

Wenn das Repository privat ist, müssen Sie Credentials hinzufügen:

1. **Manage Jenkins** → **Manage Credentials**
2. **Add Credentials**:
   - Kind: `Username with password` oder `SSH Username with private key`
   - Scope: `Global`
   - ID: `github-credentials`
3. Fügen Sie in `job-config.xml` hinzu:

```xml
<userRemoteConfigs>
  <hudson.plugins.git.UserRemoteConfig>
    <url>https://github.com/hammermaps/TWS-App.git</url>
    <credentialsId>github-credentials</credentialsId>
  </hudson.plugins.git.UserRemoteConfig>
</userRemoteConfigs>
```

## 📚 Weitere Informationen

- [Haupt-Dokumentation](../docs/JENKINS_SETUP.md)
- [Quick Start Guide](../docs/JENKINS_QUICKSTART.md)
- [English Documentation](../docs/JENKINS_SETUP_EN.md)

## 🔄 Job aktualisieren

Wenn Sie die Konfiguration später aktualisieren möchten:

```bash
# Job-Konfiguration abrufen
java -jar jenkins-cli.jar -s http://localhost:8080/ get-job TWS-App-Build > current-config.xml

# Job-Konfiguration aktualisieren
java -jar jenkins-cli.jar -s http://localhost:8080/ update-job TWS-App-Build < jenkins/job-config.xml
```

## ⚠️ Hinweise

- **job-config.xml** enthält keine Credentials - diese müssen separat in Jenkins konfiguriert werden
- Die Konfiguration geht davon aus, dass das **NodeJS Plugin** installiert und konfiguriert ist
- Für Android-Builds muss das Android SDK installiert und konfiguriert sein
- Branch-Name in der Konfiguration ist `*/main` - passen Sie dies an falls Sie `master` oder einen anderen Branch verwenden

---

**Entwickelt für TWS-App**  
Bei Fragen: [GitHub Issues](https://github.com/hammermaps/TWS-App/issues)
