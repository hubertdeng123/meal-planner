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
