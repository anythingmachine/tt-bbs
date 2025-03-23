#!/bin/bash

echo "🛑 Stopping any running containers..."
docker compose down

echo "🚀 Starting the app in development mode..."
docker compose -f docker-compose.dev.yml up -d

echo "📱 App is running in development mode with hot reloading"
echo "   Any code changes you make will automatically be reflected"
echo "   Access at http://localhost:3000"
echo "   View logs with: docker compose -f docker-compose.dev.yml logs -f tt-bbs" 