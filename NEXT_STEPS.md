# Next Steps: OAuth SSO Setup

## Step 1: Start Your Application

Make sure your application is running:

```bash
npm run dev
# or
npm run start
```

When the app starts, you should see a log message like:
```
OAuth IDs seeded: X created, Y existing, Z total users
```

This confirms that OAuth IDs have been created for all existing users.

## Step 2: Create OAuth Client for Misago

You need to create an OAuth client that Misago will use. You'll need an admin JWT token.

### 2.1 Get Admin Token

First, login as admin to get your JWT token:

```bash
POST https://app.sadhanaprep.com/api/auth/login
Content-Type: application/json

{
  "email": "admin@quizit.com",
  "password": "admin123"
}
```

Save the `accessToken` from the response.

### 2.2 Create OAuth Client

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

**⚠️ IMPORTANT**: Save the response! You'll need:
- `clientId` 
- `clientSecret` (only shown once!)

Example response:
```json
{
  "message": "OAuth client created successfully",
  "data": {
    "id": "...",
    "clientId": "abc123def456...",
    "clientSecret": "xyz789uvw012...",
    "name": "Misago Forum",
    "redirectUris": [...],
    "createdAt": "..."
  }
}
```

## Step 3: Configure Misago Forum

In your Misago forum admin panel, configure OAuth 2.0 settings:

### OAuth 2.0 Provider Configuration

1. **Provider Name**: `Sadhana Prep App` (or any name you prefer)

2. **Authorization URL**: 
   ```
   https://app.sadhanaprep.com/api/oauth/authorize
   ```

3. **Token URL**: 
   ```
   https://app.sadhanaprep.com/api/oauth/token
   ```

4. **User Info URL**: 
   ```
   https://app.sadhanaprep.com/api/oauth/userinfo
   ```

5. **Client ID**: 
   ```
   [Use the clientId from Step 2.2]
   ```

6. **Client Secret**: 
   ```
   [Use the clientSecret from Step 2.2]
   ```

7. **Redirect URI**: 
   ```
   https://forum.sadhanaprep.com/auth/callback
   ```
   (Must match one of the URIs you provided in Step 2.2)

8. **Scopes**: 
   ```
   openid profile email
   ```
   (Or as required by Misago)

### User Field Mapping in Misago

Configure Misago to map these fields from the userinfo response:
- **User ID** → `id` (integer)
- **Email** → `email`
- **Username** → `username`
- **First Name** → `first_name`
- **Last Name** → `last_name`
- **Is Active** → `is_active`

## Step 4: Test the Integration

### 4.1 Test User Login Flow

1. **Login to Main App**: 
   - Go to `https://app.sadhanaprep.com`
   - Login with any user credentials

2. **Access Forum**: 
   - Navigate to `https://forum.sadhanaprep.com`
   - Click "Login with App" or similar OAuth button

3. **Verify**: 
   - You should be automatically logged into the forum
   - No need to enter credentials again

### 4.2 Test OAuth Endpoints Manually (Optional)

You can test the OAuth endpoints directly:

**Test Authorization Endpoint:**
```bash
GET https://app.sadhanaprep.com/api/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://forum.sadhanaprep.com/auth/callback&response_type=code&state=test123
Authorization: Bearer YOUR_USER_JWT_TOKEN
```

**Test Token Exchange:**
```bash
POST https://app.sadhanaprep.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE_FROM_STEP_ABOVE",
  "redirect_uri": "https://forum.sadhanaprep.com/auth/callback",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
```

**Test UserInfo:**
```bash
GET https://app.sadhanaprep.com/api/oauth/userinfo
Authorization: Bearer ACCESS_TOKEN_FROM_STEP_ABOVE
```

## Step 5: Troubleshooting

### If users can't login via SSO:

1. **Check OAuth Client**: Verify the client exists and is active
   ```sql
   SELECT * FROM oauth_clients WHERE client_id = 'YOUR_CLIENT_ID';
   ```

2. **Check User OAuth IDs**: Verify users have OAuth IDs
   ```sql
   SELECT * FROM user_oauth_ids;
   ```

3. **Check Logs**: Look for errors in application logs

4. **Verify Redirect URI**: Ensure it exactly matches in both places

5. **Check CORS**: Verify `forum.sadhanaprep.com` is in allowed origins

### Common Issues:

- **"Invalid client_id"**: Client doesn't exist or is inactive
- **"Invalid redirect_uri"**: URI doesn't match exactly (check trailing slashes, http vs https)
- **"User must be authenticated"**: User needs to login to main app first
- **CORS errors**: Check CORS configuration in `src/main.ts`

## Step 6: Production Checklist

Before going live:

- [ ] OAuth client created and credentials saved securely
- [ ] Misago configured with correct URLs and credentials
- [ ] Redirect URIs match exactly
- [ ] CORS configured for production domains
- [ ] HTTPS enabled on both applications
- [ ] Environment variables set (if custom expiry times needed)
- [ ] Tested with multiple users
- [ ] Error handling verified
- [ ] Logs monitored for issues

## Additional Resources

- **Setup Guide**: See `OAUTH_SETUP.md` for detailed setup instructions
- **Technical Docs**: See `src/modules/oauth/README.md` for technical details
- **API Docs**: Visit `https://app.sadhanaprep.com/api` for Swagger documentation

## Need Help?

If you encounter issues:
1. Check the error message in application logs
2. Verify all configuration matches exactly
3. Test OAuth endpoints manually
4. Check database for OAuth client and user OAuth IDs

