#!/bin/bash

echo "🛑 Stopping containers..."
docker compose down

echo "🔨 Rebuilding image (with cache)..."
docker compose build

echo "🧹 Cleaning up dangling images..."
docker image prune -f

echo "🚀 Starting containers..."
docker compose up -d

echo "✅ Done! Your app is running with the latest changes."
echo "   Access at http://localhost:3000" 