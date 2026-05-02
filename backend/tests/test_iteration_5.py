"""Iteration 5 tests: Condition+Grade on cards, /cards/best-flip, CSV export/import columns."""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@example.com"
DEMO_PASS = "demo1234"


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


@pytest.fixture
def created_card_ids(auth_headers):
    ids = []
    yield ids
    for cid in ids:
        requests.delete(f"{API}/cards/{cid}", headers=auth_headers)


# ---- Condition + Grade on create/update ----
def test_create_card_with_graded_condition(auth_headers, created_card_ids):
    payload = {"year": 2019, "name": "TEST_I5_Zion PSA", "price_paid": 100.0,
               "condition": "PSA", "grade": 9.5}
    r = requests.post(f"{API}/cards", headers=auth_headers, json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    created_card_ids.append(d["id"])
    assert d["condition"] == "PSA"
    assert d["grade"] == 9.5
    # verify persistence
    g = requests.get(f"{API}/cards/{d['id']}", headers=auth_headers)
    assert g.json()["condition"] == "PSA"
    assert g.json()["grade"] == 9.5


def test_create_card_raw_no_grade(auth_headers, created_card_ids):
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2020, "name": "TEST_I5_Raw", "condition": "Raw"})
    assert r.status_code == 200
    d = r.json()
    created_card_ids.append(d["id"])
    assert d["condition"] == "Raw"
    assert d["grade"] is None


def test_update_card_condition_and_grade(auth_headers, created_card_ids):
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2021, "name": "TEST_I5_Upgrade", "condition": "Raw"})
    cid = r.json()["id"]
    created_card_ids.append(cid)
    u = requests.put(f"{API}/cards/{cid}", headers=auth_headers,
                     json={"condition": "BGS", "grade": 9.0})
    assert u.status_code == 200
    assert u.json()["condition"] == "BGS"
    assert u.json()["grade"] == 9.0
    g = requests.get(f"{API}/cards/{cid}", headers=auth_headers)
    assert g.json()["condition"] == "BGS"
    assert g.json()["grade"] == 9.0


# ---- GET /api/cards?condition=<X> filter ----
def test_list_cards_filter_by_condition(auth_headers, created_card_ids):
    r1 = requests.post(f"{API}/cards", headers=auth_headers,
                       json={"year": 2022, "name": "TEST_I5_SGC", "condition": "SGC", "grade": 10.0})
    r2 = requests.post(f"{API}/cards", headers=auth_headers,
                       json={"year": 2022, "name": "TEST_I5_CGC", "condition": "CGC", "grade": 9.5})
    created_card_ids.extend([r1.json()["id"], r2.json()["id"]])
    r = requests.get(f"{API}/cards?condition=SGC", headers=auth_headers)
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert "TEST_I5_SGC" in names
    assert "TEST_I5_CGC" not in names
    # all results must have condition SGC
    for c in r.json():
        assert c["condition"] == "SGC"


# ---- /cards/best-flip ----
def test_best_flip_all_time(auth_headers, created_card_ids):
    # high-profit sold card
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2015, "name": "TEST_I5_BigFlip",
                            "price_paid": 20.0, "price_sold": 500.0, "expenses": 10.0,
                            "status": "sold",
                            "sold_date": "2025-12-15"})
    cid = r.json()["id"]
    created_card_ids.append(cid)
    bf = requests.get(f"{API}/cards/best-flip?since=all", headers=auth_headers)
    assert bf.status_code == 200, bf.text
    data = bf.json()
    assert data["since"] == "all"
    assert data["card"] is not None
    # profit should be >= 470 (could be larger if higher-profit existed)
    assert data["profit"] >= 470.0


def test_best_flip_default_30d(auth_headers, created_card_ids):
    # sold today -> must appear in 30d window
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2018, "name": "TEST_I5_Recent",
                            "price_paid": 5.0, "price_sold": 120.0, "expenses": 1.0,
                            "status": "sold"})
    cid = r.json()["id"]
    created_card_ids.append(cid)
    # quick-sell to set sold_date to today
    requests.post(f"{API}/cards/{cid}/quick-sell", headers=auth_headers,
                  json={"price_sold": 120.0, "extra_expenses": 0})
    bf = requests.get(f"{API}/cards/best-flip", headers=auth_headers)
    assert bf.status_code == 200
    d = bf.json()
    assert d["since"] == "30d"
    assert d["card"] is not None
    assert isinstance(d["profit"], (int, float))


def test_best_flip_since_query_variants(auth_headers):
    for since in ("30d", "90d", "1y", "all"):
        r = requests.get(f"{API}/cards/best-flip?since={since}", headers=auth_headers)
        assert r.status_code == 200, f"{since}: {r.text}"
        d = r.json()
        assert d["since"] == since
        assert "card" in d
        assert "profit" in d


def test_best_flip_empty_user():
    """Isolated user with no sold cards -> card:null."""
    email = f"TEST_I5_empty_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "pw12345678", "name": "Empty5"})
    assert r.status_code == 200
    tok = r.json()["token"]
    h = {"Authorization": f"Bearer {tok}"}
    bf = requests.get(f"{API}/cards/best-flip?since=all", headers=h)
    assert bf.status_code == 200
    d = bf.json()
    assert d["card"] is None
    assert d["profit"] == 0.0


# ---- CSV Export ----
def test_csv_export_has_condition_and_grade(auth_headers, created_card_ids):
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2023, "name": "TEST_I5_ExportMe",
                            "condition": "PSA", "grade": 10.0, "price_paid": 1.0})
    created_card_ids.append(r.json()["id"])
    ex = requests.get(f"{API}/cards/export.csv", headers=auth_headers)
    assert ex.status_code == 200
    text = ex.text
    first_line = text.splitlines()[0]
    assert "Condition" in first_line
    assert "Grade" in first_line
    # our just-created row should include PSA and 10.0
    assert "TEST_I5_ExportMe" in text
    # verify CSV row has condition/grade columns populated
    import csv as _csv
    rows = list(_csv.DictReader(io.StringIO(text)))
    mine = [row for row in rows if row["Name"] == "TEST_I5_ExportMe"][0]
    assert mine["Condition"] == "PSA"
    assert float(mine["Grade"]) == 10.0


# ---- CSV Import accepts Condition+Grade (case-insensitive) ----
def test_csv_import_condition_grade(auth_headers, demo_token):
    csv_text = (
        "Year,Name,Condition,Grade,Price Paid\n"
        "2021,TEST_I5_ImportedA,PSA,9.5,12.5\n"
        "2020,TEST_I5_ImportedB,Raw,,8\n"
        "2019,TEST_I5_ImportedC,bgs,8.5,30\n"  # lowercase header test covered via DictReader norm
    )
    files = {"file": ("in.csv", csv_text.encode("utf-8"), "text/csv")}
    h = {"Authorization": f"Bearer {demo_token}"}
    r = requests.post(f"{API}/cards/import", headers=h, files=files)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["imported"] == 3
    # verify the PSA one came back with grade=9.5
    lst = requests.get(f"{API}/cards?q=TEST_I5_Imported", headers=auth_headers).json()
    by_name = {c["name"]: c for c in lst}
    a = by_name["TEST_I5_ImportedA"]
    assert a["condition"] == "PSA"
    assert a["grade"] == 9.5
    b = by_name["TEST_I5_ImportedB"]
    assert b["condition"] == "Raw"
    assert b["grade"] in (None, 0, 0.0) or b["grade"] is None
    c = by_name["TEST_I5_ImportedC"]
    assert c["condition"] == "bgs"  # preserved as provided
    assert c["grade"] == 8.5
    # cleanup
    for card in lst:
        requests.delete(f"{API}/cards/{card['id']}",
                        headers={"Authorization": f"Bearer {demo_token}"})


# ---- Regression smoke: prior endpoints still work ----
def test_regression_smoke(auth_headers):
    assert requests.get(f"{API}/auth/me", headers=auth_headers).status_code == 200
    assert requests.get(f"{API}/cards", headers=auth_headers).status_code == 200
    assert requests.get(f"{API}/cards/stats", headers=auth_headers).status_code == 200
    assert requests.get(f"{API}/cards/timeseries?months=6", headers=auth_headers).status_code == 200
    assert requests.get(f"{API}/watchlist", headers=auth_headers).status_code == 200
    assert requests.get(f"{API}/cards/tags", headers=auth_headers).status_code == 200
