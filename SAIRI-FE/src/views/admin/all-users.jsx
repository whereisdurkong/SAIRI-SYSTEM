import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import config from "config"; // adjust path as needed
import { useNotification } from "components/Safetynotification";
import LoadingSpinner from "components/LoadingComponent";

const VALID_ROLES = ["admin", "user"];
const VALID_POSITIONS = [
  { value: "group-reviewer", label: "Group Head/Reviewer" },
  { value: "department-reviewer", label: "Department Head/Reviewer" },
  { value: "safety-head", label: "Safety Head" },
  { value: "safety-reviewer", label: "Safety Reviewer" },
];

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [groupDepts, setGroupDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const notify = useNotification();

  const [expandedId, setExpandedId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [rowError, setRowError] = useState(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    firstName: "",
    secondName: "",
    username: "",
    email: "",
    group: "",
    department: "",
    position: "",
    role: "",
    emp_location: "",
    is_oic: 0,
    password: "",
    confirmPassword: "",
  });
  const [creating, setCreating] = useState(false);
  const [addRowError, setAddRowError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${config.baseApi}/auth/get-all-users`);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError(
        err.response?.data?.details ||
          "Something went wrong while loading users.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDepts = async () => {
    try {
      const res = await axios.get(`${config.baseApi}/setup/all`);
      if (res.data.message === "success") {
        setGroupDepts(res.data.data);
      }
    } catch (err) {
      console.error("Fetch group/department error:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGroupDepts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGroup, filterPosition, filterRole]);

  const groupNames = useMemo(
    () => groupDepts.map((g) => g.group),
    [groupDepts],
  );

  const existingPositions = useMemo(() => {
    const set = new Set(users.map((u) => u.emp_position).filter(Boolean));
    const ordered = VALID_POSITIONS.map((p) => p.value).filter((v) =>
      set.has(v),
    );
    set.forEach((v) => {
      if (!ordered.includes(v)) ordered.push(v);
    });
    return ordered;
  }, [users]);

  const positionLabel = (value) =>
    VALID_POSITIONS.find((p) => p.value === value)?.label ?? value;

  const departmentsForGroup = (groupName) => {
    const match = groupDepts.find((g) => g.group === groupName);
    return match ? match.departments.map((d) => d.department) : [];
  };

  const fullName = (u) =>
    `${u.emp_firstname || ""} ${u.emp_lastname || ""}`.trim();

  const hasActiveFilters = filterGroup || filterPosition || filterRole;

  const clearFilters = () => {
    setFilterGroup("");
    setFilterPosition("");
    setFilterRole("");
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const matches =
        fullName(u).toLowerCase().includes(term) ||
        u.user_name?.toLowerCase().includes(term) ||
        u.emp_group?.toLowerCase().includes(term) ||
        u.emp_department?.toLowerCase().includes(term) ||
        u.emp_position?.toLowerCase().includes(term);
      if (!matches) return false;
    }
    if (filterGroup && u.emp_group !== filterGroup) return false;
    if (filterPosition && u.emp_position !== filterPosition) return false;
    if (filterRole && u.emp_role !== filterRole) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (page) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(clamped);
    setExpandedId(null);
  };

  const toggleRow = (u) => {
    setIsAdding(false);
    if (expandedId === u.id_master) {
      setExpandedId(null);
      return;
    }
    setExpandedId(u.id_master);
    setEditForm({
      firstName: u.emp_firstname || "",
      secondName: u.emp_lastname || "",
      username: u.user_name || "",
      email: u.emp_email || "",
      group: u.emp_group || "",
      department: u.emp_department || "",
      position: u.emp_position || "",
      role: u.emp_role || "",
      is_active: u.is_active ? "1" : "0",
      emp_location: u.emp_location || "",
      is_oic: u.is_oic ? "1" : "0",
    });
    setRowError(null);
  };

  const updateField = (field, value) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "group") {
        const validDepts = departmentsForGroup(value);
        if (!validDepts.includes(prev.department)) next.department = "";
      }
      if (field === "position") {
        const oicPositions = ["department-reviewer", "group-reviewer"];
        if (!oicPositions.includes(value)) next.is_oic = "0";
      }
      return next;
    });
  };

  const openAddRow = () => {
    setExpandedId(null);
    setIsAdding(true);
    setNewUserForm({
      firstName: "",
      secondName: "",
      username: "",
      email: "",
      group: "",
      department: "",
      position: "",
      role: "",
      emp_location: "",
      is_oic: 0,
      password: "",
      confirmPassword: "",
    });
    setAddRowError(null);
  };

  const closeAddRow = () => {
    setIsAdding(false);
    setAddRowError(null);
  };

  const updateNewUserField = (field, value) => {
    setNewUserForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "group") {
        const validDepts = departmentsForGroup(value);
        if (!validDepts.includes(prev.department)) next.department = "";
      }
      if (field === "position") {
        const oicPositions = ["department-reviewer", "group-reviewer"];
        if (!oicPositions.includes(value)) next.is_oic = 0;
      }
      return next;
    });
  };
  const handleCreateUser = async () => {
    const {
      firstName,
      secondName,
      username,
      email,
      group,
      department,
      position,
      role,
      emp_location,
      is_oic,
      password,
      confirmPassword,
    } = newUserForm;

    if (
      !firstName.trim() ||
      !secondName.trim() ||
      !username.trim() ||
      !email.trim() ||
      !group ||
      !department ||
      !position ||
      !role ||
      !emp_location ||
      !password ||
      !confirmPassword
    ) {
      setAddRowError("Please fill in all fields to create the account.");
      return;
    }
    if (username.trim().length < 3) {
      setAddRowError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username.trim())) {
      setAddRowError(
        "Username may only contain letters, numbers, dots, hyphens, and underscores.",
      );
      return;
    }
    if (password.length < 8) {
      setAddRowError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setAddRowError("Passwords do not match.");
      return;
    }

    setCreating(true);
    setAddRowError(null);
    try {
      const res = await axios.post(`${config.baseApi}/auth/register`, {
        firstName: firstName.trim(),
        secondName: secondName.trim(),
        username: username.trim(),
        email: email.trim(),
        group,
        department,
        position,
        role,
        emp_location,
        is_oic,
        password,
      });
      if (res.data.message === "success") {
        setIsAdding(false);
        fetchUsers();
      } else {
        setAddRowError(
          res.data.details || res.data.message || "Failed to register user.",
        );
      }
    } catch (err) {
      console.error("Create user error:", err);
      setAddRowError(
        err.response?.data?.msg ||
          err.response?.data?.message ||
          err.response?.data?.details ||
          "Something went wrong while registering.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (id_master) => {
    if (
      !editForm.firstName.trim() ||
      !editForm.secondName.trim() ||
      !editForm.username.trim() ||
      !editForm.email.trim()
    ) {
      setRowError("First name, last name, username, and email are required.");
      return;
    }
    if (!editForm.group || !editForm.position.trim() || !editForm.role) {
      setRowError("Group, position, and role are required.");
      return;
    }
    setSaving(true);
    setRowError(null);
    try {
      const res = await axios.put(
        `${config.baseApi}/auth/update/${id_master}`,
        {
          firstName: editForm.firstName.trim(),
          secondName: editForm.secondName.trim(),
          username: editForm.username.trim(),
          email: editForm.email.trim(),
          group: editForm.group,
          department: editForm.department || null,
          position: editForm.position.trim(),
          role: editForm.role,
          is_active: Number(editForm.is_active),
          emp_location: editForm.emp_location || null,
          is_oic: Number(editForm.is_oic),
          updated_by: config.currentUser || null,
        },
      );
      if (res.data.message === "success") {
        setExpandedId(null);
        fetchUsers();
      } else {
        setRowError(res.data.details || "Failed to save changes.");
      }
    } catch (err) {
      console.error("Update user error:", err);
      setRowError(
        err.response?.data?.details || "Something went wrong while saving.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id_master, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setDeleting(true);
    setRowError(null);
    try {
      const res = await axios.delete(
        `${config.baseApi}/auth/delete/${id_master}`,
      );
      if (res.data.message === "success") {
        setExpandedId(null);
        fetchUsers();
      } else {
        setRowError(res.data.details || "Failed to delete user.");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      setRowError(
        err.response?.data?.details || "Something went wrong while deleting.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async (id_master, name) => {
    if (!window.confirm(`Reset password for ${name} to the default (123456)?`))
      return;
    setResettingPassword(true);
    setRowError(null);
    try {
      const res = await axios.put(
        `${config.baseApi}/auth/update/${id_master}`,
        {
          firstName: editForm.firstName.trim(),
          secondName: editForm.secondName.trim(),
          username: editForm.username.trim(),
          email: editForm.email.trim(),
          group: editForm.group,
          department: editForm.department || null,
          position: editForm.position.trim(),
          role: editForm.role,
          is_active: Number(editForm.is_active),
          emp_location: editForm.emp_location || null,
          is_oic: Number(editForm.is_oic),
          password: "123456",
          updated_by: config.currentUser || null,
        },
      );
      if (res.data.message === "success") {
        alert(`Password for ${name} has been reset to the default.`);
      } else {
        setRowError(res.data.details || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setRowError(
        err.response?.data?.details ||
          "Something went wrong while resetting the password.",
      );
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="au-shell">
      <style>{STYLE_SHEET}</style>

      {/* ✅ ADDED — full-screen loading overlays */}
      {creating && <LoadingSpinner label="Registering user" />}
      {saving && <LoadingSpinner label="Saving changes" />}
      {resettingPassword && <LoadingSpinner label="Resetting password" />}
      {deleting && <LoadingSpinner label="Deleting user" />}

      <div className="au-topbar-outer">
        <div className="au-topbar-brand">
          <div className="au-topbar-brand-left">
            <button
              className="au-btn-back-inline"
              onClick={() => window.history.back()}
            >
              ← Back
            </button>
            <div className="au-topbar-divider" />
            <div>
              <span className="au-topbar-title">ADMIN SETUP</span>
              <span className="au-topbar-sub">All Users</span>
            </div>
          </div>
          <div className="au-topbar-actions">
            <button className="au-btn au-btn--ghost" onClick={fetchUsers}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="au-main">
        <div className="au-section-header">
          <div>
            <h1 className="au-section-title">Users Manager</h1>
            <p className="au-section-sub">
              USER OVERVIEW - REGISTER - UPDATE USERS
            </p>
          </div>
          <button
            type="button"
            className="au-btn au-btn--primary"
            onClick={isAdding ? closeAddRow : openAddRow}
          >
            {isAdding ? "Cancel" : "+ Register User"}
          </button>
        </div>

        <div className="au-content">
          <div className="au-search-toolbar">
            <div
              className={`au-search-bar${searchTerm ? " au-search-bar--active" : ""}`}
            >
              <span className="au-search-icon-badge">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  />
                  <path
                    d="M21 21L16.5 16.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                type="text"
                className="au-search-input"
                placeholder="Search by name, username, group, department…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <span className="au-search-count">
                  {filteredUsers.length}{" "}
                  {filteredUsers.length === 1 ? "match" : "matches"}
                </span>
              )}
              {searchTerm && (
                <button
                  type="button"
                  className="au-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="au-toolbar-divider" />

            <select
              className={`au-filter-select${filterGroup ? " au-filter-select--active" : ""}`}
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              aria-label="Filter by group"
            >
              <option value="">All Groups</option>
              {groupNames.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              className={`au-filter-select${filterPosition ? " au-filter-select--active" : ""}`}
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              aria-label="Filter by position"
            >
              <option value="">All Positions</option>
              {existingPositions.map((v) => (
                <option key={v} value={v}>
                  {positionLabel(v)}
                </option>
              ))}
            </select>

            <select
              className={`au-filter-select${filterRole ? " au-filter-select--active" : ""}`}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {VALID_ROLES.map((r) => (
                <option
                  key={r}
                  value={r}
                  style={{ textTransform: "capitalize" }}
                >
                  {r}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="au-filter-clear"
                onClick={clearFilters}
                aria-label="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>

          {loading && <div className="au-notice">Loading users…</div>}
          {!loading && error && <div className="au-banner">{error}</div>}
          {!loading && !error && users.length === 0 && !isAdding && (
            <div className="au-notice">No users have been registered yet.</div>
          )}

          {!loading && !error && (users.length > 0 || isAdding) && (
            <div className="au-table-wrap">
              {filteredUsers.length === 0 && !isAdding ? (
                <div className="au-empty-state">
                  {searchTerm || hasActiveFilters
                    ? "No users match the current search or filters."
                    : `No users match "${searchTerm}".`}
                </div>
              ) : (
                <>
                  <table className="au-table">
                    <thead>
                      <tr>
                        <th style={{ width: "20%" }}>Name</th>
                        <th style={{ width: "14%" }}>Group</th>
                        <th style={{ width: "16%" }}>Department</th>
                        <th style={{ width: "16%" }}>Position</th>
                        <th style={{ width: "10%" }}>Role</th>
                        <th style={{ width: "10%" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* ── ADD ROW ── */}
                      {isAdding && (
                        <tr className="au-edit-row">
                          <td colSpan={6}>
                            <div className="au-editor au-editor--new">
                              <div className="au-editor-grid">
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    First name
                                  </label>
                                  <input
                                    className="au-editor-input"
                                    type="text"
                                    value={newUserForm.firstName}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "firstName",
                                        e.target.value,
                                      )
                                    }
                                    autoFocus
                                  />
                                </div>
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Last name
                                  </label>
                                  <input
                                    className="au-editor-input"
                                    type="text"
                                    value={newUserForm.secondName}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "secondName",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Username
                                  </label>
                                  <input
                                    className="au-editor-input"
                                    type="text"
                                    value={newUserForm.username}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "username",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Email
                                  </label>
                                  <input
                                    className="au-editor-input"
                                    type="email"
                                    value={newUserForm.email}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "email",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Group
                                  </label>
                                  <select
                                    className="au-editor-input"
                                    value={newUserForm.group}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "group",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="">Select group</option>
                                    {groupNames.map((g) => (
                                      <option key={g} value={g}>
                                        {g}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Department
                                  </label>
                                  <select
                                    className="au-editor-input"
                                    value={newUserForm.department}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "department",
                                        e.target.value,
                                      )
                                    }
                                    disabled={!newUserForm.group}
                                  >
                                    <option value="">
                                      {newUserForm.group
                                        ? "Select department"
                                        : "Select a group first"}
                                    </option>
                                    {departmentsForGroup(newUserForm.group).map(
                                      (d) => (
                                        <option key={d} value={d}>
                                          {d}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </div>
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Position
                                  </label>
                                  <select
                                    className="au-editor-input"
                                    value={newUserForm.position}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "position",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="" disabled>
                                      Select position
                                    </option>
                                    {VALID_POSITIONS.map((p) => (
                                      <option key={p.value} value={p.value}>
                                        {p.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Role
                                  </label>
                                  <select
                                    className="au-editor-input"
                                    value={newUserForm.role}
                                    onChange={(e) =>
                                      updateNewUserField("role", e.target.value)
                                    }
                                  >
                                    <option value="">Select role</option>
                                    {VALID_ROLES.map((r) => (
                                      <option key={r} value={r}>
                                        {r}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Location
                                  </label>
                                  <select
                                    className="au-editor-input"
                                    value={newUserForm.emp_location}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "emp_location",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="" disabled>
                                      Select location
                                    </option>
                                    <option value="surface">Surface</option>
                                    <option value="underground">
                                      Underground
                                    </option>
                                  </select>
                                </div>

                                {/* Only show if position qualifies */}
                                {[
                                  "department-reviewer",
                                  "group-reviewer",
                                ].includes(newUserForm.position) && (
                                  <div className="au-editor-field">
                                    <label className="au-editor-label">
                                      OIC
                                    </label>
                                    <select
                                      className="au-editor-input"
                                      value={newUserForm.is_oic}
                                      onChange={(e) =>
                                        updateNewUserField(
                                          "is_oic",
                                          Number(e.target.value),
                                        )
                                      }
                                    >
                                      <option value={0}>No</option>
                                      <option value={1}>Yes</option>
                                    </select>
                                  </div>
                                )}

                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Password
                                  </label>
                                  <input
                                    className="au-editor-input"
                                    type="password"
                                    value={newUserForm.password}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "password",
                                        e.target.value,
                                      )
                                    }
                                    autoComplete="new-password"
                                  />
                                </div>
                                <div className="au-editor-field">
                                  <label className="au-editor-label">
                                    Confirm Password
                                  </label>
                                  <input
                                    className="au-editor-input"
                                    type="password"
                                    value={newUserForm.confirmPassword}
                                    onChange={(e) =>
                                      updateNewUserField(
                                        "confirmPassword",
                                        e.target.value,
                                      )
                                    }
                                    autoComplete="new-password"
                                  />
                                </div>
                              </div>

                              {addRowError && (
                                <div className="au-banner">{addRowError}</div>
                              )}

                              <div className="au-editor-actions">
                                <span />
                                <div className="au-editor-actions-right">
                                  <button
                                    type="button"
                                    className="au-btn au-btn--ghost"
                                    onClick={closeAddRow}
                                    disabled={creating}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="au-btn au-btn--primary"
                                    onClick={handleCreateUser}
                                    disabled={creating}
                                  >
                                    {creating ? "Creating…" : "Register User"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {paginatedUsers.map((u) => {
                        const isOpen = expandedId === u.id_master;
                        const isActive = !!Number(u.is_active);
                        return (
                          <React.Fragment key={u.id_master}>
                            <tr
                              className={`au-row-clickable${isOpen ? " au-row-active" : ""}`}
                              onClick={() => toggleRow(u)}
                            >
                              <td>
                                <div className="au-name-cell">
                                  <span
                                    className={`au-caret${isOpen ? " au-caret-open" : ""}`}
                                  >
                                    ▸
                                  </span>
                                  <div>
                                    <div className="au-user-name">
                                      {fullName(u) || "—"}
                                    </div>
                                    <div className="au-username">
                                      @{u.user_name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {u.emp_group ? (
                                  <span className="au-chip">{u.emp_group}</span>
                                ) : (
                                  <span className="au-empty">—</span>
                                )}
                              </td>
                              <td>
                                {u.emp_department ? (
                                  <span className="au-chip">
                                    {u.emp_department}
                                  </span>
                                ) : (
                                  <span className="au-empty">
                                    — unassigned —
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className="au-position">
                                  {u.emp_position || "—"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`au-role-badge au-role-badge--${u.emp_role}`}
                                >
                                  {u.emp_role || "—"}
                                </span>
                              </td>
                              {/* STATUS CELL WITH OIC BADGE */}
                              <td>
                                <span
                                  className={`au-status-dot${isActive ? " au-status-dot--active" : ""}`}
                                />
                                <span className="au-status-text">
                                  {isActive ? "Active" : "Inactive"}
                                </span>
                                {!!Number(u.is_oic) && (
                                  <span className="au-oic-badge">OIC</span>
                                )}
                              </td>
                            </tr>

                            {isOpen && (
                              <tr className="au-edit-row">
                                <td colSpan={6}>
                                  <div
                                    className="au-editor"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="au-editor-grid">
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          First name
                                        </label>
                                        <input
                                          className="au-editor-input"
                                          type="text"
                                          value={editForm.firstName}
                                          onChange={(e) =>
                                            updateField(
                                              "firstName",
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Last name
                                        </label>
                                        <input
                                          className="au-editor-input"
                                          type="text"
                                          value={editForm.secondName}
                                          onChange={(e) =>
                                            updateField(
                                              "secondName",
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Username
                                        </label>
                                        <input
                                          className="au-editor-input"
                                          type="text"
                                          value={editForm.username}
                                          onChange={(e) =>
                                            updateField(
                                              "username",
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Email
                                        </label>
                                        <input
                                          className="au-editor-input"
                                          type="email"
                                          value={editForm.email}
                                          onChange={(e) =>
                                            updateField("email", e.target.value)
                                          }
                                        />
                                      </div>
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Group
                                        </label>
                                        <select
                                          className="au-editor-input"
                                          value={editForm.group}
                                          onChange={(e) =>
                                            updateField("group", e.target.value)
                                          }
                                        >
                                          <option value="">Select group</option>
                                          {groupNames.map((g) => (
                                            <option key={g} value={g}>
                                              {g}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Department
                                        </label>
                                        <select
                                          className="au-editor-input"
                                          value={editForm.department}
                                          onChange={(e) =>
                                            updateField(
                                              "department",
                                              e.target.value,
                                            )
                                          }
                                          disabled={!editForm.group}
                                        >
                                          <option value="">
                                            {editForm.group
                                              ? "Select department"
                                              : "Select a group first"}
                                          </option>
                                          {departmentsForGroup(
                                            editForm.group,
                                          ).map((d) => (
                                            <option key={d} value={d}>
                                              {d}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Position
                                        </label>
                                        <select
                                          className="au-editor-input"
                                          value={editForm.position}
                                          onChange={(e) =>
                                            updateField(
                                              "position",
                                              e.target.value,
                                            )
                                          }
                                        >
                                          <option value="" disabled>
                                            Select position
                                          </option>
                                          {VALID_POSITIONS.map((p) => (
                                            <option
                                              key={p.value}
                                              value={p.value}
                                            >
                                              {p.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Role
                                        </label>
                                        <select
                                          className="au-editor-input"
                                          value={editForm.role}
                                          onChange={(e) =>
                                            updateField("role", e.target.value)
                                          }
                                        >
                                          <option value="">Select role</option>
                                          {VALID_ROLES.map((r) => (
                                            <option key={r} value={r}>
                                              {r}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Location
                                        </label>
                                        <select
                                          className="au-editor-input"
                                          value={editForm.emp_location}
                                          onChange={(e) =>
                                            updateField(
                                              "emp_location",
                                              e.target.value,
                                            )
                                          }
                                        >
                                          <option value="">
                                            Select location
                                          </option>
                                          <option value="surface">
                                            Surface
                                          </option>
                                          <option value="underground">
                                            Underground
                                          </option>
                                        </select>
                                      </div>

                                      {/* OIC FIELD — EDIT ROW */}
                                      {[
                                        "department-reviewer",
                                        "group-reviewer",
                                      ].includes(editForm.position) && (
                                        <div className="au-editor-field">
                                          <label className="au-editor-label">
                                            OIC
                                          </label>
                                          <select
                                            className="au-editor-input"
                                            value={editForm.is_oic}
                                            onChange={(e) =>
                                              updateField(
                                                "is_oic",
                                                e.target.value,
                                              )
                                            }
                                          >
                                            <option value="1">Yes</option>
                                            <option value="0">No</option>
                                          </select>
                                        </div>
                                      )}

                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Status
                                        </label>
                                        <select
                                          className="au-editor-input"
                                          value={editForm.is_active}
                                          onChange={(e) =>
                                            updateField(
                                              "is_active",
                                              e.target.value,
                                            )
                                          }
                                        >
                                          <option value="1">Active</option>
                                          <option value="0">Inactive</option>
                                        </select>
                                      </div>
                                      <div className="au-editor-field">
                                        <label className="au-editor-label">
                                          Password
                                        </label>
                                        <button
                                          type="button"
                                          className="au-btn au-btn--ghost"
                                          onClick={() =>
                                            handleResetPassword(
                                              u.id_master,
                                              fullName(u),
                                            )
                                          }
                                          disabled={
                                            resettingPassword ||
                                            saving ||
                                            deleting
                                          }
                                        >
                                          {resettingPassword
                                            ? "Resetting…"
                                            : "Reset to Default (123456)"}
                                        </button>
                                      </div>
                                    </div>

                                    {rowError && (
                                      <div className="au-banner">
                                        {rowError}
                                      </div>
                                    )}

                                    <div className="au-editor-actions">
                                      <button
                                        type="button"
                                        className="au-btn au-btn--danger"
                                        onClick={() =>
                                          handleDelete(u.id_master, fullName(u))
                                        }
                                        disabled={deleting || saving}
                                      >
                                        {deleting ? "Deleting…" : "Delete User"}
                                      </button>
                                      <div className="au-editor-actions-right">
                                        <button
                                          type="button"
                                          className="au-btn au-btn--ghost"
                                          onClick={() => setExpandedId(null)}
                                          disabled={deleting || saving}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          className="au-btn au-btn--primary"
                                          onClick={() =>
                                            handleSave(u.id_master)
                                          }
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

                  {filteredUsers.length > 0 && (
                    <div className="au-pagination">
                      <span className="au-pagination-info">
                        Showing {pageStart + 1}–
                        {Math.min(pageStart + PAGE_SIZE, filteredUsers.length)}{" "}
                        of {filteredUsers.length}
                      </span>
                      <div className="au-pagination-controls">
                        <button
                          type="button"
                          className="au-btn au-btn--ghost"
                          onClick={() => goToPage(safePage - 1)}
                          disabled={safePage <= 1}
                        >
                          ‹ Prev
                        </button>
                        <span className="au-pagination-page">
                          Page {safePage} of {totalPages}
                        </span>
                        <button
                          type="button"
                          className="au-btn au-btn--ghost"
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
    </div>
  );
}

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

.au-shell * { box-sizing: border-box; }
.au-shell {
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
.au-banner {
  background: var(--sr-danger-soft); border: 1px solid var(--sr-danger);
  color: #7A1F1F; font-size: 13px; font-weight: 600;
  padding: 10px 14px; border-radius: 6px;
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
.au-btn--danger {
  background: #fff; color: var(--sr-danger); border-color: var(--sr-danger);
}
.au-btn--danger:hover { background: var(--sr-danger-soft); }
.au-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.au-search-toolbar {
  padding: 1px 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.au-toolbar-divider {
  width: 1px;
  height: 28px;
  background: var(--sr-line-strong);
  flex-shrink: 0;
  margin: 0 2px;
}
.au-search-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--sr-paper);
  border: 1.5px solid var(--sr-line-strong);
  border-radius: 999px;
  padding: 4px 6px 4px 4px;
  flex: 1;
  min-width: 220px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: background 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.au-search-bar:hover { border-color: var(--sr-amber); }
.au-search-bar:focus-within {
  background: var(--sr-paper);
  border-color: var(--sr-sidebar-accent);
  box-shadow: 0 0 0 3px rgba(27, 140, 96, 0.14), 0 1px 3px rgba(0,0,0,0.06);
}
.au-search-bar--active { border-color: var(--sr-sidebar-accent); }
.au-search-icon-badge {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--sr-amber-soft); color: var(--sr-amber);
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}
.au-search-bar:focus-within .au-search-icon-badge {
  background: var(--sr-sidebar-accent); color: #fff; transform: scale(1.06);
}
.au-search-input {
  flex: 1; min-width: 0; border: none; outline: none;
  font-family: var(--font-body); font-size: 14px; font-weight: 500;
  color: var(--sr-ink); background: transparent; padding: 6px 2px;
}
.au-search-input::placeholder { color: var(--sr-muted); font-weight: 400; }
.au-search-count {
  flex-shrink: 0; font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.04em; color: var(--sr-amber-deep); background: var(--sr-amber-soft);
  border: 1px solid var(--sr-amber); border-radius: 999px; padding: 4px 11px; white-space: nowrap;
}
.au-search-clear {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; margin-right: 2px;
  background: var(--sr-paper-alt); border: 1px solid var(--sr-line); border-radius: 50%;
  color: var(--sr-muted); font-size: 14px; font-weight: 700; line-height: 1; cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease, transform 0.1s ease;
}
.au-search-clear:hover { background: var(--sr-danger); border-color: var(--sr-danger); color: #fff; transform: scale(1.08) rotate(90deg); }

.au-filter-select {
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--sr-ink-soft);
  background: var(--sr-paper);
  border: 1.5px solid var(--sr-line-strong);
  border-radius: 6px;
  padding: 6px 28px 6px 10px;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%235E7A6E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 9px center;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.au-filter-select:hover { border-color: var(--sr-amber); }
.au-filter-select:focus { border-color: var(--sr-sidebar-accent); box-shadow: 0 0 0 3px rgba(27,140,96,0.12); }
.au-filter-select--active {
  border-color: var(--sr-sidebar-accent);
  background-color: var(--sr-amber-soft);
  color: var(--sr-amber-deep);
  font-weight: 600;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%231B5E44' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.au-filter-clear {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  color: var(--sr-danger);
  background: var(--sr-danger-soft);
  border: 1.5px solid var(--sr-danger);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s ease;
}
.au-filter-clear:hover { background: #f5d0d0; }

.au-table-wrap { background: var(--sr-paper); border: 1px solid var(--sr-line); border-radius: 8px; overflow: hidden; }
.au-table { width: 100%; border-collapse: collapse; }
.au-table thead th {
  text-align: left; font-family: var(--font-mono); font-size: 10.5px;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--sr-sidebar-accent);
  background: var(--sr-ink); padding: 12px 16px; border-bottom: 1px solid var(--sr-line);
}
.au-table tbody tr:not(.au-edit-row) { border-bottom: 1px solid var(--sr-line); }
.au-table tbody tr:last-child { border-bottom: none; }
.au-row-clickable { cursor: pointer; transition: background 0.12s ease; }
.au-row-clickable:hover { background: var(--sr-paper-alt); }
.au-row-active { background: var(--sr-amber-soft); }
.au-table td { padding: 14px 16px; vertical-align: top; }

.au-name-cell { display: flex; align-items: flex-start; gap: 8px; }
.au-caret { display: inline-block; font-size: 11px; color: var(--sr-muted); margin-top: 2px; transition: transform 0.15s ease; }
.au-caret-open { transform: rotate(90deg); color: var(--sr-amber); }
.au-user-name { font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--sr-ink); }
.au-username { font-family: var(--font-mono); font-size: 11px; color: var(--sr-muted); margin-top: 1px; }

.au-chip {
  display: inline-flex; align-items: center; background: var(--sr-amber-soft);
  color: var(--sr-amber-deep); border: 1px solid var(--sr-amber); border-radius: 999px;
  padding: 4px 12px; font-size: 12px; font-weight: 500;
}
.au-position { font-size: 13px; color: var(--sr-ink-soft); }
.au-empty { font-size: 12px; color: var(--sr-muted); font-style: italic; }

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
.au-status-text { font-size: 12.5px; color: var(--sr-ink-soft); vertical-align: middle; }

/* OIC BADGE */
.au-oic-badge {
  display: inline-flex; align-items: center; margin-left: 6px;
  background: #EEF4FF; color: #2C5BAA; border: 1px solid #2C5BAA;
  border-radius: 999px; padding: 2px 8px; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.04em;
}

.au-empty-state { padding: 32px 16px; text-align: center; color: var(--sr-muted); font-size: 13px; }

.au-edit-row td { padding: 0; background: #FBFDFC; border-bottom: 1px solid var(--sr-line); }
.au-editor { padding: 20px 24px 22px; display: flex; flex-direction: column; gap: 18px; border-left: 3px solid var(--sr-amber); }
.au-editor--new { border-left-color: var(--sr-sidebar-accent); background: var(--sr-amber-soft); }
.au-editor-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
}
.au-editor-field { display: flex; flex-direction: column; gap: 8px; }
.au-editor-label {
  font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--sr-muted);
}
.au-editor-input {
  font-family: var(--font-body); font-size: 13.5px; padding: 9px 12px;
  border: 1.5px solid var(--sr-line-strong); border-radius: 6px;
  background: #fff; color: var(--sr-ink); outline: none;
}
.au-editor-input:focus { border-color: var(--sr-amber); }
.au-editor-input:disabled { background: var(--sr-paper-alt); color: var(--sr-muted); cursor: not-allowed; }

.au-editor-actions {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding-top: 4px; border-top: 1px solid var(--sr-line);
}
.au-editor-actions-right { display: flex; gap: 10px; }

.au-pagination {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-top: 1px solid var(--sr-line); background: var(--sr-paper-alt);
  flex-wrap: wrap;
}
.au-pagination-info { font-family: var(--font-mono); font-size: 11px; color: var(--sr-muted); letter-spacing: 0.02em; }
.au-pagination-controls { display: flex; align-items: center; gap: 12px; }
.au-pagination-page { font-family: var(--font-mono); font-size: 11.5px; color: var(--sr-ink-soft); min-width: 90px; text-align: center; }

@media (max-width: 900px) {
  .au-editor-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .au-topbar-brand { padding: 10px 16px; }
  .au-main { padding: 20px 16px 60px; }
  .au-table { font-size: 12px; }
  .au-section-header { flex-direction: column; align-items: flex-start; }
  .au-editor-grid { grid-template-columns: 1fr; }
  .au-editor-actions { flex-direction: column; align-items: stretch; }
  .au-editor-actions-right { justify-content: flex-end; }
  .au-search-bar { max-width: 100%; }
  .au-pagination { flex-direction: column; align-items: stretch; text-align: center; }
  .au-pagination-controls { justify-content: center; }
  .au-search-toolbar { gap: 6px; }
  .au-toolbar-divider { display: none; }
  .au-search-bar { min-width: 100%; }
  .au-filter-select { font-size: 12px; padding: 5px 24px 5px 8px; flex: 1; min-width: 100px; }
}
`;
