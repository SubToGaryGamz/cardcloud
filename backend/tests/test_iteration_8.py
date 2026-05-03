"""Iteration 8 - Growth features: Public Leaderboard, Referral system,
Monthly Profit Goal, Year-in-Review, Annual Pro badge, billing.is_annual_pro."""
import os
import uuid
import pytest
import requests
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
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def demo_user_id(auth_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    return r.json()["user_id"]


# ===== /api/leaderboard =====
class TestLeaderboard:
    def test_leaderboard_public_no_auth_profit(self):
        r = requests.get(f"{BASE_URL}/api/leaderboard?metric=profit&limit=10", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "rows" in data and isinstance(data["rows"], list)
        assert data.get("metric") == "profit"
        if data["rows"]:
            row = data["rows"][0]
            for k in ("rank", "handle", "is_pro", "is_annual_pro", "bar"):
                assert k in row, f"missing {k} in {row}"

    def test_leaderboard_public_no_auth_cards(self):
        r = requests.get(f"{BASE_URL}/api/leaderboard?metric=cards&limit=10", timeout=15)
        assert r.status_code == 200
        assert "rows" in r.json()

    def test_leaderboard_excludes_objectid(self):
        r = requests.get(f"{BASE_URL}/api/leaderboard?metric=profit", timeout=15)
        assert r.status_code == 200
        assert "_id" not in r.text or '"_id"' not in r.text


# ===== /api/me/leaderboard-prefs =====
class TestLeaderboardPrefs:
    def test_update_prefs_opt_out_and_persist(self, auth_headers, demo_user_id):
        # set opt-in, custom handle, show_name false
        payload = {"leaderboard_opt_out": False,
                   "leaderboard_show_name": False,
                   "leaderboard_handle": "TESTHANDLE8"}
        r = requests.put(f"{BASE_URL}/api/me/leaderboard-prefs",
                         json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        doc = db.users.find_one({"user_id": demo_user_id})
        assert doc["leaderboard_handle"] == "TESTHANDLE8"
        assert doc["leaderboard_opt_out"] is False
        assert doc["leaderboard_show_name"] is False

        # flip show_name on, verify persists
        r2 = requests.put(f"{BASE_URL}/api/me/leaderboard-prefs",
                          json={"leaderboard_show_name": True},
                          headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        doc2 = db.users.find_one({"user_id": demo_user_id})
        assert doc2["leaderboard_show_name"] is True

    def test_prefs_unauth(self):
        r = requests.put(f"{BASE_URL}/api/me/leaderboard-prefs",
                         json={"leaderboard_opt_out": True}, timeout=15)
        assert r.status_code == 401


# ===== /api/me/referral =====
class TestReferral:
    def test_get_referral(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/me/referral", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "code" in data and isinstance(data["code"], str) and len(data["code"]) >= 4
        assert "referred_count" in data
        assert "share_url" in data and data["share_url"].startswith("/?ref=")
        assert data["share_url"].endswith(data["code"])

    def test_referral_unauth(self):
        r = requests.get(f"{BASE_URL}/api/me/referral", timeout=15)
        assert r.status_code == 401

    def test_register_with_referral_code_success(self, auth_headers):
        # Get demo's code
        ref = requests.get(f"{BASE_URL}/api/me/referral", headers=auth_headers, timeout=15).json()
        demo_code = ref["code"]
        prev_count = ref["referred_count"]

        # Register a fresh user with demo's referral code
        email = f"test_i8_ref_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "testpass123",
            "name": "TEST_I8_ReferredUser", "referral_code": demo_code
        }, timeout=15)
        assert r.status_code == 200, r.text
        new_user = db.users.find_one({"email": email})
        assert new_user is not None
        assert new_user.get("referred_by") == demo_code

        # referred_count counts users with referred_by=code (increments on signup).
        # rewards_given_months only increments on FIRST PAID subscribe.
        ref_after = requests.get(f"{BASE_URL}/api/me/referral",
                                 headers=auth_headers, timeout=15).json()
        assert ref_after["referred_count"] >= prev_count + 1
        assert ref_after["rewards_given_months"] == ref["rewards_given_months"]

        # cleanup
        db.users.delete_one({"email": email})

    def test_register_with_invalid_referral_code_still_succeeds(self):
        # Invalid codes should not block registration (per server logic)
        email = f"test_i8_badref_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "testpass123",
            "name": "TEST_I8_BadRef", "referral_code": "NOPE999"
        }, timeout=15)
        assert r.status_code == 200
        db.users.delete_one({"email": email})


# ===== /api/me/goal and /api/me/monthly-progress =====
class TestMonthlyGoal:
    def test_set_and_get_goal(self, auth_headers, demo_user_id):
        r = requests.put(f"{BASE_URL}/api/me/goal",
                         json={"monthly_profit_goal": 1000.0},
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["monthly_profit_goal"] == 1000.0

        # Verify via monthly-progress
        r2 = requests.get(f"{BASE_URL}/api/me/monthly-progress",
                          headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        data = r2.json()
        assert data["goal"] == 1000.0
        assert "profit" in data
        assert "pct" in data

    def test_set_null_goal_disables(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/me/goal",
                         json={"monthly_profit_goal": None},
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/me/monthly-progress",
                          headers=auth_headers, timeout=15)
        assert r2.json()["goal"] in (None, 0)

    def test_goal_unauth(self):
        r = requests.put(f"{BASE_URL}/api/me/goal",
                        json={"monthly_profit_goal": 500}, timeout=15)
        assert r.status_code == 401


# ===== /api/me/year-recap =====
class TestYearRecap:
    def test_year_recap_default_year(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/me/year-recap",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ("year", "total_profit", "flips", "cards_added", "spend", "top_sport"):
            assert k in data, f"missing {k}"

    def test_year_recap_specific_year(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/me/year-recap?year=2023",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["year"] == 2023

    def test_year_recap_invalid(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/me/year-recap?year=1500",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 400


# ===== /api/billing/me shape update =====
class TestBillingMeAnnualPro:
    def test_has_is_annual_pro(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/billing/me",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "is_annual_pro" in data
        assert isinstance(data["is_annual_pro"], bool)
        assert "is_pro" in data


# ===== Regression =====
class TestRegression:
    def test_auth_me(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200 and r.json()["email"] == DEMO_EMAIL

    def test_cards_list(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/cards", headers=auth_headers, timeout=15)
        assert r.status_code == 200

    def test_stats(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/cards/stats", headers=auth_headers, timeout=15)
        assert r.status_code == 200

    def test_watchlist(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/watchlist", headers=auth_headers, timeout=15)
        assert r.status_code == 200
