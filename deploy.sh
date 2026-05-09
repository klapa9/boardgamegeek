#!/usr/bin/env bash
set -e

cd /home/boardgamegeek/boardgamegeek

echo "Latest code ophalen..."
git pull origin main

echo "App rebuilden..."
docker-compose build app

echo "Containers herstarten..."
docker-compose down --remove-orphans
docker-compose up -d

echo "Database migraties uitvoeren..."
docker-compose exec -T app npx prisma migrate deploy

echo "Oude Docker images opruimen..."
docker image prune -f

echo "Deploy klaar."
