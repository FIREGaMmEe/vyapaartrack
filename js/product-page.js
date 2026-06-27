import { supabase, requireAuth } from './supabase.js';
import { renderLayout } from './layout.js';
import { fmt, fmtDate, today, showToast, openModal, closeModal, esc, renderPaymentUI } from './utils.js';

(async () => {
  const user = await requireAuth();
  if (!user) return;

  const container = renderLayout('inventory', user.id);
  document.title = 'Product – VyaparTrack';
  document.getElementById('topbar-title').textContent = 'Product Detail';

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = 'inventory.html'; return; }

  container.innerHTML = `<div style="text-align:center;padding:60px;"><div class="spinner"></div></div>`;

  let { data: p, error } = await supabase.from('products').select('*')
    .eq('id', id).eq('store_id', user.profile?.store_id).single();

  if (error || !p) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><h3>Product not found</h3><a href="inventory.html" class="btn btn-primary" style="margin-top:12px;">Back</a></div>`;
    return;
  }

  render(p);

  // ─────────────────────────────────────────
  function render(p) {
    const profit = p.status === 'sold' ? (p.sell_price||0) - (p.purchase_price||0) : null;

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <a href="inventory.html" class="btn btn-ghost btn-sm">← Back</a>
        <div style="flex:1;">
          <h1>${esc(p.model)}</h1>
          <span class="badge ${p.status==='in_stock'?'badge-success':'badge-warning'}" style="margin-top:4px;">
            ${p.status==='in_stock'?'🟢 In Stock':'✅ Sold'}
          </span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${p.status==='in_stock'
            ? `<button class="btn btn-success" id="sell-btn">💸 Mark as Sold</button>`
            : `<a href="invoice.html?id=${p.id}" class="btn btn-outline">🧾 Sales Note</a>
               <button class="btn btn-outline btn-sm" id="edit-sale-btn">✏️ Edit Sale</button>`}
          <button class="btn btn-outline btn-sm" id="edit-btn">✏️ Edit</button>
          <button class="btn btn-outline btn-sm" id="del-btn" style="border-color:var(--danger);color:var(--danger);">🗑</button>
        </div>
      </div>

      ${renderPhotos(p)}

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;" id="detail-grid">
        ${renderPurchaseCard(p)}
        ${renderSpecsCard(p)}
        ${renderSaleCard(p, profit)}
      </div>

      ${renderDueBanners(p)}

      <!-- Sell Modal -->
      <div class="modal-overlay" id="sell-modal">
        <div class="modal" style="max-width:580px;">
          <div class="modal-header"><h3>💸 Mark as Sold</h3><button class="btn btn-ghost" onclick="closeModal('sell-modal')">✕</button></div>
          <div class="modal-body" style="max-height:75vh;overflow-y:auto;">
            <div id="sell-alert"></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Sell Price (₹) <span class="req">*</span></label><input type="number" id="s-price" class="form-control" placeholder="0" min="0" /></div>
              <div class="form-group"><label class="form-label">Sell Date <span class="req">*</span></label><input type="date" id="s-date" class="form-control" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Buyer Name <span class="req">*</span></label><input type="text" id="s-buyer" class="form-control" placeholder="Buyer's name" /></div>
              <div class="form-group"><label class="form-label">Buyer Contact</label><input type="tel" id="s-contact" class="form-control" placeholder="+91 98765 43210" /></div>
            </div>
            <div class="form-group"><label class="form-label">Remark</label><textarea id="s-remark" class="form-control" placeholder="Any notes..."></textarea></div>
            <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);padding-bottom:10px;border-bottom:1px solid var(--border);margin:16px 0;">💳 Payment Mode</div>
            <div id="sell-payment-ui"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal('sell-modal')">Cancel</button>
            <button class="btn btn-success" id="confirm-sell-btn">✅ Confirm Sale</button>
          </div>
        </div>
      </div>

      <!-- Edit Modal -->
      <div class="modal-overlay" id="edit-modal">
        <div class="modal" style="max-width:600px;">
          <div class="modal-header"><h3>✏️ Edit Product</h3><button class="btn btn-ghost" onclick="closeModal('edit-modal')">✕</button></div>
          <div class="modal-body" style="max-height:75vh;overflow-y:auto;">
            <div id="edit-alert"></div>
            <div class="form-group"><label class="form-label">Model <span class="req">*</span></label><input type="text" id="e-model" class="form-control" value="${esc(p.model)}" /></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">IMEI 1 <span class="req">*</span></label><input type="text" id="e-imei1" class="form-control" value="${esc(p.imei_1)}" /></div>
              <div class="form-group"><label class="form-label">IMEI 2</label><input type="text" id="e-imei2" class="form-control" value="${esc(p.imei_2||'')}" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Storage</label>
                <select id="e-storage" class="form-control"><option value="">Not specified</option>
                  ${['16GB','32GB','64GB','128GB','256GB','512GB','1TB'].map(v=>`<option${p.storage===v?' selected':''}>${v}</option>`).join('')}
                </select></div>
              <div class="form-group"><label class="form-label">RAM</label>
                <select id="e-ram" class="form-control"><option value="">Not specified</option>
                  ${['2GB','3GB','4GB','6GB','8GB','12GB','16GB'].map(v=>`<option${p.ram===v?' selected':''}>${v}</option>`).join('')}
                </select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Color</label><input type="text" id="e-color" class="form-control" value="${esc(p.color||'')}" /></div>
              <div class="form-group"><label class="form-label">Accessories</label><input type="text" id="e-accessories" class="form-control" value="${esc(p.accessories||'')}" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Purchase Price (₹) <span class="req">*</span></label><input type="number" id="e-price" class="form-control" value="${p.purchase_price||''}" /></div>
              <div class="form-group"><label class="form-label">Purchase Date <span class="req">*</span></label><input type="date" id="e-date" class="form-control" value="${p.purchase_date||''}" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Seller Name</label><input type="text" id="e-seller" class="form-control" value="${esc(p.seller_name||'')}" /></div>
              <div class="form-group"><label class="form-label">Seller Contact</label><input type="tel" id="e-seller-contact" class="form-control" value="${esc(p.seller_contact||'')}" /></div>
            </div>
            <div class="form-group"><label class="form-label">Remark</label><textarea id="e-remark" class="form-control">${esc(p.purchase_remark||'')}</textarea></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal('edit-modal')">Cancel</button>
            <button class="btn btn-primary" id="save-edit-btn">💾 Save Changes</button>
          </div>
        </div>
      </div>

      <!-- Edit Sale Modal -->
      ${p.status === 'sold' ? `
      <div class="modal-overlay" id="edit-sale-modal">
        <div class="modal" style="max-width:580px;">
          <div class="modal-header"><h3>✏️ Edit Sale</h3><button class="btn btn-ghost" onclick="closeModal('edit-sale-modal')">✕</button></div>
          <div class="modal-body" style="max-height:75vh;overflow-y:auto;">
            <div id="edit-sale-alert"></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Sell Price (₹) <span class="req">*</span></label><input type="number" id="es-price" class="form-control" value="${p.sell_price||''}" min="0" /></div>
              <div class="form-group"><label class="form-label">Sell Date <span class="req">*</span></label><input type="date" id="es-date" class="form-control" value="${p.sell_date||''}" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Buyer Name <span class="req">*</span></label><input type="text" id="es-buyer" class="form-control" value="${esc(p.buyer_name||'')}" /></div>
              <div class="form-group"><label class="form-label">Buyer Contact</label><input type="tel" id="es-contact" class="form-control" value="${esc(p.buyer_contact||'')}" /></div>
            </div>
            <div class="form-group"><label class="form-label">Remark</label><textarea id="es-remark" class="form-control">${esc(p.sell_remark||'')}</textarea></div>
            <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);padding-bottom:10px;border-bottom:1px solid var(--border);margin:16px 0;">💳 Payment Mode</div>
            <div id="edit-sale-payment-ui"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal('edit-sale-modal')">Cancel</button>
            <button class="btn btn-primary" id="save-sale-btn">💾 Save Sale</button>
          </div>
        </div>
      </div>` : ''}

      <!-- Delete Modal -->
      <div class="modal-overlay" id="del-modal">
        <div class="modal">
          <div class="modal-header"><h3>Delete Product</h3><button class="btn btn-ghost" onclick="closeModal('del-modal')">✕</button></div>
          <div class="modal-body"><p style="color:var(--text);">Delete <strong>${esc(p.model)}</strong>? This cannot be undone.</p></div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal('del-modal')">Cancel</button>
            <button class="btn btn-danger" id="confirm-del-btn">Delete</button>
          </div>
        </div>
      </div>`;

    // Responsive grid
    if (!document.getElementById('pg-style')) {
      const s = document.createElement('style');
      s.id = 'pg-style';
      s.textContent = `@media(max-width:900px){#detail-grid{grid-template-columns:1fr 1fr!important;}}@media(max-width:580px){#detail-grid{grid-template-columns:1fr!important;}}`;
      document.head.appendChild(s);
    }

    window.openModal  = openModal;
    window.closeModal = closeModal;

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(o =>
      o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); }));

    // Button wiring
    document.getElementById('sell-btn')?.addEventListener('click', () => {
      document.getElementById('s-date').value    = today();
      document.getElementById('s-price').value   = '';
      document.getElementById('s-buyer').value   = '';
      document.getElementById('s-contact').value = '';
      document.getElementById('s-remark').value  = '';
      openModal('sell-modal');
      // Init payment UI after modal DOM exists
      collectSellPayment = renderPaymentUI('sell-payment-ui', 'sell', () => {});
    });

    document.getElementById('edit-btn')?.addEventListener('click', () => openModal('edit-modal'));
    document.getElementById('del-btn')?.addEventListener('click', () => openModal('del-modal'));

    // Edit sale button — open modal and init payment UI pre-set to current mode
    document.getElementById('edit-sale-btn')?.addEventListener('click', () => {
      openModal('edit-sale-modal');
      // Use prefix 'es' (edit-sale) so IDs don't clash with the sell modal ('sell')
      collectEditSalePayment = renderPaymentUI('edit-sale-payment-ui', 'es', () => {});
      // Pre-select the current payment mode tab
      if (p.sell_payment_mode) {
        const tabs = document.querySelectorAll('#edit-sale-payment-ui .pay-tab-btn');
        tabs.forEach(t => {
          if (t.dataset.mode === p.sell_payment_mode) t.click();
        });
      }
      // Pre-fill payment amounts after tab click re-renders fields
      setTimeout(() => {
        const mode = p.sell_payment_mode;
        if (mode === 'cash') {
          const el = document.getElementById('es-cash'); if (el) el.value = p.sell_cash_amount || p.sell_price || '';
        } else if (mode === 'upi') {
          const el = document.getElementById('es-upi'); if (el) el.value = p.sell_upi_amount || '';
          const ref = document.getElementById('es-upi-ref'); if (ref) ref.value = p.sell_upi_ref || '';
        } else if (mode === 'mix') {
          const c = document.getElementById('es-cash'); if (c) c.value = p.sell_cash_amount || '';
          const u = document.getElementById('es-upi');  if (u) u.value = p.sell_upi_amount  || '';
          const ref = document.getElementById('es-upi-ref'); if (ref) ref.value = p.sell_upi_ref || '';
        } else if (mode === 'due') {
          const paid = (p.sell_cash_amount||0) + (p.sell_upi_amount||0);
          const pn = document.getElementById('es-paid-now'); if (pn) pn.value = paid || '';
          const due = document.getElementById('es-due'); if (due) due.value = p.sell_due_amount || '';
        }
      }, 80);
    });

    // Save edited sale
    document.getElementById('save-sale-btn')?.addEventListener('click', async () => {
      const alertEl = document.getElementById('edit-sale-alert');
      alertEl.innerHTML = '';
      const sell_price    = parseFloat(document.getElementById('es-price').value);
      const buyer_name    = document.getElementById('es-buyer').value.trim();
      const buyer_contact = document.getElementById('es-contact').value.trim() || null;
      const sell_date     = document.getElementById('es-date').value;
      const sell_remark   = document.getElementById('es-remark').value.trim() || null;

      if (isNaN(sell_price) || sell_price < 0) return alertEl.innerHTML = '<div class="alert alert-danger">Enter a valid sell price.</div>';
      if (!buyer_name) return alertEl.innerHTML = '<div class="alert alert-danger">Buyer name is required.</div>';
      if (!sell_date)  return alertEl.innerHTML = '<div class="alert alert-danger">Sell date is required.</div>';

      const payData = collectEditSalePayment
        ? collectEditSalePayment(sell_price)
        : { fields: { sell_payment_mode: 'cash', sell_cash_amount: sell_price } };
      if (payData.error) return alertEl.innerHTML = `<div class="alert alert-danger">${payData.error}</div>`;

      const btn = document.getElementById('save-sale-btn');
      btn.disabled = true; btn.innerHTML = 'Saving...';
      const { error } = await supabase.from('products').update({
        sell_price, buyer_name, buyer_contact, sell_date, sell_remark,
        ...payData.fields
      }).eq('id', p.id);
      btn.disabled = false; btn.innerHTML = '💾 Save Sale';
      if (error) return alertEl.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      showToast('Sale updated!', 'success');
      closeModal('edit-sale-modal');
      const { data: fresh } = await supabase.from('products').select('*').eq('id', p.id).single();
      if (fresh) { p = fresh; render(fresh); }
    });

    // Confirm sell
    document.getElementById('confirm-sell-btn')?.addEventListener('click', async () => {
      const alertEl       = document.getElementById('sell-alert');
      alertEl.innerHTML   = '';
      const sell_price    = parseFloat(document.getElementById('s-price').value);
      const buyer_name    = document.getElementById('s-buyer').value.trim();
      const buyer_contact = document.getElementById('s-contact').value.trim() || null;
      const sell_date     = document.getElementById('s-date').value;
      const sell_remark   = document.getElementById('s-remark').value.trim() || null;

      if (isNaN(sell_price) || sell_price < 0) return alertEl.innerHTML = '<div class="alert alert-danger">Enter a valid sell price.</div>';
      if (!buyer_name) return alertEl.innerHTML = '<div class="alert alert-danger">Buyer name is required.</div>';
      if (!sell_date)  return alertEl.innerHTML = '<div class="alert alert-danger">Sell date is required.</div>';

      const payData = collectSellPayment
        ? collectSellPayment(sell_price)
        : { fields: { sell_payment_mode: 'cash', sell_cash_amount: sell_price } };
      if (payData.error) return alertEl.innerHTML = `<div class="alert alert-danger">${payData.error}</div>`;

      const btn = document.getElementById('confirm-sell-btn');
      btn.disabled = true; btn.innerHTML = 'Saving...';
      const { error } = await supabase.from('products').update({
        sell_price, buyer_name, buyer_contact, sell_date, sell_remark,
        status: 'sold', ...payData.fields
      }).eq('id', p.id);
      btn.disabled = false; btn.innerHTML = '✅ Confirm Sale';
      if (error) return alertEl.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      showToast('Sale recorded!', 'success');
      closeModal('sell-modal');
      setTimeout(() => location.href = `invoice.html?id=${p.id}`, 500);
    });

    // Save edit
    document.getElementById('save-edit-btn')?.addEventListener('click', async () => {
      const alertEl = document.getElementById('edit-alert');
      alertEl.innerHTML = '';
      const model   = document.getElementById('e-model').value.trim();
      const imei_1  = document.getElementById('e-imei1').value.trim();
      const imei_2  = document.getElementById('e-imei2').value.trim() || null;
      const price   = parseFloat(document.getElementById('e-price').value);
      const date    = document.getElementById('e-date').value;
      const seller  = document.getElementById('e-seller').value.trim();
      const contact = document.getElementById('e-seller-contact').value.trim() || null;
      const remark  = document.getElementById('e-remark').value.trim() || null;
      const storage = document.getElementById('e-storage').value || null;
      const ram     = document.getElementById('e-ram').value || null;
      const color   = document.getElementById('e-color').value.trim() || null;
      const accessories = document.getElementById('e-accessories').value.trim() || null;

      if (!model)  return alertEl.innerHTML = '<div class="alert alert-danger">Model is required.</div>';
      if (!imei_1) return alertEl.innerHTML = '<div class="alert alert-danger">IMEI 1 is required.</div>';
      if (isNaN(price) || price < 0) return alertEl.innerHTML = '<div class="alert alert-danger">Valid price required.</div>';

      const btn = document.getElementById('save-edit-btn');
      btn.disabled = true; btn.innerHTML = 'Saving...';
      const { error } = await supabase.from('products').update({
        model, imei_1, imei_2, purchase_price: price, purchase_date: date,
        seller_name: seller, seller_contact: contact, purchase_remark: remark,
        storage, ram, color, accessories
      }).eq('id', p.id);
      btn.disabled = false; btn.innerHTML = '💾 Save Changes';
      if (error) return alertEl.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      showToast('Product updated!', 'success');
      closeModal('edit-modal');
      const { data: fresh } = await supabase.from('products').select('*').eq('id', p.id).single();
      if (fresh) render(fresh);
    });

    // Confirm delete
    document.getElementById('confirm-del-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('confirm-del-btn');
      btn.disabled = true; btn.innerHTML = 'Deleting...';
      const { error } = await supabase.from('products').delete().eq('id', p.id);
      if (error) { showToast('Delete failed', 'error'); btn.disabled = false; btn.innerHTML = 'Delete'; return; }
      showToast('Product deleted', 'success');
      location.href = 'inventory.html';
    });

    // Due clear buttons
    document.getElementById('clear-buy-due')?.addEventListener('click', async () => {
      await supabase.from('products').update({ buy_due_cleared: true, buy_due_cleared_date: today() }).eq('id', p.id);
      showToast('Purchase due cleared', 'success');
      const { data: fresh } = await supabase.from('products').select('*').eq('id', p.id).single();
      if (fresh) render(fresh);
    });
    document.getElementById('clear-sell-due')?.addEventListener('click', async () => {
      await supabase.from('products').update({ sell_due_cleared: true, sell_due_cleared_date: today() }).eq('id', p.id);
      showToast('Sale due cleared', 'success');
      const { data: fresh } = await supabase.from('products').select('*').eq('id', p.id).single();
      if (fresh) render(fresh);
    });
  }

  // ─────────────────────────────────────────
  let collectSellPayment     = null;
  let collectEditSalePayment = null;

  function renderPhotos(p) {
    if (!p.photo_url) return '';
    let photos = [];
    try { photos = JSON.parse(p.photo_url); } catch { photos = [p.photo_url]; }
    if (!photos.length) return '';
    return `<div class="card" style="margin-bottom:16px;">
      <h3 style="margin-bottom:12px;">📸 Photos</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;">
        ${photos.map((url,i) => `<a href="${url}" target="_blank" style="display:block;aspect-ratio:1;border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border);">
          <img src="${url}" alt="Photo ${i+1}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/></a>`).join('')}
      </div></div>`;
  }

  function payInfo(mode, cash, upi, due, cleared, clearedDate) {
    if (!mode) return '—';
    const parts = [];
    if (mode === 'cash') parts.push(`💵 Cash: ${fmt(cash||0)}`);
    else if (mode === 'upi')  parts.push(`📱 UPI: ${fmt(upi||0)}`);
    else if (mode === 'mix')  parts.push(`💵 ${fmt(cash||0)} + 📱 ${fmt(upi||0)}`);
    else if (mode === 'due') {
      const paid = (cash||0)+(upi||0);
      parts.push(`Paid: ${fmt(paid)}`);
    }
    if (due > 0) {
      parts.push(`<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:600;background:${cleared?'var(--success-light)':'var(--warning-light)'};color:${cleared?'var(--success)':'var(--warning)'};">${cleared ? '✅ Due Cleared' : '⏳ Due: '+fmt(due)}</span>`);
      if (cleared && clearedDate) parts.push(`Cleared: ${fmtDate(clearedDate)}`);
    }
    return parts.join('<br>');
  }

  function renderPurchaseCard(p) {
    return `<div class="card">
      <h3 style="margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border);">🛒 Purchase Info</h3>
      <div class="detail-grid">
        <div><div class="detail-label">Model</div><div class="detail-value">${esc(p.model)}</div></div>
        <div><div class="detail-label">IMEI 1</div><div class="detail-value" style="font-family:monospace;font-size:.82rem;">${esc(p.imei_1)}</div></div>
        ${p.imei_2?`<div><div class="detail-label">IMEI 2</div><div class="detail-value" style="font-family:monospace;font-size:.82rem;">${esc(p.imei_2)}</div></div>`:''}
        <div><div class="detail-label">Purchase Price</div><div class="detail-value">${fmt(p.purchase_price)}</div></div>
        <div><div class="detail-label">Purchase Date</div><div class="detail-value">${fmtDate(p.purchase_date)}</div></div>
        <div><div class="detail-label">Seller</div><div class="detail-value">${esc(p.seller_name)||'—'}</div></div>
        <div><div class="detail-label">Seller Contact</div><div class="detail-value">${esc(p.seller_contact)||'—'}</div></div>
        <div style="grid-column:1/-1;"><div class="detail-label">Payment</div><div class="detail-value">${payInfo(p.buy_payment_mode,p.buy_cash_amount,p.buy_upi_amount,p.buy_due_amount,p.buy_due_cleared,p.buy_due_cleared_date)}</div></div>
        ${p.purchase_remark?`<div style="grid-column:1/-1;"><div class="detail-label">Remark</div><div class="detail-value">${esc(p.purchase_remark)}</div></div>`:''}
      </div></div>`;
  }

  function renderSpecsCard(p) {
    const has = p.storage||p.ram||p.color||p.accessories;
    return `<div class="card">
      <h3 style="margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border);">🔧 Device Specs</h3>
      <div class="detail-grid">
        ${p.storage?`<div><div class="detail-label">Storage</div><div class="detail-value">${esc(p.storage)}</div></div>`:''}
        ${p.ram?`<div><div class="detail-label">RAM</div><div class="detail-value">${esc(p.ram)}</div></div>`:''}
        ${p.color?`<div><div class="detail-label">Color</div><div class="detail-value">${esc(p.color)}</div></div>`:''}
        ${p.accessories?`<div style="grid-column:1/-1;"><div class="detail-label">Accessories</div><div class="detail-value">${esc(p.accessories)}</div></div>`:''}
        ${!has?`<div style="grid-column:1/-1;color:var(--text-muted);font-size:.875rem;">No specs recorded</div>`:''}
      </div></div>`;
  }

  function renderSaleCard(p, profit) {
    if (p.status !== 'sold') return `<div class="card">
      <h3 style="margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border);">💰 Sale Info</h3>
      <div class="empty-state" style="padding:32px 16px;"><div class="empty-icon">🏷️</div><h3>Not sold yet</h3><p>Click "Mark as Sold"</p></div></div>`;
    return `<div class="card">
      <h3 style="margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border);">💰 Sale Info</h3>
      <div class="detail-grid">
        <div><div class="detail-label">Sell Price</div><div class="detail-value">${fmt(p.sell_price)}</div></div>
        <div><div class="detail-label">Profit</div><div class="detail-value" style="color:${profit>=0?'var(--success)':'var(--danger)'};">${fmt(profit)}</div></div>
        <div><div class="detail-label">Sell Date</div><div class="detail-value">${fmtDate(p.sell_date)}</div></div>
        <div><div class="detail-label">Buyer</div><div class="detail-value">${esc(p.buyer_name)||'—'}</div></div>
        <div><div class="detail-label">Buyer Contact</div><div class="detail-value">${esc(p.buyer_contact)||'—'}</div></div>
        <div style="grid-column:1/-1;"><div class="detail-label">Payment</div><div class="detail-value">${payInfo(p.sell_payment_mode,p.sell_cash_amount,p.sell_upi_amount,p.sell_due_amount,p.sell_due_cleared,p.sell_due_cleared_date)}</div></div>
        ${p.sell_remark?`<div style="grid-column:1/-1;"><div class="detail-label">Remark</div><div class="detail-value">${esc(p.sell_remark)}</div></div>`:''}
      </div></div>`;
  }

  function renderDueBanners(p) {
    let html = '';
    if ((p.buy_due_amount||0) > 0 && !p.buy_due_cleared) {
      html += `<div class="alert alert-warning" style="margin-top:16px;">⏳ Purchase due of <strong>${fmt(p.buy_due_amount)}</strong> is pending. <button class="btn btn-sm btn-success" id="clear-buy-due" style="margin-left:12px;">Mark Cleared</button></div>`;
    }
    if ((p.sell_due_amount||0) > 0 && !p.sell_due_cleared) {
      html += `<div class="alert alert-warning" style="margin-top:8px;">⏳ Sale due of <strong>${fmt(p.sell_due_amount)}</strong> pending from buyer. <button class="btn btn-sm btn-success" id="clear-sell-due" style="margin-left:12px;">Mark Cleared</button></div>`;
    }
    return html;
  }
})();
