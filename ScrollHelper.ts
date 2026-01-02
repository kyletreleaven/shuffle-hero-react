export const CARD_SPACING = 150; // Vertical spacing between cards
export const START_PADDING_SECONDS = 2; // Seconds of track at bottom

export class ScrollHelper {

  readonly scrollPixelsPerSec: number;
  readonly startPaddingPixels: number;
  readonly contentHeight: number;
  readonly endPaddingPixels: number;
  readonly contentStartSec: number;
  readonly scrollYBias: number;

  public readonly trackHeight: number;
  public readonly minTime: number;
  public readonly maxTime: number;
  public readonly timePerRound: number;

  constructor(
    public readonly scrollCardsPerSec: number,
    public readonly numberOfCards: number,
    public readonly windowHeight: number,
  ) {
    this.scrollPixelsPerSec = scrollCardsPerSec * CARD_SPACING;

    this.startPaddingPixels = START_PADDING_SECONDS * this.scrollPixelsPerSec;
    this.contentHeight = CARD_SPACING * (numberOfCards - 1);
    this.endPaddingPixels = windowHeight;
    this.trackHeight = this.startPaddingPixels + this.contentHeight + this.endPaddingPixels;

    this.contentStartSec = 0;
    this.minTime = this.contentStartSec - START_PADDING_SECONDS;
    this.timePerRound = (this.trackHeight - windowHeight) / this.scrollPixelsPerSec;
    this.maxTime = this.minTime + this.timePerRound;

    this.scrollYBias = this.trackHeight - this.startPaddingPixels - this.windowHeight;
  }

  get deps() { return [this.scrollCardsPerSec, this.numberOfCards, this.windowHeight]; }

  cardY(cardIndex: number): number {
    return this.trackHeight - this.startPaddingPixels - cardIndex * CARD_SPACING;
  }

  scrollY(trackTime: number): number {
    return this.scrollYBias - trackTime * this.scrollPixelsPerSec;
  }

  trackTime(scrollY: number): number {
    return (this.scrollYBias - scrollY) / this.scrollPixelsPerSec;
  }
}
