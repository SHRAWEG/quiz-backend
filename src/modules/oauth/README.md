# OAuth 2.0 SSO Integration for Misago Forum

This module implements OAuth 2.0 provider functionality to enable Single Sign-On (SSO) between the main application (`app.sadhanaprep.com`) and Misago forum (`forum.sadhanaprep.com`).

## Overview

The OAuth implementation allows users who are logged into the main application to seamlessly access the Misago forum without needing to log in again. The system uses the OAuth 2.0 Authorization Code flow with optional PKCE (Proof Key for Code Exchange) support.

## Architecture

### Components

1. **OAuth Client Entity**: Stores OAuth client credentials (client_id, client_secret) for Misago
2. **OAuth Authorization Code Entity**: Temporarily stores authorization codes during the OAuth flow
3. **User OAuth ID Entity**: Maps user UUIDs to integer IDs required by Misago
4. **OAuth Service**: Handles business logic for authorization, token exchange, and user info
5. **OAuth Controller**: Exposes OAuth 2.0 endpoints

### Endpoints

- `GET /api/oauth/authorize` - Authorization endpoint (public)
- `POST /api/oauth/token` - Token exchange endpoint (public)
- `GET /api/oauth/userinfo` - User information endpoint (requires Bearer token)
- `POST /api/oauth/clients` - Create OAuth client (admin only)
- `GET /api/oauth/clients` - List OAuth clients (admin only)

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# OAuth Configuration
OAUTH_AUTHORIZATION_CODE_EXPIRY=600          # Authorization code expiry in seconds (default: 600 = 10 minutes)
OAUTH_ACCESS_TOKEN_EXPIRY=3600               # Access token expiry in seconds (default: 3600 = 1 hour)
FRONTEND_URL=https://app.sadhanaprep.com     # Frontend URL for CORS
```

### 2. Create OAuth Client for Misago

After starting the application, create an OAuth client for Misago using the admin API:

```bash
POST /api/oauth/clients
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "name": "Misago Forum",
  "redirectUris": [
    "https://forum.sadhanaprep.com/auth/callback",
    "https://forum.sadhanaprep.com/sso/callback"
  ]
}
```

**Important**: Save the `clientId` and `clientSecret` returned in the response. You'll need these for Misago configuration.

### 3. Configure Misago Forum

In your Misago forum settings, configure OAuth 2.0 client:

1. **Authorization Endpoint**: `https://app.sadhanaprep.com/api/oauth/authorize`
2. **Token Endpoint**: `https://app.sadhanaprep.com/api/oauth/token`
3. **UserInfo Endpoint**: `https://app.sadhanaprep.com/api/oauth/userinfo`
4. **Client ID**: Use the `clientId` from step 2
5. **Client Secret**: Use the `clientSecret` from step 2
6. **Redirect URI**: Must match one of the URIs provided in step 2
7. **Scopes**: `openid profile email` (or as required by Misago)

### 4. User ID Mapping

The system automatically creates integer IDs for users when they first authenticate via OAuth. The mapping is stored in the `user_oauth_ids` table, which links UUID user IDs to integer OAuth IDs required by Misago.

## OAuth Flow

1. **User clicks "Login with App" on Misago**
   - Misago redirects to: `GET /api/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&state=...`

2. **Authorization Endpoint**
   - Validates client and redirect URI
   - Checks if user is authenticated (via JWT token in Authorization header)
   - If authenticated: Creates authorization code and redirects back to Misago
   - If not authenticated: Returns 401 with login URL

3. **Token Exchange**
   - Misago exchanges authorization code for access token: `POST /api/oauth/token`
   - System validates code, client credentials, and PKCE (if used)
   - Returns access token and refresh token

4. **User Info Retrieval**
   - Misago calls: `GET /api/oauth/userinfo` with Bearer token
   - System returns user information in Misago-compatible format:
     ```json
     {
       "id": 123,
       "email": "user@example.com",
       "username": "user",
       "first_name": "John",
       "last_name": "Doe",
       "is_active": true
     }
     ```

## Security Features

- **Client Validation**: All OAuth requests validate client_id and client_secret
- **Redirect URI Validation**: Only pre-registered redirect URIs are allowed
- **PKCE Support**: Optional PKCE (S256 and plain) for enhanced security
- **Rate Limiting**: 
  - Authorization endpoint: 50 requests per 15 minutes
  - Token endpoint: 100 requests per 15 minutes
  - UserInfo endpoint: 200 requests per 15 minutes
- **Short-lived Authorization Codes**: Default 10 minutes expiry
- **JWT-based Access Tokens**: Secure token format with configurable expiry

## Testing

### Manual Testing

1. **Test Authorization Flow**:
   ```bash
   # Get user JWT token first
   curl -X POST https://app.sadhanaprep.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password"}'
   
   # Request authorization code
   curl -X GET "https://app.sadhanaprep.com/api/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://forum.sadhanaprep.com/callback&response_type=code" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. **Test Token Exchange**:
   ```bash
   curl -X POST https://app.sadhanaprep.com/api/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "authorization_code",
       "code": "AUTHORIZATION_CODE",
       "redirect_uri": "https://forum.sadhanaprep.com/callback",
       "client_id": "YOUR_CLIENT_ID",
       "client_secret": "YOUR_CLIENT_SECRET"
     }'
   ```

3. **Test UserInfo**:
   ```bash
   curl -X GET https://app.sadhanaprep.com/api/oauth/userinfo \
     -H "Authorization: Bearer ACCESS_TOKEN"
   ```

## Troubleshooting

### Common Issues

1. **"Invalid client_id" error**
   - Verify the client exists in the database
   - Check that `isActive` is `true` for the client

2. **"Invalid redirect_uri" error**
   - Ensure the redirect URI exactly matches one in the client's `redirectUris` array
   - Check for trailing slashes and protocol (http vs https)

3. **"Authorization code has expired" error**
   - Authorization codes expire after 10 minutes (configurable)
   - Request a new authorization code

4. **"User must be authenticated" error**
   - User needs to be logged into the main app first
   - Include JWT token in Authorization header when calling `/authorize`

5. **CORS errors**
   - Verify `forum.sadhanaprep.com` is in the CORS allowed origins
   - Check that credentials are enabled in CORS config

## Database Schema

The following tables are automatically created by TypeORM:

- `oauth_clients`: Stores OAuth client credentials
- `oauth_authorization_codes`: Temporary storage for authorization codes
- `user_oauth_ids`: Maps user UUIDs to integer OAuth IDs

## Notes

- Authorization codes are single-use and marked as `used` after token exchange
- Old authorization codes are automatically cleaned up (expired codes)
- User OAuth IDs are created on-demand when users first authenticate via OAuth
- The system supports multiple OAuth clients (for future integrations)

