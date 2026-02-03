# Jenkins Build Server - Setup Guide

This guide describes how to set up a Jenkins Build Server for the TWS-App with support for npm (Node.js) and Android builds.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Jenkins Server Installation](#jenkins-server-installation)
- [Node.js Plugin Installation](#nodejs-plugin-installation)
- [Android SDK Setup](#android-sdk-setup)
- [Jenkins Job Configuration](#jenkins-job-configuration)
- [Environment Variables](#environment-variables)
- [Build Execution](#build-execution)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), Windows Server, or macOS
- **RAM**: At least 4 GB (8 GB recommended)
- **CPU**: At least 2 Cores (4+ recommended)
- **Disk Space**: At least 20 GB free space
- **Java**: OpenJDK 17 or higher

### Software Prerequisites

- Java Development Kit (JDK) 17+
- Git
- Jenkins 2.400+
- Node.js 18.x or higher
- npm 9.x or higher
- Android SDK (only for Android builds)
- Gradle (automatically used by Android project)

## 🚀 Jenkins Server Installation

### Linux (Ubuntu/Debian)

```bash
# Install Java
sudo apt update
sudo apt install -y openjdk-17-jdk

# Add Jenkins Repository
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install Jenkins
sudo apt update
sudo apt install -y jenkins

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Check status
sudo systemctl status jenkins
```

### Windows

1. **Install Java**:
   - Download and install OpenJDK 17 from [Adoptium](https://adoptium.net/)

2. **Install Jenkins**:
   - Download Jenkins Windows Installer from [jenkins.io](https://www.jenkins.io/download/)
   - Run the installer and follow instructions
   - Jenkins runs as a Windows Service

3. **Start Jenkins**:
   - Jenkins starts automatically as a service
   - Open browser: `http://localhost:8080`

### macOS

```bash
# Use Homebrew
brew install jenkins-lts

# Start Jenkins
brew services start jenkins-lts

# Check status
brew services list
```

### Initial Login

1. Open browser: `http://localhost:8080`
2. Get the initial admin password:

```bash
# Linux/macOS
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Windows
# Check: C:\Program Files\Jenkins\secrets\initialAdminPassword
```

3. Install suggested plugins
4. Create admin user

## 📦 Node.js Plugin Installation

### Install Plugin

1. Open Jenkins Dashboard
2. **Manage Jenkins** → **Manage Plugins** → **Available plugins**
3. Search for "NodeJS"
4. Select **NodeJS Plugin**
5. Click **Install without restart**

### Configure Node.js

1. **Manage Jenkins** → **Global Tool Configuration**
2. Scroll to **NodeJS** section
3. Click **Add NodeJS**
4. Configure as follows:

```
Name: NodeJS 18
Install automatically: ✓ (enabled)
Version: NodeJS 18.x (latest LTS)
Global npm packages to install: (leave empty)
```

5. Click **Save**

## 📱 Android SDK Setup

### Android SDK Installation (Linux)

```bash
# Download Android Command Line Tools
cd /opt
sudo wget https://dl.google.com/android/repository/commandlinetools-linux-latest.zip

# Extract
sudo mkdir -p android-sdk/cmdline-tools
sudo unzip commandlinetools-linux-latest.zip -d android-sdk/cmdline-tools
sudo mv android-sdk/cmdline-tools/cmdline-tools android-sdk/cmdline-tools/latest

# Set permissions
sudo chown -R jenkins:jenkins /opt/android-sdk

# Install SDK packages (as jenkins user)
sudo su - jenkins
export ANDROID_SDK_ROOT=/opt/android-sdk
cd /opt/android-sdk/cmdline-tools/latest/bin

./sdkmanager --update
./sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
./sdkmanager --licenses
```

### Android SDK Installation (Windows)

1. **Install Android Studio**:
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Install with default SDK

2. **Note SDK Path**:
   - Default path: `C:\Users\<USERNAME>\AppData\Local\Android\Sdk`

### Set Environment Variables

#### Linux (for Jenkins)

```bash
# Edit Jenkins environment configuration
sudo systemctl edit jenkins

# Add:
[Service]
Environment="ANDROID_SDK_ROOT=/opt/android-sdk"
Environment="ANDROID_HOME=/opt/android-sdk"

# Save and restart Jenkins
sudo systemctl restart jenkins
```

#### Windows

1. **System Properties** → **Environment Variables**
2. Add new system variable:
   - Name: `ANDROID_SDK_ROOT`
   - Value: `C:\Users\<USERNAME>\AppData\Local\Android\Sdk`
3. Add:
   - Name: `ANDROID_HOME`
   - Value: `C:\Users\<USERNAME>\AppData\Local\Android\Sdk`
4. Restart Jenkins service

## 🔨 Jenkins Job Configuration

### Create Pipeline Job

1. **Jenkins Dashboard** → **New Item**
2. Enter name: `TWS-App-Build`
3. Select **Pipeline**
4. Click **OK**

### Configure Pipeline

#### 1. General Settings

- **Description**: `TWS-App Build Pipeline - Web and Android`
- **Discard old builds**: ✓
  - Days to keep builds: `30`
  - Max # of builds to keep: `10`

#### 2. Build Triggers

Select one or more options:

- **GitHub hook trigger for GITScm polling**: For automatic builds on Git push
- **Poll SCM**: `H/15 * * * *` (checks every 15 minutes)
- **Build periodically**: `H 2 * * *` (daily build at 2 AM)

#### 3. Pipeline Definition

- **Definition**: `Pipeline script from SCM`
- **SCM**: `Git`
- **Repository URL**: `https://github.com/hammermaps/TWS-App.git`
- **Credentials**: Add Git credentials if private
- **Branch Specifier**: `*/main` or `*/master`
- **Script Path**: `Jenkinsfile`

#### 4. Save

Click **Save**

### Multibranch Pipeline (Optional)

For automatic builds of multiple branches:

1. **New Item** → **Multibranch Pipeline**
2. **Branch Sources** → **Add source** → **Git**
3. **Project Repository**: `https://github.com/hammermaps/TWS-App.git`
4. **Build Configuration**:
   - Mode: `by Jenkinsfile`
   - Script Path: `Jenkinsfile`

## ⚙️ Environment Variables

### Required Variables

Configure in Jenkins under **Manage Jenkins** → **Configure System** → **Global properties** → **Environment variables**:

| Variable | Value | Description |
|----------|-------|-------------|
| `ANDROID_SDK_ROOT` | `/opt/android-sdk` (Linux) or `C:\Users\...\Sdk` (Windows) | Android SDK path |
| `ANDROID_HOME` | Same as `ANDROID_SDK_ROOT` | Legacy Android SDK variable |
| `VITE_API_BASE_URL` | `https://wls.dk-automation.de` | Backend API URL |

### Optional Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `NPM_CONFIG_CACHE` | `${WORKSPACE}/.npm` | NPM cache directory |

## 🎯 Build Execution

### Manual Build

1. Open Jenkins job: `TWS-App-Build`
2. Click **Build with Parameters**
3. Select build options:
   - **BUILD_TYPE**: 
     - `web` - Build web app only
     - `android` - Build Android app only
     - `both` - Build both
   - **ANDROID_BUILD_TYPE**: `debug` or `release`
   - **SKIP_TESTS**: Skip tests (optional)
4. Click **Build**

### Build History

- **Console Output**: Shows build logs in real-time
- **Build Artifacts**: Downloadable build files
  - Web: `dist/` directory (ZIP)
  - Android: `.apk` files

### Build Stages

The pipeline executes the following stages:

1. **Checkout**: Load code from Git repository
2. **Environment Info**: Display system information
3. **Install Dependencies**: Run `npm ci`
4. **Lint**: Check code quality (ESLint)
5. **Build Web App**: Build Vue.js app with Vite
6. **Build Android App**: Create Android APK
7. **Archive Artifacts**: Save build artifacts
8. **Test Results**: Collect test results (if available)

## 🔐 Credentials Management

### Git Credentials

If the repository is private:

1. **Manage Jenkins** → **Manage Credentials**
2. **Stores scoped to Jenkins** → **Global credentials** → **Add Credentials**
3. **Kind**: `Username with password` or `SSH Username with private key`
4. Enter credentials
5. **ID**: `github-credentials` (referenced in Jenkinsfile)

### Android Signing (for Release Builds)

For signed release APKs:

1. Create keystore file:

```bash
keytool -genkey -v -keystore tws-app.keystore \
  -alias tws-app -keyalg RSA -keysize 2048 -validity 10000
```

2. Store keystore in Jenkins:
   - **Manage Credentials** → **Add Credentials**
   - **Kind**: `Secret file`
   - **File**: Upload `tws-app.keystore`
   - **ID**: `android-keystore`

3. Add passwords:
   - **Kind**: `Secret text`
   - **Secret**: Keystore password
   - **ID**: `android-keystore-password`

## 📊 Build Notifications

### Email Notifications

1. **Manage Jenkins** → **Configure System**
2. **E-mail Notification**:
   - **SMTP server**: `smtp.gmail.com` (for Gmail)
   - **Use SMTP Authentication**: ✓
   - **User Name**: Your email
   - **Password**: App-specific password
   - **Use SSL**: ✓
   - **SMTP Port**: `465`

3. Add to Jenkinsfile:

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

### Slack Notifications

1. Install **Slack Notification Plugin**
2. **Manage Jenkins** → **Configure System** → **Slack**
3. Configure workspace and token
4. Add to Jenkinsfile:

```groovy
post {
    success {
        slackSend color: 'good', message: "Build Successful: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
    }
}
```

## 🐛 Troubleshooting

### Issue: Node.js not found

**Symptom**: `node: command not found`

**Solution**:
1. Check if NodeJS Plugin is installed
2. Configure Node.js in **Global Tool Configuration**
3. Ensure `tools { nodejs 'NodeJS 18' }` is set in Jenkinsfile

### Issue: Android SDK not found

**Symptom**: `ANDROID_SDK_ROOT not set`

**Solution**:
1. Check environment variables in Jenkins
2. Ensure `/opt/android-sdk` exists and permissions are correct
3. Restart Jenkins service

### Issue: Gradle Build Error

**Symptom**: `Could not find or load main class org.gradle.wrapper.GradleWrapperMain`

**Solution**:
```bash
cd android
chmod +x gradlew
./gradlew wrapper --gradle-version=8.7
```

### Issue: npm ci fails

**Symptom**: `npm ERR! cipm can only install packages when your package.json and package-lock.json`

**Solution**:
1. Ensure `package-lock.json` is committed in repository
2. Alternatively use `npm install` instead of `npm ci` in Jenkinsfile

### Issue: Disk space full

**Symptom**: `No space left on device`

**Solution**:
1. Clean up old builds:

```bash
# Delete old builds (older than 30 days)
find /var/lib/jenkins/jobs/*/builds -type d -mtime +30 -exec rm -rf {} +

# Delete workspace
rm -rf /var/lib/jenkins/workspace/*
```

2. Configure **Discard old builds** in job settings

### Issue: Build takes too long

**Optimizations**:

1. **Use npm cache**:
```groovy
environment {
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
}
```

2. **Parallel builds** (if multiple executors available):
```groovy
stage('Build') {
    parallel {
        stage('Web') { /* ... */ }
        stage('Android') { /* ... */ }
    }
}
```

3. **Enable Gradle daemon**:
```groovy
sh './gradlew assembleDebug --daemon'
```

## 📚 Additional Resources

### Documentation

- [Jenkins Official Documentation](https://www.jenkins.io/doc/)
- [Pipeline Syntax Reference](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Android Build Documentation](https://developer.android.com/studio/build)
- [Capacitor Documentation](https://capacitorjs.com/docs)

### Example Builds

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

## 🔄 Maintenance

### Regular Tasks

1. **Jenkins Updates**:
   - Monthly Jenkins core and plugin updates
   - Create backup before updates

2. **Disk Space Management**:
   - Delete old builds
   - Archive or delete build artifacts

3. **Security**:
   - Rotate credentials regularly
   - Update security plugins
   - Review access

### Backup

```bash
# Backup Jenkins home directory
sudo tar -czf jenkins-backup-$(date +%Y%m%d).tar.gz /var/lib/jenkins

# Important files:
# - jobs/*/config.xml (job configurations)
# - credentials.xml (credentials)
# - config.xml (global config)
```

## 🎓 Best Practices

1. **Use Pipeline as Code**: Jenkinsfile in repository
2. **Use Multibranch Pipeline**: For feature branches
3. **Implement Tests**: Unit, integration, E2E
4. **Artifact Archiving**: Only archive necessary files
5. **Monitoring**: Monitor build times and success rates
6. **Security**: Never commit credentials in code
7. **Documentation**: Document build process

---

**Developed for TWS-App**  
For questions or issues: [GitHub Issues](https://github.com/hammermaps/TWS-App/issues)
