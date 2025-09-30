## Requirements Overview

### 1) Authentication & Roles
- Roles: SuperAdmin, Admin, User
- Role-based permissions enforced across API and UI

### 2) Category Management
- Category CRUD available to Admin and SuperAdmin

### 3) Quiz Management
- Create quizzes (Free and Paid)
- Import questions from CSV
- AI-assisted question generation from images (image-to-question)
- Negative marking support
- Quiz enrollment
- Quiz attempts tracking
- Quiz leaderboard

- Question types: MCQ (single/multiple answer), True/False
- Time limits (per quiz; optional per question)
- Attempt limits per user
- Shuffle questions and options
- Per-question points and explanations
- Result visibility controls (immediate, after quiz closes)
- Ratings and reviews for quizzes
- Bookmark/favorite quizzes

### 4) Course Management
- Create courses (Free and Paid)
- Manage curriculum and content (video, lessons, pdf, quiz)
- Course enrollment
- Course progress tracking
- Course reviews and ratings

- Pricing and discounts/coupons
- Prerequisites and tags/categories
- Downloadable resources/attachments
- Bookmark/favorite courses

### 5) Quiz Publishing Workflow
- Any User or Admin can create a quiz
- Workflow states: Draft → Submitted for Approval → Approved or Rejected

- Moderation notes on approval/rejection
- Author notifications on status changes

### 6) Course Publishing Workflow
- Any User or Admin can create a course
- Workflow states: Draft → Submitted for Approval → Approved or Rejected

- Moderation notes on approval/rejection
- Author notifications on status changes

### 7) Payments, Fees, and Revenue Sharing
- Quizzes: Paid quiz approval requires a fee deducted from the author’s wallet; on purchase, platform commission is deducted and the remainder is credited to the author’s wallet
- Courses: Paid course approval requires a fee deducted from the author’s wallet; on purchase, platform commission is deducted and the remainder is credited to the author’s wallet

- Refunds (policy-based)
- Invoices/receipts for purchases
- Payouts funded via wallet withdrawals (see Payouts & Withdrawals)

### 8) Wallet
- Recharge methods: bKash and SSLCommerz
- Purchase paid quizzes using wallet balance
 - Purchase paid courses using wallet balance

- Transaction history and downloadable statements
- Balance holds for pending withdrawals or disputes

### 9) SuperAdmin Settings
- Payment methods configuration: Stripe, SSLCommerz
- Quiz approval fee
- Course approval fee
- Platform commission rate

- Withdrawal settings (minimum amount, fees), refund policy controls
- Notification templates and toggles
- Discounts/coupons configuration

### 10) Payouts & Withdrawals
- Creators can request withdrawals from wallet balance
- Admin/SuperAdmin approve or deny withdrawal requests
- Supported payout methods configurable (e.g., bank, mobile wallet)
- Track withdrawal status and history

### 11) Notifications
- Email and in-app notifications for purchases, enrollments, approvals, rejections, payouts
- Configurable delivery and per-event opt-in

### 12) Search & Discovery
- Search courses and quizzes by title, category, tags, price, rating
- Filters (free/paid, difficulty if applicable) and sorting (newest, popular, rating)

### 13) Reports
- SuperAdmin: Users list, users’ wallet balances, user revenue (platform charges and approval charges), transaction history, user publications; comprehensive reporting
- Admin: Users list, quizzes list, courses list, approval queue
- User: Course-wise revenue, total purchases, transaction history
