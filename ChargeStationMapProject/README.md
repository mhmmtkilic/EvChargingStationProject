# EV Charging Station Map

A React Native mobile application that displays electric vehicle charging stations on a map.

## Features

- View charging stations on an interactive map
- Filter stations by distance from your location
- Get detailed information about each station (type, power, availability)
- Voice guidance for directions to stations
- Search functionality

## Data Sources

The application uses the following data sources for charging station information:

### Primary Data Source: Open Charge Map API

The app primarily uses the [Open Charge Map API](https://openchargemap.org/site/develop/api) to fetch real-time charging station data. This is a free, open-source API that provides information about EV charging stations worldwide.

To use this API:
1. Register for an API key at [Open Charge Map](https://openchargemap.org/site/develop#signup)
2. Add your API key to `src/services/stationService.js`

### Fallback Data Source: Local JSON

As a fallback, the app includes a local JSON file (`station_information.json`) with sample charging station data. This is used when:
- The API is unavailable
- There's no internet connection
- The API returns no results for the current location

## Alternative Data Sources

If you need more comprehensive or specific data, consider these alternatives:

1. **Commercial APIs**:
   - [ChargePoint API](https://www.chargepoint.com/for-businesses/api)
   - [EVgo API](https://www.evgo.com/ev-drivers/tech/)
   - [Electrify America API](https://www.electrifyamerica.com/api-access/)

2. **Government Data**:
   - Many countries/regions have open data portals with EV charging station information
   - Example: [U.S. Department of Energy Alternative Fuels Data Center](https://afdc.energy.gov/stations/#/find/nearest)

3. **Create Your Own Backend**:
   - Aggregate data from multiple sources
   - Add user-contributed data
   - Include real-time availability updates

## Setup and Installation

1. Clone the repository
2. Run `npm install` to install dependencies
3. Add your API keys to the appropriate files
4. Run `npm start` to start the development server

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 