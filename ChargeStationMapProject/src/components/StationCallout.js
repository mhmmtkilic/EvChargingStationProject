import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StationCallout = ({ station }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{station.name}</Text>
        <View style={[
          styles.statusIndicator, 
          { backgroundColor: station.availability ? '#2ecc71' : '#e74c3c' }
        ]}>
          <Text style={styles.statusText}>
            {station.availability ? 'Müsait' : 'Meşgul'}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="flash" size={16} color="#34495e" />
        <Text style={styles.infoText}>
          {station.charging_type} • {station.power_kW} kW
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="location" size={16} color="#34495e" />
        <Text style={styles.addressText}>{station.address}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#34495e',
  },
  addressText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#7f8c8d',
    flex: 1,
  },
});

export default StationCallout; 