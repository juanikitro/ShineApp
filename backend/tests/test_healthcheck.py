from rest_framework.test import APIClient


def test_health_check_is_public_and_checks_database(db):
    response = APIClient().get("/api/health/")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {
            "app": "ok",
            "database": "ok",
        },
    }
