# SimpleMemo — 내부망 디지털 블랙보드

> LAN 환경에서 사용하는 실시간 디지털 블랙보드 & 퀵 메모 웹앱. 저사양 노트북을 내부망 메모 보드로 활용할 수 있도록 설계되었습니다.

## 컨셉

- **`/`** (컨트롤러) — 스마트폰이나 PC에서 메모를 입력하는 화면
- **`/board`** (블랙보드) — 노트북이나 모니터에 전체 화면으로 띄우는 표시 화면

## 주요 기능

- **실시간 동기화** — Socket.io로 모든 기기 간 즉시 반영
- **포스트잇** — 여러 개 생성, 위치(드래그), 색상, 내용 편집
- **디바운스 자동 저장** — 입력 후 100ms 대기 후 자동 저장
- **DB 없이 동작** — JSON 파일(`data/memo.json`) 하나로 상태 유지
- **Docker 지원** — Node 없이 컨테이너로 바로 실행 가능

## 기술 스택

| 구분 | 기술 |
|------|------|
| 백엔드 | Node.js, Express, Socket.io |
| 프론트엔드 | Vue 3, Vue Router 4, Vite 5 |
| 스타일 | Tailwind CSS (CDN) |
| 저장소 | 파일 시스템 (`data/memo.json`) |
| 컨테이너 | Docker (Node 20 Alpine) |

## 프로젝트 구조

```
simpleMemo/
└── e202sa-board/              # 메인 애플리케이션
    ├── package.json
    ├── server.js              # Express + Socket.io 서버
    ├── frontend/              # Vue 3 + Vite 소스
    │   ├── src/views/         # Controller.vue, Board.vue
    │   └── src/composables/   # useMemo.js (API, 소켓, 디바운스)
    ├── dist/                  # 빌드 결과물
    ├── public/                # 레거시 HTML (빌드 없을 때 폴백)
    ├── data/                  # memo.json (런타임 데이터)
    ├── docker-compose.yml
    ├── Dockerfile
    ├── scripts/               # install.sh, run.sh
    └── docs/DOCKER_SETUP.md
```

## 실행

### 사전 요구사항
- Node.js ≥ 14

### 설치 & 실행
```bash
cd e202sa-board
npm run install:all   # 루트 + 프론트엔드 의존성 설치
npm run build         # Vue → dist/ 빌드
npm start             # http://0.0.0.0:3000
```

### 개발 모드
```bash
npm start                          # 백엔드 (포트 3000)
cd frontend && npm run dev         # Vite 개발 서버 (포트 5173, API 프록시)
```

### Docker
```bash
cd e202sa-board
docker compose up -d               # http://localhost:3000
```

## 접속

내부망 기기에서 서버 PC의 IP로 접속:
- 컨트롤러: `http://192.168.x.x:3000`
- 블랙보드: `http://192.168.x.x:3000/board`

## 라이선스

MIT
