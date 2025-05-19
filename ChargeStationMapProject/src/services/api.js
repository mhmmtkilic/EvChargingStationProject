// API endpoints and configuration
const API_BASE_URL = 'YOUR_API_BASE_URL';

export const fetchChargeStations = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/stations`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching charge stations:', error);
    throw error;
  }
}; 