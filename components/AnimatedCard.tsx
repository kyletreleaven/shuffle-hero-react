import React, { useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import type { CardPosition } from '../utils/AnimationHelper';

type AnimatedCardProps = {
  cardNumber: number;
  displayValue: number;
  position: CardPosition;
  color: string;
};

export const AnimatedCard = React.memo(({ cardNumber, displayValue, position, color }: AnimatedCardProps) => {
  const animatedX = useRef(new Animated.Value(position.x)).current;
  const animatedY = useRef(new Animated.Value(position.y)).current;

  useEffect(() => {
    // Smooth transition to new position
    Animated.parallel([
      Animated.timing(animatedX, {
        toValue: position.x,
        duration: 100,
        useNativeDriver: false, // Can't use native driver for left/top
      }),
      Animated.timing(animatedY, {
        toValue: position.y,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  }, [position.x, position.y, animatedX, animatedY]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: color,
          left: animatedX,
          top: animatedY,
          zIndex: position.zIndex || 0,
          transform: [
            { rotate: `${position.rotation || 0}deg` },
            { scale: position.scale || 1 },
          ],
        },
      ]}
    >
      <Text style={styles.cardNumber}>{displayValue + 1}</Text>
    </Animated.View>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: 40,
    height: 60,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  cardNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
