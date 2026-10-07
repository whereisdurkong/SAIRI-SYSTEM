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

const clean = (s) => (s || "").toString().trim();

/* ════════════════════════════════════════════════════════════════════════
   COLUMN DEFINITIONS
   ════════════════════════════════════════════════════════════════════════ */

const COUNT_COLUMNS = [
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

export default function Group({ filters }) {
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
          const g = clean(row.group);
          const d = clean(row.department);
          const s = clean(row.section);
          const label = `${g} — ${d} — ${s}`;
          const subtypes = parseSubtypes(row.accident_incident_subtype);
          const entry = {
            key: label,
            group: g,
            department: d,
            section: s,
            date_of_event: row.date_of_event,
          };
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
      // Skip entries with no group, department, or section on record at all
      if (!e.group && !e.department && !e.section) return;

      if (!map.has(e.key)) {
        const row = {
          key: e.key,
          group: e.group,
          department: e.department,
          section: e.section,
          total: 0,
          latest_date: null,
        };
        COUNT_COLUMNS.forEach((c) => (row[c.key] = 0));
        map.set(e.key, row);
      }
      const row = map.get(e.key);
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
    if (q) rows = rows.filter((r) => r.key.toLowerCase().includes(q));

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
    <div className="gr-shell">
      <style>{STYLE_SHEET}</style>

      <div className="gr-header">
        <div>
          <h1 className="gr-title">Group / Dept. / Section or Contractor</h1>
          <p className="gr-sub">
            Counted per Section 1 · Group — Department — Section —{" "}
            {summary.length} combination{summary.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="gr-header-right">
          <div className="gr-sort-wrap">
            <span className="gr-sort-label">Sort by Latest Incident Date</span>
            <button
              className={`gr-sort-pill${sortDir ? " gr-sort-pill--active" : ""}`}
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
            <div className="gr-pagination">
              <button
                className="gr-page-btn"
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
              <span className="gr-page-label">
                {page} / {totalPages}
              </span>
              <button
                className="gr-page-btn"
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
          <div className="gr-search-wrap">
            <svg className="gr-search-icon" viewBox="0 0 16 16" fill="none">
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
              className="gr-search-input"
              placeholder="Search group, department, section…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="gr-panel">
        {loading ? (
          <div className="gr-empty">Loading report summary…</div>
        ) : error ? (
          <div className="gr-empty gr-empty--error">{error}</div>
        ) : summary.length === 0 ? (
          <div className="gr-empty">
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
          <div className="gr-scroll-area">
            <table className="gr-table">
              <thead>
                <tr>
                  <th className="gr-th gr-th-sticky">
                    Group — Department — Section
                  </th>
                  {COUNT_COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={`gr-th gr-th-num gr-col-${c.key}`}
                      title={c.label}
                    >
                      {c.abbr}
                    </th>
                  ))}
                  <th className="gr-th gr-th-num gr-th-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {pagedSummary.map((row) => (
                  <tr className="gr-tr" key={row.key}>
                    <td className="gr-td gr-td-sticky">
                      <span className="gr-truncate" title={row.key}>
                        {row.group}
                        <span className="gr-sep">—</span>
                        {row.department}
                        <span className="gr-sep">—</span>
                        {row.section}
                      </span>
                    </td>
                    {COUNT_COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className={`gr-td gr-td-num gr-col-${c.key}`}
                      >
                        {row[c.key] > 0 ? (
                          row[c.key]
                        ) : (
                          <span className="gr-zero">0</span>
                        )}
                      </td>
                    ))}
                    <td className="gr-td gr-td-num gr-td-total">{row.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="gr-tr gr-tr-footer">
                  <td className="gr-td gr-td-sticky gr-td-footer">
                    All Groups
                  </td>
                  {COUNT_COLUMNS.map((c) => (
                    <td key={c.key} className="gr-td gr-td-num gr-td-footer">
                      {totals[c.key]}
                    </td>
                  ))}
                  <td className="gr-td gr-td-num gr-td-total gr-td-footer">
                    {totals.total}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && summary.length > 0 && (
        <div className="gr-legend">
          {COUNT_COLUMNS.map((c) => (
            <span className="gr-legend-item" key={c.key}>
              <span className={`gr-legend-abbr gr-col-${c.key}`}>{c.abbr}</span>
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

.gr-shell,
.gr-shell * { box-sizing: border-box; }
.gr-shell {
  font-family: 'Inter', sans-serif;
  color: #0B1F3A;
  padding: 32px 36px 60px;
  min-height: 100vh;
  background: linear-gradient(160deg, #F0F4FA 0%, #F6F8FC 40%, #FAFBFD 100%);
}

.gr-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
  padding-bottom: 18px;
  position: relative;
  flex-wrap: wrap;
  gap: 14px;
}
.gr-header::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, #14487A 0%, #1E88A8 45%, #2FB68C 75%, transparent 100%);
  border-radius: 3px;
}
.gr-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 32px;
  margin: 0;
  letter-spacing: 0.01em;
  background: linear-gradient(90deg, #0B1F3A, #14487A 60%, #1E88A8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.gr-sub {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #14487A;
  letter-spacing: 0.04em;
  margin: 6px 0 0;
  opacity: 0.85;
}

.gr-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* ── Sort pill ── */
.gr-sort-wrap { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.gr-sort-label { font-size: 11.5px; font-weight: 600; color: #5B7290; white-space: nowrap; }
.gr-sort-pill {
  display: inline-flex; align-items: center;
  padding: 5px 12px;
  border: 1.5px solid #C9D6E8; border-radius: 999px;
  background: #fff; color: #2C4A6E;
  font-size: 11.5px; font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(11,31,58,0.05);
  transition: background 0.13s, border-color 0.13s, color 0.13s;
  white-space: nowrap;
}
.gr-sort-pill:hover { background: #E9F1FB; border-color: #1E88A8; }
.gr-sort-pill--active { background: #14487A; border-color: #14487A; color: #fff; font-weight: 600; }
.gr-sort-pill--active:hover { background: #0F3560; }

.gr-search-wrap { position: relative; }
.gr-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  pointer-events: none;
}
.gr-search-input {
  padding: 9px 12px 9px 34px;
  border: 1.5px solid #C9D6E8;
  border-radius: 9px;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  background: #fff;
  color: #0B1F3A;
  width: 280px;
  outline: none;
  height: 38px;
  box-shadow: 0 1px 2px rgba(11,31,58,0.05);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.gr-search-input:focus {
  border-color: #1E88A8;
  box-shadow: 0 0 0 4px rgba(30,136,168,0.15);
}

.gr-pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff;
  border: 1.5px solid #C9D6E8;
  border-radius: 9px;
  padding: 4px;
  box-shadow: 0 1px 2px rgba(11,31,58,0.05);
}
.gr-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #14487A;
  cursor: pointer;
  padding: 0;
  transition: background 0.13s, color 0.13s;
}
.gr-page-btn:hover:not(:disabled) {
  background: #14487A;
  color: #fff;
}
.gr-page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.gr-page-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #5B7290;
  padding: 0 6px;
  min-width: 44px;
  text-align: center;
}

.gr-panel {
  background: #fff;
  border: 1px solid #DCE4F0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(11,31,58,0.07), 0 1px 3px rgba(11,31,58,0.04);
}

.gr-scroll-area { overflow-x: auto; }

.gr-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 860px; }

.gr-th {
  padding: 13px 14px;
  text-align: right;
  font-size: 10px;
  font-weight: 700;
  color: #5B7290;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: linear-gradient(180deg, #F5F8FC, #EDF2F9);
  border-bottom: 2px solid #DCE4F0;
  white-space: normal;
  line-height: 1.3;
  vertical-align: bottom;
}
.gr-th-sticky {
  position: sticky;
  left: 0;
  z-index: 2;
  text-align: left;
  min-width: 300px;
  background: linear-gradient(180deg, #F5F8FC, #EDF2F9);
}
.gr-th-num { min-width: 68px; }
.gr-th-total { color: #0B1F3A; }

.gr-td {
  padding: 12px 14px;
  font-size: 12.5px;
  border-bottom: 1px solid #EEF2F8;
  vertical-align: middle;
  white-space: nowrap;
  background: #fff;
  transition: background 0.12s;
}
.gr-td-num { text-align: right; font-family: 'IBM Plex Mono', monospace; font-weight: 600; color: #2C4A6E; }
.gr-td-sticky {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
  font-weight: 600;
  min-width: 300px;
}
.gr-td-total {
  color: #0B1F3A;
  font-weight: 700;
}

.gr-sep {
  color: #9FB3CC;
  margin: 0 5px;
  font-weight: 400;
}

.gr-tr:nth-child(even) .gr-td { background: #FAFBFE; }
.gr-tr:nth-child(even) .gr-td-sticky { background: #FAFBFE; }
.gr-tr:hover .gr-td { background: #E9F1FB; }
.gr-tr:hover .gr-td-sticky { background: #E9F1FB; }
.gr-tr:last-child .gr-td { border-bottom: none; }

.gr-tr-footer .gr-td {
  background: linear-gradient(180deg, #EDF2F9, #E3EAF5);
  border-top: 2px solid #C9D6E8;
  border-bottom: none;
  font-weight: 700;
}
.gr-td-footer { background: linear-gradient(180deg, #EDF2F9, #E3EAF5); }

.gr-truncate {
  display: block;
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gr-zero { color: #C3CEDD; }

.gr-empty {
  padding: 70px 20px;
  text-align: center;
  color: #5B7290;
  font-size: 13px;
}
.gr-empty--error { color: #C0392B; }

.gr-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  margin-top: 18px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #DCE4F0;
  border-radius: 12px;
}
.gr-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #2C4A6E;
}
.gr-legend-abbr {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  background: #E9F1FB;
  color: #14487A;
}

@media (max-width: 640px) {
  .gr-shell { padding: 20px 14px 40px; }
  .gr-header { flex-direction: column; align-items: flex-start; }
  .gr-title { font-size: 24px; }
  .gr-header-right { width: 100%; flex-direction: column; align-items: flex-start; }
  .gr-sort-wrap { width: 100%; }
  .gr-search-wrap { flex: 1; width: 100%; }
  .gr-search-input { width: 100%; }
}

/* Per-column colors */
.gr-td-num.gr-col-ltaNonFatal { color: #D4711F; } /* orange */
.gr-td-num.gr-col-nlta { color: #B7891A; } /* amber */
.gr-td-num.gr-col-firstAid { color: #2F8F5B; } /* green */
.gr-td-num.gr-col-nearMiss { color: #1E88A8; } /* teal/blue */
.gr-td-num.gr-col-illness { color: #7B4FA3; } /* purple */
.gr-td-num.gr-col-propertyDamage { color: #5B7290; } /* slate */

.gr-td-num .gr-zero { color: #C3CEDD !important; }

.gr-th-num.gr-col-ltaNonFatal { color: #D4711F; }
.gr-th-num.gr-col-nlta { color: #B7891A; }
.gr-th-num.gr-col-firstAid { color: #2F8F5B; }
.gr-th-num.gr-col-nearMiss { color: #1E88A8; }
.gr-th-num.gr-col-illness { color: #7B4FA3; }
.gr-th-num.gr-col-propertyDamage { color: #5B7290; }

.gr-legend-abbr.gr-col-ltaNonFatal { background: #FBEBDD; color: #D4711F; }
.gr-legend-abbr.gr-col-nlta { background: #FAF0D6; color: #B7891A; }
.gr-legend-abbr.gr-col-firstAid { background: #E1F3E8; color: #2F8F5B; }
.gr-legend-abbr.gr-col-nearMiss { background: #DFF0F5; color: #1E88A8; }
.gr-legend-abbr.gr-col-illness { background: #EEE4F5; color: #7B4FA3; }
.gr-legend-abbr.gr-col-propertyDamage { background: #E9EDF3; color: #5B7290; }
`;
