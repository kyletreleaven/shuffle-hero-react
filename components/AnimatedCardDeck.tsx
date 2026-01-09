import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { AnimatedCard } from './AnimatedCard';
import type { Shuffle } from '../utils/AnimationHelper';
import { calculateCardPosition, calculateDeckXPositions } from '../utils/AnimationHelper';
import { ScrollHelper } from '../ScrollHelper';

type AnimatedCardDeckProps = {
  shuffle: Shuffle;
  currentRound: number;
  numberOfCards: number;
  numberOfLanes: number;
  trackTime: number;
  scrollHelper: ScrollHelper;
  colors: string[];
  permutation: number[];
  stackOffset?: number;
};

export function AnimatedCardDeck({
  shuffle,
  currentRound,
  numberOfCards,
  numberOfLanes,
  trackTime,
  scrollHelper,
  colors,
  permutation,
  stackOffset = 5,
}: AnimatedCardDeckProps) {
  const windowDimensions = useWindowDimensions();

  // Calculate positions for all cards
  const cardPositions = useMemo(() => {
    const positions = [];

    for (let faceValue = 0; faceValue < numberOfCards; faceValue++) {
      const position = calculateCardPosition(
        faceValue,
        shuffle,
        currentRound,
        trackTime,
        scrollHelper,
        windowDimensions.width,
        windowDimensions.height * 0.4, // Card panel is 40% of window height
        numberOfLanes,
        stackOffset,
        windowDimensions.height * 0.6 // Track panel is 60% of window height
      );

      positions.push({
        cardNumber: faceValue,
        displayValue: permutation[faceValue],
        position,
        color: colors[faceValue % colors.length],
      });
    }

    return positions;
  }, [
    numberOfCards,
    shuffle,
    currentRound,
    trackTime,
    scrollHelper,
    windowDimensions.width,
    windowDimensions.height,
    numberOfLanes,
    stackOffset,
    colors,
    permutation,
  ]);

  // Calculate goal deck positions (cards 1..n in order)
  const goalDeckPositions = useMemo(() => {
    const positions = [];
    const padding = 20;
    const cardWidth = 40;
    const cardHeight = 60;
    const containerHeight = windowDimensions.height * 0.4;
    const goalY = containerHeight - padding - cardHeight; // At the very bottom

    // Use the same deck layout helper for consistent spacing
    const xPositions = calculateDeckXPositions(numberOfCards, windowDimensions.width, cardWidth);

    for (let i = 0; i < numberOfCards; i++) {
      positions.push({
        cardNumber: i,
        displayValue: permutation[i], // Show permutation[i] for goal deck too
        position: {
          x: xPositions[i] ?? windowDimensions.width / 2 - cardWidth / 2,
          y: goalY,
          zIndex: -1 - i, // Earlier cards (lower i) on top, all behind main deck
        },
        color: '#333', // Darker color for goal deck
      });
    }

    return positions;
  }, [numberOfCards, windowDimensions.width, windowDimensions.height, permutation]);

  return (
    <View style={styles.container}>
      {/* Goal deck - cards 1..n in order */}
      {goalDeckPositions.map(({ cardNumber, displayValue, position, color }) => (
        <AnimatedCard
          key={`goal-${cardNumber}`}
          cardNumber={cardNumber}
          displayValue={displayValue}
          position={position}
          color={color}
        />
      ))}

      {/* Active cards being dealt */}
      {cardPositions.map(({ cardNumber, displayValue, position, color }) => (
        <AnimatedCard
          key={cardNumber}
          cardNumber={cardNumber}
          displayValue={displayValue}
          position={position}
          color={color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
