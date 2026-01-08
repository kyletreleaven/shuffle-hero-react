import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { AnimatedCard } from './AnimatedCard';
import type { Shuffle } from '../utils/AnimationHelper';
import {
  calculateAnimationState,
  calculateCardPosition,
} from '../utils/AnimationHelper';
import { ScrollHelper } from '../ScrollHelper';

type AnimatedCardDeckProps = {
  shuffle: Shuffle;
  currentRound: number;
  numberOfCards: number;
  numberOfLanes: number;
  trackTime: number;
  scrollHelper: ScrollHelper;
  colors: string[];
};

export function AnimatedCardDeck({
  shuffle,
  currentRound,
  numberOfCards,
  numberOfLanes,
  trackTime,
  scrollHelper,
  colors,
}: AnimatedCardDeckProps) {
  const windowDimensions = useWindowDimensions();

  // Calculate animation state based on current time
  const animationState = useMemo(() => {
    return calculateAnimationState(trackTime, currentRound, scrollHelper);
  }, [trackTime, currentRound, scrollHelper]);

  // Calculate positions for all cards
  const cardPositions = useMemo(() => {
    const positions = [];

    for (let cardNumber = 0; cardNumber < numberOfCards; cardNumber++) {
      const position = calculateCardPosition(
        cardNumber,
        shuffle,
        currentRound,
        animationState,
        windowDimensions.width,
        windowDimensions.height * 0.4, // Card panel is 40% of window height
        numberOfLanes
      );

      positions.push({
        cardNumber,
        position,
        color: colors[cardNumber % colors.length],
      });
    }

    return positions;
  }, [
    numberOfCards,
    shuffle,
    currentRound,
    animationState,
    windowDimensions.width,
    windowDimensions.height,
    numberOfLanes,
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
