import { ScrollHelper } from '../ScrollHelper';

export type CardPosition = {
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
  zIndex?: number;
};

/**
 * Function type for calculating a card's centerline x position in the remaining (undealt) deck.
 * @param i - Index of the card in the remaining deck (0 = leftmost/next to deal)
 * @param screenWidth - Width of the container
 * @param cardWidth - Width of each card
 * @param remainingCards - Number of cards remaining in the deck
 * @returns The x-coordinate of the card's vertical centerline
 */
export type RemainingDeckCardCenterXFn = (
  i: number,
  screenWidth: number,
  cardWidth: number,
  remainingCards: number
) => number;

/**
 * Spacing function with fixed initial spacing and compression for later cards.
 * - Pre-knee area (60% of target width): cards at fixed gradual spacing
 * - Post-knee area (40% of target width): remaining cards compressed to fit
 * - Centers deck if it's smaller than target area
 */
export const defaultRemainingDeckCardCenterX: RemainingDeckCardCenterXFn = (i, screenWidth, cardWidth, remainingCards) => {
  if (remainingCards <= 1) return screenWidth / 2;

  // Tunable parameters
  const initialSpacing = -2; // Starting spacing (negative = slight overlap)
  const gradualRate = 0.3; // How fast spacing decreases per card (before knee)
  const minSpacing = -cardWidth * 0.9; // Maximum overlap allowed
  const targetWidthFraction = 0.7; // Target deck width as fraction of screen
  const kneePositionFraction = 0.6; // Knee at 60% of target width

  const targetWidth = screenWidth * targetWidthFraction;
  const kneePosition = targetWidth * kneePositionFraction; // x-position of knee
  const postKneeWidth = targetWidth - kneePosition; // Width available after knee

  // Fill pre-knee area with cards at fixed spacing until we hit the knee or run out of cards
  const preKneeSpacings: number[] = [];
  let preKneeUsedWidth = cardWidth; // First card
  let preKneeCardCount = 1;

  for (let j = 0; j < remainingCards - 1; j++) {
    const spacing = initialSpacing - gradualRate * j;
    const nextCardWidth = cardWidth + spacing;

    if (preKneeUsedWidth + nextCardWidth > kneePosition) {
      // Next card would exceed knee position, stop here
      break;
    }

    preKneeSpacings.push(spacing);
    preKneeUsedWidth += nextCardWidth;
    preKneeCardCount++;
  }

  // Remaining cards go in post-knee area
  const postKneeCards = remainingCards - preKneeCardCount;
  const postKneeGaps = postKneeCards; // Gap from last pre-knee card to first post-knee, plus gaps between post-knee cards

  // Calculate post-knee spacings to fit in post-knee width
  const postKneeSpacings: number[] = [];
  if (postKneeCards > 0) {
    const availableForSpacing = postKneeWidth - postKneeCards * cardWidth;
    const spacingPerGap = Math.max(minSpacing, availableForSpacing / postKneeGaps);

    for (let j = 0; j < postKneeGaps; j++) {
      postKneeSpacings.push(spacingPerGap);
    }
  }

  // Combine all spacings
  const spacings = [...preKneeSpacings, ...postKneeSpacings];

  // Compute positions from spacings
  const positions: number[] = [0];
  for (let j = 0; j < spacings.length; j++) {
    positions.push(positions[j] + cardWidth + spacings[j]);
  }

  // Center the deck
  const actualWidth = positions[remainingCards - 1] + cardWidth;
  const startX = (screenWidth - actualWidth) / 2;

  // Return center of card i
  return startX + positions[i] + cardWidth / 2;
};

/**
 * Calculate x-positions for cards in the remaining deck.
 * Returns array of left-edge x-positions for each card.
 */
export function calculateDeckXPositions(
  remainingCards: number,
  containerWidth: number,
  cardWidth: number = 40,
  centerXFn: RemainingDeckCardCenterXFn = defaultRemainingDeckCardCenterX
): number[] {
  if (remainingCards === 0) return [];

  const positions: number[] = [];
  for (let i = 0; i < remainingCards; i++) {
    const centerX = centerXFn(i, containerWidth, cardWidth, remainingCards);
    positions.push(centerX - cardWidth / 2); // Convert centerline to left edge
  }

  return positions;
}

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
  const goalDeckOffset = 80; // Space reserved for goal deck below

  // Use the deck layout helper for x-positions with decreasing spacing
  const xPositions = calculateDeckXPositions(totalCards, containerWidth, cardWidth);
  const x = xPositions[cardIndex] ?? containerWidth / 2 - cardWidth / 2;

  return {
    x,
    y: containerHeight - padding - cardHeight - goalDeckOffset,
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
  // Position piles in the upper portion of the container, above the goal deck
  const goalDeckOffset = 80;
  const baseY = (containerHeight - goalDeckOffset) / 2 - 30;

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
  stackOffset: number = 5,
  trackPanelHeight?: number
): CardPosition {
  const sequence = shuffle.seqs[currentRound];
  const totalCards = sequence.length;

  // Find this card's position in the dealing sequence
  // TODO: Not very efficient..
  const positionInSequence = sequence.indexOf(faceValue);

  if (positionInSequence === -1) {
    // Card not in this round's sequence (shouldn't happen)
    return getSourcePosition(0, totalCards, containerWidth, containerHeight);
  }

  // Calculate when this card should be dealt
  // Card i is dealt when note i reaches the beat line (middle of visible track panel)

  // The beat line is at the vertical middle of the actual visible track panel
  // In split mode, this is 60% of window height, otherwise full window height
  const actualTrackHeight = trackPanelHeight || scrollHelper.windowHeight;

  // Helper to get deal start time for any position
  const getDealStartTime = (pos: number) => {
    const yPos = scrollHelper.cardY(pos);
    const beatLineOffset = actualTrackHeight / 2;
    const scrollYAtBeatLine = yPos - beatLineOffset;
    const beatLineTime = scrollHelper.trackTime(scrollYAtBeatLine);
    const timeFromRoundStart = beatLineTime - scrollHelper.minTime;
    const dealTime = scrollHelper.minTime + timeFromRoundStart;
    const dealDuration = scrollHelper.timePerRound / (totalCards * 2);
    return dealTime - dealDuration;
  };

  const cardDealStartTime = getDealStartTime(positionInSequence);
  const dealDuration = scrollHelper.timePerRound / (totalCards * 2);
  const cardDealTime = cardDealStartTime + dealDuration;

  // Calculate when the last card finishes dealing
  const lastCardDealTime = getDealStartTime(totalCards - 1) + dealDuration;

  // Add a small delay before collection starts so piles are visible
  const pauseBeforeCollect = 0.5; // seconds
  const collectPhaseStart = Math.min(lastCardDealTime + pauseBeforeCollect, scrollHelper.maxTime - 0.5);
  const collectPhaseEnd = scrollHelper.maxTime;

  // Count how many cards have left the source deck (started dealing)
  let cardsDealt = 0;
  for (let i = 0; i < totalCards; i++) {
    if (trackTime >= getDealStartTime(i)) {
      cardsDealt = i + 1;
    } else {
      break; // Deal times are sequential, so we can stop early
    }
  }

  // Calculate source position based on remaining deck
  const remainingCards = totalCards - cardsDealt;
  const indexInRemaining = positionInSequence - cardsDealt;

  // Get source position - use remaining deck count for cards still in deck
  const sourcePos = trackTime < cardDealStartTime && remainingCards > 0 && indexInRemaining >= 0
    ? getSourcePosition(indexInRemaining, remainingCards, containerWidth, containerHeight)
    : getSourcePosition(positionInSequence, totalCards, containerWidth, containerHeight);

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

  // zIndex for source deck: earlier cards (lower index) on top, based on remaining deck
  const sourceZIndex = remainingCards - indexInRemaining;
  // zIndex for piles: later dealt cards on top within the pile
  const pileZIndex = positionInSequence;
  // zIndex during dealing animation: above source deck
  const dealingZIndex = totalCards + positionInSequence;

  // Determine card state based on current time
  if (trackTime < cardDealStartTime) {
    // Card hasn't started dealing yet - stay in source position
    return { ...sourcePos, zIndex: sourceZIndex };
  } else if (trackTime < cardDealTime) {
    // Card is currently being dealt - interpolate
    const dealProgress = (trackTime - cardDealStartTime) / dealDuration;
    return { ...interpolatePosition(sourcePos, pilePos, Math.min(1, dealProgress), true), zIndex: dealingZIndex };
  } else if (trackTime < collectPhaseStart) {
    // Card has been dealt - stay in pile position
    return { ...pilePos, zIndex: pileZIndex };
  } else {
    // Collect phase - animate piles to new deck sequentially
    const nextSequence = shuffle.seqs[currentRound + 1];
    const nextPositionInSequence = nextSequence.indexOf(faceValue);
    const finalPos = getSourcePosition(nextPositionInSequence, totalCards, containerWidth, containerHeight);

    // zIndex for final position: based on next sequence (earlier on top)
    const finalZIndex = totalCards - nextPositionInSequence;

    // Collect piles sequentially: pile 0 first, then pile 1, etc.
    const totalCollectTime = collectPhaseEnd - collectPhaseStart;
    const timePerPile = totalCollectTime / numberOfPiles;
    const pileCollectStart = collectPhaseStart + pileIndex * timePerPile;
    const pileCollectEnd = pileCollectStart + timePerPile;

    if (trackTime < pileCollectStart) {
      // This pile hasn't started collecting yet
      return { ...pilePos, zIndex: pileZIndex };
    } else if (trackTime < pileCollectEnd) {
      // This pile is currently being collected
      const pileProgress = (trackTime - pileCollectStart) / timePerPile;
      // During collection animation, use finalZIndex so cards layer correctly as they merge
      return {
        ...interpolatePosition(pilePos, finalPos, Math.min(1, pileProgress), false),
        zIndex: finalZIndex
      };
    } else {
      // This pile has finished collecting
      return { ...finalPos, zIndex: finalZIndex };
    }
  }
}
