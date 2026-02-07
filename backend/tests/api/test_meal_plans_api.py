from datetime import date, timedelta


def test_create_meal_plan_rejects_invalid_date_range(client, auth_headers):
    response = client.post(
        "/api/v1/meal-plans/",
        headers=auth_headers,
        json={
            "name": "Broken Plan",
            "start_date": str(date.today() + timedelta(days=7)),
            "end_date": str(date.today()),
        },
    )

    assert response.status_code == 422
    payload = response.json()
    assert "start_date must be on or before end_date" in str(payload)


def test_update_meal_plan_rejects_invalid_date_range(client, auth_headers):
    create_response = client.post(
        "/api/v1/meal-plans/",
        headers=auth_headers,
        json={
            "name": "Valid Plan",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=6)),
        },
    )
    assert create_response.status_code == 201
    meal_plan_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/v1/meal-plans/{meal_plan_id}",
        headers=auth_headers,
        json={"start_date": str(date.today() + timedelta(days=10))},
    )

    assert update_response.status_code == 400
    assert (
        update_response.json()["detail"] == "start_date must be on or before end_date"
    )
