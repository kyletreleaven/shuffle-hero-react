# shuffle-hero-react

React Native / Expo app targeting Android (and web).

## Android SDK

The Android SDK is not installed at the default path (`~/Library/Android/sdk`). Set `ANDROID_HOME` to wherever the SDK lives on your machine before running Android commands.

**On ktreleav's Mac** — use the copy bundled with Unity:

```bash
export ANDROID_HOME="/Applications/Unity/Hub/Editor/6000.2.9f1/PlaybackEngines/AndroidPlayer/SDK"
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

On other machines, install Android Studio (which puts the SDK at the default path) or point `ANDROID_HOME` at an existing SDK install.

## Running the app

| Command | What it does |
|---|---|
| `npm run android` | Start on connected Android device/emulator |
| `npm run web` | Start in browser at http://localhost:19006 (no Android SDK needed) |
| `npm test` | Run Jest unit tests |
| `npm run build:android` | Build release APK locally |

See `QUICK_START.md` and `BUILD_AND_DEPLOY.md` for more detail.
