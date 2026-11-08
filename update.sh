#!/bin/bash
# DoseLog ZimaBoard 1-Command Update Script
set -e

echo "=========================================="
echo "  Updating DoseLog from GitHub...         "
echo "=========================================="

# 1. Pull latest code from GitHub
git pull origin main

# 2. Prune dangling Docker build cache and old images before building
sudo docker builder prune -f
sudo docker image prune -f

# 3. Rebuild and restart the app container (leaves MongoDB running untouched)
sudo docker compose up -d --build app

# 4. Clean up old dangling Docker images and unused build cache
sudo docker image prune -f
sudo docker builder prune -f

echo "=========================================="
echo "  DoseLog update complete & live!         "
echo "=========================================="
