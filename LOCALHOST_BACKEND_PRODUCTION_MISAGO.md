# Testing with Localhost Backend + Production Misago

This guide explains how to test OAuth SSO when your backend is on localhost but Misago is already deployed to production.

## Scenario

- ✅ Backend: `http://localhost:YOUR_PORT` (local)
- ✅ Misago Forum: `https://forum.sadhanaprep.com` (production)
- ✅ Frontend: Can be localhost or production

This setup is **perfectly fine** and commonly used for testing!

## How It Works

The OAuth flow will be:
1. User clicks "Login with App" on **production Misago**
2. Misago redirects to your **localhost backend** OAuth endpoint
3. Your localhost backend generates authorization code
4. Backend redirects back to **production Misago** with the code
5. Production Misago exchanges code for token (calls your localhost backend)
6. Production Misago gets user info (calls your localhost backend)

## Step 1: Create OAuth Client

Create an OAuth client that points to production Misago:

```bash
POST http://localhost:YOUR_PORT/api/oauth/clients
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Misago Forum (Production - Testing from Localhost)",
  "redirectUris": [
    "https://forum.sadhanaprep.com/auth/callback",
    "https://forum.sadhanaprep.com/sso/callback"
  ]
}
```

**Save the `clientId` and `clientSecret`** - you'll need them for Misago configuration.

## Step 2: Configure Production Misago

In your **production Misago** admin panel, configure:

### OAuth 2.0 Settings

- **Authorization URL**: `http://localhost:YOUR_PORT/api/oauth/authorize`
  - ⚠️ **Important**: Use `http://localhost` (not https)
  - Replace `YOUR_PORT` with your actual backend port (e.g., 3000, 5000, etc.)

- **Token URL**: `http://localhost:YOUR_PORT/api/oauth/token`

- **UserInfo URL**: `http://localhost:YOUR_PORT/api/oauth/userinfo`

- **Client ID**: (from Step 1)

- **Client Secret**: (from Step 1)

- **Redirect URI**: `https://forum.sadhanaprep.com/auth/callback`
  - Must match exactly one of the URIs in your OAuth client

- **Scopes**: `openid profile email`

## Step 3: Network Considerations

### Option A: Use ngrok or similar tunnel (Recommended)

Since production Misago needs to call your localhost backend, you'll need to expose your localhost:

1. **Install ngrok**: https://ngrok.com/

2. **Start your backend**:
   ```bash
   npm run dev
   # Backend running on http://localhost:3000
   ```

3. **Create ngrok tunnel**:
   ```bash
   ngrok http 3000
   # This gives you: https://abc123.ngrok.io
   ```

4. **Update OAuth client redirect URIs** to use ngrok URL:
   ```json
   {
     "name": "Misago Forum (via ngrok)",
     "redirectUris": [
       "https://forum.sadhanaprep.com/auth/callback"
     ]
   }
   ```

5. **Update Misago configuration** to use ngrok URL:
   - Authorization URL: `https://abc123.ngrok.io/api/oauth/authorize`
   - Token URL: `https://abc123.ngrok.io/api/oauth/token`
   - UserInfo URL: `https://abc123.ngrok.io/api/oauth/userinfo`

### Option B: Use your production backend URL (Easier)

If your production backend is already deployed, you can:

1. **Test with production backend** first to verify Misago configuration
2. **Then switch to localhost** once you know it works
3. Or **deploy your localhost changes** to production for testing

### Option C: Direct localhost (If Misago can reach your machine)

If your production server can reach your localhost (same network/VPN), you can use:
- `http://YOUR_LOCAL_IP:PORT/api/oauth/...`
- But this is usually not possible with cloud-hosted Misago

## Step 4: CORS Configuration

Your CORS is already configured to allow the production forum domain. The current setup in `src/main.ts` allows:
- `https://forum.sadhanaprep.com` ✅
- All localhost origins in development ✅

So CORS should work fine!

## Step 5: Testing Flow

1. **Start your localhost backend**:
   ```bash
   npm run dev
   ```

2. **If using ngrok, start the tunnel**:
   ```bash
   ngrok http 3000
   ```

3. **Go to production Misago**: `https://forum.sadhanaprep.com`

4. **Click "Login with App"** or similar OAuth button

5. **You should be redirected to your localhost backend** (or ngrok URL)

6. **Backend will redirect back to production Misago** with authorization code

7. **Misago will call your localhost backend** to exchange code for token

8. **User should be logged into production Misago**

## Step 6: Frontend Implementation

If your frontend is also localhost, update it to use localhost backend:

```javascript
// Frontend code (localhost)
const handleForumAccess = () => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    window.location.href = '/login';
    return;
  }

  const url = new URL('http://localhost:YOUR_PORT/api/oauth/authorize-with-token');
  url.searchParams.set('token', token);
  url.searchParams.set('client_id', 'YOUR_CLIENT_ID');
  url.searchParams.set('redirect_uri', 'https://forum.sadhanaprep.com/auth/callback');
  url.searchParams.set('response_type', 'code');
  
  window.location.href = url.toString();
};
```

## Troubleshooting

### Issue: "Cannot connect to localhost" from production Misago

**Solution**: Use ngrok or deploy your backend changes to production first.

### Issue: CORS errors

**Solution**: 
- Verify `https://forum.sadhanaprep.com` is in CORS allowed origins
- Check browser console for specific CORS error
- Ensure credentials are enabled in CORS config

### Issue: Redirect URI mismatch

**Solution**: 
- Ensure redirect URI in Misago exactly matches one in OAuth client
- Check for trailing slashes, http vs https
- Must be: `https://forum.sadhanaprep.com/auth/callback` (exact match)

### Issue: "Invalid client_id"

**Solution**: 
- Verify you're using the correct client ID
- Check that the OAuth client is active in database
- Ensure client was created on localhost backend

## Recommended Testing Approach

### Phase 1: Test with Production Backend First
1. Deploy your OAuth changes to production backend
2. Create OAuth client on production
3. Configure Misago with production URLs
4. Test end-to-end to verify everything works

### Phase 2: Test Locally
1. Use ngrok to expose localhost
2. Create new OAuth client for localhost (or update existing)
3. Update Misago to use ngrok URLs temporarily
4. Test locally
5. Switch back to production URLs when done

### Phase 3: Final Deployment
1. Deploy final changes to production
2. Use production OAuth client
3. Misago uses production URLs
4. Everything works! ✅

## Quick Setup Checklist

- [ ] Backend running on localhost
- [ ] OAuth client created with production Misago redirect URI
- [ ] ngrok tunnel running (if needed)
- [ ] Misago configured with localhost/ngrok URLs
- [ ] CORS allows production forum domain
- [ ] Test OAuth flow end-to-end
- [ ] Verify user can login to forum

## Notes

- **No problem mixing localhost and production**: This is a common testing setup
- **ngrok is your friend**: Makes localhost accessible from production
- **Can test in parallel**: Keep production backend working while testing locally
- **Easy to switch**: Just update Misago URLs when ready for production

## Alternative: Test Everything Locally

If you want to test completely locally:
1. Set up Misago locally (Docker is easiest)
2. Use localhost for both backend and Misago
3. Test everything locally
4. Then deploy both to production

But your current approach (localhost backend + production Misago) is perfectly valid!

