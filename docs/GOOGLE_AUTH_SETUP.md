# Google Authentication Setup (Supabase)

Supabase handles Google OAuth for us! Here's how to set it up:

## Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "NEW PROJECT"
   - Name: "Arbox Document Signing"
   - Click "CREATE"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click and enable it

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "Arbox Signing Service"

5. **Configure Redirect URIs**
   Add these authorized redirect URIs:
   ```
   https://meqwsahhtxwihdqazesi.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback (for development)
   ```

6. **Copy Your Credentials**
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client secret: `xxxxxx`
   - Save these for next step

## Step 2: Configure Supabase

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/meqwsahhtxwihdqazesi

2. **Navigate to Authentication Settings**
   - Click "Authentication" in left sidebar
   - Click "Providers" tab

3. **Enable Google Provider**
   - Find "Google" in the list
   - Toggle it ON
   - Paste your:
     - **Client ID** (from Google Console)
     - **Client Secret** (from Google Console)
   - Click "Save"

4. **Configure Email Settings** (optional)
   - Go to "Authentication" → "Email Templates"
   - Customize confirmation emails if needed

## Step 3: Update Frontend Configuration

Your frontend `.env` already has Supabase configured:
```bash
VITE_SUPABASE_URL=https://meqwsahhtxwihdqazesi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

No additional Google config needed on frontend!

## Step 4: Implement Sign-In in Frontend

```jsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Sign in with Google
async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dashboard'
    }
  })
}

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Sign out
await supabase.auth.signOut()
```

## Step 5: Protect Backend Routes

Backend authentication middleware already set up in `src/middleware/auth.js`:

```javascript
// It extracts the token from Authorization header
// and validates it with Supabase
const { requireAuth } = require('../middleware/auth');

// Use on routes:
router.get('/customers', requireAuth, customerController.getCustomers);
```

## How It Works

1. **User clicks "Sign in with Google"** on frontend
2. **Supabase redirects** to Google login
3. **User authenticates** with Google
4. **Google redirects back** to Supabase
5. **Supabase creates session** and redirects to your app
6. **Frontend gets session token** from Supabase
7. **Frontend sends token** in Authorization header to backend
8. **Backend validates token** with Supabase

## Testing Auth

Once configured, test it:

1. Start frontend: `cd frontend && npm run dev`
2. Click "Sign in with Google"
3. Should redirect to Google login
4. After auth, should redirect back to your app
5. Token is stored in browser automatically

## Restrict to Specific Domain (Optional)

In Supabase Dashboard → Authentication → Settings:
- Add your domain to "Site URL"
- Configure "Redirect URLs" whitelist

## Common Issues

### "Invalid redirect_uri"
- Make sure the redirect URI in Google Console EXACTLY matches Supabase's callback URL
- Include the protocol (https://)

### "Access blocked: Authorization Error"
- Google app needs to be published or add test users
- Go to Google Console → OAuth consent screen → Add test users

### "User not found in database"
- Supabase creates users automatically
- Check "Authentication" → "Users" in Supabase dashboard

## Summary

✅ No backend OAuth code needed - Supabase handles it!
✅ Just configure Google Console + Supabase dashboard
✅ Frontend uses Supabase client for sign-in
✅ Backend validates tokens with `requireAuth` middleware

**Next**: Build the frontend sign-in page!
