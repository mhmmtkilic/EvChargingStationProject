# EV Charging Station Backend

This is the backend service for the EV Charging Station application. It provides APIs for finding charging stations and calculating routes.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   TOMTOM_API_KEY=your_tomtom_api_key
   ```

3. Start the server:
   ```
   npm start
   ```

   For development with auto-reload:
   ```
   npm run dev
   ```

## API Endpoints

### Stations
- `GET /api/stations/nearby?lat=<latitude>&lon=<longitude>&radius=<radius>` - Get nearby charging stations
- `GET /api/stations/:id` - Get details for a specific charging station

### Routes
- `GET /api/routes/nearest?lat=<latitude>&lon=<longitude>` - Get route to the nearest charging station
- `GET /api/routes/:stationId?lat=<latitude>&lon=<longitude>` - Get route to a specific charging station 