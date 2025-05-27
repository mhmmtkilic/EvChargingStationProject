import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';

const RadiusSlider = ({ 
  radius,
  onRadiusChange,
  minRadius = 1,
  maxRadius = 10,
  step = 0.5,
  presets = [1, 2, 5, 10]
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Arama Yarıçapı</Text>
      
      <View style={styles.sliderContainer}>
        <Text style={styles.valueLabel}>{minRadius} km</Text>
        <Slider
          style={styles.slider}
          minimumValue={minRadius}
          maximumValue={maxRadius}
          step={step}
          value={radius}
          onValueChange={onRadiusChange}
          minimumTrackTintColor="#3b82f6"
          maximumTrackTintColor="#e2e8f0"
          thumbTintColor="#3b82f6"
        />
        <Text style={styles.valueLabel}>{maxRadius} km</Text>
      </View>
      
      <Text style={styles.currentValue}>{radius.toFixed(1)} km</Text>
      
      <View style={styles.presetsContainer}>
        {presets.map(preset => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              Math.abs(radius - preset) < 0.1 && styles.activePresetButton
            ]}
            onPress={() => onRadiusChange(preset)}
          >
            <Text style={[
              styles.presetButtonText,
              Math.abs(radius - preset) < 0.1 && styles.activePresetButtonText
            ]}>
              {preset} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 16,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  valueLabel: {
    fontSize: 12,
    color: '#64748b',
    width: 40,
    textAlign: 'center',
  },
  currentValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 16,
  },
  presetsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  activePresetButton: {
    backgroundColor: '#3b82f6',
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  activePresetButtonText: {
    color: 'white',
  },
});

export default RadiusSlider; 