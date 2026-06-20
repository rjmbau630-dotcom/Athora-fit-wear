"""
ATHORA FIT WEAR — athora.py
Flask + PostgreSQL (Supabase) + M-Pesa
"""
import os, json, secrets
from flask import Flask, request, session, jsonify, Response

# ── CONFIG ──────────────────────────────────────────────
ADMIN_PIN    = "Ryan mkuu"
FLASK_SECRET = "athora-secret-2025-x9k"
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# ── APP ──────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = FLASK_SECRET

# ── DATABASE ─────────────────────────────────────────────
def get_db():
    import psycopg2
    from psycopg2.extras import RealDictCursor
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, connect_timeout=10)
    conn.autocommit = False
    return conn

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
                    id               SERIAL PRIMARY KEY,
                    ref              TEXT UNIQUE NOT NULL,
                    customer_name    TEXT NOT NULL,
                    customer_phone   TEXT NOT NULL,
                    customer_address TEXT NOT NULL,
                    items_json       TEXT NOT NULL DEFAULT '[]',
                    total            REAL NOT NULL DEFAULT 0,
                    status           TEXT DEFAULT 'pending',
                    mpesa_code       TEXT DEFAULT '',
                    mpesa_receipt    TEXT DEFAULT '',
                    created_at       TIMESTAMP DEFAULT NOW(),
                    paid_at          TIMESTAMP
                );
            """)
        conn.commit()
    print("[DB] ✅ Ready")

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
            except: return None

# ── HELPERS ──────────────────────────────────────────────
def make_ref():
    return "ATH-" + secrets.token_urlsafe(4).upper()[:6]

def admin_req(f):
    from functools import wraps
    @wraps(f)
    def w(*a, **k):
        if not session.get("admin"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*a, **k)
    return w

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

# ── ORDERS ───────────────────────────────────────────────
c@app.route("/api/checkout", methods=["POST"])
def checkout():
    d = request.get_json() or {}
    mpesa_code = d.get("mpesa_code") or d.get("mpesa")

    for f in ["name", "phone", "address", "cart"]:
        if not d.get(f):
            return jsonify({"error": f"'{f}' is required"}), 400

    if not mpesa_code:
        return jsonify({"error": "'mpesa_code' is required"}), 400
    try:
        total, items = 0, []
        for entry in d["cart"]:
            pid = entry.get("id") if isinstance(entry, dict) else entry
            p = q_one("SELECT * FROM products WHERE id=%s", (pid,))
            if not p: return jsonify({"error": f"Product {pid} not found"}), 404
            total += p["price"]
            items.append({"id": p["id"], "name": p["name"], "price": p["price"],
                          "size": entry.get("size","") if isinstance(entry,dict) else "", "category": p["category"]})
        ref = make_ref()
        q_run(
            q_run(
    """
    INSERT INTO orders (
        customer_name,
        customer_phone,
        delivery_address,
        payment_method,
        mpesa_phone,
        subtotal,
        delivery_cost,
        total,
        status
    )
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """,
    (
        d["name"].strip(),
        d["phone"].strip(),
        d["address"].strip(),
        "mpesa",
        d["phone"].strip(),   # or another phone field
        total,
        0,                    # delivery_cost
        total,
        "pending"
    )
)
    (ref, d["name"].strip(), d["phone"].strip(), d["address"].strip(),
     json.dumps(items), total, mpesa_code.strip())
)
        )
        return jsonify({"success": True, "ref": ref, "total": total})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/orders")
@admin_req
def get_orders():
    try:
        return jsonify(q_all("SELECT * FROM orders ORDER BY id DESC"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/orders/<ref>/status", methods=["POST"])
@admin_req
def update_status(ref):
    d = request.get_json() or {}
    status = d.get("status")
    if status not in ["pending","paid","packed","delivered"]:
        return jsonify({"error": "Invalid status"}), 400
    try:
        q_run("UPDATE orders SET status=%s WHERE ref=%s", (status, ref))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/stats")
def stats():
    try:
        prods  = q_one("SELECT COUNT(*) as c FROM products")["c"]
        ords   = q_one("SELECT COUNT(*) as c FROM orders")["c"]
        return jsonify({"products": prods, "orders": ords})
    except Exception as e:
        return jsonify({"products": 0, "orders": 0, "error": str(e)})

# ── HEALTH CHECK ─────────────────────────────────────────
@app.route("/health")
def health():
    try:
        q_one("SELECT 1 as ok")
        return jsonify({"status": "ok", "db": "connected"})
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

# ── STARTUP ──────────────────────────────────────────────
if DATABASE_URL:
    try:
        init_db()
    except Exception as e:
        print(f"[DB] ❌ {e}")
        print("[DB] ⚠  App will start but DB calls will fail until DATABASE_URL is correct")
else:
    print("[DB] ⚠  DATABASE_URL not set — add it in Render > Environment")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[APP] http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
