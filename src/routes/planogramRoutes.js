const express = require('express');
const router = express.Router();
const planogramController = require('../controllers/planogramController');

router.get('/suggestions', planogramController.getPlanogramSuggestions);

router.get('/ciro-analizi', planogramController.getPlanogramCiroAnalysis);

module.exports = router;
