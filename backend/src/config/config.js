require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  tomtomApi: {
    apiKey: process.env.TOMTOM_API_KEY || 'lfgX3eS62AOuWxr0GeUPQZw5CEHlA9In',
    baseUrl: 'https://api.tomtom.com'
  }
}; 