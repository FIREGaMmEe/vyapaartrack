# VyaparTrack – Setup Guide

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. In **Authentication → Providers**, enable:
   - Email (enabled by default)
   - Google OAuth (add Client ID + Secret from Google Cloud Console)
   - Phone (requires Twilio or similar SMS provider)
4. In **Authentication → URL Configuration**, set:
   - Site URL: `https://vyapartrack.yugfolio.me`
   - Redirect URLs: `https://vyapartrack.yugfolio.me/dashboard.html`
## 2. Configure the App

Edit `js/config.js` — the URL is already set. Just add your anon key:

```js
const SUPABASE_URL = 'https://vojhghwlmmqxeebrynvo.supabase.co'; // ✅ already set
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvamhnaHdsbW1xeGVlYnJ5bnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODQwOTYsImV4cCI6MjA5MTU2MDA5Nn0.hpLs3KIGzfTKZs8WWWY4sCoU40orCOvw7u9kiMoqE58'; // ← get from Supabase → Settings → API → anon public
```

## 3. Create First Store & Admin User

After deploying, you need to manually create the first store:

1. In Supabase SQL Editor, run:
```sql
-- Create a store
INSERT INTO stores (name, gst_number, plan_level)
VALUES ('Your Shop Name', 'GST_NUMBER_OR_NULL', 2);

-- After the owner signs up, get their user ID from auth.users
-- Then assign them as owner:
UPDATE users SET store_id = '<store-uuid>', role = 'owner'
WHERE id = '<user-uuid>';
```

## 4. Deploy to Hostinger

1. Upload all files to your Hostinger `public_html` folder via File Manager or FTP
2. Ensure `.htaccess` is uploaded (it may be hidden)
3. The app will be live at your domain

## File Structure

```
/
├── index.html          ← Entry point (redirects to login/dashboard)
├── login.html          ← Authentication page
├── dashboard.html      ← Main dashboard
├── add-product.html    ← Add new product
├── inventory.html      ← Inventory list
├── product-detail.html ← Product detail + sell flow
├── invoice.html        ← Printable invoice
├── store.html          ← Store management
├── profile.html        ← User profile
├── .htaccess           ← Hostinger/Apache config
├── css/
│   └── main.css        ← All styles
├── js/
│   ├── config.js       ← ⚠️ Set your Supabase keys here
│   ├── supabase.js     ← Supabase client
│   ├── utils.js        ← Shared utilities
│   ├── layout.js       ← Sidebar + topbar
│   ├── dashboard.js
│   ├── add-product.js
│   ├── inventory.js
│   ├── product-detail.js
│   ├── invoice.js
│   ├── store.js
│   └── profile.js
├── assets/
│   ├── Logo.png
│   ├── Logo_dark.png
│   ├── Logow.png
│   └── Logow_dark.png
└── supabase/
    └── schema.sql      ← Run this in Supabase SQL Editor
```

## Subscription Plans

| Level | Name       | Max Users |
|-------|------------|-----------|
| 1     | Starter    | 5         |
| 2     | Basic      | 10        |
| 3     | Growth     | 20        |
| 4     | Pro        | 50        |
| 5     | Enterprise | Unlimited |

To upgrade a store's plan, update directly in Supabase:
```sql
UPDATE stores SET plan_level = 3 WHERE id = '<store-uuid>';
```
