# Testing OAuth SSO with Localhost → Production Migration

This guide explains how to test OAuth SSO with localhost first, then migrate to production without issues.

## Overview

Testing with localhost first is **perfectly fine** and recommended! You'll just need to:
1. Create separate OAuth clients for localhost and production
2. Update Misago configuration when switching
3. Ensure CORS allows both domains

## Step 1: Testing with Localhost

### 1.1 Create OAuth Client for Localhost

Create a separate OAuth client for localhost testing:

```bash
POST http://localhost:YOUR_PORT/api/oauth/clients
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Misago Forum (Localhost)",
  "redirectUris": [
    "http://localhost:8000/auth/callback",
    "http://127.0.0.1:8000/auth/callback"
  ]
}
```

**Note:** Replace `8000` with your Misago forum's local port if different.

### 1.2 Configure Misago for Localhost

In your local Misago instance, configure:
- **Authorization URL**: `http://localhost:YOUR_BACKEND_PORT/api/oauth/authorize`
- **Token URL**: `http://localhost:YOUR_BACKEND_PORT/api/oauth/token`
- **UserInfo URL**: `http://localhost:YOUR_BACKEND_PORT/api/oauth/userinfo`
- **Client ID**: (from step 1.1)
- **Client Secret**: (from step 1.1)
- **Redirect URI**: `http://localhost:8000/auth/callback` (must match exactly)

### 1.3 Update Frontend for Localhost

In your frontend code, use localhost URLs:

```javascript
// For localhost testing
const OAUTH_CONFIG = {
  authorizeUrl: 'http://localhost:YOUR_BACKEND_PORT/api/oauth/authorize-with-token',
  clientId: 'YOUR_LOCALHOST_CLIENT_ID',
  redirectUri: 'http://localhost:8000/auth/callback', // Misago local URL
};

// For production
const OAUTH_CONFIG_PROD = {
  authorizeUrl: 'https://app.sadhanaprep.com/api/oauth/authorize-with-token',
  clientId: 'YOUR_PRODUCTION_CLIENT_ID',
  redirectUri: 'https://forum.sadhanaprep.com/auth/callback',
};
```

Or use environment variables:

```javascript
// .env.local (for localhost)
NEXT_PUBLIC_API_URL=http://localhost:YOUR_BACKEND_PORT
NEXT_PUBLIC_OAUTH_CLIENT_ID=your_localhost_client_id
NEXT_PUBLIC_FORUM_URL=http://localhost:8000

// .env.production (for production)
NEXT_PUBLIC_API_URL=https://app.sadhanaprep.com
NEXT_PUBLIC_OAUTH_CLIENT_ID=your_production_client_id
NEXT_PUBLIC_FORUM_URL=https://forum.sadhanaprep.com
```

## Step 2: CORS Configuration

The CORS is already configured to allow localhost. Check `src/main.ts`:

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',        // Frontend localhost
    'https://app.sadhanaprep.com',   // Production app
    'https://forum.sadhanaprep.com', // Production forum
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  // ...
});
```

**If you need to add more localhost ports**, update this configuration.

## Step 3: Migrating to Production

### 3.1 Create Production OAuth Client

Once testing is complete, create a production OAuth client:

```bash
POST https://app.sadhanaprep.com/api/oauth/clients
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Misago Forum (Production)",
  "redirectUris": [
    "https://forum.sadhanaprep.com/auth/callback",
    "https://forum.sadhanaprep.com/sso/callback"
  ]
}
```

**⚠️ Important:** Save the production `clientId` and `clientSecret`!

### 3.2 Update Misago Configuration

In your production Misago instance, update:
- **Authorization URL**: `https://app.sadhanaprep.com/api/oauth/authorize`
- **Token URL**: `https://app.sadhanaprep.com/api/oauth/token`
- **UserInfo URL**: `https://app.sadhanaprep.com/api/oauth/userinfo`
- **Client ID**: (production client ID from step 3.1)
- **Client Secret**: (production client secret from step 3.1)
- **Redirect URI**: `https://forum.sadhanaprep.com/auth/callback`

### 3.3 Update Frontend for Production

Update your frontend environment variables or configuration to use production URLs.

## Step 4: Best Practices

### Option A: Separate Clients (Recommended)

**Keep separate OAuth clients for:**
- Localhost/Development
- Staging (if you have one)
- Production

**Benefits:**
- No risk of breaking production while testing
- Can test different configurations
- Easy to rollback if needed

### Option B: Single Client with Multiple Redirect URIs

You can add multiple redirect URIs to a single client:

```json
{
  "name": "Misago Forum (All Environments)",
  "redirectUris": [
    "http://localhost:8000/auth/callback",
    "http://127.0.0.1:8000/auth/callback",
    "https://forum.sadhanaprep.com/auth/callback",
    "https://forum.sadhanaprep.com/sso/callback"
  ]
}
```

**Benefits:**
- Single client to manage
- Works in all environments

**Drawbacks:**
- Less secure (localhost URIs in production client)
- Can't easily disable localhost access in production

## Step 5: Testing Checklist

### Localhost Testing:
- [ ] OAuth client created for localhost
- [ ] Misago configured with localhost URLs
- [ ] Frontend uses localhost URLs
- [ ] Can login to main app (localhost)
- [ ] Can access forum via SSO (localhost)
- [ ] User data syncs correctly
- [ ] Error handling works

### Production Migration:
- [ ] Production OAuth client created
- [ ] Misago updated with production URLs
- [ ] Frontend updated with production URLs
- [ ] CORS allows production domains
- [ ] Test with production URLs
- [ ] All users have OAuth IDs (seeded automatically)
- [ ] Monitor logs for errors

## Step 6: Environment-Specific Configuration

### Backend Environment Variables

```env
# .env.local (for localhost)
PORT=3000
FRONTEND_URL=http://localhost:3000

# .env.production
PORT=3000
FRONTEND_URL=https://app.sadhanaprep.com
```

### Frontend Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_OAUTH_CLIENT_ID=localhost_client_id
NEXT_PUBLIC_FORUM_URL=http://localhost:8000

# .env.production
NEXT_PUBLIC_API_URL=https://app.sadhanaprep.com
NEXT_PUBLIC_OAUTH_CLIENT_ID=production_client_id
NEXT_PUBLIC_FORUM_URL=https://forum.sadhanaprep.com
```

## Common Issues & Solutions

### Issue: "Invalid redirect_uri" in localhost
**Solution:** Ensure the redirect URI in Misago exactly matches one in the OAuth client's `redirectUris` array (including port number).

### Issue: CORS errors
**Solution:** Verify localhost ports are in the CORS allowed origins in `src/main.ts`.

### Issue: Token not working after switching to production
**Solution:** Make sure you're using the production OAuth client ID, not the localhost one.

### Issue: Can't access forum after migration
**Solution:** 
1. Verify Misago is configured with production URLs
2. Check that production OAuth client is active
3. Verify redirect URI matches exactly
4. Check browser console and network tab for errors

## Migration Steps Summary

1. ✅ **Test with localhost first** (current step)
2. ✅ Create localhost OAuth client
3. ✅ Configure local Misago
4. ✅ Test end-to-end locally
5. ✅ Create production OAuth client
6. ✅ Update Misago to production URLs
7. ✅ Update frontend to production URLs
8. ✅ Test in production
9. ✅ Monitor and verify

## Notes

- **No data loss:** Switching between localhost and production doesn't affect your database
- **Separate clients recommended:** Keeps environments isolated
- **OAuth IDs persist:** Once created, user OAuth IDs work in both environments (if using same database)
- **Can test in parallel:** You can have both localhost and production clients active simultaneously

## Quick Reference

**Localhost URLs:**
- Backend: `http://localhost:YOUR_PORT`
- Forum: `http://localhost:8000` (or your Misago port)

**Production URLs:**
- Backend: `https://app.sadhanaprep.com`
- Forum: `https://forum.sadhanaprep.com`

