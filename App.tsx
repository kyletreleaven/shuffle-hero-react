import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Dimensions, BackHandler, Platform, useWindowDimensions, Linking } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ShuffleUtil from './ShuffleUtil';
import { ScrollHelper, CARD_SPACING, START_PADDING_SECONDS } from './ScrollHelper';
import { calculateDeckXPositions } from './utils/AnimationHelper';

const LANE_COUNT = 5;
const NOTE_COUNT = 40; // Number of cards
const SCROLL_SPEED = 1.5; // Cards per second (configurable)
const SHOW_DEBUG_HUD = false; // Toggle debug HUD visibility
const STORAGE_KEY = 'shuffle-hero-preferences'; // localStorage key for user preferences

// Unified track view layout constants
const TOP_DECK_HEIGHT = 100;     // Height for source/goal deck row at top
const BOTTOM_STACK_HEIGHT = 100; // Height for landing stacks at bottom
const CARD_WIDTH = 40;
const CARD_HEIGHT = 60;

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
};

type NumberOfCardsControlProps = {
  value: number;
  onChange: (value: number) => void;
};

function NumberOfCardsControl({ value, onChange }: NumberOfCardsControlProps) {
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

function MenuPanel({ visible, onClose, numberOfCards, setNumberOfCards, numberOfLanes, setNumberOfLanes, scrollSpeed, setScrollSpeed }: MenuPanelProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.menuPanel}>
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

            <TouchableOpacity
              onPress={() => Linking.openURL('https://kyletreleaven.github.io/shuffle-hero/')}
              style={styles.homepageLink}
            >
              <Text style={styles.homepageLinkText}>Visit Shuffle Hero Homepage</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Close Menu</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
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

  // Autoscroll state management
  const autoScrollState = useAutoScrollViewState();
  const { isTouching, isRegularScrolling, isMomentumScrolling, isScrolling, awaitingMomentumScroll, isPaused, setIsPaused, inhibitAutoScroll } = autoScrollState;

  // Game settings - initialize with defaults, will load saved values in effect
  const [numberOfLanes, setNumberOfLanes] = useState(LANE_COUNT);
  const [scrollSpeed, setScrollSpeed] = useState(SCROLL_SPEED);

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

  const setNumberOfCards = (n: number) => reShuffle(n);

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
  }, [shuffle.seqs[currentRound]]);

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
  }, [numberOfCards, numberOfLanes, scrollSpeed]);

  const handleScrollYChange = setScrollY;

  const laneWidth = windowDimensions.width / numberOfLanes;

  // Calculate deck positions for source and goal decks
  const deckXPositions = useMemo(() =>
    calculateDeckXPositions(numberOfCards, windowDimensions.width, CARD_WIDTH),
    [numberOfCards, windowDimensions.width]
  );
  const deckY = (TOP_DECK_HEIGHT - CARD_HEIGHT) / 2; // Center cards vertically in deck row

  // Calculate track time and card dealing state
  const trackTime = scrollHelper.trackTime(scrollY);
  const actualTrackHeight = windowDimensions.height; // Full height now

  // Helper to get deal timing for a card at a given position in sequence
  const getDealStartTime = useCallback((pos: number) => {
    const yPos = scrollHelper.cardY(pos);
    const beatLineOffset = actualTrackHeight / 2;
    const scrollYAtBeatLine = yPos - beatLineOffset;
    const beatLineTime = scrollHelper.trackTime(scrollYAtBeatLine);
    const dealDuration = scrollHelper.timePerRound / (numberOfCards * 2);
    return beatLineTime - dealDuration;
  }, [scrollHelper, actualTrackHeight, numberOfCards]);

  const dealDuration = scrollHelper.timePerRound / (numberOfCards * 2);

  // Calculate which cards are in which state
  const cardStates = useMemo(() => {
    const sequence = shuffle.seqs[currentRound];
    const states: Array<{
      faceValue: number;
      seqIndex: number;
      lane: number;
      state: 'deck' | 'falling' | 'stack' | 'collecting' | 'collected';
      dealProgress?: number;
      collectProgress?: number;
      stackIndex?: number; // Position in stack (0 = top/newest)
    }> = [];

    // Calculate collect phase timing
    const lastCardDealTime = getDealStartTime(numberOfCards - 1) + dealDuration;
    const pauseBeforeCollect = 0.5;
    const collectPhaseStart = Math.min(lastCardDealTime + pauseBeforeCollect, scrollHelper.maxTime - 0.5);
    const collectPhaseEnd = scrollHelper.maxTime;
    const totalCollectTime = collectPhaseEnd - collectPhaseStart;
    const timePerPile = totalCollectTime / numberOfLanes;

    // Track cards per pile for stack index calculation
    const pilesLandedCount: number[] = Array(numberOfLanes).fill(0);

    for (let seqIndex = 0; seqIndex < sequence.length; seqIndex++) {
      const faceValue = sequence[seqIndex];
      const lane = shuffle.rounds[currentRound][faceValue];
      const cardDealStartTime = getDealStartTime(seqIndex);
      const cardDealEndTime = cardDealStartTime + dealDuration;

      let state: 'deck' | 'falling' | 'stack' | 'collecting' | 'collected';
      let dealProgress: number | undefined;
      let collectProgress: number | undefined;
      let stackIndex: number | undefined;

      if (trackTime < cardDealStartTime) {
        state = 'deck';
      } else if (trackTime < cardDealEndTime) {
        state = 'falling';
        dealProgress = (trackTime - cardDealStartTime) / dealDuration;
      } else if (trackTime < collectPhaseStart) {
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
  }, [shuffle, currentRound, trackTime, numberOfCards, numberOfLanes, getDealStartTime, dealDuration, scrollHelper]);

  // Group cards by lane for stack rendering
  const stackCards = useMemo(() => {
    const stacks: Array<Array<{ faceValue: number; stackIndex: number }>> = Array.from(
      { length: numberOfLanes },
      () => []
    );

    cardStates.forEach(card => {
      if (card.state === 'stack' && card.stackIndex !== undefined) {
        stacks[card.lane].push({ faceValue: card.faceValue, stackIndex: card.stackIndex });
      }
    });

    return stacks;
  }, [cardStates, numberOfLanes]);

  return (
    <View style={styles.container}>
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
                  { backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#2a2a2a' }
                ]}
              />
            ))}

            {/* Render ghost notes (dashed outlines) */}
            {notes.map((note) => (
              <View
                key={note.id}
                style={[
                  styles.ghostNote,
                  {
                    borderColor: note.color,
                    left: note.lane * laneWidth + laneWidth / 2 - 30,
                    top: note.position,
                  },
                ]}
              >
                <Text style={[styles.ghostNoteNumber, { color: note.color }]}>{note.id + 1}</Text>
              </View>
            ))}

            {/* Render falling cards (in track coordinate space) */}
            {cardStates
              .filter(card => card.state === 'falling')
              .map(card => {
                // Card position follows its ghost note position
                const cardX = card.lane * laneWidth + laneWidth / 2 - CARD_WIDTH / 2;
                const cardY = scrollHelper.cardY(card.seqIndex) - CARD_HEIGHT / 2 + 30; // Offset to center on ghost note
                const cardColor = NOTE_COLORS[card.lane % NOTE_COLORS.length];

                return (
                  <View
                    key={`falling-${card.faceValue}`}
                    style={[
                      styles.fallingCard,
                      {
                        backgroundColor: cardColor,
                        left: cardX,
                        top: cardY,
                        zIndex: 1000 + card.seqIndex, // Above ghost notes
                      },
                    ]}
                  >
                    <Text style={styles.deckCardNumber}>{card.faceValue + 1}</Text>
                  </View>
                );
              })}
          </View>
        </AutoScrollView>
      </View>

      {/* Top deck row - fixed position overlay */}
      <View style={styles.topDeckRow}>
        {/* Goal deck (dimmed, behind) - shows target permutation */}
        {permutation.map((faceValue, displayIndex) => (
          <View
            key={`goal-${displayIndex}`}
            style={[
              styles.deckCard,
              styles.goalDeckCard,
              {
                left: deckXPositions[displayIndex],
                top: deckY,
                zIndex: -1 - displayIndex,
              },
            ]}
          >
            <Text style={styles.deckCardNumber}>{faceValue + 1}</Text>
          </View>
        ))}
        {/* Source deck - show cards in deck or collected state */}
        {(() => {
          // Cards in deck state (not yet dealt)
          const deckCards = cardStates.filter(c => c.state === 'deck');
          const remainingDeckPositions = calculateDeckXPositions(
            deckCards.length,
            windowDimensions.width,
            CARD_WIDTH
          );

          // Cards that have been collected (finished collection animation)
          const collectedCards = cardStates.filter(c => c.state === 'collected');
          const nextSequence = shuffle.seqs[currentRound + 1];
          const collectedDeckPositions = calculateDeckXPositions(
            numberOfCards,
            windowDimensions.width,
            CARD_WIDTH
          );

          return (
            <>
              {/* Deck cards (not yet dealt) */}
              {deckCards.map((card, indexInRemaining) => (
                <View
                  key={`source-${card.faceValue}`}
                  style={[
                    styles.deckCard,
                    {
                      backgroundColor: NOTE_COLORS[card.lane % NOTE_COLORS.length],
                      left: remainingDeckPositions[indexInRemaining],
                      top: deckY,
                      zIndex: deckCards.length - indexInRemaining,
                    },
                  ]}
                >
                  <Text style={styles.deckCardNumber}>{card.faceValue + 1}</Text>
                </View>
              ))}
              {/* Collected cards (finished collection, ready for next round) */}
              {collectedCards.map(card => {
                const nextSeqIndex = nextSequence?.indexOf(card.faceValue) ?? card.seqIndex;
                return (
                  <View
                    key={`collected-${card.faceValue}`}
                    style={[
                      styles.deckCard,
                      {
                        backgroundColor: NOTE_COLORS[card.lane % NOTE_COLORS.length],
                        left: collectedDeckPositions[nextSeqIndex],
                        top: deckY,
                        zIndex: numberOfCards - nextSeqIndex,
                      },
                    ]}
                  >
                    <Text style={styles.deckCardNumber}>{card.faceValue + 1}</Text>
                  </View>
                );
              })}
            </>
          );
        })()}
      </View>

      {/* Collecting cards - animate from stack to deck (fixed overlay) */}
      {cardStates
        .filter(card => card.state === 'collecting' && card.collectProgress !== undefined)
        .map(card => {
          const progress = card.collectProgress!;
          // Ease-out cubic
          const t = 1 - Math.pow(1 - progress, 3);

          // Start position (stack)
          const stackX = card.lane * laneWidth + laneWidth / 2 - CARD_WIDTH / 2;
          const stackY = windowDimensions.height - BOTTOM_STACK_HEIGHT - 70 + 10; // bottom row top + padding

          // End position (top deck)
          const nextSequence = shuffle.seqs[currentRound + 1];
          const nextSeqIndex = nextSequence?.indexOf(card.faceValue) ?? card.seqIndex;
          const collectedDeckPositions = calculateDeckXPositions(
            numberOfCards,
            windowDimensions.width,
            CARD_WIDTH
          );
          const deckCardX = collectedDeckPositions[nextSeqIndex];

          // Interpolate
          const currentX = stackX + (deckCardX - stackX) * t;
          const currentY = stackY + (deckY - stackY) * t;
          const cardColor = NOTE_COLORS[card.lane % NOTE_COLORS.length];

          return (
            <View
              key={`collecting-${card.faceValue}`}
              style={[
                styles.deckCard,
                styles.collectingCard,
                {
                  backgroundColor: cardColor,
                  left: currentX,
                  top: currentY,
                  zIndex: 200 + card.seqIndex,
                },
              ]}
            >
              <Text style={styles.deckCardNumber}>{card.faceValue + 1}</Text>
            </View>
          );
        })}

      {/* Bottom stack row - fixed position overlay */}
      <View style={styles.bottomStackRow}>
        {/* Render landing stacks for each lane */}
        {stackCards.map((stack, laneIndex) => {
          const stackX = laneIndex * laneWidth + laneWidth / 2 - CARD_WIDTH / 2;
          const STACK_OFFSET = 8; // How much each card pushes down
          const stackTopY = 10; // Top padding in stack area

          return (
            <View key={laneIndex} style={[styles.stackContainer, { width: laneWidth }]}>
              {stack.map(({ faceValue, stackIndex }) => {
                // stackIndex 0 = most recently landed = at top
                // Higher stackIndex = older = pushed down
                const cardY = stackTopY + stackIndex * STACK_OFFSET;
                const cardColor = NOTE_COLORS[laneIndex % NOTE_COLORS.length];

                return (
                  <View
                    key={faceValue}
                    style={[
                      styles.deckCard,
                      {
                        backgroundColor: cardColor,
                        left: stackX,
                        top: cardY,
                        zIndex: stack.length - stackIndex, // Newest on top
                      },
                    ]}
                  >
                    <Text style={styles.deckCardNumber}>{faceValue + 1}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* Time Remaining Display */}
      <View style={styles.timeDisplay}>
        <Text style={styles.timeText}>
          {scrollSpeed > 0 ? (() => {
            const timePerRound = scrollHelper.timePerRound;
            const elapsed = scrollHelper.trackTime(scrollY) - minTrackTime;
            const currentRoundTime = timePerRound - elapsed;
            const remainingRounds = numberOfRounds - currentRound - 1;
            const totalTime = currentRoundTime + (remainingRounds * timePerRound);
            return `Round ${currentRound + 1}/${numberOfRounds} | ${currentRoundTime.toFixed(1)}s | Total: ${totalTime.toFixed(1)}s`;
          })() : '∞'}
        </Text>
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
        <View style={styles.centeredButtons}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.buttonText}>Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomButton, inhibitAutoScroll && styles.bottomButtonDisabled]}
            onPress={() => reShuffle()}
            disabled={inhibitAutoScroll}
          >
            <Text style={styles.buttonText}>Shuffle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomButton, inhibitAutoScroll && styles.bottomButtonDisabled]}
            onPress={reverse}
            disabled={inhibitAutoScroll}
          >
            <Text style={styles.buttonText}>Reverse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomButton, inhibitAutoScroll && styles.bottomButtonDisabled]}
            onPress={() => setIsPaused(!isPaused)}
            disabled={inhibitAutoScroll}
          >
            <Text style={styles.buttonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomButton, inhibitAutoScroll && styles.bottomButtonDisabled]}
            onPress={resetScrollY}
            disabled={inhibitAutoScroll}
          >
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.bottomButton, inhibitAutoScroll && styles.bottomButtonDisabled]}
              onPress={() => {
                const newRound = Math.max(0, currentRound - 1);
                if (newRound !== currentRound) {
                  setCurrentRound(newRound);
                  resetScrollY();
                }
              }}
              disabled={inhibitAutoScroll}
            >
              <Text style={styles.buttonText}>Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bottomButton, inhibitAutoScroll && styles.bottomButtonDisabled]}
              onPress={() => {
                const newRound = Math.min(Math.max(0, numberOfRounds - 1), currentRound + 1);
                if (newRound !== currentRound) {
                  setCurrentRound(newRound);
                  resetScrollY();
                }
              }}
              disabled={inhibitAutoScroll}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.bottomButton}
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
          resetScrollY();
        }}
        scrollSpeed={scrollSpeed}
        setScrollSpeed={setScrollSpeed}
      />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
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
    height: TOP_DECK_HEIGHT,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  bottomStackRow: {
    position: 'absolute',
    bottom: 70, // Above the bottom button row
    left: 0,
    right: 0,
    height: BOTTOM_STACK_HEIGHT,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    borderTopWidth: 2,
    borderTopColor: '#333',
    flexDirection: 'row',
    zIndex: 100,
  },
  stackContainer: {
    position: 'relative',
    height: '100%',
    overflow: 'hidden', // Cards pushed beyond visible area are clipped
  },
  placeholderText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  deckCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
  goalDeckCard: {
    backgroundColor: '#333',
    opacity: 0.3,
    borderColor: '#666',
  },
  collectingCard: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  deckCardNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  fallingCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
    marginBottom: 0,
  },
  scrollContent: {
    alignItems: 'center',
  },
  track: {
    backgroundColor: '#2a2a2a',
    flexDirection: 'row',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#4a4a4a',
  },
  lane: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#4a4a4a',
  },
  ghostNote: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostNoteNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  debugHUD: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  bottomButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 2,
    borderTopColor: '#4a4a4a',
  },
  centeredButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bottomButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Adjust last number (0.0-1.0) for overlay darkness
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPanel: {
    width: '60%',
    maxWidth: 500,
    height: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  menuScrollView: {
    flex: 1,
  },
  menuScrollContent: {
    padding: 40,
    justifyContent: 'center',
    minHeight: '100%',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#fff',
  },
  settingControl: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#fff',
  },
  settingButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingButtonDisabled: {
    backgroundColor: '#ccc',
  },
  settingButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    minWidth: 50,
    textAlign: 'center',
  },
  homepageLink: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  homepageLinkText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  presetButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#555',
  },
  presetButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  presetButtonText: {
    color: '#fff',
    fontSize: 18,
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
    marginBottom: 8,
  },
  sliderValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 60,
  },
  sliderNotches: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: -8,
  },
  sliderNotchText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  timeDisplay: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: '#c9b620ff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sequenceText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
