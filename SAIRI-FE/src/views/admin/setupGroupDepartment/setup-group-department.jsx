import { useState } from "react";
import { useNotification } from "components/Safetynotification.jsx";
import axios from "axios";
import config from "config";
/* ════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════════════ */

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === "";

let deptIdCounter = 1;
const makeDept = () => ({ id: deptIdCounter++, name: "" });

/* ════════════════════════════════════════════════════════════════════════
   VALIDATION
   ════════════════════════════════════════════════════════════════════════ */

function validateForm(form) {
    const errors = { departments: {} };

    if (isEmpty(form.groupName)) errors.groupName = "Group name is required.";

    const filledDepts = form.departments.filter(d => d.name.trim());
    if (filledDepts.length === 0) errors.departmentsGeneral = "Add at least one department.";

    form.departments.forEach(d => {
        if (d.name.trim()) {
            // check for duplicates
            const dupes = form.departments.filter(x => x.name.trim().toLowerCase() === d.name.trim().toLowerCase());
            if (dupes.length > 1 && dupes[0].id === d.id) {
                errors.departments[d.id] = "Duplicate department name.";
            }
        }
    });

    return errors;
}

const hasAnyErrors = (errObj) => {
    if (!errObj) return false;
    for (const k in errObj) {
        const v = errObj[k];
        if (v && typeof v === "object") { if (Object.keys(v).length > 0) return true; }
        else if (v) return true;
    }
    return false;
};

const makeFormDefault = () => ({
    groupName: "",
    departments: [makeDept(), makeDept()],
});

/* ════════════════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════ */

function Req() { return <span className="sr-req">＊</span>; }

function ErrorText({ msg }) {
    if (!msg) return null;
    return <div className="sr-error-text">{msg}</div>;
}

function Plate({ code, title, note }) {
    return (
        <div className="sr-plate">
            <span className="sr-plate-code">{code}</span>
            <span className="sr-plate-title">{title}</span>
            {note && <span className="sr-plate-note">{note}</span>}
        </div>
    );
}

function Panel({ title, error, children }) {
    return (
        <div className="sr-panel">
            {title && (
                <div className="sr-panel-title">
                    {title}
                    {error && <ErrorText msg={error} />}
                </div>
            )}
            <div className="sr-panel-body">{children}</div>
        </div>
    );
}

function Field({ label, required, error, children, hint }) {
    return (
        <label className="sr-field">
            {label && (
                <span className="sr-label">
                    {label}{required && <Req />}
                </span>
            )}
            {children}
            {hint && <span className="sr-hint">{hint}</span>}
            <ErrorText msg={error} />
        </label>
    );
}

function TextInput({ error, ...props }) {
    return <input className={`sr-input${error ? " sr-input--err" : ""}`} {...props} />;
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */

export default function SetupGroupDepartment() {
    const notify = useNotification();
    const [form, setForm] = useState(makeFormDefault());
    const [errors, setErrors] = useState({ departments: {} });
    const [attempted, setAttempted] = useState(false);

    const empInfo = JSON.parse(localStorage.getItem("user")) || {};

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const setDept = (id, value) =>
        setForm(f => ({
            ...f,
            departments: f.departments.map(d => d.id === id ? { ...d, name: value } : d),
        }));

    const addDept = () =>
        setForm(f => ({ ...f, departments: [...f.departments, makeDept()] }));

    const removeDept = (id) =>
        setForm(f => ({
            ...f,
            departments: f.departments.length > 1
                ? f.departments.filter(d => d.id !== id)
                : f.departments,
        }));

    const handleSave = async () => {
        const e = validateForm(form);
        setErrors(e);
        setAttempted(true);

        if (hasAnyErrors(e)) {
            notify.error("VALIDATION FAILED", "Please fix the highlighted fields before saving.");
            return;
        }

        const payload = {
            groupName: form.groupName.trim(),
            departments: form.departments
                .filter(d => d.name.trim())
                .map(d => d.name.trim()),
            created_by: empInfo.user_name, // pull from auth context/session
        };

        try {
            const res = await axios.post(`${config.baseApi}/setup/add`, payload);

            if (res.data.message === "success") {
                notify.success("SUCCESS", "Group and departments saved successfully!");
                deptIdCounter = 1;
                setForm(makeFormDefault());
                setErrors({ departments: {} });
                setAttempted(false);
            } else {
                notify.error("ERROR", res.data.details || "Failed to save group.");
            }
        } catch (err) {
            console.error("Save group/department error:", err);
            notify.error("ERROR", err.response?.data?.details || "Something went wrong while saving.");
        }
    };

    const handleClear = () => {
        deptIdCounter = 1;
        setForm(makeFormDefault());
        setErrors({ departments: {} });
        setAttempted(false);
    };

    const e = attempted ? errors : { departments: {} };
    const filledDepts = form.departments.filter(d => d.name.trim());

    return (
        <div className="sr-shell">
            <style>{STYLE_SHEET}</style>

            {/* ─── TOP HEADER BAR ─── */}
            <div className="sr-topbar-outer">
                <div className="sr-topbar-brand">
                    <div className="sr-topbar-brand-left">
                        <button className="sr-btn-back-inline" onClick={() => window.history.back()}>
                            ← Back
                        </button>
                        <div className="sr-topbar-divider" />
                        <div>
                            <span className="sr-topbar-title">SETUP</span>
                            <span className="sr-topbar-sub">Group &amp; Department Configuration</span>
                        </div>
                    </div>
                    <div className="sr-topbar-actions">
                        <button className="sr-btn sr-btn--ghost" onClick={handleClear}>Clear</button>
                        <button className="sr-btn sr-btn--primary" onClick={handleSave}>Save Group</button>
                    </div>
                </div>

                {/* ─── SECTION STRIP ─── */}
                <div className="sr-section-strip">
                    <div className="sr-section-strip-item sr-section-strip-item--active">
                        <span className="sr-section-strip-num">1</span>
                        <span className="sr-section-strip-label">Group Info</span>
                    </div>
                    <div className="sr-section-strip-divider" />
                    <div className={`sr-section-strip-item${filledDepts.length > 0 ? " sr-section-strip-item--filled" : ""}`}>
                        <span className={`sr-section-strip-num${filledDepts.length > 0 ? " sr-section-strip-num--filled" : ""}`}>
                            {filledDepts.length > 0 ? "✓" : "2"}
                        </span>
                        <span className="sr-section-strip-label">Departments</span>
                        {filledDepts.length > 0 && (
                            <span className="sr-section-strip-badge">{filledDepts.length}</span>
                        )}
                    </div>
                    <div className="sr-section-strip-note">
                        Define the organizational group and its departments
                    </div>
                </div>
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <main className="sr-main">
                <div className="sr-section-header">
                    <div>
                        <h1 className="sr-section-title">Group &amp; Department Setup</h1>
                        <p className="sr-section-sub">SETUP.01–02</p>
                    </div>
                </div>

                <div className="sr-content">
                    {/* Validation banner */}
                    {attempted && hasAnyErrors(errors) && (
                        <div className="sr-banner">Please fix the highlighted fields before saving.</div>
                    )}

                    <div className="sr-stack">
                        <div className="sr-notice">
                            Define a group and its associated departments. Each group can have multiple departments.
                            Departments added here will be available across all reporting forms.
                        </div>

                        {/* ─── SECTION 01: GROUP ─── */}
                        <Plate code="SECTION.01" title="Group Information" />

                        <Panel>
                            <Field
                                label="Group Name"
                                required
                                error={e.groupName}
                                hint="e.g. Mining Operations, Safety &amp; Compliance, Administration"
                            >
                                <TextInput
                                    value={form.groupName}
                                    onChange={ev => set("groupName", ev.target.value)}
                                    error={e.groupName}
                                    placeholder="Enter group name"
                                />
                            </Field>
                        </Panel>

                        {/* ─── SECTION 02: DEPARTMENTS ─── */}
                        <Plate code="SECTION.02" title="Departments" />

                        <Panel error={e.departmentsGeneral}>
                            <p className="sr-help">
                                Add one or more departments under this group. Each department will be linked to the group above.
                            </p>

                            <div className="sr-action-list">
                                {form.departments.map((dept, idx) => {
                                    const rowErr = e.departments[dept.id];
                                    return (
                                        <div className="sr-action-card" key={dept.id}>
                                            <div className="sr-action-head">
                                                <span className="sr-action-num">
                                                    DEPARTMENT {String(idx + 1).padStart(2, "0")}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="sr-action-remove"
                                                    disabled={form.departments.length === 1}
                                                    onClick={() => removeDept(dept.id)}
                                                    title="Remove department"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <Field label="Department Name" error={rowErr}>
                                                <TextInput
                                                    value={dept.name}
                                                    onChange={ev => setDept(dept.id, ev.target.value)}
                                                    error={rowErr}
                                                    placeholder="Enter department name"
                                                />
                                            </Field>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                className="sr-btn sr-btn--ghost"
                                style={{ marginTop: "4px" }}
                                onClick={addDept}
                            >
                                + Add Department
                            </button>
                        </Panel>

                        {/* ─── SUMMARY PREVIEW ─── */}
                        {filledDepts.length > 0 && form.groupName.trim() && (
                            <Panel title="Preview">
                                <div className="sr-preview">
                                    <div className="sr-preview-group">
                                        <span className="sr-preview-label">Group</span>
                                        <span className="sr-preview-name">{form.groupName}</span>
                                    </div>
                                    <div className="sr-preview-depts">
                                        {filledDepts.map((d, i) => (
                                            <div className="sr-preview-dept" key={d.id}>
                                                <span className="sr-preview-dept-num">{String(i + 1).padStart(2, "0")}</span>
                                                <span className="sr-preview-dept-name">{d.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Panel>
                        )}
                    </div>
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

:root {
  --sr-ink:         #0D1B2A;
  --sr-ink-soft:    #2C4A3E;
  --sr-muted:       #5E7A6E;
  --sr-paper:       #FFFFFF;
  --sr-paper-alt:   #F0F4F2;
  --sr-line:        #C8D8D1;
  --sr-line-strong: #9DBCB0;
  --sr-amber:       #1B5E44;
  --sr-amber-deep:  #0F3D2B;
  --sr-amber-soft:  #D4EDE5;
  --sr-sidebar-accent: #1B8C60;
  --sr-danger:      #B02020;
  --sr-danger-soft: #FAE8E8;
  --sr-success:     #1B5E44;
  --sr-success-soft:#D4EDE5;
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

/* TOP BAR */
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
  width: 1px;
  height: 28px;
  background: rgba(255,255,255,0.1);
}
.sr-topbar-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: #E8F4EF;
  letter-spacing: 0.05em;
  display: block;
}
.sr-topbar-sub {
  font-size: 10px;
  color: #4A6B84;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: block;
}
.sr-topbar-actions { display: flex; gap: 10px; align-items: center; }
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
}
.sr-btn-back-inline:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

/* SECTION STRIP */
.sr-section-strip {
  display: flex;
  align-items: center;
  padding: 0 32px;
  overflow-x: auto;
  scrollbar-width: none;
}
.sr-section-strip::-webkit-scrollbar { display: none; }
.sr-section-strip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  color: #4A6B84;
  font-size: 12px;
  white-space: nowrap;
}
.sr-section-strip-item--active { color: #E8F4EF; }
.sr-section-strip-item--filled { color: #A8D5C4; }
.sr-section-strip-num {
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-family: var(--font-mono); flex-shrink: 0;
}
.sr-section-strip-item--active .sr-section-strip-num { background: #1B8C60; color: #fff; }
.sr-section-strip-num--filled { background: #1B8C60; color: #fff; font-size: 10px; }
.sr-section-strip-label { font-weight: 500; }
.sr-section-strip-divider { width: 20px; height: 1px; background: rgba(255,255,255,0.1); }
.sr-section-strip-note {
  margin-left: auto;
  font-size: 10px; color: #4A6B84; font-style: italic;
  padding: 11px 0; white-space: nowrap;
}
.sr-section-strip-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px;
  background: #1B8C60; color: #fff;
  border-radius: 999px;
  font-family: var(--font-mono); font-size: 9px; font-weight: 700;
  padding: 0 4px; margin-left: 2px;
}

/* MAIN */
.sr-main { flex: 1; min-width: 0; padding: 28px 40px 80px; }
.sr-section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 2px solid var(--sr-line);
}
.sr-section-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: 32px; margin: 0; letter-spacing: 0.01em;
}
.sr-section-sub {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--sr-amber); letter-spacing: 0.1em; margin: 2px 0 0;
}
.sr-content { display: flex; flex-direction: column; gap: 22px; }
.sr-stack { display: flex; flex-direction: column; gap: 18px; }

/* PLATE */
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
.sr-plate-note { font-size: 12px; color: #6A8FA8; font-style: italic; margin-left: auto; }

/* PANEL */
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
  display: flex; align-items: center; justify-content: space-between;
}
.sr-panel-body { display: flex; flex-direction: column; gap: 16px; }
.sr-help { font-size: 12px; color: var(--sr-muted); font-style: italic; margin: 0; }

/* FIELDS */
.sr-field { display: flex; flex-direction: column; gap: 6px; }
.sr-label {
  font-size: 11.5px; font-weight: 600; color: var(--sr-ink-soft);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.sr-req { color: var(--sr-danger); margin-left: 3px; }
.sr-hint { font-size: 11px; color: var(--sr-muted); font-style: italic; }

.sr-input {
  font-family: var(--font-body); font-size: 13.5px; color: var(--sr-ink);
  background: var(--sr-paper-alt);
  border: 1.5px solid var(--sr-line-strong);
  border-radius: 5px; padding: 8px 10px; outline: none; width: 100%;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sr-input:focus {
  border-color: var(--sr-amber);
  box-shadow: 0 0 0 3px rgba(27,94,68,0.15);
  background: #fff;
}
.sr-input--err { border-color: var(--sr-danger); background: var(--sr-danger-soft); }

.sr-error-text {
  color: var(--sr-danger); font-size: 11px; font-weight: 600;
  margin-top: 3px; line-height: 1.4;
}

/* BANNERS */
.sr-banner {
  background: var(--sr-danger-soft); border: 1px solid var(--sr-danger);
  color: #7A1F1F; font-size: 13px; font-weight: 600;
  padding: 10px 14px; border-radius: 6px;
}
.sr-banner--success {
  background: var(--sr-success-soft); border-color: var(--sr-success);
  color: var(--sr-amber-deep);
}

/* NOTICE */
.sr-notice {
  background: var(--sr-amber-soft);
  border: 1px solid var(--sr-amber);
  color: var(--sr-amber-deep);
  font-size: 12px; padding: 10px 14px; border-radius: 6px; line-height: 1.5;
}

/* PARTICIPANT / DEPT CARDS */
.sr-action-list { display: flex; flex-direction: column; gap: 14px; }
.sr-action-card {
  background: var(--sr-paper);
  border: 1px solid var(--sr-line);
  border-left: 4px solid var(--sr-amber);
  border-radius: 8px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 12px;
}
.sr-action-head { display: flex; align-items: center; justify-content: space-between; }
.sr-action-num {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--sr-amber); letter-spacing: 0.08em;
}
.sr-action-remove {
  background: none; border: 1px solid var(--sr-danger);
  color: var(--sr-danger); font-size: 11px; padding: 3px 10px;
  border-radius: 4px; cursor: pointer;
}
.sr-action-remove:disabled { opacity: 0.35; cursor: not-allowed; }

/* PREVIEW */
.sr-preview { display: flex; flex-direction: column; gap: 14px; }
.sr-preview-group { display: flex; align-items: baseline; gap: 12px; }
.sr-preview-label {
  font-family: var(--font-mono); font-size: 10px;
  color: var(--sr-sidebar-accent); letter-spacing: 0.08em;
  text-transform: uppercase; flex-shrink: 0;
}
.sr-preview-name {
  font-family: var(--font-display); font-size: 20px; font-weight: 700;
  color: var(--sr-ink); letter-spacing: 0.01em;
}
.sr-preview-depts { display: flex; flex-direction: column; gap: 6px; }
.sr-preview-dept {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 12px;
  background: var(--sr-paper-alt);
  border: 1px solid var(--sr-line);
  border-radius: 5px;
}
.sr-preview-dept-num {
  font-family: var(--font-mono); font-size: 10px;
  color: var(--sr-muted); flex-shrink: 0;
}
.sr-preview-dept-name { font-size: 13.5px; color: var(--sr-ink-soft); font-weight: 500; }

/* BUTTONS */
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

/* RESPONSIVE */
@media (max-width: 768px) {
  .sr-topbar-brand { padding: 10px 16px; }
  .sr-section-strip { padding: 0 16px; }
  .sr-section-strip-note { display: none; }
  .sr-main { padding: 20px 16px 60px; }
}
`;