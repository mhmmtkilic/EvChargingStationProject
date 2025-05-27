const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');

// GET nearby charging stations
router.get('/nearby', stationController.getNearbyStations);

// GET details for a specific charging station
router.get('/:id', stationController.getStationDetails);

module.exports = router;