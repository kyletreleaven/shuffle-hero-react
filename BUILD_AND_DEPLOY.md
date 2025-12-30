# Shuffle Hero - Build & Deployment Guide

This guide covers building and deploying Shuffle Hero for both **Web** and **Android** platforms.

---

## 🌐 Web Deployment (For Embedding)

### Option 1: Build with Expo (Recommended)

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Build for web**:
   ```bash
   npm run build:web
   ```

   This creates an optimized web build in the `dist/` directory.

3. **Test locally** (optional):
   ```bash
   npx serve dist -l 8080
   ```

   Open http://localhost:8080 in your browser to test.

4. **Deploy the `dist/` folder** to any static hosting service:
   - **Netlify**: Drag & drop the `dist` folder or connect your Git repo
   - **Vercel**: `vercel --prod` (install with `npm i -g vercel`)
   - **GitHub Pages**: Push `dist` contents to `gh-pages` branch
   - **Firebase Hosting**: `firebase deploy` (after `firebase init`)
   - **Your own server**: Copy `dist/` to your web server's public directory

### Embedding in a Website

Once deployed, embed using an iframe:

```html
<iframe
  src="https://your-deployed-url.com"
  width="100%"
  height="600px"
  frameborder="0"
  allow="accelerometer; gyroscope"
  style="border: none; border-radius: 8px;"
></iframe>
```

**Tips for embedding:**
- Use `width="100%"` and set a fixed `height` (recommended: 600-800px)
- The app is landscape-optimized, so wider is better
- For full-screen embedding, use `height="100vh"`
- Consider adding a minimum width: `style="min-width: 800px"`

---

## 📱 Android Deployment

### Prerequisites

- **Java JDK** (version 17 or higher)
- **Android SDK** (installed via Android Studio or sdkmanager)
- **Expo CLI**: `npm install -g expo-cli` (if not already installed)
- **EAS CLI** (optional, for cloud builds): `npm install -g eas-cli`

---

### Method 1: EAS Build (Cloud Build - Easiest)

**Best for:** Quick builds without local Android setup.

1. **Install EAS CLI** (if not already):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure the project** (first time only):
   ```bash
   eas build:configure
   ```

4. **Build APK** (for direct download):
   ```bash
   eas build --platform android --profile production
   ```

5. **Build AAB** (for Google Play Store):
   ```bash
   eas build --platform android --profile production-aab
   ```

6. **Download the build**:
   - The build link will appear in the terminal
   - Or visit: https://expo.dev/accounts/[your-account]/projects/shuffle-hero-react/builds

---

### Method 2: Local Build (Full Control)

**Best for:** Custom builds, faster iteration, no cloud dependency.

1. **Ensure Android SDK is installed**:
   ```bash
   echo $ANDROID_HOME  # Should point to your SDK location
   ```

2. **Generate a signing key** (required for release builds):
   ```bash
   cd android/app
   keytool -genkeypair -v -storetype PKCS12 -keystore shuffle-hero.keystore \
     -alias shuffle-hero-key -keyalg RSA -keysize 2048 -validity 10000
   ```

   **Remember your passwords!** You'll need them later.

3. **Configure signing** by creating `android/gradle.properties`:
   ```properties
   SHUFFLE_HERO_UPLOAD_STORE_FILE=shuffle-hero.keystore
   SHUFFLE_HERO_UPLOAD_KEY_ALIAS=shuffle-hero-key
   SHUFFLE_HERO_UPLOAD_STORE_PASSWORD=your_keystore_password
   SHUFFLE_HERO_UPLOAD_KEY_PASSWORD=your_key_password
   ```

4. **Update `android/app/build.gradle`** to use the signing config:

   Add inside `android { ... }`:
   ```gradle
   signingConfigs {
       release {
           if (project.hasProperty('SHUFFLE_HERO_UPLOAD_STORE_FILE')) {
               storeFile file(SHUFFLE_HERO_UPLOAD_STORE_FILE)
               storePassword SHUFFLE_HERO_UPLOAD_STORE_PASSWORD
               keyAlias SHUFFLE_HERO_UPLOAD_KEY_ALIAS
               keyPassword SHUFFLE_HERO_UPLOAD_KEY_PASSWORD
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           // ... (existing config)
       }
   }
   ```

5. **Build APK**:
   ```bash
   npm run build:android
   ```

   Output: `android/app/build/outputs/apk/release/app-release.apk`

6. **Build AAB** (for Play Store):
   ```bash
   npm run build:android:bundle
   ```

   Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 📦 Distribution

### For Direct APK Download

1. Upload the APK to:
   - Your website's download page
   - GitHub Releases
   - Google Drive / Dropbox (with public link)

2. Users will need to:
   - Enable "Install from Unknown Sources" in Android settings
   - Download and tap the APK to install

### For Google Play Store

1. **Create a Google Play Console account**: https://play.google.com/console
2. **Create a new app** in the console
3. **Upload the AAB** (not APK) to the "Production" or "Internal Testing" track
4. **Fill out store listing** (description, screenshots, etc.)
5. **Submit for review**

**Note:** Play Store requires:
- Privacy policy URL
- App icon (1024x1024px)
- Feature graphic (1024x500px)
- Screenshots (minimum 2)

---

## 🔄 Updating Version Numbers

Before each release, update:

1. **`package.json`**:
   ```json
   "version": "1.0.1"
   ```

2. **`app.json`**:
   ```json
   {
     "expo": {
       "version": "1.0.1",
       "android": {
         "versionCode": 2
       }
     }
   }
   ```

**Important:**
- `versionCode` must increase by at least 1 for each Play Store update (can't reuse)
- `version` is the user-facing version string (can be anything)

---

## 🧪 Testing

### Web Testing
```bash
npm run web
```
Open http://localhost:19006 in your browser.

### Android Testing
```bash
npm run android
```
Requires an Android device/emulator connected.

---

## 🔧 Troubleshooting

### Web Build Issues

**"Module not found" errors:**
```bash
rm -rf node_modules .expo dist
npm install
npm run build:web
```

**Blank page after deploy:**
- Check browser console for errors
- Ensure all assets are loading (check Network tab)
- Try clearing cache: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

### Android Build Issues

**"SDK location not found":**
```bash
export ANDROID_HOME=/path/to/android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
```

**Build fails with Gradle errors:**
```bash
cd android
./gradlew clean
cd ..
npm run build:android
```

**"Execution failed for task ':app:packageRelease'":**
- Ensure your signing key is properly configured
- Check that passwords in `gradle.properties` are correct

---

## 📊 Build Comparison

| Method | Best For | Build Time | Requirements |
|--------|----------|------------|--------------|
| EAS Build (APK) | Quick testing | 5-15 min | Expo account |
| EAS Build (AAB) | Play Store | 5-15 min | Expo account |
| Local Build (APK) | Development/Testing | 2-5 min | Android SDK |
| Local Build (AAB) | Play Store upload | 2-5 min | Android SDK + Signing |

---

## 🚀 Quick Commands Cheat Sheet

```bash
# Web
npm run web                    # Start dev server
npm run build:web              # Build for production
npx serve dist -l 8080         # Test production build

# Android
npm run android                # Start dev build on device/emulator
npm run build:android          # Build release APK locally
npm run build:android:bundle   # Build release AAB locally
eas build -p android           # Build with EAS (cloud)

# General
npm start                      # Start Expo dev server (choose platform)
```

---

## 📝 Next Steps

1. **Customize package name**: Change `com.anonymous.shuffleheroreact` in `app.json` to your domain (e.g., `com.yourname.shufflehero`)
2. **Update app icons**: Replace files in `assets/` with your branding
3. **Add privacy policy**: Required for Play Store distribution
4. **Set up analytics** (optional): Firebase, Amplitude, or Expo Analytics

For questions or issues, check:
- Expo docs: https://docs.expo.dev
- React Native docs: https://reactnative.dev
