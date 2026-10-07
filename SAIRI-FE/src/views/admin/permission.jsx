import axios from "axios";
import config from "config";
import { useEffect, useState } from "react";
import LoadingSpinner from "components/LoadingComponent";

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */

const SECTIONS = [
  { key: "section_three_approvers", label: "Section 3 Approvers" },
];

const POSITIONS = [
  { value: "group-head", label: "Group Head" },
  { value: "department-head", label: "Department Head" },
  { value: "section-head", label: "Section Head" },
  { value: "supervisor", label: "Supervisor" },
  { value: "department-reviewer", label: "Department Reviewer" },
  { value: "safety-head", label: "Safety Head" },
  { value: "safety-reviewer", label: "Safety Reviewer" },
];

const initState = () =>
  Object.fromEntries(
    SECTIONS.map((s) => [
      s.key,
      { departments: new Set(), positions: new Set() },
    ]),
  );

/* ═══════════════════════════════════════════════════
   SHARED UI PRIMITIVES  (mirrors AddReport.jsx)
═══════════════════════════════════════════════════ */

function Plate({ code, title }) {
  return (
    <div className="sr-plate">
      <span className="sr-plate-code">{code}</span>
      <span className="sr-plate-title">{title}</span>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="sr-panel">
      {title && <div className="sr-panel-title">{title}</div>}
      <div className="sr-panel-body">{children}</div>
    </div>
  );
}

function SrCheck({ checked, onChange, label, variant }) {
  return (
    <label className="sr-check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span
        className={`sr-check-box${variant === "green" ? " sr-check-box--green" : ""}`}
      />
      <span className="sr-check-label">{label}</span>
    </label>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */

export default function Permission() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignments, setAssignments] = useState(initState);
  const empInfo = JSON.parse(localStorage.getItem("user")) || {};

  const allDepartments = [
    ...new Map(
      groups.flatMap((g) => g.departments ?? []).map((d) => [d.id, d]),
    ).values(),
  ];

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${config.baseApi}/setup/all`);
        const data = res.data?.data || res.data || [];
        setGroups(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error("UNABLE TO FETCH ALL GROUP DEPARTMENT", err);
        setError("Failed to load departments.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const toggleDepartment = (sectionKey, deptId) => {
    setAssignments((prev) => {
      const next = new Set(prev[sectionKey].departments);
      next.has(deptId) ? next.delete(deptId) : next.add(deptId);
      return {
        ...prev,
        [sectionKey]: { ...prev[sectionKey], departments: next },
      };
    });
  };

  const togglePosition = (sectionKey, posValue) => {
    setAssignments((prev) => {
      const next = new Set(prev[sectionKey].positions);
      next.has(posValue) ? next.delete(posValue) : next.add(posValue);
      return {
        ...prev,
        [sectionKey]: { ...prev[sectionKey], positions: next },
      };
    });
  };

  const handleSave = async () => {
    const payload = SECTIONS.map((section) => ({
      section: section.key,
      label: section.label,
      departmentIds: [...assignments[section.key].departments],
      positions: [...assignments[section.key].positions],
    }));

    await axios.post(`${config.baseApi}/setup/permissions/save`, {
      assignments: payload,
      saved_by: empInfo.user_name,
    });
  };

  const handleClear = () => setAssignments(initState);

  if (loading) return <LoadingSpinner label="Loading permissions" />;

  return (
    <div className="sr-shell">
      <style>{STYLE_SHEET}</style>

      {/* ─── TOP HEADER BAR ─── */}
      <div className="sr-topbar-outer">
        <div className="sr-topbar-brand">
          <div className="sr-topbar-brand-left">
            <button
              className="sr-btn-back-inline"
              onClick={() => window.history.back()}
            >
              ← Back
            </button>
            <div className="sr-topbar-divider" />
            <div>
              <span className="sr-topbar-title">
                Section 3 - Physician Approval
              </span>
              <span className="sr-topbar-sub">
                Section 3 - Medical Evaluation
              </span>
            </div>
          </div>
          <div className="sr-topbar-actions">
            <button className="sr-btn sr-btn--ghost" onClick={handleClear}>
              Clear
            </button>
            <button className="sr-btn sr-btn--primary" onClick={handleSave}>
              Save Assignments
            </button>
          </div>
        </div>

        {/* ─── SECTION INDICATOR STRIP ─── */}
        <div className="sr-section-strip">
          {SECTIONS.map((sec, idx) => {
            const { departments: d, positions: p } = assignments[sec.key];
            const filled = d.size + p.size;
            return (
              <div
                key={sec.key}
                style={{ display: "flex", alignItems: "center" }}
              >
                {idx > 0 && <div className="sr-section-strip-divider" />}
                <div
                  className={`sr-section-strip-item${filled ? " sr-section-strip-item--filled" : ""}`}
                >
                  <span
                    className={`sr-section-strip-num${filled ? " sr-section-strip-num--filled" : ""}`}
                  >
                    {filled ? "✓" : idx + 1}
                  </span>
                  <span className="sr-section-strip-label">{sec.label}</span>
                  {filled > 0 && (
                    <span className="sr-section-strip-badge">{filled}</span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="sr-section-strip-note">
            Assign departments and positions to each section
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="sr-main">
        <div className="sr-section-header">
          <div>
            <h1 className="sr-section-title">
              Attending Physician Approver Setup
            </h1>
            <p className="sr-section-sub">PERMISSIONS.CONFIG</p>
          </div>
        </div>

        {error && (
          <div className="sr-banner" style={{ marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <div className="sr-content">
          <div className="sr-notice">
            Assign one or more <strong>departments</strong> and{" "}
            <strong>employee positions</strong> to each section. These determine
            who can view and act on reports routed to each section.
          </div>

          {SECTIONS.map((section, sIdx) => {
            const { departments: deptSet, positions: posSet } =
              assignments[section.key];

            return (
              <div key={section.key}>
                <Plate code={`SECTION.0${sIdx + 1}`} title={section.label} />

                <Panel>
                  <div className="perm-two-col">
                    {/* ── Departments ── */}
                    <div className="perm-block">
                      <div className="perm-block-header">
                        <span className="perm-block-label">Departments</span>
                        {deptSet.size > 0 && (
                          <span className="perm-mini-badge perm-mini-badge--blue">
                            {deptSet.size} selected
                          </span>
                        )}
                      </div>
                      <div className="sr-check-grid sr-check-grid--col">
                        {allDepartments.length === 0 ? (
                          <p className="sr-help">No departments available.</p>
                        ) : (
                          allDepartments.map((dept) => (
                            <SrCheck
                              key={dept.id}
                              checked={deptSet.has(dept.id)}
                              onChange={() =>
                                toggleDepartment(section.key, dept.id)
                              }
                              label={dept.department}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    {/* ── Positions ── */}
                    <div className="perm-block perm-block--positions">
                      <div className="perm-block-header">
                        <span className="perm-block-label">
                          Employee Positions
                        </span>
                        {posSet.size > 0 && (
                          <span className="perm-mini-badge perm-mini-badge--green">
                            {posSet.size} selected
                          </span>
                        )}
                      </div>
                      <div className="sr-check-grid sr-check-grid--col">
                        {POSITIONS.map((pos) => (
                          <SrCheck
                            key={pos.value}
                            checked={posSet.has(pos.value)}
                            onChange={() =>
                              togglePosition(section.key, pos.value)
                            }
                            label={pos.label}
                            variant="green"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STYLESHEET — same design tokens as AddReport.jsx
═══════════════════════════════════════════════════ */

const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --sr-ink:            #0D1B2A;
  --sr-ink-soft:       #2C4A3E;
  --sr-muted:          #5E7A6E;
  --sr-paper:          #FFFFFF;
  --sr-paper-alt:      #F0F4F2;
  --sr-line:           #C8D8D1;
  --sr-line-strong:    #9DBCB0;
  --sr-amber:          #1B5E44;
  --sr-amber-deep:     #0F3D2B;
  --sr-amber-soft:     #D4EDE5;
  --sr-sidebar-accent: #1B8C60;
  --sr-sidebar-muted:  #4A6B84;
  --sr-danger:         #B02020;
  --sr-danger-soft:    #FAE8E8;
  --sr-success:        #1B5E44;
  --sr-success-soft:   #D4EDE5;
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body:    'Inter', sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;
}

.sr-shell * { box-sizing: border-box; }
.sr-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--sr-paper-alt);
  font-family: var(--font-body);
  color: var(--sr-ink);
}

/* ── TOP BAR ── */
.sr-topbar-outer {
  background: #0D1B2A;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sr-topbar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-wrap: wrap;
  gap: 12px;
}
.sr-topbar-brand-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.sr-topbar-divider {
  width: 1px; height: 28px;
  background: rgba(255,255,255,0.1);
}
.sr-topbar-title {
  font-family: var(--font-display);
  font-weight: 700; font-size: 18px;
  color: #E8F4EF; letter-spacing: 0.05em; display: block;
}
.sr-topbar-sub {
  font-size: 10px; color: #4A6B84;
  text-transform: uppercase; letter-spacing: 0.08em; display: block;
}
.sr-topbar-actions { display: flex; gap: 10px; align-items: center; }
.sr-btn-back-inline {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: #8AA4B8; padding: 6px 14px; border-radius: 6px;
  font-size: 12px; font-family: var(--font-body); cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.sr-btn-back-inline:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

/* ── SECTION STRIP ── */
.sr-section-strip {
  display: flex; align-items: center; gap: 0;
  padding: 0 32px; overflow-x: auto; scrollbar-width: none;
}
.sr-section-strip::-webkit-scrollbar { display: none; }
.sr-section-strip-item {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 14px; color: #4A6B84;
  font-size: 12px; white-space: nowrap;
}
.sr-section-strip-item--filled { color: #A8D5C4; }
.sr-section-strip-num {
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-family: var(--font-mono); flex-shrink: 0;
}
.sr-section-strip-num--filled { background: #1B8C60; color: #fff; font-size: 10px; }
.sr-section-strip-label { font-weight: 500; }
.sr-section-strip-divider { width: 20px; height: 1px; background: rgba(255,255,255,0.1); }
.sr-section-strip-note {
  margin-left: auto; font-size: 10px; color: #4A6B84;
  font-style: italic; padding: 11px 0; white-space: nowrap;
}
.sr-section-strip-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px;
  background: #1B8C60; color: #fff; border-radius: 999px;
  font-family: var(--font-mono); font-size: 9px; font-weight: 700;
  padding: 0 4px; margin-left: 2px;
}

/* ── MAIN ── */
.sr-main { flex: 1; min-width: 0; padding: 28px 40px 80px; }
.sr-section-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 24px; padding-bottom: 18px;
  border-bottom: 2px solid var(--sr-line);
  flex-wrap: wrap; gap: 14px;
}
.sr-section-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: 32px; margin: 0; letter-spacing: 0.01em;
}
.sr-section-sub {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--sr-amber); letter-spacing: 0.1em; margin: 2px 0 0;
}
.sr-content { display: flex; flex-direction: column; gap: 18px; }

/* ── PLATE ── */
.sr-plate {
  display: flex; align-items: baseline; gap: 12px;
  background: var(--sr-ink); color: #fff;
  border-left: 5px solid var(--sr-sidebar-accent);
  padding: 10px 18px; border-radius: 5px;
}
.sr-plate-code {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--sr-sidebar-accent); letter-spacing: 0.08em;
}
.sr-plate-title {
  font-family: var(--font-display); font-weight: 600;
  font-size: 19px; letter-spacing: 0.01em;
}

/* ── PANEL ── */
.sr-panel {
  background: var(--sr-paper);
  border: 1px solid var(--sr-line);
  border-radius: 8px; padding: 18px 20px;
}
.sr-panel-title {
  font-family: var(--font-display); font-weight: 600;
  font-size: 15px; color: var(--sr-ink-soft);
  text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 12px; padding-bottom: 8px;
  border-bottom: 1px solid var(--sr-line);
}
.sr-panel-body { display: flex; flex-direction: column; gap: 16px; }

/* ── NOTICE ── */
.sr-notice {
  background: var(--sr-amber-soft);
  border: 1px solid var(--sr-amber);
  color: var(--sr-amber-deep);
  font-size: 12px; padding: 10px 14px; border-radius: 6px; line-height: 1.5;
}
.sr-banner {
  background: var(--sr-danger-soft); border: 1px solid var(--sr-danger);
  color: #7A1F1F; font-size: 13px; font-weight: 600;
  padding: 10px 14px; border-radius: 6px;
}
.sr-help { font-size: 12px; color: var(--sr-muted); font-style: italic; margin: 0; }

/* ── TWO-COLUMN PERMISSION LAYOUT ── */
.perm-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
@media (max-width: 700px) {
  .perm-two-col { grid-template-columns: 1fr; }
  .perm-block--positions { border-left: none; border-top: 1px solid var(--sr-line); }
}

.perm-block {
  padding: 4px 16px 8px 0;
}
.perm-block--positions {
  padding: 4px 0 8px 20px;
  border-left: 1px solid var(--sr-line);
}

.perm-block-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 10px; padding-bottom: 6px;
  border-bottom: 1px solid var(--sr-line);
}
.perm-block-label {
  font-family: var(--font-mono); font-size: 10.5px; font-weight: 600;
  color: var(--sr-amber); text-transform: uppercase; letter-spacing: 0.08em;
}
.perm-mini-badge {
  font-size: 10px; font-weight: 700; padding: 1px 8px;
  border-radius: 999px;
}
.perm-mini-badge--blue  { background: #DBEAFE; color: #1D4ED8; }
.perm-mini-badge--green { background: #DCFCE7; color: #15803D; }

/* ── CHECKBOXES ── */
.sr-check-grid { display: flex; flex-wrap: wrap; gap: 10px 20px; }
.sr-check-grid--col { flex-direction: column; gap: 8px; flex-wrap: nowrap; }

.sr-check {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 13px; cursor: pointer; color: var(--sr-ink-soft); line-height: 1.4;
}
.sr-check input { display: none; }
.sr-check-box {
  width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px;
  border: 1.5px solid var(--sr-line-strong); border-radius: 3px;
  background: #fff; position: relative; transition: all 0.12s;
}
.sr-check input:checked + .sr-check-box {
  background: var(--sr-amber); border-color: var(--sr-amber-deep);
}
.sr-check input:checked + .sr-check-box--green {
  background: #16A34A; border-color: #15803D;
}
.sr-check input:checked + .sr-check-box::after,
.sr-check input:checked + .sr-check-box--green::after {
  content: ''; position: absolute; left: 4px; top: 1px;
  width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0;
  transform: rotate(40deg);
}
.sr-check-label { font-size: 13px; color: var(--sr-ink-soft); }

/* ── BUTTONS ── */
.sr-btn {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
  padding: 9px 18px; border-radius: 6px; cursor: pointer; border: 1.5px solid transparent;
}
.sr-btn--primary {
  background: var(--sr-amber); color: #fff; border-color: var(--sr-amber-deep);
}
.sr-btn--primary:hover { background: var(--sr-amber-deep); }
.sr-btn--ghost {
  background: #fff; color: var(--sr-ink-soft); border-color: var(--sr-line-strong);
}
.sr-btn--ghost:hover { border-color: var(--sr-ink-soft); background: var(--sr-paper-alt); }

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .sr-topbar-brand { padding: 10px 16px; }
  .sr-section-strip { padding: 0 16px; }
  .sr-section-strip-note { display: none; }
  .sr-main { padding: 20px 16px 60px; }
}
`;
