import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "config";
import { matchesDateFilter } from "./dateFilter";

/* ════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════ */

const parseSubtypes = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.map((s) => String(s).trim()).filter(Boolean);
  return raw
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const norm = (s) => (s || "").toString().toLowerCase();

/* ════════════════════════════════════════════════════════════════════════
   COLUMN DEFINITIONS
   ════════════════════════════════════════════════════════════════════════ */

const COUNT_COLUMNS = [
  {
    key: "ltaFatal",
    abbr: "LTA-F",
    label: "Lost Time Accident — Fatal",
    match: (v) => norm(v) === "injury-lta-f",
  },
  {
    key: "ltaNonFatal",
    abbr: "LTA-NF",
    label: "Lost Time Accident — Non-Fatal",
    match: (v) => norm(v) === "injury-lta-nf",
  },
  {
    key: "nlta",
    abbr: "NLTA",
    label: "Non-Lost Time Accident",
    match: (v) => norm(v) === "injury-nlta",
  },
  {
    key: "firstAid",
    abbr: "FAC",
    label: "First Aid Case",
    match: (v) => norm(v) === "injury-fac",
  },
  {
    key: "nearMiss",
    abbr: "NM",
    label: "High Potential Near Miss",
    match: (v) => norm(v) === "near miss",
  },
  {
    key: "illness",
    abbr: "OI",
    label: "Occupational Illness",
    match: (v) => norm(v) === "oi",
  },
  {
    key: "propertyDamage",
    abbr: "PD",
    label: "Property Damage",
    match: (v) => norm(v) === "property damage",
  },
];

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   `filters` comes from AMR: { year, dateFrom, dateTo } (Section 1 date_reported)
   ════════════════════════════════════════════════════════════════════════ */

export default function Shift({ filters }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState("desc"); // default: Newest First
  const PAGE_SIZE = 10;

  // Reset to page 1 whenever the search, date filter, or sort direction changes
  useEffect(() => {
    setPage(1);
  }, [search, filters, sortDir]);

  useEffect(() => {
    axios
      .get(`${config.baseApi}/accident/get-all-section1`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const flat = data.map((row) => {
          const shift = (row.shift || "").trim() || "Unspecified";
          const subtypes = parseSubtypes(row.accident_incident_subtype);
          const entry = { shift, date_of_event: row.date_of_event };
          COUNT_COLUMNS.forEach((c) => {
            entry[c.key] = subtypes.some(c.match);
          });
          return entry;
        });
        setEntries(flat);
      })
      .catch(() => setError("Failed to load report summary. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const q = search.toLowerCase().trim();
    const map = new Map();

    entries.forEach((e) => {
      // Skip reports outside the selected year / date range
      if (!matchesDateFilter(e.date_of_event, filters)) return;
      // Skip entries with no recorded shift
      if (e.shift === "Unspecified") return;

      if (!map.has(e.shift)) {
        const row = { shift: e.shift, total: 0, latest_date: null };
        COUNT_COLUMNS.forEach((c) => (row[c.key] = 0));
        map.set(e.shift, row);
      }
      const row = map.get(e.shift);
      row.total += 1;
      if (
        e.date_of_event &&
        (!row.latest_date || e.date_of_event > row.latest_date)
      ) {
        row.latest_date = e.date_of_event;
      }
      COUNT_COLUMNS.forEach((c) => {
        if (e[c.key]) row[c.key] += 1;
      });
    });

    let rows = [...map.values()];
    if (q) rows = rows.filter((r) => r.shift.toLowerCase().includes(q));

    rows.sort((a, b) => {
      const av = a.latest_date || "";
      const bv = b.latest_date || "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [entries, search, filters, sortDir]);

  // Totals always reflect the full (filtered) summary, not just the current page
  const totals = useMemo(() => {
    const t = { total: 0 };
    COUNT_COLUMNS.forEach((c) => (t[c.key] = 0));
    summary.forEach((row) => {
      t.total += row.total;
      COUNT_COLUMNS.forEach((c) => (t[c.key] += row[c.key]));
    });
    return t;
  }, [summary]);

  const totalPages = Math.max(1, Math.ceil(summary.length / PAGE_SIZE));
  const pagedSummary = summary.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="sh-shell">
      <style>{STYLE_SHEET}</style>

      <div className="sh-header">
        <div>
          <h1 className="sh-title">Shift of Incident</h1>
          <p className="sh-sub">
            Counted per Section 1 · Shift — {summary.length} shift
            {summary.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="sh-header-right">
          <div className="sh-sort-wrap">
            <span className="sh-sort-label">Sort by Latest Incident Date</span>
            <button
              className={`sh-sort-pill${sortDir ? " sh-sort-pill--active" : ""}`}
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            >
              {sortDir === "asc" ? "Oldest First" : "Newest First"}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{
                  marginLeft: 4,
                  flexShrink: 0,
                  transform: sortDir === "desc" ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s",
                }}
              >
                <path
                  d="M2 4l3-3 3 3M5 1v8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {!loading && !error && totalPages > 1 && (
            <div className="sh-pagination">
              <button
                className="sh-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 3L5 8l5 5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="sh-page-label">
                {page} / {totalPages}
              </span>
              <button
                className="sh-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="sh-search-wrap">
            <svg className="sh-search-icon" viewBox="0 0 16 16" fill="none">
              <circle
                cx="6.5"
                cy="6.5"
                r="4.5"
                stroke="#5E7A6E"
                strokeWidth="1.4"
              />
              <line
                x1="10"
                y1="10"
                x2="14"
                y2="14"
                stroke="#5E7A6E"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <input
              className="sh-search-input"
              placeholder="Search shift…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="sh-panel">
        {loading ? (
          <div className="sh-empty">Loading report summary…</div>
        ) : error ? (
          <div className="sh-empty sh-empty--error">{error}</div>
        ) : summary.length === 0 ? (
          <div className="sh-empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              No records found
            </div>
            <div style={{ fontSize: 12 }}>
              {entries.length === 0
                ? "There are no reports yet."
                : "Try a different search or date range."}
            </div>
          </div>
        ) : (
          <div className="sh-scroll-area">
            <table className="sh-table">
              <thead>
                <tr>
                  <th className="sh-th sh-th-sticky">Shift</th>
                  {COUNT_COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={`sh-th sh-th-num sh-col-${c.key}`}
                      title={c.label}
                    >
                      {c.abbr}
                    </th>
                  ))}
                  <th className="sh-th sh-th-num sh-th-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {pagedSummary.map((row) => (
                  <tr className="sh-tr" key={row.shift}>
                    <td className="sh-td sh-td-sticky">
                      <span className="sh-truncate">{row.shift}</span>
                    </td>
                    {COUNT_COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className={`sh-td sh-td-num sh-col-${c.key}`}
                      >
                        {row[c.key] > 0 ? (
                          row[c.key]
                        ) : (
                          <span className="sh-zero">0</span>
                        )}
                      </td>
                    ))}
                    <td className="sh-td sh-td-num sh-td-total">{row.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="sh-tr sh-tr-footer">
                  <td className="sh-td sh-td-sticky sh-td-footer">
                    All Shifts
                  </td>
                  {COUNT_COLUMNS.map((c) => (
                    <td key={c.key} className="sh-td sh-td-num sh-td-footer">
                      {totals[c.key]}
                    </td>
                  ))}
                  <td className="sh-td sh-td-num sh-td-total sh-td-footer">
                    {totals.total}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && summary.length > 0 && (
        <div className="sh-legend">
          {COUNT_COLUMNS.map((c) => (
            <span className="sh-legend-item" key={c.key}>
              <span className={`sh-legend-abbr sh-col-${c.key}`}>{c.abbr}</span>
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

.sh-shell * { box-sizing: border-box; }
.sh-shell {
  font-family: 'Inter', sans-serif;
  color: #0D1B2A;
  padding: 28px 32px 60px;
  min-height: 100vh;
  background: #F8F9FE;
}

.sh-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 2px solid #C8D8D1;
  flex-wrap: wrap;
  gap: 14px;
}
.sh-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 28px;
  margin: 0;
  letter-spacing: 0.01em;
}
.sh-sub {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #1B5E44;
  letter-spacing: 0.04em;
  margin: 4px 0 0;
}

.sh-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* ── Sort pill ── */
.sh-sort-wrap { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.sh-sort-label { font-size: 11.5px; font-weight: 600; color: #5E7A6E; white-space: nowrap; }
.sh-sort-pill {
  display: inline-flex; align-items: center;
  padding: 5px 12px;
  border: 1.5px solid #9DBCB0; border-radius: 999px;
  background: #fff; color: #1B5E44;
  font-size: 11.5px; font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: background 0.13s, border-color 0.13s, color 0.13s;
  white-space: nowrap;
}
.sh-sort-pill:hover { background: #D4EDE5; border-color: #1B5E44; }
.sh-sort-pill--active { background: #1B5E44; border-color: #1B5E44; color: #fff; font-weight: 600; }
.sh-sort-pill--active:hover { background: #164A36; }

.sh-search-wrap { position: relative; }
.sh-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  pointer-events: none;
}
.sh-search-input {
  padding: 8px 10px 8px 32px;
  border: 1.5px solid #9DBCB0;
  border-radius: 7px;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  background: #fff;
  color: #0D1B2A;
  width: 260px;
  outline: none;
  height: 36px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sh-search-input:focus {
  border-color: #1B5E44;
  box-shadow: 0 0 0 3px rgba(27,94,68,0.12);
}

.sh-pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sh-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1.5px solid #9DBCB0;
  border-radius: 6px;
  background: #fff;
  color: #1B5E44;
  cursor: pointer;
  padding: 0;
  transition: background 0.13s, border-color 0.13s;
}
.sh-page-btn:hover:not(:disabled) {
  background: #D4EDE5;
  border-color: #1B5E44;
}
.sh-page-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.sh-page-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #5E7A6E;
  padding: 0 4px;
  min-width: 44px;
  text-align: center;
}

.sh-panel {
  background: #fff;
  border: 1px solid #C8D8D1;
  border-radius: 8px;
  overflow: hidden;
}

.sh-scroll-area { overflow-x: auto; }

.sh-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 820px; }

.sh-th {
  padding: 10px 12px;
  text-align: right;
  font-size: 10px;
  font-weight: 700;
  color: #5E7A6E;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #F8FAF9;
  border-bottom: 2px solid #C8D8D1;
  white-space: normal;
  line-height: 1.3;
  vertical-align: bottom;
}
.sh-th-sticky {
  position: sticky;
  left: 0;
  z-index: 2;
  text-align: left;
  min-width: 200px;
  background: #F8FAF9;
}
.sh-th-num { min-width: 68px; }
.sh-th-total { color: #0F3D2B; }

.sh-td {
  padding: 10px 12px;
  font-size: 12.5px;
  border-bottom: 1px solid #C8D8D1;
  vertical-align: middle;
  white-space: nowrap;
  background: #fff;
}
.sh-td-num { text-align: right; font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
.sh-td-sticky {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
  font-weight: 600;
  min-width: 200px;
}
.sh-td-total { color: #0F3D2B; }

.sh-tr:hover .sh-td { background: #D4EDE5; }
.sh-tr:last-child .sh-td { border-bottom: none; }

.sh-tr-footer .sh-td {
  background: #F0F4F2;
  border-top: 2px solid #C8D8D1;
  border-bottom: none;
  font-weight: 700;
}
.sh-td-footer { background: #F0F4F2; }

.sh-truncate {
  display: block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sh-zero { color: #B7C4BE; }

.sh-empty {
  padding: 60px 20px;
  text-align: center;
  color: #5E7A6E;
  font-size: 13px;
}
.sh-empty--error { color: #7A1F1F; }

.sh-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #C8D8D1;
}
.sh-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #2C4A3E;
}
.sh-legend-abbr {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: #F0F4F2;
  color: #1B5E44;
}

/* Per-column colors */
.sh-td-num.sh-col-ltaFatal { color: #C0392B; } /* red */
.sh-td-num.sh-col-ltaNonFatal { color: #D4711F; } /* orange */
.sh-td-num.sh-col-nlta { color: #B7891A; } /* amber */
.sh-td-num.sh-col-firstAid { color: #2F8F5B; } /* green */
.sh-td-num.sh-col-nearMiss { color: #1E88A8; } /* teal/blue */
.sh-td-num.sh-col-illness { color: #7B4FA3; } /* purple */
.sh-td-num.sh-col-propertyDamage { color: #5B7290; } /* slate */

.sh-td-num .sh-zero { color: #C3CEDD !important; }

.sh-th-num.sh-col-ltaFatal { color: #C0392B; }
.sh-th-num.sh-col-ltaNonFatal { color: #D4711F; }
.sh-th-num.sh-col-nlta { color: #B7891A; }
.sh-th-num.sh-col-firstAid { color: #2F8F5B; }
.sh-th-num.sh-col-nearMiss { color: #1E88A8; }
.sh-th-num.sh-col-illness { color: #7B4FA3; }
.sh-th-num.sh-col-propertyDamage { color: #5B7290; }

.sh-legend-abbr.sh-col-ltaFatal { background: #FBE6E3; color: #C0392B; }
.sh-legend-abbr.sh-col-ltaNonFatal { background: #FBEBDD; color: #D4711F; }
.sh-legend-abbr.sh-col-nlta { background: #FAF0D6; color: #B7891A; }
.sh-legend-abbr.sh-col-firstAid { background: #E1F3E8; color: #2F8F5B; }
.sh-legend-abbr.sh-col-nearMiss { background: #DFF0F5; color: #1E88A8; }
.sh-legend-abbr.sh-col-illness { background: #EEE4F5; color: #7B4FA3; }
.sh-legend-abbr.sh-col-propertyDamage { background: #E9EDF3; color: #5B7290; }

@media (max-width: 640px) {
  .sh-shell { padding: 18px 14px 40px; }
  .sh-header { flex-direction: column; align-items: flex-start; }
  .sh-title { font-size: 22px; }
  .sh-header-right { width: 100%; flex-direction: column; align-items: flex-start; }
  .sh-sort-wrap { width: 100%; }
  .sh-search-wrap { flex: 1; width: 100%; }
  .sh-search-input { width: 100%; }
}
`;
