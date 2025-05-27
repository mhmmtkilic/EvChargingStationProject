require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  tomtomApi: {
    apiKey: process.env.TOMTOM_API_KEY || 'api key',
    baseUrl: 'https://api.tomtom.com'
  }
}; 
