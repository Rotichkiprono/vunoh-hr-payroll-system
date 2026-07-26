-- schema.sql
-- VunohGlobal HR & Payroll System - SQL Dump
-- Database: PostgreSQL (Supabase)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SCHEMA DEFINITIONS
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    team VARCHAR(100) NOT NULL,
    manager_id UUID REFERENCES employees(id),
    start_date DATE NOT NULL,
    base_salary DECIMAL(10, 2) NOT NULL,
    employment_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Paid', 'Unpaid')),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    manager_id UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) NOT NULL,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INT NOT NULL,
    base_salary_at_time DECIMAL(10, 2) NOT NULL,
    unpaid_leave_days INT DEFAULT 0,
    gross_pay DECIMAL(10, 2) NOT NULL,
    tax_deduction DECIMAL(10, 2) NOT NULL,
    ss_deduction DECIMAL(10, 2) NOT NULL,
    net_pay DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, period_month, period_year)
);

-- 2. SEED DATA (MOCK COMPANY)
INSERT INTO employees (id, name, role, team, start_date, base_salary, employment_type) 
VALUES 
('d1f5a5b1-2b3a-4b1a-8c3a-1d5b1a3c5d6e', 'Omondi Manager', 'Engineering Lead', 'Engineering', '2025-01-15', 120000, 'Full-time');

INSERT INTO employees (name, role, team, manager_id, start_date, base_salary, employment_type)
VALUES 
('Kiptoo Developer', 'Backend Engineer', 'Engineering', 'd1f5a5b1-2b3a-4b1a-8c3a-1d5b1a3c5d6e', '2026-06-10', 80000, 'Full-time'),
('Nafula Junior', 'Frontend Engineer', 'Engineering', 'd1f5a5b1-2b3a-4b1a-8c3a-1d5b1a3c5d6e', '2026-07-15', 45000, 'Full-time'),
('Njeri Intern', 'QA Tester', 'Engineering', 'd1f5a5b1-2b3a-4b1a-8c3a-1d5b1a3c5d6e', '2026-01-10', 15000, 'Contractor');