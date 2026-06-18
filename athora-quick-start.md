# Athora Fit Wear — Quick Start

## Project Structure

```
athora-fit-wear/
├── public/
├── src/
│   ├── App.jsx (main component)
│   ├── lib/
│   │   ├── supabase.js (Supabase client)
│   │   └── mpesa.js (M-Pesa integration)
│   ├── hooks/
│   │   └── useAuth.js (auth hook)
│   └── index.js
├── .env.local (local env vars)
├── package.json
└── README.md
```

## Installation & Setup

### 1. Create React App

```bash
npx create-react-app athora-fit-wear
cd athora-fit-wear
```

### 2. Install Dependencies

```bash
npm install @supabase/supabase-js lucide-react
```

### 3. Copy Files

- Copy `athora-fit-wear.jsx` → `src/App.jsx`
- Create `src/lib/supabase.js` (see Deployment Guide)
- Create `src/lib/mpesa.js` (see Deployment Guide)
- Create `src/hooks/useAuth.js` (see Deployment Guide)

### 4. Set Up Environment Variables

Create `.env.local`:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_MPESA_CONSUMER_KEY=dev_key
REACT_APP_MPESA_CONSUMER_SECRET=dev_secret
REACT_APP_MPESA_BUSINESS_SHORTCODE=174379
REACT_APP_MPESA_PASSKEY=dev_passkey
REACT_APP_API_URL=http://localhost:3001
```

### 5. Set Up Supabase

```bash
# Create Supabase project at supabase.com
# Run SQL from athora-supabase-schema.sql in Supabase SQL Editor
```

### 6. Run Locally

```bash
npm start
```

Visit `http://localhost:3000`

---

## Key Features

### Customer Storefront
- Browse products with images
- Filter by size and color
- Add to cart (localStorage)
- Checkout with contact info
- Payment: M-Pesa or Cash on Delivery
- Order tracking (phone + order ID)

### Admin Dashboard
- **Login**: Default password `Athora2024!` (change in production)
- **Products**: Add, edit, delete products with variants
- **Orders**: View, update order status (pending → shipped → delivered)
- **Inventory**: Real-time stock tracking, low-stock alerts
- **Dashboard**: Stats (total orders, revenue, pending orders)

### Design
- Dark aesthetic (#0A0A0A background)
- Neon accents (#C8FF00 green, #FFE500 yellow)
- Bold typography (Bebas Neue)
- Responsive mobile-first layout
- Sharp hover effects, snappy transitions

---

## Pricing & Delivery

All prices in **KES (Kenyan Shillings)**.

**Delivery:**
- Free over KES 10,000
- KES 500 delivery fee under threshold

---

## Payment Methods

### Cash on Delivery (COD)
- Customer provides address
- Order marked as "pending"
- Admin marks "shipped" when dispatched

### M-Pesa
- Customer enters phone number
- STK push sent automatically
- Customer enters PIN to pay
- Order updates to "processing" on payment
- Payment confirmed via Daraja callback

---

## Admin Credentials (Local Testing)

**Username**: `admin` (in sidebar)
**Password**: `Athora2024!`

---

## Database (Supabase)

Run `athora-supabase-schema.sql` to set up:

- **products** — product catalog
- **product_variants** — size/color combos with stock
- **orders** — customer orders
- **order_items** — line items per order
- **mpesa_transactions** — payment tracking
- **auth_users** — admin accounts

All tables have RLS policies for security.

---

## Customization

### Change Admin Password

In `src/App.jsx`:

```javascript
const ADMIN_PASSWORD = 'YourNewPassword123!';
```

### Update Delivery Threshold

```javascript
const DELIVERY_THRESHOLD = 10000; // KES
const DELIVERY_COST = 500; // KES
```

### Add Product Categories

```javascript
const CATEGORIES = ['Tanks', 'T-Shirts', 'Hoodies', 'Shorts', 'Tights', 'Hats'];
```

### Change Neon Colors

Search and replace:
- `#C8FF00` → your neon green
- `#FFE500` → your electric yellow
- `#0A0A0A` → your dark background

### Update Brand Name

Search and replace:
- `Athora Fit Wear` → your brand name
- Update in navbar, hero, admin panel, footer

---

## Deployment Checklist

Before going live:

1. **Supabase**
   - [ ] Create project (non-sandbox)
   - [ ] Deploy schema
   - [ ] Set up admin user
   - [ ] Test RLS policies

2. **M-Pesa (Daraja)**
   - [ ] Register production account
   - [ ] Get live credentials
   - [ ] Update `.env` with production keys
   - [ ] Test STK push end-to-end

3. **Frontend**
   - [ ] Update all `localhost` URLs
   - [ ] Test checkout flow
   - [ ] Test order tracking
   - [ ] Test admin panel
   - [ ] Deploy to Render

4. **Backend (if applicable)**
   - [ ] Set up callback handler
   - [ ] Deploy to Render
   - [ ] Verify M-Pesa callbacks work

5. **Final**
   - [ ] Update footer contact info
   - [ ] Test all payment methods
   - [ ] Verify delivery fee logic
   - [ ] Check prices are in KES

---

## Troubleshooting

### "Module not found" errors
```bash
npm install
```

### Supabase connection fails
- Check URL and key in `.env.local`
- Verify Supabase project is running
- Check RLS policies allow anonymous access to products

### M-Pesa STK doesn't appear
- Verify phone format: 254XXXXXXXXX
- Check Daraja credentials
- Look at browser Network tab for API errors
- Ensure callback URL is publicly accessible

### Admin login fails
- Verify password is correct
- Check browser console for errors
- Try clearing localStorage: `localStorage.clear()`

### Cart items disappear on refresh
- Browser must allow localStorage
- Check browser settings → Privacy → Site Data

### Orders not saving
- Check Supabase RLS policies
- Verify `orders` table has `INSERT` permission
- Check browser Network tab for 403 errors

---

## File Sizes & Performance

- App: ~25KB minified + gzipped
- No external CDN dependencies (all inline)
- Lazy loads product images
- LocalStorage cart (no backend sync unless Supabase)

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Daraja (M-Pesa)**: https://developer.safaricom.co.ke/
- **Render Docs**: https://render.com/docs
- **React Docs**: https://react.dev/

---

## License

Custom built for Athora Fit Wear. All rights reserved.
