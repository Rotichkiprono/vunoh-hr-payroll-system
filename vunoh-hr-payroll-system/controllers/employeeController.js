// controllers/employeeController.js
const supabase = require('../config/supabaseClient');

// @desc    Get all active employees (includes Manager details for Org View)
// @route   GET /api/employees
const getEmployees = async (req, res) => {
    // Supabase allows us to join the table to itself to get the manager's name easily
    const { data, error } = await supabase
        .from('employees')
        .select(`
            id, name, role, team, start_date, base_salary, employment_type,
            manager:manager_id (id, name)
        `)
        .eq('is_active', true) // Business Logic: Only fetch active employees
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data);
};

// @desc    Create a new employee
// @route   POST /api/employees
const createEmployee = async (req, res) => {
    const { name, role, team, manager_id, start_date, base_salary, employment_type } = req.body;

    const { data, error } = await supabase
        .from('employees')
        .insert([{ name, role, team, manager_id, start_date, base_salary, employment_type }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: 'Employee created', employee: data[0] });
};

// @desc    Deactivate an employee (Soft Delete)
// @route   PATCH /api/employees/:id/deactivate
const deactivateEmployee = async (req, res) => {
    const { id } = req.params;

    // Business Logic: We update the status rather than executing a DELETE query
    const { data, error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    if (data.length === 0) return res.status(404).json({ error: 'Employee not found' });

    res.status(200).json({ message: 'Employee deactivated successfully. Payroll history preserved.', employee: data[0] });
};

module.exports = { getEmployees, createEmployee, deactivateEmployee };