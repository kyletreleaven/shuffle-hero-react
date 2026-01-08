import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type ViewModeToggleProps = {
  viewMode: 'track' | 'split';
  onToggle: () => void;
  disabled?: boolean;
};

export function ViewModeToggle({ viewMode, onToggle, disabled = false }: ViewModeToggleProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onToggle}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>
        {viewMode === 'track' ? 'Split View' : 'Track Only'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
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
  buttonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
