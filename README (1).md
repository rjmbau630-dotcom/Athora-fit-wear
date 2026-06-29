# Athora Fit Wear — Upgrade Implementation Guide

All the changes from your roadmap, ready to apply. Work through the phases in order.

---

## 📁 What's in this package

```
athora-upgrades/
├── sql/
│   └── 001_migrations.sql      ← Run once against your DB
├── backend/
│   └── routes.js               ← New/updated API routes
└── frontend/
    ├── patch.js                 ← Drop in alongside your main JS
    ├── patch.css                ← Drop in alongside your main CSS
    └── snippets.html            ← Copy-paste HTML into the right pages
```

---

## Phase 1 — Critical Fixes

### Step 1: Run the SQL migration

```bash
psql $DATABASE_URL < sql/001_migrations.sql
```

This will:
- Add `order_code` column (ATH-OR-0001 format) with auto-generation trigger
- Add `payment_status` and `delivery_status` columns (separate from the old `status`)
- Backfill existing orders
- Create the `site_settings` table with default theme + banner values
- Add indexes for fast tracking lookups

### Step 2: Add the new backend routes

Open `backend/routes.js`. The file exports two routers.
In your main `server.js` / `app.js`, add:

```js
const { orderRoutes, settingsRoutes } = require('./routes/routes');
app.use('/api/orders',   orderRoutes);
app.use('/api/settings', settingsRoutes);
```

> **Note:** The PUT `/api/orders/:id/status` route fixes the 404 you're currently hitting.
> The GET `/api/orders/track/:query` route powers order tracking.
> The GET `/api/orders/stats` route powers dashboard summary cards.

### Step 3: Add the frontend patch

1. Copy `frontend/patch.js`  → your static JS folder (e.g. `/public/js/patch.js`)
2. Copy `frontend/patch.css` → your static CSS folder (e.g. `/public/css/patch.css`)
3. In your HTML `<head>`:
   ```html
   <link rel="stylesheet" href="/css/patch.css" />
   ```
4. Before `</body>`:
   ```html
   <script src="/js/patch.js"></script>
   ```

### Step 4: Update your HTML

From `frontend/snippets.html`, apply:

**Banner (snippet 1)**
Add `id="site-banner"` to your existing banner `<div>`. That's it.

**Track Order panel (snippet 2)**
Replace your current static tracking section with the new `<form id="tracking-form">` block.
It needs: `id="tracking-form"`, `id="tracking-input"`, `id="tracking-result"`.

**Logo & hero banner**
Add `id="site-logo"` to your `<img>` logo tag.
Add `id="hero-banner"` to your hero section wrapper.

---

## Phase 2 — Professional Polish

### Admin order cards (snippet 4)

Replace your existing order card template. Each card needs:
- `data-order-id="{{order.id}}"` on the wrapper `div`
- `.pay-status` span showing payment_status
- `.del-status` span showing delivery_status
- Action buttons with `data-action="mark-paid"` etc.

The JS in `patch.js` picks these up automatically via event delegation on `#admin-orders-list`.

### Dashboard stats (snippet 3)

Add `<div id="dashboard-stats"></div>` at the top of your admin page.
`loadDashboardStats()` in patch.js fills it automatically.

### Theme settings panel (snippet 5)

Add the `<section id="theme-settings-section">` block as a tab in your admin area.
`loadThemeSettings()` in patch.js wires it up automatically.

---

## Phase 3 — Business Features (next)

These aren't in this package but are the logical next steps:

| Feature | What to build |
|---|---|
| Printable invoices | `GET /api/orders/:id/invoice` → returns HTML, open in new tab → print |
| Search by order code | Admin filter input calling `GET /api/orders?q=ATH-OR-0001` |
| Inventory management | `products` table with `stock_qty`, decrement on order |
| Customer notifications | Trigger WhatsApp/SMS via Africa's Talking API on status change |
| Email receipts | Nodemailer or Resend.com on order create |

---

## API Reference

### Order Tracking (public)
```
GET /api/orders/track/ATH-OR-0001
GET /api/orders/track/0712345678
```
Returns order with payment_status, delivery_status, items array.

### Update Order Status (admin)
```
PUT /api/orders/:id/status
Body: { "payment_status": "Paid" }
Body: { "delivery_status": "Shipped" }
Body: { "payment_status": "Paid", "delivery_status": "Packed" }
```

### Dashboard Stats (admin)
```
GET /api/orders/stats
```

### Site Settings (admin)
```
GET /api/settings
PUT /api/settings
Body: { "primary_color": "#7c3aed", "banner_message": "🎉 Weekend Sale!" }
```

### Valid status values
| Field | Values |
|---|---|
| `payment_status` | `Pending` · `Paid` · `Refunded` |
| `delivery_status` | `Pending` · `Packed` · `Shipped` · `Delivered` · `Cancelled` |

---

## Customizable Theme Presets

Once the theme panel is live, you can switch instantly to:

| Look | primary_color | secondary_color | accent_color |
|---|---|---|---|
| Classic Black & Gold | `#000000` | `#ffffff` | `#f5a623` |
| Purple & White | `#7c3aed` | `#ffffff` | `#a78bfa` |
| Pink & White | `#db2777` | `#ffffff` | `#f9a8d4` |
| Forest Green | `#065f46` | `#ffffff` | `#34d399` |
| Navy & Gold | `#1e3a5f` | `#ffffff` | `#fbbf24` |

---

## Quick checklist

- [ ] SQL migration run successfully
- [ ] `order_code` column visible in DB (ATH-OR-0001 format)
- [ ] `site_settings` table exists with default rows
- [ ] PUT `/api/orders/:id/status` returns 200 (not 404)
- [ ] GET `/api/orders/track/ATH-OR-0001` returns order JSON
- [ ] `patch.css` and `patch.js` loaded on all pages
- [ ] `id="site-banner"` on banner element
- [ ] Tracking form has correct IDs
- [ ] Admin order cards have `data-order-id` and action buttons
- [ ] `id="dashboard-stats"` present in admin
- [ ] Theme settings panel wired in admin
