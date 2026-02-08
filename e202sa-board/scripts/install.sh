#!/usr/bin/env bash
# e202sa-board 종합 인스톨러 (Node 확인 및 의존성·빌드)
set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
REQUIRED_NODE_MAJOR=18

echo "=== e202sa-board 인스톨러 ==="

# 1) Node 설치 여부 확인
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Node.js가 설치되어 있지 않습니다."
  echo "다음 중 한 가지 방법으로 설치한 뒤 다시 실행하세요."
  echo ""
  echo "  [macOS/Linux - nvm 권장]"
  echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
  echo "    (터미널 재시작 후) nvm install $REQUIRED_NODE_MAJOR && nvm use $REQUIRED_NODE_MAJOR"
  echo ""
  echo "  [macOS - Homebrew]"
  echo "    brew install node"
  echo ""
  echo "  [공식 사이트]"
  echo "    https://nodejs.org/ 에서 LTS 버전 설치"
  echo ""
  exit 1
fi

NODE_VER="$(node -v)"
NODE_MAJOR="${NODE_VER#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -lt 14 ] 2>/dev/null; then
  echo "Node.js 14 이상이 필요합니다. 현재: $NODE_VER"
  exit 1
fi

echo "Node: $(node -v), npm: $(npm -v)"

# 2) 루트 의존성 설치
echo ""
echo ">>> 루트 의존성 설치..."
npm install

# 3) 프론트엔드 의존성 및 빌드
if [ -f "frontend/package.json" ]; then
  echo ""
  echo ">>> 프론트엔드 의존성 설치 및 빌드..."
  (cd frontend && npm install && npm run build)
  echo ""
  echo ">>> 빌드 완료 (dist/ 생성)"
else
  echo "frontend/ 없음. 서버만 실행 가능합니다."
fi

echo ""
echo "=== 설치 완료 ==="
echo "  서버 실행: npm start"
echo "  개발(프론트만): npm run dev (백엔드는 별도 터미널에서 node server.js)"
echo ""
