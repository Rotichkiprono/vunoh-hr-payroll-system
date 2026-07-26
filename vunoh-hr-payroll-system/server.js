// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for development; adjust in production
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.static('public'));

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

// Serve static frontend files from 'public'
app.use(express.static('public'));

// Only start local listener when NOT on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export app instance for Vercel serverless execution
module.exports = app;