import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const TRACK_HEIGHT = 3000; // Extra tall for scrolling
const LANE_COUNT = 4;

export default function App() {
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    // Lock to landscape mode but allow both orientations
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.track}>
          {/* Render vertical lanes */}
          {Array.from({ length: LANE_COUNT }).map((_, index) => (
            <View key={index} style={styles.lane} />
          ))}
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
