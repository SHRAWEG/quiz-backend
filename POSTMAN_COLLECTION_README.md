# Postman Collection for Quiz Backend API

This directory contains comprehensive Postman collection files for testing the Quiz Backend API.

## Files Included

1. **Quiz_Backend_API.postman_collection.json** - Complete Postman collection with all API endpoints
2. **Quiz_Backend_API.postman_environment.json** - Postman environment variables for easy configuration

## How to Import

### Option 1: Import via Postman UI

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose both JSON files:
   - `Quiz_Backend_API.postman_collection.json`
   - `Quiz_Backend_API.postman_environment.json`
5. Click **Import**

### Option 2: Import via Drag & Drop

1. Open Postman
2. Drag and drop both JSON files into the Postman window
3. The collection and environment will be automatically imported

## Setting Up the Environment

1. After importing, select the **Quiz Backend - Local** environment from the environment dropdown (top right)
2. Update the following variables as needed:

### Required Variables

- **baseUrl**: Base URL of your API (default: `http://localhost:3000`)
- **accessToken**: JWT token obtained from login (auto-populated after login)

### Optional Variables (for OAuth)

- **clientId**: OAuth client ID
- **clientSecret**: OAuth client secret
- **redirectUri**: OAuth redirect URI
- **authorizationCode**: OAuth authorization code
- **oauthAccessToken**: OAuth access token
- **codeChallenge**: PKCE code challenge
- **codeVerifier**: PKCE code verifier
- **state**: OAuth state parameter

## Quick Start Guide

### 1. Authentication

1. Start with the **Login** request in the **Authentication** folder
2. Use credentials:
   ```json
   {
     "email": "admin@quizit.com",
     "password": "admin123"
   }
   ```
3. The `accessToken` will be automatically saved to your environment after a successful login (via the test script)

### 2. Using Authenticated Endpoints

- All authenticated endpoints use the `{{accessToken}}` variable automatically
- Make sure you've logged in first to populate the token
- The token is sent as a Bearer token in the Authorization header

### 3. Testing Different Roles

The collection includes endpoints for different user roles:
- **Admin**: Full access to all endpoints
- **Teacher**: Can create and manage questions/question sets
- **Student**: Can attempt quizzes, view dashboard, manage subscriptions

## Collection Structure

The collection is organized into the following folders:

### Authentication
- Register User
- Login (with auto-token saving)
- Verify Email
- Resend Verification
- Forgot Password
- Reset Password

### Users
- Profile management
- User preferences
- Admin user management (students/teachers)

### Questions
- CRUD operations for questions
- Question approval/rejection
- Bulk CSV upload

### Question Sets
- CRUD operations for question sets
- Add/remove questions from sets
- Publish/draft question sets
- Student-facing endpoints

### Question Set Attempts
- Start quiz attempts
- Answer questions
- Finish quiz
- Get reports and leaderboard
- Admin review functionality

### Subjects & Sub Subjects
- Full CRUD operations
- Search functionality

### Categories
- Full CRUD operations
- Search functionality

### Feedbacks
- Create feedback (Student/Teacher)
- View feedbacks (Admin)

### Notices
- Create/update/delete notices (Admin)
- View active notices (Student/Teacher)

### Dashboard
- Admin dashboard
- Student dashboard
- Teacher dashboard
- Leaderboard

### Subscription Plans
- Create/manage subscription plans (Admin)
- View active plans (Student)

### User Subscriptions
- Checkout subscriptions
- View subscription status
- Update payment status

### Credits
- View credit balance
- Purchase question sets with credits

### Credit Purchases
- Initiate credit purchases
- Verify payments
- Cancel purchases

### OAuth
- OAuth 2.0 authorization flow
- Token exchange
- UserInfo endpoint
- OAuth client management (Admin)

## Features

### Auto Token Management
The Login request includes a test script that automatically saves the access token to the environment variable, so you don't need to manually copy it.

### Environment Variables
All endpoints use environment variables for:
- Base URL (easy to switch between local/staging/production)
- Authentication tokens
- OAuth parameters

### Example Request Bodies
All POST/PUT/PATCH requests include example request bodies with proper structure.

### Query Parameters
All GET requests with pagination/search include example query parameters.

## Tips

1. **Create Multiple Environments**: You can duplicate the environment file and create separate environments for:
   - Local Development (`http://localhost:3000`)
   - Staging (`https://staging-api.example.com`)
   - Production (`https://api.example.com`)

2. **Use Pre-request Scripts**: You can add pre-request scripts to automatically refresh tokens or set dynamic values.

3. **Organize by Workflow**: You can create folders for specific workflows (e.g., "Complete Quiz Flow", "Subscription Purchase Flow").

4. **Save Responses**: Use Postman's "Save Response" feature to save example responses for documentation.

## Troubleshooting

### Token Not Working
- Make sure you've run the Login request first
- Check that the environment is selected
- Verify the token hasn't expired (tokens typically expire after a set time)

### 401 Unauthorized
- Verify your access token is valid
- Make sure you're using the correct role for the endpoint
- Check that the Authorization header is set correctly

### 404 Not Found
- Verify the baseUrl is correct
- Check that the API server is running
- Ensure the endpoint path is correct

### CORS Errors
- Make sure your frontend origin is allowed in the backend CORS configuration
- Check that credentials are being sent if required

## API Base URL

The default base URL is set to `http://localhost:3000`. Update this in the environment variables if your API runs on a different port or domain.

## Support

For API documentation, visit:
- Swagger UI: `http://localhost:3000/api` (when server is running)

For questions or issues, refer to the main project documentation or contact the development team.

