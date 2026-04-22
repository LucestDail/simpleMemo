import { useState, useRef } from "react";

// ─── M3 Design Tokens ────────────────────────────────────────────────────────
const token = {
  primary: "#6750A4",
  onPrimary: "#FFFFFF",
  primaryContainer: "#EADDFF",
  secondary: "#625B71",
  secondaryContainer: "#E8DEF8",
  tertiary: "#7D5260",
  surface: "#FEF7FF",
  surfaceVariant: "#E7E0EC",
  onSurface: "#1D1B20",
  onSurfaceVariant: "#49454F",
  outline: "#79747E",
  error: "#B3261E",
  errorContainer: "#F9DEDC",
};

const stickyColors = {
  Yellow: "#FFF9C4",
  Pink:   "#F8BBD0",
  Blue:   "#BBDEFB",
  Green:  "#C8E6C9",
  Orange: "#FFE0B2",
  Purple: "#E1BEE7",
};

// ─── Shared primitives ────────────────────────────────────────────────────────
const Chip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 16px",
      borderRadius: 8,
      border: `1.5px solid ${active ? token.primary : token.outline}`,
      background: active ? token.primaryContainer : "transparent",
      color: active ? token.primary : token.onSurfaceVariant,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      transition: "all .15s",
      fontFamily: "'Noto Sans KR', sans-serif",
    }}
  >
    {label}
  </button>
);

const Badge = ({ color, style }) => (
  <span
    style={{
      display: "inline-block",
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: color,
      border: "1.5px solid rgba(0,0,0,.15)",
      flexShrink: 0,
      ...style,
    }}
  />
);

const SectionLabel = ({ children }) => (
  <p
    style={{
      margin: "0 0 6px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: token.primary,
      fontFamily: "'Noto Sans KR', sans-serif",
    }}
  >
    {children}
  </p>
);

const WFLabel = ({ children, style }) => (
  <span
    style={{
      fontSize: 10,
      color: token.onSurfaceVariant,
      fontFamily: "monospace",
      background: token.surfaceVariant,
      padding: "2px 6px",
      borderRadius: 4,
      ...style,
    }}
  >
    {children}
  </span>
);

// ─── Annotation arrow ─────────────────────────────────────────────────────────
const Note = ({ children, side = "right" }) => (
  <div
    style={{
      position: "absolute",
      ...(side === "right" ? { right: -180, top: "50%", transform: "translateY(-50%)" } : { left: -180, top: "50%", transform: "translateY(-50%)" }),
      width: 165,
      background: "#FFFDE7",
      border: "1px dashed #F9A825",
      borderRadius: 8,
      padding: "6px 8px",
      fontSize: 11,
      color: "#5D4037",
      lineHeight: 1.5,
      fontFamily: "'Noto Sans KR', sans-serif",
      zIndex: 10,
    }}
  >
    {children}
  </div>
);

// ─── Sticky Note ─────────────────────────────────────────────────────────────
const StickyNote = ({ color = "Yellow", title, body, time, pinned, checked, style }) => (
  <div
    style={{
      width: 160,
      minHeight: 140,
      background: stickyColors[color],
      borderRadius: 16,
      padding: "12px 14px",
      boxShadow: "0 2px 8px rgba(0,0,0,.12), 0 6px 16px rgba(0,0,0,.08)",
      position: "absolute",
      fontFamily: "'Noto Sans KR', sans-serif",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style,
    }}
  >
    {pinned && (
      <span style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 16 }}>📌</span>
    )}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#333" }}>{title}</span>
      <Badge color={stickyColors[color]} style={{ border: "1.5px solid rgba(0,0,0,.25)" }} />
    </div>
    {checked !== undefined ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {body.map((item, i) => (
          <label key={i} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "#333" }}>
            <input type="checkbox" defaultChecked={item.done} style={{ accentColor: token.primary }} />
            <span style={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>{item.text}</span>
          </label>
        ))}
      </div>
    ) : (
      <p style={{ margin: 0, fontSize: 11, color: "#444", lineHeight: 1.6 }}>{body}</p>
    )}
    <p style={{ margin: "auto 0 0", fontSize: 9, color: "rgba(0,0,0,.4)" }}>{time}</p>
  </div>
);

// ─── Connection Status Banner ─────────────────────────────────────────────────
const StatusBanner = ({ status }) => {
  if (status === "connected") return null;
  const cfg = status === "disconnected"
    ? { bg: token.errorContainer, color: token.error, text: "서버 연결 끊김 — 재연결 중…", icon: "⚠️" }
    : { bg: "#E8F5E9", color: "#2E7D32", text: "재연결됨", icon: "✅" };
  return (
    <div style={{
      background: cfg.bg, color: cfg.color,
      padding: "8px 16px", fontSize: 12, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 8,
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <span>{cfg.icon}</span> {cfg.text}
    </div>
  );
};

// ─── VIEW: Controller (mobile) ────────────────────────────────────────────────
const tabs = ["메모", "할 일", "링크", "아이디어"];

const ControllerView = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [color, setColor] = useState("Yellow");
  const [connStatus, setConnStatus] = useState("connected");

  return (
    <div style={{
      width: 375, background: token.surface, borderRadius: 24,
      overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.2)",
      fontFamily: "'Noto Sans KR', sans-serif", position: "relative",
    }}>
      {/* Status bar */}
      <div style={{ background: token.primary, color: "#fff", padding: "10px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>SimpleMemo</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, background: "rgba(255,255,255,.2)", borderRadius: 99, padding: "3px 8px" }}>
            {connStatus === "connected" ? "🟢 연결됨" : "🔴 오프라인"}
          </span>
          <span style={{ fontSize: 18, cursor: "pointer" }} title="다크모드">🌙</span>
        </div>
      </div>

      <StatusBanner status={connStatus} />

      {/* M3 Tab Bar */}
      <div style={{ display: "flex", borderBottom: `1px solid ${token.surfaceVariant}` }}>
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            style={{
              flex: 1, padding: "12px 4px 10px",
              fontSize: 12, fontWeight: activeTab === i ? 700 : 400,
              color: activeTab === i ? token.primary : token.onSurfaceVariant,
              background: "transparent", border: "none",
              borderBottom: activeTab === i ? `2px solid ${token.primary}` : "2px solid transparent",
              cursor: "pointer", transition: "all .15s",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Color picker */}
        <div style={{ position: "relative" }}>
          <SectionLabel>색상 선택</SectionLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(stickyColors).map(([name, hex]) => (
              <button
                key={name}
                onClick={() => setColor(name)}
                title={name}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: hex, border: color === name ? `3px solid ${token.primary}` : "2px solid rgba(0,0,0,.15)",
                  cursor: "pointer", transition: "transform .1s",
                  transform: color === name ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
          <Note>Phase 2 — 6가지 컬러 프리셋</Note>
        </div>

        {/* Text input — M3 Filled */}
        <div style={{ position: "relative" }}>
          <SectionLabel>내용 입력</SectionLabel>
          <div style={{
            background: token.surfaceVariant, borderRadius: "12px 12px 4px 4px",
            borderBottom: `2px solid ${token.primary}`, padding: "10px 12px",
          }}>
            <p style={{ margin: 0, fontSize: 12, color: token.onSurfaceVariant }}>메모 내용을 입력하세요…</p>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 4,
            fontSize: 10, color: token.onSurfaceVariant,
          }}>
            <span>디바운스 300ms 자동 저장</span>
            <span>0 / 500</span>
          </div>
        </div>

        {/* Priority */}
        <div>
          <SectionLabel>우선순위</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {["없음", "낮음", "중간", "높음"].map((p, i) => (
              <Chip key={p} label={p} active={i === 0} />
            ))}
          </div>
        </div>

        {/* Add button */}
        <button style={{
          background: token.primary, color: "#fff",
          border: "none", borderRadius: 12, padding: "14px 0",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 2px 8px rgba(103,80,164,.4)",
          fontFamily: "'Noto Sans KR', sans-serif",
        }}>
          + 포스트잇 추가
        </button>

        {/* My recent memos */}
        <div>
          <SectionLabel>최근 메모</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { color: "Yellow", title: "회의 일정", time: "방금 전" },
              { color: "Pink",   title: "중요 공지",  time: "2분 전"  },
              { color: "Blue",   title: "참고 링크",  time: "10분 전" },
            ].map((m, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", background: token.surfaceVariant,
                borderRadius: 10,
              }}>
                <Badge color={stickyColors[m.color]} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: token.onSurface }}>{m.title}</span>
                <span style={{ fontSize: 10, color: token.onSurfaceVariant }}>{m.time}</span>
                <span style={{ fontSize: 14, cursor: "pointer", color: token.error }}>🗑</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Nav Bar */}
      <div style={{
        background: token.surface, borderTop: `1px solid ${token.surfaceVariant}`,
        display: "flex", justifyContent: "space-around", padding: "8px 0 12px",
      }}>
        {[["🏠", "홈"], ["🔍", "검색"], ["📦", "아카이브"], ["⚙️", "설정"]].map(([icon, label]) => (
          <button key={label} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: "transparent", border: "none", cursor: "pointer",
            color: label === "홈" ? token.primary : token.onSurfaceVariant,
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 9, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: label === "홈" ? 700 : 400 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── VIEW: Board (desktop) ────────────────────────────────────────────────────
const BoardView = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [connStatus] = useState("connected");

  return (
    <div style={{
      width: 760, height: 480, background: "#F3EDF7",
      borderRadius: 16, overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,.2)", position: "relative",
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      {/* Top Bar */}
      <div style={{
        background: token.surface, borderBottom: `1px solid ${token.surfaceVariant}`,
        padding: "0 20px", display: "flex", alignItems: "center", gap: 16, height: 52,
      }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: token.primary }}>SimpleMemo Board</span>
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)} style={{
              padding: "6px 14px", borderRadius: 99, border: "none",
              background: activeTab === i ? token.primaryContainer : "transparent",
              color: activeTab === i ? token.primary : token.onSurfaceVariant,
              fontWeight: activeTab === i ? 700 : 400, fontSize: 12, cursor: "pointer",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>{t}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <WFLabel>🟢 4기기 연결</WFLabel>
          <WFLabel>🌙 다크</WFLabel>
          <WFLabel>⛶ 전체화면</WFLabel>
          <WFLabel>📱 QR</WFLabel>
        </div>
      </div>

      {/* Board Canvas */}
      <div style={{ position: "relative", width: "100%", height: "calc(100% - 52px)", overflow: "hidden" }}>
        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(103,80,164,.12) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

        <StickyNote color="Yellow" title="오늘 회의" body="3시 마케팅팀 미팅. 슬라이드 준비 필요." time="10분 전" style={{ top: 40, left: 40 }} />
        <StickyNote color="Pink" title="중요 공지" body="서버 점검 4월 25일 오전 2-4시. 공지 필수!" time="30분 전" pinned style={{ top: 30, left: 220 }} />
        <StickyNote color="Blue" title="참고 자료" body="https://m3.material.io 디자인 토큰 확인" time="1시간 전" style={{ top: 50, left: 400 }} />
        <StickyNote
          color="Green"
          title="할 일"
          body={[{ text: "디바운스 300ms 통일", done: true }, { text: "멀티탭 UI", done: true }, { text: "리사이즈 기능", done: false }, { text: "아카이브", done: false }]}
          checked
          time="2시간 전"
          style={{ top: 220, left: 60 }}
        />
        <StickyNote color="Orange" title="주의" body="레거시 public/ 폴백 코드 제거 필요!" time="3시간 전" style={{ top: 210, left: 250 }} />
        <StickyNote color="Purple" title="아이디어" body="QR코드로 보드 공유 → 스마트폰 스캔" time="어제" style={{ top: 230, left: 420 }} />

        {/* Drag hint */}
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(255,255,255,.7)", backdropFilter: "blur(8px)",
          borderRadius: 99, padding: "6px 16px", fontSize: 11, color: token.onSurfaceVariant,
          display: "flex", gap: 6, alignItems: "center",
        }}>
          <span>✋ 드래그로 이동</span>
          <span>·</span>
          <span>✏️ 더블클릭 편집</span>
          <span>·</span>
          <span>📌 핀 고정</span>
        </div>
      </div>
    </div>
  );
};

// ─── VIEW: Search & Archive ───────────────────────────────────────────────────
const SearchView = () => {
  const [query, setQuery] = useState("회의");

  const results = [
    { color: "Yellow", title: "오늘 회의", snippet: "3시 마케팅팀 <mark>회의</mark>. 슬라이드 준비 필요.", tab: "메모", time: "10분 전" },
    { color: "Blue",   title: "주간 회의록", snippet: "지난주 <mark>회의</mark> 정리 — 액션아이템 3건", tab: "아이디어", time: "어제" },
  ];

  return (
    <div style={{
      width: 420, background: token.surface, borderRadius: 20,
      overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.18)",
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <div style={{ background: token.primary, padding: "16px 16px 0" }}>
        <p style={{ margin: "0 0 12px", color: "#fff", fontWeight: 700, fontSize: 14 }}>🔍 검색 & 아카이브</p>
        <div style={{
          background: "#fff", borderRadius: "12px 12px 0 0",
          padding: "10px 14px", display: "flex", gap: 8, alignItems: "center",
        }}>
          <span>🔍</span>
          <span style={{ fontSize: 13, color: token.onSurface }}>{query}</span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: token.onSurfaceVariant }}>2건</span>
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["전체", "메모", "할 일", "링크", "아이디어", "#태그"].map((c, i) => (
            <Chip key={c} label={c} active={i === 0} />
          ))}
        </div>

        {/* Results */}
        <SectionLabel>검색 결과</SectionLabel>
        {results.map((r, i) => (
          <div key={i} style={{
            background: token.surfaceVariant, borderRadius: 12, padding: "10px 12px",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: stickyColors[r.color], flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, boxShadow: "0 1px 4px rgba(0,0,0,.1)",
            }}>📝</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 13, color: token.onSurface }}>{r.title}</p>
              <p style={{ margin: "0 0 5px", fontSize: 11, color: token.onSurfaceVariant }}
                dangerouslySetInnerHTML={{ __html: r.snippet }} />
              <div style={{ display: "flex", gap: 8 }}>
                <WFLabel>{r.tab}</WFLabel>
                <WFLabel>{r.time}</WFLabel>
              </div>
            </div>
          </div>
        ))}

        {/* Archive section */}
        <div style={{ marginTop: 4 }}>
          <SectionLabel>아카이브</SectionLabel>
          {[
            { color: "Blue", title: "구 서버 설정 링크", time: "2주 전" },
            { color: "Purple", title: "아이디어: 다크모드", time: "1달 전" },
          ].map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px", borderRadius: 10, marginBottom: 6,
              border: `1px dashed ${token.outline}`,
              opacity: 0.75,
            }}>
              <Badge color={stickyColors[a.color]} />
              <span style={{ flex: 1, fontSize: 12, color: token.onSurfaceVariant }}>{a.title}</span>
              <WFLabel>{a.time}</WFLabel>
              <span style={{ fontSize: 12, cursor: "pointer", color: token.primary }}>↩ 복원</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── VIEW: Settings ───────────────────────────────────────────────────────────
const SettingsView = () => (
  <div style={{
    width: 340, background: token.surface, borderRadius: 20,
    overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.18)",
    fontFamily: "'Noto Sans KR', sans-serif",
  }}>
    <div style={{ background: token.primary, padding: "16px", color: "#fff" }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>⚙️ 설정</p>
    </div>
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>

      {[
        { section: "동작", items: [
          ["디바운스 저장 지연", "300ms", "slider"],
          ["오프라인 변경 자동 동기화", "켜짐", "toggle"],
        ]},
        { section: "표시", items: [
          ["테마", "라이트", "select"],
          ["폰트 크기 (보드)", "16px", "slider"],
          ["전체화면 자동 시작", "꺼짐", "toggle"],
        ]},
        { section: "데이터", items: [
          ["자동 백업 주기", "24시간", "select"],
          ["보관 백업 수", "10개", "select"],
        ]},
      ].map(({ section, items }) => (
        <div key={section}>
          <SectionLabel>{section}</SectionLabel>
          <div style={{ background: token.surfaceVariant, borderRadius: 12, overflow: "hidden" }}>
            {items.map(([label, value, type], i) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: i < items.length - 1 ? `1px solid ${token.surface}` : "none",
              }}>
                <span style={{ fontSize: 12, color: token.onSurface }}>{label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: type === "toggle"
                    ? (value === "켜짐" ? "#2E7D32" : token.error)
                    : token.primary,
                }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div>
        <SectionLabel>데이터 관리</SectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          {["JSON 내보내기", "JSON 가져오기"].map(label => (
            <button key={label} style={{
              flex: 1, padding: "10px 8px", borderRadius: 10,
              border: `1.5px solid ${token.primary}`, background: "transparent",
              color: token.primary, fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: token.primaryContainer, borderRadius: 12 }}>
        <p style={{ margin: 0, fontSize: 11, color: token.primary, fontWeight: 600 }}>
          📱 QR 코드로 접속
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 10, color: token.onSurfaceVariant }}>
          192.168.1.10:3000 — 스캔하여 보드 접속
        </p>
        <div style={{
          width: 80, height: 80, background: "#000", borderRadius: 8,
          margin: "8px auto 0", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#fff",
        }}>QR</div>
      </div>
    </div>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
const VIEWS = ["컨트롤러", "보드", "검색/아카이브", "설정"];

export default function App() {
  const [view, setView] = useState(0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #EDE7F6 0%, #F3E5F5 50%, #E8EAF6 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 24px 60px",
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: token.primary, letterSpacing: "-.02em" }}>
          SimpleMemo — 와이어프레임
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: token.onSurfaceVariant }}>
          M3 디자인 시스템 기반 · Phase 1–4 기능 반영
        </p>
      </div>

      {/* View selector */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 36,
        background: token.surface, padding: 6, borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,.08)",
      }}>
        {VIEWS.map((v, i) => (
          <button key={v} onClick={() => setView(i)} style={{
            padding: "8px 18px", borderRadius: 10, border: "none",
            background: view === i ? token.primary : "transparent",
            color: view === i ? "#fff" : token.onSurfaceVariant,
            fontWeight: view === i ? 700 : 400, fontSize: 13, cursor: "pointer",
            fontFamily: "'Noto Sans KR', sans-serif",
            transition: "all .15s",
          }}>{v}</button>
        ))}
      </div>

      {/* View */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 24 }}>
        {view === 0 && <ControllerView />}
        {view === 1 && <BoardView />}
        {view === 2 && <SearchView />}
        {view === 3 && <SettingsView />}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 36, background: token.surface, borderRadius: 14,
        padding: "14px 20px", display: "flex", gap: 24, flexWrap: "wrap",
        justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.08)",
        maxWidth: 800,
      }}>
        {[
          ["🟣", "M3 Primary", "#6750A4"],
          ["🟡", "Yellow 포스트잇", "#FFF9C4"],
          ["🩷", "Pink 포스트잇", "#F8BBD0"],
          ["🔵", "Blue 포스트잇", "#BBDEFB"],
          ["🟢", "Green 포스트잇", "#C8E6C9"],
          ["🟠", "Orange 포스트잇", "#FFE0B2"],
          ["🟣", "Purple 포스트잇", "#E1BEE7"],
        ].map(([emoji, name, hex]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: hex, display: "inline-block", border: "1px solid rgba(0,0,0,.1)" }} />
            <span style={{ fontSize: 11, color: token.onSurfaceVariant }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
