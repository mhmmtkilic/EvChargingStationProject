// Global variables
let map;
let userMarker;
let stationMarkers = [];
let routeLayer;
const API_KEY = 'lfgX3eS62AOuWxr0GeUPQZw5CEHlA9In';
const DEFAULT_POSITION = { lat: 41.0082, lng: 28.9784 }; // Istanbul

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupEventListeners();
});

// Initialize the map
function initMap() {
  map = tt.map({
    key: API_KEY,
    container: 'map',
    center: DEFAULT_POSITION,
    zoom: 13,
    style: 'tomtom://vector/1/basic-main'
  });
  
  map.addControl(new tt.FullscreenControl());
  map.addControl(new tt.NavigationControl());
  
  // Add user location marker
  userMarker = new tt.Marker()
    .setLngLat([DEFAULT_POSITION.lng, DEFAULT_POSITION.lat])
    .addTo(map);
    
  // Get user's location if available
  getUserLocation();
}

// Set up event listeners
function setupEventListeners() {
  document.getElementById('locate-btn').addEventListener('click', getUserLocation);
  document.getElementById('search-btn').addEventListener('click', searchLocation);
  document.getElementById('radius-slider').addEventListener('input', updateRadiusValue);
  document.getElementById('close-route').addEventListener('click', closeRouteDetails);
}

// Get user's current location
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        updateUserLocation(userLocation);
        findNearbyStations(userLocation);
      },
      (error) => {
        console.error('Error getting user location:', error);
        alert('Could not get your location. Using default location.');
        findNearbyStations(DEFAULT_POSITION);
      }
    );
  } else {
    alert('Geolocation is not supported by your browser. Using default location.');
    findNearbyStations(DEFAULT_POSITION);
  }
}

// Search for a location
function searchLocation() {
  const searchInput = document.getElementById('search-input').value;
  
  if (!searchInput) {
    alert('Please enter a location to search');
    return;
  }
  
  fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(searchInput)}.json?key=${API_KEY}`)
    .then(response => response.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        const location = {
          lat: data.results[0].position.lat,
          lng: data.results[0].position.lon
        };
        
        updateUserLocation(location);
        findNearbyStations(location);
      } else {
        alert('Location not found. Please try a different search term.');
      }
    })
    .catch(error => {
      console.error('Error searching for location:', error);
      alert('An error occurred while searching for the location.');
    });
}

// Update the user's location on the map
function updateUserLocation(location) {
  userMarker.setLngLat([location.lng, location.lat]);
  map.flyTo({ center: [location.lng, location.lat], zoom: 13 });
}

// Find nearby charging stations
function findNearbyStations(location) {
  clearStationMarkers();
  
  const radius = document.getElementById('radius-slider').value * 1000; // Convert km to meters
  
  fetch(`/api/stations/nearby?lat=${location.lat}&lon=${location.lng}&radius=${radius}`)
    .then(response => response.json())
    .then(data => {
      if (data.success && data.data.results && data.data.results.length > 0) {
        displayStations(data.data.results, location);
      } else {
        document.getElementById('stations-container').innerHTML = '<p>No charging stations found in this area.</p>';
      }
    })
    .catch(error => {
      console.error('Error fetching nearby stations:', error);
      document.getElementById('stations-container').innerHTML = '<p>Error fetching charging stations. Please try again.</p>';
    });
}

// Display stations on the map and in the list
function displayStations(stations, userLocation) {
  const stationsContainer = document.getElementById('stations-container');
  stationsContainer.innerHTML = '';
  
  stations.forEach(station => {
    // Add marker to map
    const marker = new tt.Marker()
      .setLngLat([station.position.lon, station.position.lat])
      .addTo(map);
    
    // Create popup
    const popup = new tt.Popup({ offset: 30 })
      .setHTML(`
        <h3>${station.poi.name}</h3>
        <p>${station.address.freeformAddress}</p>
        <p>Distance: ${(station.dist / 1000).toFixed(2)} km</p>
        <button onclick="getRouteToStation('${station.id}', ${userLocation.lat}, ${userLocation.lng})">Get Directions</button>
      `);
    
    marker.setPopup(popup);
    stationMarkers.push(marker);
    
    // Add to list
    const stationCard = document.createElement('div');
    stationCard.className = 'station-card';
    stationCard.innerHTML = `
      <h3>${station.poi.name}</h3>
      <p>${station.address.freeformAddress}</p>
      <div class="station-info">
        <span class="station-distance">${(station.dist / 1000).toFixed(2)} km away</span>
      </div>
      <div class="station-actions">
        <button onclick="getRouteToStation('${station.id}', ${userLocation.lat}, ${userLocation.lng})">Get Directions</button>
      </div>
    `;
    
    stationCard.addEventListener('click', () => {
      map.flyTo({ center: [station.position.lon, station.position.lat], zoom: 15 });
      marker.togglePopup();
    });
    
    stationsContainer.appendChild(stationCard);
  });
}

// Clear all station markers from the map
function clearStationMarkers() {
  stationMarkers.forEach(marker => marker.remove());
  stationMarkers = [];
  
  if (routeLayer) {
    map.removeLayer(routeLayer.id);
    routeLayer = null;
  }
  
  closeRouteDetails();
}

// Get route to a specific station
function getRouteToStation(stationId, lat, lng) {
  fetch(`/api/routes/${stationId}?lat=${lat}&lon=${lng}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        displayRoute(data);
      } else {
        alert('Could not calculate route to this station.');
      }
    })
    .catch(error => {
      console.error('Error calculating route:', error);
      alert('An error occurred while calculating the route.');
    });
}

// Display route on the map and show route details
function displayRoute(routeData) {
  // Remove previous route if exists
  if (routeLayer) {
    map.removeLayer(routeLayer.id);
  }
  
  const route = routeData.route.routes[0];
  const routeGeoJson = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: route.legs[0].points.map(point => [point.longitude, point.latitude])
    }
  };
  
  // Add route to map
  routeLayer = map.addLayer({
    id: 'route',
    type: 'line',
    source: {
      type: 'geojson',
      data: routeGeoJson
    },
    paint: {
      'line-color': '#3498db',
      'line-width': 6,
      'line-opacity': 0.8
    }
  });
  
  // Fit map to route
  const bounds = new tt.LngLatBounds();
  routeGeoJson.geometry.coordinates.forEach(point => {
    bounds.extend(point);
  });
  map.fitBounds(bounds, { padding: 50 });
  
  // Show route details
  const routeDetails = document.getElementById('route-details');
  const distanceElement = document.getElementById('distance');
  const durationElement = document.getElementById('duration');
  const instructionsElement = document.getElementById('route-instructions');
  
  distanceElement.textContent = `Distance: ${(route.summary.lengthInMeters / 1000).toFixed(2)} km`;
  durationElement.textContent = `Duration: ${Math.round(route.summary.travelTimeInSeconds / 60)} min`;
  
  instructionsElement.innerHTML = '';
  route.guidance.instructions.forEach(instruction => {
    const instructionDiv = document.createElement('div');
    instructionDiv.className = 'instruction';
    instructionDiv.textContent = instruction.message;
    instructionsElement.appendChild(instructionDiv);
  });
  
  routeDetails.classList.remove('hidden');
}

// Close route details panel
function closeRouteDetails() {
  document.getElementById('route-details').classList.add('hidden');
}

// Update radius value display
function updateRadiusValue() {
  const radius = document.getElementById('radius-slider').value;
  document.getElementById('radius-value').textContent = radius;
}

// Make the getRouteToStation function available globally
window.getRouteToStation = getRouteToStation; 