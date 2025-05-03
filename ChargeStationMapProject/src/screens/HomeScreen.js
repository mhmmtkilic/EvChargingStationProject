import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, PermissionsAndroid } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Callout } from 'react-native-maps';
import SearchBar from '../components/SearchBar';
import BottomNavBar from '../components/BottomNavBar';
import CustomMarker from '../components/CustomMarker';
import StationCallout from '../components/StationCallout';
import LocationButton from '../components/LocationButton';
import stationData from '../../station_information.json';

const HomeScreen = () => {
  const [region, setRegion] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapRef, setMapRef] = useState(null);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Konum İzni',
            message: 'Şarj istasyonlarını görebilmek için konum izni gerekiyor.',
            buttonNeutral: 'Daha Sonra Sor',
            buttonNegative: 'İptal',
            buttonPositive: 'Tamam',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        }
      } else {
        getCurrentLocation();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const getCurrentLocation = () => {
    const { geolocation } = require('react-native');
    
    geolocation.getCurrentPosition(
      (position) => {
        const newRegion = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        setRegion(newRegion);
        mapRef?.animateToRegion(newRegion, 1000);
      },
      (error) => Alert.alert('Hata', 'Konumunuz alınamadı. Lütfen konum servislerinizi kontrol edin.'),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  const handleSearch = (searchText) => {
    // Burada arama işlemleri yapılacak
    console.log('Searching for:', searchText);
  };

  const handleTabPress = (tabName) => {
    // Burada tab işlemleri yapılacak
    console.log('Tab pressed:', tabName);
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  return (
    <View style={styles.container}>
      <SearchBar onSearch={handleSearch} />
      <MapView
        ref={(ref) => setMapRef(ref)}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {stationData.map((station) => (
          <Marker
            key={station.id}
            coordinate={{
              latitude: station.latitude,
              longitude: station.longitude,
            }}
            onPress={() => setSelectedStation(station)}
          >
            <CustomMarker isAvailable={station.availability} />
            <Callout>
              <StationCallout station={station} />
            </Callout>
          </Marker>
        ))}
      </MapView>
      <BottomNavBar onTabPress={handleTabPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default HomeScreen; 