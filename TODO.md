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
