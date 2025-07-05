import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi import HTTPException
from app.services.email_service import EmailService
from app.api.endpoints.notifications import (
    send_grocery_list_notification,
    GroceryNotificationRequest,
)
from app.models.meal_plan import GroceryList, GroceryItem


class TestGroceryNotificationEmailService:
    """Test the email service functionality for grocery notifications"""

    @pytest.mark.asyncio
    @patch.object(EmailService, "send_email", new_callable=AsyncMock)
    async def test_send_grocery_notification_basic(self, mock_send_email):
        """Test basic grocery notification sending without items"""
        mock_send_email.return_value = True

        email_service = EmailService()
        mock_user = Mock()
        mock_user.email = "test@example.com"
        mock_user.username = "Test User"

        result = await email_service.send_grocery_list_notification(
            user=mock_user,
            grocery_list=None,
            grocery_items=None,
            item_count=0,
            additional_emails=[],
        )

        assert result["total_sent"] == 1
        assert result["total_failed"] == 0
        assert "test@example.com" in result["sent_to"]

    @pytest.mark.asyncio
    @patch.object(EmailService, "send_email", new_callable=AsyncMock)
    async def test_send_grocery_notification_with_items(self, mock_send_email):
        """Test grocery notification with actual items"""
        mock_send_email.return_value = True

        email_service = EmailService()
        mock_user = Mock()
        mock_user.email = "test@example.com"
        mock_user.username = "Test User"

        mock_items = {
            "Produce": [Mock(name="Bananas", quantity=2, unit="lbs")],
            "Dairy": [Mock(name="Milk", quantity=1, unit="gallon")],
        }

        result = await email_service.send_grocery_list_notification(
            user=mock_user,
            grocery_list=None,
            grocery_items=mock_items,
            item_count=2,
            additional_emails=[],
        )

        assert result["total_sent"] == 1
        assert result["total_failed"] == 0

    @pytest.mark.asyncio
    @patch.object(EmailService, "send_email", new_callable=AsyncMock)
    async def test_send_grocery_notification_additional_emails(self, mock_send_email):
        """Test sending to additional email addresses"""
        mock_send_email.return_value = True

        email_service = EmailService()
        mock_user = Mock()
        mock_user.email = "test@example.com"
        mock_user.username = "Test User"

        additional_emails = ["friend1@example.com", "friend2@example.com"]

        result = await email_service.send_grocery_list_notification(
            user=mock_user,
            grocery_list=None,
            grocery_items=None,
            item_count=0,
            additional_emails=additional_emails,
        )

        assert result["total_sent"] == 3  # User + 2 additional
        assert result["total_failed"] == 0
        assert "test@example.com" in result["sent_to"]
        assert "friend1@example.com" in result["sent_to"]
        assert "friend2@example.com" in result["sent_to"]

    @pytest.mark.asyncio
    @patch.object(EmailService, "send_email", new_callable=AsyncMock)
    async def test_send_grocery_notification_partial_failure(self, mock_send_email):
        """Test partial failure when sending to multiple emails"""
        email_service = EmailService()
        mock_user = Mock()
        mock_user.email = "test@example.com"
        mock_user.username = "Test User"

        additional_emails = ["friend1@example.com", "invalid@email"]

        def mock_send_email_side_effect(to_email, **kwargs):
            # Simulate failure for invalid email
            if to_email == "invalid@email":
                raise Exception("Invalid email address")
            return True

        mock_send_email.side_effect = mock_send_email_side_effect

        result = await email_service.send_grocery_list_notification(
            user=mock_user,
            grocery_list=None,
            grocery_items=None,
            item_count=0,
            additional_emails=additional_emails,
        )

        assert result["total_sent"] == 2  # User + 1 successful additional
        assert result["total_failed"] == 1
        assert len(result["failed"]) == 1
        assert result["failed"][0]["email"] == "invalid@email"

    @pytest.mark.asyncio
    @patch.object(EmailService, "send_email", new_callable=AsyncMock)
    async def test_send_grocery_notification_all_failed(self, mock_send_email):
        """Test when all email sends fail"""
        mock_send_email.side_effect = Exception("SMTP error")

        email_service = EmailService()
        mock_user = Mock()
        mock_user.email = "test@example.com"
        mock_user.username = "Test User"

        result = await email_service.send_grocery_list_notification(
            user=mock_user,
            grocery_list=None,
            grocery_items=None,
            item_count=0,
            additional_emails=["friend@example.com"],
        )

        assert result["total_sent"] == 0
        assert result["total_failed"] == 2
        assert len(result["failed"]) == 2


class TestGroceryNotificationAPI:
    """Test the API endpoint functionality for grocery notifications"""

    @pytest.mark.asyncio
    @patch(
        "app.api.endpoints.notifications.email_service.send_grocery_list_notification",
        new_callable=AsyncMock,
    )
    async def test_send_notification_basic(self, mock_email_service, test_user, db):
        """Test basic notification sending without grocery list ID"""
        mock_email_service.return_value = {
            "sent_to": ["test@example.com"],
            "failed": [],
            "total_sent": 1,
            "total_failed": 0,
        }

        request = GroceryNotificationRequest()
        result = await send_grocery_list_notification(
            request=request, current_user=test_user, db=db
        )

        assert result["total_sent"] == 1
        assert test_user.email in result["sent_to"]

    @pytest.mark.asyncio
    @patch(
        "app.api.endpoints.notifications.email_service.send_grocery_list_notification",
        new_callable=AsyncMock,
    )
    async def test_send_notification_with_grocery_list(
        self, mock_email_service, test_user, db
    ):
        """Test notification sending with grocery list ID"""
        # Create a grocery list with items
        grocery_list = GroceryList(user_id=test_user.id)
        db.add(grocery_list)
        db.commit()
        db.refresh(grocery_list)

        # Add some items
        item1 = GroceryItem(
            grocery_list_id=grocery_list.id,
            name="Test Item 1",
            quantity=2,
            unit="lbs",
            category="Produce",
            checked=False,
        )
        item2 = GroceryItem(
            grocery_list_id=grocery_list.id,
            name="Test Item 2",
            quantity=1,
            unit="gallon",
            category="Dairy",
            checked=True,  # This should be filtered out
        )
        db.add(item1)
        db.add(item2)
        db.commit()

        mock_email_service.return_value = {
            "sent_to": ["test@example.com"],
            "failed": [],
            "total_sent": 1,
            "total_failed": 0,
        }

        request = GroceryNotificationRequest(grocery_list_id=grocery_list.id)
        result = await send_grocery_list_notification(
            request=request, current_user=test_user, db=db
        )

        assert result["total_sent"] == 1
        # Verify that the email service was called
        mock_email_service.assert_called_once()
        call_args = mock_email_service.call_args
        assert call_args.kwargs["user"] == test_user
        assert call_args.kwargs["grocery_list"] == grocery_list
        assert call_args.kwargs["item_count"] == 1  # Only unchecked item

    @pytest.mark.asyncio
    @patch(
        "app.api.endpoints.notifications.email_service.send_grocery_list_notification",
        new_callable=AsyncMock,
    )
    async def test_send_notification_with_additional_emails(
        self, mock_email_service, test_user, db
    ):
        """Test notification sending with additional emails"""
        mock_email_service.return_value = {
            "sent_to": ["test@example.com", "friend@example.com"],
            "failed": [],
            "total_sent": 2,
            "total_failed": 0,
        }

        request = GroceryNotificationRequest(additional_emails=["friend@example.com"])
        result = await send_grocery_list_notification(
            request=request, current_user=test_user, db=db
        )

        assert result["total_sent"] == 2
        assert "friend@example.com" in result["sent_to"]

    @pytest.mark.asyncio
    async def test_send_notification_invalid_emails(self, test_user, db):
        """Test notification with invalid email addresses"""
        request = GroceryNotificationRequest(
            additional_emails=["invalid-email", "@invalid.com"]
        )

        with pytest.raises(HTTPException) as exc_info:
            await send_grocery_list_notification(
                request=request, current_user=test_user, db=db
            )

        assert exc_info.value.status_code == 400
        assert "Invalid email addresses" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_send_notification_disabled_notifications(self, test_user, db):
        """Test when user has notifications disabled"""
        # Disable notifications for user
        test_user.email_notifications_enabled = False
        db.commit()

        request = GroceryNotificationRequest()

        with pytest.raises(HTTPException) as exc_info:
            await send_grocery_list_notification(
                request=request, current_user=test_user, db=db
            )

        assert exc_info.value.status_code == 400
        assert "disabled" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_send_notification_grocery_list_not_found(self, test_user, db):
        """Test with non-existent grocery list ID"""
        request = GroceryNotificationRequest(grocery_list_id=99999)

        with pytest.raises(HTTPException) as exc_info:
            await send_grocery_list_notification(
                request=request, current_user=test_user, db=db
            )

        assert exc_info.value.status_code == 404
        assert "not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    @patch(
        "app.api.endpoints.notifications.email_service.send_grocery_list_notification",
        new_callable=AsyncMock,
    )
    async def test_send_notification_partial_failure(
        self, mock_email_service, test_user, db
    ):
        """Test partial failure when sending to multiple emails"""
        mock_email_service.return_value = {
            "sent_to": ["test@example.com"],
            "failed": [{"email": "friend@example.com", "error": "SMTP error"}],
            "total_sent": 1,
            "total_failed": 1,
        }

        request = GroceryNotificationRequest(additional_emails=["friend@example.com"])
        result = await send_grocery_list_notification(
            request=request, current_user=test_user, db=db
        )

        assert result["total_sent"] == 1
        assert result["total_failed"] == 1
        assert len(result["failed"]) == 1

    @pytest.mark.asyncio
    @patch(
        "app.api.endpoints.notifications.email_service.send_grocery_list_notification",
        new_callable=AsyncMock,
    )
    async def test_send_notification_all_failed(
        self, mock_email_service, test_user, db
    ):
        """Test when all notifications fail to send"""
        mock_email_service.return_value = {
            "sent_to": [],
            "failed": [
                {"email": "test@example.com", "error": "SMTP error"},
                {"email": "friend@example.com", "error": "Invalid email"},
            ],
            "total_sent": 0,
            "total_failed": 2,
        }

        request = GroceryNotificationRequest(additional_emails=["friend@example.com"])

        # When all emails fail to send, the endpoint should raise an HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await send_grocery_list_notification(
                request=request, current_user=test_user, db=db
            )

        assert exc_info.value.status_code == 500
        assert "Failed to send notifications" in str(exc_info.value.detail)


class TestGroceryNotificationIntegration:
    """Integration tests for grocery notifications"""

    @pytest.mark.asyncio
    async def test_full_grocery_notification_flow(
        self, client, test_user, auth_headers, db
    ):
        """Test complete grocery notification flow from API to email service"""
        # Create a grocery list with items
        grocery_list = GroceryList(user_id=test_user.id)
        db.add(grocery_list)
        db.commit()
        db.refresh(grocery_list)

        # Add some items
        item1 = GroceryItem(
            grocery_list_id=grocery_list.id,
            name="Test Item 1",
            quantity=2,
            unit="lbs",
            category="Produce",
            checked=False,
        )
        item2 = GroceryItem(
            grocery_list_id=grocery_list.id,
            name="Test Item 2",
            quantity=1,
            unit="gallon",
            category="Dairy",
            checked=True,  # This should be filtered out
        )
        db.add(item1)
        db.add(item2)
        db.commit()

        # Mock the email service
        with patch(
            "app.services.email_service.EmailService.send_email", new_callable=AsyncMock
        ) as mock_send_email:
            mock_send_email.return_value = True

            response = client.post(
                "/api/v1/notifications/send-grocery-notification/",
                json={
                    "grocery_list_id": grocery_list.id,
                    "additional_emails": ["friend@example.com"],
                },
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["total_sent"] == 2  # User + 1 additional
        assert test_user.email in data["sent_to"]
        assert "friend@example.com" in data["sent_to"]

    @pytest.mark.asyncio
    async def test_grocery_notification_email_validation(
        self, client, test_user, auth_headers
    ):
        """Test email validation in grocery notification API"""
        response = client.post(
            "/api/v1/notifications/send-grocery-notification/",
            json={
                "additional_emails": [
                    "invalid-email",
                    "valid@example.com",
                    "@invalid.com",
                ]
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid email addresses" in response.json()["detail"]
        assert "invalid-email" in response.json()["detail"]
        assert "@invalid.com" in response.json()["detail"]
