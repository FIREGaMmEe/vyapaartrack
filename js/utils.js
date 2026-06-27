/**
 * VyaparTrack - Shared Utilities
 */

// ── Toast ──
export function showToast(msg, type = 'default', ms = 3500) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', default: 'ℹ' };
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'all .2s';
    t.style.opacity = '0';
    t.style.transform = 'translateX(100%)';
    setTimeout(() => t.remove(), 200);
  }, ms);
}

// ── Currency ──
export function fmt(n) {
  if (n == null || isNaN(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ── Date ──
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function toDateInput(d) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}
export function today() {
  return new Date().toISOString().split('T')[0];
}

// ── Debounce ──
export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ── Escape HTML ──
export function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Modal ──
export function openModal(id) { document.getElementById(id)?.classList.add('open'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Theme ──
export function initTheme() {
  const saved = localStorage.getItem('vt_theme');
  const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(saved || sys);
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('vt_theme', theme);
  // Update logos
  const logoMap = {
    'sidebar-logo': theme === 'dark' ? 'assets/Logo_dark.png' : 'assets/Logo.png',
    'auth-logo':    theme === 'dark' ? 'assets/Logo_dark.png' : 'assets/Logo.png',
    'landing-logo': theme === 'dark' ? 'assets/Logo_dark.png' : 'assets/Logo.png',
  };
  Object.entries(logoMap).forEach(([id, src]) => {
    const el = document.getElementById(id);
    if (el) el.src = src;
  });
  document.querySelectorAll('.logo-icon').forEach(el => {
    el.src = theme === 'dark' ? 'assets/Logow_dark.png' : 'assets/Logow.png';
  });
  // Update toggle buttons
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
}

// ── Offline banner ──
export function initOffline() {
  const b = document.getElementById('offline-banner');
  if (!b) return;
  const update = () => { b.style.display = navigator.onLine ? 'none' : 'block'; };
  update();
  window.addEventListener('online', () => { update(); syncQueue(); });
  window.addEventListener('offline', update);
}

// ── IndexedDB ──
let _db;
function openDB() {
  return new Promise((res, rej) => {
    if (_db) return res(_db);
    const r = indexedDB.open('VyaparTrackDB', 1);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('queue')) d.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('cache')) d.createObjectStore('cache', { keyPath: 'key' });
    };
    r.onsuccess = e => { _db = e.target.result; res(_db); };
    r.onerror = () => rej(r.error);
  });
}

export async function queueAction(action) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').add({ ...action, ts: Date.now() });
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

export async function getQueue() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('queue', 'readonly');
    const r = tx.objectStore('queue').getAll();
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}

export async function removeFromQueue(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').delete(id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

export async function setCache(key, val) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put({ key, val, ts: Date.now() });
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

export async function getCache(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('cache', 'readonly');
    const r = tx.objectStore('cache').get(key);
    r.onsuccess = () => res(r.result?.val ?? null); r.onerror = () => rej(r.error);
  });
}

// ── Sync offline queue ──
export async function syncQueue() {
  if (!navigator.onLine) return;
  const queue = await getQueue();
  if (!queue.length) return;
  const { supabase } = await import('./supabase.js');
  let n = 0;
  for (const item of queue) {
    try {
      if (item.type === 'insert_product') {
        const { error } = await supabase.from('products').insert(item.data);
        if (!error) { await removeFromQueue(item.id); n++; }
      }
    } catch (e) { console.warn('sync failed', e); }
  }
  if (n) showToast(`${n} item(s) synced`, 'success');
}

// ── Sidebar ──
export function initSidebar() {
  const ham = document.getElementById('hamburger');
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('sidebar-overlay');
  if (!ham || !sb) return;
  ham.addEventListener('click', () => { sb.classList.toggle('open'); ov.classList.toggle('open'); });
  ov?.addEventListener('click', () => { sb.classList.remove('open'); ov.classList.remove('open'); });
  sb.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      if (window.innerWidth <= 768) { sb.classList.remove('open'); ov.classList.remove('open'); }
    });
  });
}

// ── genId ──
export function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

// ── Sales Note year-month prefix ──
// Format: YYAAMM  e.g. April 2026 → "26AA04"
// Year letter pair: 2026=AA, 2027=BB, 2028=CC, etc.
export function getYearCode() {
  const now  = new Date();
  const year = now.getFullYear();
  const yy   = String(year).slice(2);
  const idx  = year - 2026; // 0=AA, 1=BB, 2=CC ...
  const base = 65 + (idx % 26);
  const pair = String.fromCharCode(base) + String.fromCharCode(base); // "AA", "BB", etc.
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  return yy + pair + mm; // e.g. "26AA04"
}

// ── Payment UI builder ──
// Renders payment mode tabs + detail fields into a container element
export function renderPaymentUI(containerId, prefix, onModeChange) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  let mode = 'cash';

  wrap.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;" id="${prefix}-tabs">
      <button class="pay-tab-btn active" data-mode="cash">💵 Cash</button>
      <button class="pay-tab-btn" data-mode="upi">📱 UPI</button>
      <button class="pay-tab-btn" data-mode="mix">🔀 Mix</button>
      <button class="pay-tab-btn" data-mode="due">⏳ Due</button>
    </div>
    <div id="${prefix}-pay-fields"></div>`;

  // Inject tab styles if not already present
  if (!document.getElementById('pay-tab-style')) {
    const s = document.createElement('style');
    s.id = 'pay-tab-style';
    s.textContent = `.pay-tab-btn{padding:7px 16px;border-radius:20px;border:1.5px solid var(--border);background:var(--surface);color:var(--text-muted);font-size:.85rem;font-weight:500;cursor:pointer;transition:all .15s;}.pay-tab-btn.active{border-color:var(--primary);background:var(--primary-light);color:var(--primary);}`;
    document.head.appendChild(s);
  }

  function renderFields(m) {
    const el = document.getElementById(`${prefix}-pay-fields`);
    if (!el) return;
    if (m === 'cash') {
      el.innerHTML = `
        <div class="form-group">
          <label class="form-label">Cash Amount (₹)</label>
          <input type="number" id="${prefix}-cash" class="form-control" placeholder="Full amount in cash" min="0" />
          <span class="form-hint">Leave blank to auto-fill from total price</span>
        </div>`;
    } else if (m === 'upi') {
      el.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">UPI Amount (₹)</label>
            <input type="number" id="${prefix}-upi" class="form-control" placeholder="Full amount via UPI" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">UPI Reference / ID</label>
            <input type="text" id="${prefix}-upi-ref" class="form-control" placeholder="e.g. UPI Ref No." />
          </div>
        </div>`;
    } else if (m === 'mix') {
      el.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">💵 Cash Amount (₹)</label>
            <input type="number" id="${prefix}-cash" class="form-control" placeholder="0" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">📱 UPI Amount (₹)</label>
            <input type="number" id="${prefix}-upi" class="form-control" placeholder="0" min="0" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">UPI Reference / ID</label>
          <input type="text" id="${prefix}-upi-ref" class="form-control" placeholder="UPI transaction ref (optional)" />
        </div>
        <span class="form-hint" id="${prefix}-mix-hint">Cash + UPI must equal total price</span>`;
    } else if (m === 'due') {
      el.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Amount Paid Now (₹)</label>
            <input type="number" id="${prefix}-paid-now" class="form-control" placeholder="0" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Due Amount (₹)</label>
            <input type="number" id="${prefix}-due" class="form-control" placeholder="0" min="0" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Paid via</label>
            <select id="${prefix}-due-mode" class="form-control">
              <option value="cash">💵 Cash</option>
              <option value="upi">📱 UPI</option>
              <option value="mix">🔀 Mix</option>
            </select>
          </div>
          <div class="form-group" id="${prefix}-due-upi-wrap" style="display:none;">
            <label class="form-label">UPI Reference</label>
            <input type="text" id="${prefix}-upi-ref" class="form-control" placeholder="UPI ref (optional)" />
          </div>
        </div>`;

      // Show UPI ref when UPI or mix selected
      document.getElementById(`${prefix}-due-mode`)?.addEventListener('change', function() {
        const show = this.value === 'upi' || this.value === 'mix';
        document.getElementById(`${prefix}-due-upi-wrap`).style.display = show ? '' : 'none';
      });
    }
  }

  renderFields(mode);

  wrap.querySelectorAll('.pay-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.pay-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.mode;
      renderFields(mode);
      if (onModeChange) onModeChange(mode);
    });
  });

  // Return a collector function
  return function collectPayment(totalPrice) {
    const f = {};
    const modeKey = prefix.startsWith('buy') ? 'buy_payment_mode' : 'sell_payment_mode';
    const cashKey = prefix.startsWith('buy') ? 'buy_cash_amount'  : 'sell_cash_amount';
    const upiKey  = prefix.startsWith('buy') ? 'buy_upi_amount'   : 'sell_upi_amount';
    const dueKey  = prefix.startsWith('buy') ? 'buy_due_amount'   : 'sell_due_amount';
    const dueClrKey = prefix.startsWith('buy') ? 'buy_due_cleared' : 'sell_due_cleared';

    f[modeKey] = mode;

    if (mode === 'cash') {
      f[cashKey] = parseFloat(document.getElementById(`${prefix}-cash`)?.value) || totalPrice;
    } else if (mode === 'upi') {
      f[upiKey] = parseFloat(document.getElementById(`${prefix}-upi`)?.value) || totalPrice;
      f[`${prefix.startsWith('buy')?'buy':'sell'}_upi_ref`] = document.getElementById(`${prefix}-upi-ref`)?.value.trim() || null;
    } else if (mode === 'mix') {
      const cash = parseFloat(document.getElementById(`${prefix}-cash`)?.value) || 0;
      const upi  = parseFloat(document.getElementById(`${prefix}-upi`)?.value)  || 0;
      if (Math.abs(cash + upi - totalPrice) > 1) {
        return { error: `Mix amounts (₹${cash} + ₹${upi} = ₹${cash+upi}) must equal ₹${totalPrice}` };
      }
      f[cashKey] = cash;
      f[upiKey]  = upi;
      f[`${prefix.startsWith('buy')?'buy':'sell'}_upi_ref`] = document.getElementById(`${prefix}-upi-ref`)?.value.trim() || null;
    } else if (mode === 'due') {
      const paidNow = parseFloat(document.getElementById(`${prefix}-paid-now`)?.value) || 0;
      const due     = parseFloat(document.getElementById(`${prefix}-due`)?.value) || 0;
      const dueMode = document.getElementById(`${prefix}-due-mode`)?.value || 'cash';
      f[dueKey]    = due;
      f[dueClrKey] = false;
      if (dueMode === 'cash' || dueMode === 'mix') f[cashKey] = paidNow;
      if (dueMode === 'upi'  || dueMode === 'mix') f[upiKey]  = paidNow;
      f[`${prefix.startsWith('buy')?'buy':'sell'}_upi_ref`] = document.getElementById(`${prefix}-upi-ref`)?.value.trim() || null;
    }

    return { fields: f };
  };
}
