# Remaining Work

---

## 1. Default view + dev mode

**Problem:** The app currently shows both ghost-note bars and animated cards simultaneously, which is visually busy and confusing for new users. The card animations are an illustration tool, not a gameplay element, and should not be on by default.

**Current state:**
- Ghost notes (bars): dashed outline rectangles on the scroll track, labelled with sequence number (`note.id + 1`), always visible — App.tsx:984-999
- Animated cards: solid colored rectangles that deal/fall/stack/collect, showing card values (`permutation[faceValue] + 1`) — App.tsx:1035-1050
- Both render simultaneously with no toggle

**Desired default:**
- Bars only (ghost notes visible, everything else suppressed)
- Bars labelled with sequence number
- Note shape: Guitar Hero-style bars (current dashed rectangles)

**Features hidden behind dev mode** (off by default):
- Animated cards (deal/fall/stack/collect)
- Current deck row
- Goal deck row
- Animated piles
- Reverse button

**Dev section in menu** (collapsed or at the bottom):
- **Note shape:** bars (default) / circles / cards
  - Circles are not yet implemented — need a new render branch in the ghost note section
- **Animations:** toggle the full card animation system on/off (animated cards, decks, piles)
- **Label:** sequence number (default) vs. card value on bars
- **Reverse:** expose the reverse button when enabled

**Also:** Background image behind the scroll track with adjustable transparency, so an image shows through the lanes (like the fretboard inlays in Guitar Hero). Image source and opacity should be configurable, probably also in the dev section.

---

## 2. Tutorial / illustration mode

**Problem:** The falling bars are abstract. A new user doesn't know they represent a riffle shuffle dealing cards to piles. The card animations were meant to illustrate this, but they don't belong in normal gameplay.

**Desired end state:**
- A dedicated illustration/tutorial mode, separate from normal gameplay
- Split-view panel: falling bars on one side, overhead view of a hand dealing cards to piles on the other
- Overhead view synced to the same scroll position / track time as the bars
- Teaches the user what each bar represents before they start practicing

**Note:** This is the largest and least-defined item. Design needs more thought before implementation — specifically the overhead-view animation and how tutorial progression works. Treat this as exploratory until the design is clearer.

---

## 3. Responsive layout

**Problem:** All layout constants are hardcoded (`CARD_WIDTH=40`, `CARD_HEIGHT=60`, `CARD_SPACING=150`, deck/stack row heights fixed in px). On a phone emulator, buttons and text are too large relative to the screen. On a wide web viewport, cards are too small and spacing feels wrong.

**Desired end state:**
- Derive a `scale` factor from `windowDimensions` at runtime (e.g. `min(width / BASE_WIDTH, height / BASE_HEIGHT)`)
- Apply `scale` to: card width/height, card spacing, font sizes, deck and stack row heights
- Constants move from module-level to values computed inside the component (or a dedicated hook)
- `ScrollHelper` currently uses hardcoded `CARD_SPACING` — refactor to accept it as a parameter so it stays in sync with the scaled value

**Targets:** phone (small screen, high density), Android emulator (large resolution), web (variable viewport width).


---

## Pre-release fixes (from device testing)

These are bugs and polish items found on a real phone. Address before release.

### P1 – Session persistence

**Problem:** It's unclear which settings survive an app restart. On every launch the user has to re-enter their number of cards, piles, speed, and animation preference.

**Desired:** All menu settings persist between sessions: number of cards, number of piles, scroll speed, and the three checkboxes (Animated, Show card values, Show goal deck). Audit what `AsyncStorage` currently saves and fill the gaps.

---

### P1 – Round clamping when piles change

**Problem:** If the user is on round 3 of a 3-pile shuffle and then reduces to 2 piles, the number of rounds drops and `currentRound` can exceed the new maximum, causing an invalid state.

**Fix:** When `numberOfLanes` or `numberOfCards` changes, reset `currentRound` to 0 and reset scroll position — the whole shuffle execution changes so there's no meaningful round to resume.

---

### P1 – Flicker on round/shuffle transition

**Problem:** When switching rounds or reshuffling, the scroll position resets but the old permutation/round data renders for one frame first, causing a visible flash.

**Fix:** Ensure the new permutation/round and the scroll reset are applied atomically before the next render — either batch into a single `setState` call or suppress rendering for one frame during the transition.

---

### P2 – "Stacking" status invalid in non-animated mode

**Problem:** The round status header can display "Stacking" even when `animated` is off, which has no meaning without the card animation.

**Fix:** When `animated` is false, omit the Stacking state from the status label — treat it the same as Finished for display purposes.

---

### P2 – Round status header color

**Problem:** The round header uses a different color than the yellow accent used elsewhere in the status row.

**Fix:** Apply the same highlight yellow (`#e8ff00` or the `remainingValue` style color) to the round status text to make it consistent.

---

### P2 – Cap bar width on wide screens

**Problem:** In non-animated mode, bar notes are sized as a percentage of lane width, so on a wide viewport or with few lanes they can become uncomfortably wide.

**Fix:** Add an absolute pixel cap (e.g. `Math.min(barWidth, 80)`) so bars never exceed a reasonable maximum width regardless of lane count or screen size.

---

### P2 – Menu stepper buttons too small on device

**Problem:** The +/-1 and +/-5 increment buttons in the menu are difficult to tap accurately on a phone. The number-of-cards display font is also too small to read at a glance.

**Fix:** Increase the minimum touch target size for stepper buttons (min 44px height), and increase the displayed value font size so it's readable without squinting.

---

### P2 – Menu scroll unreliable on device

**Problem:** The menu `ScrollView` is sometimes hard to scroll — touch gestures are intercepted by the dismiss-overlay `TouchableOpacity` underneath.

**Fix:** Investigate whether the overlay's touch handler is swallowing scroll gestures. May need `pointerEvents` or a `ScrollView` touch propagation fix.

---

### P3 – Hide Android gesture navigation handle

**Problem:** The system gesture handle bar is visible at the bottom of the screen and overlaps the button bar, wasting space and looking unpolished.

**Fix:** Enable edge-to-edge mode in the Expo/Android config (`android.navigationBarTranslucent` or `expo-navigation-bar`) and apply appropriate bottom insets so the button bar sits above the gesture zone.

---

### P3 – Exit button should kill the app

**Problem:** On device, the Exit button (`BackHandler.exitApp()`) may not fully terminate the app — it can remain in the Android recents tray.

**Fix:** Verify `BackHandler.exitApp()` actually kills the process on the Pixel target. If not, use `RNExitApp` or an equivalent that calls `System.exit(0)` on Android.

---

### Aspirational – Tutorial screens

See item 2 above. Not a blocker for initial release but needed shortly after.## Pre-release checklist (from device testing)

- [ ] **Session persistence** — Audit what `AsyncStorage` currently saves and ensure all menu settings survive an app restart: number of cards, number of piles, scroll speed, Animated, Show card values, Show goal deck.
- [ ] **Reset on parameter change** — When `numberOfLanes` or `numberOfCards` changes, reset `currentRound` to 0 and reset scroll position. The whole shuffle execution changes so there's no meaningful round to resume.
- [ ] **Flicker on round/shuffle transition** — The old permutation/round renders for one frame before the scroll reset takes effect. Batch the new round/permutation and scroll reset into a single update so they land on the same frame.
- [ ] **"Stacking" status in non-animated mode** — When `animated` is false, "Stacking" has no visual meaning. Treat it as Finished for display purposes.
- [ ] **Round status header color** — Use the same highlight yellow as the rest of the status row (`#e8ff00`).
- [ ] **Cap bar width** — Bar notes grow with lane width; add an absolute pixel cap (e.g. 80px) so they don't become unwieldy on wide screens or with few lanes.
- [ ] **Menu stepper buttons too small** — Increase minimum touch target height for +/-1/+/-5 buttons (44px min) and increase the displayed value font size.
- [ ] **Menu scroll unreliable** — The dismiss overlay may be swallowing scroll gestures. Investigate `pointerEvents` or touch propagation fix on the `ScrollView`.
- [ ] **Hide Android gesture navigation handle** — Enable edge-to-edge mode (`expo-navigation-bar` or `android.navigationBarTranslucent`) and apply bottom insets so the button bar clears the gesture zone.
- [ ] **Exit kills the app** — Verify `BackHandler.exitApp()` fully terminates the process and removes it from the recents tray on device. Switch to `System.exit(0)` via a native module if needed.

## Aspirational

- [ ] **Tutorial screens** — See item 2 above.
