import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CustomMarker = ({ isAvailable }) => {
  return (
    <View style={[styles.markerContainer, { backgroundColor: isAvailable ? '#2ecc71' : '#e74c3c' }]}>
      <Ionicons name="flash" size={16} color="black" />
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'black',
  },
});

export default CustomMarker; 