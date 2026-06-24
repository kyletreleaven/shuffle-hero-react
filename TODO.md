# Remaining Work

---

## 1. Default view + dev mode

**Problem:** The app currently shows both ghost-note bars and animated cards simultaneously, which is visually busy and confusing for new users. The card animations are an illustration tool, not a gameplay element, and should not be on by default.

- [x] **Bars only by default** — ghost notes visible, animated cards/decks/piles suppressed unless enabled
- [x] **Bars labelled with sequence number** by default
- [x] **Animated cards hidden behind toggle** — deal/fall/stack/collect off by default
- [x] **Current deck row hidden behind toggle**
- [x] **Goal deck row hidden behind toggle**
- [x] **Animated piles hidden behind toggle**
- [x] **Reverse** — implemented as long-press on the shuffle button
- [x] **Dev/animation section in menu**
- [x] **Background image** — image behind the scroll track with adjustable transparency (Guitar Hero fretboard style); image source and opacity configurable in dev section
- [ ] **Note shape selector** — bars (default) / circles / cards (circles not yet implemented)
- [ ] **Label selector** — sequence number (default) vs. card value on bars

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

## Pre-release checklist (from device testing)

- [x] **"Stacking" status in non-animated mode** — When `animated` is false, "Stacking" has no visual meaning. Treat it as Finished for display purposes.
- [x] **Round status header color** — Use the same highlight yellow as the rest of the status row (`#e8ff00`).
- [x] **Cap bar width** — Bar notes grow with lane width; add an absolute pixel cap (e.g. 80px) so they don't become unwieldy on wide screens or with few lanes.
- [x] **Reset on parameter change** — When `numberOfLanes` or `numberOfCards` changes, reset `currentRound` to 0 and reset scroll position. The whole shuffle execution changes so there's no meaningful round to resume.
- [x] **Menu stepper buttons too small** — Increase minimum touch target height for +/-1/+/-5 buttons (44px min) and increase the displayed value font size. *(needs device test)*
- [x] **Session persistence** — All menu settings (numberOfCards, numberOfLanes, scrollSpeed, animated, faceUp, showGoalDeck) are already saved and restored via AsyncStorage.
- [x] **Menu scroll unreliable** — The dismiss overlay may be swallowing scroll gestures. Root cause: the panel was wrapped in a `TouchableOpacity` (to absorb taps and prevent dismiss), but on Android `TouchableOpacity` claims the touch responder on `onStart`, before the `ScrollView` inside it can recognise a scroll gesture. Fixed by replacing the panel `TouchableOpacity` with a plain `View` using `onStartShouldSetResponder={() => true}` (so taps still don't fall through to the backdrop) and adding `nestedScrollEnabled` to the `ScrollView` (so Android's nested scroll system works correctly). The `ScrollView` can still steal the responder from a plain `View`; it cannot steal it from a `TouchableOpacity`.
- [ ] **Flicker on round/shuffle transition** — The old permutation/round renders for one frame before the scroll reset takes effect. Batch the new round/permutation and scroll reset into a single update so they land on the same frame.
- [ ] **Round status premature** — Round ends before status reads "Finished"; status lags behind the actual state.
- [ ] **"Finished" label when more rounds remain** — If there are more rounds, show "Ready for next round" (or similar) instead of "Finished".
- [ ] **Awkward start after shuffle/round change** — Scrolling feels off after a shuffle or round transition; unclear if it's a pause or the track time being reset to a wrong initial value. Investigate.
- [x] **Timer denominator missing** — Time displays for current round and full shuffle show elapsed time only; add the denominator (e.g. "1.2s / 4.0s") so the user can see how they're tracking.
- [ ] **Menu background clipped** — Menu overlay background doesn't cover the full screen extent; positioning is off.
- [ ] **Ghost note / card placement mismatch in animation mode** — On device, ghost note bars and animated cards don't align. *(needs device test)*
- [ ] **Hide Android gesture navigation handle** — Enable edge-to-edge mode (`expo-navigation-bar` or `android.navigationBarTranslucent`) and apply bottom insets so the button bar clears the gesture zone. *(needs native build)*
- [ ] **Exit kills the app** — Verify `BackHandler.exitApp()` fully terminates the process and removes it from the recents tray on device. *(needs native build)*

## Aspirational

- [ ] **Tutorial screens** — See item 2 above.
