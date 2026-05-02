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


# ============ Iteration 2 features ============

# new optional fields purchased_date / sold_date on POST/PUT
def test_create_with_dates(auth_headers):
    payload = {
        "year": 1999, "name": "TEST_DatesCard", "price_paid": 50.0,
        "purchased_date": "2024-06-15", "status": "in_collection",
    }
    r = requests.post(f"{API}/cards", headers=auth_headers, json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["purchased_date"] == "2024-06-15"
    assert d["sold_date"] is None
    cid = d["id"]
    # PUT sold_date
    r2 = requests.put(f"{API}/cards/{cid}", headers=auth_headers,
                      json={"sold_date": "2024-09-20", "status": "sold", "price_sold": 80.0})
    assert r2.status_code == 200
    assert r2.json()["sold_date"] == "2024-09-20"
    # cleanup
    requests.delete(f"{API}/cards/{cid}", headers=auth_headers)


# Quick Sell endpoint
def test_quick_sell(auth_headers):
    # create in-collection card
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2010, "name": "TEST_QSell", "price_paid": 100.0,
                            "expenses": 5.0, "status": "in_collection"})
    cid = r.json()["id"]
    # quick-sell
    rs = requests.post(f"{API}/cards/{cid}/quick-sell", headers=auth_headers,
                       json={"price_sold": 200.0, "extra_expenses": 10.0})
    assert rs.status_code == 200, rs.text
    d = rs.json()
    assert d["status"] == "sold"
    assert d["price_sold"] == 200.0
    # expenses should be 5 + 10 = 15
    assert abs(d["expenses"] - 15.0) < 0.001
    # sold_date defaulted to today (YYYY-MM-DD)
    assert d["sold_date"] and len(d["sold_date"]) == 10
    # GET verifies persistence
    g = requests.get(f"{API}/cards/{cid}", headers=auth_headers)
    assert g.json()["status"] == "sold"
    requests.delete(f"{API}/cards/{cid}", headers=auth_headers)


def test_quick_sell_with_explicit_date(auth_headers):
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2011, "name": "TEST_QSellDate", "price_paid": 50.0,
                            "status": "in_collection"})
    cid = r.json()["id"]
    rs = requests.post(f"{API}/cards/{cid}/quick-sell", headers=auth_headers,
                       json={"price_sold": 75.0, "extra_expenses": 0, "sold_date": "2025-02-15"})
    assert rs.status_code == 200
    assert rs.json()["sold_date"] == "2025-02-15"
    requests.delete(f"{API}/cards/{cid}", headers=auth_headers)


def test_quick_sell_not_found(auth_headers):
    r = requests.post(f"{API}/cards/nonexistent-id/quick-sell", headers=auth_headers,
                      json={"price_sold": 1.0})
    assert r.status_code == 404


# Stats with ?since
def test_stats_since(auth_headers):
    for since in ("all", "30d", "90d", "1y"):
        r = requests.get(f"{API}/cards/stats", headers=auth_headers, params={"since": since})
        assert r.status_code == 200, f"since={since}: {r.text}"
        s = r.json()
        for k in ("total_paid", "total_sales", "total_expenses", "profit", "sold_count", "total_cards"):
            assert k in s


# Timeseries endpoint
def test_timeseries(auth_headers):
    r = requests.get(f"{API}/cards/timeseries", headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "monthly" in d and "by_year" in d
    assert isinstance(d["monthly"], list)
    assert len(d["monthly"]) == 12
    # each bucket has expected keys
    for b in d["monthly"]:
        for k in ("month", "paid", "sales", "profit", "count_bought", "count_sold"):
            assert k in b
    assert isinstance(d["by_year"], list)
    for y in d["by_year"]:
        for k in ("year", "count", "paid", "sales"):
            assert k in y


def test_timeseries_custom_months(auth_headers):
    r = requests.get(f"{API}/cards/timeseries", headers=auth_headers, params={"months": 6})
    assert r.status_code == 200
    assert len(r.json()["monthly"]) == 6


# Import CSV
def _make_csv():
    csv_text = (
        "Year,Name,Where Bought,Price Paid,Price Sold,Expenses,Status,Purchased Date,Sold Date\n"
        "1986,TEST_Import_Jordan,eBay,100,250,5,sold,2024-01-10,2024-05-20\n"
        "1990,TEST_Import_Griffey,COMC,30,,2,in_collection,2024-03-15,\n"
    )
    return csv_text.encode("utf-8")


def test_import_csv(demo_token):
    headers = {"Authorization": f"Bearer {demo_token}"}
    files = {"file": ("import.csv", _make_csv(), "text/csv")}
    r = requests.post(f"{API}/cards/import", headers=headers, files=files)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["imported"] == 2, j
    assert j["skipped"] == 0
    # verify the cards exist
    g = requests.get(f"{API}/cards", headers=headers, params={"q": "TEST_Import_"})
    names = [c["name"] for c in g.json()]
    assert "TEST_Import_Jordan" in names
    sold = [c for c in g.json() if c["name"] == "TEST_Import_Jordan"][0]
    assert sold["status"] == "sold"
    assert sold["price_sold"] == 250.0
    assert sold["purchased_date"] == "2024-01-10"
    assert sold["sold_date"] == "2024-05-20"
    # cleanup
    for c in g.json():
        requests.delete(f"{API}/cards/{c['id']}", headers=headers)


def test_import_csv_with_underscore_headers(demo_token):
    headers = {"Authorization": f"Bearer {demo_token}"}
    csv_text = (
        "year,name,where_bought,price_paid,price_sold,expenses,status,purchased_date,sold_date\n"
        "2001,TEST_Import_Underscore,LCS,10,,0,in_collection,,\n"
    ).encode("utf-8")
    files = {"file": ("u.csv", csv_text, "text/csv")}
    r = requests.post(f"{API}/cards/import", headers=headers, files=files)
    assert r.status_code == 200
    assert r.json()["imported"] == 1
    g = requests.get(f"{API}/cards", headers=headers, params={"q": "TEST_Import_Underscore"})
    for c in g.json():
        requests.delete(f"{API}/cards/{c['id']}", headers=headers)


def test_import_csv_skips_invalid(demo_token):
    headers = {"Authorization": f"Bearer {demo_token}"}
    csv_text = (
        "Year,Name,Price Paid\n"
        ",MissingYear,10\n"
        "abc,BadYear,10\n"
        "1995,TEST_Import_Valid,15\n"
    ).encode("utf-8")
    files = {"file": ("bad.csv", csv_text, "text/csv")}
    r = requests.post(f"{API}/cards/import", headers=headers, files=files)
    assert r.status_code == 200
    j = r.json()
    assert j["imported"] == 1
    assert j["skipped"] == 2
    assert len(j["errors"]) >= 2
    # cleanup
    g = requests.get(f"{API}/cards", headers=headers, params={"q": "TEST_Import_Valid"})
    for c in g.json():
        requests.delete(f"{API}/cards/{c['id']}", headers=headers)


def test_import_rejects_non_csv(auth_headers):
    files = {"file": ("a.txt", b"hello", "text/plain")}
    headers = {k: v for k, v in auth_headers.items() if k != "Content-Type"}
    r = requests.post(f"{API}/cards/import", headers=headers, files=files)
    assert r.status_code == 400


# Export CSV includes new columns
def test_export_csv_has_date_columns(auth_headers):
    r = requests.get(f"{API}/cards/export.csv", headers=auth_headers)
    assert r.status_code == 200
    header = r.text.split("\n", 1)[0]
    assert "Purchased Date" in header
    assert "Sold Date" in header
