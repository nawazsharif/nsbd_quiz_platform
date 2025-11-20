# NSBD Quiz Platform: High-Level Project Requirements

## 1. Platform Overview
A learning platform for quizzes and courses, supporting free and paid content, wallet-based transactions, multi-role access, and progress tracking.

## 2. User Roles
- **Superadmin**: Full access, can approve/reject quizzes/courses, manage users, set system fees, and view all analytics.
- **Admin**: Can review/approve quizzes/courses, manage content, moderate users, and view analytics.
- **User**: Can create quizzes/courses, purchase content, participate in leaderboards, and manage their wallet.

**Suggestion:** Consider adding user profile customization and activity logs for all roles.

## 3. Quiz Management
- Any user can create quizzes (MCQ, fill-in-the-blank, true/false supported).
- Quizzes can be free or paid.
- Quizzes require approval by Admin/Superadmin before publishing.
- Paid quizzes incur an approval charge.
- Once approved/published, quiz type (free/paid) cannot be changed.
- Only the author, Admin, or Superadmin can modify quizzes before approval.

**Suggestion:** Add quiz versioning or draft mode so authors can update content without affecting published quizzes. Consider supporting question pools and randomization for advanced quiz delivery.

## 4. Course Management
- Courses can be created by users.
- Free and paid courses supported; paid courses require approval charge.
- Approval by Admin/Superadmin required before publishing.
- Course type (free/paid) is locked after approval.
- Only author, Admin, or Superadmin can modify courses before approval.

**Suggestion:** Support course modules/sections for better organization and progress tracking. Enable prerequisites and course completion certificates.

## 5. Leaderboards & Progress Tracking
- Each quiz and course has an individual leaderboard.
- User progress is tracked for each quiz/course.
- Leaderboards display top performers and completion stats.

**Suggestion:** Add time-based leaderboards (weekly/monthly) and badges/achievements for engagement. Consider analytics dashboards for users and creators.

## 6. Wallet System & Transactions
- Users must recharge their wallet to make purchases.
- All transactions (purchases, withdrawals) are wallet-based.
- Minimum withdrawal amount enforced.
- Users can withdraw funds from their wallet.
- When a paid quiz/course is purchased:
  - Amount is deducted from buyer's wallet.
  - System fee is deducted from the purchase amount.
  - Remaining amount is credited to the author's wallet.

**Suggestion:** Add transaction notifications and downloadable statements for users/authors. Consider supporting multiple payment gateways and currencies.

## 7. Approval & Fee Logic
- Paid quizzes/courses require an approval charge.
- Admin/Superadmin review and approve content.
- Approval locks content type (free/paid).
- System fee deducted on every paid purchase.

**Suggestion:** Make approval workflow auditable (log actions, timestamps, reviewer info). Add automated reminders for pending approvals.

## 8. Security & Permissions
- Role-based access control enforced throughout.
- Only authorized users can approve, modify, or manage content.
- Secure wallet and transaction handling.

**Suggestion:** Add 2FA for admins/superadmins and audit logs for sensitive actions. Consider regular security reviews and penetration testing.

## 9. Additional Features
- Rich question types and editor support.
- Individual and aggregate revenue analytics for creators.
- Transaction history and reporting for all users.
- Robust error handling and audit logging.

**Suggestion:** Add API rate limiting and monitoring for security and reliability. Consider mobile app support and accessibility improvements.

---
This document summarizes the high-level requirements for the NSBD Quiz Platform, covering user roles, content management, wallet logic, approval flows, and analytics. Suggestions are included for future improvements and best practices. For feature-specific details, see the individual files in the `doc` directory.
