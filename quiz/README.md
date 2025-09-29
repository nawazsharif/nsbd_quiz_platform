# Quiz Platform Frontend

This is the frontend application for the Quiz and Course Platform built with Next.js 15 and TypeScript.

## Features

- **User Authentication**: Login/signup with NextAuth.js
- **Quiz System**: Take quizzes, view results, and track progress
- **Course Management**: Browse and enroll in courses
- **Dashboard**: Personal dashboard with statistics and progress
- **Admin Panel**: Administrative features for content management
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend Integration

The frontend communicates with the Laravel API backend located at `/api.quiz`. API requests are proxied through Next.js to the backend running at `http://api.quiz.test`.

## Key Technologies

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **NextAuth.js**: Authentication library
- **Lucide React**: Icon library
- **Recharts**: Chart components
