import { Alert } from 'react-native';

// API configuration
const API_BASE_URL = 'https://api.openchargemap.io/v3';
const API_KEY = 'YOUR_OPEN_CHARGE_MAP_API_KEY'; // You need to register for an API key

/**
 * Fetches charging stations based on location and radius
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Promise<Array>} - Array of charging stations
 */
export const fetchNearbyStations = async (latitude, longitude, radiusKm = 10) => {
  try {
    const url = `${API_BASE_URL}/poi/?output=json&countrycode=TR&latitude=${latitude}&longitude=${longitude}&distance=${radiusKm}&distanceunit=km&maxresults=100&compact=true&verbose=false&key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform the API data to match our app's format
    return data.map(station => transformStationData(station));
  } catch (error) {
    console.error('Error fetching charging stations:', error);
    Alert.alert(
      'Veri Yükleme Hatası',
      'Şarj istasyonu verileri yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.',
      [{ text: 'Tamam' }]
    );
    
    // Return empty array or fallback to local data
    return [];
  }
};

/**
 * Transforms station data from API format to our app's format
 * @param {Object} apiStation - Station data from API
 * @returns {Object} - Transformed station data
 */
const transformStationData = (apiStation) => {
  // Extract address components
  const addressInfo = apiStation.AddressInfo || {};
  
  // Extract connection types and availability
  const connections = apiStation.Connections || [];
  const availableConnections = connections.filter(conn => 
    conn.StatusType && conn.StatusType.IsOperational
  );
  
  // Get the highest power connection
  const highestPowerConnection = connections.reduce((prev, current) => {
    return (prev.PowerKW > current.PowerKW) ? prev : current;
  }, { PowerKW: 0 });
  
  // Determine charging type
  let chargingType = 'Unknown';
  if (connections.length > 0 && connections[0].ConnectionType) {
    chargingType = connections[0].ConnectionType.Title || 'Unknown';
  }
  
  // Map to our app's data structure
  return {
    id: apiStation.ID,
    name: addressInfo.Title || 'Unnamed Station',
    latitude: addressInfo.Latitude,
    longitude: addressInfo.Longitude,
    charging_type: chargingType,
    availability: availableConnections.length > 0,
    power_kW: highestPowerConnection.PowerKW || 0,
    address: [
      addressInfo.AddressLine1,
      addressInfo.Town,
      addressInfo.StateOrProvince,
      addressInfo.Postcode
    ].filter(Boolean).join(', ')
  };
};

/**
 * Fallback function to use local data when API is unavailable
 * @returns {Promise<Array>} - Array of charging stations from local data
 */
export const getLocalStationData = async () => {
  try {
    // Import local data
    const localData = require('../../station_information.json');
    return localData;
  } catch (error) {
    console.error('Error loading local station data:', error);
    return [];
  }
}; 