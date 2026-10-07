import { useEffect, useState } from "react";
import axios from "axios";
import config from "config";
import { matchesDateFilter } from "./dateFilter"; // ← add this import

export default function IncidentDetails({ filters }) {
  // ← accept filters prop
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState("desc"); // default: Newest First
  const PAGE_SIZE = 10;

  useEffect(() => {
    setPage(1);
  }, [search, filters, sortDir]); // ← also reset page when filters/sort change

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [masterRes, section1Res, section3Res] = await Promise.allSettled([
          axios.get(`${config.baseApi}/accident/get-all-report`),
          axios.get(`${config.baseApi}/accident/get-all-section1`),
          axios.get(`${config.baseApi}/accident/get-all-section3`),
        ]);

        const masters =
          masterRes.status === "fulfilled" ? masterRes.value.data : [];
        const section1List =
          section1Res.status === "fulfilled" ? section1Res.value.data : [];
        const section3List =
          section3Res.status === "fulfilled" ? section3Res.value.data : [];

        const s1Map = {};
        section1List.forEach((r) => (s1Map[r.accident_id] = r));
        const s3Map = {};
        section3List.forEach((r) => (s3Map[r.accident_id] = r));

        const ids = masters.map((m) => m.accident_id);
        const [s7Results, s8Results] = await Promise.all([
          Promise.allSettled(
            ids.map((id) =>
              axios
                .get(`${config.baseApi}/accident/get-section7-by-id`, {
                  params: { accident_id: id },
                })
                .then((r) => ({ id, data: r.data }))
                .catch(() => ({ id, data: null })),
            ),
          ),
          Promise.allSettled(
            ids.map((id) =>
              axios
                .get(`${config.baseApi}/accident/get-section8-by-id`, {
                  params: { accident_id: id },
                })
                .then((r) => ({ id, data: r.data }))
                .catch(() => ({ id, data: null })),
            ),
          ),
        ]);

        const s7Map = {};
        s7Results.forEach((r) => {
          if (r.status === "fulfilled" && r.value.data)
            s7Map[r.value.id] = r.value.data;
        });
        const s8Map = {};
        s8Results.forEach((r) => {
          if (r.status === "fulfilled" && r.value.data)
            s8Map[r.value.id] = r.value.data;
        });

        const merged = masters.map((m) => {
          const id = m.accident_id;
          const s1 = s1Map[id] || {};
          const s3 = s3Map[id] || {};
          const s7 = s7Map[id] || {};
          const s8 = s8Map[id] || {};

          let correctiveItems = [];
          try {
            const parsed = s8.corrective_table
              ? JSON.parse(s8.corrective_table)
              : [];
            correctiveItems = Array.isArray(parsed)
              ? parsed.map((it) => ({
                  recommendation: it.recommendation || "—",
                  status: it.status || "",
                  completion_date:
                    it.completion_date ||
                    it.completionDate ||
                    it.date_completed ||
                    "",
                }))
              : [];
          } catch {
            correctiveItems = [];
          }

          const mechanismRaw = s3.mechanism_of_injury || "";
          const mechanism = mechanismRaw
            .split(mechanismRaw.includes("|") ? "|" : ",")
            .map((s) => s.trim())
            .filter(Boolean)
            .join(", ");

          const workingAreaRaw = s1.working_area || "";
          const workingAreas = workingAreaRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .join(", ");

          return {
            accident_id: id,
            date_of_event: s1.date_of_event ?? "",
            name: s1.name || "—",
            mechanism_of_injury: mechanism || "—",
            working_area: workingAreas || "—",
            immediate_actions_taken: s1.immediate_actions_taken || "—",
            facts_and_findings: s7.facts_and_findings || "—",
            incident_description: s1.incident_accident_brief_description || "—",
            corrective_items: correctiveItems,
          };
        });

        setReports(merged);
      } catch (err) {
        console.error(err);
        setError("Failed to load incident details.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filtered = reports
    .filter((r) => {
      // ← apply date filter first
      if (!matchesDateFilter(r.date_of_event, filters)) return false;

      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        r.accident_id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.working_area.toLowerCase().includes(q) ||
        r.mechanism_of_injury.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const av = a.date_of_event || "";
      const bv = b.date_of_event || "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="id-shell">
      <style>{STYLE_SHEET}</style>

      <div className="id-header">
        <div>
          <h1 className="id-title">Incident Details</h1>
          <p className="id-sub">
            {filtered.length} report{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="id-header-right">
          <div className="id-sort-wrap">
            <span className="id-sort-label">Sort by Date of Event</span>
            <button
              className={`id-sort-pill${sortDir ? " id-sort-pill--active" : ""}`}
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
            <div className="id-pagination">
              <button
                className="id-page-btn"
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
              <span className="id-page-label">
                {page} / {totalPages}
              </span>
              <button
                className="id-page-btn"
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
          <div className="id-search-wrap">
            <svg className="id-search-icon" viewBox="0 0 16 16" fill="none">
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
              className="id-search-input"
              placeholder="Search reference, name, area…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="id-panel">
        {loading ? (
          <div className="id-empty">Loading incident details…</div>
        ) : error ? (
          <div className="id-empty id-empty--error">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="id-empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              No records found
            </div>
            <div style={{ fontSize: 12 }}>
              {reports.length === 0
                ? "There are no reports yet."
                : "Try a different search term."}
            </div>
          </div>
        ) : (
          <div className="id-scroll-area">
            <table className="id-table">
              <thead>
                <tr>
                  <th className="id-th id-th-num-col" rowSpan={2}>
                    #
                  </th>
                  <th className="id-th id-th-ref" rowSpan={2}>
                    Reference
                  </th>
                  <th className="id-th id-th-group-label" colSpan={2}>
                    Brief Description of Incident(s)
                  </th>
                  <th className="id-th id-th-group-label" colSpan={1}>
                    Immediate Action / Findings / Observations / Corrective
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, idx) => (
                  <tr className="id-tr" key={r.accident_id}>
                    <td className="id-td id-td-row-num">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="id-td id-td-ref">
                      <a
                        href={`/view-report?ACID=${r.accident_id}`}
                        className="id-ref-link"
                      >
                        {r.accident_id}
                      </a>
                    </td>

                    {/* Name + Mechanism + Working Area */}
                    <td className="id-td">
                      <div className="id-stack-item">
                        <span className="id-stack-label">Name</span>
                        <span className="id-stack-val">{r.name}</span>
                      </div>
                      <div className="id-stack-item">
                        <span className="id-stack-label">
                          Mechanism of Injury
                        </span>
                        <span className="id-stack-val">
                          <Expandable text={r.mechanism_of_injury} />
                        </span>
                      </div>
                      <div className="id-stack-item">
                        <span className="id-stack-label">Working Area</span>
                        <span className="id-stack-val">
                          <Expandable text={r.working_area} />
                        </span>
                      </div>
                    </td>

                    {/* Incident / Accident Brief Description */}
                    <td className="id-td id-td-description">
                      <span className="id-stack-val">
                        <Expandable text={r.incident_description} />
                      </span>
                    </td>

                    {/* Immediate Action + Findings + CPAP */}
                    <td className="id-td id-td-actions">
                      <div className="id-stack-item">
                        <span className="id-stack-label">Immediate Action</span>
                        <span className="id-stack-val">
                          <Expandable text={r.immediate_actions_taken} />
                        </span>
                      </div>
                      <div className="id-stack-item">
                        <span className="id-stack-label">
                          Findings / Observations
                        </span>
                        <span className="id-stack-val">
                          <Expandable text={r.facts_and_findings} />
                        </span>
                      </div>
                      <div className="id-stack-item">
                        <span className="id-stack-label">
                          Corrective and Preventive Action Plan (CPAP)
                        </span>
                        <span className="id-stack-val">
                          {r.corrective_items.length === 0 ? (
                            <span className="id-zero">—</span>
                          ) : (
                            <ol className="id-ca-list">
                              {r.corrective_items.map((it, i) => (
                                <li key={i} className="id-ca-item">
                                  {it.recommendation || "—"}
                                  {it.status?.toLowerCase() === "completed" && (
                                    <span className="id-case-closed">
                                      CASE CLOSED {it.completion_date || ""}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Expandable text ──────────────────────────────────────────────────── */
function Expandable({ text, limit = 100 }) {
  const [open, setOpen] = useState(false);
  if (!text || text === "—") return <span className="id-zero">—</span>;
  const isLong = text.length > limit;
  return (
    <span>
      {open || !isLong ? text : text.slice(0, limit) + "…"}
      {isLong && (
        <button className="id-expand-btn" onClick={() => setOpen((o) => !o)}>
          {open ? " less" : " more"}
        </button>
      )}
    </span>
  );
}

/* ── Stylesheet ───────────────────────────────────────────────────────── */
const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

.id-shell,
.id-shell * { box-sizing: border-box; }
.id-shell {
  font-family: 'Inter', sans-serif;
  color: #0B1F3A;
  padding: 32px 36px 60px;
  min-height: 100vh;
  background: linear-gradient(160deg, #F0F4FA 0%, #F6F8FC 40%, #FAFBFD 100%);
}

/* ── Header ── */
.id-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
  padding-bottom: 18px;
  position: relative;
  flex-wrap: wrap;
  gap: 14px;
}
.id-header::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, #14487A 0%, #1E88A8 45%, #2FB68C 75%, transparent 100%);
  border-radius: 3px;
}
.id-title {
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
.id-sub {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #14487A;
  letter-spacing: 0.04em;
  margin: 6px 0 0;
  opacity: 0.85;
}

/* ── Header right ── */
.id-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* ── Sort pill ── */
.id-sort-wrap { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.id-sort-label { font-size: 11.5px; font-weight: 600; color: #5B7290; white-space: nowrap; }
.id-sort-pill {
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
.id-sort-pill:hover { background: #E9F1FB; border-color: #1E88A8; }
.id-sort-pill--active { background: #14487A; border-color: #14487A; color: #fff; font-weight: 600; }
.id-sort-pill--active:hover { background: #0F3560; }

/* ── Search ── */
.id-search-wrap { position: relative; }
.id-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  pointer-events: none;
}
.id-search-input {
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
.id-search-input:focus {
  border-color: #1E88A8;
  box-shadow: 0 0 0 4px rgba(30,136,168,0.15);
}

/* ── Pagination ── */
.id-pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff;
  border: 1.5px solid #C9D6E8;
  border-radius: 9px;
  padding: 4px;
  box-shadow: 0 1px 2px rgba(11,31,58,0.05);
}
.id-page-btn {
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
.id-page-btn:hover:not(:disabled) { background: #14487A; color: #fff; }
.id-page-btn:disabled { opacity: 0.3; cursor: default; }
.id-page-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #5B7290;
  padding: 0 6px;
  min-width: 44px;
  text-align: center;
}

/* ── Panel ── */
.id-panel {
  background: #fff;
  border: 1px solid #DCE4F0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(11,31,58,0.07), 0 1px 3px rgba(11,31,58,0.04);
}
.id-scroll-area { overflow-x: auto; }

/* ── Table ── */
.id-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
min-width: 900px;
}

/* ── TH ── */
.id-th {
  padding: 0;
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  color: #5B7290;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: linear-gradient(180deg, #F5F8FC, #EDF2F9);
  border-bottom: 2px solid #DCE4F0;
  vertical-align: bottom;
  white-space: nowrap;
}
.id-th-num-col {
  padding: 13px 10px;
  text-align: center;
  width: 44px;
  min-width: 44px;
  border-right: 1px solid #DCE4F0;
  font-family: 'IBM Plex Mono', monospace;
}
.id-th-ref {
  padding: 13px 14px;
  min-width: 170px;
  border-right: 1px solid #DCE4F0;
}


/* ── TD ── */
.id-td {
  padding: 11px 14px;
  border-bottom: 1px solid #EEF2F8;
  border-right: 1px solid #EEF2F8;
  vertical-align: top;
  background: #fff;
  font-size: 12.5px;
  color: #0B1F3A;
  line-height: 1.5;
  min-width: 160px;
  max-width: 240px;
  display: table-cell;
}
.id-td-row-num {
  text-align: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px;
  color: #9FB3CC;
  font-weight: 600;
  width: 44px;
  min-width: 44px;
  max-width: 44px;
  background: #FAFBFE;
  border-right: 1px solid #DCE4F0;
}
.id-td-ref {
  min-width: 170px;
  max-width: 180px;
  border-right: 1px solid #DCE4F0;
  background: #FAFBFE;
}
.id-ref-link {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #1E88A8;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.03em;
  display: block;
  word-break: break-all;
  transition: color 0.13s;
}
.id-ref-link:hover { color: #14487A; text-decoration: underline; }

/* The cell-label / cell-val pattern */
.id-cell-label {
  display: none; /* visible on mobile only */
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9FB3CC;
  margin-bottom: 2px;
}
.id-cell-val {
  display: block;
  word-break: break-word;
}

/* ── Row states ── */
.id-tr:nth-child(even) .id-td { background: #FAFBFE; }
.id-tr:nth-child(even) .id-td-row-num,
.id-tr:nth-child(even) .id-td-ref { background: #F3F7FC; }
.id-tr:hover .id-td { background: #E9F1FB; }
.id-tr:hover .id-td-row-num,
.id-tr:hover .id-td-ref { background: #DDEAF7; }
.id-tr:last-child .id-td { border-bottom: none; }

/* ── Corrective action list ── */
.id-ca-list {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.id-ca-item {
  font-size: 12px;
  line-height: 1.5;
  color: #2C4A6E;
}

/* ── Misc ── */
.id-zero { color: #C3CEDD; }
.id-expand-btn {
  background: none;
  border: none;
  color: #1E88A8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 0 2px;
  text-decoration: underline;
  text-decoration-style: dotted;
  font-family: inherit;
}
.id-expand-btn:hover { color: #14487A; }

/* ── Empty / error ── */
.id-empty {
  padding: 70px 20px;
  text-align: center;
  color: #5B7290;
  font-size: 13px;
}
.id-empty--error { color: #C0392B; }

/* ── Mobile ── */
@media (max-width: 640px) {
  .id-shell { padding: 20px 14px 40px; }
  .id-header { flex-direction: column; align-items: flex-start; }
  .id-title { font-size: 24px; }
  .id-header-right { width: 100%; flex-direction: column; align-items: flex-start; }
  .id-sort-wrap { width: 100%; }
  .id-search-wrap { flex: 1; width: 100%; }
  .id-search-input { width: 100%; }
  .id-cell-label { display: block; }
}
.id-th-group-label {
  padding: 9px 14px 7px;
  text-align: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #14487A;
  border-bottom: 1px solid #DCE4F0;
  border-right: 2px solid #C9D6E8;
  white-space: normal;
  width: 50%;
}
.id-th-col {
  padding: 8px 14px 10px;
  min-width: 180px;
  border-right: 1px solid #DCE4F0;
  vertical-align: bottom;
  white-space: normal;
  font-size: 10px;
  font-weight: 700;
  color: #5B7290;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.id-col-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.id-col-stack span {
  display: block;
  padding: 2px 0;
  border-bottom: 1px dashed #DCE4F0;
}
.id-col-stack span:last-child { border-bottom: none; }
.id-stack-item {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  border-bottom: 1px dashed #EEF2F8;
}
.id-stack-item:last-child { border-bottom: none; }
.id-stack-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9FB3CC;
  margin-bottom: 2px;
}
.id-stack-val {
  font-size: 12.5px;
  color: #0B1F3A;
  line-height: 1.5;
}
.id-td-description {
  min-width: 200px;
  max-width: 280px;
  width: 280px;
  word-break: break-word;
  white-space: normal;
  overflow-wrap: break-word;
}
.id-td-actions {
  min-width: 200px;
  max-width: 280px;
  width: 280px;
  word-break: break-word;
  white-space: normal;
  overflow-wrap: break-word;
}
.id-case-closed {
  display: block;
  margin-top: 6px;
  padding: 2px 7px;
  background: #E6F7F0;
  color: #1A7A4A;
  border: 1px solid #A8DFC3;
  border-radius: 4px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-family: 'IBM Plex Mono', monospace;
  width: fit-content;
}
`;
