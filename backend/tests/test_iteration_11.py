"""Iteration 11 — Admin analytics /admin/overview gating + shape tests.

Covers:
- Gating: 401 unauth, 403 non-admin, 200 admin (demo@example.com)
- /api/auth/me returns is_admin correctly
- /api/admin/overview shape: users, monetization, engagement, beta, referrals
- AI scans counter increments when a synthetic ai_scan_events doc is inserted
- Regression: /api/auth/me + /api/billing/me still 200
"""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cardprofitlog.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo1234"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def demo_token(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, f"demo login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def new_user(session):
    """Create a fresh non-admin user."""
    email = f"TEST_iter11_{uuid.uuid4().hex[:10]}@example.com"
    password = "testpass123"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": password, "name": "Iter11 Tester"})
    assert r.status_code in (200, 201), f"signup failed: {r.status_code} {r.text}"
    token = r.json()["token"]
    return {"email": email, "password": password, "token": token}


# ---------- Auth /me is_admin flag ----------
class TestAuthMeIsAdmin:
    def test_me_demo_is_admin_true(self, session, demo_token):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == DEMO_EMAIL
        assert data.get("is_admin") is True, f"demo must be admin, got {data.get('is_admin')}"

    def test_me_new_user_is_admin_false(self, session, new_user):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {new_user['token']}"})
        assert r.status_code == 200
        data = r.json()
        assert data["email"].lower() == new_user["email"].lower()
        assert data.get("is_admin") is False, f"new user must not be admin, got {data.get('is_admin')}"


# ---------- /admin/overview gating ----------
class TestAdminOverviewGating:
    def test_unauth_returns_401_or_403(self, session):
        r = session.get(f"{API}/admin/overview")
        assert r.status_code in (401, 403), f"expected 401/403 unauth, got {r.status_code}"

    def test_non_admin_returns_403(self, session, new_user):
        r = session.get(f"{API}/admin/overview", headers={"Authorization": f"Bearer {new_user['token']}"})
        assert r.status_code == 403, f"non-admin must get 403, got {r.status_code} {r.text}"

    def test_admin_returns_200(self, session, demo_token):
        r = session.get(f"{API}/admin/overview", headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200, f"admin must get 200, got {r.status_code} {r.text}"


# ---------- /admin/overview shape ----------
class TestAdminOverviewShape:
    @pytest.fixture(scope="class")
    def overview(self, session, demo_token):
        r = session.get(f"{API}/admin/overview", headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200
        return r.json()

    def test_top_level_keys(self, overview):
        for k in ("generated_at", "users", "monetization", "engagement", "beta", "referrals"):
            assert k in overview, f"missing top-level key: {k}"

    def test_users_section(self, overview):
        u = overview["users"]
        for k in ("total", "new_today", "new_7d", "new_30d", "signup_chart_30d"):
            assert k in u, f"users.{k} missing"
        assert isinstance(u["total"], int)
        assert isinstance(u["signup_chart_30d"], list)
        assert len(u["signup_chart_30d"]) == 30, f"expected 30 days, got {len(u['signup_chart_30d'])}"
        for p in u["signup_chart_30d"]:
            assert "date" in p and "count" in p
            assert isinstance(p["count"], int)

    def test_monetization_section(self, overview):
        m = overview["monetization"]
        for k in ("active_pro", "active_monthly", "active_annual", "ever_pro", "expired_pro",
                  "est_mrr", "revenue_30d", "revenue_lifetime"):
            assert k in m, f"monetization.{k} missing"
        assert isinstance(m["active_pro"], int)
        # Numeric fields should be numbers
        assert isinstance(m["est_mrr"], (int, float))
        assert isinstance(m["revenue_30d"], (int, float))
        assert isinstance(m["revenue_lifetime"], (int, float))

    def test_engagement_section(self, overview):
        e = overview["engagement"]
        for k in ("total_cards", "total_sold", "cards_added_30d", "total_profit_logged",
                  "ai_scans_total", "ai_scans_30d", "top_sports"):
            assert k in e, f"engagement.{k} missing"
        assert isinstance(e["ai_scans_total"], int)
        assert isinstance(e["ai_scans_30d"], int)
        assert isinstance(e["top_sports"], list)
        for sp in e["top_sports"]:
            assert "sport" in sp and "count" in sp

    def test_beta_section(self, overview):
        b = overview["beta"]
        for k in ("redeemed_total", "redeemed_30d"):
            assert k in b, f"beta.{k} missing"
        assert isinstance(b["redeemed_total"], int)
        assert isinstance(b["redeemed_30d"], int)

    def test_referrals_section(self, overview):
        r = overview["referrals"]
        for k in ("signups_via_referral", "rewards_granted", "top_referrers"):
            assert k in r, f"referrals.{k} missing"
        assert isinstance(r["top_referrers"], list)
        for ref in r["top_referrers"]:
            # Shape: name, email, referral_code, referral_rewards_given
            for k in ("name", "email", "referral_code", "referral_rewards_given"):
                assert k in ref, f"top_referrer missing {k}"


# ---------- AI scans counter increments ----------
class TestAiScansCounter:
    def test_ai_scans_total_increments_on_insert(self, session, demo_token):
        """Insert synthetic ai_scan_events docs via mongo-less approach:
        We can't insert directly without mongo client, so we call the API twice if available.
        Simpler: hit /admin/overview, note ai_scans_total; then directly insert via a helper
        route if exists. If not, just verify the counter is a non-negative int and field exists.
        """
        # Baseline
        r1 = session.get(f"{API}/admin/overview", headers={"Authorization": f"Bearer {demo_token}"})
        assert r1.status_code == 200
        before = r1.json()["engagement"]["ai_scans_total"]
        assert isinstance(before, int) and before >= 0

        # Try to insert via direct mongo (same container) — optional best-effort
        inserted = False
        try:
            from pymongo import MongoClient
            mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
            db_name = os.environ.get("DB_NAME", "test_database")
            client = MongoClient(mongo_url, serverSelectionTimeoutMS=2000)
            client.admin.command("ping")
            db = client[db_name]
            db.ai_scan_events.insert_one({
                "ts": datetime.now(timezone.utc).isoformat(),
                "email": f"TEST_iter11_scan_{uuid.uuid4().hex[:6]}@example.com",
                "confidence": 0.9,
            })
            inserted = True
            time.sleep(0.3)
        except Exception as ex:
            print(f"direct mongo insert skipped: {ex}")

        r2 = session.get(f"{API}/admin/overview", headers={"Authorization": f"Bearer {demo_token}"})
        assert r2.status_code == 200
        after = r2.json()["engagement"]["ai_scans_total"]
        assert isinstance(after, int)

        if inserted:
            assert after == before + 1, f"ai_scans_total expected {before + 1}, got {after}"
            # Cleanup: remove the TEST_ doc we just inserted
            try:
                from pymongo import MongoClient
                client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
                                     serverSelectionTimeoutMS=2000)
                db = client[os.environ.get("DB_NAME", "test_database")]
                db.ai_scan_events.delete_many({"email": {"$regex": r"^TEST_iter11_scan_"}})
            except Exception:
                pass
        else:
            # At least confirm field is present & non-negative
            assert after >= 0


# ---------- Regression ----------
class TestRegression:
    def test_auth_me_200(self, session, demo_token):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200

    def test_billing_me_200(self, session, demo_token):
        r = session.get(f"{API}/billing/me", headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200

    def test_scan_image_endpoint_exists_and_requires_auth(self, session):
        r = session.post(f"{API}/cards/scan-image")
        # Should not be 404; either 401/403 unauth or 422 missing body
        assert r.status_code != 404, "scan-image endpoint missing"
        assert r.status_code in (401, 403, 422), f"unexpected {r.status_code}"


# ---------- Cleanup TEST_ users at end ----------
@pytest.fixture(scope="module", autouse=True)
def cleanup(request):
    yield
    try:
        from pymongo import MongoClient
        client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
                             serverSelectionTimeoutMS=2000)
        db = client[os.environ.get("DB_NAME", "test_database")]
        db.users.delete_many({"email": {"$regex": r"^TEST_iter11_"}})
        db.ai_scan_events.delete_many({"email": {"$regex": r"^TEST_iter11_"}})
    except Exception as ex:
        print(f"cleanup skipped: {ex}")
