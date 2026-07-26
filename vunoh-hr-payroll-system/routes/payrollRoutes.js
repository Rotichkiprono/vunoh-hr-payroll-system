// routes/payrollRoutes.js
const express = require('express');
const router = express.Router();
const { generatePayroll, getPayrollRecords } = require('../controllers/payrollController');

router.post('/generate', generatePayroll);
router.get('/:period_month/:period_year', getPayrollRecords);

module.exports = router;