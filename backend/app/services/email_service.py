import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from jinja2 import Environment, DictLoader, TemplateError
from app.core.config import settings
from app.core.exceptions import (
    EmailServiceError,
    SMTPConfigurationError,
    SMTPConnectionError,
    SMTPAuthenticationError,
    EmailDeliveryError,
    EmailTemplateError,
)
from app.models import User
import logging
import socket

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_use_tls = settings.SMTP_USE_TLS
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME
        self.base_url = settings.BASE_URL

        # Validate configuration on initialization
        self._validate_configuration()

        # Email templates
        self.template_env = Environment(loader=DictLoader(self._get_templates()))

    def _validate_configuration(self):
        """Validate that required email configuration is present"""
        if not self.smtp_host:
            raise SMTPConfigurationError("SMTP host is not configured")
        if not self.from_email:
            raise SMTPConfigurationError("From email address is not configured")
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP authentication not configured - emails may fail")

    def _get_templates(self) -> dict:
        """Email templates using Jinja2"""
        return {
            "weekly_reminder": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Weekly Meal Planning Reminder</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #f97316; margin-bottom: 10px; }
        .subtitle { color: #666; font-size: 16px; }
        .content { margin-bottom: 30px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 10px 5px; transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .benefits { background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .benefit-item { margin: 10px 0; display: flex; align-items: center; }
        .benefit-icon { color: #f59e0b; margin-right: 10px; font-weight: bold; }
        .footer { text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; }
        .unsubscribe { color: #999; font-size: 12px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🍳 Meal Assistant</div>
            <div class="subtitle">Your weekly meal planning reminder</div>
        </div>

        <div class="content">
            <h2>Hi {{ user.username }}! 👋</h2>
            <p>Hope you're having a great {{ day_name }}! It's time to plan your meals for the upcoming week.</p>

            <div class="benefits">
                <h3>Why plan your week?</h3>
                <div class="benefit-item">
                    <span class="benefit-icon">⏰</span>
                    <span>Save time during busy weekdays</span>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">💰</span>
                    <span>Reduce food waste and grocery costs</span>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">🎯</span>
                    <span>Stick to your dietary goals</span>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">😌</span>
                    <span>Less stress about "what's for dinner?"</span>
                </div>
            </div>

            <p>Ready to plan your week? Here's what you can do:</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ base_url }}/meal-planning" class="cta-button">
                📅 Plan This Week's Meals
            </a>
            <a href="{{ base_url }}/generate" class="cta-button">
                ✨ Generate New Recipe
            </a>
        </div>

        {% if recent_recipes %}
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Your Recent Favorites</h3>
            {% for recipe in recent_recipes %}
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 5px;">
                <strong>{{ recipe.name }}</strong>
                {% if recipe.rating %}
                <span style="color: #fbbf24;">{{ "⭐" * recipe.rating }}</span>
                {% endif %}
            </div>
            {% endfor %}
        </div>
        {% endif %}

        <div class="footer">
            <p>Happy cooking!</p>
            <p>The Meal Assistant Team</p>
            <div class="unsubscribe">
                <a href="{{ base_url }}/settings" style="color: #999;">Update notification preferences</a>
            </div>
        </div>
    </div>
</body>
</html>
            """,
            "weekly_meal_plan_ready": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your Weekly Meal Plan is Ready!</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #fef3c7 0%, #fef3c7 100%);
        }

        .container {
            max-width: 650px;
            margin: 0 auto;
            background-color: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08), 0 1px 8px rgba(0,0,0,0.05);
        }

        .header {
            background: linear-gradient(135deg, #f97316, #fb923c, #fdba74);
            text-align: center;
            padding: 40px 20px;
            color: white;
        }

        .header-icon {
            font-size: 48px;
            margin-bottom: 16px;
            display: block;
        }

        .header-title {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
        }

        .header-subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 400;
            margin: 0;
        }

        .content {
            padding: 40px 30px;
        }

        .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin: 0 0 16px 0;
        }

        .intro-text {
            font-size: 16px;
            color: #6b7280;
            margin: 0 0 32px 0;
            line-height: 1.6;
        }

        .meal-plan-section {
            background-color: #fefbf2;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #fed7aa;
        }

        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
        }

        .section-icon {
            margin-right: 8px;
            font-size: 18px;
        }

        .day-container {
            margin-bottom: 20px;
        }

        .day-container:last-child {
            margin-bottom: 0;
        }

        .day-header {
            font-size: 16px;
            font-weight: 600;
            color: #f97316;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #fed7aa;
        }

        .recipe-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            background: white;
            border-radius: 6px;
            margin-bottom: 6px;
            border: 1px solid #fed7aa;
        }

        .meal-type {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            color: #92400e;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 12px;
            margin-right: 12px;
            min-width: 60px;
            text-align: center;
            text-transform: uppercase;
        }

        .recipe-name {
            font-weight: 500;
            color: #111827;
            font-size: 14px;
        }

        .grocery-section {
            background-color: #f0fdf4;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #bbf7d0;
        }

        .category-container {
            margin-bottom: 20px;
        }

        .category-container:last-child {
            margin-bottom: 0;
        }

        .category-header {
            display: flex;
            align-items: center;
            font-size: 14px;
            font-weight: 600;
            color: #059669;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid #d1fae5;
        }

        .category-icon {
            margin-right: 6px;
            font-size: 14px;
        }

        .grocery-items {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 6px;
        }

        .grocery-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #d1fae5;
            font-size: 13px;
        }

        .item-name {
            font-weight: 500;
            color: #111827;
            flex: 1;
        }

        .item-quantity {
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
            color: #1e40af;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 8px;
            white-space: nowrap;
        }

        .cta-section {
            text-align: center;
            margin: 30px 0;
            padding: 24px 0;
            background: linear-gradient(135deg, #fef9f3, #fef3c7);
            border-radius: 12px;
        }

        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316, #fb923c);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
            transition: all 0.3s ease;
            margin: 0 8px;
        }

        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
            text-decoration: none;
            color: white;
        }

        .footer {
            background: #fafafa;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            padding: 24px 30px;
            border-top: 1px solid #e5e7eb;
        }

        .footer p {
            margin: 4px 0;
        }

        .footer-brand {
            font-weight: 600;
            color: #111827;
        }

        /* Category Icons */
        .cat-produce::before { content: '🥕'; }
        .cat-dairy::before { content: '🥛'; }
        .cat-meat::before { content: '🥩'; }
        .cat-pantry::before { content: '🏺'; }
        .cat-bakery::before { content: '🍞'; }
        .cat-frozen::before { content: '🧊'; }
        .cat-snacks::before { content: '🍿'; }
        .cat-beverages::before { content: '🥤'; }
        .cat-other::before { content: '📦'; }

        /* Responsive Design */
        @media only screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; }
            .content { padding: 24px 20px; }
            .header { padding: 30px 20px; }
            .header-title { font-size: 28px; }
            .grocery-items { grid-template-columns: 1fr; }
            .recipe-item { flex-direction: column; align-items: flex-start; }
            .meal-type { margin-bottom: 4px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="header-icon">📅</span>
            <div class="header-title">Weekly Meal Plan Ready!</div>
            <div class="header-subtitle">Your recipes and shopping list for the week</div>
        </div>

        <div class="content">
            <div class="greeting">Hi {{ user.username }}! 👋</div>
            <p class="intro-text">
                Your weekly meal plan {% if meal_plan %}for {{ meal_plan.name }} {% endif %}is ready!
                Here's your recipe lineup and grocery list to make this week delicious and stress-free.
            </p>

            {% if weekly_recipes %}
            <div class="meal-plan-section">
                <div class="section-title">
                    <span class="section-icon">🍳</span>
                    This Week's Recipe Menu
                </div>

                {% for day_name, day_recipes in weekly_recipes.items() %}
                <div class="day-container">
                    <div class="day-header">{{ day_name|title }}</div>
                    {% for recipe in day_recipes %}
                    <div class="recipe-item">
                        <span class="meal-type">{{ recipe.meal_type }}</span>
                        <span class="recipe-name">{{ recipe.name }}</span>
                    </div>
                    {% endfor %}
                </div>
                {% endfor %}
            </div>
            {% endif %}

            {% if grocery_items %}
            <div class="grocery-section">
                <div class="section-title">
                    <span class="section-icon">🛒</span>
                    Your Shopping List ({{ item_count }} items)
                </div>

                {% for category, items in grocery_items.items() %}
                <div class="category-container">
                    <div class="category-header">
                        <span class="category-icon cat-{{ category.lower() }}"></span>
                        {{ category }}
                    </div>
                    <div class="grocery-items">
                        {% for item in items %}
                        <div class="grocery-item">
                            <span class="item-name">{{ item.name|title }}</span>
                            {% if item.quantity and item.unit %}
                            {% set clean_quantity = item.quantity|int if item.quantity == item.quantity|int else item.quantity %}
                            <span class="item-quantity">{{ clean_quantity }} {{ item.unit }}</span>
                            {% endif %}
                        </div>
                        {% endfor %}
                    </div>
                </div>
                {% endfor %}
            </div>
            {% endif %}
        </div>

        <div class="cta-section">
            <a href="{{ base_url }}/meal-planning" class="cta-button">
                📅 View Full Plan
            </a>
            {% if grocery_list %}
            <a href="{{ base_url }}/meal-planning" class="cta-button">
                🛍️ Start Shopping
            </a>
            {% endif %}
        </div>

        <div class="footer">
            <p class="footer-brand">The Meal Assistant Team</p>
            <p>Happy cooking and shopping! 🌟</p>
        </div>
    </div>
</body>
</html>
            """,
            "grocery_list_ready": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your Grocery List is Ready!</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
        }

        .container {
            max-width: 650px;
            margin: 0 auto;
            background-color: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08), 0 1px 8px rgba(0,0,0,0.05);
        }

        .header {
            background: linear-gradient(135deg, #059669, #10b981, #34d399);
            text-align: center;
            padding: 40px 20px;
            color: white;
        }

        .header-icon {
            font-size: 48px;
            margin-bottom: 16px;
            display: block;
        }

        .header-title {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
        }

        .header-subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 400;
            margin: 0;
        }

        .content {
            padding: 40px 30px;
        }

        .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin: 0 0 16px 0;
        }

        .intro-text {
            font-size: 16px;
            color: #6b7280;
            margin: 0 0 32px 0;
            line-height: 1.6;
        }

        .list-stats {
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            padding: 20px;
            margin: 32px 0;
            text-align: center;
        }

        .stats-number {
            font-size: 36px;
            font-weight: 700;
            color: #059669;
            display: block;
            margin-bottom: 4px;
        }

        .stats-label {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .grocery-section {
            background-color: #fafafa;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #f3f4f6;
        }

        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
        }

        .section-icon {
            margin-right: 8px;
            font-size: 18px;
        }

        .category-container {
            margin-bottom: 24px;
        }

        .category-container:last-child {
            margin-bottom: 0;
        }

        .category-header {
            display: flex;
            align-items: center;
            font-size: 16px;
            font-weight: 600;
            color: #059669;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #d1fae5;
        }

        .category-icon {
            margin-right: 8px;
            font-size: 18px;
        }

        .items-grid {
            display: grid;
            gap: 8px;
        }

        .grocery-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;
        }

        .grocery-item:hover {
            border-color: #10b981;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
        }

        .item-name {
            font-weight: 500;
            color: #111827;
            font-size: 15px;
            flex: 1;
        }

        .item-quantity {
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            color: #0369a1;
            font-size: 13px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 20px;
            border: 1px solid #bae6fd;
            margin-left: 12px;
            white-space: nowrap;
        }

        .cta-section {
            text-align: center;
            margin: 40px 0;
            padding: 32px 0;
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 12px;
        }

        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
            transition: all 0.3s ease;
            letter-spacing: 0.3px;
        }

        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
            text-decoration: none;
            color: white;
        }

        .footer-note {
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 24px 0;
            text-align: center;
            border-left: 4px solid #10b981;
        }

        .footer-note-text {
            color: #6b7280;
            font-style: italic;
            font-size: 14px;
            margin: 0;
        }

        .footer {
            background: #f9fafb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            padding: 32px 30px;
            border-top: 1px solid #e5e7eb;
        }

        .footer p {
            margin: 4px 0;
        }

        .footer-brand {
            font-weight: 600;
            color: #111827;
        }

        .shared-note {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 20px;
            text-align: center;
        }

        .shared-note-text {
            font-size: 13px;
            color: #92400e;
            margin: 0;
        }

        /* Category Icons */
        .cat-produce::before { content: '🥕'; }
        .cat-dairy::before { content: '🥛'; }
        .cat-meat::before { content: '🥩'; }
        .cat-pantry::before { content: '🏺'; }
        .cat-bakery::before { content: '🍞'; }
        .cat-frozen::before { content: '🧊'; }
        .cat-snacks::before { content: '🍿'; }
        .cat-beverages::before { content: '🥤'; }
        .cat-other::before { content: '📦'; }

        /* Responsive Design */
        @media only screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; }
            .content { padding: 30px 20px; }
            .header { padding: 30px 20px; }
            .header-title { font-size: 28px; }
            .grocery-item { padding: 10px 12px; }
            .item-name { font-size: 14px; }
            .item-quantity { font-size: 12px; padding: 3px 8px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="header-icon">🛒</span>
            <div class="header-title">Grocery List Ready!</div>
            <div class="header-subtitle">Everything you need for amazing meals</div>
        </div>

        <div class="content">
            <div class="greeting">Hi {{ user.username }}! 👋</div>
            <p class="intro-text">
                Your grocery list {% if grocery_list %}for {{ grocery_list.created_at.strftime('%B %d, %Y') }} {% endif %}is ready!
                We've organized everything you need for your planned meals into easy-to-shop categories.
            </p>

            <div class="list-stats">
                <span class="stats-number">{{ item_count }}</span>
                <span class="stats-label">Items to Shop</span>
            </div>

            {% if grocery_items %}
            <div class="grocery-section">
                <div class="section-title">
                    <span class="section-icon">📝</span>
                    Your Shopping List
                </div>

                {% for category, items in grocery_items.items() %}
                <div class="category-container">
                    <div class="category-header">
                        <span class="category-icon cat-{{ category.lower() }}"></span>
                        {{ category }}
                    </div>
                    <div class="items-grid">
                        {% for item in items %}
                        <div class="grocery-item">
                            <span class="item-name">{{ item.name|title }}</span>
                            {% if item.quantity and item.unit %}
                            {% set clean_quantity = item.quantity|int if item.quantity == item.quantity|int else item.quantity %}
                            <span class="item-quantity">{{ clean_quantity }} {{ item.unit }}</span>
                            {% endif %}
                        </div>
                        {% endfor %}
                    </div>
                </div>
                {% endfor %}
            </div>

            <div class="footer-note">
                <p class="footer-note-text">
                    ✨ Only showing unchecked items • Organized by store section for efficient shopping
                </p>
            </div>
            {% else %}
            <div class="grocery-section">
                <div class="section-title">
                    <span class="section-icon">📝</span>
                    Your Shopping List
                </div>
                <p style="color: #6b7280; text-align: center; margin: 20px 0; font-style: italic;">
                    {{ item_count }} items organized by category for easy shopping
                </p>
            </div>
            {% endif %}
        </div>

        <div class="cta-section">
            <a href="{{ base_url }}/grocery{% if grocery_list %}/{{ grocery_list.id }}{% endif %}" class="cta-button">
                🛍️ View Full List & Start Shopping
            </a>
        </div>

        <div class="footer">
            <p class="footer-brand">The Meal Assistant Team</p>
            <p>Happy shopping! 🌟</p>
            {% if additional_recipient %}
            <div class="shared-note">
                <p class="shared-note-text">
                    📤 This grocery list was shared with you by {{ user.username }}
                </p>
            </div>
            {% endif %}
        </div>
    </div>
</body>
</html>
            """,
        }

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Send an email using SMTP"""
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            # Add text content
            if text_content:
                text_part = MIMEText(text_content, "plain")
                msg.attach(text_part)

            # Add HTML content
            html_part = MIMEText(html_content, "html")
            msg.attach(html_part)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()

                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)

                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except smtplib.SMTPConnectError as e:
            logger.error(f"SMTP Connection Error: {str(e)}")
            raise SMTPConnectionError(
                "Unable to connect to email server. Please try again later."
            )

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication Error: {str(e)}")
            raise SMTPAuthenticationError(
                "Email server authentication failed. Please contact support."
            )

        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"SMTP Recipients Refused: {str(e)}")
            raise EmailDeliveryError(
                "The email address was rejected by the server. Please check your email address."
            )

        except smtplib.SMTPDataError as e:
            logger.error(f"SMTP Data Error: {str(e)}")
            raise EmailDeliveryError(
                "Email content was rejected by the server. Please try again."
            )

        except smtplib.SMTPException as e:
            logger.error(f"SMTP Error: {str(e)}")
            raise EmailDeliveryError(
                "Failed to send email due to server error. Please try again later."
            )

        except socket.gaierror as e:
            logger.error(f"DNS/Network Error: {str(e)}")
            raise SMTPConnectionError(
                "Network error - unable to reach email server. Please check your internet connection."
            )

        except socket.timeout as e:
            logger.error(f"Connection Timeout: {str(e)}")
            raise SMTPConnectionError(
                "Email server connection timed out. Please try again later."
            )

        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {str(e)}")
            raise EmailServiceError(
                f"Unexpected error occurred while sending email: {str(e)}"
            )

    async def send_weekly_reminder(
        self, user: User, recent_recipes: Optional[List] = None
    ) -> bool:
        """Send weekly meal planning reminder email"""
        try:
            template = self.template_env.get_template("weekly_reminder")

            # Get current day name
            from datetime import datetime

            day_name = datetime.now().strftime("%A")

            html_content = template.render(
                user=user,
                day_name=day_name,
                base_url=self.base_url,
                recent_recipes=recent_recipes or [],
            )

            subject = f"🍳 Weekly Meal Planning Reminder - Plan Your {day_name}!"

            return await self.send_email(
                to_email=user.email, subject=subject, html_content=html_content
            )

        except TemplateError as e:
            logger.error(f"Template rendering error for weekly reminder: {str(e)}")
            raise EmailTemplateError("Error generating weekly reminder email content.")

        except EmailServiceError:
            # Re-raise email service errors
            raise

        except Exception as e:
            logger.error(
                f"Unexpected error sending weekly reminder to {user.email}: {str(e)}"
            )
            raise EmailServiceError(f"Failed to send weekly reminder: {str(e)}")

    async def send_grocery_list_notification(
        self,
        user: User,
        grocery_list=None,
        grocery_items: dict = None,
        item_count: int = 0,
        additional_emails: list = None,
    ) -> dict:
        """Send notification when grocery list is ready

        Args:
            user: The user who owns the grocery list
            grocery_list: The GroceryList model instance (optional)
            grocery_items: Dict of categorized grocery items {category: [items]} (optional)
            item_count: Total number of items
            additional_emails: List of additional email addresses to send to (optional)

        Returns:
            dict: Summary of email sending results
        """
        if additional_emails is None:
            additional_emails = []

        results = {"sent_to": [], "failed": [], "total_sent": 0, "total_failed": 0}

        try:
            template = self.template_env.get_template("grocery_list_ready")

            # Send to primary user
            try:
                html_content = template.render(
                    user=user,
                    base_url=self.base_url,
                    grocery_list=grocery_list,
                    grocery_items=grocery_items,
                    item_count=item_count,
                    additional_recipient=False,
                )

                subject = "🛒 Your Grocery List is Ready!"

                success = await self.send_email(
                    to_email=user.email, subject=subject, html_content=html_content
                )

                if success:
                    results["sent_to"].append(user.email)
                    results["total_sent"] += 1
                else:
                    results["failed"].append(
                        {"email": user.email, "error": "Unknown error"}
                    )
                    results["total_failed"] += 1

            except Exception as e:
                logger.error(
                    f"Failed to send grocery notification to primary user {user.email}: {str(e)}"
                )
                results["failed"].append({"email": user.email, "error": str(e)})
                results["total_failed"] += 1

            # Send to additional recipients
            for additional_email in additional_emails:
                try:
                    # Render template for additional recipient
                    html_content = template.render(
                        user=user,
                        base_url=self.base_url,
                        grocery_list=grocery_list,
                        grocery_items=grocery_items,
                        item_count=item_count,
                        additional_recipient=True,
                    )

                    subject = f"🛒 Grocery List from {user.username}"

                    success = await self.send_email(
                        to_email=additional_email,
                        subject=subject,
                        html_content=html_content,
                    )

                    if success:
                        results["sent_to"].append(additional_email)
                        results["total_sent"] += 1
                    else:
                        results["failed"].append(
                            {"email": additional_email, "error": "Unknown error"}
                        )
                        results["total_failed"] += 1

                except Exception as e:
                    logger.error(
                        f"Failed to send grocery notification to {additional_email}: {str(e)}"
                    )
                    results["failed"].append(
                        {"email": additional_email, "error": str(e)}
                    )
                    results["total_failed"] += 1

            return results

        except TemplateError as e:
            logger.error(f"Template rendering error for grocery notification: {str(e)}")
            raise EmailTemplateError(
                "Error generating grocery list notification email content."
            )

        except Exception as e:
            logger.error(f"Unexpected error in grocery list notification: {str(e)}")
            raise EmailServiceError(
                f"Failed to send grocery list notification: {str(e)}"
            )

    async def send_weekly_meal_plan_notification(
        self,
        user: User,
        meal_plan=None,
        weekly_recipes: dict = None,
        grocery_list=None,
        grocery_items: dict = None,
        item_count: int = 0,
        additional_emails: list = None,
    ) -> dict:
        """Send notification when weekly meal plan is ready with recipe names and grocery list

        Args:
            user: The user who owns the meal plan
            meal_plan: The meal plan model instance (optional)
            weekly_recipes: Dict of recipes organized by day {day_name: [recipes]} (optional)
            grocery_list: The GroceryList model instance (optional)
            grocery_items: Dict of categorized grocery items {category: [items]} (optional)
            item_count: Total number of grocery items
            additional_emails: List of additional email addresses to send to (optional)

        Returns:
            dict: Summary of email sending results
        """
        if additional_emails is None:
            additional_emails = []

        results = {"sent_to": [], "failed": [], "total_sent": 0, "total_failed": 0}

        try:
            template = self.template_env.get_template("weekly_meal_plan_ready")

            # Send to primary user
            try:
                html_content = template.render(
                    user=user,
                    base_url=self.base_url,
                    meal_plan=meal_plan,
                    weekly_recipes=weekly_recipes,
                    grocery_list=grocery_list,
                    grocery_items=grocery_items,
                    item_count=item_count,
                )

                subject = "📅 Your Weekly Meal Plan is Ready!"

                success = await self.send_email(
                    to_email=user.email, subject=subject, html_content=html_content
                )

                if success:
                    results["sent_to"].append(user.email)
                    results["total_sent"] += 1
                else:
                    results["failed"].append(
                        {"email": user.email, "error": "Unknown error"}
                    )
                    results["total_failed"] += 1

            except Exception as e:
                logger.error(
                    f"Failed to send weekly meal plan notification to primary user {user.email}: {str(e)}"
                )
                results["failed"].append({"email": user.email, "error": str(e)})
                results["total_failed"] += 1

            # Send to additional recipients if provided
            for additional_email in additional_emails:
                try:
                    # Render template for additional recipient
                    html_content = template.render(
                        user=user,
                        base_url=self.base_url,
                        meal_plan=meal_plan,
                        weekly_recipes=weekly_recipes,
                        grocery_list=grocery_list,
                        grocery_items=grocery_items,
                        item_count=item_count,
                    )

                    subject = f"📅 Weekly Meal Plan from {user.username}"

                    success = await self.send_email(
                        to_email=additional_email,
                        subject=subject,
                        html_content=html_content,
                    )

                    if success:
                        results["sent_to"].append(additional_email)
                        results["total_sent"] += 1
                    else:
                        results["failed"].append(
                            {"email": additional_email, "error": "Unknown error"}
                        )
                        results["total_failed"] += 1

                except Exception as e:
                    logger.error(
                        f"Failed to send weekly meal plan notification to {additional_email}: {str(e)}"
                    )
                    results["failed"].append(
                        {"email": additional_email, "error": str(e)}
                    )
                    results["total_failed"] += 1

            return results

        except TemplateError as e:
            logger.error(
                f"Template rendering error for weekly meal plan notification: {str(e)}"
            )
            raise EmailTemplateError(
                "Error generating weekly meal plan notification email content."
            )

        except Exception as e:
            logger.error(f"Unexpected error in weekly meal plan notification: {str(e)}")
            raise EmailServiceError(
                f"Failed to send weekly meal plan notification: {str(e)}"
            )


# Create singleton instance
email_service = EmailService()
