# Feature: Approval & Fee Logic

## Overview
Manages approval workflow and fee deduction for paid content.

## Details
- Paid quizzes/courses require approval charge.
- Admin/Superadmin review and approve content.
- Approval locks content type (free/paid).
- System fee deducted on every paid purchase.
- Suggestions: Make approval workflow auditable, add automated reminders for pending approvals.

## Configurable Settings
- **Paid Quiz Approval Fee**: Amount charged to approve a paid quiz.
- **Paid Course Approval Fee**: Amount charged to approve a paid course.
- **Free Course Approval Fee**: Amount charged to approve a free course (if applicable).
- **System Service Charge**: Percentage deducted from each paid quiz/course purchase as platform fee.
- **Payment Methods**: List of enabled payment gateways (e.g., SSLCommerz, bKash) and their configuration details (API keys, credentials, etc.).
