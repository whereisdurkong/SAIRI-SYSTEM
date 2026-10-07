import React from "react";

export default function Profile() {
    const empInfo = JSON.parse(localStorage.getItem("user")) || {};
    console.log(empInfo);

    const fullName = `${empInfo.emp_firstname || ""} ${empInfo.emp_lastname || ""}`.trim();

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Helper to get location label
    const getLocationLabel = (value) => {
        if (!value) return "—";
        const map = {
            surface: "Surface",
            underground: "Underground",
        };
        return map[value] || value;
    };

    // Helper to get position label
    const getPositionLabel = (value) => {
        const positions = {
            "group-reviewer": "Group Head/Reviewer",
            "department-reviewer": "Department Head/Reviewer",
            "safety-head": "Safety Head",
            "safety-reviewer": "Safety Reviewer",
        };
        return positions[value] || value || "—";
    };

    return (
        <div className="profile-shell">
            <style>{STYLE_SHEET}</style>

            <div className="au-topbar-outer">
                <div className="au-topbar-brand">
                    <div className="au-topbar-brand-left">
                        <button className="au-btn-back-inline" onClick={() => window.history.back()}>
                            ← Back
                        </button>
                        <div className="au-topbar-divider" />
                        <div>
                            <span className="au-topbar-title">ADMIN SETUP</span>
                            <span className="au-topbar-sub">My Profile</span>
                        </div>
                    </div>
                    <div className="au-topbar-actions">
                        <button className="au-btn au-btn--ghost" onClick={() => window.location.reload()}>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <main className="au-main">
                <div className="au-section-header">
                    <div>
                        <h1 className="au-section-title">Employee Profile</h1>
                        <p className="au-section-sub">SETUP.05 — PROFILE DETAILS</p>
                    </div>
                    <span className={`au-status-badge ${empInfo.is_active ? "au-status-badge--active" : "au-status-badge--inactive"}`}>
                        {empInfo.is_active ? "● Active" : "● Inactive"}
                    </span>
                </div>

                <div className="au-content">
                    {Object.keys(empInfo).length === 0 ? (
                        <div className="au-notice">No profile data found. Please log in again.</div>
                    ) : (
                        <div className="profile-card">
                            {/* Avatar / Header Section */}
                            <div className="profile-header">
                                <div className="profile-avatar">
                                    <span className="profile-avatar-initials">
                                        {fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                                    </span>
                                </div>
                                <div className="profile-header-info">
                                    <h2 className="profile-full-name">{fullName}</h2>
                                    <p className="profile-username">@{empInfo.user_name}</p>
                                    <div className="profile-header-tags">
                                        <span className="au-role-badge au-role-badge--admin">{empInfo.emp_role || "—"}</span>
                                        <span className="au-chip">{empInfo.emp_group || "—"}</span>
                                        <span className="au-chip">{getPositionLabel(empInfo.emp_position)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="profile-details-grid">
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Employee ID</span>
                                    <span className="profile-detail-value">{empInfo.user_id || "—"}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">First Name</span>
                                    <span className="profile-detail-value">{empInfo.emp_firstname || "—"}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Last Name</span>
                                    <span className="profile-detail-value">{empInfo.emp_lastname || "—"}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Username</span>
                                    <span className="profile-detail-value">{empInfo.user_name || "—"}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Email</span>
                                    <span className="profile-detail-value">{empInfo.emp_email || "—"}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Group</span>
                                    <span className="profile-detail-value">{empInfo.emp_group || "—"}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Department</span>
                                    <span className="profile-detail-value">{empInfo.emp_department || "—"}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Position</span>
                                    <span className="profile-detail-value">{getPositionLabel(empInfo.emp_position)}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Role</span>
                                    <span className="profile-detail-value">{empInfo.emp_role || "—"}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Location</span>
                                    <span className="profile-detail-value">{getLocationLabel(empInfo.emp_location)}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">Status</span>
                                    <span className="profile-detail-value">
                                        <span className={`au-status-dot ${empInfo.is_active ? "au-status-dot--active" : ""}`} />
                                        {empInfo.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="profile-detail-label">ID Master</span>
                                    <span className="profile-detail-value">{empInfo.id_master || "—"}</span>
                                </div>
                            </div>

                            {/* Timestamp Section */}
                            <div className="profile-timestamps">
                                <div className="profile-timestamp-item">
                                    <span className="profile-detail-label">Created At</span>
                                    <span className="profile-detail-value">{formatDate(empInfo.created_at)}</span>
                                </div>
                                <div className="profile-timestamp-item">
                                    <span className="profile-detail-label">Last Updated</span>
                                    <span className="profile-detail-value">{formatDate(empInfo.updated_at)}</span>
                                </div>
                                <div className="profile-timestamp-item">
                                    <span className="profile-detail-label">Created By</span>
                                    <span className="profile-detail-value">{empInfo.created_by || "System"}</span>
                                </div>
                                <div className="profile-timestamp-item">
                                    <span className="profile-detail-label">Updated By</span>
                                    <span className="profile-detail-value">{empInfo.updated_by || "System"}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET — matches the AllGroupDepartment (SETUP) design system
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
  --sr-slate:       #46607A;
  --sr-slate-soft:  #E7EEF4;
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body:    'Inter', sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;
}

.profile-shell * { box-sizing: border-box; }
.profile-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--sr-paper-alt);
  font-family: var(--font-body);
  color: var(--sr-ink);
}

.au-topbar-outer {
  background: #0D1B2A;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.au-topbar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  flex-wrap: wrap;
  gap: 12px;
}
.au-topbar-brand-left { display: flex; align-items: center; gap: 16px; }
.au-topbar-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.1); }
.au-topbar-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: 18px; color: #E8F4EF; letter-spacing: 0.05em; display: block;
}
.au-topbar-sub {
  font-size: 10px; color: #4A6B84; text-transform: uppercase;
  letter-spacing: 0.08em; display: block;
}
.au-topbar-actions { display: flex; gap: 10px; align-items: center; }
.au-btn-back-inline {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: #8AA4B8; padding: 6px 14px; border-radius: 6px;
  font-size: 12px; font-family: var(--font-body); cursor: pointer;
}
.au-btn-back-inline:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

.au-main { flex: 1; min-width: 0; padding: 28px 40px 80px; }
.au-section-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid var(--sr-line);
  gap: 16px;
}
.au-section-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: 32px; margin: 0; letter-spacing: 0.01em;
}
.au-section-sub {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--sr-amber); letter-spacing: 0.1em; margin: 2px 0 0;
}
.au-content { display: flex; flex-direction: column; gap: 22px; }

.au-notice {
  background: var(--sr-amber-soft); border: 1px solid var(--sr-amber);
  color: var(--sr-amber-deep); font-size: 12px;
  padding: 10px 14px; border-radius: 6px; line-height: 1.5;
}

.au-btn {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
  padding: 9px 18px; border-radius: 6px; cursor: pointer; border: 1.5px solid transparent;
  white-space: nowrap;
}
.au-btn--ghost {
  background: #fff; color: var(--sr-ink-soft); border-color: var(--sr-line-strong);
}
.au-btn--ghost:hover { border-color: var(--sr-ink-soft); background: var(--sr-paper-alt); }
.au-btn--primary {
  background: var(--sr-amber); color: #fff; border-color: var(--sr-amber);
}
.au-btn--primary:hover { background: var(--sr-amber-deep); border-color: var(--sr-amber-deep); }

.au-chip {
  display: inline-flex; align-items: center; background: var(--sr-amber-soft);
  color: var(--sr-amber-deep); border: 1px solid var(--sr-amber); border-radius: 999px;
  padding: 4px 12px; font-size: 12px; font-weight: 500;
}

.au-role-badge {
  display: inline-flex; align-items: center; text-transform: capitalize;
  background: var(--sr-slate-soft); color: var(--sr-slate); border: 1px solid var(--sr-slate);
  border-radius: 999px; padding: 4px 12px; font-size: 11.5px; font-weight: 600;
}
.au-role-badge--admin { background: var(--sr-danger-soft); color: #7A1F1F; border-color: var(--sr-danger); }

.au-status-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  background: var(--sr-muted); margin-right: 7px;
}
.au-status-dot--active { background: var(--sr-sidebar-accent); }

.au-status-badge {
  font-family: var(--font-mono); font-size: 12px; font-weight: 600;
  padding: 6px 16px; border-radius: 999px; white-space: nowrap;
}
.au-status-badge--active {
  background: var(--sr-amber-soft); color: var(--sr-amber-deep);
  border: 1.5px solid var(--sr-amber);
}
.au-status-badge--inactive {
  background: var(--sr-danger-soft); color: #7A1F1F;
  border: 1.5px solid var(--sr-danger);
}

/* ── Profile Card ── */
.profile-card {
  background: var(--sr-paper);
  border: 1px solid var(--sr-line);
  border-radius: 8px;
  overflow: hidden;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px 32px;
  background: var(--sr-paper-alt);
  border-bottom: 1px solid var(--sr-line);
}
.profile-avatar {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--sr-amber);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--sr-amber-deep);
}
.profile-avatar-initials {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: #fff;
}
.profile-header-info {
  flex: 1;
  min-width: 0;
}
.profile-full-name {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 2px;
  color: var(--sr-ink);
}
.profile-username {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--sr-muted);
  margin: 0 0 10px;
}
.profile-header-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0;
  padding: 0;
}
.profile-detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--sr-line);
  border-right: 1px solid var(--sr-line);
}
.profile-detail-item:nth-child(even) {
  border-right: none;
}
.profile-detail-item:nth-last-child(-n+2) {
  border-bottom: none;
}
.profile-detail-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sr-muted);
}
.profile-detail-value {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  color: var(--sr-ink-soft);
  word-break: break-word;
}

.profile-timestamps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0;
  border-top: 1px solid var(--sr-line);
  background: var(--sr-paper-alt);
}
.profile-timestamp-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 24px;
  border-right: 1px solid var(--sr-line);
}
.profile-timestamp-item:last-child {
  border-right: none;
}
.profile-timestamp-item .profile-detail-label {
  color: var(--sr-muted);
}
.profile-timestamp-item .profile-detail-value {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 400;
  color: var(--sr-ink-soft);
}

@media (max-width: 768px) {
  .au-topbar-brand { padding: 10px 16px; }
  .au-main { padding: 20px 16px 60px; }
  .au-section-header { flex-direction: column; align-items: flex-start; }
  .au-section-title { font-size: 24px; }

  .profile-header {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }
  .profile-header-tags { justify-content: center; }
  .profile-full-name { font-size: 22px; }

  .profile-details-grid { grid-template-columns: 1fr; }
  .profile-detail-item { border-right: none; }
  .profile-detail-item:nth-last-child(-n+2) { border-bottom: 1px solid var(--sr-line); }
  .profile-detail-item:last-child { border-bottom: none; }

  .profile-timestamps { grid-template-columns: 1fr; }
  .profile-timestamp-item { border-right: none; border-bottom: 1px solid var(--sr-line); }
  .profile-timestamp-item:last-child { border-bottom: none; }
}

@media (max-width: 900px) and (min-width: 769px) {
  .profile-details-grid { grid-template-columns: repeat(2, 1fr); }
  .profile-detail-item:nth-child(even) { border-right: none; }
  .profile-detail-item:nth-last-child(-n+2) { border-bottom: 1px solid var(--sr-line); }
  .profile-detail-item:last-child { border-bottom: none; }
}
`;