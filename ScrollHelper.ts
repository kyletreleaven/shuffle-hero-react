export const BASE_CARD_SPACING = 150; // Vertical spacing between cards at base scale
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
    public readonly cardSpacing: number = BASE_CARD_SPACING,
  ) {
    this.scrollPixelsPerSec = scrollCardsPerSec * cardSpacing;

    this.startPaddingPixels = windowHeight;
    this.contentHeight = cardSpacing * (numberOfCards - 1);
    this.endPaddingPixels = windowHeight;
    this.trackHeight = this.startPaddingPixels + this.contentHeight + this.endPaddingPixels;

    this.contentStartSec = 0;
    this.minTime = this.contentStartSec - windowHeight / this.scrollPixelsPerSec;
    this.timePerRound = (this.trackHeight - windowHeight) / this.scrollPixelsPerSec;
    this.maxTime = this.minTime + this.timePerRound;

    this.scrollYBias = this.trackHeight - this.startPaddingPixels - this.windowHeight;
  }

  get deps() { return [this.scrollCardsPerSec, this.numberOfCards, this.windowHeight, this.cardSpacing]; }

  cardY(cardIndex: number): number {
    return this.trackHeight - this.startPaddingPixels - cardIndex * this.cardSpacing;
  }

  scrollY(trackTime: number): number {
    return this.scrollYBias - trackTime * this.scrollPixelsPerSec;
  }

  clampScrollY(scrollY: number): number {
    return Math.min(Math.max(0, scrollY), this.trackHeight - this.windowHeight);
  }

  get initialScrollY() {
    return this.scrollY(this.minTime);
  }

  trackTime(scrollY: number): number {
    return (this.scrollYBias - scrollY) / this.scrollPixelsPerSec;
  }
}
