# Feature: My Content Dashboard

## Overview
Allows users to view and manage their published quizzes and courses, including sales, revenue, and editing options.

## Key Components
- Summary cards (total quizzes, total sales, total revenue)
- Tabbed interface for quizzes/courses
- Individual quiz cards with revenue/sales
- Canonical edit links to builder route
- HTML tag stripping for descriptions
- API endpoints: `/api/quizzes`, `/api/revenue/my-quizzes`
- Frontend: `/quiz/src/app/my-content/page.tsx`

## User Stories
- As a creator, I want to see all my published content and its performance.
- As a creator, I want to edit my quizzes/courses easily.

## Best Practices
- Use canonical builder route for editing
- Strip HTML from user-facing descriptions
- Consistent design system
