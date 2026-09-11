"""
ATHORA FIT WEAR — notifications.py
Reusable customer notification / SMS service.

    Order status change -> notification event -> SMS service -> SMS
    provider API -> customer phone

The rest of the app (athora.py) only ever calls notify_order_event().
It never talks to an SMS provider directly. To switch providers later,
add a new SMSProvider subclass below and point get_provider() at it —
athora.py, the checkout flow and the admin dashboard do not change.

Env vars (only read here):
    SMS_PROVIDER   "africastalking" (default) — which provider to use
    SMS_API_KEY    provider API key
    SMS_USERNAME   provider account username (Africa's Talking requires this)
    SMS_SENDER_ID  optional alphanumeric sender / shortcode

If SMS_API_KEY / SMS_USERNAME are missing, every send is recorded as a
clean, honest "failed" notification (reason: not configured) instead of
silently doing nothing or crashing the order flow.
"""
import os
import re
import logging
import requests as http

import db

log = logging.getLogger("athora.notifications")

SMS_PROVIDER  = os.environ.get("SMS_PROVIDER", "africastalking").lower()
SMS_API_KEY   = os.environ.get("SMS_API_KEY")
SMS_USERNAME  = os.environ.get("SMS_USERNAME")
SMS_SENDER_ID = os.environ.get("SMS_SENDER_ID")

BRAND = "ATHORA FIT WEAR"


# ── PHONE NORMALIZATION ──────────────────────────────────────────
def normalize_kenyan_phone(raw):
    """
    Accepts 0712345678 / +254712345678 / 254712345678 (with or without
    spaces/dashes) and returns E.164 '+2547XXXXXXXX' / '+2541XXXXXXXX'.
    Returns None for anything that doesn't look like a valid Kenyan
    mobile number. Never raises.
    """
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw))
    if digits.startswith("254") and len(digits) == 12:
        return "+" + digits
    if digits.startswith("0") and len(digits) == 10:
        return "+254" + digits[1:]
    if len(digits) == 9 and digits[0] in ("7", "1"):
        return "+254" + digits
    return None


def mask_phone(phone):
    """For logs only — never log a full customer phone number."""
    if not phone or len(phone) < 4:
        return "****"
    return "*" * (len(phone) - 4) + phone[-4:]


# ── PROVIDER INTERFACE (swap here to change providers) ───────────
class SMSProvider:
    def send(self, phone, message):
        """Must return (success: bool, provider_message_id: str|None, error: str|None)."""
        raise NotImplementedError


class AfricasTalkingProvider(SMSProvider):
    """
    Recommended default for Kenya: local delivery routes, Kenyan
    alphanumeric sender ID support, simple REST API (no extra SDK
    dependency needed — this project already depends on `requests`).
    """
    ENDPOINT = "https://api.africastalking.com/version1/messaging"

    def __init__(self, username, api_key, sender_id=None):
        self.username = username
        self.api_key = api_key
        self.sender_id = sender_id

    def send(self, phone, message):
        try:
            payload = {"username": self.username, "to": phone, "message": message}
            if self.sender_id:
                payload["from"] = self.sender_id
            r = http.post(
                self.ENDPOINT,
                data=payload,
                headers={
                    "apiKey": self.api_key,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                },
                timeout=15,
            )
            data = r.json()
            recipients = (data.get("SMSMessageData") or {}).get("Recipients") or []
            if recipients:
                rec = recipients[0]
                if str(rec.get("status", "")).lower() == "success":
                    return True, rec.get("messageId"), None
                return False, rec.get("messageId"), rec.get("status") or "Provider rejected message"
            return False, None, (data.get("SMSMessageData") or {}).get("Message", "Unknown provider response")
        except Exception as e:
            return False, None, str(e)


class NullProvider(SMSProvider):
    """
    Used automatically whenever SMS_API_KEY / SMS_USERNAME aren't set.
    Never sends, never raises — records a clear, honest failure so the
    admin dashboard shows "Failed: SMS provider not configured" instead
    of a silent no-op or a crashed order.
    """
    def send(self, phone, message):
        log.warning(f"[SMS-NOOP] no SMS provider configured — not sent to {mask_phone(phone)}")
        return False, None, "SMS provider not configured"


def get_provider():
    if SMS_PROVIDER == "africastalking" and SMS_API_KEY and SMS_USERNAME:
        return AfricasTalkingProvider(SMS_USERNAME, SMS_API_KEY, SMS_SENDER_ID)
    return NullProvider()


def send_sms(phone_number, message):
    """
    The one function anything in this app should call to send an SMS.
    Normalizes the phone number, delegates to whichever provider is
    configured, and never raises — callers get a dict back either way.
    """
    phone = normalize_kenyan_phone(phone_number)
    if not phone:
        return {"success": False, "provider_message_id": None, "error": "Invalid phone number"}
    try:
        ok, msg_id, err = get_provider().send(phone, message)
        return {"success": ok, "provider_message_id": msg_id, "error": err}
    except Exception as e:
        log.error(f"[SMS ERROR] {mask_phone(phone)}: {e}")
        return {"success": False, "provider_message_id": None, "error": str(e)}


# ── MESSAGE TEMPLATES ─────────────────────────────────────────────
# Plain, text-based hierarchy (brand / title / body / order+details) —
# no emojis. The same structure is meant to be reusable later for
# WhatsApp / email, so keep wording changes centralized here.
def _fmt_amount(v):
    try:
        return f"{float(v):,.0f}"
    except Exception:
        return str(v)


def render_message(event_type, order):
    ref = order.get("order_ref", "")
    is_pickup = (order.get("delivery_method") or "doorstep") == "pickup_mtaani"
    extra = None

    if event_type == "order_confirmed":
        title = "ORDER CONFIRMED"
        body = (f"Your order has been confirmed.\n"
                f"Amount: KES {_fmt_amount(order.get('total'))}.\n"
                f"We will notify you when it is dispatched.")
        extra = "Payment: Confirmed via M-Pesa"

    elif event_type == "order_dispatched":
        title = "ORDER DISPATCHED"
        body = ("Your order has been dispatched.\n"
                "You will receive another notification when it is ready "
                "for collection or out for delivery.")

    elif event_type == "ready_for_collection":
        title = "READY FOR COLLECTION"
        loc = order.get("pickup_location") or "your selected Pickup Mtaani agent"
        body = (f"Your order is ready for collection at {loc}.\n"
                f"Please collect your package during the agent's operating hours.")
        extra = f"Pickup point: {loc}"

    elif event_type == "out_for_delivery":
        title = "OUT FOR DELIVERY"
        body = "Your order is out for delivery and will reach you shortly."
        if order.get("delivery_address"):
            extra = f"Delivery address: {order['delivery_address']}"

    elif event_type == "delivered":
        title = "ORDER COLLECTED" if is_pickup else "ORDER DELIVERED"
        verb = "collected" if is_pickup else "delivered"
        body = f"Your order has been {verb}.\nThank you for shopping with Athora Fit Wear."

    else:
        return None

    lines = [BRAND, "", title, "", body, "", f"Order: #{ref}"]
    if extra:
        lines.append(extra)
    return "\n".join(lines)


# ── ORCHESTRATION ─────────────────────────────────────────────────
# Which customer-facing notification event fires when orders.status
# changes to a given value. Add a new status -> event pair here and
# nothing else in the order flow needs to change.
STATUS_EVENT_MAP = {
    "paid":                 "order_confirmed",
    "dispatched":           "order_dispatched",
    "ready_for_collection": "ready_for_collection",
    "out_for_delivery":     "out_for_delivery",
    "delivered":            "delivered",
}


def notify_order_event(order, event_type):
    """
    order — full orders row as a dict (id, order_ref, customer_phone,
            total, delivery_method, pickup_location, delivery_address, ...).
    event_type — one of STATUS_EVENT_MAP's values.

    Idempotent: a given (order_id, notification_type) pair is only ever
    sent once, even if this is called twice for the same status change —
    the UNIQUE constraint + ON CONFLICT DO NOTHING below is what
    guarantees no duplicate SMS. Never raises: a bug or provider outage
    here must never fail the order operation that triggered it.
    """
    try:
        message = render_message(event_type, order)
        if not message:
            return None

        phone = order.get("customer_phone")

        # Claim the (order_id, notification_type) slot first. If it's
        # already claimed (e.g. this status was already set once before),
        # the INSERT returns nothing and we skip — no duplicate send.
        row_id = db.q_run(
            """INSERT INTO notifications
                 (order_id, order_ref, customer_phone, notification_type, message, status)
               VALUES (%s,%s,%s,%s,%s,'pending')
               ON CONFLICT (order_id, notification_type) DO NOTHING
               RETURNING id""",
            (order["id"], order["order_ref"], phone, event_type, message),
        )
        if row_id is None:
            log.info(f"[NOTIFY] {order.get('order_ref')} {event_type} already recorded — skipping duplicate")
            return None

        result = send_sms(phone, message)

        if result["success"]:
            db.q_run(
                "UPDATE notifications SET status='sent', sent_at=NOW(), provider_message_id=%s WHERE id=%s",
                (result["provider_message_id"], row_id),
            )
            log.info(f"[NOTIFY SENT] {order.get('order_ref')} {event_type} -> {mask_phone(phone or '')}")
        else:
            db.q_run(
                "UPDATE notifications SET status='failed', failure_reason=%s WHERE id=%s",
                (result["error"], row_id),
            )
            log.warning(f"[NOTIFY FAILED] {order.get('order_ref')} {event_type}: {result['error']}")

        return row_id

    except Exception as e:
        log.error(f"[NOTIFY EXCEPTION] {order.get('order_ref') if order else '?'} {event_type}: {e}")
        return None


def retry_notification(notification_id):
    """Re-sends a previously failed notification. Used by the admin retry button."""
    try:
        n = db.q_one("SELECT * FROM notifications WHERE id=%s", (notification_id,))
        if not n:
            return {"success": False, "error": "Notification not found"}

        result = send_sms(n["customer_phone"], n["message"])
        if result["success"]:
            db.q_run(
                "UPDATE notifications SET status='sent', sent_at=NOW(), "
                "provider_message_id=%s, failure_reason=NULL WHERE id=%s",
                (result["provider_message_id"], notification_id),
            )
        else:
            db.q_run(
                "UPDATE notifications SET status='failed', failure_reason=%s WHERE id=%s",
                (result["error"], notification_id),
            )
        return result
    except Exception as e:
        log.error(f"[RETRY EXCEPTION] notification {notification_id}: {e}")
        return {"success": False, "error": str(e)}
