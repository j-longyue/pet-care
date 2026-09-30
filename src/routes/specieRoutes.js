const express = require('express');
const specieController = require('../controllers/specieController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', specieController.getSpecies);
router.get('/deleted-log', specieController.getDeletedSpeciesLog);
router.get('/:id', specieController.getSpecieById);
router.post('/', specieController.createSpecie);
router.delete('/:id', specieController.deleteSpecie);

module.exports = router;