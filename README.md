# VunohGlobal HR & Payroll System
**Live Demo:** https://vunoh-hr-payroll-system.vercel.app/

## Overview
A lightweight HR & Payroll management tool built with Express.js, Supabase (PostgreSQL), and Vanilla JS. Designed to replace spreadsheet-based HR workflows with strict data integrity, leave safeguards, and automated payroll calculations.

## Tech Stack
* **Backend:** Express.js (Node.js)
* **Database:** PostgreSQL (Supabase) for native relational constraints.
* **Frontend:** Vanilla JS, HTML, CSS (Single Page Application layout, Fetch API).

## What I Prioritized & Why
As requested in the brief, I avoided building an overly complex UI framework (like React) or broad CRUD forms. Instead, I prioritized **Core Business Logic and Data Integrity**:
1.  **Historical Integrity:** Employees are soft-deleted (`is_active: false`), and payroll records snapshot `base_salary_at_time`. A raise tomorrow won't break yesterday's payslip.
2.  **Idempotent Payroll:** A unique constraint (`employee_id`, `month`, `year`) ensures HR can never accidentally generate double payroll for the same month.
3.  **Strict Leave Constraints:** Real leave systems fail when teams are left under-covered or requests are ignored. I built explicit safeguards for these (detailed below).

## Core Modules & Business Logic

### 1. Leave Management Safeguards
* **Problem 1: Under-staffing.** Spreadsheets don't warn you if everyone takes leave at once.
    * **Solution Built:** The `resolveLeaveRequest` controller fetches active team members and overlapping approved leave. If approving a request pushes >50% of a specific team into absence simultaneously, the API throws an "Under-coverage Safeguard Triggered" error and blocks approval.
* **Problem 2: Ignored Requests.**
    * **Solution Built:** The API calculates how long a request has been pending. If `> 48 hours`, it attaches an `is_stale: true` flag, which the frontend renders as a high-visibility warning.

### 2. Payroll Formula & Assumptions
Payroll calculates dynamically based on base salary, start dates, and leave types.
* **Daily Rate:** Calculated as `Base Salary / 22` (assuming 22 standard working days per month).
* **Edge Case - Mid-Month Joiners:** Prorated based on days missed from the start of the month to their start date.
* **Edge Case - Unpaid Leave:** Cross-references approved `Unpaid` leave overlapping the generated month and deducts from eligible working days.
* **Deductions:** 
  * **Social Security (NSSF proxy):** Flat 5% of Gross Pay.
  * **Marginal Tax:** 
    * 0 - 20,000: 0% Tax (Zero-deduction edge case handled natively)
    * 20,001 - 50,000: 10% Tax
    * 50,001+: 20% Tax

## How to Run Locally
1. Clone the repository.
2. Run `npm install` to install dependencies (`express`, `@supabase/supabase-js`, `cors`, `dotenv`).
3. Set up a PostgreSQL database (or Supabase project) and run the provided `schema.sql` file to create tables and mock data.
4. Create a `.env` file in the root with your database credentials:
PORT=3000
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key

5. Run `npm start` (or `npm run dev`).
6. Navigate to `http://localhost:3000` in your browser.

## Improvements Given More Time
* **Authentication/RBAC:** I would implement JWT-based role access so only Managers can approve leave, and only HR can run payroll.
* **Holiday API Integration:** Integrate a public holiday API so standard holidays aren't counted against paid leave balances.
* **Batch Approvals:** Allow managers to approve multiple leave requests at once on the frontend.
