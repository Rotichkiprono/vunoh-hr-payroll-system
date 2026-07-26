// public/app.js

const API_URL = '/api';

// --- Navigation ---
function showSection(sectionId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    if (sectionId === 'employees') fetchEmployees();
    if (sectionId === 'leave') {
        fetchPendingLeave();
        populateEmployeeDropdown();
    }
}

// --- Employees Module ---
async function fetchEmployees() {
    const list = document.getElementById('employees-list');
    list.innerHTML = '<p class="empty-state">Loading...</p>';
    try {
        const res = await fetch(`${API_URL}/employees`);
        const employees = await res.json();

        if (employees.length === 0) {
            list.innerHTML = '<p class="empty-state">No active employees found.</p>';
            return;
        }

        list.innerHTML = employees.map(emp => `
            <div class="card">
                <h4>${emp.name}</h4>
                <p><strong>Role:</strong> ${emp.role}</p>
                <p><strong>Team:</strong> ${emp.team}</p>
                <p><strong>Base Salary:</strong> KES ${emp.base_salary}</p>
                <button class="btn-danger" onclick="deactivateEmployee('${emp.id}')">Deactivate</button>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<p class="empty-state" style="color:red">Error loading employees.</p>`;
    }
}

async function deactivateEmployee(id) {
    if (!confirm('Are you sure you want to deactivate this employee?')) return;
    await fetch(`${API_URL}/employees/${id}/deactivate`, { method: 'PATCH' });
    fetchEmployees();
}

// --- Leave Management Module ---
async function populateEmployeeDropdown() {
    const select = document.getElementById('leave-employee-id');
    const res = await fetch(`${API_URL}/employees`);
    const employees = await res.json();
    select.innerHTML = employees.map(emp => `<option value="${emp.id}">${emp.name} (${emp.team})</option>`).join('');
}

document.getElementById('leave-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-leave-btn');
    const msg = document.getElementById('leave-message');
    btn.disabled = true;
    btn.innerText = 'Submitting...';

    const payload = {
        employee_id: document.getElementById('leave-employee-id').value,
        start_date: document.getElementById('leave-start').value,
        end_date: document.getElementById('leave-end').value,
        type: document.getElementById('leave-type').value
    };

    const res = await fetch(`${API_URL}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        msg.innerText = 'Request submitted!';
        msg.style.color = 'green';
        fetchPendingLeave();
    } else {
        msg.innerText = 'Error submitting request.';
        msg.style.color = 'red';
    }
    btn.disabled = false;
    btn.innerText = 'Submit Request';
});

async function fetchPendingLeave() {
    const list = document.getElementById('leave-requests-list');
    list.innerHTML = '<p class="empty-state">Loading requests...</p>';
    const res = await fetch(`${API_URL}/leave/pending`);
    const requests = await res.json();

    if (requests.length === 0) {
        list.innerHTML = '<p class="empty-state">No pending requests.</p>';
        return;
    }

    list.innerHTML = requests.map(req => `
        <div class="card ${req.is_stale ? 'stale-warning' : ''}" style="margin-bottom: 1rem;">
            ${req.is_stale ? '<span style="color:red; font-size:0.8rem; font-weight:bold;">⚠️ Unanswered > 48hrs</span>' : ''}
            <p><strong>${req.employee.name}</strong> (${req.employee.team})</p>
            <p>${req.start_date} to ${req.end_date} - <em>${req.type}</em></p>
            <div style="margin-top: 10px;">
                <button class="btn-success" onclick="resolveLeave('${req.id}', 'Approved')">Approve</button>
                <button class="btn-danger" onclick="resolveLeave('${req.id}', 'Rejected')">Reject</button>
            </div>
        </div>
    `).join('');
}

async function resolveLeave(id, status) {
    const res = await fetch(`${API_URL}/leave/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }) // Manager ID is omitted for simplicity in this demo
    });
    const data = await res.json();
    if (!res.ok) {
        alert(`Error: ${data.message || data.error}`); // Shows the under-coverage safeguard
    }
    fetchPendingLeave();
}

// --- Payroll Module ---
document.getElementById('payroll-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('generate-payroll-btn');
    const msg = document.getElementById('payroll-message');
    btn.disabled = true;
    btn.innerText = 'Processing...';

    const payload = {
        period_month: document.getElementById('payroll-month').value,
        period_year: document.getElementById('payroll-year').value
    };

    const res = await fetch(`${API_URL}/payroll/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
        msg.innerText = data.message;
        msg.style.color = 'green';
        fetchPayslips(payload.period_month, payload.period_year);
    } else {
        msg.innerText = data.error;
        msg.style.color = 'red';
    }
    btn.disabled = false;
    btn.innerText = 'Run Payroll';
});

document.getElementById('fetch-payroll-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const month = document.getElementById('fetch-month').value;
    const year = document.getElementById('fetch-year').value;
    fetchPayslips(month, year);
});

async function fetchPayslips(month, year) {
    const list = document.getElementById('payroll-list');
    list.innerHTML = '<p class="empty-state">Fetching payslips...</p>';

    const res = await fetch(`${API_URL}/payroll/${month}/${year}`);
    const payslips = await res.json();

    if (payslips.length === 0) {
        list.innerHTML = '<p class="empty-state">No payroll records found for this period.</p>';
        return;
    }

    list.innerHTML = payslips.map(slip => `
        <div class="card">
            <h4>${slip.employee.name}</h4>
            <p><strong>Gross Pay:</strong> KES ${slip.gross_pay}</p>
            <p><strong>Tax:</strong> - KES ${slip.tax_deduction}</p>
            <p><strong>NSSF:</strong> - KES ${slip.ss_deduction}</p>
            ${slip.unpaid_leave_days > 0 ? `<p style="color:red">Unpaid Days Deducted: ${slip.unpaid_leave_days}</p>` : ''}
            <hr>
            <p style="font-size:1.2rem; font-weight:bold; color:var(--success);">Net Pay: KES ${slip.net_pay}</p>
        </div>
    `).join('');
}

// Init
fetchEmployees();