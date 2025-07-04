# AI-Powered Meal Planner - Claude Development Guidelines

## Project Overview
This is an AI-powered meal planning application with a FastAPI backend and React frontend. The system uses Claude AI for recipe generation, PostgreSQL with pgvector for storing embeddings, and provides comprehensive meal planning with grocery list generation.

## Repository Structure
- `backend/` - FastAPI application with Python 3.11+
- `frontend/` - React 18 + TypeScript + Vite application
- `scripts/` - Setup and utility scripts
- `docker-compose.yml` - Container orchestration

## Development Environment Setup

### Backend Commands
```bash
cd backend
uv sync                           # Install dependencies
uv run alembic upgrade head      # Run migrations
uv run uvicorn app.main:app --reload  # Start dev server
uv run pytest                   # Run tests
uv run ruff check .              # Lint code
uv run ruff format .             # Format code
```

### Frontend Commands
```bash
cd frontend
pnpm install                     # Install dependencies
pnpm run dev                     # Start dev server
pnpm run build                   # Build for production
pnpm run lint                    # Run ESLint
pnpm run lint:fix                # Fix ESLint issues
pnpm run typecheck               # Type check with TypeScript
pnpm run format                  # Format with Prettier
pnpm run test                    # Run tests
pnpm run test:watch              # Run tests in watch mode
pnpm run test:coverage           # Run tests with coverage report
```

### Database Commands
```bash
make db-up                       # Start PostgreSQL with Docker
make db-down                     # Stop database
make db-create                   # Create database
make db-migrate                  # Run migrations
make db-reset                    # Reset database completely
```

## Code Quality Standards

### Python (Backend)
- Use **ruff** for linting and formatting
- Follow PEP 8 style guidelines
- Use type hints for all function parameters and return values
- Use Pydantic models for data validation
- Write comprehensive docstrings for all functions and classes
- Use async/await for database operations
- Handle exceptions properly with custom exception classes

### TypeScript (Frontend)
- Use **TypeScript** with strict mode enabled
- Use **ESLint** for linting
- Use **Prettier** for code formatting
- Follow React best practices with hooks
- Use proper TypeScript interfaces for all data structures
- Implement proper error handling with try-catch blocks
- Use React Router for navigation
- Use Tailwind CSS for styling

### Testing Requirements
- **Backend**: Use pytest with async support
- **Frontend**: Use Vitest with React Testing Library
- Aim for >80% code coverage
- Write unit tests for all business logic
- Write integration tests for API endpoints
- Test error scenarios and edge cases
- **Frontend Testing Setup**:
  - Vitest for test runner with jsdom environment
  - React Testing Library for component testing
  - Mock services and API calls in tests
  - Test utilities in `src/test/utils.tsx` for common setup

## Pre-commit Hooks
The project uses pre-commit hooks to ensure code quality:
- **Python**: Ruff formatting and linting
- **TypeScript**: Type checking with tsc --noEmit
- **General**: Prettier formatting, YAML/JSON validation

Setup: `cd backend && uv run pre-commit install`

## Architecture Guidelines

### Backend Architecture
- **Models**: SQLAlchemy models in `app/models/`
- **Schemas**: Pydantic models in `app/schemas/`
- **API Endpoints**: FastAPI routes in `app/api/endpoints/`
- **Services**: Business logic in `app/services/`
- **Agents**: AI agents for meal planning in `app/agents/`
- **Core**: Configuration and utilities in `app/core/`

### Frontend Architecture
- **Components**: Reusable UI components in `src/components/`
- **Pages**: Route-based page components in `src/pages/`
- **Services**: API communication in `src/services/`
- **Contexts**: React contexts for state management
- **Types**: TypeScript interfaces in `src/types/`

## Key Features to Maintain
1. **AI Recipe Generation**: Uses Claude AI for personalized recipes
2. **Vector Search**: pgvector for recipe similarity search
3. **User Preferences**: Learning system for liked/disliked recipes
4. **Grocery Lists**: Automated compilation from meal plans
5. **Authentication**: JWT-based user authentication
6. **Responsive UI**: Mobile-friendly design with Tailwind CSS

## Common Development Tasks

### Adding New API Endpoints
1. Create schema in `app/schemas/`
2. Add endpoint in `app/api/endpoints/`
3. Update dependencies in `app/api/deps.py` if needed
4. Write tests in `tests/api/`

### Adding New UI Components
1. Create component in `src/components/`
2. Add TypeScript interfaces in `src/types/`
3. Update routing in `src/App.tsx` if needed
4. Add corresponding service calls in `src/services/`

### Database Changes
1. Create migration: `cd backend && uv run alembic revision --autogenerate -m "description"`
2. Review and edit migration file
3. Apply migration: `uv run alembic upgrade head`

## Environment Variables
- Copy `env.example` to `.env` for development
- Required: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `JWT_SECRET_KEY`
- Frontend: `VITE_API_URL` for API endpoint

## Security Considerations
- Never commit API keys or secrets
- Use environment variables for sensitive data
- Implement proper authentication for all protected routes
- Validate all user inputs with Pydantic
- Use HTTPS in production

## Deployment
- Use Docker containers for production
- Follow guides in `README-DEPLOYMENT.md`
- Use `docker-compose.production.yml` for production setup

## Quick Start Commands
```bash
make quick-start    # Complete setup and start development
make help          # See all available commands
make doctor        # Diagnose setup issues
```
