#!/usr/bin/env python3
"""
Interactive dev menu for shuffle-hero-react.
Manage the Android emulator and Expo dev server, and open the app on the emulator.
"""

import os
import socket
import subprocess
import sys
import time

UNITY_SDK = "/Applications/Unity/Hub/Editor/6000.2.9f1/PlaybackEngines/AndroidPlayer/SDK"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

env = os.environ.copy()
env["ANDROID_HOME"] = UNITY_SDK
env["PATH"] = f"{UNITY_SDK}/platform-tools:{UNITY_SDK}/emulator:{env['PATH']}"
# 10.0.2.2 is the Android emulator's built-in alias for the host machine.
# Without this, Expo uses the LAN IP which the emulator can't reach.
env["REACT_NATIVE_PACKAGER_HOSTNAME"] = "10.0.2.2"


# ── state checks ──────────────────────────────────────────────────────────────

def emulator_running():
    result = subprocess.run(["adb", "devices"], env=env, capture_output=True, text=True)
    return "emulator" in result.stdout

def expo_running():
    try:
        s = socket.socket()
        s.settimeout(0.5)
        s.connect(("localhost", 8081))
        s.close()
        return True
    except OSError:
        return False


# ── actions ───────────────────────────────────────────────────────────────────

def start_emulator():
    subprocess.Popen(["emulator", "-avd", "pixel"], env=env,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(["adb", "wait-for-device"], env=env)
    print("Waiting for boot...")
    while subprocess.run(["adb", "shell", "getprop", "sys.boot_completed"],
                         env=env, capture_output=True, text=True).stdout.strip() != "1":
        time.sleep(2)

def start_expo():
    # Open Expo in a new Terminal window so it gets a proper TTY.
    # Redirecting stdout/stderr causes Expo to refuse interactive prompts.
    script = f'cd {PROJECT_ROOT} && REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2 npx expo start'
    subprocess.Popen(["osascript", "-e", f'tell app "Terminal" to do script "{script}"\ntell app "Terminal" to activate'])
    print("Waiting for Expo server...")
    while not expo_running():
        time.sleep(1)

def open_app():
    subprocess.run(
        ["adb", "shell", "am", "start", "-a", "android.intent.action.VIEW",
         "-d", "exp://10.0.2.2:8081"],
        env=env
    )

def quit_all():
    sys.exit(0)


# ── menu loop ─────────────────────────────────────────────────────────────────

def run():
    while True:
        os.system("clear")
        print("╔══════════════════════════╗")
        print("║   shuffle-hero-react     ║")
        print("╠══════════════════════════╣")

        em = emulator_running()
        ex = expo_running()
        print(f"║  Emulator:    {'RUNNING' if em else 'STOPPED ':7}     ║")
        print(f"║  Expo server: {'RUNNING' if ex else 'STOPPED ':7}     ║")
        print("╠══════════════════════════╣")

        options = []
        options.append(("Launch emulator",       start_emulator))
        options.append(("Launch Expo server",    start_expo))

        options.append(    ("Open app on emulator", open_app))
        options.append(    ("Quit",                 quit_all))

        for i, (label, _) in enumerate(options, 1):
            print(f"║  {i}. {label:<22}║")

        print("╚══════════════════════════╝")

        choice = input("\n> ").strip()
        if choice.isdigit() and 1 <= int(choice) <= len(options):
            options[int(choice) - 1][1]()

if __name__ == "__main__":
    run()
