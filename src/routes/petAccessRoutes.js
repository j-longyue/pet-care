const express = require('express');
const petAccessController = require('../controllers/petAccessController');

const router = express.Router({ mergeParams: true });

router.get('/', petAccessController.listAccess);
router.post('/', petAccessController.grantAccess);
router.patch('/:userId', petAccessController.updateAccess);
router.delete('/:userId', petAccessController.revokeAccess); 

module.exports = router;
