/**
 * VyaparTrack - Supabase Client
 *
 * NOTE: SUPABASE_URL, SUPABASE_ANON_KEY and SUPER_ADMIN_ID come from
 * js/config.js loaded as a plain <script> tag BEFORE this module.
 * ES modules can't directly read those globals, so we read them via window.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Read globals set by config.js via window (works across module boundary)
const _url  = window.SUPABASE_URL;
const _key  = window.SUPABASE_ANON_KEY;

if (!_url || !_key || _url.includes('YOUR_PROJECT')) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;">
      <div style="text-align:center;max-width:400px;">
        <div style="font-size:2.5rem;margin-bottom:12px;">⚙️</div>
        <h2 style="margin-bottom:8px;">Setup Required</h2>
        <p style="color:#6b7280;margin-bottom:16px;">Please add your Supabase URL and anon key to <code>js/config.js</code> before using the app.</p>
        <a href="index.html" style="color:#2563eb;">← Back to home</a>
      </div>
    </div>`;
  throw new Error('Supabase not configured');
}

export const supabase = createClient(_url, _key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'vt_auth'
  }
});

/**
 * Waits for Supabase to restore session from localStorage or URL hash.
 * onAuthStateChange fires INITIAL_SESSION synchronously — no race condition.
 */
export function getInitialSession() {
  return new Promise(resolve => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      subscription.unsubscribe();
      resolve(session);
    });
  });
}

/**
 * Require auth — redirects to login.html if no valid session.
 * Returns user object with .profile and .profile.stores attached.
 */
export async function requireAuth() {
  const session = await getInitialSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('*, stores(*)')
    .eq('id', session.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine (new user, no store yet)
    console.warn('Profile fetch error:', error.message);
  }

  return { ...session.user, profile: profile || null };
}

/**
 * Sign out and go to login
 */
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}
