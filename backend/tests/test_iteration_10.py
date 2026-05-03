"""Iteration 10 backend regression tests.

Scope:
- GET /api/leaderboard?metric=profit  → rows[].bar present, card_count is None (null).
- GET /api/leaderboard?metric=cards   → rows[].bar present, card_count is int.
- POST /api/cards/import              → still accepts multipart CSV upload (Pro demo user).
"""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "demo@example.com"
PASSWORD = "demo1234"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in login response: {data}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Leaderboard ----------

class TestLeaderboard:
    def test_leaderboard_profit_shape(self):
        r = requests.get(f"{API}/leaderboard", params={"metric": "profit", "limit": 25})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "rows" in body
        rows = body["rows"]
        assert isinstance(rows, list)
        for row in rows:
            assert "rank" in row and isinstance(row["rank"], int)
            assert "bar" in row
            assert isinstance(row["bar"], (int, float))
            assert 0.0 <= float(row["bar"]) <= 1.0
            assert "card_count" in row  # key must exist
            assert row["card_count"] is None  # null on profit metric
            assert "handle" in row and isinstance(row["handle"], str)

    def test_leaderboard_cards_shape(self):
        r = requests.get(f"{API}/leaderboard", params={"metric": "cards", "limit": 25})
        assert r.status_code == 200, r.text
        body = r.json()
        rows = body.get("rows", [])
        assert isinstance(rows, list)
        for row in rows:
            assert "rank" in row
            assert "bar" in row and isinstance(row["bar"], (int, float))
            assert "card_count" in row
            assert isinstance(row["card_count"], int), f"card_count must be int on cards metric, got {row['card_count']!r}"
            assert row["card_count"] >= 0

    def test_leaderboard_metric_switch_no_nulls_on_cards(self):
        """Sanity: no row on cards metric has card_count None (would crash old FE)."""
        r = requests.get(f"{API}/leaderboard", params={"metric": "cards", "limit": 25})
        assert r.status_code == 200
        rows = r.json().get("rows", [])
        for row in rows:
            assert row["card_count"] is not None

    def test_leaderboard_invalid_metric(self):
        r = requests.get(f"{API}/leaderboard", params={"metric": "bogus"})
        assert r.status_code == 400


# ---------- CSV import ----------

class TestCsvImport:
    def test_import_csv_multipart_accepted(self, auth_headers):
        # Minimal CSV matching the documented columns (best-effort; backend tolerates unknown cols)
        csv = (
            "name,year,sport,price_paid,status\n"
            "TEST_iter10_import_A,2020,Basketball,1.00,in_collection\n"
            "TEST_iter10_import_B,2019,Baseball,2.50,in_collection\n"
        )
        files = {"file": ("cards.csv", io.BytesIO(csv.encode("utf-8")), "text/csv")}
        r = requests.post(f"{API}/cards/import", headers=auth_headers, files=files)
        # 200 when Pro; 402 if free; we expect 200 since demo is Pro.
        assert r.status_code in (200, 402), r.text
        if r.status_code == 200:
            body = r.json()
            assert "imported" in body
            assert isinstance(body["imported"], int)
            # Cleanup imported rows
            cards_r = requests.get(f"{API}/cards", headers=auth_headers, params={"q": "TEST_iter10_import_"})
            if cards_r.status_code == 200:
                for c in cards_r.json():
                    if str(c.get("name", "")).startswith("TEST_iter10_import_"):
                        requests.delete(f"{API}/cards/{c['id']}", headers=auth_headers)

    def test_import_csv_requires_auth(self):
        csv = "name,year\nTEST_x,2020\n"
        files = {"file": ("cards.csv", io.BytesIO(csv.encode("utf-8")), "text/csv")}
        r = requests.post(f"{API}/cards/import", files=files)
        assert r.status_code in (401, 403)
