"""Iteration 4 tests: multi-image, public share/vault, AI estimate."""
import os
import io
import uuid
import time
import pytest
import requests

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or 'https://cardprofitlog.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@example.com"
DEMO_PASS = "demo1234"

PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
)


# ---- fixtures ----
@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS})
    if r.status_code != 200:
        rr = requests.post(f"{API}/auth/register",
                           json={"email": DEMO_EMAIL, "password": DEMO_PASS, "name": "Demo Collector"})
        assert rr.status_code == 200
        return rr.json()["token"]
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def second_user():
    email = f"TEST_u4_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "pw12345678", "name": "Other4"})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture
def card_with_image(auth_headers, demo_token):
    """Create card + upload primary image. Yields (card_id, primary_path)."""
    r = requests.post(f"{API}/cards", headers=auth_headers,
                      json={"year": 2020, "name": "TEST_I4_Card", "price_paid": 50.0,
                            "price_sold": 99.0, "expenses": 2.0, "where_bought": "eBay",
                            "status": "sold", "sport": "Basketball", "tags": ["rookie"]})
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    files = {"file": ("a.png", PNG, "image/png")}
    h = {"Authorization": f"Bearer {demo_token}"}
    ru = requests.post(f"{API}/cards/{cid}/image", headers=h, files=files)
    assert ru.status_code == 200, ru.text
    primary = ru.json()["image_path"]
    yield cid, primary
    requests.delete(f"{API}/cards/{cid}", headers=auth_headers)


# ---- Multi-image: POST replace=false, PUT primary-image, DELETE image ----
def test_add_additional_image_append(auth_headers, demo_token, card_with_image):
    cid, primary = card_with_image
    files = {"file": ("b.png", PNG, "image/png")}
    h = {"Authorization": f"Bearer {demo_token}"}
    r = requests.post(f"{API}/cards/{cid}/image?replace=false", headers=h, files=files)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["image_path"] == primary
    assert isinstance(d.get("images"), list) and len(d["images"]) == 1
    assert d["images"][0] != primary


def test_set_primary_image_swaps(auth_headers, demo_token, card_with_image):
    cid, primary = card_with_image
    files = {"file": ("b.png", PNG, "image/png")}
    h = {"Authorization": f"Bearer {demo_token}"}
    r = requests.post(f"{API}/cards/{cid}/image?replace=false", headers=h, files=files)
    second = r.json()["images"][0]
    # swap
    rs = requests.put(f"{API}/cards/{cid}/primary-image?path={second}", headers=auth_headers)
    assert rs.status_code == 200, rs.text
    d = rs.json()
    assert d["image_path"] == second
    assert primary in d["images"] and second not in d["images"]


def test_set_primary_unknown_path_400(auth_headers, card_with_image):
    cid, _ = card_with_image
    r = requests.put(f"{API}/cards/{cid}/primary-image?path=bogus/nope.png", headers=auth_headers)
    assert r.status_code == 400


def test_delete_specific_additional_image(auth_headers, demo_token, card_with_image):
    cid, primary = card_with_image
    h = {"Authorization": f"Bearer {demo_token}"}
    r = requests.post(f"{API}/cards/{cid}/image?replace=false", headers=h,
                      files={"file": ("b.png", PNG, "image/png")})
    second = r.json()["images"][0]
    rd = requests.delete(f"{API}/cards/{cid}/image?path={second}", headers=auth_headers)
    assert rd.status_code == 200
    g = requests.get(f"{API}/cards/{cid}", headers=auth_headers)
    assert g.json()["image_path"] == primary
    assert second not in (g.json().get("images") or [])


def test_delete_primary_image_clears_it(auth_headers, demo_token, card_with_image):
    cid, primary = card_with_image
    rd = requests.delete(f"{API}/cards/{cid}/image?path={primary}", headers=auth_headers)
    assert rd.status_code == 200
    g = requests.get(f"{API}/cards/{cid}", headers=auth_headers)
    assert g.json().get("image_path") in (None, "")


# ---- Share per-card ----
def test_share_create_and_revoke(auth_headers, card_with_image):
    cid, _ = card_with_image
    r = requests.post(f"{API}/cards/{cid}/share", headers=auth_headers)
    assert r.status_code == 200
    tok = r.json()["share_token"]
    assert tok and tok.startswith("c_")
    # idempotent
    r2 = requests.post(f"{API}/cards/{cid}/share", headers=auth_headers)
    assert r2.json()["share_token"] == tok
    # persisted on card
    g = requests.get(f"{API}/cards/{cid}", headers=auth_headers)
    assert g.json().get("share_token") == tok
    # revoke
    rd = requests.delete(f"{API}/cards/{cid}/share", headers=auth_headers)
    assert rd.status_code == 200
    g2 = requests.get(f"{API}/cards/{cid}", headers=auth_headers)
    assert g2.json().get("share_token") in (None, "")


def test_public_card_sanitized(auth_headers, card_with_image):
    cid, primary = card_with_image
    tok = requests.post(f"{API}/cards/{cid}/share", headers=auth_headers).json()["share_token"]
    r = requests.get(f"{API}/public/card/{tok}")  # no auth
    assert r.status_code == 200
    d = r.json()
    card = d["card"]
    # sanitized: no cost/sales info
    for k in ("price_paid", "price_sold", "expenses", "where_bought"):
        assert k not in card, f"{k} leaked in public view"
    # public fields present
    assert card["name"] == "TEST_I4_Card"
    assert card["image_path"] == primary
    assert d["owner"] and "name" in d["owner"]


def test_public_card_bad_token_404():
    r = requests.get(f"{API}/public/card/c_nonexistent_xyz")
    assert r.status_code == 404


# ---- Public vault ----
def test_public_vault_toggle(auth_headers):
    r1 = requests.post(f"{API}/users/me/public-vault?enabled=true", headers=auth_headers)
    assert r1.status_code == 200
    tok = r1.json()["public_vault_token"]
    assert tok and tok.startswith("v_")
    # idempotent
    r2 = requests.post(f"{API}/users/me/public-vault?enabled=true", headers=auth_headers)
    assert r2.json()["public_vault_token"] == tok
    # /auth/me reflects
    me = requests.get(f"{API}/auth/me", headers=auth_headers).json()
    assert me.get("public_vault_token") == tok
    # fetch public vault unauthenticated
    g = requests.get(f"{API}/public/vault/{tok}")
    assert g.status_code == 200
    d = g.json()
    assert "owner" in d and "cards" in d
    for c in d["cards"]:
        for k in ("price_paid", "price_sold", "expenses", "where_bought"):
            assert k not in c
    # disable
    rd = requests.post(f"{API}/users/me/public-vault?enabled=false", headers=auth_headers)
    assert rd.status_code == 200
    assert rd.json()["enabled"] is False
    # old token now 404
    r404 = requests.get(f"{API}/public/vault/{tok}")
    assert r404.status_code == 404


# ---- Public image path validation ----
def test_public_image_serves_authorized_path(auth_headers, card_with_image):
    cid, primary = card_with_image
    tok = requests.post(f"{API}/cards/{cid}/share", headers=auth_headers).json()["share_token"]
    r = requests.get(f"{API}/public/image/{tok}/{primary}")
    assert r.status_code == 200
    assert len(r.content) > 0


def test_public_image_rejects_unrelated_path(auth_headers, demo_token, card_with_image):
    # Another card with its own image
    cid, primary = card_with_image
    tok = requests.post(f"{API}/cards/{cid}/share", headers=auth_headers).json()["share_token"]
    # make 2nd card with different image
    r2 = requests.post(f"{API}/cards", headers=auth_headers,
                       json={"year": 2022, "name": "TEST_I4_Other", "price_paid": 1})
    cid2 = r2.json()["id"]
    ru = requests.post(f"{API}/cards/{cid2}/image",
                       headers={"Authorization": f"Bearer {demo_token}"},
                       files={"file": ("z.png", PNG, "image/png")})
    other_path = ru.json()["image_path"]
    # path belongs to card2, not to card1's share token -> 404
    r = requests.get(f"{API}/public/image/{tok}/{other_path}")
    assert r.status_code == 404
    # cleanup
    requests.delete(f"{API}/cards/{cid2}", headers=auth_headers)


def test_public_image_bogus_path_404(auth_headers, card_with_image):
    cid, _ = card_with_image
    tok = requests.post(f"{API}/cards/{cid}/share", headers=auth_headers).json()["share_token"]
    r = requests.get(f"{API}/public/image/{tok}/does/not/exist.png")
    assert r.status_code == 404


# ---- Share cannot be created by non-owner ----
def test_share_access_isolation(auth_headers, second_user, card_with_image):
    cid, _ = card_with_image
    h2 = {"Authorization": f"Bearer {second_user}", "Content-Type": "application/json"}
    r = requests.post(f"{API}/cards/{cid}/share", headers=h2)
    assert r.status_code == 404


# ---- AI Estimate ----
def test_ai_estimate_returns_ranges(auth_headers):
    # create a watchlist item
    rc = requests.post(f"{API}/watchlist", headers=auth_headers,
                       json={"year": 2018, "name": "TEST_I4_Luka Doncic Prizm Silver RC",
                             "sport": "Basketball", "tags": ["rookie", "silver prizm"],
                             "notes": "iconic rookie card"})
    wid = rc.json()["id"]
    try:
        r = requests.post(f"{API}/watchlist/{wid}/estimate", headers=auth_headers, timeout=60)
        # Per spec, 502 acceptable if Claude returns non-JSON
        if r.status_code == 502:
            pytest.skip("Claude returned non-JSON; acceptable per spec")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("low", "high", "typical", "note", "generated_at"):
            assert k in d, f"missing {k}"
        assert d["low"] >= 0 and d["high"] >= d["low"]
        assert d["typical"] >= d["low"] and d["typical"] <= d["high"]
        # persisted
        g = requests.get(f"{API}/watchlist", headers=auth_headers)
        item = [i for i in g.json() if i["id"] == wid][0]
        assert item.get("ai_estimate") is not None
        assert item["ai_estimate"]["typical"] == d["typical"]
    finally:
        requests.delete(f"{API}/watchlist/{wid}", headers=auth_headers)


def test_ai_estimate_404_unknown_item(auth_headers):
    r = requests.post(f"{API}/watchlist/nonexistent-id/estimate", headers=auth_headers)
    assert r.status_code == 404
