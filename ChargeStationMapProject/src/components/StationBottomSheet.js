import React, { useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  Platform,
  ScrollView
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import RadiusSlider from './RadiusSlider';

const { height, width } = Dimensions.get('window');

const SNAP_POINTS = {
  COLLAPSED: height - 100, // Just showing the handle + title
  PEEK: height * 0.6,
  HALF: height * 0.5,
  EXPANDED: height * 0.2, // 80% of screen height when expanded
};

const StationBottomSheet = ({ 
  station, 
  distance = 0,
  radiusInKm = 5,
  stationsCount = 0,
  isPinned = false,
  onRadiusChange,
  onSpeakDirections, 
  onStopSpeech, 
  onShowDetails,
  onTogglePinLocation
}) => {
  const translateY = useRef(new Animated.Value(SNAP_POINTS.COLLAPSED)).current;
  const lastSnap = useRef(SNAP_POINTS.COLLAPSED);
  
  // Initialize the bottom sheet
  useEffect(() => {
    // Start in collapsed state
    Animated.spring(translateY, {
      toValue: SNAP_POINTS.COLLAPSED,
      useNativeDriver: true,
      bounciness: 1,
    }).start();
  }, []);

  // Update the sheet when station is selected or deselected
  useEffect(() => {
    // If a station is selected, open to peek state
    if (station) {
      Animated.spring(translateY, {
        toValue: SNAP_POINTS.PEEK,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
      lastSnap.current = SNAP_POINTS.PEEK;
    } else if (lastSnap.current !== SNAP_POINTS.COLLAPSED) {
      // If no station is selected, return to collapsed state
      Animated.spring(translateY, {
        toValue: SNAP_POINTS.COLLAPSED,
        useNativeDriver: true,
        bounciness: 1,
      }).start();
      lastSnap.current = SNAP_POINTS.COLLAPSED;
    }
  }, [station, translateY]);

  // Handle gesture state change
  const onGestureEvent = useCallback(
    (event) => {
      // Clamp the translation to prevent going beyond expanded state
      const newY = Math.max(
        SNAP_POINTS.EXPANDED,
        Math.min(SNAP_POINTS.COLLAPSED, lastSnap.current + event.nativeEvent.translationY)
      );
      translateY.setValue(newY);
    },
    [translateY]
  );

  // Handle the end of a gesture
  const onHandlerStateChange = useCallback(
    (event) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        // Determine which position to snap to
        const endY = lastSnap.current + event.nativeEvent.translationY;
        let snapPoint;

        // Calculate the closest snap point
        if (endY < SNAP_POINTS.EXPANDED + (SNAP_POINTS.HALF - SNAP_POINTS.EXPANDED) / 2) {
          snapPoint = SNAP_POINTS.EXPANDED;
        } else if (endY < SNAP_POINTS.HALF + (SNAP_POINTS.PEEK - SNAP_POINTS.HALF) / 2) {
          snapPoint = SNAP_POINTS.HALF;
        } else if (endY < SNAP_POINTS.PEEK + (SNAP_POINTS.COLLAPSED - SNAP_POINTS.PEEK) / 2) {
          snapPoint = SNAP_POINTS.PEEK;
        } else {
          snapPoint = SNAP_POINTS.COLLAPSED;
        }

        // Update the last snap point
        lastSnap.current = snapPoint;

        // Animate to the snap point
        Animated.spring(translateY, {
          toValue: snapPoint,
          useNativeDriver: true,
          bounciness: 4,
          speed: 12,
        }).start();
      }
    },
    [translateY]
  );

  // Calculate estimated arrival time (2 min per km is an average driving time)
  const estimatedTime = Math.round(distance * 2);
  
  // Function to get appropriate content based on drawer state and app state
  const getContentOpacity = (inputRange, outputRange) => {
    return translateY.interpolate({
      inputRange,
      outputRange,
      extrapolate: 'clamp',
    });
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY }] }
      ]}
    >
      <PanGestureHandler 
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View>
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>
          
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>
              {station ? station.name : 'Şarj İstasyonları'}
            </Text>
            {station && (
              <View style={[
                styles.statusBadge, 
                { backgroundColor: station.availability ? '#10b981' : '#ef4444' }
              ]}>
                <Text style={styles.statusText}>
                  {station.availability ? 'Müsait' : 'Meşgul'}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </PanGestureHandler>
      
      <ScrollView style={styles.scrollContent} bounces={false}>
        {/* Station Details Content - visible when a station is selected */}
        {station && (
          <Animated.View style={[
            styles.contentSection,
            { opacity: getContentOpacity(
              [SNAP_POINTS.COLLAPSED, SNAP_POINTS.PEEK, SNAP_POINTS.HALF],
              [0, 1, 1]
            )}
          ]}>
            {/* Quick info section */}
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Ionicons name="navigate-outline" size={18} color="#64748b" />
                <Text style={styles.infoValue}>
                  {distance.toFixed(1)} <Text style={styles.infoUnit}>km</Text>
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={18} color="#64748b" />
                <Text style={styles.infoValue}>
                  {estimatedTime} <Text style={styles.infoUnit}>dk</Text>
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.infoItem}>
                <Ionicons name="flash-outline" size={18} color="#64748b" />
                <Text style={styles.infoValue}>
                  {station.power_kW} <Text style={styles.infoUnit}>kW</Text>
                </Text>
              </View>
            </View>
            
            {/* Address section */}
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={18} color="#64748b" />
              <Text style={styles.addressText}>{station.address}</Text>
            </View>
            
            {/* Action buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={onSpeakDirections}
              >
                <Ionicons name="volume-high-outline" size={20} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Sesli Yönlendir</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={onStopSpeech}
              >
                <Ionicons name="volume-mute-outline" size={20} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Sesi Durdur</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={onShowDetails}
              >
                <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
                <Text style={styles.actionButtonText}>İstasyon Detayları</Text>
              </TouchableOpacity>
            </View>
            
            {/* Extended info - visible when fully opened */}
            <Animated.View style={[
              styles.extendedInfoContainer,
              {
                opacity: getContentOpacity(
                  [SNAP_POINTS.PEEK, SNAP_POINTS.HALF, SNAP_POINTS.EXPANDED],
                  [0, 0.5, 1]
                )
              }
            ]}>
              <Text style={styles.extendedInfoTitle}>Şarj Bilgileri</Text>
              <View style={styles.extendedInfoItem}>
                <Text style={styles.extendedInfoLabel}>Şarj Tipi:</Text>
                <Text style={styles.extendedInfoValue}>{station.charging_type}</Text>
              </View>
              <View style={styles.extendedInfoItem}>
                <Text style={styles.extendedInfoLabel}>Maksimum Güç:</Text>
                <Text style={styles.extendedInfoValue}>{station.power_kW} kW</Text>
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {/* Search Radius Controls - always visible, especially when no station is selected */}
        <Animated.View style={[
          styles.contentSection,
          { 
            opacity: getContentOpacity(
              [SNAP_POINTS.COLLAPSED, SNAP_POINTS.PEEK],
              [station ? 0 : 1, station ? 0.3 : 1]
            )
          }
        ]}>
          <View style={styles.pinLocationContainer}>
            <TouchableOpacity 
              style={[styles.pinLocationButton, isPinned && styles.pinLocationButtonActive]} 
              onPress={onTogglePinLocation}
            >
              <Ionicons 
                name={isPinned ? "location" : "location-outline"} 
                size={20} 
                color={isPinned ? "#fff" : "#3b82f6"} 
              />
              <Text style={[styles.pinLocationText, isPinned && styles.pinLocationTextActive]}>
                {isPinned ? 'Konumu Kaldır' : 'Konumu Sabitle'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <RadiusSlider
            radius={radiusInKm}
            onRadiusChange={onRadiusChange}
          />
          
          {stationsCount > 0 ? (
            <Text style={styles.stationsCountText}>
              {stationsCount} istasyon bulundu
            </Text>
          ) : (
            <Text style={styles.noStationsText}>
              {isPinned ? 'Bu yarıçapta istasyon bulunamadı' : 'Konum sabitlenmedi'}
            </Text>
          )}
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    zIndex: 1000,
  },
  handle: {
    height: 28,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  contentSection: {
    padding: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginLeft: 6,
  },
  infoUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#64748b',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
    marginLeft: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
    fontWeight: '500',
  },
  extendedInfoContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  extendedInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  extendedInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  extendedInfoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  extendedInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  pinLocationContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pinLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  pinLocationButtonActive: {
    backgroundColor: '#3b82f6',
  },
  pinLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    marginLeft: 8,
  },
  pinLocationTextActive: {
    color: '#fff',
  },
  stationsCountText: {
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  noStationsText: {
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
});

export default StationBottomSheet; 