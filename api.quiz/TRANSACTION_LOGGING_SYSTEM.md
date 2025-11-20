# Transaction Logging & Revenue Analytics System

This document describes the comprehensive transaction logging and revenue analytics system implemented for wallet recharges, quiz purchases, course purchases, and revenue tracking.

## Overview

The system provides:
1. **Detailed transaction logs** for all wallet activities (recharges, purchases, sales, withdrawals)
2. **Revenue analytics** for admins to track platform revenue
3. **Creator revenue tracking** for quiz and course creators
4. **Individual purchase logs** for each quiz and course
5. **Enhanced filtering and reporting** capabilities

## Database Models

### WalletTransaction Model
Enhanced with:
- **Relationships**: `user()`, `quiz()`, `course()`
- **Scopes**: `ofType()`, `ofStatus()`, `dateRange()`
- **Helper methods**: `isCredit()`, `isDebit()`

### PlatformRevenue Model
Enhanced with:
- **Relationships**: `quiz()`, `course()`, `buyer()`
- **Scopes**: `ofSource()`, `dateRange()`, `byCreator()`

### Database Indexes
Added performance indexes on:
- `wallet_transactions`: type, status, user_id+created_at, type+status, created_at
- `platform_revenues`: source, quiz_id, course_id, buyer_id, created_at, source+created_at

## API Endpoints

### Transaction Logs (All Users)

#### 1. Get Transaction Logs
```
GET /api/transaction-logs
```
**Authentication**: Required

**Query Parameters**:
- `user_id` (integer, admin only) - Filter by specific user
- `type` (string) - Filter by transaction type (comma-separated): `recharge`, `quiz_purchase`, `course_purchase`, `quiz_sale`, `course_sale`, `withdrawal`, `platform_fee`
- `status` (string) - Filter by status (comma-separated): `pending`, `completed`, `failed`
- `from` (date, YYYY-MM-DD) - Start date for date range filter
- `to` (date, YYYY-MM-DD) - End date for date range filter
- `direction` (string) - Filter by `credit` or `debit`
- `per_page` (integer, 1-100) - Results per page (default: 25)

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "transaction_id": "uuid-string",
      "type": "quiz_purchase",
      "amount_cents": 50000,
      "status": "completed",
      "meta": {
        "quiz_id": 10,
        "quiz_title": "JavaScript Basics",
        "direction": "debit",
        "platform_fee_cents": 5000,
        "author_share_cents": 45000
      },
      "created_at": "2025-11-01T10:30:00Z",
      "user": {
        "id": 5,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total": 100,
    "last_page": 4
  }
}
```

**Access Control**:
- Regular users: See only their own transactions
- Admins/Superadmins: See all transactions or filter by user_id

#### 2. Get Transaction Summary
```
GET /api/transaction-logs/summary
```
**Authentication**: Required

**Query Parameters**:
- `user_id` (integer, admin only) - Get summary for specific user
- `from` (date) - Start date
- `to` (date) - End date

**Response**:
```json
{
  "total_recharges_cents": 500000,
  "total_purchases_cents": 200000,
  "total_sales_cents": 180000,
  "total_withdrawals_cents": 50000,
  "total_platform_fees_cents": 20000,
  "net_balance_cents": 430000,
  "transaction_count": 150,
  "completed_count": 145,
  "pending_count": 3,
  "failed_count": 2
}
```

#### 3. Get Single Transaction Details
```
GET /api/transaction-logs/{id}
```
**Authentication**: Required

**Response**: Single transaction object with user details

### Revenue Analytics

#### 4. Platform Revenue (Admin Only)
```
GET /api/revenue/platform
```
**Authentication**: Required (Admin/Superadmin only)

**Query Parameters**:
- `from` (date) - Start date
- `to` (date) - End date
- `source` (string) - Filter by source: `quiz_purchase`, `course_purchase`, `course_approval_fee`
- `per_page` (integer) - Results per page

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "quiz_id": 10,
      "course_id": null,
      "buyer_id": 5,
      "amount_cents": 5000,
      "source": "quiz_purchase",
      "created_at": "2025-11-01T10:30:00Z",
      "quiz": {
        "id": 10,
        "title": "JavaScript Basics",
        "owner_id": 8
      },
      "buyer": {
        "id": 5,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total": 50,
    "last_page": 2
  },
  "summary": {
    "total_revenue_cents": 250000
  }
}
```

#### 5. Platform Revenue Breakdown (Admin Only)
```
GET /api/revenue/platform/breakdown
```
**Authentication**: Required (Admin/Superadmin only)

**Query Parameters**:
- `from` (date) - Start date
- `to` (date) - End date

**Response**:
```json
{
  "breakdown": [
    {
      "source": "quiz_purchase",
      "total_cents": 150000,
      "count": 30
    },
    {
      "source": "course_purchase",
      "total_cents": 80000,
      "count": 16
    },
    {
      "source": "course_approval_fee",
      "total_cents": 20000,
      "count": 4
    }
  ],
  "total_revenue_cents": 250000
}
```

#### 6. My Quiz Revenue (Creator)
```
GET /api/revenue/my-quizzes
```
**Authentication**: Required

**Query Parameters**:
- `from` (date) - Start date
- `to` (date) - End date
- `per_page` (integer) - Results per page

**Response**:
```json
{
  "data": [
    {
      "id": 15,
      "user_id": 8,
      "transaction_id": "uuid",
      "type": "quiz_sale",
      "amount_cents": 45000,
      "status": "completed",
      "meta": {
        "quiz_id": 10,
        "quiz_title": "JavaScript Basics",
        "buyer_id": 5,
        "direction": "credit"
      },
      "created_at": "2025-11-01T10:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total": 30,
    "last_page": 2
  },
  "summary": {
    "total_revenue_cents": 1350000
  }
}
```

#### 7. My Course Revenue (Creator)
```
GET /api/revenue/my-courses
```
**Authentication**: Required

**Query Parameters**: Same as My Quiz Revenue

**Response**: Similar structure to My Quiz Revenue

#### 8. Quiz Purchase Log (Creator/Admin)
```
GET /api/revenue/quiz/{quiz}/purchases
```
**Authentication**: Required

**Access Control**:
- Quiz owner can view their quiz purchases
- Admins/Superadmins can view any quiz purchases

**Query Parameters**:
- `per_page` (integer) - Results per page

**Response**:
```json
{
  "data": [
    {
      "id": 20,
      "user_id": 5,
      "transaction_id": "uuid",
      "type": "quiz_purchase",
      "amount_cents": 50000,
      "status": "completed",
      "meta": {
        "quiz_id": 10,
        "quiz_title": "JavaScript Basics",
        "direction": "debit",
        "platform_fee_cents": 5000,
        "author_share_cents": 45000
      },
      "created_at": "2025-11-01T10:30:00Z",
      "user": {
        "id": 5,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total": 30,
    "last_page": 2
  },
  "summary": {
    "total_purchases": 30,
    "platform_revenue_cents": 150000,
    "creator_revenue_cents": 1350000,
    "total_gross_cents": 1500000
  }
}
```

#### 9. Course Purchase Log (Creator/Admin)
```
GET /api/revenue/course/{course}/purchases
```
**Authentication**: Required

**Access Control**:
- Course owner can view their course purchases
- Admins/Superadmins can view any course purchases

**Query Parameters**: Same as Quiz Purchase Log

**Response**: Similar structure to Quiz Purchase Log

## Transaction Types

The system tracks the following transaction types:

### Credit Transactions (Money In)
- `recharge` - Wallet recharge via payment gateway
- `quiz_sale` - Revenue from quiz purchase (creator's share)
- `course_sale` - Revenue from course purchase (creator's share)
- `platform_fee` - Platform commission (superadmin wallet)
- `refund` - Refund to user

### Debit Transactions (Money Out)
- `quiz_purchase` - User purchased a quiz
- `course_purchase` - User purchased a course
- `withdrawal` - User withdrew funds
- `publishing_fee` - Fee for publishing content
- `service_charge` - Other service charges

## Transaction Metadata

Each transaction includes a `meta` JSON field with contextual information:

### Recharge
```json
{
  "provider": "sslcommerz"
}
```

### Quiz/Course Purchase (Buyer)
```json
{
  "quiz_id": 10,
  "quiz_title": "JavaScript Basics",
  "direction": "debit",
  "platform_fee_cents": 5000,
  "author_share_cents": 45000
}
```

### Quiz/Course Sale (Creator)
```json
{
  "quiz_id": 10,
  "quiz_title": "JavaScript Basics",
  "buyer_id": 5,
  "direction": "credit"
}
```

### Platform Fee
```json
{
  "source": "quiz_purchase",
  "quiz_id": 10,
  "buyer_id": 5,
  "direction": "credit"
}
```

## Use Cases

### For Regular Users
1. View all their wallet transactions
2. See transaction summary (total recharges, purchases, balance)
3. Filter transactions by type, status, date range
4. View detailed transaction information

### For Quiz/Course Creators
1. Track revenue from their quiz sales
2. Track revenue from their course sales
3. View individual purchase logs for each quiz/course
4. See who purchased their content and when
5. View total earnings and number of sales

### For Admins/Superadmins
1. View all platform transactions
2. Filter transactions by any user
3. View platform revenue breakdown by source
4. Track total platform earnings
5. View purchase logs for any quiz or course
6. Monitor system-wide transaction statistics

## Performance Optimizations

Database indexes have been added to optimize common query patterns:
- Fast filtering by transaction type and status
- Efficient date range queries
- Optimized user transaction lookups
- Quick revenue aggregations by source

## Best Practices

1. **Always use pagination** - Default is 25 items per page, max 100
2. **Use date filters** - For better performance on large datasets
3. **Filter by status** - Use `status=completed` for final revenue calculations
4. **Check permissions** - Endpoints enforce proper access control
5. **Use summary endpoints** - For dashboard statistics instead of fetching all records

## Example Frontend Integration

### User Transaction History Page
```javascript
// Fetch user's transactions
const response = await fetch('/api/transaction-logs?per_page=25&status=completed', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data, meta } = await response.json();

// Fetch summary stats
const summaryResponse = await fetch('/api/transaction-logs/summary', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const summary = await summaryResponse.json();
```

### Creator Revenue Dashboard
```javascript
// Fetch quiz revenue
const quizRevenue = await fetch('/api/revenue/my-quizzes?from=2025-01-01', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Fetch course revenue
const courseRevenue = await fetch('/api/revenue/my-courses?from=2025-01-01', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// View specific quiz purchases
const quizPurchases = await fetch(`/api/revenue/quiz/${quizId}/purchases`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Admin Platform Analytics
```javascript
// View platform revenue breakdown
const breakdown = await fetch('/api/revenue/platform/breakdown?from=2025-01-01&to=2025-12-31', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// View all platform revenue transactions
const platformRevenue = await fetch('/api/revenue/platform?per_page=50', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Testing

Run the existing tests to ensure all functionality works:
```bash
cd api.quiz
php artisan test
```

## Future Enhancements

Potential improvements:
1. Export transactions to CSV/Excel
2. Email notifications for transactions
3. Revenue forecasting and analytics
4. Automated revenue reports
5. Transaction dispute/refund system
6. Detailed tax reporting
