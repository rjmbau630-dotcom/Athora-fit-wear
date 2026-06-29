// ============================================================
// ATHORA FIT WEAR — Frontend Patches
// Drop this into your existing main JS file (or a new patch.js
// loaded after your current script).
// ============================================================

// ─────────────────────────────────────────────────────────────
// 0.  SITE SETTINGS LOADER
//     Runs on every page load — applies theme & banner from DB
// ─────────────────────────────────────────────────────────────

async function loadSiteSettings() {
  try {
    const res  = await fetch('/api/settings');
    const cfg  = await res.json();

    // Apply CSS custom properties to :root
    const root = document.documentElement;
    if (cfg.primary_color)    root.style.setProperty('--color-primary',    cfg.primary_color);
    if (cfg.secondary_color)  root.style.setProperty('--color-secondary',  cfg.secondary_color);
    if (cfg.accent_color)     root.style.setProperty('--color-accent',     cfg.accent_color);
    if (cfg.button_color)     root.style.setProperty('--color-button',     cfg.button_color);
    if (cfg.background_color) root.style.setProperty('--color-background', cfg.background_color);
    if (cfg.font_family)      root.style.setProperty('--font-family',      cfg.font_family);

    // Banner message
    const banner = document.getElementById('site-banner');
    if (banner && cfg.banner_message) banner.textContent = cfg.banner_message;

    // Logo
    const logo = document.getElementById('site-logo');
    if (logo && cfg.logo_url) logo.src = cfg.logo_url;

    // Hero banner
    const hero = document.getElementById('hero-banner');
    if (hero && cfg.hero_banner_url) hero.style.backgroundImage = `url('${cfg.hero_banner_url}')`;

  } catch (e) {
    console.warn('Could not load site settings:', e);
  }
}

// ─────────────────────────────────────────────────────────────
// 1.  ORDER TRACKING PANEL
// ─────────────────────────────────────────────────────────────

const DELIVERY_STEPS = [
  { key: 'received',   label: 'Order Received' },
  { key: 'paid',       label: 'Payment Confirmed' },
  { key: 'packed',     label: 'Packed' },
  { key: 'shipped',    label: 'Out for Delivery' },
  { key: 'delivered',  label: 'Delivered' },
];

function getStepIndex(paymentStatus, deliveryStatus) {
  if (deliveryStatus === 'Delivered') return 4;
  if (deliveryStatus === 'Shipped')   return 3;
  if (deliveryStatus === 'Packed')    return 2;
  if (paymentStatus  === 'Paid')      return 1;
  return 0; // just received
}

function renderTrackingTimeline(order) {
  const currentStep = getStepIndex(order.payment_status, order.delivery_status);

  const stepsHTML = DELIVERY_STEPS.map((step, i) => {
    let icon, cls;
    if (i < currentStep)       { icon = '✓'; cls = 'step-done'; }
    else if (i === currentStep){ icon = i === 3 ? '🚚' : '●'; cls = 'step-current'; }
    else                       { icon = '⬜'; cls = 'step-pending'; }

    return `<div class="tracking-step ${cls}">
      <span class="step-icon">${icon}</span>
      <span class="step-label">${step.label}</span>
    </div>`;
  }).join('');

  const itemsHTML = (order.items || []).filter(Boolean).map(item =>
    `<div class="track-item">
      <span>${item.name} × ${item.qty}</span>
      <span>KES ${Number(item.price * item.qty).toLocaleString()}</span>
    </div>`
  ).join('');

  return `
    <div class="tracking-result">
      <div class="track-header">
        <h3>${order.order_code}</h3>
        <span class="track-date">Placed: ${new Date(order.created_at).toLocaleDateString('en-KE')}</span>
      </div>
      <div class="track-badges">
        <span class="badge badge-pay ${order.payment_status.toLowerCase()}">
          💳 ${order.payment_status}
        </span>
        <span class="badge badge-del ${(order.delivery_status || '').toLowerCase()}">
          📦 ${order.delivery_status || 'Pending'}
        </span>
      </div>
      ${order.estimated_delivery ? `<p class="eta">Estimated delivery: <strong>${order.estimated_delivery}</strong></p>` : ''}
      <div class="tracking-timeline">${stepsHTML}</div>
      ${itemsHTML ? `<div class="track-items"><h4>Items</h4>${itemsHTML}</div>` : ''}
      <p class="track-total">Total: <strong>KES ${Number(order.total || 0).toLocaleString()}</strong></p>
    </div>`;
}

async function trackOrder(query) {
  const resultEl = document.getElementById('tracking-result');
  if (!resultEl) return;

  resultEl.innerHTML = '<p class="tracking-loading">🔍 Looking up your order…</p>';

  try {
    const res  = await fetch(`/api/orders/track/${encodeURIComponent(query.trim())}`);
    const data = await res.json();

    if (!res.ok) {
      resultEl.innerHTML = `<p class="tracking-error">❌ ${data.error || 'Order not found.'}</p>`;
      return;
    }

    resultEl.innerHTML = renderTrackingTimeline(data);
  } catch (e) {
    resultEl.innerHTML = '<p class="tracking-error">⚠️ Could not connect. Please try again.</p>';
  }
}

// Wire up the tracking form
function initTrackingPanel() {
  const form  = document.getElementById('tracking-form');
  const input = document.getElementById('tracking-input');
  const btn   = document.getElementById('tracking-btn');

  if (!form || !input) return;

  // Replace old static listener
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    trackOrder(q);
  });

  if (btn) btn.addEventListener('click', () => {
    const q = input.value.trim();
    if (q) trackOrder(q);
  });
}

// ─────────────────────────────────────────────────────────────
// 2.  ADMIN — ORDER ACTION BUTTONS
// ─────────────────────────────────────────────────────────────

async function updateOrderStatus(orderId, payload, buttonEl) {
  buttonEl.disabled = true;
  buttonEl.textContent = '…';

  try {
    const res  = await fetch(`/api/orders/${orderId}/status`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Update failed.');
      buttonEl.disabled = false;
      return;
    }

    // Refresh the card UI
    const card = buttonEl.closest('[data-order-id]');
    if (card) refreshOrderCard(card, data);

  } catch (e) {
    alert('Network error — please try again.');
    buttonEl.disabled = false;
  }
}

function refreshOrderCard(card, order) {
  const payBadge = card.querySelector('.pay-status');
  const delBadge = card.querySelector('.del-status');
  if (payBadge) payBadge.textContent = order.payment_status;
  if (delBadge) delBadge.textContent = order.delivery_status;

  // Re-enable all buttons
  card.querySelectorAll('button[disabled]').forEach(b => { b.disabled = false; });
}

// Delegate click events on the admin orders list
function initAdminOrderButtons() {
  const ordersList = document.getElementById('admin-orders-list');
  if (!ordersList) return;

  ordersList.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const card    = btn.closest('[data-order-id]');
    const orderId = card?.dataset.orderId;
    if (!orderId) return;

    const action = btn.dataset.action;
    const payloadMap = {
      'mark-paid':    { payment_status: 'Paid' },
      'mark-packed':  { delivery_status: 'Packed' },
      'mark-shipped': { delivery_status: 'Shipped' },
      'mark-delivered':{ delivery_status: 'Delivered' },
      'mark-cancelled':{ delivery_status: 'Cancelled' },
      'mark-refunded': { payment_status: 'Refunded' },
    };

    const payload = payloadMap[action];
    if (payload) updateOrderStatus(orderId, payload, btn);
  });
}

// ─────────────────────────────────────────────────────────────
// 3.  ADMIN — DASHBOARD STATS
// ─────────────────────────────────────────────────────────────

async function loadDashboardStats() {
  const container = document.getElementById('dashboard-stats');
  if (!container) return;

  try {
    const res  = await fetch('/api/orders/stats');
    const data = await res.json();

    container.innerHTML = `
      <div class="stat-card">
        <span class="stat-label">Today's Orders</span>
        <span class="stat-value">${data.today_orders}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Revenue Today</span>
        <span class="stat-value">KES ${Number(data.today_revenue).toLocaleString()}</span>
      </div>
      <div class="stat-card stat-warn">
        <span class="stat-label">Pending Payment</span>
        <span class="stat-value">${data.pending_payment}</span>
      </div>
      <div class="stat-card stat-success">
        <span class="stat-label">Delivered</span>
        <span class="stat-value">${data.delivered}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Shipped</span>
        <span class="stat-value">${data.shipped}</span>
      </div>
      <div class="stat-card stat-danger">
        <span class="stat-label">Cancelled</span>
        <span class="stat-value">${data.cancelled}</span>
      </div>`;
  } catch (e) {
    console.warn('Stats load failed:', e);
  }
}

// ─────────────────────────────────────────────────────────────
// 4.  ADMIN — THEME SETTINGS PANEL
// ─────────────────────────────────────────────────────────────

async function loadThemeSettings() {
  const form = document.getElementById('theme-settings-form');
  if (!form) return;

  const res  = await fetch('/api/settings');
  const cfg  = await res.json();

  // Populate inputs
  Object.entries(cfg).forEach(([key, value]) => {
    const el = form.querySelector(`[name="${key}"]`);
    if (el) el.value = value;
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload  = {};
    formData.forEach((v, k) => { payload[k] = v; });

    const saveBtn = form.querySelector('[type="submit"]');
    saveBtn.textContent = 'Saving…';
    saveBtn.disabled    = true;

    try {
      const res = await fetch('/api/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        // Live-preview the new theme
        const root = document.documentElement;
        if (data.primary_color)    root.style.setProperty('--color-primary',    data.primary_color);
        if (data.secondary_color)  root.style.setProperty('--color-secondary',  data.secondary_color);
        if (data.accent_color)     root.style.setProperty('--color-accent',     data.accent_color);
        if (data.button_color)     root.style.setProperty('--color-button',     data.button_color);
        if (data.background_color) root.style.setProperty('--color-background', data.background_color);
        saveBtn.textContent = '✓ Saved!';
      } else {
        saveBtn.textContent = 'Save Failed';
      }
    } catch (e) {
      saveBtn.textContent = 'Error';
    }
    setTimeout(() => { saveBtn.textContent = 'Save Settings'; saveBtn.disabled = false; }, 2000);
  });
}

// ─────────────────────────────────────────────────────────────
// 5.  INIT — run everything on DOMContentLoaded
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadSiteSettings();      // Always — applies theme to storefront & admin
  initTrackingPanel();     // Storefront tracking form
  initAdminOrderButtons(); // Admin order action buttons
  loadDashboardStats();    // Admin dashboard stats
  loadThemeSettings();     // Admin theme panel
});
