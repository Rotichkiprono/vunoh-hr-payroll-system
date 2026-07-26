// controllers/leaveController.js
const supabase = require('../config/supabaseClient');

// @desc    Submit a new leave request
// @route   POST /api/leave
const requestLeave = async (req, res) => {
    const { employee_id, start_date, end_date, type } = req.body;

    const { data, error } = await supabase
        .from('leave_requests')
        .insert([{ employee_id, start_date, end_date, type, status: 'Pending' }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: 'Leave request submitted successfully', request: data[0] });
};

// @desc    Get pending leave requests (with "unanswered" safeguard)
// @route   GET /api/leave/pending
const getPendingRequests = async (req, res) => {
    const { data, error } = await supabase
        .from('leave_requests')
        .select(`
            id, start_date, end_date, type, status, created_at,
            employee:employee_id (name, team)
        `)
        .eq('status', 'Pending');

    if (error) return res.status(500).json({ error: error.message });

    // Business Logic: Identify requests sitting unanswered for > 48 hours
    const now = new Date();
    const enrichedData = data.map(request => {
        const createdAt = new Date(request.created_at);
        const hoursPending = (now - createdAt) / (1000 * 60 * 60);
        return {
            ...request,
            is_stale: hoursPending > 48 // Frontend can use this to highlight the request in red
        };
    });

    res.status(200).json(enrichedData);
};

// @desc    Approve or Reject a leave request (with Under-coverage Safeguard)
// @route   PATCH /api/leave/:id/resolve
const resolveLeaveRequest = async (req, res) => {
    const { id } = req.params;
    const { status, manager_id } = req.body; // status must be 'Approved' or 'Rejected'

    if (status !== 'Approved' && status !== 'Rejected') {
        return res.status(400).json({ error: "Status must be 'Approved' or 'Rejected'" });
    }

    // 1. Fetch the request details to get the employee and dates
    const { data: requestData, error: reqError } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date, employee:employee_id (team)')
        .eq('id', id)
        .single();

    if (reqError || !requestData) return res.status(404).json({ error: 'Request not found' });

    // BUSINESS LOGIC: The Under-coverage Safeguard (Only check if attempting to Approve)
    if (status === 'Approved') {
        const teamName = requestData.employee.team;

        // Fetch all active employees in this team
        const { data: teamMembers, error: teamError } = await supabase
            .from('employees')
            .select('id')
            .eq('team', teamName)
            .eq('is_active', true);

        if (teamError) return res.status(500).json({ error: teamError.message });
        const teamSize = teamMembers.length;
        const teamIds = teamMembers.map(m => m.id);

        // Fetch overlapping approved leaves for this team
        const { data: overlappingLeaves, error: overlapError } = await supabase
            .from('leave_requests')
            .select('id')
            .eq('status', 'Approved')
            .in('employee_id', teamIds)
            .lte('start_date', requestData.end_date)
            .gte('end_date', requestData.start_date);

        if (overlapError) return res.status(500).json({ error: overlapError.message });

        // Safeguard Check: If approving this pushes > 50% of the team on leave
        const peopleOnLeave = overlappingLeaves.length;
        if ((peopleOnLeave + 1) / teamSize > 0.5) {
            return res.status(400).json({
                error: 'Under-coverage Safeguard Triggered',
                message: `Approval blocked. ${peopleOnLeave} members of the ${teamName} team are already on leave during these dates. Approving this exceeds the 50% team absence limit.`
            });
        }
    }

    // 2. Resolve the request if safeguards pass
    const { data: updatedRequest, error: updateError } = await supabase
        .from('leave_requests')
        .update({ status, manager_id })
        .eq('id', id)
        .select();

    if (updateError) return res.status(500).json({ error: updateError.message });

    res.status(200).json({
        message: `Leave request formally ${status.toLowerCase()}`,
        request: updatedRequest[0]
    });
};

module.exports = { requestLeave, getPendingRequests, resolveLeaveRequest };