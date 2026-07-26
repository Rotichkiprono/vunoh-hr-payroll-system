// routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const { requestLeave, getPendingRequests, resolveLeaveRequest } = require('../controllers/leaveController');

router.post('/', requestLeave);
router.get('/pending', getPendingRequests);
router.patch('/:id/resolve', resolveLeaveRequest);

module.exports = router;