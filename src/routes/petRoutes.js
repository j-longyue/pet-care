const express = require('express');
const PetController = require('../controllers/petController');
const PetAccessController = require('../controllers/petAccessController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.post('/', PetController.create);
router.get('/pets-list', PetController.getAll);
router.get('/:id', PetController.getById);
router.put('/:id', PetController.update);
router.delete('/:id', PetController.delete);

router.get('/:petId/access', PetAccessController.listAccess);
router.post('/:petId/access', PetAccessController.grantAccess);
router.patch('/:petId/access/:userId', PetAccessController.updateAccess); 
router.delete('/:petId/access/:userId', PetAccessController.revokeAccess);

module.exports = router;