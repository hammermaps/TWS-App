pipeline {
    agent any
    
    tools {
        nodejs 'NodeJS 18'
    }
    
    environment {
        // Node.js und npm Umgebungsvariablen
        NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
        NODE_ENV = 'production'
        
        // Android Build Umgebungsvariablen
        ANDROID_HOME = "${ANDROID_SDK_ROOT}"
        ANDROID_SDK_ROOT = "${env.ANDROID_HOME ?: '/opt/android-sdk'}"
        
        // App-spezifische Variablen
        VITE_API_BASE_URL = "${env.VITE_API_BASE_URL ?: 'https://wls.dk-automation.de'}"
    }
    
    parameters {
        choice(
            name: 'BUILD_TYPE',
            choices: ['web', 'android', 'both'],
            description: 'Wähle den Build-Typ'
        )
        choice(
            name: 'ANDROID_BUILD_TYPE',
            choices: ['debug', 'release'],
            description: 'Android Build-Typ (nur relevant wenn BUILD_TYPE=android oder both)'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Tests überspringen'
        )
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                checkout scm
            }
        }
        
        stage('Environment Info') {
            steps {
                script {
                    echo "Build-Typ: ${params.BUILD_TYPE}"
                    echo "Android Build-Typ: ${params.ANDROID_BUILD_TYPE}"
                    sh '''
                        echo "Node Version:"
                        node --version
                        echo "NPM Version:"
                        npm --version
                        echo "Working Directory:"
                        pwd
                    '''
                    
                    // Zeige Android-Umgebung wenn Android-Build gewählt
                    if (params.BUILD_TYPE == 'android' || params.BUILD_TYPE == 'both') {
                        sh '''
                            echo "Android SDK Root: ${ANDROID_SDK_ROOT}"
                            if [ -d "${ANDROID_SDK_ROOT}" ]; then
                                echo "Android SDK gefunden"
                            else
                                echo "WARNUNG: Android SDK nicht gefunden!"
                            fi
                        '''
                    }
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                sh '''
                    npm ci --prefer-offline --no-audit
                '''
            }
        }
        
        stage('Lint') {
            when {
                expression { !params.SKIP_TESTS }
            }
            steps {
                echo 'Running ESLint...'
                sh '''
                    npm run lint || true
                '''
            }
        }
        
        stage('Build Web App') {
            when {
                expression { params.BUILD_TYPE == 'web' || params.BUILD_TYPE == 'both' }
            }
            steps {
                echo 'Building Vue.js application...'
                sh '''
                    npm run build
                '''
            }
        }
        
        stage('Build Android App') {
            when {
                expression { params.BUILD_TYPE == 'android' || params.BUILD_TYPE == 'both' }
            }
            steps {
                script {
                    echo 'Building Android application...'
                    
                    // Stelle sicher, dass Web-Build vorhanden ist
                    sh '''
                        # Web-App bauen falls noch nicht gebaut
                        if [ ! -d "dist" ]; then
                            echo "Web-Build nicht gefunden, baue Web-App..."
                            npm run build
                        fi
                        
                        # Synchronisiere mit Android
                        echo "Synchronisiere Web-App mit Android..."
                        npx cap sync android
                    '''
                    
                    // Android Build mit Gradle
                    dir('android') {
                        if (params.ANDROID_BUILD_TYPE == 'release') {
                            sh '''
                                ./gradlew assembleRelease
                            '''
                        } else {
                            sh '''
                                ./gradlew assembleDebug
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Archive Artifacts') {
            steps {
                script {
                    echo 'Archiving build artifacts...'
                    
                    // Web-Artefakte archivieren
                    if (params.BUILD_TYPE == 'web' || params.BUILD_TYPE == 'both') {
                        if (fileExists('dist')) {
                            archiveArtifacts artifacts: 'dist/**/*', 
                                           fingerprint: true,
                                           allowEmptyArchive: false
                        }
                    }
                    
                    // Android-Artefakte archivieren
                    if (params.BUILD_TYPE == 'android' || params.BUILD_TYPE == 'both') {
                        if (params.ANDROID_BUILD_TYPE == 'release') {
                            archiveArtifacts artifacts: 'android/app/build/outputs/apk/release/*.apk',
                                           fingerprint: true,
                                           allowEmptyArchive: true
                        } else {
                            archiveArtifacts artifacts: 'android/app/build/outputs/apk/debug/*.apk',
                                           fingerprint: true,
                                           allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        
        stage('Test Results') {
            when {
                expression { !params.SKIP_TESTS }
            }
            steps {
                echo 'Collecting test results...'
                // Hier können später Test-Reports hinzugefügt werden
                echo 'Keine Tests konfiguriert - übersprungen'
            }
        }
    }
    
    post {
        success {
            echo 'Build erfolgreich abgeschlossen!'
            // Hier könnte eine Benachrichtigung hinzugefügt werden
        }
        failure {
            echo 'Build fehlgeschlagen!'
            // Hier könnte eine Fehlerbenachrichtigung hinzugefügt werden
        }
        always {
            echo 'Cleaning up workspace...'
            cleanWs(
                deleteDirs: true,
                patterns: [
                    [pattern: 'node_modules/**', type: 'INCLUDE'],
                    [pattern: '.npm/**', type: 'INCLUDE'],
                    [pattern: 'dist/**', type: 'INCLUDE']
                ]
            )
        }
    }
}
