import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, Platform, PermissionsAndroid, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Callout, Circle, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import SearchBar from '../components/SearchBar';
import BottomNavBar from '../components/BottomNavBar';
import CustomMarker from '../components/CustomMarker';
import StationCallout from '../components/StationCallout';
import Slider from '@react-native-community/slider';
import { fetchNearbyStations, getLocalStationData } from '../services/stationService';

// İstanbul merkez koordinatları - başlangıç koordinatları olarak kullanılacak (konum izni verilmediğinde)
const ISTANBUL_COORDINATES = {
  latitude: 41.0082,
  longitude: 28.9784,
};

// Polonezköy koordinatları (görseldeki konum)
const TURKEY_COORDINATES = {
  latitude: 41.0947,
  longitude: 29.2146,
};

// Sabit değerler
const DEFAULT_DELTA = {
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const HomeScreen = () => {
  // State yönetimi
  const [region, setRegion] = useState({
    ...TURKEY_COORDINATES,
    ...DEFAULT_DELTA,
  });
  const [selectedStation, setSelectedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(TURKEY_COORDINATES);
  const [isPinned, setIsPinned] = useState(false);
  const [radiusInKm, setRadiusInKm] = useState(1);
  const [showRadiusSettings, setShowRadiusSettings] = useState(false);
  const [stationsInRadius, setStationsInRadius] = useState([]);
  const [directionsPolyline, setDirectionsPolyline] = useState(null);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [stationData, setStationData] = useState([]);
  
  // Refs
  const mapRef = useRef(null);
  const locationSubscriptionRef = useRef(null);

  // Konum izni isteme - useCallback ile optimize edildi
  const requestLocationPermission = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          getCurrentLocation();
        } else {
          setUserLocation(TURKEY_COORDINATES);
          Alert.alert(
            'Konum İzni Gerekli',
            'Şarj istasyonlarını konumunuza göre görüntülemek için konum iznine ihtiyacımız var.',
            [{ text: 'Tamam' }]
          );
        }
      } else {
        getCurrentLocation();
      }
    } catch (err) {
      console.warn(err);
      setUserLocation(TURKEY_COORDINATES);
    }
  }, []);

  // İki nokta arasındaki mesafeyi hesaplama (Haversine formülü) - Pure function
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const toRad = value => value * Math.PI / 180;
    const R = 6371; // Dünya yarıçapı km olarak
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Gerçek konum alma fonksiyonu - useCallback ile optimize edildi
  const getCurrentLocation = useCallback(async () => {
    try {
      // Önce manuel olarak Polonezköy koordinatlarını ayarla
      const turkeyLocation = TURKEY_COORDINATES;
    const newRegion = {
        ...turkeyLocation,
        ...DEFAULT_DELTA,
    };
    
      setUserLocation(turkeyLocation);
    setRegion(newRegion);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
      
      // Ardından gerçek konum izinlerini kontrol et
      const locationPermission = await Location.getForegroundPermissionsAsync();
      
      if (!locationPermission || locationPermission.status !== 'granted') {
        Alert.alert('Konum İzni Gerekli', 'Konum servisinize erişim izni verilmedi. Polonezköy konumu kullanılıyor.');
        return;
      }
      
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        if (location?.coords) {
          const { latitude, longitude } = location.coords;
          
          const newUserLocation = { latitude, longitude };
          const deviceRegion = {
            ...newUserLocation,
            ...DEFAULT_DELTA,
          };
          
          setUserLocation(newUserLocation);
          setRegion(deviceRegion);
          
          if (mapRef.current) {
            mapRef.current.animateToRegion(deviceRegion, 1000);
          }
          
          // Konum sabitlenmişse, yarıçap içindeki istasyonları güncelle
          if (isPinned) {
            updateStationsInRadius(newUserLocation, radiusInKm);
          }
        }
      } catch (error) {
        console.error('Cihaz konumu alınamadı, Polonezköy konumu kullanılıyor:', error);
      }
    } catch (error) {
      console.error('Konum hatası:', error);
      Alert.alert('Konum Hatası', 'Konumunuz alınamadı. Lütfen konum servislerinizi kontrol edin.');
    }
  }, [isPinned, radiusInKm, updateStationsInRadius]);

  // Yarıçap içindeki istasyonları güncelleme - useCallback ile optimize edildi
  const updateStationsInRadius = useCallback(async (center, radius) => {
    if (!center) return;
    
    setIsLoading(true);
    
    try {
      // Fetch stations from API based on location and radius
      const stations = await fetchNearbyStations(center.latitude, center.longitude, radius);
      
      if (stations && stations.length > 0) {
        setStationData(stations);
        setStationsInRadius(stations);
      } else {
        // Fallback to local data if API returns no results
        const localStations = await getLocalStationData();
        
        // Filter local stations by radius
        const inRadiusStations = localStations.filter(station => {
          const distance = calculateDistance(
            center.latitude, 
            center.longitude, 
            station.latitude, 
            station.longitude
          );
          return distance <= radius;
        });
        
        setStationData(localStations);
        setStationsInRadius(inRadiusStations);
      }
    } catch (error) {
      console.error('Error updating stations in radius:', error);
      
      // Fallback to local data
      const localStations = await getLocalStationData();
      
      // Filter local stations by radius
      const inRadiusStations = localStations.filter(station => {
        const distance = calculateDistance(
          center.latitude, 
          center.longitude, 
          station.latitude, 
          station.longitude
        );
        return distance <= radius;
      });
      
      setStationData(localStations);
      setStationsInRadius(inRadiusStations);
      
      Alert.alert(
        'Veri Yükleme Hatası',
        'Şarj istasyonu verileri yüklenirken bir hata oluştu. Yerel veriler kullanılıyor.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [calculateDistance]);

  // Konum sabitleme/kaldırma fonksiyonu - useCallback ile optimize edildi
  const togglePinLocation = useCallback(() => {
    if (!userLocation) {
      Alert.alert('Hata', 'Konum bilgisi alınamadı. Lütfen konum servislerinizi kontrol edin.');
      return;
    }
    
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    setShowRadiusSettings(newPinnedState);
    
    if (newPinnedState) {
      updateStationsInRadius(userLocation, radiusInKm);
    } else {
      // Pin kaldırıldığında, tüm istasyonları göster
      setStationsInRadius([]);
      // Yol çizimini temizle
      setDirectionsPolyline(null);
      setSelectedStation(null);
    }
  }, [isPinned, radiusInKm, updateStationsInRadius, userLocation]);

  // Yarıçap değiştirme - useCallback ile optimize edildi
  const handleRadiusChange = useCallback((value) => {
    setRadiusInKm(value);
  }, []);

  // Sesli yönlendirme fonksiyonu - useCallback ile optimize edildi
  const speakDirections = useCallback((station, distance) => {
    // Sesli yönlendirme devre dışı bırakıldıysa çalışma
    if (!voiceGuidanceEnabled) return;
    
    // Platformu kontrol et (Android/iOS farklılıkları için)
    const isAndroid = Platform.OS === 'android';
    
    // Dil ayarları
    let speechText = '';
    const roundedDistance = distance.toFixed(1);
    const availability = station.availability ? 'müsait' : 'meşgul';
    
    // Cümleleri basitleştir ve standardize et
    // Türkçe harflerin telaffuzu için kelimelerin arasına boşluk ekle
    speechText = `${station.name} seçildi. Mesafe ${roundedDistance} kilometre.`;
    
    // Latin harflerle yazılmış basit Türkçe (daha iyi çalışması için)
    const simplifiedText = `${station.name} secildi. Mesafe ${roundedDistance} kilometre. Sarj tipi ${station.charging_type}, guc ${station.power_kW} kilovat. Bu istasyon su anda ${availability}. Yaklaşık varis suresi ${Math.round(distance * 2)} dakika.`;
    
    // Önce tüm aktif sesleri temizle
    Speech.stop();
    
    // Daha fazla kontrol ve hata ayıklama için
    console.log("Cihaz platformu:", Platform.OS);
    console.log("Konuşma metni:", simplifiedText);
    
    try {
      // Platformlar arası uyumluluk için iyileştirilmiş ayarlar
      setTimeout(() => {
        // Android ve iOS'ta farklı davranacak şekilde yapılandır
        if (isAndroid) {
          // Android cihazlarda
          Speech.speak(simplifiedText, {
            language: 'tr-TR',
            pitch: 1.0,
            rate: 0.70, // Android'de daha yavaş
            // Sesi özelleştirme - Android genellikle locale öncelik verir
            onStart: () => console.log("Konuşma başladı"),
            onDone: () => console.log("Konuşma tamamlandı"),
            onStopped: () => console.log("Konuşma durduruldu"),
            onError: (error) => console.log("Konuşma hatası:", error)
          });
        } else {
          // iOS cihazlarda 
          Speech.speak(simplifiedText, {
            language: 'tr-TR',
            pitch: 1.0,
            rate: 0.50, // iOS'ta daha da yavaş konuşma hızı
            // iOS ses kalitesi ayarı
            onStart: () => console.log("Konuşma başladı - iOS"),
            onDone: () => console.log("Konuşma tamamlandı - iOS"),
            onError: (error) => console.log("Konuşma hatası - iOS:", error)
          });
        }
      }, 300); // Daha uzun bekleme süresi
    } catch (error) {
      console.error("Sesli yönlendirme hatası:", error);
      
      // Alternatif çözüm: İngilizce konuşmayı dene (sorun Türkçe dilindeyse)
      try {
        const englishText = `Selected ${station.name}. Distance ${roundedDistance} kilometers. Charging type ${station.charging_type}, power ${station.power_kW} kilowatts. Estimated arrival time ${Math.round(distance * 2)} minutes.`;
        
        Speech.speak(englishText, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.80,
        });
        
        // Kullanıcıya bildir
        Alert.alert(
          "Dil Uyumluluk Sorunu",
          "Türkçe sesli yönlendirme şu anda çalışmıyor. İngilizce yönlendirme kullanılıyor.",
          [{ text: "Tamam" }]
        );
      } catch (secondError) {
        console.error("İkinci konuşma hatası:", secondError);
      }
    }
  }, [voiceGuidanceEnabled]);

  // İstasyon seçildiğinde yol çizimi - useCallback ile optimize edildi
  const handleStationSelect = useCallback((station) => {
    setSelectedStation(station);
    
    if (!userLocation) return;
    
    // Düz çizgi
    const routeCoordinates = [
      { 
        latitude: userLocation.latitude, 
        longitude: userLocation.longitude 
      },
      { 
        latitude: station.latitude, 
        longitude: station.longitude 
      }
    ];
    
    setDirectionsPolyline(routeCoordinates);
    
    // Hem kullanıcı konumu hem de istasyon görünür olacak şekilde haritayı ayarla
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    }
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      station.latitude,
      station.longitude
    );
    
    // Sesli yönlendirme yapma
    speakDirections(station, distance);
    
    Alert.alert(
      'Şarj İstasyonu Bilgisi',
      `${station.name}\nUzaklık: ${distance.toFixed(2)} km\nAdres: ${station.address}`,
      [{ text: 'Tamam' }]
    );
  }, [calculateDistance, speakDirections, userLocation]);

  // Sesli yönlendirme açma/kapama toggle fonksiyonu - useCallback ile optimize edildi
  const toggleVoiceGuidance = useCallback(() => {
    setVoiceGuidanceEnabled(prev => {
      const newState = !prev;
      
      // Eğer sesli yönlendirme kapatılıyorsa, çalan sesi durdur
      if (!newState) {
        Speech.stop();
      }
      
      // Kullanıcıya bilgi ver
      Alert.alert(
        'Sesli Yönlendirme',
        newState ? 'Sesli yönlendirme açıldı.' : 'Sesli yönlendirme kapatıldı.',
        [{ text: 'Tamam' }],
        { cancelable: true }
      );
      
      return newState;
    });
  }, []);

  // Handle Map Press - useCallback ile optimize edildi
  const handleMapPress = useCallback(() => {
    if (selectedStation) {
      setSelectedStation(null);
      setDirectionsPolyline(null);
      
      // Optionally animate the map back to show the full view
      if (mapRef.current && userLocation) {
        mapRef.current.animateToRegion({
          ...userLocation,
          ...DEFAULT_DELTA,
        }, 1000);
      }
    }
  }, [selectedStation, userLocation]);

  // Manuel konum ayarlama (Haritada uzun basıldığında) - useCallback ile optimize edildi
  const handleMapLongPress = useCallback((event) => {
    const { coordinate } = event.nativeEvent;
    
    Alert.alert(
      "Konum Değiştir",
      "Bu konumu yeni konumunuz olarak ayarlamak istiyor musunuz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Evet", 
          onPress: () => {
            setUserLocation(coordinate);
            setRegion({
              ...coordinate,
              ...DEFAULT_DELTA,
            });
            
            if (isPinned) {
              updateStationsInRadius(coordinate, radiusInKm);
            }
            
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                ...coordinate,
                ...DEFAULT_DELTA,
              }, 1000);
            }
          } 
        }
      ]
    );
  }, [isPinned, radiusInKm, updateStationsInRadius]);

  const handleSearch = useCallback((searchText) => {
    console.log('Searching for:', searchText);
  }, []);

  const handleTabPress = useCallback((tabName) => {
    console.log('Tab pressed:', tabName);
  }, []);

  // Konum izleme başlatma - useCallback ile optimize edildi
  const startLocationTracking = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Konum izni verilmedi, varsayılan konumu kullanıyoruz.');
        return;
      }
      
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          if (location?.coords) {
            const { latitude, longitude } = location.coords;
            const newUserLocation = { latitude, longitude };
            setUserLocation(newUserLocation);
            
            if (isPinned) {
              updateStationsInRadius(newUserLocation, radiusInKm);
            }
          }
        }
      );
    } catch (error) {
      console.log('Location tracking error:', error);
    }
  }, [isPinned, radiusInKm, updateStationsInRadius]);

  // İstasyon bilgi paneli - useMemo ile optimize edildi
  const renderStationInfoPanel = useMemo(() => {
    if (!selectedStation || !directionsPolyline) return null;
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      selectedStation.latitude,
      selectedStation.longitude
    );
    
    const estimatedTime = Math.round(distance * 2); // km başına 2 dakika (ortalama)
    
    return (
      <View style={styles.routeInfoContainer}>
        <Text style={styles.stationName}>{selectedStation.name}</Text>
        
        <View style={styles.stationDetailsContainer}>
          <View style={styles.stationDetailItem}>
            <Text style={styles.detailLabel}>Mesafe:</Text>
            <Text style={styles.detailValue}>{distance.toFixed(2)} km</Text>
          </View>
          
          <View style={styles.stationDetailItem}>
            <Text style={styles.detailLabel}>Süre:</Text>
            <Text style={styles.detailValue}>{estimatedTime} dk</Text>
          </View>
          
          <View style={styles.stationDetailItem}>
            <Text style={styles.detailLabel}>Durum:</Text>
            <Text style={[
              styles.detailValue,
              selectedStation.availability ? styles.availableText : styles.unavailableText
            ]}>
              {selectedStation.availability ? '✓ Müsait' : '✕ Meşgul'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.addressText}>
          <Text style={styles.addressLabel}>Adres: </Text>
          {selectedStation.address}
        </Text>
        
        <Text style={styles.chargingTypeText}>
          <Text style={styles.chargingTypeLabel}>Şarj Tipi: </Text>
          {selectedStation.charging_type} • {selectedStation.power_kW} kW
        </Text>
        
        {/* Sesli yönlendirme kontrolü için butonlar */}
        <View style={styles.voiceControlContainer}>
          <TouchableOpacity 
            style={styles.voiceButton} 
            onPress={() => speakDirections(selectedStation, distance)}
          >
            <Text style={styles.voiceButtonText}>🔊 Sesli Yönlendir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.voiceButton} 
            onPress={() => Speech.stop()}
          >
            <Text style={styles.voiceButtonText}>🔇 Sesi Durdur</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [calculateDistance, selectedStation, directionsPolyline, userLocation, speakDirections]);

  // Uygulama başladığında konum izni iste
  useEffect(() => {
    requestLocationPermission();
    startLocationTracking();
    
    // Component unmount olduğunda aboneliği kaldır ve konuşmayı durdur
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
      
      Speech.stop();
    };
  }, [requestLocationPermission, startLocationTracking]);

  // Yarıçap değiştiğinde istasyonları güncelle
  useEffect(() => {
    if (isPinned && userLocation) {
      updateStationsInRadius(userLocation, radiusInKm);
    }
  }, [radiusInKm, isPinned, updateStationsInRadius, userLocation]);

  // Görüntülenecek markerlari hesapla
  const markersToShow = useMemo(() => 
    isPinned ? stationsInRadius : stationData
  , [isPinned, stationsInRadius]);

  // Add initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const localStations = await getLocalStationData();
        setStationData(localStations);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  return (
    <View style={styles.container}>
      <SearchBar onSearch={handleSearch} />
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        onPress={handleMapPress}
        onLongPress={handleMapLongPress}
        mapType="standard"
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
      >
        {/* İstasyonlar - Eğer yarıçap aktif ise, sadece yarıçap içindekileri göster */}
        {markersToShow.map((station) => (
          <Marker
            key={station.id}
            coordinate={{
              latitude: station.latitude,
              longitude: station.longitude,
            }}
            onPress={() => handleStationSelect(station)}
          >
            <CustomMarker isAvailable={station.availability} />
            <Callout>
              <StationCallout station={station} />
            </Callout>
          </Marker>
        ))}
        
        {/* Kullanıcı konumu */}
        {userLocation && (
        <Marker
          coordinate={userLocation}
          pinColor="blue"
          title="Konumum"
          description="Şu anki konumunuz"
        />
        )}
        
        {/* Yarıçap çemberi */}
        {isPinned && userLocation && (
          <Circle
            center={userLocation}
            radius={radiusInKm * 1000}
            fillColor="rgba(52, 152, 219, 0.15)" // Mavi-şeffaf dolgu
            strokeColor="rgba(41, 128, 185, 0.7)" // Mavi kenar
            strokeWidth={2}
          />
        )}
        
        {/* Yol çizimi */}
        {directionsPolyline && (
          <Polyline
            coordinates={directionsPolyline}
            strokeColor="#3498db" // Mavi
            strokeWidth={4}
            lineDashPattern={[0]}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>
      
      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Şarj istasyonları yükleniyor...</Text>
        </View>
      )}
      
      <View style={styles.helpTextContainer}>
        <Text style={styles.helpText}>Konumu manuel değiştirmek için haritaya uzun basın</Text>
      </View>
      
      <View style={styles.locationButtonContainer}>
        <TouchableOpacity 
          style={[styles.locationButton, isPinned && styles.locationButtonActive]} 
          onPress={togglePinLocation}
        >
          <Text style={[styles.locationButtonText, isPinned && styles.activeButtonText]}>
            {isPinned ? 'Konumu Kaldır' : 'Konumu Sabitle'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.myLocationButton} 
          onPress={getCurrentLocation}
        >
          <Text style={styles.locationButtonText}>Konumuma Git</Text>
        </TouchableOpacity>
      </View>
      
      {/* Sesli yönlendirme kontrolü için her zaman görünür buton */}
      <TouchableOpacity 
        style={styles.voiceGuidanceButton} 
        onPress={toggleVoiceGuidance}
      >
        <Text style={styles.voiceGuidanceIconText}>
          {voiceGuidanceEnabled ? '🔊' : '🔇'}
        </Text>
        <Text style={styles.voiceGuidanceButtonText}>
          {voiceGuidanceEnabled ? 'Ses Açık' : 'Ses Kapalı'}
        </Text>
      </TouchableOpacity>
      
      {showRadiusSettings && (
        <View style={styles.radiusSettingsContainer}>
          <Text style={styles.radiusText}>Yarıçap: {radiusInKm.toFixed(1)} km</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={20}
            step={0.1}
            value={radiusInKm}
            onValueChange={handleRadiusChange}
            minimumTrackTintColor="#3498db" // Mavi
            maximumTrackTintColor="#dddddd"
            thumbTintColor="#2980b9" // Koyu mavi
          />
          <View style={styles.radiusPresets}>
            <TouchableOpacity style={styles.presetButton} onPress={() => setRadiusInKm(1)}>
              <Text style={styles.presetButtonText}>1 km</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetButton} onPress={() => setRadiusInKm(5)}>
              <Text style={styles.presetButtonText}>5 km</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetButton} onPress={() => setRadiusInKm(10)}>
              <Text style={styles.presetButtonText}>10 km</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={stationsInRadius.length > 0 ? styles.stationsCountText : styles.noStationsText}>
            {stationsInRadius.length > 0 
              ? `${stationsInRadius.length} şarj istasyonu bulundu` 
              : 'Bu alanda şarj istasyonu bulunamadı'}
          </Text>
        </View>
      )}
      
      {renderStationInfoPanel}
      
      <BottomNavBar onTabPress={handleTabPress} />
    </View>
  );
};

// Stil tanımlarını component dışına çıkartıp performansı arttıralım
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  // Manuel konum değiştirme bilgi paneli
  helpTextContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(52, 73, 94, 0.85)', // Koyu mavi-gri arka plan
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  helpText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  // Butonlar konteyner
  locationButtonContainer: {
    position: 'absolute',
    bottom: 150,
    right: 15,
    flexDirection: 'column',
    zIndex: 999,
  },
  locationButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 130,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3498db', // Mavi kenarlık
  },
  locationButtonActive: {
    backgroundColor: '#3498db', // Mavi arka plan
  },
  myLocationButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 130,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2980b9', // Koyu mavi kenarlık
  },
  locationButtonText: {
    fontWeight: 'bold',
    color: '#2980b9', // Koyu mavi metin rengi
  },
  activeButtonText: {
    color: '#ffffff',
  },
  // Yarıçap ayar paneli
  radiusSettingsContainer: {
    position: 'absolute',
    bottom: 150,
    left: 10,
    right: 150,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#bdc3c7', // Gri kenarlık
  },
  radiusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#34495e', // Koyu gri-mavi
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusPresets: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  presetButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#bdc3c7', // Gri kenarlık
  },
  presetButtonText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#34495e', // Koyu gri-mavi
  },
  // İstasyon sayaçları
  stationsCountText: {
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
    color: '#3498db', // Mavi
  },
  noStationsText: {
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
    color: '#e74c3c', // Kırmızı
  },
  // Rota bilgi paneli
  routeInfoContainer: {
    position: 'absolute',
    top: 110, // Üstten başlat
    left: 10,
    right: 10,
    backgroundColor: 'rgba(52, 73, 94, 0.85)', // Koyu mavi-gri arka plan
    borderRadius: 10,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(82, 103, 124, 0.5)', // Hafif kenarlık
  },
  stationName: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  stationDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: 'rgba(44, 62, 80, 0.5)', // Biraz daha koyu arka plan
    borderRadius: 8,
    padding: 10,
  },
  stationDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#bdc3c7', // Gri
    marginRight: 5,
    fontSize: 12,
  },
  detailValue: {
    color: 'white',
    fontSize: 13,
  },
  addressText: {
    color: '#ecf0f1', // Açık gri
    textAlign: 'left',
    fontSize: 12,
    marginBottom: 5,
    backgroundColor: 'rgba(44, 62, 80, 0.3)', // Biraz daha koyu arka plan
    padding: 8,
    borderRadius: 6,
  },
  addressLabel: {
    fontWeight: 'bold',
    color: '#bdc3c7', // Gri
  },
  chargingTypeText: {
    color: '#ecf0f1', // Açık gri
    textAlign: 'left',
    fontSize: 12,
    backgroundColor: 'rgba(44, 62, 80, 0.3)', // Biraz daha koyu arka plan
    padding: 8,
    borderRadius: 6,
  },
  chargingTypeLabel: {
    fontWeight: 'bold',
    color: '#bdc3c7', // Gri
  },
  // Ses kontrolü
  voiceControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(189, 195, 199, 0.3)', // Gri
  },
  voiceButton: {
    backgroundColor: 'rgba(236, 240, 241, 0.15)', // Çok hafif gri
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(189, 195, 199, 0.4)', // Gri kenarlık
  },
  voiceButtonText: {
    fontWeight: 'bold',
    color: '#ecf0f1', // Açık gri
    fontSize: 13,
    textAlign: 'center',
  },
  availableText: {
    color: '#2ecc71', // Yeşil
    fontWeight: 'bold',
  },
  unavailableText: {
    color: '#e74c3c', // Kırmızı
    fontWeight: 'bold',
  },
  // Sesli yönlendirme toggle butonu
  voiceGuidanceButton: {
    position: 'absolute',
    top: 110,
    right: 15,
    backgroundColor: 'rgba(52, 73, 94, 0.85)', // Koyu mavi-gri arka plan
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(82, 103, 124, 0.5)', // Hafif kenarlık
    zIndex: 999,
  },
  voiceGuidanceIconText: {
    fontSize: 18,
    color: '#fff',
    marginRight: 5,
  },
  voiceGuidanceButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default HomeScreen; 