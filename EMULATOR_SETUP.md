# Android Emulator Setup (no Android Studio)

Unity's bundled SDK already includes `sdkmanager` and `avdmanager`, so you can add just the emulator and a system image (~2 GB) without installing Android Studio.

## One-time setup

**1. Set environment variables**

Add to `~/.zshrc` and `source` it (or paste into your current terminal):

```bash
export ANDROID_HOME="/Applications/Unity/Hub/Editor/6000.2.9f1/PlaybackEngines/AndroidPlayer/SDK"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/16.0/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

**2. Install the emulator and system image**

```bash
sdkmanager "platforms;android-35"
sdkmanager "system-images;android-35;google_apis;arm64-v8a"
sdkmanager "emulator"
```

Accept the license prompts with `y`. Downloads ~2 GB total.

> **Apple Silicon (M1/M2/M3):** use `arm64-v8a`. On Intel Macs use `x86_64`. Mismatching will cause a QEMU boot failure.
> Install `platforms` before the system image — installing them together can cause a "path not valid" error.

**3. Create a virtual device**

```bash
avdmanager create avd -n pixel -k "system-images;android-35;google_apis;arm64-v8a" --device "pixel"
```

**4. Install Expo Go on the emulator**

This project uses SDK 54, which requires **Expo Go 54.0.8**. The version must match the SDK or the dev server will refuse to connect.

Start the emulator first (`emulator -avd pixel`), wait for it to boot, then:

```bash
mkdir -p tools
curl -L "https://github.com/expo/expo-go-releases/releases/download/Expo-Go-54.0.8/Expo-Go-54.0.8.apk" -o tools/expo-go.apk
adb install tools/expo-go.apk
```

This only needs to be done once — Expo Go persists on the AVD's disk image.

## Running the app with auto-reload

```bash
python3 scripts/dev.py
```

This opens an interactive menu showing the state of the emulator and Expo server. From the menu:

1. **Launch emulator** — boots the AVD, waits until ready
2. **Launch Expo server** — opens Expo in a new Terminal window (needs its own TTY)
3. **Open app on emulator** — sends the `exp://` URL directly to the emulator via adb

Close the emulator window or Expo terminal to stop them — no cleanup needed from the menu.

> Expo's built-in "press `a`" doesn't work here — it uses your LAN IP which the emulator can't reach. The menu bypasses it by sending the URL directly.

Once the app is open, Expo's Fast Refresh pushes code changes to the emulator automatically. No manual rebuild needed for JS/TS changes.

## Subsequent runs

Just run `python3 scripts/dev.py` — the one-time setup above doesn't need to be repeated.

---

## Appendix: AVD execution model

An AVD is a VM. The relationship between the pieces:

- **System image** — the Android OS, installed once via `sdkmanager`, shared across AVDs. Lives in `$ANDROID_HOME/system-images/`.
- **AVD** — a named configuration + disk image created from a system image. Lives in `~/.android/avd/<name>.avd/`. Persists on disk indefinitely; apps and settings survive reboots.
- **Emulator process** — the running VM. The device only exists while this process is up. Closing the window (or Ctrl+C) shuts it down. Nothing runs in the background between sessions.

**Listing AVDs:**
```bash
avdmanager list avd
```

**Deleting an AVD** (frees the disk image, ~a few hundred MB):
```bash
avdmanager delete avd -n pixel
```

**Uninstalling the system image** (frees ~1.5 GB):
```bash
sdkmanager --uninstall "system-images;android-35;google_apis;arm64-v8a"
```
