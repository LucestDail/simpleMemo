# SimpleMemo — AI 기능 도입 계획

> LAN 환경 디지털 블랙보드에 AI 보조 기능을 단계적으로 도입한다.
> 원칙: **자동으로 바꾸지 말고 제안만 한다 · 오프라인에서도 본 기능은 동작한다 · 톤을 해치지 않는다.**

---

## 0. 결정해야 하는 것 (작업 시작 전 확정)

- [ ] **AI 백엔드 선택**
  - [ ] (A) 로컬 Ollama — LAN 컨셉에 부합, 무료, 별도 서버 1대 필요 (추천)
  - [ ] (B) OpenAI(또는 호환) API — 가장 똑똑함, 키·비용·외부망 필요
  - [ ] (C) 하이브리드 — 두 프로바이더를 설정에서 전환
- [ ] **MVP 기능 범위**
  - [ ] ① 제목·탭·색상 자동 제안
  - [ ] ② 체크리스트 추출 (자유 메모 → 할 일)
  - [ ] ③ 요약 / 재작성
  - [ ] ④ 자연어 검색 / Q&A (RAG, 2차)
  - [ ] ⑤ 음성 → 텍스트 (Whisper, 2차)
- [ ] **UX 노출 방식**
  - [ ] (A) ✨ 버튼을 눌렀을 때만 (방해 최소, 추천)
  - [ ] (B) 타이핑 멈추면 자동 제안
  - [ ] (C) 설정에서 두 모드 토글

---

## 1. Phase 1 — 인프라 (반나절)

목적: 어떤 프로바이더든 붙일 수 있는 골격을 만든다.

- [ ] `e202sa-board/server/ai/` 디렉토리 신설
- [ ] `provider.js` — 추상 인터페이스
  - 메서드: `suggestMeta(text)`, `summarize(text)`, `extractTodos(text)`
  - 공통 옵션: `locale`, `maxTokens`, `timeoutMs`
- [ ] `ollama.js` — Ollama `/api/chat` 어댑터 (OpenAI 호환 포맷)
- [ ] `openai.js` — `/v1/chat/completions` 어댑터 (Anthropic·Groq·Together 등 호환 URL 모두 동일)
- [ ] `noop.js` — AI 비활성 시 기본값(스무스 폴백)
- [ ] 환경 변수 정의
  - `AI_PROVIDER=ollama|openai|off`
  - `AI_BASE_URL` (예: `http://127.0.0.1:11434/v1` 또는 `https://api.openai.com/v1`)
  - `AI_MODEL` (예: `qwen2.5:3b`, `gpt-4o-mini`)
  - `AI_API_KEY` (선택)
  - `AI_TIMEOUT_MS=5000`, `AI_MAX_TOKENS=512`
- [ ] `server.js` 라우트 추가
  - `POST /api/ai/suggest` — `{ task, text, context }` → `{ suggestions }`
  - `GET  /api/ai/health` — 프로바이더·모델 핑
- [ ] LRU 캐시 (text 해시 키, 5분 TTL) — 동일 입력 반복 호출 방지
- [ ] 요청 디바운스 가드 (서버 측, IP·세션 단위)
- [ ] 실패 시 200 + `{ suggestions: [], error: 'timeout' }` 형태로 우아한 폴백

검증
- [ ] `curl POST /api/ai/suggest` 로 응답 확인
- [ ] AI off 상태에서 본 기능 동작 무영향 확인

---

## 2. Phase 2 — 프런트 컴포저블 (반나절)

- [ ] `frontend/src/composables/useAi.js`
  - `suggestMeta(text)` → `{ title, tab, color }`
  - `summarize(text, mode='oneline'|'bullets')` → `string`
  - `extractTodos(text)` → `[{ text, done:false }]`
  - 내부적으로 `/api/ai/suggest` 호출 + 디바운스 + AbortController
- [ ] AI 사용 가능 상태 reactive flag (`/api/ai/health` 폴링 1회)
- [ ] 에러는 토스트 1회만, 이후 자동 hide
- [ ] 결과 메모리 캐시 (같은 텍스트 재계산 안 함)

---

## 3. Phase 3 — UI 통합 (1일)

> AI 진입점은 **세 군데만**. 그 이상 늘리지 않는다.

### 3.1 컨트롤러 입력 상자
- [ ] 본문 textarea 우측 하단에 작은 ✨ 칩 1개
- [ ] 누르면 메타 제안 풍선:
  ```
  제안 — 제목: "주간 회의록"
        탭:   메모
        색상: ● Yellow
  [적용] [무시]
  ```
- [ ] 적용 시 `draftTitle/quickColor/activeTab` 즉시 반영, advanced 토글 자동 펼침

### 3.2 보드 포스트잇 편집 모드
- [ ] 색상 행 옆에 ✨ 칩
- [ ] 메뉴: `요약 한 줄` / `재작성(정리)` / `할 일로 변환`
- [ ] "할 일로 변환" 선택 시 `checklist` 필드를 부여 (이미 모델에 존재)
- [ ] 변환 결과는 흐린 미리보기 → "적용" 눌러야 저장 (revert 가능하게)

### 3.3 검색바 (Phase 2 후순위)
- [ ] `?` 로 시작하면 자연어 모드 표시 — "예: ?지난주 회의 결정사항"
- [ ] RAG 미구현 동안은 "준비 중" 안내만

---

## 4. Phase 4 — 설정 화면 항목 추가

- [ ] `/settings` 에 **"AI"** 섹션 신설
  - [ ] 프로바이더 (off / ollama / openai-호환)
  - [ ] Base URL · 모델 · API 키 (마스킹 입력)
  - [ ] "연결 테스트" 버튼 (`/api/ai/health` 호출)
  - [ ] 자동 제안 모드 토글 (on-demand / passive)
  - [ ] 한도: 분당 호출 수 / 텍스트 최대 길이
- [ ] 키는 서버 환경변수 우선, 설정 UI는 **선택적 덮어쓰기**(런타임 메모리만)

---

## 5. Phase 5 — RAG (자연어 검색 / Q&A)

> 메모가 충분히 쌓인 뒤 도입. MVP에는 포함하지 않는다.

- [ ] 임베딩 어댑터 — `text-embedding-3-small` 또는 `nomic-embed-text` (Ollama)
- [ ] 인덱스 저장: `data/embeddings.json` (저사양에서도 OK, ~수천 개 한도)
- [ ] 새 포스트잇 저장·수정 시 인덱싱 큐
- [ ] 검색 시 코사인 유사도 top-k → 본문 + 컨텍스트로 LLM에 질의
- [ ] 응답에 출처 포스트잇 ID 표시 → 클릭 시 보드로 이동

---

## 6. Phase 6 — 음성 입력 (Whisper)

- [ ] `whisper.cpp` 또는 Ollama Whisper 어댑터
- [ ] 컨트롤러에 🎤 버튼 (모바일 필수, MediaRecorder API)
- [ ] 녹음 → blob 업로드 → 텍스트 → 본문 입력에 추가
- [ ] 길이 제한(60초) + 진행 상태

---

## 7. 프롬프트 템플릿 (참고)

### 7.1 메타 제안
```
역할: 한국어 메모 비서.
다음 메모를 보고 JSON으로만 답해라.
스키마: {"title": string, "tab": "general"|"todo"|"links"|"ideas",
         "color": "Yellow"|"Pink"|"Blue"|"Green"|"Orange"|"Purple"}
규칙: title은 12자 이내, 본문 첫 문장 베끼기 금지.
입력: """{text}"""
```

### 7.2 체크리스트 추출
```
스키마: {"items": [{"text": string, "done": false}]}
규칙: 각 항목 30자 이내, 동사로 시작, 최대 8개.
```

### 7.3 요약
```
스키마: {"summary": string}
규칙: 50자 이내 한 줄. 중요 숫자·고유명사 보존.
```

---

## 8. 보안·운영 체크리스트

- [ ] 외부 API 사용 시 토스트로 "AI 전송 중" 표시
- [ ] 키는 절대 `data/memo.json` 등 데이터 파일에 저장하지 않음
- [ ] CORS는 `/api/ai/*` 도 동일 정책 적용 (LAN only)
- [ ] 프로바이더 호출 로깅: 토큰 수·지연 시간만, 본문은 **남기지 않음**
- [ ] 에러는 사용자에게는 추상화된 메시지로(`AI 응답 지연` 등)
- [ ] AI 비활성 환경에서도 모든 화면이 정상 동작하는지 회귀 테스트

---

## 9. 마일스톤

| 단계 | 산출물 | 예상 소요 |
|---|---|---|
| M1 | Phase 1+2 골격 (서버·컴포저블·헬스체크) | 0.5일 |
| M2 | 컨트롤러 ✨ 메타 제안 동작 | 0.5일 |
| M3 | 보드 편집 모드 요약·체크리스트 변환 | 1일 |
| M4 | 설정 화면 AI 섹션 + 다크모드 톤 정리 | 0.5일 |
| M5 | RAG 검색 (선택) | 1~2일 |
| M6 | 음성 입력 (선택) | 1일 |

---

## 10. 비고

- 우선 M1~M4까지 만들고 실사용 후 RAG/음성 도입 여부 재결정.
- "기능을 더하지 말고, 사용자가 ✨ 한 번 눌러 바로 도움 받고 사라지는" 흐름을 유지한다.
- 톤·여백·강조색 규칙은 기존 UI 정리 후 정해진 가이드를 그대로 따른다.
