#!/usr/bin/env bash
# 빌드 후 서버 실행 (Node 미설치 환경 가정 시, Docker 사용 권장)
set -e
cd "$(dirname "$0")/.."

if [ ! -d "dist" ] && [ -d "frontend" ]; then
  echo "dist 없음. 빌드 후 실행합니다."
  (cd frontend && npm install && npm run build)
fi

echo "서버 시작 (Ctrl+C 종료)"
exec node server.js
