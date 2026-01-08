import { ScrollHelper } from '../ScrollHelper';

export type CardPosition = {
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
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
 * Calculate the x-positions for each pile, evenly distributed across the container width
 */
export function calculatePilePositions(numberOfPiles: number, containerWidth: number): number[] {
  const padding = 60; // Padding from edges
  const availableWidth = containerWidth - 2 * padding;
  const spacing = availableWidth / (numberOfPiles - 1);

  return Array.from({ length: numberOfPiles }, (_, i) => padding + i * spacing);
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
  const padding = 40;
  const cardWidth = 40;
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
      y: containerHeight - padding - 60 - row * 70, // Stack rows upward
      rotation: 0,
      scale: 1,
    };
  }

  // Single row - center the cards
  const totalWidth = totalCards * (cardWidth + cardSpacing);
  const startX = (containerWidth - totalWidth) / 2;

  return {
    x: startX + cardIndex * (cardWidth + cardSpacing),
    y: containerHeight - padding - 60,
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
  isStacked: boolean = false
): CardPosition {
  const pilePositions = calculatePilePositions(totalPiles, containerWidth);
  const pileX = pilePositions[pileIndex];

  // Vertical offset per card in the pile
  const stackOffset = isStacked ? 4 : 8; // Tighter stacking in stack phase
  const baseY = containerHeight / 2 - 30;

  return {
    x: pileX - 20, // Center the card (card width is 40px)
    y: baseY + cardIndexInPile * stackOffset,
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
 * Calculate the position for a card based on the current animation state
 */
export function calculateCardPosition(
  cardNumber: number,
  shuffle: Shuffle,
  currentRound: number,
  animationState: AnimationState,
  containerWidth: number,
  containerHeight: number,
  numberOfPiles: number
): CardPosition {
  const { phase, progress } = animationState;

  // Get the sequence for this round (before dealing)
  const sequence = shuffle.seqs[currentRound];
  const cardIndexInSequence = sequence.indexOf(cardNumber);

  // Get which pile this card goes to
  const pileIndex = shuffle.rounds[currentRound][cardNumber];

  switch (phase) {
    case 'deal': {
      // Animate from source sequence to pile
      const sourcePos = getSourcePosition(cardIndexInSequence, sequence.length, containerWidth, containerHeight);

      // Calculate which position this card will have in its pile
      // Count how many cards before this one in the sequence go to the same pile
      let cardIndexInPile = 0;
      for (let i = 0; i < cardIndexInSequence; i++) {
        const otherCard = sequence[i];
        if (shuffle.rounds[currentRound][otherCard] === pileIndex) {
          cardIndexInPile++;
        }
      }

      const pilePos = getPilePosition(pileIndex, cardIndexInPile, numberOfPiles, containerWidth, containerHeight, false);

      return interpolatePosition(sourcePos, pilePos, progress, true); // Add rotation during deal
    }

    case 'stack': {
      // Transition from loose piles to stacked piles
      let cardIndexInPile = 0;
      for (let i = 0; i < cardIndexInSequence; i++) {
        const otherCard = sequence[i];
        if (shuffle.rounds[currentRound][otherCard] === pileIndex) {
          cardIndexInPile++;
        }
      }

      const loosePos = getPilePosition(pileIndex, cardIndexInPile, numberOfPiles, containerWidth, containerHeight, false);
      const stackedPos = getPilePosition(pileIndex, cardIndexInPile, numberOfPiles, containerWidth, containerHeight, true);

      return interpolatePosition(loosePos, stackedPos, progress);
    }

    case 'collect': {
      // Animate from piles to final sequence (for next round)
      let cardIndexInPile = 0;
      for (let i = 0; i < cardIndexInSequence; i++) {
        const otherCard = sequence[i];
        if (shuffle.rounds[currentRound][otherCard] === pileIndex) {
          cardIndexInPile++;
        }
      }

      const stackedPos = getPilePosition(pileIndex, cardIndexInPile, numberOfPiles, containerWidth, containerHeight, true);

      // Final sequence position (for next round)
      const nextSequence = shuffle.seqs[currentRound + 1] || sequence;
      const nextIndex = nextSequence.indexOf(cardNumber);
      const finalPos = getSourcePosition(nextIndex, nextSequence.length, containerWidth, containerHeight);

      return interpolatePosition(stackedPos, finalPos, progress);
    }
  }
}
