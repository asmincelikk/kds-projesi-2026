const express = require('express');
const router = express.Router();
const rakipController = require('../controllers/rakipController');

router.get('/structure', rakipController.getRakiplerTableStructure);

module.exports = router;
