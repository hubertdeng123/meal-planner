#!/bin/bash

set -e

echo "🍽️  Setting up AI-Powered Meal Planner..."

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v uv &> /dev/null; then
    echo "❌ uv not found. Please install: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Please install: npm install -g pnpm"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup backend
echo "📦 Setting up backend..."
cd backend

if [ ! -f .env ]; then
    echo "Creating backend .env file from example..."
    cp ../env.example .env
    echo "⚠️  Please edit backend/.env with your Anthropic API key and database settings"
fi

echo "Installing Python dependencies..."
uv venv
uv sync

echo "✅ Backend setup complete"
cd ..

# Setup frontend
echo "📦 Setting up frontend..."
cd frontend

if [ ! -f .env ]; then
    echo "Creating frontend .env file..."
    echo "VITE_API_URL=http://localhost:8000" > .env
fi

echo "Installing Node.js dependencies..."
pnpm install

echo "✅ Frontend setup complete"
cd ..

# Database setup prompt
echo ""
echo "🗄️  Database Setup:"
echo "1. Create a PostgreSQL database named 'meal_planner'"
echo "2. Update the DATABASE_URL in backend/.env"
echo "3. Run migrations: cd backend && uv run alembic upgrade head"

echo ""
echo "🚀 Setup complete! Next steps:"
echo "1. Edit backend/.env with your Anthropic API key"
echo "2. Set up your PostgreSQL database"
echo "3. Run migrations: cd backend && uv run alembic upgrade head"
echo "4. Start backend: cd backend && uv run uvicorn app.main:app --reload"
echo "5. Start frontend: cd frontend && pnpm run dev"
echo ""
echo "Or use direnv for automatic environment setup!"

if command -v direnv &> /dev/null; then
    echo "📁 direnv detected! You can also use:"
    echo "   direnv allow"
    echo "   meal_planner_setup  # (when direnv is loaded)"
    echo "   meal_planner_start  # (to start both services)"
fi
