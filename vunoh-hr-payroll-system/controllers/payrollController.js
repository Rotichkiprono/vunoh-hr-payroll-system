// controllers/payrollController.js
const supabase = require('../config/supabaseClient');

// Helper: Marginal Tax Bracket Calculation
// 0 - 20,000: 0% | 20,001 - 50,000: 10% | 50,001+: 20%
const calculateTax = (grossPay) => {
    let tax = 0;
    if (grossPay > 50000) {
        tax += (grossPay - 50000) * 0.20; // 20% on amount above 50k
        tax += 30000 * 0.10;              // 10% on the 20k-50k bracket
    } else if (grossPay > 20000) {
        tax += (grossPay - 20000) * 0.10; // 10% on amount above 20k
    }
    return tax;
};

// @desc    Generate payroll for a specific month and year
// @route   POST /api/payroll/generate
const generatePayroll = async (req, res) => {
    const { period_month, period_year } = req.body;

    if (!period_month || !period_year) {
        return res.status(400).json({ error: 'Please provide period_month and period_year' });
    }

    // 1. Fetch all active employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true);

    if (empError) return res.status(500).json({ error: empError.message });

    // 2. Fetch all approved UNPAID leave requests overlapping this month
    // We construct basic date boundaries for the month
    const startOfMonth = new Date(period_year, period_month - 1, 1).toISOString();
    const endOfMonth = new Date(period_year, period_month, 0).toISOString();

    const { data: unpaidLeaves, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'Approved')
        .eq('type', 'Unpaid')
        .gte('end_date', startOfMonth)
        .lte('start_date', endOfMonth);

    if (leaveError) return res.status(500).json({ error: leaveError.message });

    const payrollRecords = [];

    // 3. Process Payroll for each employee
    for (const emp of employees) {
        // Assume a standard 22 working day month for daily rate calculations
        const STANDARD_WORKING_DAYS = 22;
        const dailyRate = emp.base_salary / STANDARD_WORKING_DAYS;

        let workingDaysEligible = STANDARD_WORKING_DAYS;

        // EDGE CASE 1: Mid-Month Joiner
        const startDate = new Date(emp.start_date);
        const monthStartObj = new Date(period_year, period_month - 1, 1);

        if (startDate > monthStartObj) {
            // Prorate based on days missed from the start of the month
            // (Assuming flat 30-day month ratio for simple proration as per standard basic HR)
            const daysMissed = startDate.getDate() - 1;
            const workingDaysMissed = Math.floor(daysMissed * (22 / 30));
            workingDaysEligible -= workingDaysMissed;
        }

        // EDGE CASE 2: Unpaid Leave Deductions
        let unpaidLeaveDaysInMonth = 0;
        const employeeLeaves = unpaidLeaves.filter(l => l.employee_id === emp.id);

        employeeLeaves.forEach(leave => {
            // Calculate overlapping days. (Simplified: 1 leave day = 1 working day)
            const lStart = new Date(leave.start_date) > monthStartObj ? new Date(leave.start_date) : monthStartObj;
            const lEnd = new Date(leave.end_date) < new Date(period_year, period_month, 0) ? new Date(leave.end_date) : new Date(period_year, period_month, 0);

            const diffTime = Math.abs(lEnd - lStart);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            unpaidLeaveDaysInMonth += diffDays;
        });

        // Deduct unpaid leave days
        workingDaysEligible -= unpaidLeaveDaysInMonth;
        if (workingDaysEligible < 0) workingDaysEligible = 0; // Prevent negative pay

        // Calculate Financials
        const grossPay = dailyRate * workingDaysEligible;
        const ssDeduction = grossPay * 0.05; // Flat 5% Social Security

        // EDGE CASE 3: Zero-Deduction bounds (Handled cleanly by the calculateTax function)
        const taxDeduction = calculateTax(grossPay);

        const netPay = grossPay - ssDeduction - taxDeduction;

        payrollRecords.push({
            employee_id: emp.id,
            period_month,
            period_year,
            base_salary_at_time: emp.base_salary,
            unpaid_leave_days: unpaidLeaveDaysInMonth,
            gross_pay: parseFloat(grossPay.toFixed(2)),
            tax_deduction: parseFloat(taxDeduction.toFixed(2)),
            ss_deduction: parseFloat(ssDeduction.toFixed(2)),
            net_pay: parseFloat(netPay.toFixed(2))
        });
    }

    // 4. Bulk Insert to Supabase
    // The UNIQUE constraint in Supabase prevents running this twice for the same month
    const { data: insertedRecords, error: insertError } = await supabase
        .from('payroll_records')
        .insert(payrollRecords)
        .select(`
            *,
            employee:employee_id (name, role, team)
        `);

    if (insertError) {
        // If error code is 23505, it means unique violation (already generated)
        if (insertError.code === '23505') {
            return res.status(409).json({ error: `Payroll for ${period_month}/${period_year} has already been generated.` });
        }
        return res.status(500).json({ error: insertError.message });
    }

    res.status(201).json({
        message: `Payroll for ${period_month}/${period_year} generated successfully`,
        records: insertedRecords
    });
};

// @desc    Get payslips for a specific period
// @route   GET /api/payroll/:period_month/:period_year
const getPayrollRecords = async (req, res) => {
    const { period_month, period_year } = req.params;

    const { data, error } = await supabase
        .from('payroll_records')
        .select(`
            id, period_month, period_year, gross_pay, tax_deduction, ss_deduction, net_pay, unpaid_leave_days,
            employee:employee_id (name, role, team, employment_type)
        `)
        .eq('period_month', period_month)
        .eq('period_year', period_year);

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data);
};

module.exports = { generatePayroll, getPayrollRecords };