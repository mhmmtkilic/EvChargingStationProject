import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BottomNavBar = ({ onTabPress, activeTab = 'home' }) => {
  const getIconColor = (tabName) => {
    return activeTab === tabName ? '#2ECC71' : '#666';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => onTabPress('home')}
      >
        <Ionicons 
          name="home-sharp" 
          size={24} 
          color={getIconColor('home')} 
        />
        <Text style={[styles.tabText, { color: getIconColor('home') }]}>Ana Sayfa</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => onTabPress('charger')}
      >
        <Ionicons 
          name="flash-sharp" 
          size={24} 
          color={getIconColor('charger')} 
        />
        <Text style={[styles.tabText, { color: getIconColor('charger') }]}>Şarj Et</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.tab, styles.centerTab]} 
        onPress={() => onTabPress('stations')}
      >
        <View style={styles.centerButton}>
          <Ionicons name="map" size={32} color="white" />
        </View>
        <Text style={[styles.tabText, styles.centerText]}>İstasyonlar</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => onTabPress('battery')}
      >
        <Ionicons 
          name="battery-charging-sharp" 
          size={24} 
          color={getIconColor('battery')} 
        />
        <Text style={[styles.tabText, { color: getIconColor('battery') }]}>Batarya</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => onTabPress('profile')}
      >
        <Ionicons 
          name="person-sharp" 
          size={24} 
          color={getIconColor('profile')} 
        />
        <Text style={[styles.tabText, { color: getIconColor('profile') }]}>Profil</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingBottom: 25,
    shadowColor: '#000',
    shadowOffset: { 
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    color: '#666',
  },
  centerTab: {
    top: -15,
  },
  centerButton: {
    backgroundColor: '#2ECC71',
    width: 65,
    height: 65,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  centerText: {
    color: '#2ECC71',
    fontWeight: '600',
    marginTop: 8,
  },
});

export default BottomNavBar; 