#!/bin/bash
# DoseLog ZimaBoard 1-Command Update Script
set -e

echo "=========================================="
echo "  Updating DoseLog from GitHub...         "
echo "=========================================="

# 1. Pull latest code from GitHub
git pull origin main

# 2. Rebuild and restart the app container (leaves MongoDB running untouched)
sudo docker compose up -d --build app

# 3. Clean up old dangling Docker build layers so the ZimaBoard disk stays clean
sudo docker image prune -f

echo "=========================================="
echo "  DoseLog update complete & live!         "
echo "=========================================="
