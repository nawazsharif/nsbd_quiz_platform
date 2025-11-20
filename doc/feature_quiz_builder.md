# Feature: Quiz Builder

## Overview
Provides a rich interface for creating and editing quizzes, including question import, AI-powered generation, and advanced formatting.

## Key Components
- Quiz builder/editor page
- Tiptap rich text editor integration
- Import questions from CSV
- Generate questions using OpenAI
- API endpoints: `/api/quizzes/{quiz}/questions/import`, `/api/quizzes/{quiz}/questions/generate-ai`
- Frontend: `/quiz/src/app/quiz/builder/[id]/page.tsx`

## User Stories
- As a creator, I want to build quizzes with rich formatting and AI assistance.
- As a creator, I want to import questions from files.

## Best Practices
- Use Tiptap for rich text editing
- Validate imported question formats
- Secure AI endpoints
