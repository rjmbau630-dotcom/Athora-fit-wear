"""
╔══════════════════════════════════════════════════════════╗
║            ATHORA FIT WEAR — athora.py                   ║
║      Flask + PostgreSQL (Supabase) + Full Frontend       ║
╚══════════════════════════════════════════════════════════╝
"""

# ══════════════════════════════════════════════════════════
#  CONFIG
# ══════════════════════════════════════════════════════════

ADMIN_PIN      = "Ryan mkuu"
FLASK_SECRET   = "athora-fit-secret-2025"
ADMIN_PHONE    = "254724357210"
MPESA_SHORTCODE       = "516600"
MPESA_CONSUMER_KEY    = "YOUR_CONSUMER_KEY"
MPESA_CONSUMER_SECRET = "YOUR_CONSUMER_SECRET"
MPESA_PASSKEY         = "YOUR_PASSKEY"
MPESA_CALLBACK_URL    = "https://athorafit.shop/mpesa/callback"
MPESA_ENV             = "sandbox"

# ══════════════════════════════════════════════════════════
#  IMPORTS
# ══════════════════════════════════════════════════════════

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
#  FLASK APP
# ══════════════════════════════════════════════════════════

app = Flask(__name__)
app.secret_key = FLASK_SECRET

# ══════════════════════════════════════════════════════════
#  DATABASE (PostgreSQL via Supabase)
# ══════════════════════════════════════════════════════════

DATABASE_URL = os.environ.get("DATABASE_URL", "")

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
                description  TEXT,
                price        REAL    NOT NULL,
                sizes        TEXT    DEFAULT 'One Size',
                image_b64    TEXT,
                out_of_stock INTEGER DEFAULT 0,
                created_at   TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS orders (
                id               SERIAL PRIMARY KEY,
                ref              TEXT    UNIQUE NOT NULL,
                customer_name    TEXT    NOT NULL,
                customer_phone   TEXT    NOT NULL,
                customer_address TEXT    NOT NULL,
                items_json       TEXT    NOT NULL,
                total            REAL    NOT NULL,
                status           TEXT    DEFAULT 'pending',
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
                return r[0] if r else None
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
#  AUTH ROUTES
# ══════════════════════════════════════════════════════════

@app.route("/admin/login", methods=["POST"])
def admin_login():
    if (request.get_json() or {}).get("pin") == ADMIN_PIN:
        session["admin"] = True
        return jsonify({"success": True})
    return jsonify({"success": False}), 401

@app.route("/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("admin", None)
    return jsonify({"success": True})

# ══════════════════════════════════════════════════════════
#  PRODUCT ROUTES
# ══════════════════════════════════════════════════════════

@app.route("/api/products")
def api_products():
    rows = db_all("SELECT * FROM products ORDER BY id DESC")
    return jsonify(rows)

@app.route("/api/products", methods=["POST"])
@admin_required
def api_add_product():
    d = request.get_json() or {}
    if not d.get("name") or not d.get("price"):
        return jsonify({"error": "name and price required"}), 400
    pid = db_run(
        "INSERT INTO products(name,category,description,price,sizes,image_b64) VALUES(%s,%s,%s,%s,%s,%s) RETURNING id",
        (d["name"].strip(), d.get("category","General"), d.get("description",""),
         float(d["price"]), d.get("sizes","One Size"), d.get("image_b64"))
    )
    return jsonify({"success": True, "id": pid}), 201

@app.route("/api/products/<int:pid>", methods=["DELETE"])
@admin_required
def api_delete_product(pid):
    db_run("DELETE FROM products WHERE id=%s", (pid,))
    return jsonify({"success": True})

@app.route("/api/products/<int:pid>/stock", methods=["POST"])
@admin_required
def api_toggle_stock(pid):
    p = db_one("SELECT out_of_stock FROM products WHERE id=%s", (pid,))
    if not p: return jsonify({"error": "Not found"}), 404
    new_val = 0 if p["out_of_stock"] else 1
    db_run("UPDATE products SET out_of_stock=%s WHERE id=%s", (new_val, pid))
    return jsonify({"success": True, "out_of_stock": new_val})

# ══════════════════════════════════════════════════════════
#  ORDER ROUTES
# ══════════════════════════════════════════════════════════

@app.route("/api/checkout", methods=["POST"])
def api_checkout():
    d = request.get_json() or {}
    for f in ["name", "phone", "address", "cart", "mpesa_code"]:
        if not d.get(f):
            return jsonify({"error": f"'{f}' is required"}), 400
    total, items = 0, []
    for entry in d["cart"]:
        pid = entry.get("id") if isinstance(entry, dict) else entry
        p = db_one("SELECT * FROM products WHERE id=%s", (pid,))
        if not p: return jsonify({"error": f"Product {pid} not found"}), 404
        total += p["price"]
        items.append({
            "id": p["id"], "name": p["name"], "price": p["price"],
            "size": entry.get("size","") if isinstance(entry, dict) else "",
            "category": p["category"]
        })
    ref = make_ref()
    db_run(
        "INSERT INTO orders(ref,customer_name,customer_phone,customer_address,items_json,total,mpesa_code) VALUES(%s,%s,%s,%s,%s,%s,%s)",
        (ref, d["name"].strip(), d["phone"].strip(), d["address"].strip(),
         json.dumps(items), total, d["mpesa_code"].strip())
    )
    return jsonify({"success": True, "ref": ref, "total": total})

@app.route("/api/orders")
@admin_required
def api_orders():
    return jsonify(db_all("SELECT * FROM orders ORDER BY id DESC"))

@app.route("/api/orders/<ref>/status", methods=["POST"])
@admin_required
def api_update_status(ref):
    d = request.get_json() or {}
    status = d.get("status")
    if status not in ["pending","paid","packed","delivered"]:
        return jsonify({"error": "Invalid status"}), 400
    db_run("UPDATE orders SET status=%s WHERE ref=%s", (status, ref))
    return jsonify({"success": True})

@app.route("/api/stats")
def api_stats():
    total_products = db_one("SELECT COUNT(*) as c FROM products")["c"]
    total_orders   = db_one("SELECT COUNT(*) as c FROM orders")["c"]
    return jsonify({"products": total_products, "orders": total_orders})

@app.route("/mpesa/callback", methods=["POST"])
def mpesa_callback():
    raw = request.get_json(force=True, silent=True) or {}
    try:
        stk  = raw["Body"]["stkCallback"]
        cid  = stk.get("CheckoutRequestID")
        if stk.get("ResultCode") == 0:
            items = {i["Name"]: i.get("Value") for i in stk["CallbackMetadata"]["Item"]}
            receipt = items.get("MpesaReceiptNumber")
            db_run("UPDATE orders SET status='paid',mpesa_receipt=%s,paid_at=NOW() WHERE checkout_req_id=%s", (receipt, cid))
    except Exception as e:
        print(f"[CALLBACK ERROR] {e}")
    return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200

# ══════════════════════════════════════════════════════════
#  SERVE FRONTEND
# ══════════════════════════════════════════════════════════

_INDEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
_HTML  = open(_INDEX).read() if os.path.exists(_INDEX) else "<h1>index.html not found</h1>"

@app.route("/")
def index():
    return Response(_HTML, mimetype="text/html")

# ══════════════════════════════════════════════════════════
#  INIT DB + START
# ══════════════════════════════════════════════════════════

# Run init_db only if DATABASE_URL is set (safe for gunicorn)
if DATABASE_URL:
    try:
        init_db()
        print("[DB] Tables ready")
    except Exception as e:
        print(f"[DB ERROR] {e}")
else:
    print("[DB] WARNING: DATABASE_URL not set — set it in Render environment variables")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Athora Fit Wear on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
