const axios = require('axios');
const config = require('../config/config');

// Get nearby charging stations based on user location
exports.getNearbyStations = async (req, res) => {
  try {
    const { lat, lon, radius = 10000 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }
    
    const response = await axios.get(`${config.tomtomApi.baseUrl}/search/2/poiSearch/charging.json`, {
      params: {
        key: config.tomtomApi.apiKey,
        lat,
        lon,
        radius,
        categorySet: 7309 // EV charging station category
      }
    });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching nearby stations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch nearby charging stations',
      error: error.message 
    });
  }
};

// Get details for a specific charging station
exports.getStationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Station ID is required' 
      });
    }
    
    const response = await axios.get(`${config.tomtomApi.baseUrl}/search/2/poiDetails.json`, {
      params: {
        key: config.tomtomApi.apiKey,
        id
      }
    });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching station details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch charging station details',
      error: error.message 
    });
  }
}; 