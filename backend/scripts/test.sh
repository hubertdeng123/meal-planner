#!/bin/bash

# Hungry Helper - Test Runner Script
# This script demonstrates the automated testing setup

echo "🧪 Running Meal Planner Tests..."
echo "================================="

# Change to backend directory if not already there
if [[ $(basename $PWD) != "backend" ]]; then
    cd backend
fi

# Run basic tests first
echo "📋 Running basic tests..."
uv run pytest tests/test_meal_planning_basic.py tests/test_schemas.py -v

if [ $? -eq 0 ]; then
    echo "✅ Basic tests passed!"
else
    echo "❌ Basic tests failed!"
    exit 1
fi

# Run all tests with coverage
echo ""
echo "📊 Running full test suite with coverage..."
uv run pytest tests/ --cov=app --cov-report=term-missing --cov-fail-under=40

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! Coverage report generated in htmlcov/"
    echo "📁 View detailed coverage: open htmlcov/index.html"
else
    echo "❌ Some tests failed or coverage is too low!"
    exit 1
fi

echo ""
echo "✨ Test automation successful!"
echo "💡 Remember: Run tests after any code changes to catch regressions early!"
