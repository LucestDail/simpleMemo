#!/usr/bin/env bash
# e202sa-board Docker 재시작 (빌드 반영)
set -e
cd "$(dirname "$0")/.."

echo ">>> docker compose down..."
docker compose down

echo ">>> docker compose up -d --build..."
docker compose up -d --build

echo ">>> done. 컨트롤러: http://localhost:3000  보드: http://localhost:3000/board"
docker compose ps
