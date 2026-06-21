import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image, TouchableOpacity, Modal, ScrollView, Dimensions, BackHandler, Platform, useWindowDimensions, Linking } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ShuffleUtil from './ShuffleUtil';
import { ScrollHelper, BASE_CARD_SPACING, START_PADDING_SECONDS } from './ScrollHelper';
import { calculateDeckXPositions } from './utils/AnimationHelper';

const LANE_COUNT = 5;
const NOTE_COUNT = 40; // Number of cards
const SCROLL_SPEED = 1.5; // Cards per second (configurable)
const SHOW_DEBUG_HUD = false; // Toggle debug HUD visibility
const STORAGE_KEY = 'shuffle-hero-preferences'; // localStorage key for user preferences

// Base layout constants — scaled at runtime relative to BASE_SCREEN_WIDTH.
// Base values are tuned for Pixel 4a (393dp logical width); other devices scale proportionally.
const BASE_SCREEN_WIDTH = 393;
const BASE_BOTTOM_STACK_HEIGHT = 100;
const BASE_CARD_WIDTH = 40;
const BASE_CARD_HEIGHT = 60;
const BASE_DECK_ROW_PADDING = 8;
const MIN_TOUCH_TARGET = 44;

// Guitar Hero-style note colors
const NOTE_COLORS = [
  '#22c55e', // green
  '#ef4444', // red
  '#eab308', // yellow
  '#3b82f6', // blue
  '#f97316', // orange
  '#a855f7', // purple
  '#ec4899', // pink
];

type Note = {
  id: number;
  lane: number;
  position: number;
  color: string;
};

type MenuPanelProps = {
  visible: boolean;
  onClose: () => void;
  numberOfCards: number;
  setNumberOfCards: (value: number) => void;
  numberOfLanes: number;
  setNumberOfLanes: (value: number) => void;
  scrollSpeed: number;
  setScrollSpeed: (value: number) => void;
  animated: boolean;
  setAnimated: (value: boolean) => void;
  showGoalDeck: boolean;
  setShowGoalDeck: (value: boolean) => void;
  faceUp: boolean;
  setFaceUp: (value: boolean) => void;
};

type NumberOfCardsControlProps = {
  value: number;
  onChange: (value: number) => void;
};

function NumberOfCardsControl({ value, onChange }: NumberOfCardsControlProps) {
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(Math.min(width, height) / BASE_SCREEN_WIDTH), [width, height]);
  const presets = [10, 40, 52, 60, 100];

  return (
    <View style={styles.settingControl}>
      <Text style={styles.settingLabel}>Number of Cards</Text>
      <View style={styles.settingButtons}>
        <TouchableOpacity
          style={[styles.settingButton, value <= 1 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.max(1, value - 5))}
          disabled={value <= 1}
        >
          <Text style={styles.settingButtonText}>-5</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingButton, value <= 1 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
        >
          <Text style={styles.settingButtonText}>-1</Text>
        </TouchableOpacity>
        <Text style={styles.settingValue}>{value}</Text>
        <TouchableOpacity
          style={[styles.settingButton, value >= 200 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.min(200, value + 1))}
          disabled={value >= 200}
        >
          <Text style={styles.settingButtonText}>+1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingButton, value >= 200 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.min(200, value + 5))}
          disabled={value >= 200}
        >
          <Text style={styles.settingButtonText}>+5</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.presetButtons}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              value === preset && styles.presetButtonSelected
            ]}
            onPress={() => onChange(preset)}
          >
            <Text style={[
              styles.presetButtonText,
              value === preset && styles.presetButtonTextSelected
            ]}>{preset}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

type NumberOfLanesControlProps = {
  value: number;
  onChange: (value: number) => void;
};

function NumberOfLanesControl({ value, onChange }: NumberOfLanesControlProps) {
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(Math.min(width, height) / BASE_SCREEN_WIDTH), [width, height]);
  const presets = [4, 5, 6, 7];

  return (
    <View style={styles.settingControl}>
      <Text style={styles.settingLabel}>Number of Lanes</Text>
      <View style={styles.presetButtons}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              value === preset && styles.presetButtonSelected
            ]}
            onPress={() => onChange(preset)}
          >
            <Text style={[
              styles.presetButtonText,
              value === preset && styles.presetButtonTextSelected
            ]}>{preset}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

type CrossPlatformSliderProps = {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: any;
};

/**
 * Cross-platform slider component that works on both web and native.
 * On web, uses HTML5 input[type="range"] for proper mouse support.
 * On native, uses @react-native-community/slider.
 */
function CrossPlatformSlider({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  minimumTrackTintColor = '#007AFF',
  maximumTrackTintColor = '#555',
  thumbTintColor = '#007AFF',
  style,
}: CrossPlatformSliderProps) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="range"
        min={minimumValue}
        max={maximumValue}
        step={step}
        value={value}
        onChange={(e) => onValueChange(parseFloat((e.target as HTMLInputElement).value))}
        style={{
          width: '100%',
          height: 40,
          cursor: 'pointer',
          accentColor: minimumTrackTintColor,
          ...StyleSheet.flatten(style),
        }}
      />
    );
  }

  return (
    <Slider
      style={style}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      value={value}
      onValueChange={onValueChange}
      minimumTrackTintColor={minimumTrackTintColor}
      maximumTrackTintColor={maximumTrackTintColor}
      thumbTintColor={thumbTintColor}
    />
  );
}

type SpeedControlProps = {
  value: number;
  onChange: (value: number) => void;
};

function SpeedControl({ value, onChange }: SpeedControlProps) {
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(Math.min(width, height) / BASE_SCREEN_WIDTH), [width, height]);
  return (
    <View style={styles.settingControl}>
      <View style={styles.sliderHeader}>
        <Text style={styles.settingLabel}>Speed (cards/sec)</Text>
        <Text style={styles.sliderValue}>{value.toFixed(1)}</Text>
      </View>
      <CrossPlatformSlider
        style={styles.slider}
        minimumValue={0}
        maximumValue={3}
        step={0.1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#007AFF"
        maximumTrackTintColor="#555"
        thumbTintColor="#007AFF"
      />
      <View style={styles.sliderNotches}>
        <Text style={styles.sliderNotchText}>0</Text>
        <Text style={styles.sliderNotchText}>1</Text>
        <Text style={styles.sliderNotchText}>2</Text>
        <Text style={styles.sliderNotchText}>3</Text>
      </View>
    </View>
  );
}

type AutoScrollViewState = {
  isTouching: boolean;
  setIsTouching: (value: boolean) => void;
  isRegularScrolling: boolean;
  setIsRegularScrolling: (value: boolean) => void;
  isMomentumScrolling: boolean;
  setIsMomentumScrolling: (value: boolean) => void;
  awaitingMomentumScroll: boolean;
  setAwaitingMomentumScroll: (value: boolean) => void;
  isPaused: boolean;
  setIsPaused: (value: boolean) => void;
  isScrolling: boolean;
  inhibitAutoScroll: boolean;
};

/**
 * Hook to manage AutoScrollView state.
 * Returns all the state values and setters needed for autoscroll functionality.
 */
function useAutoScrollViewState(): AutoScrollViewState {
  const [isTouching, setIsTouching] = useState(false);
  const [isRegularScrolling, setIsRegularScrolling] = useState(false);
  const [isMomentumScrolling, setIsMomentumScrolling] = useState(false);
  const [awaitingMomentumScroll, setAwaitingMomentumScroll] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const isScrolling = isRegularScrolling || isMomentumScrolling;
  const inhibitAutoScroll = isTouching || isScrolling || awaitingMomentumScroll;

  return {
    isTouching,
    setIsTouching,
    isRegularScrolling,
    setIsRegularScrolling,
    isMomentumScrolling,
    setIsMomentumScrolling,
    awaitingMomentumScroll,
    setAwaitingMomentumScroll,
    isPaused,
    setIsPaused,
    isScrolling,
    inhibitAutoScroll,
  };
}

type AutoScrollViewProps = {
  style?: any;
  contentContainerStyle?: any;
  showsVerticalScrollIndicator?: boolean;
  scrollSpeed: number;
  scrollY: number;
  onScrollYChange: (y: number) => void;
  children: React.ReactNode;
  state: AutoScrollViewState;
};

/**
 * ScrollView component with built-in autoscroll functionality.
 * Manages scroll state and automatically scrolls at the specified speed,
 * pausing when user is interacting (touching, dragging, or momentum scrolling).
 */
function AutoScrollView({
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  scrollSpeed,
  scrollY,
  onScrollYChange,
  children,
  state,
}: AutoScrollViewProps) {
  const {
    setIsTouching,
    setIsRegularScrolling,
    setIsMomentumScrolling,
    setAwaitingMomentumScroll,
    isPaused,
    inhibitAutoScroll,
  } = state;

  const scrollViewRef = useRef<ScrollView>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // On web, detect mouse wheel scrolling and treat it as regular scrolling
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleWheel = () => {
      // Clear any existing timeout
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }

      // Treat wheel scroll as regular scrolling
      setIsRegularScrolling(true);

      // Clear after user stops wheeling
      wheelTimeoutRef.current = setTimeout(() => {
        setIsRegularScrolling(false);
      }, 150);
    };

    const scrollElement = scrollViewRef.current
      ? ((scrollViewRef.current as any).getScrollableNode?.() || (scrollViewRef.current as any))
      : null;

    if (scrollElement && scrollElement.addEventListener) {
      scrollElement.addEventListener('wheel', handleWheel, { passive: true });
      return () => {
        scrollElement.removeEventListener('wheel', handleWheel);
        if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current);
        }
      };
    }
  }, [setIsRegularScrolling]);

  // Helper to scroll the view to a position
  const scrollToY = (newY: number) => {
    if (scrollViewRef.current) {
      if (Platform.OS === 'web') {
        // On web, directly set scrollTop for immediate, reliable scrolling
        const scrollElement = (scrollViewRef.current as any).getScrollableNode?.() ||
                             (scrollViewRef.current as any);
        if (scrollElement && typeof scrollElement.scrollTop !== 'undefined') {
          scrollElement.scrollTop = newY;
        }
      } else {
        // On native, use the standard scrollTo method
        scrollViewRef.current.scrollTo({
          y: newY,
          animated: false,
        });
      }
    }
  };

  // Sync scrollY to ScrollView during autoscroll
  useEffect(() => {
  // useLayoutEffect(() => {
    if (!inhibitAutoScroll) {
      scrollToY(scrollY);
    }
  }, [scrollY, inhibitAutoScroll]);

  // Autoscroll effect
  const scrollYRef = useRef(scrollY);
  scrollYRef.current = scrollY;

  useEffect(() => {
    if (inhibitAutoScroll || isPaused || scrollSpeed === 0) return;

    let animationFrameId: number;
    let lastTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTimestamp !== null) {
        const deltaTime = timestamp - lastTimestamp;
        const pixelsToScroll = (scrollSpeed * deltaTime) / 1000;

        const newScrollY = Math.max(0, scrollYRef.current - pixelsToScroll);

        onScrollYChange(newScrollY);
      }

      lastTimestamp = timestamp;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [inhibitAutoScroll, isPaused, scrollSpeed, onScrollYChange]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={style}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      scrollEventThrottle={16}
      onScroll={(event) => {
        // Only update from scroll events during manual scrolling
        if (inhibitAutoScroll) {
          onScrollYChange(event.nativeEvent.contentOffset.y);
        }
      }}
      onTouchStart={() => setIsTouching(true)}
      onTouchEnd={() => setIsTouching(false)}
      onScrollBeginDrag={() => setIsRegularScrolling(true)}
      onScrollEndDrag={(event) => {
        onScrollYChange(event.nativeEvent.contentOffset.y);
        setIsTouching(false);
        setIsRegularScrolling(false);
        setAwaitingMomentumScroll(true);
        setTimeout(() => setAwaitingMomentumScroll(false), 50);
      }}
      onMomentumScrollBegin={() => setIsMomentumScrolling(true)}
      onMomentumScrollEnd={(event) => {
        onScrollYChange(event.nativeEvent.contentOffset.y);
        setIsMomentumScrolling(false);
      }}
    >
      {children}
    </ScrollView>
  );
}

function MenuPanel({ visible, onClose, numberOfCards, setNumberOfCards, numberOfLanes, setNumberOfLanes, scrollSpeed, setScrollSpeed, animated, setAnimated, showGoalDeck, setShowGoalDeck, faceUp, setFaceUp }: MenuPanelProps) {
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(Math.min(width, height) / BASE_SCREEN_WIDTH), [width, height]);
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <TouchableOpacity style={styles.menuPanel} activeOpacity={1} onPress={() => {}}>
          <ScrollView
            style={styles.menuScrollView}
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.menuTitle}>Options Menu</Text>

            <NumberOfCardsControl
              value={numberOfCards}
              onChange={setNumberOfCards}
            />

            <NumberOfLanesControl
              value={numberOfLanes}
              onChange={setNumberOfLanes}
            />

            <SpeedControl
              value={scrollSpeed}
              onChange={setScrollSpeed}
            />

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setAnimated(!animated)}>
              <View style={[styles.checkbox, animated && styles.checkboxChecked]}>
                {animated && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Animated</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setFaceUp(!faceUp)} disabled={!animated}>
              <View style={[styles.checkbox, faceUp && styles.checkboxChecked, !animated && styles.checkboxDisabled]}>
                {faceUp && <Text style={[styles.checkmark, !animated && styles.checkmarkDisabled]}>✓</Text>}
              </View>
              <Text style={[styles.checkboxLabel, !animated && styles.checkboxLabelDisabled]}>Show card values</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setShowGoalDeck(!showGoalDeck)} disabled={!animated}>
              <View style={[styles.checkbox, showGoalDeck && styles.checkboxChecked, !animated && styles.checkboxDisabled]}>
                {showGoalDeck && <Text style={[styles.checkmark, !animated && styles.checkmarkDisabled]}>✓</Text>}
              </View>
              <Text style={[styles.checkboxLabel, !animated && styles.checkboxLabelDisabled]}>Show goal deck</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://kyletreleaven.github.io/shuffle-hero/')}
              style={styles.homepageLink}
            >
              <Text style={styles.homepageLinkText}>Visit Shuffle Hero Homepage</Text>
            </TouchableOpacity>

          </ScrollView>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}


const samplePermutation = (numCards: number) => {
  const perm = Array.from({ length: numCards }, (_, i) => i);
  ShuffleUtil.shuffle(perm);
  return perm;
}


export default function App() {
  const windowDimensions = useWindowDimensions();
  const [menuVisible, setMenuVisible] = useState(false);

  // Scale based on the short dimension so landscape mode doesn't inflate sizes.
  // The app runs in landscape, where width is the long edge and height is the short edge.
  const scale = Math.min(windowDimensions.width, windowDimensions.height) / BASE_SCREEN_WIDTH;
  const styles = useMemo(() => makeStyles(scale), [scale]);
  const CARD_WIDTH = Math.min(Math.round(BASE_CARD_WIDTH * scale), BASE_CARD_WIDTH);
  const CARD_HEIGHT = Math.min(Math.round(BASE_CARD_HEIGHT * scale), BASE_CARD_HEIGHT);
  const CARD_SPACING = Math.round(BASE_CARD_SPACING * scale);
  const DECK_ROW_PADDING = Math.round(BASE_DECK_ROW_PADDING * scale);
  const TOP_DECK_HEIGHT_SINGLE = CARD_HEIGHT + 2 * DECK_ROW_PADDING;
  const TOP_DECK_HEIGHT_DOUBLE = 2 * CARD_HEIGHT + 3 * DECK_ROW_PADDING;
  const BOTTOM_STACK_HEIGHT = Math.round(BASE_BOTTOM_STACK_HEIGHT * scale);

  // Autoscroll state management
  const autoScrollState = useAutoScrollViewState();
  const { isTouching, isRegularScrolling, isMomentumScrolling, isScrolling, awaitingMomentumScroll, isPaused, setIsPaused, inhibitAutoScroll } = autoScrollState;

  // Game settings - initialize with defaults, will load saved values in effect
  const [numberOfLanes, setNumberOfLanes] = useState(LANE_COUNT);
  const MIN_BAND_WIDTH = CARD_WIDTH + DECK_ROW_PADDING * 2;
  const laneColumnWidth = windowDimensions.width / numberOfLanes;
  const maxLaneMargin = Math.floor((laneColumnWidth - MIN_BAND_WIDTH) / 2);
  const LANE_MARGIN = Math.max(1, Math.min(Math.round(12 * scale), maxLaneMargin));
  const [scrollSpeed, setScrollSpeed] = useState(SCROLL_SPEED);
  const [showGoalDeck, setShowGoalDeck] = useState(false);
  const [faceUp, setFaceUp] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [shuffleHoldReady, setShuffleHoldReady] = useState(false);
  const [prevHoldReady, setPrevHoldReady] = useState(false);

  // Dynamic top deck height based on whether goal deck is shown
  const topDeckHeight = animated
    ? (showGoalDeck ? TOP_DECK_HEIGHT_DOUBLE : TOP_DECK_HEIGHT_SINGLE)
    : 0;

  type ShuffleState = {
    permutation: number[];
    currentRound: number;
  };

  const [{permutation, currentRound}, setShuffleState] = useState<ShuffleState>(() => {
    const perm = samplePermutation(NOTE_COUNT);
    return { permutation: perm, currentRound: 0 };
  });
  const numberOfCards = permutation.length;

  // Calculate track dimensions
  const scrollHelper = new ScrollHelper(
    Math.max(scrollSpeed, 0.01),  // for sensible y updates while speed is zero
    numberOfCards,
    windowDimensions.height,
    CARD_SPACING,
  );

  const initialScrollY = scrollHelper.initialScrollY;
  const [scrollY, setScrollY] = useState(initialScrollY);
  const {trackHeight, minTime: minTrackTime, maxTime: maxTrackTime} = scrollHelper;

  // Helper to set trackTime with clamping
  const setScrollYClamped = useCallback((scrollY: number) => {
    setScrollY(scrollHelper.clampScrollY(scrollY));
  }, [scrollHelper.deps]);

  const resetScrollY = () => {
    setScrollY(initialScrollY);
    setIsPaused(false);
  };

  const setPerm = (perm: number[]) => {
    setShuffleState({ permutation: perm, currentRound: 0 });

    const nextScrollHelper = new ScrollHelper(
      scrollHelper.scrollCardsPerSec,
      perm.length,
      scrollHelper.windowHeight,
    );
    setScrollY(nextScrollHelper.initialScrollY);
    setIsPaused(false);
  };

  // Setters that maintain invariants
  const reShuffle = (n?: number) => setPerm(samplePermutation(n ?? numberOfCards));
  const reverse = () => setPerm(ShuffleUtil.invertPerm(permutation));

  const setNumberOfCards = (n: number) => {
    if (n === numberOfCards) return;
    reShuffle(n);
  };

  const setCurrentRound = (round: number) => {
    setShuffleState(prev => ({ ...prev, currentRound: round }));
  };

  const shuffle = useMemo(() => {
    const rounds = ShuffleUtil.computeStackShuffleRounds(permutation, numberOfLanes, true);
    const nRounds = rounds.length;

    const seqs = [ShuffleUtil.invertPerm(permutation)];

    for (let r = 1; r <= nRounds; r++) {
      const piles = ShuffleUtil.createPiles(numberOfLanes);
      ShuffleUtil.dealStacks(seqs[r - 1], rounds[r - 1], piles);
      seqs.push(ShuffleUtil.collectPiles(piles));
    }

    return { rounds, seqs };
  }, [permutation, numberOfLanes]);

  const numberOfRounds = shuffle.rounds.length;

  // Generate notes with round-robin dealing and constant spacing (from bottom up)
  const notes = useMemo(() => {
    const generatedNotes: Note[] = [];
    if (currentRound < numberOfRounds) {
      for (let i = 0; i < numberOfCards; i++) {
        // const lane = i % numberOfLanes;
        const face = shuffle.seqs[currentRound][i];
        const lane = shuffle.rounds[currentRound][face];
        generatedNotes.push({
          id: i,
          lane,
          position: scrollHelper.cardY(i),
          color: NOTE_COLORS[lane % NOTE_COLORS.length],
        });
      }
    }
    return generatedNotes;
  }, [shuffle.seqs[currentRound], scrollHelper]);

  useEffect(() => {
    // Lock to landscape mode but allow both orientations
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web') {
          saved = localStorage.getItem(STORAGE_KEY);
        } else {
          saved = await AsyncStorage.getItem(STORAGE_KEY);
        }

        if (saved) {
          const prefs = JSON.parse(saved);
          if (prefs.numberOfLanes) setNumberOfLanes(prefs.numberOfLanes);
          if (prefs.scrollSpeed) setScrollSpeed(prefs.scrollSpeed);
          if (prefs.showGoalDeck !== undefined) setShowGoalDeck(prefs.showGoalDeck);
          if (prefs.faceUp !== undefined) setFaceUp(prefs.faceUp);
          if (prefs.animated !== undefined) setAnimated(prefs.animated);
          if (prefs.numberOfCards && prefs.numberOfCards !== numberOfCards) {
            reShuffle(prefs.numberOfCards);
          }
        }
      } catch (e) {
        console.warn('Failed to load preferences:', e);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences when they change
  useEffect(() => {
    const savePreferences = async () => {
      try {
        const prefs = {
          numberOfCards,
          numberOfLanes,
          scrollSpeed,
          showGoalDeck,
          faceUp,
          animated,
        };
        const prefsString = JSON.stringify(prefs);

        if (Platform.OS === 'web') {
          localStorage.setItem(STORAGE_KEY, prefsString);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, prefsString);
        }
      } catch (e) {
        console.warn('Failed to save preferences:', e);
      }
    };

    savePreferences();
  }, [numberOfCards, numberOfLanes, scrollSpeed, showGoalDeck, faceUp, animated]);

  const handleScrollYChange = setScrollY;

  const laneWidth = windowDimensions.width / numberOfLanes;

  // Calculate deck positions for source and goal decks
  const deckXPositions = useMemo(() =>
    calculateDeckXPositions(numberOfCards, windowDimensions.width, CARD_WIDTH),
    [numberOfCards, windowDimensions.width]
  );

  // Computed positions based on window dimensions (more reliable than onLayout)
  const goalDeckY = DECK_ROW_PADDING;
  const deckRowY = showGoalDeck
    ? DECK_ROW_PADDING + CARD_HEIGHT + DECK_ROW_PADDING
    : (topDeckHeight - CARD_HEIGHT) / 2;
  const trackTopY = topDeckHeight;
  const trackBottomY = windowDimensions.height - BOTTOM_STACK_HEIGHT;
  const stackRowY = trackBottomY + 10; // 10px padding inside stack row


  // Calculate track time and card dealing state
  const trackTime = scrollHelper.trackTime(scrollY);

  // Use measured positions for key landmarks
  const trackTopScreenY = trackTopY;
  const trackBottomScreenY = trackBottomY;
  const deckY = deckRowY;

  // Helper to get when a card enters the visible area (appears below deck row)
  const getCardEnterTime = useCallback((pos: number) => {
    const contentY = scrollHelper.cardY(pos);
    // Card enters when: contentY - scrollY = trackTopScreenY
    // So: scrollY = contentY - trackTopScreenY
    const scrollYAtEnter = contentY - trackTopScreenY;
    return scrollHelper.trackTime(scrollYAtEnter);
  }, [scrollHelper, trackTopScreenY]);

  // Helper to get when a card exits the visible area (reaches stack row)
  const getCardExitTime = useCallback((pos: number) => {
    const contentY = scrollHelper.cardY(pos);
    // Card exits when: contentY - scrollY = trackBottomScreenY
    // So: scrollY = contentY - trackBottomScreenY
    const scrollYAtExit = contentY - trackBottomScreenY;
    return scrollHelper.trackTime(scrollYAtExit);
  }, [scrollHelper, trackBottomScreenY]);

  // Calculate which cards are in which state
  const cardStates = useMemo(() => {
    // Handle edge case: no rounds needed (e.g., 1 card already in position)
    if (numberOfRounds === 0 || currentRound >= numberOfRounds) {
      // All cards are already "collected" in final position
      const sequence = shuffle.seqs[0] || [];
      return sequence.map((faceValue, seqIndex) => ({
        faceValue,
        seqIndex,
        lane: 0,
        state: 'collected' as const,
      }));
    }

    const sequence = shuffle.seqs[currentRound];
    const states: Array<{
      faceValue: number;
      seqIndex: number;
      lane: number;
      state: 'deck' | 'falling' | 'stack' | 'collecting' | 'collected';
      dealProgress?: number;
      collectProgress?: number;
      stackIndex?: number; // Position in stack (0 = first dealt to this pile)
    }> = [];

    // Calculate collect phase timing - starts after last card exits screen
    const lastCardExitTime = getCardExitTime(numberOfCards - 1);
    const pauseBeforeCollect = 0.5;
    const collectPhaseStart = Math.min(lastCardExitTime + pauseBeforeCollect, scrollHelper.maxTime - 0.5);
    const collectPhaseEnd = scrollHelper.maxTime;
    const totalCollectTime = collectPhaseEnd - collectPhaseStart;
    const timePerPile = totalCollectTime / numberOfLanes;

    // Track cards per pile for stack index calculation
    const pilesLandedCount: number[] = Array(numberOfLanes).fill(0);

    for (let seqIndex = 0; seqIndex < sequence.length; seqIndex++) {
      const faceValue = sequence[seqIndex];
      const lane = shuffle.rounds[currentRound][faceValue];

      // Card enters screen (starts falling) when note appears at top
      const cardEnterTime = getCardEnterTime(seqIndex);
      // Card exits screen (lands on stack) when note disappears at bottom
      const cardExitTime = getCardExitTime(seqIndex);

      let state: 'deck' | 'falling' | 'stack' | 'collecting' | 'collected';
      let dealProgress: number | undefined;
      let collectProgress: number | undefined;
      let stackIndex: number | undefined;

      if (trackTime < cardEnterTime) {
        // Card hasn't appeared on screen yet - still in deck
        state = 'deck';
      } else if (trackTime < cardExitTime) {
        // Card is visible on screen - falling with its ghost note
        state = 'falling';
        dealProgress = (trackTime - cardEnterTime) / (cardExitTime - cardEnterTime);
      } else if (trackTime < collectPhaseStart) {
        // Card has exited screen - now in stack
        state = 'stack';
        stackIndex = pilesLandedCount[lane];
        pilesLandedCount[lane]++;
      } else {
        // In collect phase - check if this pile has started/finished collecting
        const pileCollectStart = collectPhaseStart + lane * timePerPile;
        const pileCollectEnd = pileCollectStart + timePerPile;

        if (trackTime < pileCollectStart) {
          state = 'stack';
          stackIndex = pilesLandedCount[lane];
          pilesLandedCount[lane]++;
        } else if (trackTime < pileCollectEnd) {
          state = 'collecting';
          collectProgress = (trackTime - pileCollectStart) / timePerPile;
        } else {
          state = 'collected';
        }
      }

      states.push({ faceValue, seqIndex, lane, state, dealProgress, collectProgress, stackIndex });
    }

    return states;
  }, [shuffle, currentRound, trackTime, numberOfCards, numberOfLanes, numberOfRounds, getCardEnterTime, getCardExitTime, scrollHelper]);

  // Count cards per stack for positioning
  const stackCounts = useMemo(() => {
    const counts: number[] = Array(numberOfLanes).fill(0);
    cardStates.forEach(card => {
      if (card.state === 'stack') counts[card.lane]++;
    });
    return counts;
  }, [cardStates, numberOfLanes]);

  // Calculate unified screen positions for all cards
  const cardScreenPositions = useMemo(() => {
    const positions: Array<{
      faceValue: number;
      x: number;
      y: number;
      zIndex: number;
      color: string;
    }> = [];

    // Pre-calculate deck positions for cards still in deck
    const deckCards = cardStates.filter(c => c.state === 'deck');
    const remainingDeckPositions = calculateDeckXPositions(
      deckCards.length,
      windowDimensions.width,
      CARD_WIDTH
    );

    // Full deck positions for collected cards
    const fullDeckPositions = calculateDeckXPositions(
      numberOfCards,
      windowDimensions.width,
      CARD_WIDTH
    );

    const nextSequence = shuffle.seqs[currentRound + 1];

    // Stack layout constants
    const STACK_OFFSET = 8;
    const stackTopScreenY = stackRowY;

    let deckIndex = 0;

    cardStates.forEach(card => {
      const cardColor = NOTE_COLORS[card.lane % NOTE_COLORS.length];
      let x: number, y: number, zIndex: number;

      switch (card.state) {
        case 'deck': {
          x = remainingDeckPositions[deckIndex] ?? windowDimensions.width / 2 - CARD_WIDTH / 2;
          y = deckY;
          zIndex = deckCards.length - deckIndex;
          deckIndex++;
          break;
        }

        case 'falling': {
          // Note position (where card should end up)
          // Ghost note is at: left = lane * laneWidth + laneWidth/2 - CARD_WIDTH/2, top = contentY (in scroll content)
          // Screen Y = contentY - scrollY (scroll view starts at screen y=0)
          const noteX = card.lane * laneWidth + laneWidth / 2 - CARD_WIDTH / 2;
          const contentY = scrollHelper.cardY(card.seqIndex);
          const noteY = contentY - scrollY;

          // Deal animation: quick transition from deck to note position
          const dealAnimationFraction = 0.15; // 15% of fall time for deal animation
          const dealProgress = card.dealProgress ?? 0;

          if (dealProgress < dealAnimationFraction) {
            // Animating from deck to note
            const t = dealProgress / dealAnimationFraction;
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

            // Deck position: this card was at position 0 in remaining deck when dealing started
            // Remaining deck size at deal start = numberOfCards - seqIndex
            const remainingAtDealStart = numberOfCards - card.seqIndex;
            const remainingDeckPositionsAtDeal = calculateDeckXPositions(
              remainingAtDealStart,
              windowDimensions.width,
              CARD_WIDTH
            );
            const deckCardX = remainingDeckPositionsAtDeal[0] ?? windowDimensions.width / 2 - CARD_WIDTH / 2;
            const deckCardY = deckY;

            x = deckCardX + (noteX - deckCardX) * eased;
            y = deckCardY + (noteY - deckCardY) * eased;
          } else {
            // Glued to note position
            x = noteX;
            y = noteY;
          }

          zIndex = 1000 + card.seqIndex;
          break;
        }

        case 'stack': {
          const stackCount = stackCounts[card.lane];
          const positionFromTop = stackCount - 1 - card.stackIndex!;
          x = card.lane * laneWidth + laneWidth / 2 - CARD_WIDTH / 2;
          y = stackTopScreenY + positionFromTop * STACK_OFFSET;
          zIndex = card.stackIndex!;
          break;
        }

        case 'collecting': {
          const progress = card.collectProgress!;
          const t = 1 - Math.pow(1 - progress, 3);

          // Start: stack position
          const stackCount = stackCounts[card.lane];
          const positionFromTop = stackCount - 1 - (card.stackIndex ?? 0);
          const startX = card.lane * laneWidth + laneWidth / 2 - CARD_WIDTH / 2;
          const startY = stackTopScreenY + positionFromTop * STACK_OFFSET;

          // End: deck position
          const nextSeqIndex = nextSequence?.indexOf(card.faceValue) ?? card.seqIndex;
          const endX = fullDeckPositions[nextSeqIndex];
          const endY = deckY;

          x = startX + (endX - startX) * t;
          y = startY + (endY - startY) * t;
          zIndex = 200 + card.seqIndex;
          break;
        }

        case 'collected': {
          const nextSeqIndex = nextSequence?.indexOf(card.faceValue) ?? card.seqIndex;
          x = fullDeckPositions[nextSeqIndex];
          y = deckY;
          zIndex = numberOfCards - nextSeqIndex;
          break;
        }

        default:
          x = 0;
          y = 0;
          zIndex = 0;
      }

      positions.push({ faceValue: card.faceValue, x, y, zIndex, color: cardColor });
    });

    return positions;
  }, [cardStates, windowDimensions, deckY, laneWidth, scrollY, scrollHelper, numberOfCards, numberOfLanes, shuffle, currentRound, stackCounts, stackRowY]);

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/wizard-cards.png')}
        style={[styles.backgroundImage, { width: windowDimensions.width, height: windowDimensions.height }]}
        resizeMode="cover"
      />
      {/* Main track area - full height scrollable */}
      <View style={styles.trackPanelFull}>
        <AutoScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollSpeed={scrollSpeed * CARD_SPACING}
          scrollY={scrollY}
          onScrollYChange={handleScrollYChange}
          state={autoScrollState}
        >
          <View style={[styles.track, { height: trackHeight, width: windowDimensions.width }]}>
            {/* Render vertical lanes */}
            {Array.from({ length: numberOfLanes }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.lane,
                  {
                    backgroundColor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.72)' : 'rgba(90, 90, 110, 0.60)',
                    marginHorizontal: LANE_MARGIN,
                  }
                ]}
              />
            ))}

            {/* Render notes: bars in normal mode, dashed card outlines in dev mode */}
            {notes.map((note) => animated ? (
              <View
                key={note.id}
                style={[
                  styles.ghostNote,
                  {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    borderColor: note.color,
                    left: note.lane * laneWidth + laneWidth / 2 - CARD_WIDTH / 2,
                    top: note.position,
                  },
                ]}
              >
                <Text style={[styles.ghostNoteNumber, { color: note.color }]}>{note.id + 1}</Text>
              </View>
            ) : (() => {
                const bandWidth = laneWidth - 2 * LANE_MARGIN;
                const barWidth = Math.min(Math.round(bandWidth * 0.6), 80);
                const barHeight = Math.round(CARD_HEIGHT * 0.35);
                const barLeft = note.lane * laneWidth + LANE_MARGIN + Math.round((bandWidth - barWidth) / 2);
                return (
                  <React.Fragment key={note.id}>
                    <View
                      style={[styles.barNote, {
                        width: barWidth,
                        height: barHeight,
                        backgroundColor: note.color,
                        left: barLeft,
                        top: note.position,
                      }]}
                    />
                    <Text style={[styles.barNoteNumber, { left: barLeft + barWidth, top: note.position + barHeight }]}>
                      {note.id + 1}
                    </Text>
                  </React.Fragment>
                );
              })()
            )}

            {/* Cards are rendered in the unified overlay, not here */}
          </View>
        </AutoScrollView>

        {/* Pile labels in normal mode: float at bottom of track, above button bar */}
        {!animated && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
            {Array.from({ length: numberOfLanes }, (_, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: Math.round(4 * scale) }}>
                <Text style={styles.pileLabel}>Pile {i + 1}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Top deck row - dev mode only */}
      {animated && (
        <View style={[styles.topDeckRow, { height: topDeckHeight }]}>
          <View style={[styles.deckLabelsLeft, { width: (deckXPositions[0] ?? 0) - 8 }]}>
            {showGoalDeck && (
              <Text style={[styles.deckLabel, { marginBottom: DECK_ROW_PADDING, height: CARD_HEIGHT, lineHeight: CARD_HEIGHT }]}>Goal Deck</Text>
            )}
            <Text style={[styles.deckLabel, { height: CARD_HEIGHT, lineHeight: CARD_HEIGHT }]}>Current Deck</Text>
          </View>
        </View>
      )}

      {/* Bottom stack row with pile labels - dev mode only */}
      {animated && (
        <View style={[styles.bottomStackRow, { height: BOTTOM_STACK_HEIGHT }]}>
          {Array.from({ length: numberOfLanes }).map((_, i) => (
            <View
              key={`pile-label-${i}`}
              style={[styles.pileLabelContainer, { left: i * laneWidth, width: laneWidth }]}
            >
              <Text style={styles.pileLabel}>Pile {i + 1}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Unified card overlay - dev mode only */}
      {animated && (
        <View style={styles.cardOverlay} pointerEvents="none">
          {cardScreenPositions.map(({ faceValue, x, y, zIndex, color }) => (
            <View
              key={faceValue}
              style={[
                styles.deckCard,
                {
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  backgroundColor: color,
                  left: x,
                  top: y,
                  zIndex,
                },
              ]}
            >
              {faceUp && <Text style={styles.deckCardNumber}>{permutation[faceValue] + 1}</Text>}
            </View>
          ))}
          {showGoalDeck && permutation.map((faceValue, displayIndex) => (
            <View
              key={`goal-${displayIndex}`}
              style={[
                styles.deckCard,
                styles.goalDeckCard,
                {
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  left: deckXPositions[displayIndex],
                  top: goalDeckY,
                  zIndex: numberOfCards - displayIndex,
                },
              ]}
            >
              <Text style={styles.deckCardNumber}>{faceValue + 1}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Round status - centered on track */}
      <View style={[styles.roundStatusDisplay, { top: topDeckHeight + 10 }]}>
        <Text style={styles.roundStatusText}>
          {`Round ${currentRound + 1}/${numberOfRounds} - ${
            animated
              ? cardStates.every(c => c.state === 'collected')
                ? 'Finished'
                : cardStates.some(c => c.state === 'deck' || c.state === 'falling')
                  ? 'Dealing'
                  : 'Stacking'
              : trackTime >= maxTrackTime
                ? 'Finished'
                : 'Dealing'
          }`}
        </Text>
      </View>

      {/* Remaining Display - positioned in top right margin */}
      <View style={styles.remainingDisplay}>
        <Text style={styles.remainingHeader}>Remaining:</Text>
        {scrollSpeed > 0 ? (() => {
          const timePerRound = scrollHelper.timePerRound;
          const elapsed = scrollHelper.trackTime(scrollY) - minTrackTime;
          const currentRoundTime = Math.max(0, timePerRound - elapsed);
          const remainingRounds = numberOfRounds - currentRound - 1;
          const totalTime = currentRoundTime + (remainingRounds * timePerRound);
          const cardsRemaining = cardStates.filter(c => c.state === 'deck' || c.state === 'falling').length;
          return (
            <>
              <View style={styles.remainingRow}>
                <Text style={styles.remainingLabel}>Cards in Round</Text>
                <Text style={styles.remainingValue}>{cardsRemaining}/{numberOfCards}</Text>
              </View>
              <View style={styles.remainingRow}>
                <Text style={styles.remainingLabel}>Time in Round</Text>
                <Text style={styles.remainingValue}>{currentRoundTime.toFixed(1)}s</Text>
              </View>
              <View style={styles.remainingRow}>
                <Text style={styles.remainingLabel}>Time in Shuffle</Text>
                <Text style={styles.remainingValue}>{totalTime.toFixed(1)}s</Text>
              </View>
            </>
          );
        })() : <Text style={styles.remainingValue}>∞</Text>}
        {SHOW_DEBUG_HUD && numberOfCards <= 40 && (
          <Text style={styles.sequenceText}>
            {permutation.map(n => n + 1).join(' ')}
          </Text>
        )}
      </View>

      {/* Debug HUD */}
      {SHOW_DEBUG_HUD && (
        <View style={styles.debugHUD}>
          <Text style={styles.debugText}>isTouching: {isTouching ? '✓' : '✗'}</Text>
          <Text style={styles.debugText}>isRegularScrolling: {isRegularScrolling ? '✓' : '✗'}</Text>
          <Text style={styles.debugText}>isMomentumScrolling: {isMomentumScrolling ? '✓' : '✗'}</Text>
          <Text style={styles.debugText}>isScrolling: {isScrolling ? '✓' : '✗'}</Text>
          <Text style={styles.debugText}>awaitingMomentum: {awaitingMomentumScroll ? '✓' : '✗'}</Text>
          <Text style={styles.debugText}>inhibitAutoScroll: {inhibitAutoScroll ? '✓' : '✗'}</Text>
          <Text style={styles.debugText}>scrollY: {Math.round(scrollY)}</Text>
        </View>
      )}

      {/* Bottom button row */}
      <View style={styles.bottomButtonRow}>
          <TouchableOpacity
            style={styles.bottomBarButton}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.buttonText}>Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBarButton, inhibitAutoScroll && styles.bottomButtonDisabled, shuffleHoldReady && styles.bottomButtonActive]}
            onPress={() => reShuffle()}
            onLongPress={() => setShuffleHoldReady(true)}
            onPressOut={() => { if (shuffleHoldReady) { reverse(); setShuffleHoldReady(false); } }}
            delayLongPress={700}
            disabled={inhibitAutoScroll}
          >
            <Text style={styles.buttonText}>{shuffleHoldReady ? 'Reverse' : 'Shuffle'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBarButton, inhibitAutoScroll && styles.bottomButtonDisabled, prevHoldReady && styles.bottomButtonActive]}
            onPress={() => {
              const newRound = Math.max(0, currentRound - 1);
              if (newRound !== currentRound) {
                setCurrentRound(newRound);
                resetScrollY();
              }
            }}
            onLongPress={() => setPrevHoldReady(true)}
            onPressOut={() => { if (prevHoldReady) { setCurrentRound(0); resetScrollY(); setPrevHoldReady(false); } }}
            delayLongPress={700}
            disabled={inhibitAutoScroll}
          >
            <Text style={styles.buttonText}>{prevHoldReady ? 'Restart Shuffle' : 'Prev Round'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBarButton, inhibitAutoScroll && styles.bottomButtonDisabled]}
            onPress={() => {
              const newRound = Math.min(Math.max(0, numberOfRounds - 1), currentRound + 1);
              if (newRound !== currentRound) {
                setCurrentRound(newRound);
                resetScrollY();
              }
            }}
            disabled={inhibitAutoScroll}
          >
            <Text style={styles.buttonText}>Next Round</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBarButton, inhibitAutoScroll && styles.bottomButtonDisabled]}
            onPress={resetScrollY}
            disabled={inhibitAutoScroll}
          >
            <Text style={styles.buttonText}>Restart Round</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBarButton, inhibitAutoScroll && styles.bottomButtonDisabled]}
            onPress={() => setIsPaused(!isPaused)}
            disabled={inhibitAutoScroll}
          >
            <Text style={styles.buttonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.bottomBarButton}
            onPress={() => BackHandler.exitApp()}
          >
            <Text style={styles.buttonText}>Exit</Text>
          </TouchableOpacity>
        )}
      </View>

      <MenuPanel
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        numberOfCards={numberOfCards}
        setNumberOfCards={setNumberOfCards}
        numberOfLanes={numberOfLanes}
        setNumberOfLanes={(m) => {
          setNumberOfLanes(m);
          setCurrentRound(0);
          resetScrollY();
        }}
        scrollSpeed={scrollSpeed}
        setScrollSpeed={setScrollSpeed}
        animated={animated}
        setAnimated={setAnimated}
        showGoalDeck={showGoalDeck}
        setShowGoalDeck={setShowGoalDeck}
        faceUp={faceUp}
        setFaceUp={setFaceUp}
      />

      <StatusBar style="auto" />
    </View>
  );
}

function makeStyles(scale: number) {
  const s = (n: number) => Math.round(n * scale);
  const f = (n: number) => Math.min(Math.round(n * scale), n); // font: shrinks on small screens, never grows
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#2a2a3a',
    },
    backgroundImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.65,
    },
    trackPanelFull: {
      flex: 1,
      position: 'relative',
    },
    topDeckRow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      // height is set dynamically based on showGoalDeck
      backgroundColor: 'rgba(15, 20, 45, 0.85)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(100, 110, 180, 0.3)',
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      zIndex: 100,
      paddingLeft: s(10),
    },
    deckLabelsLeft: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    deckLabel: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: Math.min(s(10), 14),
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'right',
      paddingRight: s(10),
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: f(8),
      gap: f(10),
    },
    checkbox: {
      width: f(18),
      height: f(18),
      borderRadius: f(3),
      borderWidth: 2,
      borderColor: '#8b9de8',
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#6875c4',
      borderColor: '#6875c4',
    },
    checkmark: {
      color: '#fff',
      fontSize: f(12),
      fontWeight: '700',
      lineHeight: f(14),
    },
    checkboxLabel: {
      color: '#dde1f5',
      fontSize: f(13),
    },
    checkboxDisabled: {
      borderColor: 'rgba(139, 157, 232, 0.3)',
      backgroundColor: 'rgba(104, 117, 196, 0.25)',
    },
    checkmarkDisabled: {
      color: 'rgba(255, 255, 255, 0.35)',
    },
    checkboxLabelDisabled: {
      color: 'rgba(221, 225, 245, 0.3)',
    },
    bottomStackRow: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(15, 20, 50, 0.85)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(100, 110, 180, 0.3)',
      zIndex: 100,
    },
    pileLabelContainer: {
      position: 'absolute',
      top: -s(20),
      alignItems: 'center',
    },
    pileLabel: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: Math.min(s(8), 11),
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    cardOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 150,
    },
    placeholderText: {
      color: '#666',
      fontSize: f(18),
      fontWeight: '600',
    },
    deckCard: {
      position: 'absolute',
      borderRadius: s(6),
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
    goalDeckCard: {
      backgroundColor: '#444',
      borderColor: '#888',
    },
    deckCardNumber: {
      color: '#fff',
      fontSize: f(14),
      fontWeight: 'bold',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    scrollView: {
      flex: 1,
      marginBottom: 0,
    },
    scrollContent: {
      alignItems: 'center',
    },
    track: {
      backgroundColor: 'transparent',
      flexDirection: 'row',
    },
    lane: {
      flex: 1,
    },
    ghostNote: {
      position: 'absolute',
      borderRadius: s(6),
      borderWidth: 2,
      borderStyle: 'dashed',
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    ghostNoteNumber: {
      fontSize: f(18),
      fontWeight: 'bold',
      opacity: 0.7,
    },
    barNote: {
      position: 'absolute',
    },
    barNoteNumber: {
      position: 'absolute',
      fontSize: Math.min(s(13), 18),
      fontWeight: 'bold',
      color: '#e8ff00',
    },
    debugHUD: {
      position: 'absolute',
      top: s(10),
      right: s(10),
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: s(12),
      borderRadius: s(8),
      borderWidth: 1,
      borderColor: '#4a4a4a',
    },
    debugText: {
      color: '#fff',
      fontSize: f(12),
      fontFamily: 'monospace',
      marginVertical: 2,
    },
    bottomButtonRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: 'rgba(15, 20, 50, 0.92)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(100, 110, 180, 0.3)',
      zIndex: 200, // Above cardOverlay (150) - card zIndex values are confined within overlay's stacking context
    },
    centeredButtons: {
      flexDirection: 'row',
      alignItems: 'stretch',
      flex: 1,
    },
    navigationButtons: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    bottomBarButton: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Math.max(s(10), 18),
      paddingHorizontal: s(4),
      backgroundColor: '#6875c4',
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    bottomButton: {
      backgroundColor: '#6875c4',
      paddingHorizontal: s(16),
      paddingVertical: s(8),
      borderRadius: s(8),
    },
    bottomButtonDisabled: {
      backgroundColor: '#3a3f60',
      opacity: 0.5,
    },
    bottomButtonActive: {
      backgroundColor: '#22c55e',
    },
    buttonText: {
      color: '#dde1f5',
      fontSize: Math.max(s(10), 13),
      fontWeight: '600',
      textAlign: 'center',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuPanel: {
      width: '60%',
      maxWidth: 420,
      height: '80%',
      maxHeight: 520,
      backgroundColor: 'rgba(15, 20, 50, 0.92)',
      borderRadius: f(12),
      borderWidth: 1,
      borderColor: 'rgba(100, 110, 180, 0.3)',
    },
    menuScrollView: {
      flex: 1,
    },
    menuScrollContent: {
      padding: f(32),
      justifyContent: 'center',
      minHeight: '100%',
    },
    menuTitle: {
      fontSize: f(16),
      fontWeight: 'bold',
      marginBottom: f(24),
      textAlign: 'center',
      color: '#fff',
    },
    settingControl: {
      marginBottom: f(16),
    },
    settingLabel: {
      fontSize: f(14),
      fontWeight: '600',
      marginBottom: f(6),
      color: '#fff',
    },
    settingButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingButton: {
      backgroundColor: '#6875c4',
      width: f(MIN_TOUCH_TARGET),
      height: f(MIN_TOUCH_TARGET),
      borderRadius: f(MIN_TOUCH_TARGET / 2),
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingButtonDisabled: {
      backgroundColor: '#3a3f60',
      opacity: 0.5,
    },
    settingButtonText: {
      color: '#fff',
      fontSize: f(16),
      fontWeight: 'bold',
    },
    settingValue: {
      fontSize: f(20),
      fontWeight: '700',
      color: '#fff',
      minWidth: f(40),
      textAlign: 'center',
    },
    homepageLink: {
      alignItems: 'center',
      marginTop: f(16),
      marginBottom: f(8),
    },
    homepageLinkText: {
      color: '#8b9de8',
      fontSize: f(14),
      textDecorationLine: 'underline',
    },
    closeButton: {
      backgroundColor: '#FF3B30',
      paddingHorizontal: s(24),
      paddingVertical: s(12),
      borderRadius: s(8),
      alignItems: 'center',
      marginTop: s(8),
    },
    presetButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: f(6),
      marginTop: f(10),
    },
    presetButton: {
      flex: 1,
      backgroundColor: 'rgba(80, 90, 160, 0.4)',
      paddingVertical: f(10),
      borderRadius: f(8),
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(100, 110, 180, 0.4)',
    },
    presetButtonSelected: {
      backgroundColor: '#6875c4',
      borderColor: '#8b9de8',
    },
    presetButtonText: {
      color: '#fff',
      fontSize: f(14),
      fontWeight: '600',
    },
    presetButtonTextSelected: {
      color: '#fff',
      fontWeight: 'bold',
    },
    sliderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: f(6),
    },
    sliderValue: {
      color: '#fff',
      fontSize: f(16),
      fontWeight: '600',
    },
    slider: {
      width: '100%',
      height: f(48),
    },
    sliderNotches: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: f(8),
      marginTop: -f(8),
    },
    sliderNotchText: {
      color: '#999',
      fontSize: f(12),
      fontWeight: '600',
    },
    roundStatusDisplay: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 250,
    },
    roundStatusText: {
      color: '#e8ff00',
      fontSize: f(16),
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      paddingHorizontal: s(12),
      paddingVertical: s(4),
      borderRadius: s(8),
    },
    remainingDisplay: {
      position: 'absolute',
      top: s(10),
      right: s(10),
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: s(8),
      padding: s(8),
      zIndex: 250,
      minWidth: s(80),
    },
    remainingHeader: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: f(10),
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: s(4),
    },
    remainingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 2,
    },
    remainingLabel: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: f(11),
      marginRight: s(10),
    },
    remainingValue: {
      color: '#c9b620ff',
      fontSize: f(12),
      fontWeight: 'bold',
      fontVariant: ['tabular-nums'],
      minWidth: s(40),
      textAlign: 'right',
    },
    sequenceText: {
      color: '#22c55e',
      fontSize: f(14),
      fontWeight: '600',
      marginTop: s(6),
      fontFamily: 'monospace',
      textShadowColor: 'rgba(0, 0, 0, 0.9)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
  });
}
