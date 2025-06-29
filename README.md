# AI-Powered Meal Planner

A smart meal planning application that uses AI to create personalized recipes, compile grocery lists, and learn from your preferences.

## Features

- 🤖 AI-powered recipe planning based on user preferences
- 🔍 Web search integration for recipe discovery
- 📊 Nutrition facts estimation
- 🛒 Automated grocery list compilation
- 📚 Learning system that adapts to liked/disliked recipes
- 👤 User authentication and profile management
- 🎨 Modern, responsive UI

## Tech Stack

### Backend
- Python 3.11+
- FastAPI
- PostgreSQL
- SQLAlchemy
- Anthropic Claude API
- Pydantic
- uv (package manager)

### Frontend
- React 18 + Vite
- TypeScript
- Tailwind CSS
- Axios
- React Router
- pnpm (package manager)

## Getting Started

### Quick Setup

**Option 1: Using Makefile (Recommended)**
```bash
make help           # See all available commands
make quick-start    # Complete setup and start development
```

**Option 2: Using setup script**
```bash
./scripts/setup.sh
```

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Anthropic API key
- uv (Python package manager)
- pnpm (Node.js package manager)
- direnv (optional, for automatic environment setup)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies using uv:
```bash
uv sync
```

3. Create a `.env` file with your configuration:
```
DATABASE_URL=postgresql://user:password@localhost/meal_planner
ANTHROPIC_API_KEY=your_anthropic_api_key
JWT_SECRET_KEY=your_jwt_secret_key
```

4. Run database migrations:
```bash
uv run alembic upgrade head
```

5. Start the backend server:
```bash
uv run uvicorn app.main:app --reload
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies using pnpm:
```bash
pnpm install
```

3. Create a `.env` file:
```
VITE_API_URL=http://localhost:8000
```

4. Start the development server:
```bash
pnpm run dev
```

## Development Commands

### Using Makefile (Recommended)

The project includes a focused Makefile for development and database operations:

```bash
# Setup and Installation
make setup          # Complete project setup
make install        # Install all dependencies
make env-setup      # Create .env files from examples

# Development
make dev            # Start both backend and frontend
make dev-backend    # Start only backend
make dev-frontend   # Start only frontend

# Database Operations
make db-up          # Start PostgreSQL with Docker
make db-down        # Stop database
make db-create      # Create database
make db-migrate     # Run migrations
make db-reset       # Reset database completely

# Quick Commands
make quick-start    # Complete setup and start everything
make doctor         # Diagnose setup issues
make clean          # Clean temporary files
```

Run `make help` to see all available commands.

### Database with Docker

The project uses Docker for the PostgreSQL database:

```bash
# Start database
make db-up

# Stop database
make db-down
```

### For New Developers

If you're setting up the project for the first time:

```bash
# Complete setup (creates .env files, installs deps, sets up DB)
make quick-start

# Or step by step
make doctor        # Check prerequisites
make env-setup     # Create environment files
make install       # Install dependencies
make db-up         # Start PostgreSQL database
make db-create     # Create database
make db-migrate    # Run migrations
make dev           # Start development servers
```

## Usage

1. Visit http://localhost:3000
2. Create an account or sign in
3. Set up your food preferences
4. Start planning meals!

## License

MIT
