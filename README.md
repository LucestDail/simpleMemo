# SimpleMemo — 내부망 디지털 블랙보드

> LAN 환경에서 사용하는 실시간 디지털 블랙보드 & 퀵 메모 웹앱. 저사양 노트북을 내부망 메모 보드로 활용할 수 있도록 설계되었습니다.

## 컨셉

- **`/`** (컨트롤러) — 스마트폰/PC에서 메모를 입력하는 화면
- **`/board`** (블랙보드) — 노트북·모니터에 전체화면으로 띄우는 표시 화면
- **`/search`** (검색 & 아카이브) — 전체 메모 검색 + 아카이브 관리
- **`/settings`** (설정) — 동작/표시/데이터 설정, QR 코드 공유

## 주요 기능

- **멀티 탭** — 메모, 할 일, 링크, 아이디어 4개 탭. 탭별 포스트잇·배경/글자색 분리 관리
- **실시간 동기화** — Socket.io로 모든 기기 간 즉시 반영 (기기 수 표시)
- **포스트잇** — M3 카드 스타일, 6가지 색상, 제목·본문·체크리스트·우선순위·핀 고정·이동 잠금·최소화·리사이즈
- **모바일 친화 UI** — safe-area 대응, 하단 네비게이션, 터치 드래그/리사이즈, 반응형 레이아웃
- **검색 & 아카이브** — 전체 포스트잇·아카이브 내 키워드 검색(하이라이트 포함), 탭 필터, 복원/영구삭제
- **설정 화면** — 디바운스 조절, 오프라인 동기화, 테마(자동/라이트/다크), 보드 폰트 크기, 자동 전체화면, 백업 주기/개수
- **데이터 관리** — JSON 내보내기/가져오기, 서버측 주기적 백업 스냅샷
- **QR 코드 접속** — 보드/설정에서 LAN 주소 QR 표시 → 모바일 즉시 접속
- **전체화면 모드** — 보드 뷰 한 번에 전체화면 전환
- **연결 상태 표시** — 서버 연결 끊김/재연결 상태 배너 + 오프라인 큐잉
- **다크/라이트 모드** — 시스템 설정 기반 + 수동 토글 + 설정 저장
- **DB 없이 동작** — JSON 파일(`data/memo.json`) + 스냅샷 백업(`data/backups/`)만 사용
- **Docker 지원** — Node 없이 컨테이너로 바로 실행 가능

## 디자인 시스템

Google Material Design 3 (M3) 준용 — Baseline Purple 팔레트 + Pretendard 폰트

## 기술 스택

| 구분 | 기술 |
|------|------|
| 백엔드 | Node.js, Express, Socket.io |
| 프론트엔드 | Vue 3, Vue Router 4, Vite 5 |
| 스타일 | Tailwind CSS (CDN) + M3 디자인 토큰 |
| 폰트 | Pretendard Variable |
| 저장소 | 파일 시스템 (`data/memo.json`) |
| 컨테이너 | Docker (Node 20 Alpine) |

## 프로젝트 구조

```
simpleMemo/
└── e202sa-board/
    ├── package.json
    ├── server.js              # Express + Socket.io 서버
    ├── frontend/
    │   ├── index.html         # M3 토큰, Pretendard 폰트
    │   ├── vite.config.js
    │   └── src/
    │       ├── main.js
    │       ├── App.vue        # 레이아웃, 상태 배너, 테마 토글
    │       ├── router/index.js
    │       ├── views/
    │       │   ├── Controller.vue  # 멀티탭 입력 UI
    │       │   └── Board.vue       # 전체화면 보드 + 포스트잇
    │       └── composables/
    │           └── useMemo.js      # 싱글톤 상태, 소켓, 디바운스
    ├── dist/                  # 빌드 결과물
    ├── data/                  # memo.json (런타임 데이터)
    ├── docker-compose.yml
    ├── Dockerfile
    ├── scripts/
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
