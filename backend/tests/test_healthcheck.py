from rest_framework.test import APIClient


def test_health_check_is_public_and_checks_database(db):
    response = APIClient().get("/api/health/")
    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "ok"
    assert data["checks"]["app"] == "ok"
    assert data["checks"]["database"] == "ok"
    # storage_backend y supabase_enabled_env son diagnósticos — no se valida el valor exacto
    assert "storage_backend" in data["checks"]
    assert "supabase_enabled_env" in data["checks"]
