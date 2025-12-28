import { useState, useEffect, useMemo, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const TRACK_HEIGHT = 3000; // Extra tall for scrolling
const LANE_COUNT = 4;
const NOTE_COUNT = 50; // Number of random notes
const SCROLL_SPEED = 2; // Pixels per frame (configurable - higher = faster)

// Guitar Hero-style note colors
const NOTE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

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
  return (
    <View style={styles.settingControl}>
      <Text style={styles.settingLabel}>Number of Cards</Text>
      <View style={styles.settingButtons}>
        <TouchableOpacity
          style={[styles.settingButton, value <= 1 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.max(1, value - 10))}
          disabled={value <= 1}
        >
          <Text style={styles.settingButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.settingValue}>{value}</Text>
        <TouchableOpacity
          style={[styles.settingButton, value >= 200 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.min(200, value + 10))}
          disabled={value >= 200}
        >
          <Text style={styles.settingButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type NumberOfLanesControlProps = {
  value: number;
  onChange: (value: number) => void;
};

function NumberOfLanesControl({ value, onChange }: NumberOfLanesControlProps) {
  return (
    <View style={styles.settingControl}>
      <Text style={styles.settingLabel}>Number of Lanes</Text>
      <View style={styles.settingButtons}>
        <TouchableOpacity
          style={[styles.settingButton, value <= 1 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
        >
          <Text style={styles.settingButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.settingValue}>{value}</Text>
        <TouchableOpacity
          style={[styles.settingButton, value >= 8 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.min(8, value + 1))}
          disabled={value >= 8}
        >
          <Text style={styles.settingButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type SpeedControlProps = {
  value: number;
  onChange: (value: number) => void;
};

function SpeedControl({ value, onChange }: SpeedControlProps) {
  return (
    <View style={styles.settingControl}>
      <Text style={styles.settingLabel}>Speed</Text>
      <View style={styles.settingButtons}>
        <TouchableOpacity
          style={[styles.settingButton, value <= 1 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
        >
          <Text style={styles.settingButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.settingValue}>{value}</Text>
        <TouchableOpacity
          style={[styles.settingButton, value >= 10 && styles.settingButtonDisabled]}
          onPress={() => onChange(Math.min(10, value + 1))}
          disabled={value >= 10}
        >
          <Text style={styles.settingButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
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

export default function App() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [isRegularScrolling, setIsRegularScrolling] = useState(false);
  const [isMomentumScrolling, setIsMomentumScrolling] = useState(false);
  const [awaitingMomentumScroll, setAwaitingMomentumScroll] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Game settings
  const [numberOfCards, setNumberOfCards] = useState(NOTE_COUNT);
  const [numberOfLanes, setNumberOfLanes] = useState(LANE_COUNT);
  const [scrollSpeed, setScrollSpeed] = useState(SCROLL_SPEED);

  const isScrolling = isRegularScrolling || isMomentumScrolling;
  const inhibitAutoScroll = isTouching || isScrolling || awaitingMomentumScroll;

  // Generate random notes
  const notes = useMemo(() => {
    const generatedNotes: Note[] = [];
    for (let i = 0; i < numberOfCards; i++) {
      const lane = Math.floor(Math.random() * numberOfLanes);
      generatedNotes.push({
        id: i,
        lane,
        position: Math.random() * (TRACK_HEIGHT - 100) + 50,
        color: NOTE_COLORS[lane % NOTE_COLORS.length],
      });
    }
    return generatedNotes;
  }, [numberOfCards, numberOfLanes]);

  useEffect(() => {
    // Lock to landscape mode but allow both orientations
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  // Sync state to ScrollView only during auto-scroll (not manual interaction)
  useEffect(() => {
    if (!inhibitAutoScroll && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: scrollY,
        animated: false,
      });
    }
  }, [scrollY, inhibitAutoScroll]);

  // Auto-scroll effect - updates state when not touching AND not scrolling
  useEffect(() => {

    if (inhibitAutoScroll) return;

    const interval = setInterval(() => {
      setScrollY((prev) => {
        const newY = prev + scrollSpeed;

        // Reset to top when reaching bottom
        if (newY >= TRACK_HEIGHT - Dimensions.get('window').height) {
          return 0;
        }

        return newY;
      });
    }, 16); // ~60 FPS

    return () => clearInterval(interval);
  }, [inhibitAutoScroll, scrollSpeed]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onTouchStart={() => setIsTouching(true)}
        onTouchEnd={() => setIsTouching(false)}
        onScrollBeginDrag={() => setIsRegularScrolling(true)}
        onScrollEndDrag={(event) => {
          setScrollY(event.nativeEvent.contentOffset.y);
          setIsTouching(false);  // Finger lifted
          setIsRegularScrolling(false);
          setAwaitingMomentumScroll(true);
          const timeoutId = setTimeout(() => {
            setAwaitingMomentumScroll(false);
          }, 50);
        }}
        onMomentumScrollBegin={() => {
          setIsMomentumScrolling(true);
        }}
        onMomentumScrollEnd={(event) => {
          setScrollY(event.nativeEvent.contentOffset.y);
          setIsMomentumScrolling(false);
        }}
      >
        <View style={styles.track}>
          {/* Render vertical lanes */}
          {Array.from({ length: numberOfLanes }).map((_, index) => (
            <View key={index} style={styles.lane} />
          ))}

          {/* Render notes */}
          {notes.map((note) => {
            const laneWidth = Dimensions.get('window').width / numberOfLanes;
            return (
              <View
                key={note.id}
                style={[
                  styles.note,
                  {
                    backgroundColor: note.color,
                    left: note.lane * laneWidth + laneWidth / 2 - 30,
                    top: note.position,
                  },
                ]}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Debug HUD */}
      <View style={styles.debugHUD}>
        <Text style={styles.debugText}>isTouching: {isTouching ? '✓' : '✗'}</Text>
        <Text style={styles.debugText}>isRegularScrolling: {isRegularScrolling ? '✓' : '✗'}</Text>
        <Text style={styles.debugText}>isMomentumScrolling: {isMomentumScrolling ? '✓' : '✗'}</Text>
        <Text style={styles.debugText}>isScrolling: {isScrolling ? '✓' : '✗'}</Text>
        <Text style={styles.debugText}>awaitingMomentum: {awaitingMomentumScroll ? '✓' : '✗'}</Text>
        <Text style={styles.debugText}>inhibitAutoScroll: {inhibitAutoScroll ? '✓' : '✗'}</Text>
        <Text style={styles.debugText}>scrollY: {Math.round(scrollY)}</Text>
      </View>

      {/* Bottom button row */}
      <View style={styles.bottomButtonRow}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.buttonText}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => {/* TODO: Shuffle */}}
        >
          <Text style={styles.buttonText}>Shuffle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => {/* TODO: Reverse */}}
        >
          <Text style={styles.buttonText}>Reverse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => {/* TODO: Restart Round */}}
        >
          <Text style={styles.buttonText}>Restart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => {/* TODO: Prev Round */}}
        >
          <Text style={styles.buttonText}>Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => {/* TODO: Next Round */}}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <MenuPanel
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        numberOfCards={numberOfCards}
        setNumberOfCards={setNumberOfCards}
        numberOfLanes={numberOfLanes}
        setNumberOfLanes={setNumberOfLanes}
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
  scrollView: {
    flex: 1,
    marginBottom: 0,
  },
  scrollContent: {
    alignItems: 'center',
  },
  track: {
    width: Dimensions.get('window').width,
    height: TRACK_HEIGHT,
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
  note: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 2,
    borderTopColor: '#4a4a4a',
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
  closeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
});
