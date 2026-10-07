import axios from "axios";
import config from "config";
import { useEffect, useState } from "react";
import LoadingSpinner from "components/LoadingComponent";
import { useNotification } from "components/Safetynotification";

export default function SetupHeads() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const notify = useNotification();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, setupRes, assignRes] = await Promise.all([
          axios.get(`${config.baseApi}/auth/get-all-users`),
          axios.get(`${config.baseApi}/setup/all`),
          axios.get(`${config.baseApi}/setup/assign-heads/all`),
        ]);

        const allUsers = usersRes.data;
        const allGroups = setupRes.data.data;
        const savedAssignments = assignRes.data.data || {};

        setUsers(allUsers);
        setGroups(allGroups);

        const initial = {};
        allGroups.forEach((group) => {
          const savedGroup = savedAssignments[group.gd_id];

          initial[group.gd_id] = {
            group_head: savedGroup?.group_head || "",
          };

          group.departments.forEach((dept) => {
            const savedDept = savedGroup?.departments?.[dept.id];
            initial[`${group.gd_id}_${dept.id}`] = {
              dept_head: savedDept?.dept_head || "",
              section_head: savedDept?.section_head || "",
              supervisor: savedDept?.supervisor || "",
            };
          });
        });
        setFormData(initial);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          err.response?.data?.details ||
            "Something went wrong while loading data.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleChange = (key, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const payload = groups.map((group) => ({
      gd_id: group.gd_id,
      group_head: formData[group.gd_id]?.group_head || null,
      departments: group.departments.map((dept) => ({
        department_id: dept.id,
        dept_head: formData[`${group.gd_id}_${dept.id}`]?.dept_head || null,
        section_head:
          formData[`${group.gd_id}_${dept.id}`]?.section_head || null,
        supervisor: formData[`${group.gd_id}_${dept.id}`]?.supervisor || null,
      })),
    }));

    try {
      await axios.post(`${config.baseApi}/setup/assign-heads`, payload);
      notify.success(
        "Saved Successfully",
        "Head assignments have been updated.",
      );
    } catch (err) {
      console.error("Submit error:", err);
      notify.error(
        "Save Failed",
        err.response?.data?.details || "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  const UserSelect = ({ value, onChange, placeholder = "Unassigned" }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="sh-select"
    >
      <option value="">{placeholder}</option>
      {users.map((u) => (
        <option key={u.id_master} value={u.user_name}>
          {" "}
          {/* ← id_master, user_name */}
          {u.user_name}
        </option>
      ))}
    </select>
  );

  const GroupHeadSelect = ({ value, onChange, groupName }) => {
    // Temporary — check console to confirm exact values
    console.log("groupName from group.group:", groupName);
    console.log(
      "users emp_group samples:",
      users.slice(0, 5).map((u) => ({
        user_name: u.user_name,
        emp_group: u.emp_group,
        emp_position: u.emp_position,
        is_oic: u.is_oic,
      })),
    );

    const filtered = users.filter((u) => {
      const isNotOic =
        u.is_oic === "0" ||
        u.is_oic === 0 ||
        u.is_oic === null ||
        u.is_oic === undefined ||
        u.is_oic === "";

      const isGroupReviewer = u.emp_position === "group-reviewer";
      const isInGroup = u.emp_group === groupName;

      return isNotOic && isGroupReviewer && isInGroup;
    });

    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sh-select"
      >
        <option value="">Unassigned</option>
        {filtered.map((u) => (
          <option key={u.id_master} value={u.user_name}>
            {u.user_name}
          </option>
        ))}
      </select>
    );
  };

  const DeptHeadSelect = ({ value, onChange, deptName, groupName }) => {
    const filtered = users.filter((u) => {
      const isNotOic =
        u.is_oic === "0" ||
        u.is_oic === 0 ||
        u.is_oic === null ||
        u.is_oic === undefined ||
        u.is_oic === "";

      const isInDept = u.emp_department === deptName;
      const isInGroup = u.emp_group === groupName;
      const isDeptReviewer = u.emp_position === "department-reviewer";
      return isNotOic && isInDept && isInGroup && isDeptReviewer;
    });

    console.log(
      `DeptHeadSelect [${groupName} > ${deptName}] filtered:`,
      filtered,
    ); // remove after confirming

    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sh-select"
      >
        <option value="">Unassigned</option>
        {filtered.map((u) => (
          <option key={u.id_master} value={u.user_name}>
            {u.user_name}
          </option>
        ))}
      </select>
    );
  };

  const SubSelect = ({ value, onChange, placeholder, deptName, groupName }) => {
    const filtered = users.filter((u) => {
      const isInGroup = u.emp_group === groupName;
      const isInDept = u.emp_department === deptName;
      const isNotReviewer =
        u.emp_position !== "group-reviewer" &&
        u.emp_position !== "department-reviewer" &&
        u.emp_position !== "safety-head";

      return isInGroup && isInDept && isNotReviewer;
    });

    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sh-select"
      >
        <option value="">{placeholder || "Unassigned"}</option>
        {filtered.map((u) => (
          <option key={u.id_master} value={u.user_name}>
            {u.user_name}
          </option>
        ))}
      </select>
    );
  };

  if (loading) return <LoadingSpinner label="Fetching data" />;

  return (
    <div className="sr-shell">
      <style>{STYLE_SHEET}</style>

      {/* ── TOPBAR ── */}
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
              <span className="sr-topbar-title">SETUP</span>
              <span className="sr-topbar-sub">
                Assign Section Heads &amp; Supervisors
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="sr-main">
        <div className="sr-section-header">
          <div>
            <h1 className="sr-section-title">Head Assignments</h1>
            <p className="sr-section-sub">
              SETUP HEADS — GROUPS &amp; DEPARTMENTS
            </p>
          </div>
          <button
            className="sr-btn sr-btn--primary"
            onClick={handleSubmit}
            disabled={saving || loading}
          >
            {saving ? "Saving…" : "Save Assignments"}
          </button>
        </div>

        <div className="sr-content">
          {error && <div className="sr-banner">{error}</div>}

          {!error && groups.length === 0 && (
            <div className="sr-notice">No groups have been configured yet.</div>
          )}

          {groups.map((group) => (
            <div key={group.gd_id} className="sh-card">
              {/* ── GROUP HEADER ── */}
              <div className="sh-group-header">
                <div className="sh-group-title-block">
                  <span className="sh-badge sh-badge--group">GROUP</span>
                  <span className="sh-group-name">{group.group}</span>
                  <span className="sh-group-id">{group.gd_id}</span>
                </div>
                <div className="sh-row-fields">
                  <div className="sh-field">
                    <label className="sh-label">Group Head</label>
                    <GroupHeadSelect
                      value={formData[group.gd_id]?.group_head || ""}
                      onChange={(val) =>
                        handleChange(group.gd_id, "group_head", val)
                      }
                      groupName={group.group}
                    />
                  </div>
                </div>
              </div>

              {/* ── DEPARTMENTS ── */}
              <div className="sh-dept-list">
                {group.departments.map((dept, i) => {
                  const key = `${group.gd_id}_${dept.id}`;
                  return (
                    <div key={dept.id} className="sh-dept-block">
                      {/* Department row */}
                      <div className="sh-dept-header">
                        <div className="sh-dept-title-block">
                          <span className="sh-connector-line" />
                          <span className="sh-badge sh-badge--dept">DEPT</span>
                          <span className="sh-dept-name">
                            {dept.department}
                          </span>
                        </div>
                        <div className="sh-row-fields">
                          <div className="sh-field">
                            <label className="sh-label">Department Head</label>
                            <DeptHeadSelect
                              value={formData[key]?.dept_head || ""}
                              onChange={(val) =>
                                handleChange(key, "dept_head", val)
                              }
                              deptName={dept.department}
                              groupName={group.group}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-rows: Section Head + Supervisor */}
                      <div className="sh-sub-rows">
                        <div className="sh-sub-row">
                          <div className="sh-sub-label-block">
                            <span className="sh-sub-line" />
                            <span className="sh-sub-label">Section Head</span>
                          </div>
                          <div className="sh-row-fields">
                            <div className="sh-field">
                              <SubSelect
                                value={formData[key]?.section_head || ""}
                                onChange={(val) =>
                                  handleChange(key, "section_head", val)
                                }
                                placeholder="Assign section head…"
                                deptName={dept.department}
                                groupName={group.group}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="sh-sub-row sh-sub-row--last">
                          <div className="sh-sub-label-block">
                            <span className="sh-sub-line" />
                            <span className="sh-sub-label">Supervisor</span>
                          </div>
                          <div className="sh-row-fields">
                            <div className="sh-field">
                              <SubSelect
                                value={formData[key]?.supervisor || ""}
                                onChange={(val) =>
                                  handleChange(key, "supervisor", val)
                                }
                                placeholder="Assign supervisor…"
                                deptName={dept.department}
                                groupName={group.group}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Bottom save
          {groups.length > 0 && (
            <div className="sh-footer-actions">
              <button
                className="sr-btn sr-btn--primary"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save All Assignments"}
              </button>
            </div>
          )} */}
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET — extends your existing sr-* design system
   ════════════════════════════════════════════════════════════════════════ */
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
  --sr-danger:         #B02020;
  --sr-danger-soft:    #FAE8E8;
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body:    'Inter', sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;
}

/* ── shell / topbar / main — same as your existing page ── */
.sr-shell * { box-sizing: border-box; }
.sr-shell {
  min-height: 100vh; display: flex; flex-direction: column;
  background: var(--sr-paper-alt); font-family: var(--font-body); color: var(--sr-ink);
}
.sr-topbar-outer {
  background: #0D1B2A; position: sticky; top: 0; z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sr-topbar-brand {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 32px; flex-wrap: wrap; gap: 12px;
}
.sr-topbar-brand-left { display: flex; align-items: center; gap: 16px; }
.sr-topbar-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.1); }
.sr-topbar-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: 18px; color: #E8F4EF; letter-spacing: 0.05em; display: block;
}
.sr-topbar-sub {
  font-size: 10px; color: #4A6B84; text-transform: uppercase;
  letter-spacing: 0.08em; display: block;
}
.sr-btn-back-inline {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: #8AA4B8; padding: 6px 14px; border-radius: 6px;
  font-size: 12px; font-family: var(--font-body); cursor: pointer;
}
.sr-btn-back-inline:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
.sr-main { flex: 1; min-width: 0; padding: 28px 40px 80px; }
.sr-section-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid var(--sr-line); gap: 16px;
}
.sr-section-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: 32px; margin: 0; letter-spacing: 0.01em;
}
.sr-section-sub {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--sr-amber); letter-spacing: 0.1em; margin: 2px 0 0;
}
.sr-content { display: flex; flex-direction: column; gap: 20px; }
.sr-notice {
  background: var(--sr-amber-soft); border: 1px solid var(--sr-amber);
  color: var(--sr-amber-deep); font-size: 12px;
  padding: 10px 14px; border-radius: 6px; line-height: 1.5;
}
.sr-banner {
  background: var(--sr-danger-soft); border: 1px solid var(--sr-danger);
  color: #7A1F1F; font-size: 13px; font-weight: 600;
  padding: 10px 14px; border-radius: 6px;
}
.sr-btn {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
  padding: 9px 18px; border-radius: 6px; cursor: pointer; border: 1.5px solid transparent;
  white-space: nowrap;
}
.sr-btn--ghost {
  background: #fff; color: var(--sr-ink-soft); border-color: var(--sr-line-strong);
}
.sr-btn--ghost:hover { border-color: var(--sr-ink-soft); background: var(--sr-paper-alt); }
.sr-btn--primary { background: var(--sr-amber); color: #fff; border-color: var(--sr-amber); }
.sr-btn--primary:hover { background: var(--sr-amber-deep); border-color: var(--sr-amber-deep); }
.sr-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── CARD ── */
.sh-card {
  background: var(--sr-paper);
  border: 1px solid var(--sr-line);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

/* ── GROUP HEADER ROW ── */
.sh-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 20px;
  background: var(--sr-ink);
  border-bottom: 2px solid var(--sr-sidebar-accent);
  flex-wrap: wrap;
}
.sh-group-title-block {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.sh-group-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 20px;
  color: #E8F4EF;
  letter-spacing: 0.04em;
}
.sh-group-id {
  font-family: var(--font-mono);
  font-size: 10px;
  color: #4A6B84;
  letter-spacing: 0.06em;
}

/* ── BADGES ── */
.sh-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.sh-badge--group {
  background: var(--sr-sidebar-accent);
  color: #fff;
}
.sh-badge--dept {
  background: var(--sr-amber-soft);
  color: var(--sr-amber-deep);
  border: 1px solid var(--sr-amber);
}

/* ── DEPT LIST ── */
.sh-dept-list {
  display: flex;
  flex-direction: column;
}

/* ── DEPT BLOCK ── */
.sh-dept-block {
  border-bottom: 1px solid var(--sr-line);
}
.sh-dept-block:last-child { border-bottom: none; }

/* ── DEPT HEADER ROW ── */
.sh-dept-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 20px 12px 32px;
  background: var(--sr-paper-alt);
  border-bottom: 1px solid var(--sr-line);
  flex-wrap: wrap;
}
.sh-dept-title-block {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.sh-dept-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--sr-ink);
  letter-spacing: 0.02em;
}

/* ── CONNECTOR LINES ── */
.sh-connector-line {
  display: inline-block;
  width: 16px;
  height: 2px;
  background: var(--sr-line-strong);
  border-radius: 2px;
  flex-shrink: 0;
}
.sh-sub-line {
  display: inline-block;
  width: 24px;
  height: 1px;
  background: var(--sr-line);
  flex-shrink: 0;
}

/* ── SUB ROWS (section head / supervisor) ── */
.sh-sub-rows {
  display: flex;
  flex-direction: column;
}
.sh-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 20px 10px 56px;
  border-bottom: 1px dashed var(--sr-line);
  background: var(--sr-paper);
  flex-wrap: wrap;
}
.sh-sub-row--last { border-bottom: none; }
.sh-sub-label-block {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 130px;
}
.sh-sub-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--sr-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ── SHARED FIELD + SELECT ── */
.sh-row-fields { display: flex; gap: 14px; align-items: center; flex: 1; justify-content: flex-end; }
.sh-field { display: flex; flex-direction: column; gap: 4px; min-width: 220px; max-width: 320px; flex: 1; }
.sh-label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--sr-muted);
}
.sh-select {
  width: 100%;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-ink);
  background: #fff;
  border: 1.5px solid var(--sr-line-strong);
  border-radius: 6px;
  padding: 8px 10px;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235E7A6E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.sh-select:focus {
  border-color: var(--sr-sidebar-accent);
  box-shadow: 0 0 0 3px rgba(27, 140, 96, 0.14);
}
.sh-select:hover { border-color: var(--sr-amber); }

/* ── FOOTER ── */
.sh-footer-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

@media (max-width: 768px) {
  .sr-topbar-brand { padding: 10px 16px; }
  .sr-main { padding: 20px 16px 60px; }
  .sr-section-header { flex-direction: column; align-items: flex-start; }
  .sh-group-header, .sh-dept-header, .sh-sub-row {
    flex-direction: column; align-items: flex-start;
  }
  .sh-row-fields { width: 100%; justify-content: flex-start; }
  .sh-field { max-width: 100%; }
}
`;
