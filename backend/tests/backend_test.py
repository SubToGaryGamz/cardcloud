import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cardprofitlog.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@example.com"
DEMO_PASS = "demo1234"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def demo_token(session):
    # Try login; if fails, register
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS})
    if r.status_code != 200:
        rr = session.post(f"{API}/auth/register", json={"email": DEMO_EMAIL, "password": DEMO_PASS, "name": "Demo Collector"})
        assert rr.status_code == 200, f"Register failed: {rr.status_code} {rr.text}"
        return rr.json()["token"]
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def second_user(session):
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": "pw12345678", "name": "Other"})
    assert r.status_code == 200
    return r.json()["token"], email


# Health
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# Auth
def test_auth_me(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == DEMO_EMAIL


def test_auth_me_no_token():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_register_duplicate(session):
    r = session.post(f"{API}/auth/register", json={"email": DEMO_EMAIL, "password": "x", "name": "X"})
    assert r.status_code == 400


# Cards CRUD
@pytest.fixture(scope="module")
def created_card(auth_headers):
    payload = {"year": 1986, "name": "TEST_Jordan Fleer #57", "where_bought": "eBay",
               "price_paid": 100.0, "expenses": 5.0, "status": "in_collection"}
    r = requests.post(f"{API}/cards", headers=auth_headers, json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == payload["name"]
    assert data["year"] == 1986
    assert "id" in data
    yield data
    requests.delete(f"{API}/cards/{data['id']}", headers=auth_headers)


def test_create_and_get_card(auth_headers, created_card):
    r = requests.get(f"{API}/cards/{created_card['id']}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["name"] == created_card["name"]


def test_list_cards(auth_headers, created_card):
    r = requests.get(f"{API}/cards", headers=auth_headers)
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert created_card["id"] in ids


def test_search_filter(auth_headers, created_card):
    r = requests.get(f"{API}/cards?q=TEST_Jordan", headers=auth_headers)
    assert r.status_code == 200
    assert any(c["id"] == created_card["id"] for c in r.json())
    r2 = requests.get(f"{API}/cards?year=1986", headers=auth_headers)
    assert r2.status_code == 200
    assert any(c["id"] == created_card["id"] for c in r2.json())
    r3 = requests.get(f"{API}/cards?status=in_collection", headers=auth_headers)
    assert r3.status_code == 200
    assert any(c["id"] == created_card["id"] for c in r3.json())


def test_update_card(auth_headers, created_card):
    upd = {"price_sold": 250.0, "status": "sold"}
    r = requests.put(f"{API}/cards/{created_card['id']}", headers=auth_headers, json=upd)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "sold"
    assert r.json()["price_sold"] == 250.0
    # verify persistence
    r2 = requests.get(f"{API}/cards/{created_card['id']}", headers=auth_headers)
    assert r2.json()["status"] == "sold"


def test_stats(auth_headers, created_card):
    r = requests.get(f"{API}/cards/stats", headers=auth_headers)
    assert r.status_code == 200
    s = r.json()
    for k in ("total_paid", "total_sales", "total_expenses", "profit", "sold_count", "total_cards"):
        assert k in s
    assert s["sold_count"] >= 1


def test_export_csv(auth_headers):
    r = requests.get(f"{API}/cards/export.csv", headers=auth_headers)
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    assert "Year,Name" in r.text


def test_user_isolation(second_user, created_card):
    token2, _ = second_user
    h2 = {"Authorization": f"Bearer {token2}"}
    # other user can't see/get demo's card
    r = requests.get(f"{API}/cards/{created_card['id']}", headers=h2)
    assert r.status_code == 404
    r2 = requests.get(f"{API}/cards", headers=h2)
    assert r2.status_code == 200
    assert all(c["id"] != created_card["id"] for c in r2.json())


def test_image_upload_and_serve(auth_headers, demo_token):
    # create a card just for image
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2020, "name": "TEST_ImgCard", "price_paid": 1})
    assert r.status_code == 200
    cid = r.json()["id"]
    # upload tiny PNG
    png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000000500010d0a2db40000000049454e44ae426082")
    files = {"file": ("t.png", png, "image/png")}
    headers_mp = {"Authorization": f"Bearer {demo_token}"}
    ru = requests.post(f"{API}/cards/{cid}/image", headers=headers_mp, files=files)
    assert ru.status_code == 200, ru.text
    img_path = ru.json().get("image_path")
    assert img_path
    # fetch with auth
    rf = requests.get(f"{API}/files/{img_path}", headers=headers_mp)
    assert rf.status_code == 200
    assert len(rf.content) > 0
    # cleanup
    requests.delete(f"{API}/cards/{cid}", headers=auth_headers)


def test_delete_card(auth_headers):
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2001, "name": "TEST_DeleteMe", "price_paid": 1})
    cid = r.json()["id"]
    rd = requests.delete(f"{API}/cards/{cid}", headers=auth_headers)
    assert rd.status_code == 200
    rg = requests.get(f"{API}/cards/{cid}", headers=auth_headers)
    assert rg.status_code == 404
