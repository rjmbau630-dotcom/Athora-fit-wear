"""
ATHORA FIT WEAR — athora.py
Flask + PostgreSQL + M-Pesa + Full Frontend
"""

# ══════════════════════════════════════════════════════════
#  CONFIG
# ══════════════════════════════════════════════════════════

ADMIN_PIN             = "Ryan mkuu"
FLASK_SECRET          = "athora-fit-secret-2025"
MPESA_SHORTCODE       = "516600"
MPESA_CONSUMER_KEY    = "YOUR_CONSUMER_KEY"
MPESA_CONSUMER_SECRET = "YOUR_CONSUMER_SECRET"
MPESA_PASSKEY         = "YOUR_PASSKEY"
MPESA_CALLBACK_URL    = "https://athorafit.shop/mpesa/callback"
MPESA_ENV             = "sandbox"

# ══════════════════════════════════════════════════════════
#  IMPORTS
# ══════════════════════════════════════════════════════════
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
import os, json, base64, secrets
from datetime import datetime
from flask import Flask, request, session, jsonify, Response

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    raise SystemExit("Run: pip install flask psycopg2-binary requests gunicorn")

try:
    import requests as req_lib
except ImportError:
    raise SystemExit("Run: pip install requests")

# ══════════════════════════════════════════════════════════
#  APP
# ══════════════════════════════════════════════════════════

app = Flask(__name__)
app.secret_key = FLASK_SECRET
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# ══════════════════════════════════════════════════════════
#  DATABASE
# ══════════════════════════════════════════════════════════

def get_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def init_db():
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id           SERIAL PRIMARY KEY,
                    name         TEXT    NOT NULL,
                    category     TEXT    NOT NULL DEFAULT 'General',
                    description  TEXT    DEFAULT '',
                    price        REAL    NOT NULL,
                    sizes        TEXT    DEFAULT 'One Size',
                    image_b64    TEXT,
                    out_of_stock INTEGER DEFAULT 0,
                    created_at   TIMESTAMP DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS orders (
                    id               SERIAL PRIMARY KEY,
                    ref              TEXT UNIQUE NOT NULL,
                    customer_name    TEXT NOT NULL,
                    customer_phone   TEXT NOT NULL,
                    customer_address TEXT NOT NULL,
                    items_json       TEXT NOT NULL,
                    total            REAL NOT NULL,
                    status           TEXT DEFAULT 'pending',
                    mpesa_code       TEXT,
                    mpesa_receipt    TEXT,
                    checkout_req_id  TEXT,
                    created_at       TIMESTAMP DEFAULT NOW(),
                    paid_at          TIMESTAMP
                );
            """)
        conn.commit()

def db_all(sql, params=()):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute(sql, params)
            return [dict(r) for r in c.fetchall()]

def db_one(sql, params=()):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute(sql, params)
            r = c.fetchone()
            return dict(r) if r else None

def db_run(sql, params=()):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute(sql, params)
            conn.commit()
            try:
                r = c.fetchone()
                return list(r.values())[0] if r else None
            except:
                return None

# ══════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════

def make_ref():
    return "ATH-" + secrets.token_urlsafe(4).upper()[:6]

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def wrap(*a, **kw):
        if not session.get("admin"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*a, **kw)
    return wrap

# ══════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════

@app.route("/admin/login", methods=["POST"])
def admin_login():
    if (request.get_json() or {}).get("pin") == ADMIN_PIN:
        session["admin"] = True
        session.permanent = True
        return jsonify({"success": True})
    return jsonify({"success": False}), 401

@app.route("/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("admin", None)
    return jsonify({"success": True})

@app.route("/admin/check", methods=["GET"])
def admin_check():
    """Check if user is authenticated (for session persistence)"""
    return jsonify({"authenticated": session.get("admin", False)})

# ══════════════════════════════════════════════════════════
#  PRODUCTS
# ══════════════════════════════════════════════════════════

@app.route("/api/products")
def api_products():
    try:
        products = db_all("SELECT id, name, category, description, price, sizes, out_of_stock, image_b64, created_at FROM products ORDER BY id DESC")
        return jsonify(products)
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return jsonify([])

@app.route("/api/products", methods=["POST"])
@admin_required
def api_add_product():
    d = request.get_json() or {}
    if not d.get("name") or d.get("price") is None:
        return jsonify({"error": "name and price required"}), 400
    
    try:
        price = float(d["price"])
        if price < 0:
            return jsonify({"error": "price must be positive"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "invalid price"}), 400
    
    # Compress image if it exists
    image_data = d.get("image_b64")
    if image_data and len(image_data) > 5000000:  # Limit to 5MB
        return jsonify({"error": "image too large (max 5MB)"}), 400
    
    try:
        pid = db_run(
            "INSERT INTO products(name,category,description,price,sizes,image_b64) VALUES(%s,%s,%s,%s,%s,%s) RETURNING id",
            (d["name"].strip(), d.get("category","General"), d.get("description","").strip(),
             price, d.get("sizes","One Size").strip(), image_data)
        )
        return jsonify({"success": True, "id": pid}), 201
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return jsonify({"error": "database error"}), 500

@app.route("/api/products/<int:pid>", methods=["DELETE"])
@admin_required
def api_delete_product(pid):
    try:
        db_run("DELETE FROM products WHERE id=%s", (pid,))
        return jsonify({"success": True})
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return jsonify({"error": "database error"}), 500

@app.route("/api/products/<int:pid>/stock", methods=["POST"])
@admin_required
def api_toggle_stock(pid):
    try:
        p = db_one("SELECT out_of_stock FROM products WHERE id=%s", (pid,))
        if not p: return jsonify({"error": "Not found"}), 404
        new_val = 0 if p["out_of_stock"] else 1
        db_run("UPDATE products SET out_of_stock=%s WHERE id=%s", (new_val, pid))
        return jsonify({"success": True, "out_of_stock": new_val})
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return jsonify({"error": "database error"}), 500

# ══════════════════════════════════════════════════════════
#  ORDERS
# ══════════════════════════════════════════════════════════

@app.route("/api/checkout", methods=["POST"])
def api_checkout():
    d = request.get_json() or {}
    for field in ["name", "phone", "address", "cart", "mpesa_code"]:
        if not d.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400
    total, items = 0, []
    for entry in d["cart"]:
        pid = entry.get("id") if isinstance(entry, dict) else entry
        p = db_one("SELECT * FROM products WHERE id=%s", (pid,))
        if not p:
            return jsonify({"error": f"Product {pid} not found"}), 404
        total += p["price"]
        items.append({
            "id": p["id"], "name": p["name"], "price": p["price"],
            "size": entry.get("size", "") if isinstance(entry, dict) else "",
            "category": p["category"]
        })
    ref = make_ref()
    try:
        db_run(
            "INSERT INTO orders(ref,customer_name,customer_phone,customer_address,items_json,total,mpesa_code) VALUES(%s,%s,%s,%s,%s,%s,%s)",
            (ref, d["name"].strip(), d["phone"].strip(), d["address"].strip(),
             json.dumps(items), total, d["mpesa_code"].strip())
        )
        return jsonify({"success": True, "ref": ref, "total": total})
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return jsonify({"error": "database error"}), 500

@app.route("/api/orders")
@admin_required
def api_orders():
    try:
        orders = db_all("SELECT * FROM orders ORDER BY id DESC")
        return jsonify(orders)
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return jsonify([])

@app.route("/api/orders/<ref>/status", methods=["POST"])
@admin_required
def api_update_status(ref):
    d = request.get_json() or {}
    status = d.get("status")
    if status not in ["pending", "paid", "packed", "delivered"]:
        return jsonify({"error": "Invalid status"}), 400
    try:
        db_run("UPDATE orders SET status=%s WHERE ref=%s", (status, ref))
        return jsonify({"success": True})
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return jsonify({"error": "database error"}), 500

@app.route("/api/stats")
def api_stats():
    try:
        products = db_one("SELECT COUNT(*) as c FROM products")["c"]
        orders   = db_one("SELECT COUNT(*) as c FROM orders")["c"]
        return jsonify({"products": products, "orders": orders})
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return jsonify({"products": 0, "orders": 0})

# ══════════════════════════════════════════════════════════
#  M-PESA CALLBACK
# ══════════════════════════════════════════════════════════

@app.route("/mpesa/callback", methods=["POST"])
def mpesa_callback():
    raw = request.get_json(force=True, silent=True) or {}
    try:
        stk = raw["Body"]["stkCallback"]
        cid = stk.get("CheckoutRequestID")
        if stk.get("ResultCode") == 0:
            meta    = {i["Name"]: i.get("Value") for i in stk["CallbackMetadata"]["Item"]}
            receipt = meta.get("MpesaReceiptNumber")
            db_run("UPDATE orders SET status='paid',mpesa_receipt=%s,paid_at=NOW() WHERE checkout_req_id=%s",
                   (receipt, cid))
    except Exception as e:
        print(f"[CALLBACK ERROR] {e}")
    return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200

# ══════════════════════════════════════════════════════════
#  FRONTEND
# ══════════════════════════════════════════════════════════

_INDEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")

@app.route("/")
def index():
    if os.path.exists(_INDEX):
        return Response(open(_INDEX).read(), mimetype="text/html")
    return "<h1>index.html not found. Please upload it to GitHub.</h1>", 404

_ADMIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "admin.html")

@app.route("/admin")
def admin_panel():
    if os.path.exists(_ADMIN):
        return Response(open(_ADMIN).read(), mimetype="text/html")
    return "<h1>admin.html not found. Please upload it to GitHub.</h1>", 404

# ══════════════════════════════════════════════════════════
#  STARTUP
# ══════════════════════════════════════════════════════════

if DATABASE_URL:
    try:
        init_db()
        print("[DB] ✅ Tables ready")
    except Exception as e:
        print(f"[DB] ❌ Error: {e}")
else:
    print("[DB] ⚠️  DATABASE_URL not set — add it in Render environment variables")

if __name__ == "__main__":
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400 * 7  # 7 days
    
    port = int(os.environ.get("PORT", 5000))
    print(f"[APP] Starting on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
