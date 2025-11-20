# Feature: Revenue Analytics

## Overview
Provides creators with detailed analytics on their quiz/course revenue, including total earnings, individual quiz revenue, sales count, and time-based breakdowns.

## Key Components
- Revenue summary cards (total, monthly, weekly)
- Individual quiz/course revenue display
- Sales table with filters (date, quiz)
- API endpoint: `/api/revenue/my-quizzes`
- Frontend: `/quiz/src/app/dashboard/revenue/page.tsx`

## User Stories
- As a creator, I want to see my total and per-quiz revenue.
- As a creator, I want to filter sales by date and quiz.

## Best Practices
- Use canonical API endpoints for revenue data
- Consistent design system (cards, gradients, branding)
- Error handling for API failures
