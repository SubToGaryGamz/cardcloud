"""Iteration 7 - Stripe billing, IRS Form 8949 tax export, Pro-gating."""
import io
import os
import csv
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cardprofitlog.preview.emergentagent.com").rstrip("/")
DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo1234"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"
mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def demo_user_id(auth_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    return r.json()["user_id"]


# Ensure user is Pro for export tests; restore after
@pytest.fixture(scope="module", autouse=True)
def ensure_pro_state(demo_user_id):
    orig = db.users.find_one({"user_id": demo_user_id})
    db.users.update_one(
        {"user_id": demo_user_id},
        {"$set": {"is_pro": True, "pro_expires_at": (datetime.now(timezone.utc) + timedelta(days=31)).isoformat()}},
    )
    yield
    db.users.update_one(
        {"user_id": demo_user_id},
        {"$set": {"is_pro": orig.get("is_pro", True), "pro_expires_at": orig.get("pro_expires_at")}},
    )


# ---------- /api/billing/me ----------
class TestBillingMe:
    def test_billing_me_shape(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/billing/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "is_pro" in data
        assert "pro_expires_at" in data
        assert "packages" in data
        assert "pro_monthly" in data["packages"]
        assert data["packages"]["pro_monthly"]["amount"] == 6.00
        assert data["packages"]["pro_monthly"]["currency"] == "usd"

    def test_billing_me_unauth(self):
        r = requests.get(f"{BASE_URL}/api/billing/me", timeout=15)
        assert r.status_code == 401


# ---------- /api/billing/checkout ----------
class TestCheckout:
    def test_checkout_invalid_package(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/billing/checkout",
            json={"package_id": "evil_99", "origin_url": "https://example.com"},
            headers=auth_headers, timeout=20,
        )
        assert r.status_code == 400

    def test_checkout_valid_package_returns_url_and_session(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/billing/checkout",
            json={"package_id": "pro_monthly", "origin_url": "https://example.com"},
            headers=auth_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and data["url"].startswith("https://")
        assert "session_id" in data and len(data["session_id"]) > 0
        # Verify server stored amount=6.00 (server-driven, not client)
        txn = db.payment_transactions.find_one({"session_id": data["session_id"]})
        assert txn is not None
        assert float(txn["amount"]) == 6.00
        assert txn["currency"] == "usd"
        assert txn["package_id"] == "pro_monthly"
        assert txn["payment_status"] == "initiated"

    def test_checkout_unauth(self):
        r = requests.post(
            f"{BASE_URL}/api/billing/checkout",
            json={"package_id": "pro_monthly", "origin_url": "https://example.com"},
            timeout=15,
        )
        assert r.status_code == 401


# ---------- /api/billing/status/{session_id} ----------
class TestBillingStatus:
    def test_status_nonexistent(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/billing/status/cs_fake_{uuid.uuid4().hex}", headers=auth_headers, timeout=15)
        assert r.status_code == 404

    def test_status_initiated_session(self, auth_headers):
        # Create session, then poll
        c = requests.post(
            f"{BASE_URL}/api/billing/checkout",
            json={"package_id": "pro_monthly", "origin_url": "https://example.com"},
            headers=auth_headers, timeout=30,
        ).json()
        sid = c["session_id"]
        r = requests.get(f"{BASE_URL}/api/billing/status/{sid}", headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "payment_status" in data
        assert data["payment_status"] in ("unpaid", "paid", "open", "no_payment_required")

    def test_status_idempotent_when_paid(self, auth_headers, demo_user_id):
        # Simulate a paid txn directly in DB to test idempotency without real payment
        sid = f"cs_test_idem_{uuid.uuid4().hex}"
        db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": demo_user_id,
            "session_id": sid,
            "amount": 6.00, "currency": "usd",
            "package_id": "pro_monthly",
            "payment_status": "paid",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        try:
            r1 = requests.get(f"{BASE_URL}/api/billing/status/{sid}", headers=auth_headers, timeout=15)
            r2 = requests.get(f"{BASE_URL}/api/billing/status/{sid}", headers=auth_headers, timeout=15)
            assert r1.status_code == 200 and r2.status_code == 200
            d1 = r1.json(); d2 = r2.json()
            assert d1["payment_status"] == "paid" and d2["payment_status"] == "paid"
            assert d1.get("is_pro") is True and d2.get("is_pro") is True
        finally:
            db.payment_transactions.delete_one({"session_id": sid})


# ---------- /api/webhook/stripe ----------
class TestWebhook:
    def test_webhook_bad_sig_does_not_crash(self):
        r = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            data=b'{"type":"checkout.session.completed"}',
            headers={"Stripe-Signature": "t=1,v1=invalid", "Content-Type": "application/json"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is False

    def test_webhook_missing_sig(self):
        r = requests.post(f"{BASE_URL}/api/webhook/stripe", data=b"{}", timeout=15)
        # Should still not crash; either ok:false or 200
        assert r.status_code == 200


# ---------- Pro gating: /api/cards/export.csv & import & tax export ----------
class TestProGating:
    def _flip_pro(self, demo_user_id, is_pro):
        db.users.update_one(
            {"user_id": demo_user_id},
            {"$set": {"is_pro": is_pro,
                      "pro_expires_at": ((datetime.now(timezone.utc) + timedelta(days=31)).isoformat() if is_pro else None)}},
        )

    def test_export_csv_402_for_non_pro(self, auth_headers, demo_user_id):
        self._flip_pro(demo_user_id, False)
        try:
            r = requests.get(f"{BASE_URL}/api/cards/export.csv", headers=auth_headers, timeout=15)
            assert r.status_code == 402, f"expected 402, got {r.status_code}: {r.text[:200]}"
        finally:
            self._flip_pro(demo_user_id, True)

    def test_export_csv_200_for_pro(self, auth_headers, demo_user_id):
        self._flip_pro(demo_user_id, True)
        r = requests.get(f"{BASE_URL}/api/cards/export.csv", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("Content-Type", "")
        assert "Year,Name" in r.text

    def test_import_402_for_non_pro(self, auth_headers, demo_user_id):
        self._flip_pro(demo_user_id, False)
        try:
            csv_data = "Year,Name\n2020,TEST_I7_X\n"
            r = requests.post(
                f"{BASE_URL}/api/cards/import",
                files={"file": ("t.csv", csv_data, "text/csv")},
                headers=auth_headers, timeout=20,
            )
            assert r.status_code == 402
        finally:
            self._flip_pro(demo_user_id, True)

    def test_import_200_for_pro(self, auth_headers, demo_user_id):
        self._flip_pro(demo_user_id, True)
        csv_data = "Year,Name\n2021,TEST_I7_ImportPro\n"
        r = requests.post(
            f"{BASE_URL}/api/cards/import",
            files={"file": ("t.csv", csv_data, "text/csv")},
            headers=auth_headers, timeout=20,
        )
        assert r.status_code == 200, r.text
        assert r.json()["imported"] >= 1
        # cleanup
        db.cards.delete_many({"user_id": demo_user_id, "name": "TEST_I7_ImportPro"})

    def test_tax_export_402_for_non_pro(self, auth_headers, demo_user_id):
        self._flip_pro(demo_user_id, False)
        try:
            r = requests.get(f"{BASE_URL}/api/cards/tax/export.csv", headers=auth_headers, timeout=15)
            assert r.status_code == 402
        finally:
            self._flip_pro(demo_user_id, True)


# ---------- Tax export (8949) format ----------
class TestTaxExport:
    @pytest.fixture(autouse=True)
    def seed_tax_cards(self, demo_user_id):
        # Short-term: ~30d held; Long-term: ~400d held; Other-year for filter test
        now = datetime.now(timezone.utc)
        cards = [
            # Short-term, this year
            {"id": str(uuid.uuid4()), "user_id": demo_user_id, "year": 2023, "name": "TEST_I7_ST",
             "where_bought": "x", "price_paid": 100.0, "price_sold": 175.0, "expenses": 5.0,
             "status": "sold", "image_path": None, "images": [],
             "purchased_date": (now - timedelta(days=30)).strftime("%Y-%m-%d"),
             "sold_date": now.strftime("%Y-%m-%d"),
             "sport": "NBA", "tags": [], "condition": "PSA", "grade": 9.0,
             "created_at": now.isoformat(), "updated_at": now.isoformat()},
            # Long-term, this year
            {"id": str(uuid.uuid4()), "user_id": demo_user_id, "year": 2018, "name": "TEST_I7_LT",
             "where_bought": "y", "price_paid": 50.0, "price_sold": 500.0, "expenses": 10.0,
             "status": "sold", "image_path": None, "images": [],
             "purchased_date": (now - timedelta(days=400)).strftime("%Y-%m-%d"),
             "sold_date": now.strftime("%Y-%m-%d"),
             "sport": "MLB", "tags": [], "condition": None, "grade": None,
             "created_at": now.isoformat(), "updated_at": now.isoformat()},
            # Different year (2022)
            {"id": str(uuid.uuid4()), "user_id": demo_user_id, "year": 2015, "name": "TEST_I7_OLD",
             "where_bought": "z", "price_paid": 20.0, "price_sold": 30.0, "expenses": 0.0,
             "status": "sold", "image_path": None, "images": [],
             "purchased_date": "2021-01-01", "sold_date": "2022-06-01",
             "sport": "NFL", "tags": [], "condition": None, "grade": None,
             "created_at": now.isoformat(), "updated_at": now.isoformat()},
        ]
        db.cards.insert_many(cards)
        yield
        db.cards.delete_many({"user_id": demo_user_id, "name": {"$regex": "^TEST_I7_"}})

    def test_tax_csv_format_and_terms(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/cards/tax/export.csv", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("Content-Type", "")
        # Form 8949 columns
        text = r.text
        assert "(a) Description of property" in text
        assert "(b) Date acquired" in text
        assert "(c) Date sold or disposed" in text
        assert "(d) Proceeds" in text
        assert "(e) Cost or other basis" in text
        assert "(h) Gain or (loss)" in text
        assert "Term" in text

        rows = list(csv.reader(io.StringIO(text)))
        # Header at row 0
        body = [r for r in rows[1:] if r and r[0].startswith("20") or (r and "TEST_I7" in (r[0] or ""))]
        st = next((r for r in rows if r and "TEST_I7_ST" in (r[0] or "")), None)
        lt = next((r for r in rows if r and "TEST_I7_LT" in (r[0] or "")), None)
        assert st is not None, "Short-term row missing"
        assert lt is not None, "Long-term row missing"
        # Term column index = 8
        assert st[8] == "Short-term"
        assert lt[8] == "Long-term"
        # Date format mm/dd/yyyy on (b) and (c)
        import re
        assert re.match(r"^\d{2}/\d{2}/\d{4}$", st[1]), f"Bad date: {st[1]}"
        assert re.match(r"^\d{2}/\d{2}/\d{4}$", st[2]), f"Bad date: {st[2]}"
        # Proceeds, basis, gain
        assert float(st[3]) == 175.00
        assert float(st[4]) == 100.00
        # gain = 175 - 100 - 5 = 70
        assert float(st[7]) == 70.00
        # LT gain = 500 - 50 - 10 = 440
        assert float(lt[7]) == 440.00

    def test_tax_csv_year_filter(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/cards/tax/export.csv?year=2022", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        text = r.text
        assert "TEST_I7_OLD" in text
        # Current-year cards should NOT appear
        assert "TEST_I7_ST" not in text
        assert "TEST_I7_LT" not in text


# ---------- Regression: prior endpoints still work ----------
class TestRegression:
    def test_auth_me(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_cards_list(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/cards", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_stats(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/cards/stats", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert "total_cards" in r.json()

    def test_timeseries(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/cards/timeseries", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert "monthly" in r.json()

    def test_best_flip(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/cards/best-flip", headers=auth_headers, timeout=15)
        assert r.status_code == 200

    def test_watchlist(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/watchlist", headers=auth_headers, timeout=15)
        assert r.status_code == 200

    def test_card_crud(self, auth_headers, demo_user_id):
        # Create
        r = requests.post(f"{BASE_URL}/api/cards", headers=auth_headers,
                          json={"year": 2024, "name": "TEST_I7_REG_CRUD", "price_paid": 10}, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        # Quick-sell
        r2 = requests.post(f"{BASE_URL}/api/cards/{cid}/quick-sell", headers=auth_headers,
                           json={"price_sold": 25.0}, timeout=15)
        assert r2.status_code == 200 and r2.json()["status"] == "sold"
        # Share
        r3 = requests.post(f"{BASE_URL}/api/cards/{cid}/share", headers=auth_headers, timeout=15)
        assert r3.status_code == 200
        # Delete
        r4 = requests.delete(f"{BASE_URL}/api/cards/{cid}", headers=auth_headers, timeout=15)
        assert r4.status_code == 200
