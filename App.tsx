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
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPosition = useRef(0);

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

  // Auto-scroll effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTouching && scrollViewRef.current) {
        scrollPosition.current += SCROLL_SPEED;

        // Reset to top when reaching bottom
        if (scrollPosition.current >= TRACK_HEIGHT - Dimensions.get('window').height) {
          scrollPosition.current = 0;
        }

        scrollViewRef.current.scrollTo({
          y: scrollPosition.current,
          animated: false,
        });
      }
    }, 16); // ~60 FPS

    return () => clearInterval(interval);
  }, [isTouching]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onTouchStart={() => setIsTouching(true)}
        onTouchEnd={() => setIsTouching(false)}
        onScrollBeginDrag={() => setIsTouching(true)}
        onScrollEndDrag={() => setIsTouching(false)}
        onMomentumScrollEnd={() => setIsTouching(false)}
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

      {/* Menu button overlay */}
      <TouchableOpacity
        style={styles.openButton}
        onPress={() => setMenuVisible(true)}
      >
        <Text style={styles.buttonText}>Open Menu</Text>
      </TouchableOpacity>

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
  openButton: {
    position: 'absolute',
    top: 20,
    right: 20,
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
