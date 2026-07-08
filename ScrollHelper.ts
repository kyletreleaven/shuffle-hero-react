export const BASE_CARD_SPACING = 150; // Vertical spacing between cards at base scale
export const LEAD_IN_SECONDS = 2;     // Tunable: seconds before first card reaches zero (bottom of screen)
export const CLIP_LEAD_IN_TO_SCREEN = true; // If true, first card never starts below the top of screen

export class ScrollHelper {

  readonly scrollPixelsPerSec: number;
  readonly startPaddingPixels: number;
  readonly contentHeight: number;
  readonly endPaddingPixels: number;
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
    public readonly cardHeight: number = 0,
  ) {
    this.scrollPixelsPerSec = scrollCardsPerSec * cardSpacing;

    const leadInPixels = LEAD_IN_SECONDS * this.scrollPixelsPerSec;
    this.startPaddingPixels = CLIP_LEAD_IN_TO_SCREEN
      ? Math.max(windowHeight + cardHeight, leadInPixels)
      : leadInPixels;
    this.contentHeight = cardSpacing * (numberOfCards - 1);
    this.endPaddingPixels = windowHeight;
    this.trackHeight = this.startPaddingPixels + this.contentHeight + this.endPaddingPixels;

    this.minTime = -this.startPaddingPixels / this.scrollPixelsPerSec;
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
