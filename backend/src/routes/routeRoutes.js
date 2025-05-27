const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

// GET route to the nearest charging station
router.get('/nearest', routeController.getRouteToNearestStation);

// GET route to a specific charging station
router.get('/:stationId', routeController.getRouteToStation);

module.exports = router;