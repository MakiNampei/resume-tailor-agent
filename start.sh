#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Setup clean exit for background processes
trap "echo -e '\nStopping ResumeTailor Agent...'; kill 0" EXIT

# Colors for log statements
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting ResumeTailor Agent Full-Stack Application ===${NC}"

# Check for backend virtual environment
if [ ! -d "backend/venv" ]; then
    echo "Error: backend virtual environment not found. Please run installation steps first."
    exit 1
fi

# 1. Launch FastAPI Backend
echo -e "${GREEN}[1/2] Starting FastAPI Backend on http://localhost:8000 ...${NC}"
cd backend
./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
cd ..

# 2. Launch Vite React Frontend
echo -e "${GREEN}[2/2] Starting React Frontend on http://localhost:5173 ...${NC}"
cd frontend
npm run dev &
cd ..

echo -e "${BLUE}=== Application is running! Press Ctrl+C to stop ===${NC}"

# Keep script active to trap Ctrl+C and clean up child processes
wait
