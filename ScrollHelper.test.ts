import { ScrollHelper, CARD_SPACING, START_PADDING_SECONDS } from './ScrollHelper';

describe('ScrollHelper', () => {
  test('cards should not jump when speed changes', () => {
    const windowHeight = 800;
    const numberOfCards = 40;

    // Create helper with initial speed
    const helper1 = new ScrollHelper(1.5, numberOfCards, windowHeight);
    const trackTime1 = 5.0; // arbitrary time position

    // Calculate positions with speed 1
    const scrollY1 = helper1.scrollY(trackTime1);
    const cardScreenPositions1 = [0, 10, 20, 30].map(i =>
      helper1.cardY(i) - scrollY1
    );

    // Change speed to 2.0
    const helper2 = new ScrollHelper(2.0, numberOfCards, windowHeight);

    // Calculate new trackTime that maintains the invariant:
    // trackTime1 * scrollPixelsPerSec1 = trackTime2 * scrollPixelsPerSec2
    const trackTime2 = trackTime1 * helper1.scrollPixelsPerSec / helper2.scrollPixelsPerSec;

    // Calculate positions with new speed
    const scrollY2 = helper2.scrollY(trackTime2);
    const cardScreenPositions2 = [0, 10, 20, 30].map(i =>
      helper2.cardY(i) - scrollY2
    );

    // Verify cards haven't jumped
    cardScreenPositions1.forEach((pos1, idx) => {
      expect(cardScreenPositions2[idx]).toBeCloseTo(pos1, 5);
    });
  });

  test('trackTime * scrollPixelsPerSec stays constant when speed changes', () => {
    const windowHeight = 800;
    const numberOfCards = 40;

    const helper1 = new ScrollHelper(1.5, numberOfCards, windowHeight);
    const trackTime1 = 5.0;

    const distance1 = trackTime1 * helper1.scrollPixelsPerSec;

    // Change speed
    const helper2 = new ScrollHelper(2.0, numberOfCards, windowHeight);
    const trackTime2 = trackTime1 * helper1.scrollPixelsPerSec / helper2.scrollPixelsPerSec;

    const distance2 = trackTime2 * helper2.scrollPixelsPerSec;

    // Verify the invariant
    expect(distance2).toBeCloseTo(distance1, 5);
  });

  test('round-trip conversion: scrollY -> trackTime -> scrollY', () => {
    const helper = new ScrollHelper(1.5, 40, 800);
    const originalScrollY = 3000;

    const trackTime = helper.trackTime(originalScrollY);
    const recoveredScrollY = helper.scrollY(trackTime);

    expect(recoveredScrollY).toBeCloseTo(originalScrollY, 5);
  });

  test('round-trip conversion: trackTime -> scrollY -> trackTime', () => {
    const helper = new ScrollHelper(1.5, 40, 800);
    const originalTrackTime = 5.0;

    const scrollY = helper.scrollY(originalTrackTime);
    const recoveredTrackTime = helper.trackTime(scrollY);

    expect(recoveredTrackTime).toBeCloseTo(originalTrackTime, 5);
  });
});
