import { useState } from "react";
import Logo from "../../assets/img/brand/sairi-icon-text-logo.png";
import axios from "axios";
import config from "config";
import { useNavigate } from "react-router-dom";
import { useNotification } from "components/Safetynotification";
export default function AuthLogin() {
    const [username, setUsername] = useState(""); // ✅ username instead of email
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [focusedField, setFocusedField] = useState(null);
    const navigate = useNavigate();

    const notify = useNotification();


    // ✅ POST to /auth/login with username + password in the body
    const handleSubmit = async () => {
        if (!username || !password) {
            setError("Enter your credentials to access the system.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const res = await axios.post(`${config.baseApi}/auth/login`, {
                username,
                password,
            });

            const user = res.data;
            console.log("Logged in:", user);

            // Store session info — swap this for your auth context / redux store if applicable
            localStorage.setItem("user", JSON.stringify(user));
            navigate("/admin/index", { replace: true });

            // Redirect or trigger app state change here
            // alert(`Welcome, ${user.emp_firstname}!`);

            notify.success("Log In Successful", `Welcome, ${user.emp_firstname} `);

        } catch (err) {
            const msg =
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                "Login failed. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = (field) => ({
        ...s.input,
        borderColor: focusedField === field ? ACCENT : "#e8e8e8",
        boxShadow: focusedField === field ? "0 0 0 3px rgba(6, 182, 30, 0.1)" : "none",
    });

    return (
        <>
            <style>{`
                @media (max-width: 768px) {
                    .auth-login-card {
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    .auth-login-logo-wrap {
                        margin-bottom: 2rem !important;
                    }
                    .auth-login-btn {
                        margin-top: 2rem !important;
                    }
                }
            `}</style>
            <div style={s.card} className="auth-login-card">

                {/* Logo */}
                <div style={s.logoWrap} className="auth-login-logo-wrap">
                    <img src={Logo} alt="SAMS" style={{ height: "auto", width: "auto" }} />
                </div>

                <h1 style={s.heading}>Sign in to SAMS</h1>

                {/* Error */}
                {error && (
                    <div style={s.errorBox}>
                        <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round"
                            strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* ✅ Username field — replaces email */}
                <div style={s.field}>
                    <label style={s.label}>Username</label>
                    <div style={s.inputWrap}>
                        <span style={s.inputIcon}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
                            </svg>
                        </span>
                        <input
                            style={{ ...inputStyle("username"), paddingLeft: "2.4rem" }}
                            type="text"
                            placeholder="juan.delacruz"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onFocus={() => setFocusedField("username")}
                            onBlur={() => setFocusedField(null)}
                            autoComplete="username"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Password */}
                <div style={s.field}>
                    <label style={s.label}>Password</label>
                    <div style={s.inputWrap}>
                        <span style={s.inputIcon}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </span>
                        <input
                            style={{ ...inputStyle("password"), paddingLeft: "2.4rem" }}
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedField("password")}
                            onBlur={() => setFocusedField(null)}
                            autoComplete="current-password"
                        />
                    </div>
                </div>

                {/* Submit */}
                <button
                    style={{ ...s.btn, opacity: loading ? 0.8 : 1 }}
                    className="auth-login-btn"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <Spinner />
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            SIGN IN TO SAMS
                        </>
                    )}
                </button>

                {/* Security note */}
                <div style={s.securityNote}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>
                        This system is for authorized personnel only. All activity is monitored and logged.
                    </span>
                </div>
            </div>
        </>
    );
}

function Spinner() {
    return (
        <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: "spin 0.8s linear infinite" }}
        >
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
    );
}

const ACCENT = "#00790a";

const s = {
    card: {
        width: "100%",
        maxWidth: "380px",
        fontFamily: "'Inter', system-ui, sans-serif",
    },
    logoWrap: {
        marginBottom: "3.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    heading: {
        fontSize: "1.65rem",
        fontWeight: "700",
        color: "#1a1a1a",
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
        marginBottom: "1.25rem",
    },
    errorBox: {
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        background: "#fdf2f2",
        border: "1px solid #fca5a5",
        borderRadius: "8px",
        color: "#c0392b",
        fontSize: "0.8rem",
        padding: "0.6rem 0.85rem",
        marginBottom: "1rem",
        lineHeight: 1.5,
    },
    field: {
        marginBottom: "1rem",
    },
    label: {
        display: "block",
        fontSize: "0.72rem",
        fontWeight: "500",
        color: "#888",
        marginBottom: "6px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
    },
    inputWrap: {
        position: "relative",
        display: "flex",
        alignItems: "center",
    },
    inputIcon: {
        position: "absolute",
        left: "0.75rem",
        display: "flex",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 1,
    },
    input: {
        width: "100%",
        padding: "0.65rem 2.4rem 0.65rem 0.9rem",
        border: "1.5px solid #e8e8e8",
        borderRadius: "8px",
        fontSize: "0.9rem",
        color: "#1a1a1a",
        outline: "none",
        background: "#fafafa",
        boxSizing: "border-box",
        transition: "border-color 0.15s, box-shadow 0.15s",
        fontFamily: "inherit",
    },
    check: {
        position: "absolute",
        right: "0.65rem",
        display: "flex",
        alignItems: "center",
        pointerEvents: "none",
    },
    btn: {
        marginTop: "3.5rem",
        width: "100%",
        padding: "0.8rem",
        background: "#008042",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.88rem",
        fontWeight: "700",
        letterSpacing: "0.06em",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        marginBottom: "1rem",
        transition: "background 0.15s",
        boxShadow: "0 4px 14px rgba(43, 192, 50, 0.28)",
        fontFamily: "inherit",
    },
    securityNote: {
        display: "flex",
        alignItems: "flex-start",
        gap: "6px",
        background: "#f9f9f9",
        border: "0.5px solid #efefef",
        borderRadius: "7px",
        padding: "0.55rem 0.8rem",
        marginBottom: "1.25rem",
        fontSize: "0.72rem",
        color: "#aaa",
        lineHeight: 1.55,
    },
};