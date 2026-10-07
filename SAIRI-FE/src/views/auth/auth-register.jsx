import { useEffect, useState } from "react";
import axios from "axios";
import config from "config";
import { useNotification } from "components/Safetynotification.jsx";
import LoadingSpinner from "components/LoadingComponent";

/* ════════════════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES — same tokens/patterns as AddReport.jsx
   ════════════════════════════════════════════════════════════════════════ */

function Req() {
  return <span className="ar-req">＊</span>;
}

function Field({ label, required, hint, warn, children }) {
  return (
    <label className="ar-field">
      <span className="ar-label">
        {label}
        {required && <Req />}
      </span>
      {children}
      {warn && <span className="ar-warn">{warn}</span>}
      {hint && !warn && <span className="ar-hint">{hint}</span>}
    </label>
  );
}

function Plate({ code, title }) {
  return (
    <div className="ar-plate">
      <span className="ar-plate-code">{code}</span>
      <span className="ar-plate-title">{title}</span>
    </div>
  );
}

export default function AuthRegister() {
  const [form, setForm] = useState({
    firstName: "",
    secondName: "",
    username: "",
    email: "",
    group: "",
    department: "",
    is_oic: 0, // ← ADD THIS
    position: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const notify = useNotification();
  const [focusedField, setFocusedField] = useState(null);
  const [emailValid, setEmailValid] = useState(false);
  const [emailDomainValid, setEmailDomainValid] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(null); // null | true | false

  const GROUPS = ["ASG", "CONTRACTOR", "EXP", "FSG"];
  const [groupList, setGroupList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const ROLES = ["admin", "user"];

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    const updated = { ...form, [field]: value };

    if (field === "group") {
      const selected = groupList.find((g) => g.gd_id === value);
      setDeptList(selected ? selected.departments : []);
      updated.department = ""; // reset department selection
    }

    setForm(updated);

    if (field === "email") {
      const hasAt = value.includes("@") && value.length > 4;
      const hasRightDomain =
        value.endsWith("@lepantomining.com") ||
        value.includes("@lepantomining.com");
      setEmailValid(hasAt);
      setEmailDomainValid(hasRightDomain);
    }
    if (
      field === "confirmPassword" ||
      (field === "password" && form.confirmPassword)
    ) {
      const pw = field === "password" ? value : form.password;
      const cpw = field === "confirmPassword" ? value : form.confirmPassword;
      setPasswordMatch(cpw.length > 0 ? pw === cpw : null);
    }
  };

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get(`${config.baseApi}/setup/all`);
        if (res.data.message === "success") {
          setGroupList(res.data.data); // [{gd_id, group, departments:[{id, department}]}]

          console.log("DATA DEPT: ");
        }
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await axios.get(`${config.baseApi}/auth/test`);
        console.log("API test:", res.data);
      } catch (err) {
        console.log("API test error:", err);
      }
    };
    fetchTest();
  }, []);

  const handleSubmit = async () => {
    const {
      firstName,
      secondName,
      username,
      email,
      group,
      department,
      position,
      role,
      password,
      confirmPassword,
    } = form;

    if (
      !firstName ||
      !secondName ||
      !username ||
      !email ||
      !group ||
      !department ||
      !position ||
      !role ||
      !password ||
      !confirmPassword
    ) {
      notify.error(
        "VALIDATION FAILED",
        "Please fill in all fields to create your account.",
      );
      return;
    }
    if (username.length < 3) {
      notify.error(
        "VALIDATION FAILED",
        "Username must be at least 3 characters.",
      );
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      notify.error(
        "VALIDATION FAILED",
        "Username may only contain letters, numbers, dots, hyphens, and underscores.",
      );
      return;
    }
    if (!emailValid) {
      notify.error("VALIDATION FAILED", "Enter a valid email address.");
      return;
    }
    if (!emailDomainValid) {
      notify.error("VALIDATION FAILED", "Email must use @lepantomining.com.");
      return;
    }
    if (password.length < 8) {
      notify.error(
        "VALIDATION FAILED",
        "Password must be at least 8 characters.",
      );
      return;
    }
    if (password !== confirmPassword) {
      notify.error("VALIDATION FAILED", "Passwords do not match.");
      return;
    }
    setLoading(false);
    setLoading(true);

    try {
      const res = await axios.post(`${config.baseApi}/auth/register`, {
        firstName,
        secondName,
        username,
        email,
        group,
        department,
        position,
        role,
        password,
      });

      setTimeout(() => {
        setLoading(false);
        notify.success(
          "SUCCESS",
          res.data.message || "Account created successfully!",
        );
        setForm({
          firstName: "",
          secondName: "",
          username: "",
          email: "",
          group: "",
          position: "",
          role: "",
          password: "",
          confirmPassword: "",
        });
      }, 2000);
    } catch (err) {
      const msg =
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        "Registration failed. Please try again.";
      setLoading(false);
      notify.error("REGISTRATION FAILED", msg);
    }
  };

  if (loading) return <LoadingSpinner label="Creating account" />;

  const focusClass = (field) =>
    focusedField === field ? " ar-input--focus" : "";

  const step2Filled = Boolean(
    form.username || form.email || form.group || form.role,
  );
  const step3Filled = Boolean(form.password || form.confirmPassword);

  return (
    <div className="ar-shell">
      <style>{STYLE_SHEET}</style>

      {/* ─── TOP HEADER BAR ─── */}
      <div className="ar-topbar-outer">
        <div className="ar-topbar-brand">
          <div className="ar-topbar-brand-left">
            <button
              className="ar-btn-back-inline"
              onClick={() => window.history.back()}
            >
              ← Back
            </button>
            <div className="ar-topbar-divider" />
            <div>
              <span className="ar-topbar-title">SAMS</span>
              <span className="ar-topbar-sub">Create Account</span>
            </div>
          </div>
        </div>

        {/* ─── SECTION INDICATOR STRIP ─── */}
        <div className="ar-section-strip">
          <div className="ar-section-strip-item ar-section-strip-item--active">
            <span className="ar-section-strip-num">1</span>
            <span className="ar-section-strip-label">Personal Info</span>
          </div>
          <div className="ar-section-strip-divider" />
          <div
            className={`ar-section-strip-item${step2Filled ? " ar-section-strip-item--filled" : ""}`}
          >
            <span
              className={`ar-section-strip-num${step2Filled ? " ar-section-strip-num--filled" : ""}`}
            >
              {step2Filled ? "✓" : "2"}
            </span>
            <span className="ar-section-strip-label">Account Details</span>
          </div>
          <div className="ar-section-strip-divider" />
          <div
            className={`ar-section-strip-item${step3Filled ? " ar-section-strip-item--filled" : ""}`}
          >
            <span
              className={`ar-section-strip-num${step3Filled ? " ar-section-strip-num--filled" : ""}`}
            >
              {step3Filled ? "✓" : "3"}
            </span>
            <span className="ar-section-strip-label">Security</span>
          </div>
          <div className="ar-section-strip-note">
            Registration is restricted to authorized Lepanto Mining personnel
          </div>
        </div>
      </div>

      <div className="ar-card">
        <h1 className="ar-heading">Create your account</h1>
        <p className="ar-subheading">Register as authorized SAMS personnel</p>

        {/* ─── Personal Info ─── */}
        <Plate code="STEP.01" title="Personal Information" />
        <div className="ar-panel">
          <div className="ar-grid ar-grid--3">
            <Field label="First Name" required>
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  className={`ar-input${focusClass("firstName")}`}
                  type="text"
                  placeholder="Juan"
                  value={form.firstName}
                  onChange={handleChange("firstName")}
                  onFocus={() => setFocusedField("firstName")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="given-name"
                />
              </div>
            </Field>
            <Field label="Second Name" required>
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  className={`ar-input${focusClass("secondName")}`}
                  type="text"
                  placeholder="dela Cruz"
                  value={form.secondName}
                  onChange={handleChange("secondName")}
                  onFocus={() => setFocusedField("secondName")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="family-name"
                />
              </div>
            </Field>
            <Field label="Employee Position" required>
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
                  </svg>
                </span>
                <select
                  className={`ar-input ar-select${focusClass("position")}${form.position ? "" : " ar-select--placeholder"}`}
                  value={form.position}
                  onChange={handleChange("position")}
                  onFocus={() => setFocusedField("position")}
                  onBlur={() => setFocusedField(null)}
                >
                  <option value="" disabled>
                    Select position
                  </option>
                  <option value="group-head">Group Head</option>
                  <option value="department-head">Department Head</option>
                  <option value="section-head">Section Head</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="department-reviewer">
                    Department Reviewer
                  </option>
                  <option value="safety-head">Safety Head</option>
                  <option value="safety-reviewer">Safety Reviewer</option>
                </select>
                <span className="ar-chevron">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </Field>
            <Field label="Officer-in-Charge (OIC)" required>
              <div className="ar-input-wrap" style={{ paddingLeft: 0 }}>
                <select
                  className={`ar-input ar-select${focusClass("is_oic")}${form.is_oic !== "" ? "" : " ar-select--placeholder"}`}
                  value={form.is_oic}
                  onChange={handleChange("is_oic")}
                  onFocus={() => setFocusedField("is_oic")}
                  onBlur={() => setFocusedField(null)}
                  style={{ paddingLeft: "12px" }}
                >
                  <option value={0}>No</option>
                  <option value={1}>Yes</option>
                </select>
                <span className="ar-chevron">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </Field>
          </div>
        </div>

        {/* ─── Account ─── */}
        <Plate code="STEP.02" title="Account Details" />
        <div className="ar-panel">
          <div className="ar-grid ar-grid--2">
            <Field
              label="Username"
              required
              hint="Letters, numbers, dots, hyphens, and underscores only."
            >
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
                  </svg>
                </span>
                <input
                  className={`ar-input${focusClass("username")}`}
                  type="text"
                  placeholder="juan.delacruz"
                  value={form.username}
                  onChange={handleChange("username")}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>
            </Field>

            <Field
              label="Email"
              required
              warn={
                emailValid && !emailDomainValid
                  ? "Must be a @lepantomining.com address."
                  : null
              }
            >
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  className={`ar-input${focusClass("email")}`}
                  type="email"
                  placeholder="employee-email@lepantomining.com"
                  value={form.email}
                  onChange={handleChange("email")}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="email"
                />
                {emailDomainValid && (
                  <span className="ar-status-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#1B5E44"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </span>
                )}
              </div>
            </Field>
          </div>

          <div className="ar-grid ar-grid--2">
            <Field label="Group" required>
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <select
                  className={`ar-input ar-select${focusClass("group")}${form.group ? "" : " ar-select--placeholder"}`}
                  value={form.group}
                  onChange={handleChange("group")}
                  onFocus={() => setFocusedField("group")}
                  onBlur={() => setFocusedField(null)}
                >
                  <option value="" disabled>
                    Select group
                  </option>
                  {groupList.map((g) => (
                    <option key={g.gd_id} value={g.gd_id}>
                      {g.group}
                    </option>
                  ))}
                </select>
                <span className="ar-chevron">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </Field>
            <Field label="Department" required>
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <select
                  className={`ar-input ar-select${focusClass("department")}${form.department ? "" : " ar-select--placeholder"}`}
                  value={form.department}
                  onChange={handleChange("department")}
                  onFocus={() => setFocusedField("department")}
                  onBlur={() => setFocusedField(null)}
                  disabled={!form.group} // ← disable until a group is chosen
                >
                  <option value="" disabled>
                    {form.group ? "Select department" : "Select a group first"}
                  </option>
                  {deptList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.department}
                    </option>
                  ))}
                </select>
                <span className="ar-chevron">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </Field>

            <Field label="Role" required>
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <select
                  className={`ar-input ar-select${focusClass("role")}${form.role ? "" : " ar-select--placeholder"}`}
                  value={form.role}
                  onChange={handleChange("role")}
                  onFocus={() => setFocusedField("role")}
                  onBlur={() => setFocusedField(null)}
                  style={{ textTransform: "capitalize" }}
                >
                  <option value="" disabled>
                    Select role
                  </option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <span className="ar-chevron">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </Field>
          </div>
        </div>

        {/* ─── Security ─── */}
        <Plate code="STEP.03" title="Security" />
        <div className="ar-panel">
          <div className="ar-grid ar-grid--2">
            <Field label="Password" required>
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  className={`ar-input${focusClass("password")}`}
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange("password")}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="new-password"
                />
              </div>
              {form.password.length > 0 && (
                <PasswordStrength password={form.password} />
              )}
            </Field>

            <Field label="Confirm Password" required>
              <div className="ar-input-wrap">
                <span className="ar-input-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C93A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  className={`ar-input${focusClass("confirmPassword")}${passwordMatch === false ? " ar-input--err" : ""}`}
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="new-password"
                />
                {passwordMatch === true && (
                  <span className="ar-status-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#1B5E44"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </span>
                )}
                {passwordMatch === false && (
                  <span className="ar-status-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#B02020"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </span>
                )}
              </div>
            </Field>
          </div>
        </div>

        {/* Submit */}
        <button className="ar-btn ar-btn--primary" onClick={handleSubmit}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          CREATE ACCOUNT
        </button>

        <div className="ar-security-note">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7C93A8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>
            Accounts are subject to admin approval before access is granted.
          </span>
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["#B02020", "#C07A1B", "#B5A61B", "#1B5E44"];

  return (
    <div className="ar-strength">
      <div className="ar-strength-bars">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="ar-strength-bar"
            style={{ background: i < score ? colors[score - 1] : "#E1E9E5" }}
          />
        ))}
      </div>
      {score > 0 && (
        <p className="ar-strength-label" style={{ color: colors[score - 1] }}>
          {labels[score - 1]}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET — reuses the AddReport.jsx design system tokens
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

.ar-shell {
  --ink:         #0D1B2A;
  --ink-soft:    #2C4A3E;
  --muted:       #5E7A6E;
  --paper:       #FFFFFF;
  --paper-alt:   #F0F4F2;
  --line:        #C8D8D1;
  --line-strong: #9DBCB0;
  --amber:       #1B5E44;
  --amber-deep:  #0F3D2B;
  --amber-soft:  #D4EDE5;
  --danger:      #B02020;
  --danger-soft: #FAE8E8;
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body:    'Inter', sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--font-body);
  color: var(--ink);
}
.ar-shell * { box-sizing: border-box; }

.ar-card {
  width: 100%;
  max-width: 860px;
  padding: 28px 20px 60px;
}

/* ═══ TOP HEADER BAR ═══ */
.ar-topbar-outer {
  width: 100%;
  background: #0D1B2A;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.ar-topbar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-wrap: wrap;
  gap: 12px;
}

.ar-topbar-brand-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ar-topbar-divider {
  width: 1px;
  height: 28px;
  background: rgba(255,255,255,0.1);
}

.ar-topbar-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: #E8F4EF;
  letter-spacing: 0.05em;
  display: block;
}

.ar-topbar-sub {
  font-size: 10px;
  color: #4A6B84;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: block;
}

.ar-btn-back-inline {
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
.ar-btn-back-inline:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

/* ═══ SECTION STRIP ═══ */
.ar-section-strip {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 32px;
  overflow-x: auto;
  scrollbar-width: none;
}
.ar-section-strip::-webkit-scrollbar { display: none; }

.ar-section-strip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  color: #4A6B84;
  font-size: 12px;
  white-space: nowrap;
}
.ar-section-strip-item--active { color: #E8F4EF; }

.ar-section-strip-num {
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-family: var(--font-mono); flex-shrink: 0;
  color: #E8F4EF;
}
.ar-section-strip-item--active .ar-section-strip-num {
  background: #1B8C60; color: #fff;
}

.ar-section-strip-label { font-weight: 500; }
.ar-section-strip-divider {
  width: 20px; height: 1px; background: rgba(255,255,255,0.1);
}
.ar-section-strip-note {
  margin-left: auto;
  font-size: 10px;
  color: #4A6B84;
  font-style: italic;
  padding: 11px 0;
  white-space: nowrap;
}

.ar-section-strip-item--filled { color: #A8D5C4; }
.ar-section-strip-num--filled { background: #1B8C60; color: #fff; font-size: 10px; }

.ar-heading {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: 0.01em;
  color: var(--ink);
}
.ar-subheading {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 20px;
}

/* ═══ PLATE ═══ */
.ar-plate {
  display: flex;
  align-items: baseline;
  gap: 10px;
  background: var(--ink);
  color: #fff;
  border-left: 4px solid #1B8C60;
  padding: 8px 14px;
  border-radius: 5px;
  margin: 20px 0 12px;
}
.ar-plate:first-of-type { margin-top: 4px; }
.ar-plate-code {
  font-family: var(--font-mono);
  font-size: 10px;
  color: #1B8C60;
  letter-spacing: 0.08em;
}
.ar-plate-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.01em;
}

/* ═══ PANEL ═══ */
.ar-panel {
  background: var(--paper-alt);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px 18px 6px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 4px;
}

/* ═══ GRID ═══ */
.ar-grid { display: grid; gap: 14px; }
.ar-grid--2 { grid-template-columns: repeat(2, 1fr); }
.ar-grid--3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 700px) { .ar-grid--2, .ar-grid--3 { grid-template-columns: 1fr; } }

/* ═══ FIELDS ═══ */
.ar-field { display: flex; flex-direction: column; gap: 6px; }
.ar-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ar-req { color: var(--danger); margin-left: 3px; }
.ar-hint { font-size: 11px; color: var(--muted); font-style: italic; }
.ar-warn { font-size: 11px; color: #C07A1B; font-weight: 600; }

.ar-input-wrap { position: relative; display: flex; align-items: center; }
.ar-input-icon {
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 1;
}
.ar-input {
  width: 100%;
  font-family: var(--font-body);
  font-size: 13.5px;
  color: var(--ink);
  background: #fff;
  border: 1.5px solid var(--line-strong);
  border-radius: 6px;
  padding: 9px 12px 9px 38px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ar-input--focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px rgba(27,94,68,0.14);
}
.ar-input--err { border-color: var(--danger) !important; background: var(--danger-soft); }
.ar-select { cursor: pointer; appearance: none; padding-right: 34px; }
.ar-select--placeholder { color: #93A6A0; }
.ar-chevron { position: absolute; right: 12px; display: flex; align-items: center; pointer-events: none; }
.ar-status-icon { position: absolute; right: 12px; display: flex; align-items: center; pointer-events: none; }

/* ═══ PASSWORD STRENGTH ═══ */
.ar-strength { margin-top: 6px; }
.ar-strength-bars { display: flex; gap: 4px; margin-bottom: 4px; }
.ar-strength-bar { flex: 1; height: 3px; border-radius: 2px; transition: background 0.2s; }
.ar-strength-label { font-size: 11px; margin: 0; font-weight: 600; }

/* ═══ BUTTON ═══ */
.ar-btn {
  margin-top: 22px;
  width: 100%;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 12px;
  border-radius: 7px;
  cursor: pointer;
  border: 1.5px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.ar-btn--primary {
  background: var(--amber);
  color: #fff;
  border-color: var(--amber-deep);
  box-shadow: 0 10px 24px rgba(27,94,68,0.28);
}
.ar-btn--primary:hover { background: var(--amber-deep); }
.ar-btn--primary:disabled { opacity: 0.75; cursor: not-allowed; }

/* ═══ SECURITY NOTE ═══ */
.ar-security-note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  background: var(--paper-alt);
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 10px 12px;
  margin-top: 16px;
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.55;
}

@media (max-width: 520px) {
  .ar-heading { font-size: 24px; }
  .ar-topbar-brand { padding: 10px 16px; }
  .ar-section-strip { padding: 0 16px; }
  .ar-section-strip-note { display: none; }
}
`;
