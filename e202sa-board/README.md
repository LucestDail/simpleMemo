# e202sa-board

LAN 전용 **디지털 블랙보드 & 퀵 메모** – 저사양 노트북(E202SA)을 내부망 전용 메모 보드로 쓰기 위한 웹 앱입니다.

- **노트북**: 전체 화면 블랙보드 (`/board`)
- **모바일/PC**: 입력용 컨트롤러 (`/`)

DB 없이 `data/memo.json` 파일만 사용합니다.

---

## 1. 설치 및 실행 (Node 사용)

### Node.js가 이미 있는 경우

```bash
# 의존성 설치 (루트 + 프론트엔드)
npm run install:all

# Vue 빌드 (프론트엔드 → dist/)
npm run build

# 서버 실행
npm start
```

### Node.js가 없는 경우 – 종합 인스톨러

**macOS / Linux:**

```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

- Node가 없으면 설치 방법 안내 후 종료됩니다.  
  (nvm, Homebrew, 공식 사이트 등 안내)
- Node가 있으면 루트·프론트엔드 의존성 설치 후 `npm run build`까지 실행합니다.

**실행:**

```bash
npm start
```

기본 포트: **3000**  
내부망 접속 예: `http://192.168.0.10:3000`

---

## 2. Docker로 서버 실행 (Node 미설치)

Docker만 설치되어 있으면 Node 없이 실행할 수 있습니다.

- **설치 가이드**: [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md) (Docker 설치 방법 포함)

**요약:**

```bash
# 이미지 빌드 + 백그라운드 실행
docker compose up -d

# 컨트롤러: http://localhost:3000
# 블랙보드: http://localhost:3000/board
```

데이터는 호스트의 `data/` 폴더에 저장됩니다.

---

## 3. 페이지

| URL | 용도 |
|-----|------|
| `GET /` | 컨트롤러 (메모·포스트잇 입력, 탭, Quick Clear, 원격 새로고침) |
| `GET /board` | 블랙보드 전체 화면 (노트북 전용) |

---

## 4. 기능

- **멀티 탭**: General, To-Do, Links, Ideas
- **포스트잇**: 여러 개 추가, 위치(x,y), 색상, 내용 – **실시간 보드 반영**
- **실시간 동기화**: Socket.io로 입력 즉시 보드 업데이트
- **자동 저장**: 500ms 디바운스 후 `data/memo.json` 저장
- **Markdown**: `- [ ]` / `- [x]` 체크박스, `-` 불렛
- **보드 색상**: 탭별 배경색/글자색
- **Quick Clear**: 현재 탭 내용 한 번에 비우기
- **노트북 화면 새로고침**: 컨트롤러에서 보드 페이지 리로드

---

## 5. 기술 스택

- **백엔드**: Node.js, Express, Socket.io
- **프론트엔드**: Vue 3, Vue Router, Vite
- **스타일**: Tailwind CSS (CDN)
- **저장**: `fs` + JSON 파일 (`data/memo.json`)

---

## 6. 스크립트 요약

| 스크립트 | 설명 |
|----------|------|
| `npm start` | 서버 실행 (dist 또는 public 서빙) |
| `npm run install:all` | 루트 + frontend 의존성 설치 |
| `npm run build` | Vue 앱 빌드 → `dist/` |
| `./scripts/install.sh` | Node 확인 후 전체 설치·빌드 (Unix) |
| `./scripts/run.sh` | 빌드 후 서버 실행 (Unix) |
