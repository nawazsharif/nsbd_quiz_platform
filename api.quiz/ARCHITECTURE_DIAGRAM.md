# Transaction Logging System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION LOGGING SYSTEM                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────┐      ┌──────────────────────────┐          │
│  │  wallet_transactions    │      │   platform_revenues      │          │
│  ├─────────────────────────┤      ├──────────────────────────┤          │
│  │ • id                    │      │ • id                     │          │
│  │ • user_id (indexed)     │      │ • quiz_id (indexed)      │          │
│  │ • transaction_id (UUID) │      │ • course_id (indexed)    │          │
│  │ • type (indexed)        │      │ • buyer_id (indexed)     │          │
│  │ • amount_cents          │      │ • amount_cents           │          │
│  │ • status (indexed)      │      │ • source (indexed)       │          │
│  │ • meta (JSON)           │      │ • created_at (indexed)   │          │
│  │ • created_at (indexed)  │      └──────────────────────────┘          │
│  └─────────────────────────┘                                             │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            MODEL LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────┐      ┌──────────────────────────┐          │
│  │  WalletTransaction      │      │   PlatformRevenue        │          │
│  ├─────────────────────────┤      ├──────────────────────────┤          │
│  │ Relationships:          │      │ Relationships:           │          │
│  │ • user()                │      │ • quiz()                 │          │
│  │ • quiz()                │      │ • course()               │          │
│  │ • course()              │      │ • buyer()                │          │
│  │                         │      │                          │          │
│  │ Scopes:                 │      │ Scopes:                  │          │
│  │ • ofType()              │      │ • ofSource()             │          │
│  │ • ofStatus()            │      │ • dateRange()            │          │
│  │ • dateRange()           │      │ • byCreator()            │          │
│  │                         │      │                          │          │
│  │ Helpers:                │      └──────────────────────────┘          │
│  │ • isCredit()            │                                             │
│  │ • isDebit()             │                                             │
│  └─────────────────────────┘                                             │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTROLLER LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │          TransactionLogController                        │            │
│  ├──────────────────────────────────────────────────────────┤            │
│  │ • index()    - List transactions with filters            │            │
│  │ • summary()  - Get summary statistics                    │            │
│  │ • show()     - Get single transaction details            │            │
│  └──────────────────────────────────────────────────────────┘            │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │         RevenueAnalyticsController                       │            │
│  ├──────────────────────────────────────────────────────────┤            │
│  │ • platformRevenue()          - Admin: platform revenue   │            │
│  │ • platformRevenueBreakdown() - Admin: breakdown by source│            │
│  │ • myQuizRevenue()            - Creator: quiz earnings    │            │
│  │ • myCourseRevenue()          - Creator: course earnings  │            │
│  │ • quizPurchases()            - Quiz purchase log         │            │
│  │ • coursePurchases()          - Course purchase log       │            │
│  └──────────────────────────────────────────────────────────┘            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            API ROUTES                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Transaction Logs (All Users)                                            │
│  ├─ GET /api/transaction-logs                                            │
│  ├─ GET /api/transaction-logs/summary                                    │
│  └─ GET /api/transaction-logs/{id}                                       │
│                                                                           │
│  Revenue Analytics (Admins)                                              │
│  ├─ GET /api/revenue/platform                                            │
│  └─ GET /api/revenue/platform/breakdown                                  │
│                                                                           │
│  Revenue Analytics (Creators)                                            │
│  ├─ GET /api/revenue/my-quizzes                                          │
│  ├─ GET /api/revenue/my-courses                                          │
│  ├─ GET /api/revenue/quiz/{quiz}/purchases                               │
│  └─ GET /api/revenue/course/{course}/purchases                           │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        TRANSACTION FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. WALLET RECHARGE                                                      │
│     User → Payment Gateway → WalletController                            │
│     └─> WalletTransaction (type: recharge, status: completed)            │
│         └─> User wallet balance updated                                  │
│                                                                           │
│  2. QUIZ PURCHASE                                                        │
│     User → PurchaseController                                            │
│     ├─> WalletTransaction (buyer: quiz_purchase, direction: debit)      │
│     ├─> WalletTransaction (creator: quiz_sale, direction: credit)       │
│     ├─> WalletTransaction (superadmin: platform_fee, direction: credit) │
│     └─> PlatformRevenue (source: quiz_purchase)                          │
│                                                                           │
│  3. COURSE PURCHASE                                                      │
│     User → CoursePurchaseController                                      │
│     ├─> WalletTransaction (buyer: course_purchase, direction: debit)    │
│     ├─> WalletTransaction (creator: course_sale, direction: credit)     │
│     ├─> WalletTransaction (superadmin: platform_fee, direction: credit) │
│     └─> PlatformRevenue (source: course_purchase)                        │
│                                                                           │
│  4. WITHDRAWAL                                                           │
│     User → WithdrawalController                                          │
│     └─> WalletTransaction (type: withdrawal, status: pending/completed)  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         ACCESS CONTROL                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────┬──────────────────┬──────────────────┬──────────────┐ │
│  │   Feature     │   Regular User   │   Creator        │   Admin      │ │
│  ├───────────────┼──────────────────┼──────────────────┼──────────────┤ │
│  │ Transaction   │   Own only       │   Own only       │   All users  │ │
│  │ Logs          │                  │                  │              │ │
│  ├───────────────┼──────────────────┼──────────────────┼──────────────┤ │
│  │ My Quiz       │   ✓              │   ✓              │   ✓          │ │
│  │ Revenue       │                  │                  │              │ │
│  ├───────────────┼──────────────────┼──────────────────┼──────────────┤ │
│  │ My Course     │   ✓              │   ✓              │   ✓          │ │
│  │ Revenue       │                  │                  │              │ │
│  ├───────────────┼──────────────────┼──────────────────┼──────────────┤ │
│  │ Quiz Purchase │   -              │   Own quizzes    │   All        │ │
│  │ Log           │                  │                  │              │ │
│  ├───────────────┼──────────────────┼──────────────────┼──────────────┤ │
│  │ Course        │   -              │   Own courses    │   All        │ │
│  │ Purchase Log  │                  │                  │              │ │
│  ├───────────────┼──────────────────┼──────────────────┼──────────────┤ │
│  │ Platform      │   -              │   -              │   ✓          │ │
│  │ Revenue       │                  │                  │              │ │
│  └───────────────┴──────────────────┴──────────────────┴──────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      PERFORMANCE OPTIMIZATIONS                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ✓ Strategic database indexes on frequently queried columns              │
│  ✓ Efficient query patterns with proper relationships                    │
│  ✓ Pagination support (1-100 items per page)                             │
│  ✓ Selective eager loading of relationships                              │
│  ✓ Optimized date range queries                                          │
│  ✓ Compound indexes for common filter combinations                       │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY BENEFITS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ✓ Complete audit trail for all transactions                             │
│  ✓ Real-time revenue tracking for creators                               │
│  ✓ Transparent financial reporting                                       │
│  ✓ Professional analytics for admins                                     │
│  ✓ Scalable architecture for growth                                      │
│  ✓ Fast queries with strategic indexing                                  │
│  ✓ Rich metadata for detailed insights                                   │
│  ✓ Flexible filtering and reporting                                      │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Transaction Metadata Examples

### Wallet Recharge
```json
{
  "provider": "sslcommerz",
  "gateway_transaction_id": "SSL123456"
}
```

### Quiz Purchase (Buyer View)
```json
{
  "quiz_id": 10,
  "quiz_title": "JavaScript Basics",
  "direction": "debit",
  "platform_fee_cents": 5000,
  "author_share_cents": 45000
}
```

### Quiz Sale (Creator View)
```json
{
  "quiz_id": 10,
  "quiz_title": "JavaScript Basics",
  "buyer_id": 5,
  "direction": "credit"
}
```

### Platform Fee (Admin View)
```json
{
  "source": "quiz_purchase",
  "quiz_id": 10,
  "buyer_id": 5,
  "direction": "credit"
}
```

## Query Performance Examples

```sql
-- Fast: Find user's completed transactions (uses user_id + created_at index)
SELECT * FROM wallet_transactions
WHERE user_id = 5 AND status = 'completed'
ORDER BY created_at DESC;

-- Fast: Platform revenue breakdown (uses source + created_at index)
SELECT source, SUM(amount_cents), COUNT(*)
FROM platform_revenues
WHERE created_at >= '2025-01-01'
GROUP BY source;

-- Fast: Quiz purchase count (uses quiz_id index)
SELECT COUNT(*) FROM platform_revenues WHERE quiz_id = 10;

-- Fast: Filter by transaction type (uses type + status index)
SELECT * FROM wallet_transactions
WHERE type IN ('quiz_purchase', 'course_purchase')
  AND status = 'completed';
```
