# Frontend OAuth SSO Implementation Guide

This guide explains how to implement OAuth SSO in your frontend application to allow users to seamlessly access the Misago forum.

## Overview

When a user is logged into your main app and wants to access the forum, the frontend needs to:
1. Check if user is authenticated (has JWT token)
2. Redirect to OAuth authorize endpoint with the token
3. Backend handles the OAuth flow and redirects to forum

## Implementation Options

### Option 1: Using the Authenticated Endpoint (Recommended)

Use the `/api/oauth/authorize-authenticated` endpoint which requires authentication.

**Frontend Implementation:**

```javascript
// Example: React/Next.js component
function ForumLink() {
  const handleForumAccess = async () => {
    const token = localStorage.getItem('accessToken'); // or however you store the token
    
    if (!token) {
      // User not logged in, redirect to login
      window.location.href = '/login?redirect=/forum';
      return;
    }

    // OAuth parameters (get these from your OAuth client configuration)
    const clientId = 'YOUR_CLIENT_ID';
    const redirectUri = 'https://forum.sadhanaprep.com/auth/callback';
    const state = generateRandomState(); // Optional: for security
    
    // Build OAuth authorize URL
    const authorizeUrl = new URL('https://app.sadhanaprep.com/api/oauth/authorize-authenticated');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    if (state) {
      authorizeUrl.searchParams.set('state', state);
    }
    
    // Make request with Authorization header
    try {
      const response = await fetch(authorizeUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        redirect: 'follow', // Follow redirects
      });
      
      // If response is a redirect, the browser will follow it automatically
      // If it's JSON (error), handle it
      if (response.ok && response.redirected) {
        // Redirect happened, user is being sent to forum
        window.location.href = response.url;
      } else {
        const data = await response.json();
        if (data.error === 'unauthorized') {
          // User needs to login
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error('OAuth error:', error);
      // Handle error
    }
  };

  return (
    <button onClick={handleForumAccess}>
      Go to Forum
    </button>
  );
}
```

**Note:** The `redirect: 'follow'` option might not work in all browsers. See Option 2 for a more reliable approach.

### Option 2: Server-Side Redirect (Most Reliable)

Create a backend endpoint that accepts the token and performs the redirect server-side, or use a hidden form submission.

**Frontend Implementation:**

```javascript
function ForumLink() {
  const handleForumAccess = () => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      window.location.href = '/login?redirect=/forum';
      return;
    }

    // Create a form and submit it to trigger OAuth flow
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = 'https://app.sadhanaprep.com/api/oauth/authorize-authenticated';
    
    const params = {
      client_id: 'YOUR_CLIENT_ID',
      redirect_uri: 'https://forum.sadhanaprep.com/auth/callback',
      response_type: 'code',
      state: generateRandomState(),
    };
    
    // Add params as hidden inputs
    Object.entries(params).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    
    // Add token as Authorization header via fetch first
    // Then redirect
    const url = new URL(form.action);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    // Use window.location with token in header won't work
    // So we need to use the public endpoint with token in query (see Option 3)
    // OR use a proxy endpoint
  };
}
```

### Option 3: Create a Frontend Helper Endpoint (Best Solution)

Create a new backend endpoint that accepts the token as a query parameter for redirects.

**Backend Endpoint to Add:**

```typescript
@Get('authorize-with-token')
@Public()
async authorizeWithToken(
  @Query('token') token: string,
  @Query() query: AuthorizeRequestDto,
  @Res() res: Response,
) {
  // Validate token
  try {
    const payload = await this.jwtService.verifyAsync(token, {
      secret: this.configService.getOrThrow('JWT_SECRET'),
    });
    
    // Create authorization code
    const client = await this.oauthService.validateClient(query.client_id);
    if (!this.oauthService.validateRedirectUri(client, query.redirect_uri)) {
      throw new BadRequestException('Invalid redirect_uri');
    }
    
    const scopes = query.scope?.split(' ') || [];
    const code = await this.oauthService.createAuthorizationCode(
      payload.sub,
      query.client_id,
      query.redirect_uri,
      scopes,
      query.code_challenge,
      query.code_challenge_method,
    );
    
    const redirectUrl = new URL(query.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (query.state) {
      redirectUrl.searchParams.set('state', query.state);
    }
    
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Invalid or expired token',
    });
  }
}
```

**Frontend Implementation with Helper Endpoint:**

```javascript
function ForumLink() {
  const handleForumAccess = () => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      window.location.href = '/login?redirect=/forum';
      return;
    }

    const clientId = 'YOUR_CLIENT_ID';
    const redirectUri = 'https://forum.sadhanaprep.com/auth/callback';
    const state = generateRandomState();
    
    // Build URL with token as query parameter
    const authorizeUrl = new URL('https://app.sadhanaprep.com/api/oauth/authorize-with-token');
    authorizeUrl.searchParams.set('token', token);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    if (state) {
      authorizeUrl.searchParams.set('state', state);
    }
    
    // Simple redirect - browser will handle it
    window.location.href = authorizeUrl.toString();
  };

  return (
    <a href="#" onClick={(e) => { e.preventDefault(); handleForumAccess(); }}>
      Go to Forum
    </a>
  );
}
```

## Complete React/Next.js Example

```typescript
// components/ForumLink.tsx
import { useState } from 'react';

interface ForumLinkProps {
  className?: string;
  children?: React.ReactNode;
}

export function ForumLink({ className, children }: ForumLinkProps) {
  const [loading, setLoading] = useState(false);

  const handleForumAccess = async () => {
    setLoading(true);
    
    try {
      // Get token from your auth context/store
      const token = localStorage.getItem('accessToken');
      // or: const token = useAuth().token;
      
      if (!token) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent('/forum');
        window.location.href = `/login?redirect=${returnUrl}`;
        return;
      }

      // OAuth configuration
      const oauthConfig = {
        clientId: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || 'YOUR_CLIENT_ID',
        redirectUri: 'https://forum.sadhanaprep.com/auth/callback',
        authorizeUrl: 'https://app.sadhanaprep.com/api/oauth/authorize-authenticated',
      };

      // Build authorize URL
      const url = new URL(oauthConfig.authorizeUrl);
      url.searchParams.set('client_id', oauthConfig.clientId);
      url.searchParams.set('redirect_uri', oauthConfig.redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', generateRandomState());

      // Make request with Authorization header
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.redirected) {
        // Follow the redirect
        window.location.href = response.url;
      } else if (response.status === 401) {
        // Not authenticated, redirect to login
        window.location.href = '/login';
      } else {
        // Handle other errors
        const error = await response.json();
        console.error('OAuth error:', error);
        alert('Failed to access forum. Please try again.');
      }
    } catch (error) {
      console.error('Error accessing forum:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleForumAccess} 
      disabled={loading}
      className={className}
    >
      {loading ? 'Loading...' : (children || 'Go to Forum')}
    </button>
  );
}

// Helper function to generate random state
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
```

## Vue.js Example

```vue
<template>
  <button @click="handleForumAccess" :disabled="loading">
    {{ loading ? 'Loading...' : 'Go to Forum' }}
  </button>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);

const handleForumAccess = async () => {
  loading.value = true;
  
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    window.location.href = '/login?redirect=/forum';
    return;
  }

  const clientId = 'YOUR_CLIENT_ID';
  const redirectUri = 'https://forum.sadhanaprep.com/auth/callback';
  
  const url = new URL('https://app.sadhanaprep.com/api/oauth/authorize-authenticated');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.redirected) {
      window.location.href = response.url;
    } else if (response.status === 401) {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('OAuth error:', error);
  } finally {
    loading.value = false;
  }
};
</script>
```

## Environment Variables

Add to your frontend `.env` file:

```env
NEXT_PUBLIC_OAUTH_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_API_URL=https://app.sadhanaprep.com
NEXT_PUBLIC_FORUM_URL=https://forum.sadhanaprep.com
```

## Security Considerations

1. **Token Storage**: Store JWT tokens securely (consider httpOnly cookies for production)
2. **HTTPS**: Always use HTTPS in production
3. **State Parameter**: Use the `state` parameter to prevent CSRF attacks
4. **Token Expiry**: Handle token expiry gracefully - redirect to login if token is expired

## Testing

1. **Test with logged-in user**: Should redirect to forum automatically
2. **Test with logged-out user**: Should redirect to login page
3. **Test with expired token**: Should handle gracefully
4. **Test error cases**: Network errors, invalid client, etc.

## Troubleshooting

- **CORS errors**: Ensure your frontend domain is in the CORS allowed origins
- **401 errors**: Token might be expired or invalid
- **Redirect not working**: Check browser console for errors
- **Token not found**: Ensure token is stored correctly in localStorage/cookies

