"""
╔══════════════════════════════════════════════════════════╗
║            ATHORA FIT WEAR — athora.py                   ║
║         Flask + SQLite + M-Pesa + Full Frontend          ║
╠══════════════════════════════════════════════════════════╣
║  SETUP:                                                  ║
║  1. pip install flask requests gunicorn                  ║
║  2. Fill in M-Pesa credentials below (when ready)        ║
║  3. python athora.py  (local)                            ║
║     gunicorn athora:app  (on Render)                     ║
╚══════════════════════════════════════════════════════════╝
"""

# ══════════════════════════════════════════════════════════
#  CONFIG — Fill in when you're ready for live M-Pesa
# ══════════════════════════════════════════════════════════

MPESA_CONSUMER_KEY    = "YOUR_CONSUMER_KEY"
MPESA_CONSUMER_SECRET = "YOUR_CONSUMER_SECRET"
MPESA_SHORTCODE       = "516600"
MPESA_PASSKEY         = "YOUR_PASSKEY"
MPESA_CALLBACK_URL    = "https://athorafit.shop/mpesa/callback"
MPESA_ENV             = "sandbox"   # change to "production" when going live

ADMIN_PHONE           = "254724357210"
ADMIN_PIN             = "Ryan mkuu"
FLASK_SECRET          = "athora-fit-secret-2025"

FREE_DELIVERY_MIN     = 15000

# ══════════════════════════════════════════════════════════
#  IMPORTS
# ══════════════════════════════════════════════════════════

import os, json, base64, secrets, sqlite3
from datetime import datetime
from flask import Flask, request, session, jsonify, Response

try:
    import requests as req_lib
except ImportError:
    raise SystemExit("Run: pip install flask requests gunicorn")

# ══════════════════════════════════════════════════════════
#  FLASK APP
# ══════════════════════════════════════════════════════════

app = Flask(__name__)
app.secret_key = FLASK_SECRET

DB = "athora.db"

# ══════════════════════════════════════════════════════════
#  DATABASE
# ══════════════════════════════════════════════════════════

def get_conn():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    with get_conn() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS products (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name         TEXT    NOT NULL,
            category     TEXT    NOT NULL DEFAULT 'General',
            description  TEXT,
            price        REAL    NOT NULL,
            sizes        TEXT    DEFAULT 'One Size',
            image_b64    TEXT,
            out_of_stock INTEGER DEFAULT 0,
            created_at   TEXT    DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS orders (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
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
            created_at       TEXT    DEFAULT (datetime('now')),
            paid_at          TEXT
        );
        """)

def db_all(sql, params=()):
    with get_conn() as c:
        return [dict(r) for r in c.execute(sql, params).fetchall()]

def db_one(sql, params=()):
    with get_conn() as c:
        r = c.execute(sql, params).fetchone()
        return dict(r) if r else None

def db_run(sql, params=()):
    with get_conn() as c:
        return c.execute(sql, params).lastrowid

# ══════════════════════════════════════════════════════════
#  M-PESA (ready for when you activate Daraja)
# ══════════════════════════════════════════════════════════

MPESA_BASE = (
    "https://api.safaricom.co.ke"
    if MPESA_ENV == "production"
    else "https://sandbox.safaricom.co.ke"
)

def mpesa_token():
    creds = base64.b64encode(f"{MPESA_CONSUMER_KEY}:{MPESA_CONSUMER_SECRET}".encode()).decode()
    r = req_lib.get(
        f"{MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials",
        headers={"Authorization": f"Basic {creds}"}, timeout=15
    )
    r.raise_for_status()
    return r.json()["access_token"]

def mpesa_stk_push(phone, amount, ref):
    phone = _fmt_phone(phone)
    if not phone:
        return False, None, "Invalid phone number."
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
            "AccountReference":  "947458",
            "TransactionDesc":   "AthoraFitWear",
        }
        r = req_lib.post(
            f"{MPESA_BASE}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=20
        )
        data = r.json()
        if data.get("ResponseCode") == "0":
            return True, data.get("CheckoutRequestID"), "STK push sent."
        return False, None, data.get("errorMessage") or data.get("ResponseDescription", "Failed.")
    except Exception as e:
        return False, None, str(e)

def _fmt_phone(p):
    p = "".join(filter(str.isdigit, str(p)))
    if p.startswith("0") and len(p) == 10: p = "254" + p[1:]
    return p if p.startswith("254") and len(p) == 12 else None

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
        "INSERT INTO products(name,category,description,price,sizes,image_b64) VALUES(?,?,?,?,?,?)",
        (d["name"].strip(), d.get("category","General"), d.get("description",""),
         float(d["price"]), d.get("sizes","One Size"), d.get("image_b64"))
    )
    return jsonify({"success": True, "id": pid}), 201

@app.route("/api/products/<int:pid>", methods=["DELETE"])
@admin_required
def api_delete_product(pid):
    db_run("DELETE FROM products WHERE id=?", (pid,))
    return jsonify({"success": True})

@app.route("/api/products/<int:pid>/stock", methods=["POST"])
@admin_required
def api_toggle_stock(pid):
    p = db_one("SELECT out_of_stock FROM products WHERE id=?", (pid,))
    if not p: return jsonify({"error": "Not found"}), 404
    new_val = 0 if p["out_of_stock"] else 1
    db_run("UPDATE products SET out_of_stock=? WHERE id=?", (new_val, pid))
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
        p = db_one("SELECT * FROM products WHERE id=?", (pid,))
        if not p: return jsonify({"error": f"Product {pid} not found"}), 404
        total += p["price"]
        items.append({
            "id": p["id"], "name": p["name"], "price": p["price"],
            "size": entry.get("size","") if isinstance(entry, dict) else "",
            "category": p["category"]
        })

    ref = make_ref()
    db_run(
        "INSERT INTO orders(ref,customer_name,customer_phone,customer_address,items_json,total,mpesa_code) VALUES(?,?,?,?,?,?,?)",
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
    db_run("UPDATE orders SET status=? WHERE ref=?", (status, ref))
    return jsonify({"success": True})

@app.route("/api/stats")
def api_stats():
    total_products = db_one("SELECT COUNT(*) as c FROM products")["c"]
    total_orders   = db_one("SELECT COUNT(*) as c FROM orders")["c"]
    return jsonify({"products": total_products, "orders": total_orders})

# ══════════════════════════════════════════════════════════
#  M-PESA CALLBACK (for when Daraja is activated)
# ══════════════════════════════════════════════════════════

@app.route("/mpesa/callback", methods=["POST"])
def mpesa_callback():
    raw = request.get_json(force=True, silent=True) or {}
    try:
        stk  = raw["Body"]["stkCallback"]
        cid  = stk.get("CheckoutRequestID")
        code = stk.get("ResultCode")
        if code == 0:
            items = {i["Name"]: i.get("Value") for i in stk["CallbackMetadata"]["Item"]}
            receipt = items.get("MpesaReceiptNumber")
            db_run(
                "UPDATE orders SET status='paid',mpesa_receipt=?,paid_at=datetime('now') WHERE checkout_req_id=?",
                (receipt, cid)
            )
            print(f"[PAID] Receipt: {receipt}")
    except Exception as e:
        print(f"[CALLBACK ERROR] {e}")
    return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200

# ══════════════════════════════════════════════════════════
#  SERVE FRONTEND
# ══════════════════════════════════════════════════════════

@app.route("/")
def index():
    with open("index.html", "r") as f:
        return Response(f.read(), mimetype="text/html")

# ══════════════════════════════════════════════════════════
#  START
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    print(f"""
╔══════════════════════════════════════════════════════════╗
║            ATHORA FIT WEAR — Starting Up                 ║
╠══════════════════════════════════════════════════════════╣
║  Store:  http://localhost:{port}                            ║
║  Admin:  PIN = {ADMIN_PIN}                          ║
╚══════════════════════════════════════════════════════════╝
""")
    app.run(host="0.0.0.0", port=port, debug=False)
