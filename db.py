"""
ATHORA FIT WEAR — db.py
Shared DB access layer.

This is the same get_db()/q_all()/q_one()/q_run() that used to live
directly inside athora.py, pulled out unchanged so notifications.py can
use it too without athora.py and notifications.py importing each other.
Behavior is identical — athora.py now does `from db import ...` instead
of defining these itself.
"""
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def get_db():
    import psycopg2
    from psycopg2.extras import RealDictCursor
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, connect_timeout=10)


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
            except Exception:
                return None
