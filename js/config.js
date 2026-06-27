/**
 * VyaparTrack - Configuration
 * All vars assigned to window so ES modules can access them via window.VAR_NAME
 */

window.SUPABASE_URL     = 'https://vojhghwlmmqxeebrynvo.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvamhnaHdsbW1xeGVlYnJ5bnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODQwOTYsImV4cCI6MjA5MTU2MDA5Nn0.hpLs3KIGzfTKZs8WWWY4sCoU40orCOvw7u9kiMoqE58';

// Super admin UUID — find in Supabase → Authentication → Users
window.SUPER_ADMIN_ID = 'c7c2b611-803a-42b2-861a-d769b903e511';

// Plan limits: how many users each plan level allows
// Level 4+ = contact us (treated as unlimited in app logic)
window.PLAN_LIMITS = {
  1: 1,
  2: 3,
  3: 5,
  4: Infinity  // "Contact Us" plan
};

window.PLAN_NAMES = {
  1: 'Solo',
  2: 'Small',
  3: 'Team',
  4: 'Custom'
};

window.PLAN_CONTACT = {
  4: true  // plans marked true show "Contact Us" instead of a number
};

window.APP_CONFIG = {
  name: 'VyaparTrack',
  version: '1.0.0',
  pageSize: 20,
  themeKey: 'vt_theme'
};
