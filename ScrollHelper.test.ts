import { ScrollHelper, CARD_SPACING, START_PADDING_SECONDS } from './ScrollHelper';

describe('ScrollHelper', () => {
  test('cards should not jump when speed changes', () => {
    const windowHeight = 800;
    const numberOfCards = 40;

    // Create helper with initial speed
    const helper1 = new ScrollHelper(1.5, numberOfCards, windowHeight);

    // Change speed to 2.0
    const helper2 = new ScrollHelper(2.0, numberOfCards, windowHeight);

    // Check effect of speed change
    const trackTime = 4;  // speed change doesn't change it
    const cardIndex = 0;  // shouldn't matter

    expect(
      helper1.scrollY(trackTime) - helper1.cardY(cardIndex)
    ).toBeCloseTo(
      helper2.scrollY(trackTime) - helper2.cardY(cardIndex)
    );
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
