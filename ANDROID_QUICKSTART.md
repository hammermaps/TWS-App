# Android Build Quick Start Guide

This is the quick start guide for building the TWS-App as a native Android application. For detailed instructions in German, see [ANDROID_SETUP.md](ANDROID_SETUP.md).

## Prerequisites

- **Node.js** 18.x or higher
- **Android Studio** (latest stable version)
- **JDK 17** (included with Android Studio)
- **Android SDK** API Level 22+ (Android 5.1+)

## Quick Setup

### 1. Install Dependencies

```bash
git clone https://github.com/hammermaps/TWS-App.git
cd TWS-App
npm install
```

### 2. Build and Sync

```bash
# Build the web app and sync with Android
npm run android:build
```

### 3. Open in Android Studio

```bash
# Opens Android Studio automatically
npm run android:open
```

Or manually:
- Open Android Studio
- **File → Open**
- Select the `android/` folder
- Wait for Gradle sync to complete

### 4. Run on Device/Emulator

In Android Studio:
- Connect Android device via USB (with USB debugging enabled)
- Or create an Android emulator via **Tools → Device Manager**
- Click the **Run** button (▶️)

Or via command line:
```bash
npm run android:run
```

## Available npm Scripts

```bash
npm run dev              # Start development server
npm run build            # Build web app
npm run android:build    # Build web app and sync with Android
npm run android:sync     # Sync existing build with Android
npm run android:open     # Open Android Studio
npm run android:run      # Build, sync, and run on device
```

## Development Workflow

```bash
# 1. Make changes to Vue.js code (src/ folder)
# 2. Build web app
npm run build

# 3. Sync with Android project
npm run android:sync

# 4. Run on device
npm run android:run
```

## Creating Release APK

1. Open Android Studio
2. **Build → Generate Signed Bundle / APK**
3. Select **APK** → **Next**
4. Create or select keystore
5. Select **release** variant
6. **Finish**
7. APK location: `android/app/build/outputs/apk/release/app-release.apk`

## Project Structure

```
TWS-App/
├── android/                    # Android project (Capacitor-generated)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/public/  # Web app files (copy of dist/)
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/            # Android resources (icons, strings)
│   │   └── build.gradle
│   └── build.gradle
├── src/                        # Vue.js source code
├── dist/                       # Build output (synced to android/)
├── capacitor.config.json       # Capacitor configuration
└── package.json                # npm dependencies and scripts
```

## Configuration

### App Name
Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">TWS Leerstandsspülung App</string>
```

### App ID
Edit `capacitor.config.json`:
```json
{
  "appId": "de.dk_automation.tws",
  "appName": "TWS Leerstandsspülung App"
}
```

### Minimum SDK / Target SDK
Edit `android/app/build.gradle`:
```gradle
android {
    compileSdkVersion 33
    defaultConfig {
        minSdkVersion 22
        targetSdkVersion 33
    }
}
```

## Troubleshooting

### Gradle sync fails
```bash
cd android
./gradlew clean
# Or: File → Invalidate Caches in Android Studio
```

### App shows blank screen
```bash
npm run build
npm run android:sync
```

### USB device not recognized
- Enable USB debugging in device settings
- Try different USB cable
- Check: `adb devices` in terminal

## Resources

- **Capacitor Documentation**: https://capacitorjs.com/docs
- **Android Developer Guide**: https://developer.android.com/guide
- **Detailed Setup (German)**: [ANDROID_SETUP.md](ANDROID_SETUP.md)

## Technical Details

- **Framework**: Vue.js 3.5+ with Capacitor 8.0+
- **Android Min SDK**: 22 (Android 5.1 Lollipop)
- **Android Target SDK**: 33 (Android 13)
- **App ID**: de.dk_automation.tws
- **Build Tool**: Gradle with Android Studio

## License

MIT License - See [LICENSE](LICENSE) for details
