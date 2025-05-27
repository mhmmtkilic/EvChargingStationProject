import { Alert } from 'react-native';
import axios from 'axios';

// TomTom API için sabit değerler
const TOMTOM_API_KEY = 'lfgX3eS62AOuWxr0GeUPQZw5CEHlA9In';
const TOMTOM_BASE_URL = 'https://api.tomtom.com';

/**
 * Fetches charging stations based on location and radius
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Promise<Array>} - Array of charging stations
 */
export const fetchNearbyStations = async (latitude, longitude, radius = 10000) => {
  try {
    const response = await axios.get(`${TOMTOM_BASE_URL}/search/2/poiSearch/charging.json`, {
      params: {
        key: TOMTOM_API_KEY,
        lat: latitude,
        lon: longitude,
        radius: radius,
        categorySet: 7309 // EV charging station category
      }
    });

    if (response.data && response.data.results) {
      // API yanıtını uygulamamız için uygun formata dönüştürme
      const stations = response.data.results.map(item => {
        // Availability bilgisi API'da olmadığı için rastgele atama yapıyoruz
        // Gerçek bir uygulamada başka bir API veya veritabanından alınmalı
        const isAvailable = Math.random() > 0.3; // %70 ihtimalle müsait
        
        return {
          id: item.id || `station-${Math.random().toString(36).substr(2, 9)}`,
          name: item.poi?.name || 'Şarj İstasyonu',
          latitude: item.position.lat,
          longitude: item.position.lon,
          address: item.address?.freeformAddress || '',
          charging_type: item.poi?.categories?.[0] || 'Standart',
          power_kW: Math.floor(Math.random() * 150) + 50, // 50-200 kW arası rastgele değer
          availability: isAvailable,
        };
      });
      
      return stations;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching nearby stations:', error);
    throw error;
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = value => value * Math.PI / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}; 