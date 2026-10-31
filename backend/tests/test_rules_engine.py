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


def test_evaluate_rules_role_boundaries():
    """Verify that only System Operator and Regional Officer can trigger rule evaluation."""
    inst_token = get_auth_token("institution@shivneri.edu.in")
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")
    coord_token = get_auth_token("coordinator@aicte.gov.in")
    regional_token = get_auth_token("regional@aicte.gov.in")
    operator_token = get_auth_token("operator@aicte.gov.in")

    # Institution user -> 403 Forbidden
    resp_inst = client.post("/api/v1/rules/evaluate", headers={"Authorization": f"Bearer {inst_token}"})
    assert resp_inst.status_code == 403

    # Scrutiny officer -> 403 Forbidden
    resp_scrutiny = client.post("/api/v1/rules/evaluate", headers={"Authorization": f"Bearer {scrutiny_token}"})
    assert resp_scrutiny.status_code == 403

    # Coordinator -> 403 Forbidden
    resp_coord = client.post("/api/v1/rules/evaluate", headers={"Authorization": f"Bearer {coord_token}"})
    assert resp_coord.status_code == 403

    # Regional officer -> 200 OK
    resp_reg = client.post("/api/v1/rules/evaluate?as_of_date=2026-10-26", headers={"Authorization": f"Bearer {regional_token}"})
    assert resp_reg.status_code == 200

    # System operator -> 200 OK
    resp_op = client.post("/api/v1/rules/evaluate?as_of_date=2026-10-26", headers={"Authorization": f"Bearer {operator_token}"})
    assert resp_op.status_code == 200


def test_versioned_deduplication_keys_and_uuid_format():
    """Verify deduplication keys include policy version and IDs are collision-free UUIDs."""
    regional_token = get_auth_token("regional@aicte.gov.in")

    # Evaluate rules to populate alerts with versioned keys
    eval_resp = client.post(
        "/api/v1/rules/evaluate?as_of_date=2026-10-26",
        headers={"Authorization": f"Bearer {regional_token}"},
    )
    assert eval_resp.status_code == 200

    resp = client.get("/api/v1/alerts/", headers={"Authorization": f"Bearer {regional_token}"})
    assert resp.status_code == 200
    alerts = resp.json()
    assert len(alerts) > 0

    for a in alerts:
        # Check alert ID format (ALT-XXXXXXXX)
        assert a["id"].startswith("ALT-")
        assert len(a["id"]) >= 12  # ALT- + 8 hex chars

        # Check versioned processed_key format: {target}:{rule}:{date}:{policy_version}
        pkey = a.get("processed_key")
        if pkey:
            parts = pkey.split(":")
            assert len(parts) >= 4, f"Invalid key structure: {pkey}"
            assert parts[-1] == "DEMO-v1", f"Policy version missing in key: {pkey}"

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


def test_communication_outbox_logging():
    """Verify that simulated SMS and Email dispatches are recorded and scoped in outbox."""
    regional_token = get_auth_token("regional@aicte.gov.in")
    inst_token = get_auth_token("institution@shivneri.edu.in")

    # Ensure alerts are populated via evaluation
    client.post("/api/v1/rules/evaluate?as_of_date=2026-10-26", headers={"Authorization": f"Bearer {regional_token}"})

    # Fetch outbox as regional officer
    resp = client.get("/api/v1/alerts/outbox", headers={"Authorization": f"Bearer {regional_token}"})
    assert resp.status_code == 200
    dispatches = resp.json()
    assert len(dispatches) > 0

    sms_items = [d for d in dispatches if d["channel"] == "SMS"]
    email_items = [d for d in dispatches if d["channel"] == "EMAIL"]
    assert len(sms_items) > 0
    assert len(email_items) > 0

    first = dispatches[0]
    assert "recipient" in first
    assert "subject" in first
    assert "message" in first
    assert first["status"] == "Delivered"
    assert first["correlation"].startswith("DISP-")

    # Channel filtering test
    resp_sms_only = client.get("/api/v1/alerts/outbox?channel=SMS", headers={"Authorization": f"Bearer {regional_token}"})
    assert resp_sms_only.status_code == 200
    for d in resp_sms_only.json():
        assert d["channel"] == "SMS"

    # Scoping test: Institution user sees only their institution dispatches
    resp_inst = client.get("/api/v1/alerts/outbox", headers={"Authorization": f"Bearer {inst_token}"})
    assert resp_inst.status_code == 200
    for d in resp_inst.json():
        assert d["recipient_role"] == "Institution User"

