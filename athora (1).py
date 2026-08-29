"""
ATHORA FIT WEAR — athora.py
Flask + PostgreSQL + Order Tracking
"""
import os, json, secrets, base64, logging
from datetime import datetime
from flask import Flask, request, session, jsonify, Response, send_from_directory
import requests as http

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("athora")

# ── CONFIG ───────────────────────────────────────────────
ADMIN_PIN = os.environ.get("ADMIN_PIN")
FLASK_SECRET = os.environ.get("FLASK_SECRET")
DATABASE_URL          = os.environ.get("DATABASE_URL", "")

# M-Pesa Daraja
MPESA_ENV             = os.environ.get("MPESA_ENV", "production")
MPESA_CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY")
MPESA_CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET")
MPESA_PASSKEY = os.environ.get("MPESA_PASSKEY")
MPESA_SHORTCODE       = os.environ.get("MPESA_SHORTCODE",       "4327609")
MPESA_CALLBACK_URL    = os.environ.get("MPESA_CALLBACK_URL",    "https://athora-fit-wear.onrender.com/mpesa/callback")
MPESA_BASE = "https://api.safaricom.co.ke" if MPESA_ENV == "production" else "https://production.safaricom.co.ke"

# Supabase — for realtime notifications
SUPABASE_URL          = os.environ.get("SUPABASE_URL",      "")
SUPABASE_ANON_KEY     = os.environ.get("SUPABASE_ANON_KEY", "")

# ── APP ──────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = FLASK_SECRET

# ── DATABASE ─────────────────────────────────────────────
def get_db():
    import psycopg2
    from psycopg2.extras import RealDictCursor
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, connect_timeout=10)

def init_db():
    with get_db() as conn:
        with conn.cursor() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id           SERIAL PRIMARY KEY,
                    name         TEXT NOT NULL,
                    category     TEXT NOT NULL DEFAULT 'General',
                    description  TEXT DEFAULT '',
                    price        REAL NOT NULL,
                    sizes        TEXT DEFAULT 'One Size',
                    image_b64    TEXT,
                    out_of_stock INTEGER DEFAULT 0,
                    created_at   TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS orders (
                    id                  SERIAL PRIMARY KEY,
                    order_ref           TEXT UNIQUE NOT NULL,
                    customer_name       TEXT NOT NULL,
                    customer_phone      TEXT NOT NULL,
                    delivery_address    TEXT NOT NULL,
                    items_json          TEXT NOT NULL DEFAULT '[]',
                    subtotal            REAL NOT NULL DEFAULT 0,
                    delivery_cost       REAL NOT NULL DEFAULT 0,
                    total               REAL NOT NULL DEFAULT 0,
                    status              TEXT DEFAULT 'pending',
                    payment_method      TEXT DEFAULT 'mpesa',
                    mpesa_phone         TEXT DEFAULT '',
                    checkout_request_id TEXT DEFAULT '',
                    mpesa_receipt       TEXT DEFAULT '',
                    created_at          TIMESTAMP DEFAULT NOW(),
                    paid_at             TIMESTAMP
                );
            """)
        conn.commit()
    log.info("[DB] ✅ Tables ready")

def q_all(sql, p=()):
    with get_db() as conn:
        with conn.cursor() as c:
            c.execute(sql, p)
            return [dict(r) for r in c.fetchall()]

def q_one(sql, p=()):
    with get_db() as conn:
        with conn.cursor() as c:
            c.execute(sql, p)
            r = c.fetchone()
            return dict(r) if r else None

def q_run(sql, p=()):
    with get_db() as conn:
        with conn.cursor() as c:
            c.execute(sql, p)
            conn.commit()
            try:
                r = c.fetchone()
                return list(r.values())[0] if r else None
            except:
                return None

# ── HELPERS ──────────────────────────────────────────────
def make_ref():
    return "ATH-" + secrets.token_urlsafe(5).upper()[:6]

def fmt_phone(p):
    p = "".join(filter(str.isdigit, str(p)))
    if p.startswith("0") and len(p) == 10:
        p = "254" + p[1:]
    return p if p.startswith("254") and len(p) == 12 else None

def admin_req(f):
    from functools import wraps
    @wraps(f)
    def w(*a, **k):
        if not session.get("admin"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*a, **k)
    return w

# ── M-PESA ───────────────────────────────────────────────
def mpesa_token():
    creds = base64.b64encode(f"{MPESA_CONSUMER_KEY}:{MPESA_CONSUMER_SECRET}".encode()).decode()
    r = http.get(
        f"{MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials",
        headers={"Authorization": f"Basic {creds}"},
        timeout=15
    )
    r.raise_for_status()
    return r.json()["access_token"]

def mpesa_stk_push(phone, amount, ref):
    phone = fmt_phone(phone)
    if not phone:
        return False, None, "Invalid phone number"
    try:
        ts  = datetime.now().strftime("%Y%m%d%H%M%S")
        pwd = base64.b64encode(f"{MPESA_SHORTCODE}{MPESA_PASSKEY}{ts}".encode()).decode()
        token = mpesa_token()
        payload = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password":          pwd,
            "Timestamp":         ts,
            "TransactionType":   "CustomerPayBillOnline",
            "Amount":            int(amount),
            "PartyA":            phone,
            "PartyB":            MPESA_SHORTCODE,
            "PhoneNumber":       phone,
            "CallBackURL":       MPESA_CALLBACK_URL,
            "AccountReference":  ref,
            "TransactionDesc":   "AthoraFitWear"
        }
        r = http.post(
            f"{MPESA_BASE}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=20
        )
        data = r.json()
        log.info(f"[STK] {data}")
        if data.get("ResponseCode") == "0":
            return True, data.get("CheckoutRequestID"), "STK push sent"
        return False, None, data.get("errorMessage") or data.get("ResponseDescription", "STK failed")
    except Exception as e:
        log.error(f"[STK ERROR] {e}")
        return False, None, str(e)

# ── AUTH ─────────────────────────────────────────────────
@app.route("/admin/login", methods=["POST"])
def admin_login():
    if (request.get_json() or {}).get("pin") == ADMIN_PIN:
        session["admin"] = True
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Wrong PIN"}), 401

@app.route("/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("admin", None)
    return jsonify({"success": True})

# ── PRODUCTS ─────────────────────────────────────────────
@app.route("/api/products")
def get_products():
    try:
        return jsonify(q_all("SELECT * FROM products ORDER BY id DESC"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products", methods=["POST"])
@admin_req
def add_product():
    d = request.get_json() or {}
    if not d.get("name") or not d.get("price"):
        return jsonify({"error": "name and price required"}), 400
    try:
        pid = q_run(
            "INSERT INTO products(name,category,description,price,sizes,image_b64) VALUES(%s,%s,%s,%s,%s,%s) RETURNING id",
            (d["name"].strip(), d.get("category","General"), d.get("description",""),
             float(d["price"]), d.get("sizes","One Size"), d.get("image_b64"))
        )
        return jsonify({"success": True, "id": pid}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<int:pid>", methods=["DELETE"])
@admin_req
def delete_product(pid):
    try:
        q_run("DELETE FROM products WHERE id=%s", (pid,))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<int:pid>/stock", methods=["POST"])
@admin_req
def toggle_stock(pid):
    try:
        p = q_one("SELECT out_of_stock FROM products WHERE id=%s", (pid,))
        if not p: return jsonify({"error": "Not found"}), 404
        new = 0 if p["out_of_stock"] else 1
        q_run("UPDATE products SET out_of_stock=%s WHERE id=%s", (new, pid))
        return jsonify({"success": True, "out_of_stock": new})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── CHECKOUT ─────────────────────────────────────────────
@app.route("/api/checkout", methods=["POST"])
def checkout():
    d = request.get_json() or {}

    # Only require name, phone, address, cart — no mpesa code
    for f in ["name", "phone", "address", "cart"]:
        if not d.get(f):
            return jsonify({"error": f"'{f}' is required"}), 400

    try:
        # Build items from DB — never trust client prices
        subtotal, items = 0, []
        for entry in d["cart"]:
            pid = entry.get("id") if isinstance(entry, dict) else entry
            p = q_one("SELECT * FROM products WHERE id=%s", (pid,))
            if not p:
                return jsonify({"error": f"Product {pid} not found"}), 404
            subtotal += p["price"]
            items.append({
                "id":       p["id"],
                "name":     p["name"],
                "price":    p["price"],
                "size":     entry.get("size","") if isinstance(entry, dict) else "",
                "category": p["category"]
            })

        delivery_cost = 0  # Free delivery threshold handled on frontend
        total = subtotal + delivery_cost
        order_ref = make_ref()
        phone = d["phone"].strip()

        # Save order immediately as pending
        q_run(
            """INSERT INTO orders
               (order_ref, customer_name, customer_phone, delivery_address,
                items_json, subtotal, delivery_cost, total, mpesa_phone)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (order_ref, d["name"].strip(), phone, d["address"].strip(),
             json.dumps(items), subtotal, delivery_cost, total, phone)
        )

        log.info(f"[ORDER] {order_ref} saved | KES {total} | {d['name']}")

        # Fire STK push
        stk_ok, checkout_id, stk_msg = mpesa_stk_push(phone, total, order_ref)

        if stk_ok:
            q_run(
                "UPDATE orders SET checkout_request_id=%s WHERE order_ref=%s",
                (checkout_id, order_ref)
            )
            return jsonify({
                "success":     True,
                "order_ref":   order_ref,
                "total":       total,
                "checkout_id": checkout_id,
                "message":     "Order saved! M-Pesa PIN prompt sent to your phone."
            })
        else:
            # Order is saved — STK failed but customer can still pay manually
            log.warning(f"[STK FAILED] {order_ref}: {stk_msg}")
            return jsonify({
                "success":   True,
                "order_ref": order_ref,
                "total":     total,
                "stk_error": stk_msg,
                "message":   "Order saved! STK push failed — please pay via M-Pesa Paybill 516600, Acc 947458 and quote your ref."
            })

    except Exception as e:
        log.error(f"[CHECKOUT ERROR] {e}")
        return jsonify({"error": str(e)}), 500

# ── MPESA CALLBACK ───────────────────────────────────────
@app.route("/mpesa/callback", methods=["POST"])
def mpesa_callback():
    data = request.get_json(force=True, silent=True) or {}
    log.info(f"[CALLBACK] {json.dumps(data)[:400]}")
    try:
        stk  = data["Body"]["stkCallback"]
        cid  = stk.get("CheckoutRequestID")
        code = stk.get("ResultCode")

        if code == 0:
            meta    = {i["Name"]: i.get("Value") for i in stk["CallbackMetadata"]["Item"]}
            receipt = meta.get("MpesaReceiptNumber", "")
            amount  = meta.get("Amount", 0)
            q_run(
                "UPDATE orders SET status='paid', mpesa_receipt=%s, paid_at=NOW() WHERE checkout_request_id=%s",
                (receipt, cid)
            )
            log.info(f"[PAID] CID={cid} Receipt={receipt} KES={amount}")
        else:
            desc = stk.get("ResultDesc","")
            q_run(
                "UPDATE orders SET status='cancelled' WHERE checkout_request_id=%s",
                (cid,)
            )
            log.warning(f"[CANCELLED] CID={cid} Reason={desc}")

    except Exception as e:
        log.error(f"[CALLBACK ERROR] {e}")

    return jsonify({"ResultCode": 0, "ResultDescription": "Success"}), 200

# ── ORDER STATUS POLLING ─────────────────────────────────
@app.route("/api/order-status/<ref>")
def order_status(ref):
    try:
        o = q_one(
            "SELECT order_ref, status, mpesa_receipt, total, paid_at, created_at FROM orders WHERE order_ref=%s",
            (ref,)
        )
        if not o:
            return jsonify({"error": "Order not found"}), 404
        return jsonify(o)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── CUSTOMER ORDER TRACKING ──────────────────────────────
@app.route("/api/track/<ref>")
def track_order(ref):
    try:
        o = q_one(
            """SELECT order_ref, customer_name, delivery_address,
                      items_json, total, status, created_at, paid_at, mpesa_receipt
               FROM orders WHERE order_ref=%s""",
            (ref.upper(),)
        )
        if not o:
            return jsonify({"error": "Order not found. Check your reference number."}), 404
        o["items"] = json.loads(o.get("items_json","[]"))
        return jsonify(o)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── ADMIN ORDERS ─────────────────────────────────────────
@app.route("/api/orders")
@admin_req
def get_orders():
    try:
        rows = q_all(
            """SELECT id, order_ref, customer_name, customer_phone,
                      delivery_address, items_json, total, status,
                      mpesa_receipt, mpesa_phone, created_at, paid_at
               FROM orders ORDER BY id DESC"""
        )
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/orders/<ref>/status", methods=["POST"])
@admin_req
def update_order_status(ref):
    d = request.get_json() or {}
    status = d.get("status")
    if status not in ["pending","paid","packed","delivered","cancelled"]:
        return jsonify({"error": "Invalid status"}), 400
    try:
        q_run("UPDATE orders SET status=%s WHERE order_ref=%s", (status, ref))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── STATS ────────────────────────────────────────────────
@app.route("/api/stats")
def stats():
    try:
        prods = q_one("SELECT COUNT(*) as c FROM products")["c"]
        ords  = q_one("SELECT COUNT(*) as c FROM orders")["c"]
        return jsonify({"products": prods, "orders": ords})
    except Exception as e:
        return jsonify({"products": 0, "orders": 0, "error": str(e)})

# ── REALTIME CONFIG (serves supabase keys to admin) ─────
@app.route("/api/realtime-config")
@admin_req
def realtime_config():
    return jsonify({
        "url": SUPABASE_URL,
        "key": SUPABASE_ANON_KEY,
        "available": bool(SUPABASE_URL and SUPABASE_ANON_KEY)
    })

# ── HEALTH ───────────────────────────────────────────────
@app.route("/health")
def health():
    try:
        q_one("SELECT 1 as ok")
        return jsonify({"status": "ok", "db": "connected", "mpesa_env": MPESA_ENV})
    except Exception as e:
        return jsonify({"status": "error", "db": str(e)}), 500

# ── FRONTEND ─────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))

@app.route("/")
def index():
    f = os.path.join(BASE, "index.html")
    return Response(open(f).read(), mimetype="text/html") if os.path.exists(f) else ("index.html not found", 404)

@app.route("/admin")
def admin_page():
    f = os.path.join(BASE, "admin.html")
    return Response(open(f).read(), mimetype="text/html") if os.path.exists(f) else ("admin.html not found", 404)

# ── FAVICON / PWA ASSETS ─────────────────────────────────
# Served explicitly (no static/ folder in this project, and no
# catch-all route — each file gets its own exact route so this
# can never shadow /api/... or any other existing endpoint) so
# browsers and the manifest can actually resolve the Athora
# A+swoosh icon instead of 404ing on the old /static/... paths.
def _serve_root_asset(fname):
    return send_from_directory(BASE, fname, max_age=86400) if os.path.exists(os.path.join(BASE, fname)) else ("Not found", 404)

@app.route("/favicon.ico")
def favicon_ico(): return _serve_root_asset("favicon.ico")

@app.route("/favicon-16x16.png")
def favicon_16(): return _serve_root_asset("favicon-16x16.png")

@app.route("/favicon-32x32.png")
def favicon_32(): return _serve_root_asset("favicon-32x32.png")

@app.route("/apple-touch-icon.png")
def apple_touch_icon(): return _serve_root_asset("apple-touch-icon.png")

@app.route("/android-chrome-192x192.png")
def android_chrome_192(): return _serve_root_asset("android-chrome-192x192.png")

@app.route("/android-chrome-512x512.png")
def android_chrome_512(): return _serve_root_asset("android-chrome-512x512.png")

@app.route("/site.webmanifest")
def site_webmanifest(): return _serve_root_asset("site.webmanifest")

# ── STARTUP ──────────────────────────────────────────────
if DATABASE_URL:
    try:
        init_db()
    except Exception as e:
        print(f"[DB] ❌ {e}")
else:
    print("[DB] ⚠  DATABASE_URL not set in environment")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[APP] Running → http://localhost:{port}")
    print(f"[MPESA] {MPESA_ENV} | Shortcode: {MPESA_SHORTCODE}")
    app.run(host="0.0.0.0", port=port, debug=False)
