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

export default function App() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [awaitingMomentumScroll, setAwaitingMomentumScroll] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const inhibitAutoScroll = isTouching || isScrolling || awaitingMomentumScroll;

  // Generate random notes
  const notes = useMemo(() => {
    const generatedNotes: Note[] = [];
    for (let i = 0; i < NOTE_COUNT; i++) {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      generatedNotes.push({
        id: i,
        lane,
        position: Math.random() * (TRACK_HEIGHT - 100) + 50,
        color: NOTE_COLORS[lane],
      });
    }
    return generatedNotes;
  }, []);

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
        const newY = prev + SCROLL_SPEED;

        // Reset to top when reaching bottom
        if (newY >= TRACK_HEIGHT - Dimensions.get('window').height) {
          return 0;
        }

        return newY;
      });
    }, 16); // ~60 FPS
    
    return () => clearInterval(interval);
  }, [inhibitAutoScroll]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onTouchStart={() => setIsTouching(true)}
        onTouchEnd={() => setIsTouching(false)}
        onScrollBeginDrag={() => setIsScrolling(true)}
        onScrollEndDrag={(event) => {
          setScrollY(event.nativeEvent.contentOffset.y);
          setIsScrolling(false);
          setAwaitingMomentumScroll(true);
          const timeoutId = setTimeout(() => {
            setAwaitingMomentumScroll(false);
          }, 50);
        }}
        onMomentumScrollBegin={() => {
          setIsScrolling(true);
        }}
        onMomentumScrollEnd={(event) => {
          setScrollY(event.nativeEvent.contentOffset.y);
          setIsScrolling(false);
        }}
      >
        <View style={styles.track}>
          {/* Render vertical lanes */}
          {Array.from({ length: LANE_COUNT }).map((_, index) => (
            <View key={index} style={styles.lane} />
          ))}

          {/* Render notes */}
          {notes.map((note) => {
            const laneWidth = Dimensions.get('window').width / LANE_COUNT;
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
      </View>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.menuPanel}>
            <Text style={styles.menuTitle}>Options Menu</Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.buttonText}>Close Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
});
