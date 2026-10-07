import { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import config from "config";

/* ════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════ */

const parseSubtypes = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const parseNatureOfInjury = (raw) => {
  if (!raw) return [];
  const delimiter = raw.includes("|") ? "|" : ",";
  return raw
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatTime = (timeString) => {
  if (!timeString) return "—";
  const str = String(timeString).trim();
  const plainMatch = str.match(/^(\d{2}):(\d{2})/);
  let hh, mm;
  if (plainMatch && !str.includes("T")) {
    hh = plainMatch[1];
    mm = plainMatch[2];
  } else {
    const isoMatch =
      str.match(/T(\d{2}):(\d{2})/) || str.match(/\s(\d{2}):(\d{2})/);
    if (isoMatch) {
      hh = isoMatch[1];
      mm = isoMatch[2];
    } else {
      const d = new Date(str);
      if (isNaN(d.getTime())) return "—";
      hh = String(d.getHours()).padStart(2, "0");
      mm = String(d.getMinutes()).padStart(2, "0");
    }
  }
  const h = parseInt(hh, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${period}`;
};

const joinList = (arr) => (arr && arr.length > 0 ? arr.join(", ") : "—");

// Returns true when any subtype in the list matches "property damage"
const isPropertyDamage = (subtypes) =>
  subtypes.some((s) => s.toLowerCase() === "property damage");

/* ════════════════════════════════════════════════════════════════════════
   FIELD DEFINITIONS
   ════════════════════════════════════════════════════════════════════════ */

const FIELD_DEFS = [
  { key: "accident_id", label: "SAIRI Reference No.", sticky: 1 },
  {
    key: "employee_name",
    label: "Name of Person Injured / Damaged Property",
    sticky: 2,
  },
  { key: "chapa_number", label: "CN / Unit #" },
  { key: "job_designation", label: "Occupation / Designation" },
  { key: "subtypes", label: "Type of Incident", isList: true, tag: "default" },
  { key: "specific_location", label: "Work Place / Area" },
  { key: "level", label: "Level" },
  { key: "date_reported", label: "Date", isDate: true },
  { key: "time_reported", label: "Time", isTime: true },
  { key: "shift", label: "Shift" },
  { key: "department_head", label: "Dept Head" },
  { key: "section_head", label: "Section Head" },
  { key: "supervisor_reported_to", label: "Immediate Supervisor" },
  {
    key: "nature_of_injury",
    label: "Nature of Injury",
    isList: true,
    tag: "injury",
  },
  { key: "ongoing_activity", label: "On-going Activity" },
  { key: "safety_inspector_on_duty", label: "Safety Inspector on Duty" },
  { key: "group", label: "Group", badge: true },
  { key: "department", label: "Department", badge: true },
  { key: "section", label: "Section" },
  { key: "prepared_by", label: "Recorded By" },
];

const NUMBER_COL_WIDTH = 54;
const STICKY_COL_WIDTH = { 0: NUMBER_COL_WIDTH, 1: 150, 2: 210 };
const STICKY_COL_LEFT = {
  0: 0,
  1: NUMBER_COL_WIDTH,
  2: NUMBER_COL_WIDTH + STICKY_COL_WIDTH[1],
};

const fieldDisplayValue = (row, def) => {
  const raw = row[def.key];
  if (def.isDate) return formatDate(raw);
  if (def.isTime) return formatTime(raw);
  if (def.isList) return joinList(raw);
  return raw || "—";
};

/* ════════════════════════════════════════════════════════════════════════
   ROW DETAIL DRAWER
   ════════════════════════════════════════════════════════════════════════ */

function RowDrawer({ row, onClose }) {
  const isOpen = !!row;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`pd-drawer-backdrop${isOpen ? " pd-drawer-backdrop--open" : ""}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside
        className={`pd-drawer${isOpen ? " pd-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Property damage record detail"
      >
        {row && (
          <>
            <div className="pd-drawer-header">
              <div>
                <div className="pd-drawer-eyebrow">Property Damage Record</div>
                <div className="pd-drawer-acid">{row.accident_id}</div>
              </div>
              <button
                className="pd-drawer-close"
                onClick={onClose}
                aria-label="Close detail panel"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="pd-drawer-body">
              {FIELD_DEFS.map((def) => {
                const value = fieldDisplayValue(row, def);
                const listValue = def.isList ? row[def.key] : null;
                return (
                  <div className="pd-kv" key={def.key}>
                    <div className="pd-kv-label">{def.label}</div>
                    {listValue && listValue.length > 0 ? (
                      <div className="pd-tag-row pd-tag-row--drawer">
                        {listValue.map((v, i) => (
                          <span
                            className={`pd-tag${def.tag === "injury" ? " pd-tag--injury" : ""}`}
                            key={i}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    ) : def.badge && value !== "—" ? (
                      <span className="pd-dept-badge">{value}</span>
                    ) : (
                      <div className="pd-kv-value">{value}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */

const PAGE_SIZE = 10;

export default function PropertyDamage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [page, setPage] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchAllReports = async () => {
      try {
        setLoading(true);
        setError(null);

        const reportRes = await axios.get(
          `${config.baseApi}/accident/get-all-report`,
        );

        const withSections = await Promise.all(
          reportRes.data.map(async (report) => {
            try {
              const [section1Res, section3Res] = await Promise.all([
                axios.get(`${config.baseApi}/accident/get-section1-by-id`, {
                  params: { accident_id: report.accident_id },
                }),
                axios
                  .get(`${config.baseApi}/accident/get-section3-by-id`, {
                    params: { accident_id: report.accident_id },
                  })
                  .catch(() => ({ data: null })),
              ]);
              return {
                accident_id: report.accident_id,
                section1: section1Res.data,
                section3: section3Res.data,
              };
            } catch {
              return {
                accident_id: report.accident_id,
                section1: [],
                section3: null,
              };
            }
          }),
        );

        const flat = [];
        withSections.forEach(({ accident_id, section1, section3 }) => {
          if (!Array.isArray(section1)) return;
          section1.forEach((s1) => {
            const subtypes = parseSubtypes(
              s1.accident_incident_subtype || s1.subtype || "",
            );

            // Only include rows where one of the subtypes is "Property Damage"
            if (!isPropertyDamage(subtypes)) return;

            flat.push({
              accident_id,
              employee_name: s1.name || "—",
              chapa_number: s1.chapa_number || "—",
              job_designation: s1.job_designation || "—",
              subtypes,
              specific_location: s1.specific_location || "—",
              level: s1.level || "—",
              date_reported: s1.date_reported || null,
              time_reported: s1.time_reported || null,
              shift: s1.shift || "—",
              department_head: s1.department_head || "—",
              section_head: s1.section_head || "—",
              supervisor_reported_to: s1.supervisor_reported_to || "—",
              nature_of_injury: parseNatureOfInjury(
                section3?.nature_of_injury || "",
              ),
              ongoing_activity: s1.ongoing_activity || "—",
              safety_inspector_on_duty: s1.safety_inspector_on_duty || "—",
              group: s1.group || "",
              department: s1.department || "",
              section: s1.section || "—",
              prepared_by: s1.prepared_by || "—",
            });
          });
        });

        setRows(flat);
      } catch (err) {
        console.log("UNABLE TO FETCH REPORTS:", err);
        setError("Failed to load reports. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllReports();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.accident_id?.toLowerCase().includes(q) ||
        r.employee_name?.toLowerCase().includes(q) ||
        r.chapa_number?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.group?.toLowerCase().includes(q) ||
        r.section?.toLowerCase().includes(q) ||
        r.prepared_by?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setIsScrolled(scrollRef.current.scrollLeft > 0);
  };

  return (
    <div className="pd-shell">
      <style>{STYLE_SHEET}</style>

      <div className="pd-header">
        <div>
          <h1 className="pd-title">Property Damage Register</h1>
          <p className="pd-sub">
            {filteredRows.length} record{filteredRows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="pd-search-wrap">
          <svg className="pd-search-icon" viewBox="0 0 16 16" fill="none">
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
            className="pd-search-input"
            placeholder="Search by name, ID, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!loading && !error && filteredRows.length > 0 && (
        <div className="pd-scroll-hint">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8h12M2 8l3-3M2 8l3 3M14 8l-3-3M14 8l-3 3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Swipe to see more columns (No. and Name stay pinned) · Tap a row for
          full details
        </div>
      )}

      <div className="pd-panel">
        {loading ? (
          <div className="pd-empty">Loading reports…</div>
        ) : error ? (
          <div className="pd-empty pd-empty--error">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="pd-empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              No property damage records found
            </div>
            <div style={{ fontSize: 12 }}>
              {rows.length === 0
                ? "There are no property damage reports yet."
                : "Try a different search."}
            </div>
          </div>
        ) : (
          <div
            className={`pd-scroll-area${isScrolled ? " pd-scroll-area--scrolled" : ""}`}
            ref={scrollRef}
            onScroll={handleScroll}
          >
            <table className="pd-table">
              <thead>
                <tr>
                  <th
                    className="pd-th pd-th-sticky"
                    style={{
                      left: STICKY_COL_LEFT[0],
                      width: STICKY_COL_WIDTH[0],
                      minWidth: STICKY_COL_WIDTH[0],
                    }}
                  >
                    No.
                  </th>
                  {FIELD_DEFS.map((def) => (
                    <th
                      key={def.key}
                      className={`pd-th${def.sticky ? " pd-th-sticky" : ""}${def.sticky === 2 ? " pd-sticky-shadow" : ""}`}
                      style={
                        def.sticky
                          ? {
                              left: STICKY_COL_LEFT[def.sticky],
                              width: STICKY_COL_WIDTH[def.sticky],
                              minWidth: STICKY_COL_WIDTH[def.sticky],
                            }
                          : undefined
                      }
                    >
                      {def.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r, idx) => (
                  <tr
                    className="pd-tr"
                    key={`${r.accident_id}-${idx}`}
                    onClick={() => setExpandedRow(r)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View full details for ${r.accident_id}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedRow(r);
                      }
                    }}
                  >
                    <td
                      className="pd-td pd-td-sticky"
                      data-label="No."
                      style={{
                        left: STICKY_COL_LEFT[0],
                        width: STICKY_COL_WIDTH[0],
                        minWidth: STICKY_COL_WIDTH[0],
                      }}
                    >
                      <span className="pd-row-no">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </span>
                    </td>
                    {FIELD_DEFS.map((def) => {
                      const isList = def.isList;
                      const listValue = isList ? r[def.key] : null;
                      const displayValue = fieldDisplayValue(r, def);

                      return (
                        <td
                          key={def.key}
                          className={`pd-td${def.sticky ? " pd-td-sticky" : ""}${def.sticky === 2 ? " pd-sticky-shadow" : ""}${def.isDate || def.isTime || def.key === "prepared_by" ? " pd-ts" : ""}`}
                          data-label={def.label}
                          title={
                            !isList && !def.badge ? displayValue : undefined
                          }
                          style={
                            def.sticky
                              ? {
                                  left: STICKY_COL_LEFT[def.sticky],
                                  width: STICKY_COL_WIDTH[def.sticky],
                                  minWidth: STICKY_COL_WIDTH[def.sticky],
                                }
                              : undefined
                          }
                        >
                          {isList ? (
                            listValue.length > 0 ? (
                              <div
                                className="pd-tag-row"
                                title={joinList(listValue)}
                              >
                                {listValue.map((v, i) => (
                                  <span
                                    className={`pd-tag${def.tag === "injury" ? " pd-tag--injury" : ""}`}
                                    key={i}
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )
                          ) : def.badge ? (
                            <span className="pd-dept-badge">
                              {displayValue}
                            </span>
                          ) : def.sticky ? (
                            <span
                              className={`pd-truncate${def.sticky === 1 ? " pd-acid" : " pd-truncate--name"}`}
                              style={{
                                maxWidth: STICKY_COL_WIDTH[def.sticky] - 28,
                              }}
                            >
                              {displayValue}
                            </span>
                          ) : (
                            <span
                              className={`pd-truncate${def.key === "employee_name" ? " pd-truncate--name" : ""}`}
                            >
                              {displayValue}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="pd-pagination-bar">
          <button
            className="pd-page-btn"
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
          <span className="pd-page-label">
            {page} / {totalPages}
          </span>
          <button
            className="pd-page-btn"
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

      <RowDrawer row={expandedRow} onClose={() => setExpandedRow(null)} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

.pd-shell * { box-sizing: border-box; }
.pd-shell {
  font-family: 'Inter', sans-serif;
  color: #0D1B2A;
  padding: 28px 32px 40px;
  min-height: 100vh;
  background: #F8F9FE;
}

.pd-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #C8D8D1;
  flex-wrap: wrap;
  gap: 14px;
}
.pd-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 30px;
  margin: 0;
  letter-spacing: 0.01em;
}
.pd-sub {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #1B5E44;
  letter-spacing: 0.1em;
  margin: 2px 0 0;
}

.pd-search-wrap { position: relative; }
.pd-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  pointer-events: none;
}
.pd-search-input {
  padding: 8px 10px 8px 32px;
  border: 1.5px solid #9DBCB0;
  border-radius: 7px;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  background: #fff;
  color: #0D1B2A;
  width: 300px;
  outline: none;
  height: 36px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.pd-search-input:focus {
  border-color: #1B5E44;
  box-shadow: 0 0 0 3px rgba(27,94,68,0.12);
}

.pd-panel {
  background: transparent;
  border: none;
  overflow: visible;
}

.pd-scroll-area {
  overflow: auto;
  position: relative;
  border: 1px solid #C8D8D1;
  border-radius: 8px;
  background: #fff;
}

.pd-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1900px; }

.pd-th {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 10px 14px;
  text-align: left;
  font-size: 10.5px;
  font-weight: 700;
  color: #5E7A6E;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #F0F4F2;
  border-bottom: 2px solid #C8D8D1;
  white-space: nowrap;
}
.pd-td {
  padding: 10px 14px;
  font-size: 12.5px;
  border-bottom: 1px solid #EEF3F1;
  vertical-align: middle;
  white-space: nowrap;
  background: transparent;
}
.pd-tr { cursor: pointer; }
.pd-tr:hover .pd-td { background: #D4EDE5; }
.pd-tr:last-child .pd-td { border-bottom: none; }
.pd-tr:focus-visible { outline: 2px solid #1B5E44; outline-offset: -2px; }

.pd-th-sticky,
.pd-td-sticky {
  position: sticky;
  z-index: 1;
}
.pd-th-sticky { z-index: 3; }
.pd-td-sticky { background: #fff; }
.pd-tr:hover .pd-td-sticky { background: #D4EDE5; }

.pd-th.pd-sticky-shadow,
.pd-td.pd-sticky-shadow {
  box-shadow: none;
  transition: box-shadow 0.15s ease;
}
.pd-scroll-area--scrolled .pd-th.pd-sticky-shadow,
.pd-scroll-area--scrolled .pd-td.pd-sticky-shadow {
  box-shadow: 6px 0 10px -6px rgba(13, 27, 42, 0.28);
}

.pd-acid {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #1B8C60;
}
.pd-ts { color: #5E7A6E; }

.pd-truncate {
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pd-truncate--name { max-width: 220px; font-weight: 500; }

.pd-dept-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #D4EDE5;
  color: #0F3D2B;
  white-space: nowrap;
}

.pd-tag-row { display: flex; flex-wrap: wrap; gap: 3px; white-space: normal; max-width: 220px; }
.pd-tag-row--drawer { max-width: none; }
.pd-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: #F0F4F2;
  color: #2C4A3E;
  white-space: nowrap;
}
.pd-tag--injury { background: #FAE8E8; color: #7A1F1F; }

.pd-empty {
  padding: 60px 20px;
  text-align: center;
  color: #5E7A6E;
  font-size: 13px;
}
.pd-empty--error { color: #7A1F1F; }

.pd-scroll-hint {
  display: none;
  align-items: center;
  gap: 6px;
  color: #5E7A6E;
  font-size: 11.5px;
  font-weight: 500;
  margin-bottom: 8px;
}

.pd-row-no {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #5E7A6E;
}

/* ─── Global pagination bar ─── */
.pd-pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
.pd-page-btn {
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
.pd-page-btn:hover:not(:disabled) {
  background: #D4EDE5;
  border-color: #1B5E44;
}
.pd-page-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.pd-page-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #5E7A6E;
  padding: 0 4px;
  min-width: 44px;
  text-align: center;
}

/* ════ DRAWER ════ */

.pd-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(13, 27, 42, 0.35);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 40;
}
.pd-drawer-backdrop--open {
  opacity: 1;
  pointer-events: auto;
}

.pd-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100vw);
  background: #fff;
  border-left: 1px solid #C8D8D1;
  box-shadow: -12px 0 30px -10px rgba(13, 27, 42, 0.25);
  transform: translateX(100%);
  transition: transform 0.25s ease;
  z-index: 41;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
  color: #0D1B2A;
}
.pd-drawer--open { transform: translateX(0); }

.pd-drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 22px 16px;
  border-bottom: 2px solid #C8D8D1;
  flex-shrink: 0;
}
.pd-drawer-eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #5E7A6E;
  margin-bottom: 4px;
}
.pd-drawer-acid {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 17px;
  font-weight: 600;
  color: #1B8C60;
}
.pd-drawer-close {
  border: none;
  background: #F0F4F2;
  color: #2C4A3E;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}
.pd-drawer-close:hover { background: #D4EDE5; }

.pd-drawer-body {
  overflow-y: auto;
  padding: 6px 22px 24px;
  flex: 1;
}

.pd-kv {
  padding: 12px 0;
  border-bottom: 1px solid #EEF3F1;
}
.pd-kv:last-child { border-bottom: none; }
.pd-kv-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #5E7A6E;
  margin-bottom: 5px;
}
.pd-kv-value {
  font-size: 13.5px;
  line-height: 1.45;
  word-break: break-word;
}

/* ─── Tablet ─── */
@media (max-width: 1024px) {
  .pd-shell { padding: 24px 20px 50px; }
  .pd-scroll-hint { display: flex; }
}

/* ─── Phone ─── */
@media (max-width: 640px) {
  .pd-shell { padding: 18px 14px 40px; }
  .pd-header { flex-direction: column; align-items: flex-start; }
  .pd-title { font-size: 24px; }
  .pd-search-wrap { width: 100%; }
  .pd-search-input { width: 100%; }
  .pd-drawer { width: 100vw; }
  .pd-scroll-hint { display: none; }

  .pd-table, .pd-table thead, .pd-table tbody, .pd-table tr, .pd-table td {
    display: block;
    width: 100% !important;
  }
  .pd-table { min-width: 0; }
  .pd-table thead { display: none; }

  .pd-scroll-area { max-height: none; overflow: visible; }

  .pd-tr {
    border: 1px solid #C8D8D1;
    border-radius: 10px;
    margin-bottom: 12px;
    padding: 4px 14px;
    background: #fff;
  }
  .pd-tr:hover { background: #fff; }
  .pd-tr:hover .pd-td { background: #fff; }
  .pd-scroll-area { border: none; border-radius: 0; background: transparent; }

  .pd-td, .pd-td-sticky {
    position: static;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid #EEF3F1;
    white-space: normal;
    text-align: right;
    box-shadow: none !important;
    min-width: 0 !important;
  }
  .pd-tr .pd-td:last-child { border-bottom: none; }

  .pd-td::before {
    content: attr(data-label);
    flex-shrink: 0;
    max-width: 46%;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #5E7A6E;
  }

  .pd-truncate, .pd-truncate--name {
    max-width: none !important;
    white-space: normal;
    text-align: right;
  }

  .pd-tag-row { justify-content: flex-end; max-width: none; }

  .pd-td[data-label="SAIRI Reference No."] {
    padding: 12px 0 9px;
  }
  .pd-td[data-label="SAIRI Reference No."]::before {
    display: none;
  }
  .pd-td[data-label="SAIRI Reference No."] .pd-acid {
    font-size: 14px;
  }
}
`;
