// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const employeeRoutes = require('./routes/employeeRoutes');
const leaveRoutes = require('./routes/leaveRoutes'); 
const payrollRoutes = require('./routes/payrollRoutes');

// Mount Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/leave', leaveRoutes); 
app.use('/api/payroll', payrollRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Vunoh HR & Payroll API is running cleanly.' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server successfully running on port ${PORT}`);
});