# Feature: Authentication & Role-Based Access Control (RBAC)

## Overview
Secures the platform with user authentication and granular role-based permissions for creators, admins, and learners.

## Key Components
- Laravel Sanctum for API authentication
- Spatie Permissions for RBAC
- API endpoints: `/api/login`, `/api/register`, `/api/user`, `/api/roles`
- Frontend: Auth context, protected routes

## User Stories
- As a user, I want secure login and registration.
- As an admin, I want to manage user roles and permissions.

## Best Practices
- Store tokens securely
- Enforce RBAC on all sensitive endpoints
- Use middleware for route protection
