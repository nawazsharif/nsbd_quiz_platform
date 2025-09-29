# Quiz Platform API

This is the backend API for the Quiz and Course Platform built with Laravel 12.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based permissions
- **Quiz Management**: Create, manage, and take quizzes with different question types
- **Course Management**: Create and manage courses with content and progress tracking
- **Wallet System**: Digital wallet for payments and withdrawals
- **Review System**: Rate and review quizzes and courses
- **Bookmark System**: Bookmark favorite quizzes and courses
- **Admin Features**: Approval workflows for content moderation

## Setup

1. Install PHP dependencies:
   ```bash
   composer install
   ```

2. Setup environment:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. Run migrations and seeders:
   ```bash
   php artisan migrate --seed
   ```

4. Start the development server:
   ```bash
   php artisan serve
   ```

## API Documentation

API documentation is available via Swagger at `/api/documentation` when running the application.

## Testing

Run the test suite:
```bash
php artisan test
```

## Key Models

- **User**: System users with role-based permissions
- **Quiz**: Quiz entities with questions and attempts
- **Course**: Course entities with content and enrollments
- **Question**: Quiz questions with options
- **WalletAccount**: User wallet accounts for payments
- **Review**: User reviews for quizzes and courses

## Architecture

This is a pure API application without frontend views. The frontend is handled separately in the `/quiz` directory of the monorepo.
