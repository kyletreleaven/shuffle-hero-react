# 🚀 Quick Start Guide

## Test the App Right Now

```bash
# Install dependencies
npm install

# Run on web (easiest!)
npm run web
# Opens at http://localhost:19006

# OR run on Android (requires device/emulator)
npm run android
```

---

## 🌐 Build for Web Embedding

```bash
# 1. Build
npm run build:web

# 2. Test locally
npx serve dist -l 8080

# 3. Deploy dist/ folder to:
# - Netlify (drag & drop)
# - Vercel (vercel --prod)
# - Your server
# - GitHub Pages

# 4. Embed in your website:
```

```html
<iframe
  src="https://your-deployed-url.com"
  width="100%"
  height="600px"
  style="border: none;">
</iframe>
```

See `embed-example.html` for a complete example!

---

## 📱 Build Android APK

### Option A: Cloud Build (Easiest)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Build APK
eas build --platform android --profile production

# 4. Download from the link provided
```

### Option B: Local Build

```bash
# 1. Make sure you have Android SDK installed
# 2. Generate signing key (first time only)
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore shuffle-hero.keystore \
  -alias shuffle-hero-key -keyalg RSA -keysize 2048 -validity 10000

# 3. Configure signing (see BUILD_AND_DEPLOY.md for details)

# 4. Build
npm run build:android

# 5. Find APK at:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📖 Full Documentation

For detailed instructions, troubleshooting, and Google Play Store deployment:

👉 **See [BUILD_AND_DEPLOY.md](./BUILD_AND_DEPLOY.md)**

---

## ⚙️ Change App Settings

The app is configurable! Edit these constants in `App.tsx`:

```typescript
const LANE_COUNT = 4;        // Number of lanes (4-7)
const NOTE_COUNT = 50;       // Number of cards
const SCROLL_SPEED = 1.5;    // Cards per second
const SHOW_DEBUG_HUD = false; // Show debug info
```

Users can also adjust settings via the menu (≡ button) in the app.

---

## 🎮 How to Play

1. **Touch a lane** when a note reaches the bottom
2. **Hold** to track continuous sequences
3. Open the **menu (≡)** to configure:
   - Number of cards
   - Number of lanes
   - Scroll speed
4. Perfect for practicing card shuffles and sequences!

---

## ❓ Need Help?

- **Web not loading?** Check browser console for errors
- **Android build failing?** See BUILD_AND_DEPLOY.md troubleshooting
- **Want to customize?** All game logic is in `App.tsx` and `ShuffleUtil.ts`
