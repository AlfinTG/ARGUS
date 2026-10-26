from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email: str) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Demo@2026!"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]

def test_get_rule_catalog():
    token = get_auth_token("scrutiny@aicte.gov.in")
    resp = client.get(
        "/api/v1/rules/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    catalog = resp.json()
    assert len(catalog) >= 8
    rule_ids = [r["id"] for r in catalog]
    assert "DL-01" in rule_ids
    assert "DL-02" in rule_ids
    assert "DOC-01" in rule_ids
    assert "WF-01" in rule_ids

def test_get_and_update_rule_config():
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")
    inst_token = get_auth_token("institution@shivneri.edu.in")

    # 1. Fetch default configuration
    get_resp = client.get(
        "/api/v1/rules/config",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert get_resp.status_code == 200
    cfg = get_resp.json()
    assert cfg["reminder_days"] == 7
    assert cfg["expiry_days"] == 30

    # 2. Institution user cannot update rule configuration (Forbidden)
    unauth_resp = client.put(
        "/api/v1/rules/config",
        headers={"Authorization": f"Bearer {inst_token}"},
        json={"reminder_days": 10},
    )
    assert unauth_resp.status_code == 403

    # 3. Authorized Scrutiny Officer updates configuration
    update_resp = client.put(
        "/api/v1/rules/config",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
        json={"reminder_days": 10, "expiry_days": 45},
    )
    assert update_resp.status_code == 200
    updated_cfg = update_resp.json()
    assert updated_cfg["reminder_days"] == 10
    assert updated_cfg["expiry_days"] == 45

def test_evaluate_rules_and_idempotency_guarantee():
    token = get_auth_token("regional@aicte.gov.in")

    # 1. First evaluation cycle on simulation date 2026-10-26
    resp1 = client.post(
        "/api/v1/rules/evaluate?as_of_date=2026-10-26",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["evaluated_applications"] >= 5
    assert data1["evaluated_compliance"] >= 3
    assert data1["evaluated_documents"] >= 3
    assert data1["alerts_spawned"] > 0
    assert data1["skipped_duplicates"] == 0

    first_spawned = data1["alerts_spawned"]

    # 2. Re-run identical evaluation cycle immediately
    # Idempotency invariant: EXACTLY 0 new alerts must be spawned on repeat run!
    resp2 = client.post(
        "/api/v1/rules/evaluate?as_of_date=2026-10-26",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["alerts_spawned"] == 0
    assert data2["skipped_duplicates"] == first_spawned
    assert "No new alerts needed" in data2["message"]

def test_alerts_listing_and_filtering():
    token = get_auth_token("regional@aicte.gov.in")

    # Run evaluation to ensure alerts are generated
    client.post(
        "/api/v1/rules/evaluate?as_of_date=2026-10-26",
        headers={"Authorization": f"Bearer {token}"},
    )

    # 1. Retrieve all alerts
    resp = client.get(
        "/api/v1/alerts/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    alerts = resp.json()
    assert len(alerts) > 0

    # 2. Filter by Open status
    resp_open = client.get(
        "/api/v1/alerts/?status=Open",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_open.status_code == 200
    for a in resp_open.json():
        assert a["status"] == "Open"

def test_alert_lifecycle_and_audit_trail():
    regional_token = get_auth_token("regional@aicte.gov.in")

    # Seed alerts via evaluation
    client.post(
        "/api/v1/rules/evaluate?as_of_date=2026-10-26",
        headers={"Authorization": f"Bearer {regional_token}"},
    )

    resp = client.get(
        "/api/v1/alerts/?status=Open",
        headers={"Authorization": f"Bearer {regional_token}"},
    )
    alerts = resp.json()
    assert len(alerts) > 0
    target_alert = alerts[0]
    alert_id = target_alert["id"]

    # 1. Acknowledge alert
    ack_resp = client.post(
        f"/api/v1/alerts/{alert_id}/ack",
        headers={"Authorization": f"Bearer {regional_token}"},
    )
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "Acknowledged"

    # 2. Resolve alert
    res_resp = client.post(
        f"/api/v1/alerts/{alert_id}/resolve",
        headers={"Authorization": f"Bearer {regional_token}"},
        json={"note": "Deficiency notice issued to institution; compliance underway."},
    )
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "Resolved"

    # 3. Verify audit trail captured acknowledgement and resolution
    audit_resp = client.get(
        "/api/v1/audit/",
        headers={"Authorization": f"Bearer {regional_token}"},
    )
    assert audit_resp.status_code == 200
    events = audit_resp.json()
    alert_events = [e for e in events if e.get("event_type") == "Alert"]
    assert len(alert_events) >= 2

def test_institution_user_alert_permissions():
    inst_token = get_auth_token("institution@shivneri.edu.in")
    regional_token = get_auth_token("regional@aicte.gov.in")

    # Seed alerts
    client.post(
        "/api/v1/rules/evaluate?as_of_date=2026-10-26",
        headers={"Authorization": f"Bearer {regional_token}"},
    )

    # Find an alert escalated to Regional Officer
    resp = client.get(
        "/api/v1/alerts/",
        headers={"Authorization": f"Bearer {regional_token}"},
    )
    regional_alert = next((a for a in resp.json() if a["recipient_role"] == "Regional Officer"), None)
    assert regional_alert is not None

    # Institution user attempting to acknowledge an officer-level escalation alert should get 403 Forbidden
    forbidden_resp = client.post(
        f"/api/v1/alerts/{regional_alert['id']}/ack",
        headers={"Authorization": f"Bearer {inst_token}"},
    )
    assert forbidden_resp.status_code == 403
    assert "only acknowledge alerts addressed to them" in forbidden_resp.json()["detail"]
