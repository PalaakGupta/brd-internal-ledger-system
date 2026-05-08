import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_token

client = TestClient(app)

def get_auth_headers(user_id=1, email="palak@office.com"):
    token = create_token(user_id, email)
    return {"Authorization": f"Bearer {token}"}

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200

def test_login_valid():
    response = client.post("/login", json={
        "email": "palak@office.com",
        "password": "password123"
    })
    assert response.status_code == 200
    assert "token" in response.json()

def test_login_invalid():
    response = client.post("/login", json={
        "email": "palak@office.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_get_balance_valid_user():
    response = client.get("/balance/1", headers=get_auth_headers())
    assert response.status_code == 200
    assert "balance" in response.json()

def test_get_balance_invalid_user():
    response = client.get("/balance/999", headers=get_auth_headers(999, "x@x.com"))
    assert response.status_code == 404

def test_get_balance_wrong_user():
    response = client.get("/balance/2", headers=get_auth_headers(1, "palak@office.com"))
    assert response.status_code == 403

def test_deposit_increases_balance():
    before = client.get("/balance/1", headers=get_auth_headers()).json()["balance"]
    response = client.post("/transact", headers=get_auth_headers(), json={
        "user_id": 1,
        "type": "deposit",
        "amount": 50.00,
        "description": "test deposit"
    })
    assert response.status_code == 200
    assert response.json()["new_balance"] == before + 50.00

def test_insufficient_funds_rejected():
    response = client.post("/transact", headers=get_auth_headers(), json={
        "user_id": 1,
        "type": "deduct",
        "amount": 99999.00,
        "description": "attempt overdraft"
    })
    assert response.status_code == 400
    assert "Insufficient funds" in response.json()["detail"]

def test_negative_amount_rejected():
    response = client.post("/transact", headers=get_auth_headers(), json={
        "user_id": 1,
        "type": "deposit",
        "amount": -100
    })
    assert response.status_code == 422

def test_transactions_returns_list():
    response = client.get("/transactions/1", headers=get_auth_headers())
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_transactions_max_20():
    response = client.get("/transactions/1", headers=get_auth_headers())
    assert len(response.json()) <= 20