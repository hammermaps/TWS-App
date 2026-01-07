# Android App Testing Guide

This guide explains how to test the Android version of the TWS-App.

## Prerequisites

Before testing, ensure you have:
- ✅ Android Studio installed
- ✅ Android SDK installed (via Android Studio)
- ✅ JDK 17 installed
- ✅ Node.js 18+ and npm installed
- ✅ Git installed

## Step-by-Step Testing Instructions

### 1. Clone and Setup the Branch

```bash
# Clone the repository
git clone https://github.com/hammermaps/TWS-App.git
cd TWS-App

# Checkout the Android branch
git checkout copilot/create-android-app-branch

# Install dependencies
npm install
```

### 2. Build the Web Application

```bash
# Build the Vue.js application
npm run build
```

Expected output:
- Build completes successfully
- `dist/` directory is created with built files
- No errors in the output

### 3. Sync with Android

```bash
# Sync the built web app with the Android project
npm run android:sync
```

Expected output:
```
✔ Copying web assets from dist to android/app/src/main/assets/public
✔ Creating capacitor.config.json in android/app/src/main/assets
✔ copy android in XXms
✔ Updating Android plugins
✔ update android in XXms
[info] Sync finished in X.XXs
```

### 4. Open in Android Studio

```bash
# Open the Android project in Android Studio
npm run android:open
```

This will automatically launch Android Studio with the project.

**Alternatively**, manually open Android Studio:
1. Open Android Studio
2. Click "Open"
3. Navigate to the `android/` folder in the TWS-App directory
4. Click "OK"

### 5. Wait for Gradle Sync

When the project opens in Android Studio:
1. Wait for Gradle sync to complete (bottom status bar)
2. This may take 2-5 minutes on first run
3. If prompted, accept any SDK downloads or updates

### 6. Configure a Device

**Option A: Physical Android Device**

1. Enable Developer Options on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

2. Connect device via USB cable

3. Accept USB debugging prompt on device

4. Device should appear in Android Studio's device dropdown

**Option B: Android Emulator**

1. In Android Studio, click "Device Manager" (phone icon in toolbar)
2. Click "Create Device"
3. Select a device (e.g., Pixel 5)
4. Click "Next"
5. Select a system image (e.g., API 33 - Android 13)
6. Click "Next", then "Finish"
7. Start the emulator by clicking the play button

### 7. Run the Application

1. Select your device/emulator from the dropdown at the top
2. Click the green "Run" button (▶️) or press Shift+F10
3. Wait for the app to build and install

Expected behavior:
- App builds successfully
- APK installs on device/emulator
- App launches automatically
- TWS-App logo/splash screen appears
- Login screen is displayed

### 8. Test Core Functionality

Once the app is running, test the following:

#### Authentication Test
1. ✅ Login screen loads correctly
2. ✅ Enter credentials and log in
3. ✅ Token is stored and persists

#### Navigation Test
1. ✅ Navigate to Dashboard
2. ✅ Open Sidebar menu
3. ✅ Navigate to Buildings list
4. ✅ Navigate to Apartments
5. ✅ All routes work correctly

#### Offline Mode Test
1. ✅ Turn on Airplane mode on device
2. ✅ App switches to offline mode
3. ✅ Offline banner appears
4. ✅ Cached data is accessible
5. ✅ Offline flush operations work
6. ✅ Turn off Airplane mode
7. ✅ App reconnects automatically
8. ✅ Data syncs successfully

#### UI Test
1. ✅ All buttons are clickable
2. ✅ Forms work correctly
3. ✅ Dark/Light mode toggle works
4. ✅ Responsive design adapts to screen size
5. ✅ No visual glitches or layout issues

#### Performance Test
1. ✅ App launches quickly (< 3 seconds)
2. ✅ Navigation is smooth
3. ✅ No lag when scrolling
4. ✅ Forms respond immediately

### 9. Check Android-Specific Features

#### Back Button
1. ✅ Android back button navigates correctly
2. ✅ Pressing back on login screen exits app

#### App Lifecycle
1. ✅ Send app to background (Home button)
2. ✅ App pauses correctly
3. ✅ Resume app from recent apps
4. ✅ App state is preserved

#### Screen Rotation
1. ✅ Rotate device/emulator
2. ✅ Layout adapts correctly
3. ✅ No data loss on rotation
4. ✅ Scroll position is preserved

#### Network State Changes
1. ✅ Toggle WiFi/Data on and off
2. ✅ App detects network changes
3. ✅ Online/Offline status updates correctly
4. ✅ No crashes when network changes

### 10. Generate APK for Distribution

#### Debug APK
```bash
# In Android Studio:
Build → Build Bundle(s) / APK(s) → Build APK(s)

# APK location:
android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release APK (Signed)
```bash
# In Android Studio:
Build → Generate Signed Bundle / APK
- Select APK
- Create or select keystore
- Enter passwords
- Select 'release' variant
- Click Finish

# APK location:
android/app/build/outputs/apk/release/app-release.apk
```

### 11. Install APK on Device

#### Via USB (ADB)
```bash
# Make sure device is connected
adb devices

# Install the APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or for release:
adb install android/app/build/outputs/apk/release/app-release.apk
```

#### Via File Transfer
1. Copy APK to device (email, cloud storage, etc.)
2. On device, tap APK file
3. Allow installation from unknown sources if prompted
4. Install the app
5. Launch from app drawer

### 12. Test Production APK

Test the production release APK separately:
1. ✅ Uninstall any debug version
2. ✅ Install release APK
3. ✅ Verify all functionality works
4. ✅ Check performance (should be better than debug)
5. ✅ Verify app signing and security
6. ✅ Test on multiple devices/Android versions

## Common Issues and Solutions

### Issue: Gradle Sync Fails

**Solution:**
```bash
cd android
./gradlew clean
# Then sync again in Android Studio
```

### Issue: Device Not Recognized

**Solution:**
- Check USB cable connection
- Enable USB debugging
- Install device drivers (Windows)
- Try different USB port
- Check: `adb devices` in terminal

### Issue: Build Fails

**Solution:**
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

### Issue: App Shows White Screen

**Solution:**
1. Rebuild web app: `npm run build`
2. Sync: `npm run android:sync`
3. Rebuild Android app in Android Studio
4. Check Android Logcat for errors

### Issue: API Calls Fail

**Solution:**
- Check network permissions in AndroidManifest.xml
- Verify backend URL in API configuration
- Check CORS settings on backend
- Enable cleartext traffic in capacitor.config.json

## Test Checklist

Use this checklist to verify all functionality:

### Basic Tests
- [ ] App installs successfully
- [ ] App launches without crashes
- [ ] Login works correctly
- [ ] Dashboard loads
- [ ] Navigation works
- [ ] Logout works

### Feature Tests
- [ ] Buildings list displays
- [ ] Apartments list displays
- [ ] Flush operations work
- [ ] Flush history displays
- [ ] User profile loads
- [ ] Settings are accessible

### Offline Tests
- [ ] Offline mode activates automatically
- [ ] Offline banner shows
- [ ] Cached data is accessible
- [ ] Offline operations queue
- [ ] Sync on reconnection works
- [ ] No data loss offline

### UI/UX Tests
- [ ] Dark mode works
- [ ] Light mode works
- [ ] All buttons respond
- [ ] Forms work correctly
- [ ] Scrolling is smooth
- [ ] Responsive on all screen sizes

### Android-Specific Tests
- [ ] Back button works
- [ ] App lifecycle works
- [ ] Screen rotation works
- [ ] Network changes handled
- [ ] Permissions work
- [ ] No memory leaks

### Performance Tests
- [ ] App starts in < 3 seconds
- [ ] No lag during use
- [ ] Memory usage is reasonable
- [ ] Battery drain is acceptable
- [ ] Network usage is efficient

## Reporting Issues

If you find bugs or issues during testing:

1. **Check Logcat** in Android Studio:
   - View → Tool Windows → Logcat
   - Filter by package: `de.dk_automation.tws`

2. **Create GitHub Issue** with:
   - Android version (e.g., Android 13)
   - Device model (e.g., Pixel 5)
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if applicable
   - Logcat output

3. **Include Build Info**:
   - Branch: copilot/create-android-app-branch
   - Commit hash: (from `git log --oneline -1`)
   - Capacitor version: 8.0+
   - Build type: Debug or Release

## Success Criteria

The Android app is considered successfully tested when:

✅ All items in the test checklist pass  
✅ No critical bugs found  
✅ Performance is acceptable  
✅ UI/UX matches web version  
✅ Offline mode works correctly  
✅ App can be signed and released  
✅ Installation from APK works  
✅ Works on multiple Android versions (6.0+)

## Next Steps After Testing

Once testing is complete:

1. **Fix any issues** found during testing
2. **Create release keystore** for production
3. **Generate signed release APK**
4. **Test signed APK** on multiple devices
5. **Prepare Play Store listing**
6. **Create screenshots** for store listing
7. **Write release notes**
8. **Submit to Google Play** (if desired)

## Additional Resources

- [ANDROID_SETUP.md](ANDROID_SETUP.md) - Complete setup guide
- [ANDROID_QUICKSTART.md](ANDROID_QUICKSTART.md) - Quick reference
- [Android Developer Docs](https://developer.android.com/guide)
- [Capacitor Documentation](https://capacitorjs.com/docs)

---

**Happy Testing! 📱**
