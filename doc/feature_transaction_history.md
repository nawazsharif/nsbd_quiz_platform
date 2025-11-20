# Feature: Transaction History

## Overview
Displays a user's wallet transaction history, including deposits, withdrawals, quiz/course purchases, and refunds.

## Key Components
- Transaction summary cards (total, deposits, withdrawals)
- Transaction table with filters (date, type)
- API endpoint: `/api/transaction-logs`
- Frontend: `/quiz/src/app/wallet/transactions/page.tsx`

## User Stories
- As a user, I want to see all my wallet transactions.
- As a user, I want to filter transactions by type and date.

## Best Practices
- Consistent card/table design
- Clear status indicators for transactions
- Robust error handling for API calls
