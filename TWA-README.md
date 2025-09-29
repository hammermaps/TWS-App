TWA (Trusted Web Activity) & Capacitor Quickstart

This README explains the minimal steps to package the PWA as an Android app via Capacitor or as a TWA.

Prerequisites
- JDK 11+ installed
- Android SDK + Android Studio (for Capacitor) or Bubblewrap (for TWA)
- Node.js and npm installed

Capacitor (recommended for hybrid apps)
1. Install Capacitor in the project:
   npm install @capacitor/core @capacitor/cli --save

2. Initialize Capacitor (only once):
   npx cap init com.example.twsapp tws-app
   # appId should match capacitor.config.json (com.example.twsapp)

3. Build web assets and sync to native project:
   npm run build:web
   npx cap add android      # adds android project
   npx cap sync android
   npx cap open android     # opens Android Studio

4. In Android Studio: build & run on device/emulator.

Trusted Web Activity (TWA) via Bubblewrap (progressive web packaging)
1. Install bubblewrap globally:
   npm install -g @bubblewrap/cli

2. Initialize TWA project:
   bubblewrap init --manifest https://your-deployed-site.example/manifest.webmanifest
   # follow prompts (package name, launcher name, ...)

3. Build TWA and open in Android Studio:
   bubblewrap build
   # then open the generated Android project in Android Studio

4. Digital Asset Links: ensure your site hosts an assetlinks.json allowing the package name.
   Example location (served over HTTPS): https://your-domain/.well-known/assetlinks.json

Notes
- Ensure your PWA is served over HTTPS when testing TWA in production.
- For local testing you can use 'bubblewrap init' with a public URL or deploy a temporary build.
- Capacitor wraps the web assets directly and is more flexible if you need native plugins.

Files added to this repo by the PWA/Capacitor setup:
- public/manifest.webmanifest
- public/icons/icon-192.svg
- public/icons/icon-512.svg
- public/robots.txt
- capacitor.config.json
- TWA-README.md

If you want, I can also scaffold Capacitor (@capacitor/cli) into the project automatically (add packages and run `npx cap init`) — tell me if you want me to proceed with full Capacitor initialization.
