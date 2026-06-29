// ============================================================
// ATHORA FIT WEAR — Backend API Routes
// File: routes/orders.js  (and routes/settings.js)
// Stack: Node.js + Express + pg (PostgreSQL)
// ============================================================
// Add to your main server file:
//   const orderRoutes   = require('./routes/orders');
//   const settingsRoutes = require('./routes/settings');
//   app.use('/api/orders',   orderRoutes);
//   app.use('/api/settings', settingsRoutes);
// ============================================================

const express = require('express');
const router  = express.Router();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─────────────────────────────────────────────────────────────
// ORDERS ROUTES
// ─────────────────────────────────────────────────────────────

// GET /api/orders — list all orders (admin)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*,
             json_agg(json_build_object(
               'name',     oi.product_name,
               'qty',      oi.quantity,
               'price',    oi.price
             )) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/track/:code — public order tracking
// Accepts ATH-OR-0001 or a phone number
router.get('/track/:query', async (req, res) => {
  const q = req.params.query.trim();
  const isOrderCode = /^ATH-OR-\d+$/i.test(q);
  const isPhone     = /^0\d{9}$|^\+254\d{9}$/.test(q);

  if (!isOrderCode && !isPhone) {
    return res.status(400).json({ error: 'Enter a valid order code (ATH-OR-0001) or phone number.' });
  }

  try {
    const column = isOrderCode ? 'UPPER(order_code)' : 'phone';
    const value  = isOrderCode ? q.toUpperCase() : q;

    const { rows } = await pool.query(`
      SELECT o.id, o.order_code, o.status,
             o.payment_status, o.delivery_status,
             o.estimated_delivery, o.created_at,
             o.customer_name, o.phone, o.address,
             o.total,
             json_agg(json_build_object(
               'name',  oi.product_name,
               'qty',   oi.quantity,
               'price', oi.price
             )) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE ${column} = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 1
    `, [value]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Order not found. Check the code and try again.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Tracking lookup failed.' });
  }
});

// PUT /api/orders/:id/status — update order statuses (admin)
// Body: { payment_status?, delivery_status?, status? }
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { payment_status, delivery_status, status } = req.body;

  const validPayment  = ['Pending', 'Paid', 'Refunded'];
  const validDelivery = ['Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

  if (payment_status  && !validPayment.includes(payment_status))
    return res.status(400).json({ error: `Invalid payment_status: ${payment_status}` });
  if (delivery_status && !validDelivery.includes(delivery_status))
    return res.status(400).json({ error: `Invalid delivery_status: ${delivery_status}` });

  try {
    const sets   = [];
    const values = [];
    let   idx    = 1;

    if (payment_status)  { sets.push(`payment_status = $${idx++}`);  values.push(payment_status); }
    if (delivery_status) { sets.push(`delivery_status = $${idx++}`); values.push(delivery_status); }
    if (status)          { sets.push(`status = $${idx++}`);          values.push(status); }

    if (!sets.length) return res.status(400).json({ error: 'No fields to update.' });

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE orders SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order.' });
  }
});

// GET /api/orders/stats — dashboard summary
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)          AS today_orders,
        COALESCE(SUM(total) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0) AS today_revenue,
        COUNT(*) FILTER (WHERE payment_status = 'Pending')               AS pending_payment,
        COUNT(*) FILTER (WHERE delivery_status = 'Delivered')            AS delivered,
        COUNT(*) FILTER (WHERE delivery_status = 'Cancelled')            AS cancelled,
        COUNT(*) FILTER (WHERE delivery_status = 'Shipped')              AS shipped
      FROM orders
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats.' });
  }
});

module.exports = router;


// ============================================================
// SETTINGS ROUTES — save to a separate file: routes/settings.js
// ============================================================
// const express = require('express');
// const router  = express.Router();
// const { Pool } = require('pg');
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const settingsRouter = express.Router();

const ALLOWED_KEYS = [
  'primary_color', 'secondary_color', 'accent_color',
  'button_color', 'background_color', 'logo_url',
  'hero_banner_url', 'font_family', 'banner_message'
];

// GET /api/settings — return all site settings as a flat object
settingsRouter.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM site_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings.' });
  }
});

// PUT /api/settings — update one or more settings (admin)
// Body: { primary_color: "#7c3aed", banner_message: "Sale on!" }
settingsRouter.put('/', async (req, res) => {
  const updates = req.body;
  const keys    = Object.keys(updates).filter(k => ALLOWED_KEYS.includes(k));
  if (!keys.length) return res.status(400).json({ error: 'No valid settings provided.' });

  try {
    for (const key of keys) {
      await pool.query(`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      `, [key, updates[key]]);
    }
    const { rows } = await pool.query('SELECT key, value FROM site_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
});

// Export both — in your server.js do:
// app.use('/api/orders',   require('./routes/orders'));
// app.use('/api/settings', require('./routes/settings'));
module.exports = { orderRoutes: router, settingsRoutes: settingsRouter };
