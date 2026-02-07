from datetime import datetime, timedelta, timezone


def test_pantry_crud_flow(client, auth_headers):
    create = client.post(
        "/api/v1/pantry/items",
        headers=auth_headers,
        json={
            "name": "Spinach",
            "quantity": 2,
            "unit": "bags",
            "category": "Produce",
        },
    )
    assert create.status_code == 201
    item = create.json()
    assert item["name"] == "Spinach"
    item_id = item["id"]

    listing = client.get("/api/v1/pantry/?page=1&page_size=10", headers=auth_headers)
    assert listing.status_code == 200
    listing_data = listing.json()
    assert listing_data["total"] >= 1
    assert any(row["id"] == item_id for row in listing_data["items"])

    update = client.put(
        f"/api/v1/pantry/items/{item_id}",
        headers=auth_headers,
        json={"quantity": 3, "unit": "bunches"},
    )
    assert update.status_code == 200
    updated = update.json()
    assert updated["quantity"] == 3
    assert updated["unit"] == "bunches"

    delete = client.delete(f"/api/v1/pantry/items/{item_id}", headers=auth_headers)
    assert delete.status_code == 200

    listing_after = client.get(
        "/api/v1/pantry/?page=1&page_size=10", headers=auth_headers
    )
    assert listing_after.status_code == 200
    assert not any(row["id"] == item_id for row in listing_after.json()["items"])


def test_pantry_expiry_sort_places_nulls_last(client, auth_headers):
    now = datetime.now(timezone.utc)
    payloads = [
        {
            "name": "No Expiry Item",
            "quantity": 1,
            "unit": "pc",
            "category": "Pantry",
        },
        {
            "name": "Later Expiry",
            "quantity": 1,
            "unit": "pc",
            "category": "Pantry",
            "expires_at": (now + timedelta(days=5)).isoformat(),
        },
        {
            "name": "Soon Expiry",
            "quantity": 1,
            "unit": "pc",
            "category": "Pantry",
            "expires_at": (now + timedelta(days=1)).isoformat(),
        },
    ]

    for payload in payloads:
        response = client.post(
            "/api/v1/pantry/items", headers=auth_headers, json=payload
        )
        assert response.status_code == 201

    listing = client.get(
        "/api/v1/pantry/?page=1&page_size=20&sort=expires_at&order=asc",
        headers=auth_headers,
    )
    assert listing.status_code == 200
    names = [item["name"] for item in listing.json()["items"]]

    soon_index = names.index("Soon Expiry")
    later_index = names.index("Later Expiry")
    no_expiry_index = names.index("No Expiry Item")
    assert soon_index < later_index < no_expiry_index
