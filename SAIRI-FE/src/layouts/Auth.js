import React from "react";
import { useLocation, Route, Routes, Navigate } from "react-router-dom";
import routes from "routes";
import logo from "assets/img/brand/lp.png";

const Auth = (props) => {
  const mainContent = React.useRef(null);
  const location = useLocation();

  const isAuthenticated = localStorage.getItem("user") !== null;

  React.useEffect(() => {
    document.body.classList.add("bg-default");
    return () => document.body.classList.remove("bg-default");
  }, []);

  React.useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
    if (mainContent.current) {
      mainContent.current.scrollTop = 0;
    }
  }, [location]);

  if (isAuthenticated) {
    return <Navigate to="/admin/index" replace />;
  }

  const getRoutes = (routes) =>
    routes.map((prop, key) =>
      prop.layout === "/auth" ? (
        <Route path={prop.path} element={prop.component} key={key} exact />
      ) : null
    );

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .auth-shell { flex-direction: column !important; }
          .auth-left {
            flex: 1 1 auto !important;
            border-right: none !important;
            border-top: none !important;
          }
          .auth-form-area {
            padding: 2rem 1.5rem !important;
            align-items: flex-start !important;
          }
          .auth-right {
            flex: 0 0 auto !important;
            order: -1;
            padding: 1.5rem !important;
            min-height: unset !important;
          }
          .auth-right-heading {
            font-size: 1.6rem !important;
            margin-bottom: 0.5rem !important;
            white-space: normal !important;
          }
          .auth-right-body { display: none !important; }
          .auth-feat-list { display: none !important; }
          .auth-circle-top, .auth-circle-bottom { display: none !important; }
          .auth-footer {
            padding: 0.75rem 0 1rem !important;
          }
        }
      `}</style>
      <div style={s.wrapper}>
        <div style={s.shell} className="auth-shell" ref={mainContent}>

          {/* Right panel */}
          <div style={s.right} className="auth-right">
            <div style={s.circleTop} className="auth-circle-top" />
            <div style={s.circleBottom} className="auth-circle-bottom" />
            <div style={s.rightInner}>

              {/* ── Lepanto branding block ── */}

              <div style={s.brandBlock}>
                <img
                  src={logo}
                  alt="Lepanto logo"
                  style={s.brandLogo}
                />
                <span style={s.brandName}>Lepanto Consolidated Mining Company</span>
              </div>


              {/* ─────────────────────────── */}

              <h2 style={s.rightHeading} className="auth-right-heading">
                Keeping <span style={{ color: "#175a11" }}>workplaces</span>{"\n"}{" "}
                <span style={{ color: "#175a11" }}>safer</span>, together.
              </h2>
              <p style={s.rightBody} className="auth-right-body">
                Real-time accident monitoring, incident tracking, and safety
                reporting — all in one unified platform.
              </p>
              <ul style={s.featList} className="auth-feat-list">
                {[
                  {
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    ),
                    title: "Instant incident reporting",
                    sub: "Log and escalate accidents in seconds from any device.",
                  },
                  {
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    ),
                    title: "Live safety monitoring",
                    sub: "Track hazard metrics and trends across all your sites.",
                  },
                ].map((f, i) => (
                  <li key={i} style={s.featItem}>
                    <div style={s.featIcon}>{f.icon}</div>
                    <div>
                      <p style={s.featTitle}>{f.title}</p>
                      <p style={s.featSub}>{f.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Left panel — form */}
          <div style={s.left} className="auth-left">
            <div style={s.formArea} className="auth-form-area">
              <Routes>
                {getRoutes(routes)}
                <Route path="/" element={<Navigate to="/auth/auth-login" replace />} />
              </Routes>
            </div>
            <footer style={s.footer} className="auth-footer">
              <a href="https://www.lepantomining.com/" style={s.footerBtn}>
                © 2026 lepantomining.com
              </a>
              <span style={s.footerSep}>·</span>
              <a href="https://adrian-ventura.vercel.app/" style={s.footerBtn1}>
                ByAdrianVentura
              </a>
            </footer>
          </div>

        </div>
      </div>
    </>
  );
};

export default Auth;

const s = {
  wrapper: { minHeight: "100vh" },
  shell: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden",
    background: "#ffffff",
  },
  left: {
    flex: "0 0 46%",
    display: "flex",
    flexDirection: "column",
    background: "#f0f0f0",
    borderRight: "1px solid #f0f0f0",
  },
  formArea: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 3.5rem 2rem 4rem",
  },
  footer: {
    padding: "1rem 0 1.5rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
  },
  footerBtn: {
    color: "#bbb",
    fontSize: "0.72rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
    textDecoration: "none",
  },
  footerBtn1: {
    color: "#f1f1f1",
    fontSize: "0.72rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
    textDecoration: "none",
  },
  footerSep: { color: "#ddd", fontSize: "0.72rem" },
  right: {
    flex: 1,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "2.5rem",
    background: "linear-gradient(150deg, #0D1B2A 20%, #000629 100%)",
    overflow: "hidden",
  },
  circleTop: {
    position: "absolute",
    top: "-80px",
    right: "-80px",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background: "rgba(59, 74, 126, 0.12)",
    zIndex: 0,
  },
  circleBottom: {
    position: "absolute",
    bottom: "-100px",
    left: "-60px",
    width: "260px",
    height: "260px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.04)",
    zIndex: 0,
  },
  rightInner: {
    position: "relative",
    zIndex: 1,
    maxWidth: "520px",
    margin: "0 auto",
  },

  /* ── Lepanto branding ── */
  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "2.2rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  brandLogo: {
    width: "36px",
    height: "36px",
    objectFit: "contain",
    flexShrink: 0,
  },
  brandName: {
    fontSize: "1.05rem",
    fontWeight: "200",
    color: "#ffffff",
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
  },
  /* ─────────────────────── */

  rightHeading: {
    fontSize: "3.55rem",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 1.3,
    marginBottom: "0.75rem",
    letterSpacing: "-0.02em",
    whiteSpace: "pre-line",
  },
  rightBody: {
    fontSize: "1rem",
    color: "rgba(255,255,255,0.68)",
    lineHeight: 1.75,
    marginBottom: "2rem",
  },
  featList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  featItem: { display: "flex", alignItems: "flex-start", gap: "12px" },
  featIcon: {
    flexShrink: 0,
    marginTop: "1px",
    width: "26px",
    height: "26px",
    borderRadius: "7px",
    background: "rgba(19, 80, 29, 0.57)",
    border: "0.5px solid rgba(80, 143, 80, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  featTitle: { fontSize: "1.20rem", fontWeight: "600", color: "#fff", marginBottom: "2px" },
  featSub: { fontSize: "1.00rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 },
};