const express = require('express');
const router = express.Router();
const magazaController = require('../controllers/magazaController');

router.get('/magazalar', magazaController.getAllMagazalar);

router.get('/magazalar/:id', magazaController.getMagazaById);

router.post('/magazalar', magazaController.createMagaza);

router.put('/magazalar/:id', magazaController.updateMagaza);

router.delete('/magazalar/:id', magazaController.deleteMagaza);

module.exports = router;
