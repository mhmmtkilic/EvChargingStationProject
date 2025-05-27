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
import StationBottomSheet from '../components/StationBottomSheet';
import RadiusSlider from '../components/RadiusSlider';
import { Ionicons } from '@expo/vector-icons';

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
  const [stationsInRadius, setStationsInRadius] = useState([]);
  const [directionsPolyline, setDirectionsPolyline] = useState(null);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [stationData, setStationData] = useState([]);
  const [stationDistance, setStationDistance] = useState(0);
  
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
        
        // Varsayılan konum için istasyonları yükle
        if (isPinned) {
          updateStationsInRadius(turkeyLocation, radiusInKm);
        }
        
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
          } else {
            // Konum sabitlenmese bile, yeni konuma göre tüm istasyonları yükle
            const stations = await fetchNearbyStations(latitude, longitude, 10000); // 10km
            setStationData(stations);
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
      // TomTom API'den istasyonları getir (km -> metre dönüşümü yap)
      const radiusInMeters = radius * 1000;
      const stations = await fetchNearbyStations(center.latitude, center.longitude, radiusInMeters);
      
      if (stations && stations.length > 0) {
        setStationData(stations);
        setStationsInRadius(stations);
      } else {
        // Eğer radius içinde istasyon yoksa, kullanıcıya bildir
        setStationsInRadius([]);
        
        Alert.alert(
          'Bilgi',
          `${radius} km yarıçapında şarj istasyonu bulunamadı.`,
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Error updating stations in radius:', error);
      
      Alert.alert(
        'Veri Yükleme Hatası',
        'Şarj istasyonu verileri yüklenirken bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Konum sabitleme/kaldırma fonksiyonu - useCallback ile optimize edildi
  const togglePinLocation = useCallback(() => {
    if (!userLocation) {
      Alert.alert('Hata', 'Konum bilgisi alınamadı. Lütfen konum servislerinizi kontrol edin.');
      return;
    }
    
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    
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
    
    // Eğer konum sabitlenmişse ve kullanıcı konumu varsa,
    // yarıçap değiştiğinde istasyonları hemen güncelle
    if (isPinned && userLocation) {
      // Çok sık API çağrısını önlemek için debounce mantığı uygulayabiliriz
      // Şimdilik her değişiklikte güncelleme yapıyoruz
      updateStationsInRadius(userLocation, value);
    }
  }, [isPinned, userLocation, updateStationsInRadius]);

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
    
    // Mesafeyi state'e kaydet
    setStationDistance(distance);
    
    // Sesli yönlendirme yapma
    if (voiceGuidanceEnabled) {
      speakDirections(station, distance);
    }
  }, [calculateDistance, speakDirections, userLocation, voiceGuidanceEnabled]);

  // Handle bottom sheet close
  const handleBottomSheetClose = useCallback(() => {
    // İstasyon seçimini kaldırma ve yol çizimini temizleme işlemlerini
    // burada yapmayalım, çekmece kapandığında kullanıcının yol bilgisini görebilmesi için
  }, []);

  // İstasyon detaylarını göster
  const handleShowStationDetails = useCallback(() => {
    if (!selectedStation) return;
    
    Alert.alert(
      selectedStation.name,
      `Adres: ${selectedStation.address}\n` +
      `Şarj Tipi: ${selectedStation.charging_type}\n` +
      `Güç: ${selectedStation.power_kW} kW\n` +
      `Durum: ${selectedStation.availability ? 'Müsait' : 'Meşgul'}`,
      [{ text: 'Tamam' }]
    );
  }, [selectedStation]);

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
    // We don't need to close the bottom sheet anymore since it's always visible
    
    // Clear selected station only if we're actually clearing the selection
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
          onPress: async () => {
            setUserLocation(coordinate);
            setRegion({
              ...coordinate,
              ...DEFAULT_DELTA,
            });
            
            // Konum değiştiğinde otomatik olarak yarıçap göstermeyi aktifleştir
            setIsPinned(true);
            
            // Yeni konuma göre istasyonları güncelle
            setIsLoading(true);
            try {
              // RadiusInKm değerine göre istasyonları getir (metre cinsine çevir)
              const radiusInMeters = radiusInKm * 1000;
              const stations = await fetchNearbyStations(
                coordinate.latitude, 
                coordinate.longitude, 
                radiusInMeters
              );
              setStationData(stations);
              setStationsInRadius(stations);
            } catch (error) {
              console.error('Error fetching stations:', error);
              Alert.alert(
                'Veri Yükleme Hatası',
                'Şarj istasyonu verileri yüklenirken bir hata oluştu.',
                [{ text: 'Tamam' }]
              );
            } finally {
              setIsLoading(false);
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
  }, [radiusInKm, fetchNearbyStations]);

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
            } else {
              // Konum değiştiğinde yeni lokasyona göre istasyonları güncelle
              // Bu fonksiyonu performans nedeniyle sınırlandırabilirsiniz
              const updateStations = async () => {
                try {
                  const stations = await fetchNearbyStations(latitude, longitude, 10000);
                  setStationData(stations);
                } catch (error) {
                  console.error('Error updating stations:', error);
                }
              };
              
              // Opsiyonel: Çok sık çağrılmasını önlemek için
              // Bu kısmı şimdilik yoruma alıyoruz, yalnızca konum sabitlendiğinde güncelleyeceğiz
              // updateStations();
            }
          }
        }
      );
    } catch (error) {
      console.log('Location tracking error:', error);
    }
  }, [isPinned, radiusInKm, updateStationsInRadius]);

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
        // Kullanıcı konumu varsa o konumdan, yoksa varsayılan konumdan istasyonları yükle
        const location = userLocation || TURKEY_COORDINATES;
        const stations = await fetchNearbyStations(location.latitude, location.longitude, 10000); // 10km
        setStationData(stations);
      } catch (error) {
        console.error('Error loading initial data:', error);
        Alert.alert(
          'Veri Yükleme Hatası',
          'Şarj istasyonu verileri yüklenirken bir hata oluştu.',
          [{ text: 'Tamam' }]
        );
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [userLocation]); // userLocation değiştiğinde yeniden yükle

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
        {/* Yarıçap çemberi - Her zaman görünür hale getir */}
        {isPinned && userLocation && (
          <Circle
            center={userLocation}
            radius={radiusInKm * 1000}
            fillColor="rgba(52, 152, 219, 0.2)" // Daha belirgin mavi-şeffaf dolgu
            strokeColor="rgba(41, 128, 185, 0.9)" // Daha belirgin mavi kenar
            strokeWidth={3}
            zIndex={1} // Diğer elementlerin altında kalmasını sağla
          />
        )}
        
        {/* İstasyonlar - Eğer yarıçap aktif ise, sadece yarıçap içindekileri göster */}
        {markersToShow.map((station) => (
          <Marker
            key={station.id}
            coordinate={{
              latitude: station.latitude,
              longitude: station.longitude,
            }}
            onPress={() => handleStationSelect(station)}
            zIndex={2} // İstasyonlar çemberin üstünde görünsün
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
          zIndex={3} // Kullanıcı konumu en üstte görünsün
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
            zIndex={2} // Yol çizgisi istasyonlarla aynı seviyede görünsün
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
      
      {/* Ana konum butonunu koru */}
      <TouchableOpacity 
        style={styles.myLocationButton} 
        onPress={getCurrentLocation}
      >
        <Ionicons name="locate" size={20} color="#2980b9" />
        <Text style={styles.myLocationButtonText}>Konumuma Git</Text>
      </TouchableOpacity>
      
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
      
      {/* Yeni universal bottom sheet */}
      <StationBottomSheet
        station={selectedStation}
        distance={stationDistance}
        radiusInKm={radiusInKm}
        stationsCount={stationsInRadius.length}
        isPinned={isPinned}
        onRadiusChange={handleRadiusChange}
        onSpeakDirections={() => selectedStation && speakDirections(selectedStation, stationDistance)}
        onStopSpeech={() => Speech.stop()}
        onShowDetails={handleShowStationDetails}
        onTogglePinLocation={togglePinLocation}
      />
      
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
  myLocationButton: {
    position: 'absolute',
    right: 15,
    bottom: 150,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2980b9', // Koyu mavi kenarlık
    zIndex: 999,
  },
  myLocationButtonText: {
    fontWeight: 'bold',
    color: '#2980b9', // Koyu mavi metin rengi
    marginLeft: 6,
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