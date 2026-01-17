const express = require('express');
const router = express.Router();
const analizController = require('../controllers/analizController');
const rentController = require('../controllers/rentController');
const logisticsController = require('../controllers/logisticsController');
const hrController = require('../controllers/hrController');

router.get('/cannibalization', analizController.getCannibalization);

router.get('/competitor', analizController.getCompetitorAnalysis);

router.get('/kira-analizi', rentController.getRentAnalysis);

router.get('/lojistik-analizi', logisticsController.getSeasonalLogistics);

router.get('/ik-analizi', hrController.getHRAnalysis);

router.get('/aylik-ciro', analizController.getMonthlyRevenue);

router.get('/top-magazalar', analizController.getTopStores);

router.get('/tum-magazalar-kds', analizController.getAllStoresKDS);

router.get('/iller', analizController.getIller);

router.get('/ilceler', analizController.getIlceler);

router.get('/demografiler', analizController.getDemografiler);

router.get('/hedef-analizi', analizController.getHedefAnalizi);

router.get('/arama', analizController.searchStores);

router.get('/magaza-performans/:id', analizController.getMagazaPerformans);

router.get('/magaza-detayli/:id', analizController.getMagazaDetayliAnaliz);

router.get('/magaza-benchmark/:id', analizController.getMagazaBenchmark);

router.get('/magaza-kira-ciro/:id', analizController.getMagazaKiraCiro);

router.get('/tarihler', analizController.getTarihler);

router.get('/karsilastir', analizController.getKarsilastirma);

router.get('/senaryo-verileri', analizController.getSenaryoVerileri);

module.exports = router;
