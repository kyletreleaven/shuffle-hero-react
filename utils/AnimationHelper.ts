import { ScrollHelper } from '../ScrollHelper';

export type CardPosition = {
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
  zIndex?: number;
};

export type AnimationPhase = 'deal' | 'stack' | 'collect';

export type AnimationState = {
  phase: AnimationPhase;
  progress: number; // 0-1 within the current phase
};

export type Shuffle = {
  rounds: number[][];
  seqs: number[][];
};

/**
 * Calculate which animation phase we're in and the progress within that phase
 */
export function calculateAnimationState(
  trackTime: number,
  currentRound: number,
  scrollHelper: ScrollHelper
): AnimationState {
  const roundStartTime = scrollHelper.minTime + currentRound * scrollHelper.timePerRound;
  const roundProgress = (trackTime - roundStartTime) / scrollHelper.timePerRound;
  const progress = Math.max(0, Math.min(1, roundProgress));

  let phase: AnimationPhase;
  let phaseProgress: number;

  if (progress < 0.4) {
    // Deal phase: 0.0 - 0.4
    phase = 'deal';
    phaseProgress = progress / 0.4;
  } else if (progress < 0.5) {
    // Stack phase: 0.4 - 0.5
    phase = 'stack';
    phaseProgress = (progress - 0.4) / 0.1;
  } else {
    // Collect phase: 0.5 - 1.0
    phase = 'collect';
    phaseProgress = (progress - 0.5) / 0.5;
  }

  return { phase, progress: phaseProgress };
}

/**
 * Calculate the x-positions for each pile, aligned with the track view lanes
 */
export function calculatePilePositions(numberOfPiles: number, containerWidth: number): number[] {
  // Each pile should align with the center of its corresponding lane in the track view
  const laneWidth = containerWidth / numberOfPiles;

  return Array.from({ length: numberOfPiles }, (_, i) => {
    // Center of lane i
    return i * laneWidth + laneWidth / 2;
  });
}

/**
 * Get the position of a card in the source sequence (before dealing)
 */
export function getSourcePosition(
  cardIndex: number,
  totalCards: number,
  containerWidth: number,
  containerHeight: number
): CardPosition {
  const padding = 20;
  const cardWidth = 40;
  const cardHeight = 60;
  const cardSpacing = 2;

  // Calculate how many cards fit in one row
  const availableWidth = containerWidth - 2 * padding;
  const cardsPerRow = Math.floor(availableWidth / (cardWidth + cardSpacing));

  // If cards don't fit in one row, arrange in multiple rows
  if (totalCards > cardsPerRow) {
    const row = Math.floor(cardIndex / cardsPerRow);
    const col = cardIndex % cardsPerRow;
    const rowWidth = cardsPerRow * (cardWidth + cardSpacing);
    const startX = (containerWidth - rowWidth) / 2;

    return {
      x: startX + col * (cardWidth + cardSpacing),
      y: containerHeight - padding - cardHeight - row * (cardHeight + 10), // Stack rows upward
      rotation: 0,
      scale: 1,
    };
  }

  // Single row - center the cards horizontally
  const totalWidth = totalCards * (cardWidth + cardSpacing) - cardSpacing; // Don't count spacing after last card
  const startX = (containerWidth - totalWidth) / 2;

  return {
    x: startX + cardIndex * (cardWidth + cardSpacing),
    y: containerHeight - padding - cardHeight,
    rotation: 0,
    scale: 1,
  };
}

/**
 * Get the position of a card in a pile
 */
export function getPilePosition(
  pileIndex: number,
  cardIndexInPile: number,
  totalPiles: number,
  containerWidth: number,
  containerHeight: number,
  stackOffset: number = 5
): CardPosition {
  const pilePositions = calculatePilePositions(totalPiles, containerWidth);
  const pileX = pilePositions[pileIndex];

  // Vertical offset per card in the pile (tunable)
  const baseY = containerHeight / 2 - 30;

  return {
    x: pileX - 20, // Center the card (card width is 40px)
    y: baseY - cardIndexInPile * stackOffset, // Stack upward (top card has highest index)
    rotation: 0,
    scale: 1,
  };
}

/**
 * Interpolate between two positions
 */
export function interpolatePosition(
  from: CardPosition,
  to: CardPosition,
  progress: number,
  addRotation: boolean = false
): CardPosition {
  // Easing function: ease-out cubic
  const t = 1 - Math.pow(1 - progress, 3);

  // Add subtle rotation during movement for realism
  let midRotation = 0;
  if (addRotation && progress > 0 && progress < 1) {
    // Peak rotation at middle of movement
    const rotationProgress = Math.sin(progress * Math.PI);
    midRotation = rotationProgress * 3; // Max 3 degrees rotation
  }

  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    rotation: (from.rotation || 0) + ((to.rotation || 0) - (from.rotation || 0)) * t + midRotation,
    scale: (from.scale || 1) + ((to.scale || 1) - (from.scale || 1)) * t,
  };
}

/**
 * Calculate the position for a card based on the current time in the round
 * Cards are dealt one at a time, synchronized with notes reaching the beat line
 */
export function calculateCardPosition(
  faceValue: number,
  shuffle: Shuffle,
  currentRound: number,
  trackTime: number,
  scrollHelper: ScrollHelper,
  containerWidth: number,
  containerHeight: number,
  numberOfPiles: number,
  stackOffset: number = 5
): CardPosition {
  const sequence = shuffle.seqs[currentRound];
  const totalCards = sequence.length;

  // Find this card's position in the dealing sequence
  const positionInSequence = sequence.indexOf(faceValue);

  if (positionInSequence === -1) {
    // Card not in this round's sequence (shouldn't happen)
    return getSourcePosition(0, totalCards, containerWidth, containerHeight);
  }

  // Calculate when this card should be dealt
  // Card i is dealt when note i reaches the beat line (middle of viewport)
  const roundStartTime = scrollHelper.minTime + currentRound * scrollHelper.timePerRound;

  // The beat line is at the vertical middle of the viewport
  // Card at position cardY(i) reaches beat line when: cardY(i) - scrollY = windowHeight / 2
  // So: scrollY = cardY(i) - windowHeight / 2
  // And: trackTime = (scrollYBias - scrollY) / scrollPixelsPerSec
  const cardYPosition = scrollHelper.cardY(positionInSequence);
  const beatLineOffset = scrollHelper.windowHeight / 2;
  const scrollYAtBeatLine = cardYPosition - beatLineOffset;
  const cardBeatLineTime = scrollHelper.trackTime(scrollYAtBeatLine);

  // Offset by the round
  const cardDealTime = cardBeatLineTime + currentRound * scrollHelper.timePerRound;

  // Duration for a single card's deal animation
  const dealDuration = scrollHelper.timePerRound / (totalCards * 2); // Each card animates for half the time to next card
  const cardDealStartTime = cardDealTime - dealDuration;

  // Get source and target positions
  const sourcePos = getSourcePosition(positionInSequence, totalCards, containerWidth, containerHeight);

  // Which pile does this card go to?
  const pileIndex = shuffle.rounds[currentRound][faceValue];

  // How many cards are already in this pile (dealt before this card)?
  let cardIndexInPile = 0;
  for (let i = 0; i < positionInSequence; i++) {
    const otherFaceValue = sequence[i];
    if (shuffle.rounds[currentRound][otherFaceValue] === pileIndex) {
      cardIndexInPile++;
    }
  }

  const pilePos = getPilePosition(pileIndex, cardIndexInPile, numberOfPiles, containerWidth, containerHeight, stackOffset);

  // Set zIndex based on dealing order - later cards appear on top
  const baseZIndex = positionInSequence;

  // Determine card state based on current time
  if (trackTime < cardDealStartTime) {
    // Card hasn't started dealing yet - stay in source position
    return { ...sourcePos, zIndex: baseZIndex };
  } else if (trackTime < cardDealTime) {
    // Card is currently being dealt - interpolate
    const dealProgress = (trackTime - cardDealStartTime) / dealDuration;
    return { ...interpolatePosition(sourcePos, pilePos, Math.min(1, dealProgress), true), zIndex: baseZIndex };
  } else {
    // Card has been dealt - stay in pile position
    return { ...pilePos, zIndex: baseZIndex };
  }
}
