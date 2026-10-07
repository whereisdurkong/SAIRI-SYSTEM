import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import config from "config";
import Group from "./group";
import Incident from "./incident";
import Occupation from "./occupation";

import Shift from "./shift";
import SupervisorVictim from "./supervisorVictim";
import UndergroundTable from "./undergroundTable";
import Workplace from "./workplace";
import { DateFilterBar, EMPTY_FILTERS, toYMD } from "./dateFilter";
import IncidentDetails from "./incidentDetails";
import { exportAmrExcel } from "./amrExport";

/* ════════════════════════════════════════════════════════════════════════
   TAB DEFINITIONS
   Each tab pairs a nav label with the existing report component. Every
   component stays mounted (just hidden via CSS) so switching tabs never
   re-triggers its data fetch.
   ════════════════════════════════════════════════════════════════════════ */

const TABS = [
  {
    key: "register",
    label: "Incident Per Location",
    Component: UndergroundTable,
  },
  // { key: "property", label: "Property Damage", Component: PropertyDamage },
  { key: "occupation", label: "Occupation / Equipment", Component: Occupation },
  { key: "mechanism", label: "Type of Incident", Component: Incident },
  { key: "shift", label: "Shift of Incident", Component: Shift },

  { key: "workplace", label: "Working Place / Area", Component: Workplace },
  {
    key: "supervisor",
    label: "Spvr. of Injured Individual / Damaged Area",
    Component: SupervisorVictim,
  },
  {
    key: "group",
    label: "Group / Department / Section or Contractor",
    Component: Group,
  },
  {
    key: "incident-details",
    label: "Incident Details",
    Component: IncidentDetails,
  },
];

export default function AMR() {
  const navigate = useNavigate();
  const [active, setActive] = useState(TABS[0].key);

  // Date filter shared by every tab (year, month, from, to)
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [reportYears, setReportYears] = useState([]);
  const [reportDates, setReportDates] = useState([]); // every "YYYY-MM-DD" on record

  // Excel export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Build the Year + Month dropdowns from the dates that actually exist in the data
  useEffect(() => {
    axios
      .get(`${config.baseApi}/accident/get-all-section1`)
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        const years = new Set(
          rows
            .map((r) =>
              String(r.date_of_event ?? "")
                .slice(0, 10)
                .slice(0, 4),
            )
            .filter(Boolean),
        );
        setReportYears([...years].sort((a, b) => b.localeCompare(a)));
        setReportDates(rows.map((r) => toYMD(r.date_of_event)).filter(Boolean));
      })
      .catch(() => {
        setReportYears([]);
        setReportDates([]);
      });
  }, []);

  // Months that actually have reports (limited to the selected year, if any)
  const reportMonths = useMemo(() => {
    const set = new Set();
    reportDates.forEach((ymd) => {
      if (filters.year && ymd.slice(0, 4) !== String(filters.year)) return;
      set.add(ymd.slice(5, 7)); // "01" ... "12"
    });
    return [...set].sort();
  }, [reportDates, filters.year]);

  // Auto-dismiss the export error after a few seconds
  useEffect(() => {
    if (!exportError) return undefined;
    const t = setTimeout(() => setExportError(""), 5000);
    return () => clearTimeout(t);
  }, [exportError]);

  const handleExport = async () => {
    setExporting(true);
    setExportError("");
    try {
      await exportAmrExcel(filters);
    } catch (err) {
      console.error("AMR EXPORT FAILED:", err);
      setExportError(err?.message || "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="amr-shell">
      <style>{STYLE_SHEET}</style>

      {/* ─── TOP HEADER BAR (matches AddReport's sr-topbar-outer theme) ─── */}
      <div className="amr-topbar-outer">
        <div className="amr-topbar-brand">
          <div className="amr-topbar-brand-left">
            <button
              className="sr-btn-back-inline"
              onClick={() => navigate("/admin/AMR-Dashboard")}
            >
              Switch to dashboard
            </button>
            <div className="amr-topbar-divider" />
            <div>
              <span className="amr-topbar-title">
                Accident Monitoring Report Table
              </span>
              <span className="amr-topbar-sub">
                Eight views of the same Section 1 / 3 data, one register
              </span>
            </div>
          </div>

          {/* Shared date filter (Section 1 date reported) + Excel export */}
          <div className="amr-topbar-right">
            <DateFilterBar
              compact
              filters={filters}
              onChange={setFilters}
              years={reportYears}
              months={reportMonths}
            />
            <div className="amr-export">
              <button
                type="button"
                className="amr-export-btn"
                onClick={handleExport}
                disabled={exporting}
                title="Download the consolidated report (Jan–Dec) for the selected date filter"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {exporting ? "Preparing…" : "Download Excel"}
              </button>
              {exportError && (
                <span className="amr-export-error" role="alert">
                  {exportError}
                </span>
              )}
            </div>
          </div>
        </div>

        <nav
          className="amr-section-strip"
          role="tablist"
          aria-label="Report views"
        >
          <div className="amr-strip-track">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`amr-tab-${t.key}`}
                aria-selected={active === t.key}
                aria-controls={`amr-panel-${t.key}`}
                tabIndex={active === t.key ? 0 : -1}
                className={`amr-strip-item${active === t.key ? " amr-strip-item--active" : ""}`}
                onClick={() => setActive(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="amr-content">
        {TABS.map(({ key, Component }) => (
          <div
            key={key}
            id={`amr-panel-${key}`}
            role="tabpanel"
            aria-labelledby={`amr-tab-${key}`}
            hidden={active !== key}
            className="amr-panel"
          >
            <Component filters={filters} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET
   Top bar now mirrors AddReport.jsx's .sr-topbar-outer / .sr-section-strip
   treatment (dark navy bar, brand mark chip, pill-style nav row). The rest
   of the page keeps the original ink/paper palette.
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

.amr-shell * { box-sizing: border-box; }
.amr-shell {
  font-family: 'Inter', sans-serif;
  color: #0D1B2A;
  background: #F8F9FE;
  min-height: 100%;
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

.amr-brand-mark {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #1B8C60;
  color: #E8F4EF;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.02em;
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

/* ═══ DATE FILTER + EXPORT (right side of the top bar) ═══ */
.amr-topbar-right {
  display: flex;
  align-items: flex-end;   /* button lines up with the filter inputs row */
  flex-wrap: wrap;
  gap: 12px 16px;
}

.amr-export { position: relative; }

.amr-export-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  margin: 0;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background: #1B8C60;
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.14s, opacity 0.14s;
}
.amr-export-btn:hover:not(:disabled) { background: #167a53; }
.amr-export-btn:focus-visible { outline: 2px solid #E8F4EF; outline-offset: 2px; }
.amr-export-btn:disabled { opacity: 0.6; cursor: progress; }

.amr-export-error {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  padding: 5px 10px;
  border-radius: 6px;
  background: #FAE8E8;
  color: #7A1F1F;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(13,27,42,0.25);
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

.amr-strip-item {
  flex-shrink: 0;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 11px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: #4A6B84;
  white-space: nowrap;
  border-bottom: 2.5px solid transparent;
  transition: color 0.14s, border-color 0.14s;
}
.amr-strip-item:hover { color: #00b670; }
.amr-strip-item:focus-visible {
  outline: 2px solid #1B8C60;
  outline-offset: -2px;
  border-radius: 4px 4px 0 0;
}
.amr-strip-item--active {
  color: #E8F4EF;
  border-bottom-color: #1B8C60;
}

.amr-content {
  max-width: 1800px;
  margin: 0 auto;
background: #0000
  padding: 20px 20px 40px;
}

.amr-panel { animation: amr-fade-in 0.15s ease; }
@keyframes amr-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 640px) {
  .amr-topbar-brand { padding: 10px 16px; }
  .amr-section-strip { padding: 0 16px; }
  .amr-topbar-title { font-size: 16px; }
  .amr-content { padding: 12px 4px 32px; }
  .amr-topbar-right { width: 100%; }
  .amr-export { width: 100%; }
  .amr-export-btn { width: 100%; justify-content: center; }
  .amr-export-error { left: 0; right: auto; white-space: normal; }
}
  .sr-btn-back-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #167a53;
  border:1px solid rgb(0, 97, 29);
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.sr-btn-back-inline:hover { border:1px solid rgb(0, 97, 29); color: #fff; background: #14694a }
`;
