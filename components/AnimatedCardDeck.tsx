import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { AnimatedCard } from './AnimatedCard';
import type { Shuffle } from '../utils/AnimationHelper';
import { calculateCardPosition } from '../utils/AnimationHelper';
import { ScrollHelper } from '../ScrollHelper';

type AnimatedCardDeckProps = {
  shuffle: Shuffle;
  currentRound: number;
  numberOfCards: number;
  numberOfLanes: number;
  trackTime: number;
  scrollHelper: ScrollHelper;
  colors: string[];
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
        stackOffset
      );

      positions.push({
        cardNumber: faceValue,
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
  ]);

  return (
    <View style={styles.container}>
      {cardPositions.map(({ cardNumber, position, color }) => (
        <AnimatedCard
          key={cardNumber}
          cardNumber={cardNumber}
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
