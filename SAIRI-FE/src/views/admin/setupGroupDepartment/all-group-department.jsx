import React, { useState, useEffect } from "react";
import axios from "axios";
import config from "config"; // adjust path as needed
import LoadingSpinner from "components/LoadingComponent";
import { useNotification } from "components/Safetynotification";
import SafetyAlertModal from "components/alertModal";

export default function AllGroupDepartment() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const notify = useNotification();

    // expand/edit state
    const [expandedId, setExpandedId] = useState(null);
    const [editGroupName, setEditGroupName] = useState("");
    const [editDepartments, setEditDepartments] = useState([]);
    const [newDeptInput, setNewDeptInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [rowError, setRowError] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    // ── NEW: add-row state ──────────────────────────────────────────────
    const [isAdding, setIsAdding] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDepts, setNewGroupDepts] = useState([]);
    const [newGroupDeptInput, setNewGroupDeptInput] = useState("");
    const [creating, setCreating] = useState(false);
    const [addRowError, setAddRowError] = useState(null);

    // ── NEW: search + pagination state ────────────────────────────────
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    const fetchGroups = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${config.baseApi}/setup/all`);
            if (res.data.message === "success") {
                setGroups(res.data.data);
            } else {
                setError(res.data.details || "Failed to load groups.");
            }
        } catch (err) {
            console.error("Fetch groups error:", err);
            setError(err.response?.data?.details || "Something went wrong while loading groups.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    // ── NEW: reset to page 1 whenever the search term changes ──────────
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (loading) return <LoadingSpinner label="Fetching data" />;

    // ── NEW: filter groups by group name OR any department name ────────
    const filteredGroups = groups.filter((g) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        const groupMatch = g.group?.toLowerCase().includes(term);
        const deptMatch = g.departments.some((d) =>
            d.department?.toLowerCase().includes(term)
        );
        return groupMatch || deptMatch;
    });

    // ── NEW: pagination math ────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const paginatedGroups = filteredGroups.slice(pageStart, pageStart + PAGE_SIZE);

    const goToPage = (page) => {
        const clamped = Math.min(Math.max(1, page), totalPages);
        setCurrentPage(clamped);
        setExpandedId(null);
    };

    const toggleRow = (g) => {
        setIsAdding(false); // close add row if an existing row is opened
        if (expandedId === g.gd_id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(g.gd_id);
        setEditGroupName(g.group);
        setEditDepartments(g.departments.map((d) => d.department));
        setNewDeptInput("");
        setRowError(null);
    };

    const addDeptChip = () => {
        const val = newDeptInput.trim();
        if (!val) return;
        if (editDepartments.some((d) => d.toLowerCase() === val.toLowerCase())) {
            setNewDeptInput("");
            return;
        }
        setEditDepartments((prev) => [...prev, val]);
        setNewDeptInput("");
    };

    const handleDeptKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addDeptChip();
        }
    };

    const removeDeptChip = (dept) => {
        setEditDepartments((prev) => prev.filter((d) => d !== dept));
    };

    const handleSave = async (gd_id) => {
        setLoading(true)
        if (!editGroupName.trim()) {
            setRowError("Group name is required.");
            return;
        }
        if (editDepartments.length === 0) {
            setRowError("At least one department is required.");
            return;
        }
        setSaving(true);
        setRowError(null);
        try {
            const res = await axios.put(`${config.baseApi}/setup/update/${gd_id}`, {
                groupName: editGroupName.trim(),
                departments: editDepartments,
                updated_by: config.currentUser || null,
            });
            if (res.data.message === "success") {
                setExpandedId(null);

                setTimeout(() => {
                    setLoading(false)
                    notify.success('Update Successfully', 'You have successfully update the group department!')
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }, 2000);

            } else {
                setRowError(res.data.details || "Failed to save changes.");
            }
        } catch (err) {
            console.error("Update group/department error:", err);
            setRowError(err.response?.data?.details || "Something went wrong while saving.");
        } finally {

            setSaving(false);
        }
    };



    // called by the Delete button — just opens the modal
    const askDeleteGroup = (gd_id) => {
        setPendingDeleteId(gd_id);
    };

    // called by the modal's onConfirm — does the actual work
    const confirmDeleteGroup = async () => {
        const gd_id = pendingDeleteId;
        setPendingDeleteId(null);
        if (!gd_id) return;

        setDeleting(true);
        setRowError(null);
        setLoading(true);
        try {
            const res = await axios.delete(`${config.baseApi}/setup/delete/${gd_id}`);
            if (res.data.message === "success") {
                setExpandedId(null);
                setTimeout(() => {
                    setLoading(false);
                    notify.success('Removed Successfully', 'You have successfully removed the group department!');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }, 2000);
            } else {
                setRowError(res.data.details || "Failed to delete group.");
                setLoading(false);
            }
        } catch (err) {
            console.error("Delete group/department error:", err);
            setRowError(err.response?.data?.details || "Something went wrong while deleting.");
            setLoading(false);
        } finally {
            setDeleting(false);
        }
    };

    // ── NEW: add-row handlers ───────────────────────────────────────────
    const openAddRow = () => {
        setExpandedId(null); // close any open edit row
        setIsAdding(true);
        setNewGroupName("");
        setNewGroupDepts([]);
        setNewGroupDeptInput("");
        setAddRowError(null);
    };

    const closeAddRow = () => {
        setIsAdding(false);
        setAddRowError(null);
    };

    const addNewGroupDeptChip = () => {
        const val = newGroupDeptInput.trim();
        if (!val) return;
        if (newGroupDepts.some((d) => d.toLowerCase() === val.toLowerCase())) {
            setNewGroupDeptInput("");
            return;
        }
        setNewGroupDepts((prev) => [...prev, val]);
        setNewGroupDeptInput("");
    };

    const handleNewGroupDeptKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addNewGroupDeptChip();
        }
    };

    const removeNewGroupDeptChip = (dept) => {
        setNewGroupDepts((prev) => prev.filter((d) => d !== dept));
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            setAddRowError("Group name is required.");
            return;
        }
        if (newGroupDepts.length === 0) {
            setAddRowError("At least one department is required.");
            return;
        }
        setCreating(true);
        setAddRowError(null);
        setLoading(true)
        try {
            const res = await axios.post(`${config.baseApi}/setup/add`, {
                groupName: newGroupName.trim(),
                departments: newGroupDepts,
                created_by: config.currentUser || null,
            });
            if (res.data.message === "success") {
                setIsAdding(false);
                setTimeout(() => {
                    setLoading(false)
                    notify.success('Added Successfully', 'You have successfully added the group department!')
                    setTimeout(() => {
                        window.location.reload()
                    }, 2000);
                }, 2000);
            } else {
                setAddRowError(res.data.details || "Failed to create group.");
            }
        } catch (err) {
            console.error("Create group/department error:", err);
            setAddRowError(err.response?.data?.details || "Something went wrong while creating.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="sr-shell">
            <style>{STYLE_SHEET}</style>

            <div className="sr-topbar-outer">
                <div className="sr-topbar-brand">
                    <div className="sr-topbar-brand-left">
                        <button className="sr-btn-back-inline" onClick={() => window.history.back()}>
                            ← Back
                        </button>
                        <div className="sr-topbar-divider" />
                        <div>
                            <span className="sr-topbar-title">SETUP</span>
                            <span className="sr-topbar-sub">All Groups &amp; Departments</span>
                        </div>
                    </div>
                    <div className="sr-topbar-actions">
                        <button className="sr-btn sr-btn--ghost" onClick={fetchGroups}>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <main className="sr-main">
                <div className="sr-section-header">
                    <div>
                        <h1 className="sr-section-title">Groups &amp; Departments</h1>
                        <p className="sr-section-sub">SETUP GROUP AND DEPARTMENTS  — OVERVIEW</p>
                    </div>
                    {/* ── NEW: Add Group button aligned with header ── */}
                    <button
                        type="button"
                        className="sr-btn sr-btn--primary"
                        onClick={isAdding ? closeAddRow : openAddRow}
                    >
                        {isAdding ? "Cancel" : "+ Add Group"}
                    </button>
                </div>

                <div className="sr-content">
                    <div className="gd-search-toolbar">
                        <div className={`gd-search-bar${searchTerm ? " gd-search-bar--active" : ""}`}>
                            <span className="gd-search-icon-badge">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
                                    <path d="M21 21L16.5 16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                className="gd-search-input"
                                placeholder="Search by group or department…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <span className="gd-search-count">
                                    {filteredGroups.length} {filteredGroups.length === 1 ? "match" : "matches"}
                                </span>
                            )}
                            {searchTerm && (
                                <button
                                    type="button"
                                    className="gd-search-clear"
                                    onClick={() => setSearchTerm("")}
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                    {loading && <div className="sr-notice">Loading groups…</div>}


                    {!loading && error && <div className="sr-banner">{error}</div>}

                    {!loading && !error && groups.length === 0 && !isAdding && (
                        <div className="sr-notice">No groups have been created yet.</div>
                    )}

                    {!loading && !error && (groups.length > 0 || isAdding) && (
                        <div className="gd-table-wrap">



                            {filteredGroups.length === 0 && !isAdding ? (
                                <div className="gd-empty-state">
                                    No groups or departments match “{searchTerm}”.
                                </div>
                            ) : (
                                <>
                                    <table className="gd-table">
                                        <thead>
                                            <tr >
                                                <th style={{ width: "22%" }}>Group</th>
                                                <th>Departments</th>
                                                <th style={{ width: "10%" }}>Created By</th>
                                                <th style={{ width: "10%" }}>Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* ── NEW: Add row ── */}
                                            {isAdding && (
                                                <tr className="gd-edit-row">
                                                    <td colSpan={4}>
                                                        <div className="gd-editor gd-editor--new">
                                                            <div className="gd-editor-field">
                                                                <label className="gd-editor-label">Group name</label>
                                                                <input
                                                                    className="gd-editor-input"
                                                                    type="text"
                                                                    value={newGroupName}
                                                                    onChange={(e) => setNewGroupName(e.target.value)}
                                                                    placeholder="Enter group name"
                                                                    autoFocus
                                                                />
                                                            </div>

                                                            <div className="gd-editor-field">
                                                                <label className="gd-editor-label">Departments</label>
                                                                <div className="gd-editor-chip-list">
                                                                    {newGroupDepts.map((d) => (
                                                                        <span className="gd-chip gd-chip--removable" key={d}>
                                                                            {d}
                                                                            <button
                                                                                type="button"
                                                                                className="gd-chip-remove"
                                                                                onClick={() => removeNewGroupDeptChip(d)}
                                                                                aria-label={`Remove ${d}`}
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                    {newGroupDepts.length === 0 && (
                                                                        <span className="gd-empty">
                                                                            — no departments, add one below —
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="gd-editor-add-row">
                                                                    <input
                                                                        className="gd-editor-input"
                                                                        type="text"
                                                                        value={newGroupDeptInput}
                                                                        onChange={(e) => setNewGroupDeptInput(e.target.value)}
                                                                        onKeyDown={handleNewGroupDeptKeyDown}
                                                                        placeholder="Type a department and press Enter"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="sr-btn sr-btn--ghost"
                                                                        onClick={addNewGroupDeptChip}
                                                                    >
                                                                        Add
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {addRowError && <div className="sr-banner">{addRowError}</div>}

                                                            <div className="gd-editor-actions">
                                                                <span />
                                                                <div className="gd-editor-actions-right">
                                                                    <button
                                                                        type="button"
                                                                        className="sr-btn sr-btn--ghost"
                                                                        onClick={closeAddRow}
                                                                        disabled={creating}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="sr-btn sr-btn--primary"
                                                                        onClick={handleCreateGroup}
                                                                        disabled={creating}
                                                                    >
                                                                        {creating ? "Creating…" : "Create Group"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}

                                            {paginatedGroups.map((g) => {
                                                const isOpen = expandedId === g.gd_id;
                                                return (
                                                    <React.Fragment key={g.gd_id}>
                                                        <tr
                                                            className={`gd-row-clickable${isOpen ? " gd-row-active" : ""}`}
                                                            onClick={() => toggleRow(g)}
                                                        >
                                                            <td>
                                                                <div className="gd-group-name-cell">
                                                                    <span className={`gd-caret${isOpen ? " gd-caret-open" : ""}`}>
                                                                        ▸
                                                                    </span>
                                                                    <span className="gd-group-name">{g.group}</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {g.departments.length === 0 ? (
                                                                    <span className="gd-empty">— no departments —</span>
                                                                ) : (
                                                                    <div className="gd-chip-list">
                                                                        {g.departments.map((d) => (
                                                                            <span className="gd-chip" key={d.id}>
                                                                                {d.department}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <span className="gd-date">{g.created_by ? g.created_by : "—"}</span>
                                                            </td>
                                                            <td>
                                                                <span className="gd-date">
                                                                    {g.created_at ? new Date(g.created_at).toLocaleDateString() : "—"}
                                                                </span>
                                                            </td>
                                                        </tr>

                                                        {isOpen && (
                                                            <tr className="gd-edit-row">
                                                                <td colSpan={4}>
                                                                    <div className="gd-editor" onClick={(e) => e.stopPropagation()}>
                                                                        <div className="gd-editor-field">
                                                                            <label className="gd-editor-label">Group name</label>
                                                                            <input
                                                                                className="gd-editor-input"
                                                                                type="text"
                                                                                value={editGroupName}
                                                                                onChange={(e) => setEditGroupName(e.target.value)}
                                                                                placeholder="Group name"
                                                                            />
                                                                        </div>

                                                                        <div className="gd-editor-field">
                                                                            <label className="gd-editor-label">Departments</label>
                                                                            <div className="gd-editor-chip-list">
                                                                                {editDepartments.map((d) => (
                                                                                    <span className="gd-chip gd-chip--removable" key={d}>
                                                                                        {d}
                                                                                        <button
                                                                                            type="button"
                                                                                            className="gd-chip-remove"
                                                                                            onClick={() => removeDeptChip(d)}
                                                                                            aria-label={`Remove ${d}`}
                                                                                        >
                                                                                            ×
                                                                                        </button>
                                                                                    </span>
                                                                                ))}
                                                                                {editDepartments.length === 0 && (
                                                                                    <span className="gd-empty">
                                                                                        — no departments, add one below —
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="gd-editor-add-row">
                                                                                <input
                                                                                    className="gd-editor-input"
                                                                                    type="text"
                                                                                    value={newDeptInput}
                                                                                    onChange={(e) => setNewDeptInput(e.target.value)}
                                                                                    onKeyDown={handleDeptKeyDown}
                                                                                    placeholder="Type a department and press Enter"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    className="sr-btn sr-btn--ghost"
                                                                                    onClick={addDeptChip}
                                                                                >
                                                                                    Add
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {rowError && <div className="sr-banner">{rowError}</div>}

                                                                        <div className="gd-editor-actions">
                                                                            <button
                                                                                type="button"
                                                                                className="sr-btn sr-btn--danger"
                                                                                onClick={() => askDeleteGroup(g.gd_id)}
                                                                                disabled={deleting || saving}
                                                                            >
                                                                                {deleting ? "Deleting…" : "Delete Group"}
                                                                            </button>
                                                                            <div className="gd-editor-actions-right">
                                                                                <button
                                                                                    type="button"
                                                                                    className="sr-btn sr-btn--ghost"
                                                                                    onClick={() => setExpandedId(null)}
                                                                                    disabled={deleting || saving}
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className="sr-btn sr-btn--primary"
                                                                                    onClick={() => handleSave(g.gd_id)}
                                                                                    disabled={deleting || saving}
                                                                                >
                                                                                    {saving ? "Saving…" : "Save Changes"}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* ── NEW: pagination controls ── */}
                                    {filteredGroups.length > 0 && (
                                        <div className="gd-pagination">
                                            <span className="gd-pagination-info">
                                                Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredGroups.length)} of {filteredGroups.length}
                                            </span>
                                            <div className="gd-pagination-controls">
                                                <button
                                                    type="button"
                                                    className="sr-btn sr-btn--ghost"
                                                    onClick={() => goToPage(safePage - 1)}
                                                    disabled={safePage <= 1}
                                                >
                                                    ‹ Prev
                                                </button>
                                                <span className="gd-pagination-page">
                                                    Page {safePage} of {totalPages}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="sr-btn sr-btn--ghost"
                                                    onClick={() => goToPage(safePage + 1)}
                                                    disabled={safePage >= totalPages}
                                                >
                                                    Next ›
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>
            {pendingDeleteId && (
                <SafetyAlertModal
                    open={true}
                    variant="danger"
                    title="Delete this group?"
                    message="This will permanently remove the group and all its departments. This can't be undone."
                    confirmLabel="Yes, delete"
                    cancelLabel="Cancel"
                    onConfirm={confirmDeleteGroup}
                    onCancel={() => setPendingDeleteId(null)}
                />
            )}
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
  flex-wrap: wrap;
  gap: 12px;
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
.sr-topbar-actions { display: flex; gap: 10px; align-items: center; }
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
  margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid var(--sr-line);
  gap: 16px;
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
.sr-btn--primary {
  background: var(--sr-amber); color: #fff; border-color: var(--sr-amber);
}
.sr-btn--primary:hover { background: var(--sr-amber-deep); border-color: var(--sr-amber-deep); }
.sr-btn--danger {
  background: #fff; color: var(--sr-danger); border-color: var(--sr-danger);
}
.sr-btn--danger:hover { background: var(--sr-danger-soft); }
.sr-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── SEARCH BAR ── */
.gd-search-toolbar {
  padding: 1px 10px;
  display: flex;
  justify-content: flex-end;
}
.gd-search-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--sr-paper);
  border: 1.5px solid var(--sr-line-strong);
  border-radius: 999px;
  padding: 4px 6px 4px 4px;
  width: 100%;
  max-width: 720px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: background 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.gd-search-bar:hover {
  border-color: var(--sr-amber);
}
.gd-search-bar:focus-within {
  background: var(--sr-paper);
  border-color: var(--sr-sidebar-accent);
  box-shadow: 0 0 0 3px rgba(27, 140, 96, 0.14), 0 1px 3px rgba(0,0,0,0.06);
}
.gd-search-bar--active {
  border-color: var(--sr-sidebar-accent);
}
.gd-search-icon-badge {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--sr-amber-soft);
  color: var(--sr-amber);
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}
.gd-search-bar:focus-within .gd-search-icon-badge {
  background: var(--sr-sidebar-accent);
  color: #fff;
  transform: scale(1.06);
}
.gd-search-input {
  flex: 1;
  min-width: 0;
  max-width: 560px;
  border: none;
  outline: none;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  color: var(--sr-ink);
  background: transparent;
  padding: 6px 2px;
}
.gd-search-input::placeholder { color: var(--sr-muted); font-weight: 400; }
.gd-search-count {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--sr-amber-deep);
  background: var(--sr-amber-soft);
  border: 1px solid var(--sr-amber);
  border-radius: 999px;
  padding: 4px 11px;
  white-space: nowrap;
}
.gd-search-clear {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 2px;
  background: var(--sr-paper-alt);
  border: 1px solid var(--sr-line);
  border-radius: 50%;
  color: var(--sr-muted);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease, transform 0.1s ease;
}
.gd-search-clear:hover { background: var(--sr-danger); border-color: var(--sr-danger); color: #fff; transform: scale(1.08) rotate(90deg); }
/* TABLE */
.gd-table-wrap {
  background: var(--sr-paper);
  border: 1px solid var(--sr-line);
  border-radius: 8px;
  overflow: hidden;
}
.gd-table {
  width: 100%;
  border-collapse: collapse;
}
.gd-table thead th {
  text-align: left;
  font-family: var(--font-mono);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sr-sidebar-accent);
  background: var(--sr-ink);
  padding: 12px 16px;
  border-bottom: 1px solid var(--sr-line);
}
.gd-table tbody tr:not(.gd-edit-row) {
  border-bottom: 1px solid var(--sr-line);
}
.gd-table tbody tr:last-child { border-bottom: none; }
.gd-row-clickable { cursor: pointer; transition: background 0.12s ease; }
.gd-row-clickable:hover { background: var(--sr-paper-alt); }
.gd-row-active { background: var(--sr-amber-soft); }
.gd-table td {
  padding: 14px 16px;
  vertical-align: top;
}

.gd-group-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gd-caret {
  display: inline-block;
  font-size: 11px;
  color: var(--sr-muted);
  transition: transform 0.15s ease;
}
.gd-caret-open { transform: rotate(90deg); color: var(--sr-amber); }

.gd-group-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--sr-ink);
}

.gd-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.gd-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--sr-amber-soft);
  color: var(--sr-amber-deep);
  border: 1px solid var(--sr-amber);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
}
.gd-chip--removable { padding-right: 8px; }
.gd-chip-remove {
  background: transparent;
  border: none;
  color: var(--sr-amber-deep);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  font-weight: 700;
}
.gd-chip-remove:hover { color: var(--sr-danger); }

.gd-empty {
  font-size: 12px;
  color: var(--sr-muted);
  font-style: italic;
}

.gd-date {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--sr-muted);
}

/* EXPANDED EDITOR ROW */
.gd-edit-row td {
  padding: 0;
  background: #FBFDFC;
  border-bottom: 1px solid var(--sr-line);
}
.gd-editor {
  padding: 20px 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-left: 3px solid var(--sr-amber);
}
.gd-editor--new {
  border-left-color: var(--sr-sidebar-accent);
  background: var(--sr-amber-soft);
}
.gd-editor-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gd-editor-label {
  font-family: var(--font-mono);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sr-muted);
}
.gd-editor-input {
  font-family: var(--font-body);
  font-size: 13.5px;
  padding: 9px 12px;
  border: 1.5px solid var(--sr-line-strong);
  border-radius: 6px;
  background: #fff;
  color: var(--sr-ink);
  outline: none;
}
.gd-editor-input:focus { border-color: var(--sr-amber); }
.gd-editor-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 30px;
}
.gd-editor-add-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.gd-editor-add-row .gd-editor-input { flex: 1; }

.gd-editor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px solid var(--sr-line);
}
.gd-editor-actions-right {
  display: flex;
  gap: 10px;
}

/* ── NEW: PAGINATION ── */
.gd-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--sr-line);
  background: var(--sr-paper-alt);
  flex-wrap: wrap;
}
.gd-pagination-info {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--sr-muted);
  letter-spacing: 0.02em;
}
.gd-pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
.gd-pagination-page {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--sr-ink-soft);
  min-width: 90px;
  text-align: center;
}

@media (max-width: 768px) {
  .sr-topbar-brand { padding: 10px 16px; }
  .sr-main { padding: 20px 16px 60px; }
  .gd-table { font-size: 12px; }
  .sr-section-header { flex-direction: column; align-items: flex-start; }
  .gd-editor-actions { flex-direction: column; align-items: stretch; }
  .gd-editor-actions-right { justify-content: flex-end; }
  .gd-search-bar { max-width: 100%; }
  .gd-pagination { flex-direction: column; align-items: stretch; text-align: center; }
  .gd-pagination-controls { justify-content: center; }
}
`;