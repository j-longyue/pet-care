const express = require('express');
const PetController = require('../controllers/petController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.post('/', PetController.create);
router.get('/pets-list', PetController.getAll);
router.get('/:id', PetController.getById);
router.put('/:id', PetController.update);
router.delete('/:id', PetController.delete);

module.exports = router;