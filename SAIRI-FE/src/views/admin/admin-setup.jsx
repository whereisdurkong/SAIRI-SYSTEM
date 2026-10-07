import { useNavigate } from "react-router-dom";

/* ── Icons (inline SVG, no extra dependency needed) ─────────────────── */
const iconProps = {
  width: 30,
  height: 30,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const NetworkIcon = () => (
  <svg {...iconProps}>
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
    <path d="M12 12V8" />
  </svg>
);

const StethoscopeIcon = () => (
  <svg {...iconProps}>
    <path d="M11 2v2" />
    <path d="M5 2v2" />
    <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
    <path d="M8 15a6 6 0 0 0 12 0v-3" />
    <circle cx="20" cy="10" r="2" />
  </svg>
);

const UsersIcon = () => (
  <svg {...iconProps}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/* ── Setup options ──────────────────────────────────────────────────── */
const OPTIONS = [
  {
    title: "Group – Department Setup",
    description: "Organize departments under their groups.",
    path: "/admin/all-group-department",
    Icon: NetworkIcon,
  },
  {
    title: "Physician Setup",
    description: "Manage the medical approvers for Section 3.",
    path: "/admin/admin-setup-permission",
    Icon: StethoscopeIcon,
  },
  {
    title: "User Group Setup",
    description: "Create user groups and assign their heads.",
    path: "/admin/admin-setup-head",
    Icon: UsersIcon,
  },
];

export default function AdminSetup() {
  const navigate = useNavigate();

  return (
    <div className="amr-shell">
      <style>{STYLE_SHEET}</style>

      {/* ─── TOP HEADER BAR ─── */}
      <div className="amr-topbar-outer">
        <div className="amr-topbar-brand">
          <div className="amr-topbar-brand-left">
            <button
              className="sr-btn-back-inline"
              onClick={() => window.history.back()}
            >
              ← Back to reports
            </button>
            <div className="amr-topbar-divider" />
            <div>
              <span className="amr-topbar-title">Admin Setup</span>
              <span className="amr-topbar-sub">
                Eight views of the same Section 1 / 3 data, one register
              </span>
            </div>
          </div>
        </div>

        <nav
          className="amr-section-strip"
          role="tablist"
          aria-label="Report views"
        >
          <div className="amr-strip-track"></div>
        </nav>
      </div>

      {/* ─── SETUP BUTTONS ─── */}
      <main className="amr-content">
        <h1 className="amr-heading">What would you like to set up?</h1>
        <p className="amr-lead">Choose an area to open its settings.</p>

        <div className="amr-grid">
          {OPTIONS.map(({ title, description, path, Icon }) => (
            <button
              key={path}
              type="button"
              className="amr-card"
              onClick={() => navigate(path)}
            >
              <span className="amr-card-icon">
                <Icon />
              </span>
              <span className="amr-card-title">{title}</span>
              <span className="amr-card-desc">{description}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

.amr-shell * { box-sizing: border-box; }
.amr-shell {
  font-family: 'Inter', sans-serif;
  color: #0D1B2A;
  background: #F8F9FE;
  min-height: 100vh;
}

/* ═══ TOP HEADER BAR ═══ */
.amr-topbar-outer {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #0D1B2A;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.amr-topbar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1800px;
  margin: 0 auto;
  padding: 12px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-wrap: wrap;
  gap: 12px;
}

.amr-topbar-brand-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.amr-topbar-divider {
  width: 1px;
  height: 28px;
  background: rgba(255,255,255,0.1);
}

.amr-topbar-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 18px;
  color: #E8F4EF;
  letter-spacing: 0.05em;
  display: block;
}

.amr-topbar-sub {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  color: #4A6B84;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: block;
  margin-top: 3px;
}

/* ═══ SECTION / NAV STRIP ═══ */
.amr-section-strip {
  max-width: 1800px;
  margin: 0 auto;
  padding: 0 32px;
}
.amr-strip-track {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.amr-strip-track::-webkit-scrollbar { display: none; }

.sr-btn-back-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: #8AA4B8;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.sr-btn-back-inline:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

/* ═══ PAGE CONTENT ═══ */
.amr-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 56px 32px 64px;
}
.amr-heading {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 34px;
  letter-spacing: 0.02em;
  color: #0D1B2A;
}
.amr-lead {
  margin: 6px 0 36px;
  font-size: 14px;
  color: #4A6B84;
}

/* ═══ BUTTON CARDS (icon on top) ═══ */
.amr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.amr-card {
  appearance: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 36px 24px 32px;
  background: #fff;
  border: 1px solid #DDE6EE;
  border-radius: 14px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.amr-card:hover {
  transform: translateY(-3px);
  border-color: #1B8C60;
  box-shadow: 0 12px 28px rgba(13, 27, 42, 0.10);
}
.amr-card:active { transform: translateY(-1px); }
.amr-card:focus-visible { outline: 2px solid #1B8C60; outline-offset: 3px; }

.amr-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  margin-bottom: 10px;
  border-radius: 16px;
  background: #E8F4EF;
  color: #1B8C60;
  transition: background 0.18s ease, color 0.18s ease;
}
.amr-card:hover .amr-card-icon {
  background: #1B8C60;
  color: #fff;
}

.amr-card-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 21px;
  letter-spacing: 0.03em;
  color: #0D1B2A;
}
.amr-card-desc {
  max-width: 24ch;
  font-size: 13px;
  line-height: 1.5;
  color: #4A6B84;
}

@media (max-width: 640px) {
  .amr-topbar-brand { padding: 10px 16px; }
  .amr-section-strip { padding: 0 16px; }
  .amr-topbar-title { font-size: 16px; }
  .amr-content { padding: 32px 16px 48px; }
  .amr-heading { font-size: 28px; }
}

@media (prefers-reduced-motion: reduce) {
  .amr-card, .amr-card-icon { transition: none; }
  .amr-card:hover { transform: none; }
}
`;
