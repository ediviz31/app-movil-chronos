import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://historia-connect.preview.emergentagent.com').rstrip('/')

TEST_USER = {"correo": "keilin@chronos.com", "password": "chronos123"}


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def auth_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="session")
def keilin_id(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200, r.text
    return r.json().get("_id")
