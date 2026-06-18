# Athora Fit Wear — Deployment & Integration Guide

## Overview

This guide covers setting up Athora Fit Wear for production with:
- **Supabase** for database, auth, and storage
- **M-Pesa** for mobile payment integration
- **Render** for hosting
- **Admin panel** access control

---

## 1. Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose your region (e.g., "Africa - Rwanda" for lower latency in Kenya)
3. Save your **Supabase URL** and **Anon Key** — you'll need these in `.env`

### 1.2 Set Up Database

1. In Supabase, go to **SQL Editor**
2. Paste the entire contents of `athora-supabase-schema.sql`
3. Run the query to create all tables, indexes, and RLS policies

### 1.3 Create Admin Account

1. Go to **Authentication > Users** in Supabase
2. Click **Invite User** and create your admin account (e.g., `admin@athorafit.com`)
3. After user is created, go to **SQL Editor** and run:

```sql
INSERT INTO auth_users (id, email, is_admin)
SELECT id, email, TRUE
FROM auth.users
WHERE email = 'admin@athorafit.com';
```

---

## 2. Update React App for Supabase

Replace the mock data with real Supabase integration. Here's the updated app structure:

### 2.1 Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2.2 Create Supabase Client (`lib/supabase.js`)

```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 2.3 Create Auth Hook (`hooks/useAuth.js`)

```javascript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Check if admin
        checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          checkAdmin(session.user.id);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  async function checkAdmin(userId) {
    const { data } = await supabase
      .from('auth_users')
      .select('is_admin')
      .eq('id', userId)
      .single();
    setIsAdmin(data?.is_admin || false);
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  }

  return { user, isAdmin, loading, signIn, signOut };
}
```

### 2.4 Fetch Products from Supabase

Replace the mock `MOCK_PRODUCTS` with:

```javascript
async function fetchProducts() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      variants:product_variants(id, size, color, stock)
    `);
  
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  
  return products.map(p => ({
    ...p,
    variants: p.variants || []
  }));
}
```

### 2.5 Create/Fetch Orders

```javascript
// Create order
async function createOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      id: orderData.id,
      customer_name: orderData.name,
      customer_phone: orderData.phone,
      delivery_address: orderData.address,
      payment_method: orderData.paymentMethod,
      mpesa_phone: orderData.mpesaPhone,
      subtotal: orderData.subtotal,
      delivery_cost: orderData.delivery,
      total: orderData.total
    }])
    .select();

  if (error) throw error;

  // Insert order items
  for (const item of orderData.items) {
    await supabase.from('order_items').insert([{
      order_id: orderData.id,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      price_at_purchase: item.price
    }]);
  }

  return data[0];
}

// Fetch order by ID and phone
async function fetchOrder(orderId, phone) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        quantity,
        price_at_purchase,
        product:products(id, name),
        variant:product_variants(size, color)
      )
    `)
    .eq('id', orderId)
    .eq('customer_phone', phone)
    .single();

  if (error) return null;
  return data;
}
```

### 2.6 Admin: Update Order Status

```javascript
async function updateOrderStatus(orderId, newStatus) {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date() })
    .eq('id', orderId);

  return error;
}
```

---

## 3. M-Pesa Integration

### 3.1 Daraja API Setup

1. Register at [Safaricom Daraja](https://developer.safaricom.co.ke)
2. Create a new app and get your **Consumer Key** and **Consumer Secret**
3. Save these in `.env`:

```
REACT_APP_MPESA_CONSUMER_KEY=your_consumer_key
REACT_APP_MPESA_CONSUMER_SECRET=your_consumer_secret
REACT_APP_MPESA_BUSINESS_SHORTCODE=your_shortcode
REACT_APP_MPESA_PASSKEY=your_passkey
```

### 3.2 M-Pesa STK Push Implementation

Create `lib/mpesa.js`:

```javascript
import { supabase } from './supabase';

const MPESA_API_URL = 'https://sandbox.safaricom.co.ke'; // Change to production URL
const CONSUMER_KEY = process.env.REACT_APP_MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.REACT_APP_MPESA_CONSUMER_SECRET;
const BUSINESS_SHORTCODE = process.env.REACT_APP_MPESA_BUSINESS_SHORTCODE;
const PASSKEY = process.env.REACT_APP_MPESA_PASSKEY;

// Get access token
async function getMpesaAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  
  const response = await fetch(`${MPESA_API_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });

  const data = await response.json();
  return data.access_token;
}

// STK Push
export async function initiateMpesaPayment(orderId, phone, amount) {
  try {
    const token = await getMpesaAccessToken();
    
    // Format phone number (remove + if present)
    const phoneNumber = phone.replace(/\D/g, '').slice(-10);
    const formattedPhone = '254' + phoneNumber.slice(-9);

    // Timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

    // Password: BusinessShortCode + Passkey + Timestamp (base64)
    const password = Buffer.from(
      `${BUSINESS_SHORTCODE}${PASSKEY}${timestamp}`
    ).toString('base64');

    const payload = {
      BusinessShortCode: BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: formattedPhone,
      PartyB: BUSINESS_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.REACT_APP_API_URL}/api/mpesa/callback`,
      AccountReference: orderId,
      TransactionDesc: `Payment for Order ${orderId}`
    };

    const response = await fetch(
      `${MPESA_API_URL}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    // Save transaction
    await supabase.from('mpesa_transactions').insert([{
      order_id: orderId,
      phone_number: formattedPhone,
      amount: amount,
      status: 'pending',
      mpesa_response: data
    }]);

    return { success: data.ResponseCode === '0', data };
  } catch (error) {
    console.error('M-Pesa error:', error);
    return { success: false, error };
  }
}
```

### 3.3 Payment Callback Webhook

Create a backend endpoint (Node.js/Express) to handle M-Pesa callbacks:

```javascript
app.post('/api/mpesa/callback', (req, res) => {
  const { Body } = req.body;
  const result = Body.stkCallback;

  if (result.ResultCode === 0) {
    // Payment successful
    const orderId = result.CheckoutRequestID;
    // Update order status in Supabase
    supabase
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', orderId);

    // Update M-Pesa transaction
    const metadata = result.CallbackMetadata?.ItemList || [];
    const mpesaRef = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
    
    supabase
      .from('mpesa_transactions')
      .update({ 
        status: 'completed', 
        transaction_id: mpesaRef,
        mpesa_response: result 
      })
      .eq('order_id', orderId);
  }

  res.json({ resultCode: 0, resultDesc: 'Callback processed' });
});
```

---

## 4. Environment Variables

Create `.env.local` in your React project:

```
# Supabase
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# M-Pesa (Daraja)
REACT_APP_MPESA_CONSUMER_KEY=your_consumer_key
REACT_APP_MPESA_CONSUMER_SECRET=your_consumer_secret
REACT_APP_MPESA_BUSINESS_SHORTCODE=174379
REACT_APP_MPESA_PASSKEY=your_passkey

# API
REACT_APP_API_URL=http://localhost:3001 (local) or your deployed backend URL
```

---

## 5. Render Deployment

### 5.1 Prepare for Production

Update `.env` for production URLs:

```bash
REACT_APP_MPESA_CONSUMER_KEY=<production_key>
REACT_APP_MPESA_PASSKEY=<production_passkey>
# Remove SANDBOX from API URL
```

### 5.2 Deploy Frontend to Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Create a new **Static Site**
4. Connect your GitHub repo
5. Build command: `npm run build`
6. Publish directory: `build`
7. Add environment variables in Render dashboard
8. Deploy

### 5.3 Deploy Backend (if using Node.js for M-Pesa callbacks)

1. Create a new **Web Service** on Render
2. Connect GitHub repo
3. Runtime: `Node`
4. Build command: `npm install`
5. Start command: `node server.js` (or your entry file)
6. Add environment variables
7. Deploy

**Backend Example Server** (`server.js`):

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.post('/api/mpesa/callback', async (req, res) => {
  const { Body } = req.body;
  const result = Body.stkCallback;

  if (result.ResultCode === 0) {
    const metadata = result.CallbackMetadata?.ItemList || [];
    const mpesaRef = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
    const amount = metadata.find(i => i.Name === 'Amount')?.Value;
    
    const { error } = await supabase
      .from('mpesa_transactions')
      .update({ 
        status: 'completed', 
        transaction_id: mpesaRef
      })
      .eq('order_id', result.CheckoutRequestID);

    if (!error) {
      await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', result.CheckoutRequestID);
    }
  }

  res.json({ resultCode: 0, resultDesc: 'Callback processed' });
});

app.listen(process.env.PORT || 3001, () => {
  console.log('Server running on port', process.env.PORT || 3001);
});
```

---

## 6. Admin Access & Maintenance

### 6.1 Password Protection (Current Setup)

The current app uses a static password: `Athora2024!`

**For production**, replace with Supabase auth:

```javascript
// In AdminDashboard component
async function handleAdminLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (!error && isAdmin) {
    setIsAdmin(true);
  } else {
    setError('Invalid credentials or not an admin');
  }
}
```

### 6.2 Stock Management

Admin dashboard pulls real-time stock from Supabase:

```javascript
// Subscribe to stock changes
supabase
  .from('product_variants')
  .on('*', payload => {
    // Update UI with new stock
    handleStockUpdate(payload.new);
  })
  .subscribe();
```

### 6.3 Order Notifications

Add email notifications when orders come in:

```javascript
// Use Supabase Edge Functions or SendGrid
app.post('/api/orders', async (req, res) => {
  // After order created...
  
  // Send email to admin
  await sendEmail({
    to: 'admin@athorafit.com',
    subject: `New Order #${orderId}`,
    html: `Customer: ${name}, Phone: ${phone}, Total: ${total} KES`
  });
});
```

---

## 7. Checklist for Go-Live

- [ ] Supabase project created and schema deployed
- [ ] Admin user created in auth_users table
- [ ] M-Pesa Daraja account registered (production credentials)
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Render
- [ ] Environment variables set in production
- [ ] M-Pesa payment tested end-to-end
- [ ] Admin login tested
- [ ] Order creation and tracking tested
- [ ] Delivery fee logic verified (KES 10,000 threshold)
- [ ] All prices in KES
- [ ] Contact info (email, phone) updated in footer

---

## 8. Support & Troubleshooting

### Order not appearing in admin dashboard
- Check Supabase RLS policies
- Verify user is marked as `is_admin = TRUE`
- Check browser console for API errors

### M-Pesa STK push not showing
- Verify phone number format: 254XXXXXXXXX
- Check Daraja credentials in `.env`
- Ensure callback URL is publicly accessible
- Check Daraja logs for errors

### Images not loading
- Upload to Supabase Storage, update `image_url` in products table
- Or use external CDN (Cloudinary, Imgix)

### Performance issues
- Add database indexes (already in schema)
- Enable Supabase caching
- Use CDN for static assets

---

**Questions?** Refer to:
- Supabase docs: https://supabase.com/docs
- Daraja API: https://developer.safaricom.co.ke/
- Render: https://render.com/docs
