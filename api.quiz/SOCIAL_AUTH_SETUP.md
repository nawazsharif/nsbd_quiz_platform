# Social Authentication Setup Guide

This guide explains how to set up social authentication with Google, GitHub, and Facebook for the Quiz Platform API.

## Prerequisites

- Laravel Socialite package is already installed
- Database migration has been run to add social auth columns

## Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://api.quiz.test/api/auth/social/google/callback

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=http://api.quiz.test/api/auth/social/github/callback

# Facebook OAuth Configuration
FACEBOOK_CLIENT_ID=your_facebook_app_id_here
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret_here
FACEBOOK_REDIRECT_URI=http://api.quiz.test/api/auth/social/facebook/callback
```

## OAuth App Setup

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set authorized redirect URIs to your callback URL
6. Copy Client ID and Client Secret to your `.env` file

### GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Authorization callback URL to your callback URL
4. Copy Client ID and Client Secret to your `.env` file

### Facebook OAuth Setup
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Set Valid OAuth Redirect URIs to your callback URL
5. Copy App ID and App Secret to your `.env` file

## API Endpoints

### Get Redirect URL
```
GET /api/auth/social/{provider}/redirect
```
Returns the OAuth redirect URL for the specified provider.

**Supported providers:** `google`, `github`, `facebook`

### Handle OAuth Callback
```
GET /api/auth/social/{provider}/callback
```
Handles the OAuth callback after user authentication.

### Login with Authorization Code (Mobile)
```
POST /api/auth/social/{provider}/login
```
For mobile apps that handle OAuth flow themselves.

**Request Body:**
```json
{
    "code": "authorization_code_from_provider",
    "state": "optional_state_parameter"
}
```

## Response Format

### Success Response
```json
{
    "success": true,
    "message": "Login successful",
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "https://example.com/avatar.jpg",
        "provider": "google"
    },
    "token": "1|abcdef123456...",
    "token_type": "Bearer"
}
```

### Error Response
```json
{
    "success": false,
    "message": "Authentication failed",
    "error": "Invalid authorization code"
}
```

## Features

- **Automatic User Creation**: Creates new users automatically on first login
- **Account Linking**: Links social accounts to existing users with same email
- **Role Assignment**: Automatically assigns 'user' role to new social users
- **Email Verification**: Social users are automatically email verified
- **Avatar Support**: Stores user avatar URLs from social providers
- **Secure Tokens**: Uses Laravel Sanctum for API token generation

## Testing

1. Start the Laravel server: `php artisan serve`
2. Test redirect endpoints:
   ```bash
   curl -X GET "http://api.quiz.test/api/auth/social/google/redirect"
   curl -X GET "http://api.quiz.test/api/auth/social/github/redirect"
   curl -X GET "http://api.quiz.test/api/auth/social/facebook/redirect"
   ```

## Swagger Documentation

The API documentation is available at: `http://api.quiz.test/api/documentation`

All social authentication endpoints are documented with examples and schemas.
