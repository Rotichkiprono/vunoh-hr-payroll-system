// routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const { getEmployees, createEmployee, deactivateEmployee } = require('../controllers/employeeController');

router.get('/', getEmployees);
router.post('/', createEmployee);
router.patch('/:id/deactivate', deactivateEmployee);

module.exports = router;