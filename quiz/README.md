# Quiz Platform Frontend

This is the frontend application for the Quiz and Course Platform built with Next.js 15 and TypeScript.

## Features

- **User Authentication**: Login/signup with NextAuth.js
- **Quiz System**: Take quizzes, view results, and track progress
- **Course Management**: Browse and enroll in courses
- **Question Builder Enhancements**: Bulk CSV/Excel imports and AI-assisted question generation
- **Dashboard**: Personal dashboard with statistics and progress
- **Admin Panel**: Administrative features for content management
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

The frontend communicates with the Laravel API backend located at `/api.quiz`. In Docker, API requests are proxied through Next.js using the `/backend` rewrite which targets the `backend` service on the internal network. For local non-Docker usage, you can point `NEXT_PUBLIC_API_URL` directly to `https://api.quiz.test/api`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
