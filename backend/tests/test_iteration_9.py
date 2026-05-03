"""Iteration 9 — Bulk delete cards endpoint tests.

Covers:
- POST /api/cards/bulk-delete: auth, empty body, >500 ids, only-owned deletion,
  silent skip for missing ids, deleted count correctness.
- Regression: single DELETE /api/cards/{id} and GET /api/cards still working.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cardprofitlog.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo1234"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    j = r.json()
    return j.get("token") or j.get("access_token")


def _register_or_login(email, password, name):
    # Try register; if exists, login
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name}, timeout=30)
    if r.status_code == 200:
        j = r.json()
        return j.get("token") or j.get("access_token")
    return _login(email, password)


@pytest.fixture(scope="module")
def demo_token():
    return _login(DEMO_EMAIL, DEMO_PASSWORD)


@pytest.fixture(scope="module")
def other_user_token():
    email = f"test_bulk_{uuid.uuid4().hex[:8]}@example.com"
    return _register_or_login(email, "password123", "Bulk Tester")


@pytest.fixture
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


@pytest.fixture
def other_headers(other_user_token):
    return {"Authorization": f"Bearer {other_user_token}", "Content-Type": "application/json"}


def _create_card(headers, name_prefix="TEST_bulk"):
    payload = {
        "name": f"{name_prefix}_{uuid.uuid4().hex[:6]}",
        "year": 2024,
        "sport": "Basketball",
        "price_paid": 10.0,
        "expenses": 0.0,
        "status": "in_collection",
    }
    r = requests.post(f"{API}/cards", json=payload, headers=headers, timeout=30)
    assert r.status_code in (200, 201), f"create_card failed {r.status_code} {r.text}"
    return r.json()


# ---------------- AUTH ----------------
class TestBulkDeleteAuth:
    def test_unauth_returns_401(self):
        r = requests.post(f"{API}/cards/bulk-delete", json={"card_ids": ["x"]}, timeout=30)
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"


# ---------------- VALIDATION ----------------
class TestBulkDeleteValidation:
    def test_empty_array_400(self, demo_headers):
        r = requests.post(f"{API}/cards/bulk-delete", json={"card_ids": []}, headers=demo_headers, timeout=30)
        assert r.status_code == 400
        assert "No card" in r.text or "empty" in r.text.lower()

    def test_too_many_400(self, demo_headers):
        ids = [uuid.uuid4().hex for _ in range(501)]
        r = requests.post(f"{API}/cards/bulk-delete", json={"card_ids": ids}, headers=demo_headers, timeout=30)
        assert r.status_code == 400
        assert "max" in r.text.lower() or "too many" in r.text.lower()

    def test_missing_body_422(self, demo_headers):
        r = requests.post(f"{API}/cards/bulk-delete", json={}, headers=demo_headers, timeout=30)
        # Pydantic validation error
        assert r.status_code in (400, 422)


# ---------------- CORE BEHAVIOR ----------------
class TestBulkDeleteBehavior:
    def test_bulk_delete_only_owned_cards(self, demo_headers):
        # Create 2 throwaway cards on demo
        c1 = _create_card(demo_headers)
        c2 = _create_card(demo_headers)
        fake_id = uuid.uuid4().hex
        ids = [c1["id"], c2["id"], fake_id]

        r = requests.post(f"{API}/cards/bulk-delete", json={"card_ids": ids}, headers=demo_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("deleted") == 2, f"expected 2 deleted, got {data}"

        # Verify cards no longer returned
        list_r = requests.get(f"{API}/cards", headers=demo_headers, timeout=30)
        assert list_r.status_code == 200
        remaining_ids = {c["id"] for c in list_r.json()}
        assert c1["id"] not in remaining_ids
        assert c2["id"] not in remaining_ids

    def test_bulk_delete_does_not_affect_other_users_cards(self, demo_headers, other_headers):
        # User A creates a card
        other_card = _create_card(other_headers, name_prefix="TEST_other")
        # User A (other) — snapshot
        other_cards_before = requests.get(f"{API}/cards", headers=other_headers, timeout=30).json()
        assert any(c["id"] == other_card["id"] for c in other_cards_before)

        # Demo tries to delete other_card's id → count should be 0
        r = requests.post(
            f"{API}/cards/bulk-delete",
            json={"card_ids": [other_card["id"]]},
            headers=demo_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("deleted") == 0

        # Other user's card is still there
        other_cards_after = requests.get(f"{API}/cards", headers=other_headers, timeout=30).json()
        assert any(c["id"] == other_card["id"] for c in other_cards_after)

        # Cleanup: other user deletes own card
        requests.delete(f"{API}/cards/{other_card['id']}", headers=other_headers, timeout=30)

    def test_bulk_delete_all_non_existent_returns_zero(self, demo_headers):
        ids = [uuid.uuid4().hex for _ in range(3)]
        r = requests.post(f"{API}/cards/bulk-delete", json={"card_ids": ids}, headers=demo_headers, timeout=30)
        assert r.status_code == 200
        assert r.json().get("deleted") == 0


# ---------------- REGRESSION ----------------
class TestRegressions:
    def test_single_delete_still_works(self, demo_headers):
        c = _create_card(demo_headers, name_prefix="TEST_single_del")
        r = requests.delete(f"{API}/cards/{c['id']}", headers=demo_headers, timeout=30)
        assert r.status_code == 200, r.text
        # Verify 404 after delete
        g = requests.get(f"{API}/cards/{c['id']}", headers=demo_headers, timeout=30)
        assert g.status_code == 404

    def test_list_cards_still_works(self, demo_headers):
        r = requests.get(f"{API}/cards", headers=demo_headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
