# OAuth 2.0 SSO Setup Guide for Misago Forum

This guide will help you set up Single Sign-On (SSO) between your main application and Misago forum.

## Prerequisites

- Main application running at `app.sadhanaprep.com`
- Misago forum running at `forum.sadhanaprep.com`
- Admin access to both applications
- Database access

## Step 1: Environment Configuration

Add these variables to your `.env` file:

```env
# OAuth Configuration (optional - defaults provided)
OAUTH_AUTHORIZATION_CODE_EXPIRY=600          # 10 minutes
OAUTH_ACCESS_TOKEN_EXPIRY=3600               # 1 hour
FRONTEND_URL=https://app.sadhanaprep.com
```

## Step 2: Create OAuth Client

1. **Login as Admin** to get your admin JWT token:
   ```bash
   POST https://app.sadhanaprep.com/api/auth/login
   Content-Type: application/json
   
   {
     "email": "admin@example.com",
     "password": "your_password"
   }
   ```

2. **Create OAuth Client**:
   ```bash
   POST https://app.sadhanaprep.com/api/oauth/clients
   Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
   Content-Type: application/json
   
   {
     "name": "Misago Forum",
     "redirectUris": [
       "https://forum.sadhanaprep.com/auth/callback",
       "https://forum.sadhanaprep.com/sso/callback"
     ]
   }
   ```

3. **Save the Response**:
   ```json
   {
     "message": "OAuth client created successfully",
     "data": {
       "id": "...",
       "clientId": "abc123...",
       "clientSecret": "xyz789...",
       "name": "Misago Forum",
       "redirectUris": [...],
       "createdAt": "..."
     }
   }
   ```
   
   **⚠️ IMPORTANT**: Save `clientId` and `clientSecret` - you'll need them for Misago configuration!

## Step 3: Configure Misago Forum

In your Misago forum admin panel, configure OAuth 2.0 settings:

### OAuth 2.0 Provider Settings

- **Provider Name**: Sadhana Prep App
- **Authorization URL**: `https://app.sadhanaprep.com/api/oauth/authorize`
- **Token URL**: `https://app.sadhanaprep.com/api/oauth/token`
- **User Info URL**: `https://app.sadhanaprep.com/api/oauth/userinfo`
- **Client ID**: `[Your clientId from Step 2]`
- **Client Secret**: `[Your clientSecret from Step 2]`
- **Redirect URI**: `https://forum.sadhanaprep.com/auth/callback` (must match one from Step 2)
- **Scopes**: `openid profile email` (or as required by Misago)

### User Field Mapping

Misago should map the following fields from the userinfo response:
- **User ID**: `id` (integer)
- **Email**: `email`
- **Username**: `username`
- **First Name**: `first_name`
- **Last Name**: `last_name`
- **Is Active**: `is_active`

## Step 4: Seed OAuth IDs for Existing Users

If you have existing users in your database, you need to create OAuth IDs for them so they can use SSO. This happens automatically on app startup, but you can also run it manually:

### Option 1: Automatic (On App Startup)
The app automatically seeds OAuth IDs for all existing users when it starts. Check the console logs for:
```
OAuth IDs seeded: X created, Y existing, Z total users
```

### Option 2: Manual Seed Script
Run the seed script manually:
```bash
npm run seed:oauth-ids
```

This will:
- Find all users in the database
- Create OAuth IDs for users who don't have one
- Show a summary of created/existing OAuth IDs

## Step 5: Test the Integration

1. **Login to Main App**: Go to `https://app.sadhanaprep.com` and login

2. **Access Forum**: Navigate to `https://forum.sadhanaprep.com`

3. **Click "Login with App"** or similar OAuth button on Misago

4. **Verify**: You should be automatically logged into the forum without entering credentials again

## Troubleshooting

### Issue: "Invalid client_id"
- **Solution**: Verify the client exists and is active in the database
- Check: `SELECT * FROM oauth_clients WHERE client_id = 'YOUR_CLIENT_ID';`

### Issue: "Invalid redirect_uri"
- **Solution**: Ensure the redirect URI in Misago exactly matches one in the client's `redirectUris` array
- Check for: trailing slashes, http vs https, exact path match

### Issue: "User must be authenticated"
- **Solution**: User must be logged into the main app first
- The OAuth flow requires an active session in the main application

### Issue: CORS Errors
- **Solution**: Verify `forum.sadhanaprep.com` is in the CORS allowed origins
- Check `src/main.ts` CORS configuration

### Issue: User ID Mismatch
- **Solution**: The system automatically creates integer IDs for users
- Check: `SELECT * FROM user_oauth_ids WHERE user_id = 'USER_UUID';`

## API Endpoints Reference

### Authorization Endpoint
```
GET /api/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&state={state}
```

### Token Endpoint
```
POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "{authorization_code}",
  "redirect_uri": "{redirect_uri}",
  "client_id": "{client_id}",
  "client_secret": "{client_secret}"
}
```

### UserInfo Endpoint
```
GET /api/oauth/userinfo
Authorization: Bearer {access_token}
```

## Security Notes

- Authorization codes expire after 10 minutes
- Access tokens expire after 1 hour (configurable)
- All communications should use HTTPS
- Client secrets should be kept secure
- Rate limiting is enabled on all OAuth endpoints

## Support

For detailed technical documentation, see `src/modules/oauth/README.md`

