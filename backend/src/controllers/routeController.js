const axios = require('axios');
const config = require('../config/config');

// Get route to the nearest charging station
exports.getRouteToNearestStation = async (req, res) => {
  try {
    const { lat, lon, radius = 10000 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }
    
    // First, get nearby stations
    const stationsResponse = await axios.get(`${config.tomtomApi.baseUrl}/search/2/poiSearch/charging.json`, {
      params: {
        key: config.tomtomApi.apiKey,
        lat,
        lon,
        radius,
        categorySet: 7309, // EV charging station category
        sortBy: 'dist' // Sort by distance to get the nearest ones first
      }
    });
    
    if (!stationsResponse.data.results || stationsResponse.data.results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No charging stations found in the specified radius'
      });
    }
    
    // Get the nearest station
    const nearestStation = stationsResponse.data.results[0];
    const destination = `${nearestStation.position.lat},${nearestStation.position.lon}`;
    const origin = `${lat},${lon}`;
    
    // Calculate route
    const routeResponse = await axios.get(`${config.tomtomApi.baseUrl}/routing/1/calculateRoute/${origin}:${destination}/json`, {
      params: {
        key: config.tomtomApi.apiKey,
        instructionsType: 'text',
        travelMode: 'car'
      }
    });
    
    res.json({
      success: true,
      station: nearestStation,
      route: routeResponse.data
    });
  } catch (error) {
    console.error('Error calculating route to nearest station:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to calculate route to nearest charging station',
      error: error.message 
    });
  }
};

// Get route to a specific charging station
exports.getRouteToStation = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { lat, lon } = req.query;
    
    if (!lat || !lon || !stationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude, longitude, and station ID are required' 
      });
    }
    
    // Get station details
    const stationResponse = await axios.get(`${config.tomtomApi.baseUrl}/search/2/poiDetails.json`, {
      params: {
        key: config.tomtomApi.apiKey,
        id: stationId
      }
    });
    
    if (!stationResponse.data.result) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }
    
    const station = stationResponse.data.result;
    const destination = `${station.position.lat},${station.position.lon}`;
    const origin = `${lat},${lon}`;
    
    // Calculate route
    const routeResponse = await axios.get(`${config.tomtomApi.baseUrl}/routing/1/calculateRoute/${origin}:${destination}/json`, {
      params: {
        key: config.tomtomApi.apiKey,
        instructionsType: 'text',
        travelMode: 'car'
      }
    });
    
    res.json({
      success: true,
      station,
      route: routeResponse.data
    });
  } catch (error) {
    console.error('Error calculating route to station:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to calculate route to charging station',
      error: error.message 
    });
  }
}; 