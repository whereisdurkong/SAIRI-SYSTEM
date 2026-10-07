import { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import config from "config";
import { matchesDateFilter } from "./dateFilter";

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

const normalizeLocation = (raw) => {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { key: "unspecified", label: "Unspecified" };
  const key = trimmed.toLowerCase().replace(/\s+/g, " ");
  const label = key.replace(/\b\w/g, (c) => c.toUpperCase());
  return { key, label };
};

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
const STICKY_COL_WIDTH = { 0: NUMBER_COL_WIDTH, 1: 175, 2: 250 };
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
        className={`ut-drawer-backdrop${isOpen ? " ut-drawer-backdrop--open" : ""}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside
        className={`ut-drawer${isOpen ? " ut-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Incident record detail"
      >
        {row && (
          <>
            <div className="ut-drawer-header">
              <div>
                <div className="ut-drawer-eyebrow">
                  {row._source === "property-damage"
                    ? "Property Damage Record"
                    : "Incident Record"}
                </div>
                <div className="ut-drawer-acid">{row.accident_id}</div>
              </div>
              <button
                className="ut-drawer-close"
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
            <div className="ut-drawer-body">
              {FIELD_DEFS.map((def) => {
                const value = fieldDisplayValue(row, def);
                const listValue = def.isList ? row[def.key] : null;
                return (
                  <div className="ut-kv" key={def.key}>
                    <div className="ut-kv-label">{def.label}</div>
                    {listValue && listValue.length > 0 ? (
                      <div className="ut-tag-row ut-tag-row--drawer">
                        {listValue.map((v, i) => (
                          <span
                            className={`ut-tag${def.tag === "injury" ? " ut-tag--injury" : ""}`}
                            key={i}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    ) : def.badge && value !== "—" ? (
                      <span className="ut-dept-badge">{value}</span>
                    ) : (
                      <div className="ut-kv-value">{value}</div>
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
   LOCATION SECTION
   ════════════════════════════════════════════════════════════════════════ */

// Section color themes matching the Occupation page palette
const SECTION_COLORS = [
  {
    border: "#93C5FD",
    head: "#EFF6FF",
    headText: "#1D4ED8",
    rowBorder: "#DBEAFE",
    hover: "#DBEAFE",
    title: "#1E40AF",
    count: "#3B82F6",
  },
  {
    border: "#6EE7B7",
    head: "#F0FDF4",
    headText: "#15803D",
    rowBorder: "#D1FAE5",
    hover: "#D1FAE5",
    title: "#14532D",
    count: "#22C55E",
  },
  {
    border: "#C4B5FD",
    head: "#F5F3FF",
    headText: "#6D28D9",
    rowBorder: "#EDE9FE",
    hover: "#EDE9FE",
    title: "#4C1D95",
    count: "#8B5CF6",
  },
  {
    border: "#FCA5A5",
    head: "#FFF7ED",
    headText: "#C2410C",
    rowBorder: "#FEE2E2",
    hover: "#FEE2E2",
    title: "#9A3412",
    count: "#F97316",
  },
  {
    border: "#5EEAD4",
    head: "#F0FDFA",
    headText: "#0F766E",
    rowBorder: "#CCFBF1",
    hover: "#CCFBF1",
    title: "#134E4A",
    count: "#14B8A6",
  },
  {
    border: "#FDA4AF",
    head: "#FFF1F2",
    headText: "#BE123C",
    rowBorder: "#FFE4E6",
    hover: "#FFE4E6",
    title: "#881337",
    count: "#F43F5E",
  },
];

const PD_COLOR = {
  border: "#FCA5A5",
  head: "#FFF7ED",
  headText: "#C2410C",
  rowBorder: "#FEE2E2",
  hover: "#FEE2E2",
  title: "#9A3412",
  count: "#F97316",
};

function LocationSection({
  label,
  rows,
  onRowClick,
  pageSize = 10,
  isPropertyDamageSection = false,
  colorIndex = 0,
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [page, setPage] = useState(1);
  const [tableWidth, setTableWidth] = useState(3600);
  const scrollRef = useRef(null);
  const topScrollRef = useRef(null);
  const tableRef = useRef(null);
  const isSyncing = useRef(false);

  // Keep phantom div width in sync with actual table width
  useEffect(() => {
    if (!tableRef.current) return;
    const obs = new ResizeObserver(() => {
      if (tableRef.current) setTableWidth(tableRef.current.scrollWidth);
    });
    obs.observe(tableRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const theme = isPropertyDamageSection
    ? PD_COLOR
    : SECTION_COLORS[colorIndex % SECTION_COLORS.length];

  const syncScroll = (source, target) => {
    if (!source || !target || isSyncing.current) return;
    isSyncing.current = true;
    target.scrollLeft = source.scrollLeft;
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  };

  const handleTopScroll = () => {
    setIsScrolled((topScrollRef.current?.scrollLeft ?? 0) > 0);
    syncScroll(topScrollRef.current, scrollRef.current);
  };

  const handleScroll = () => {
    setIsScrolled((scrollRef.current?.scrollLeft ?? 0) > 0);
    syncScroll(scrollRef.current, topScrollRef.current);
  };

  const panelStyle = {
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 8px 24px rgba(11,31,58,0.07), 0 1px 3px rgba(11,31,58,0.04)",
  };

  const thStyle = {
    background: `linear-gradient(180deg, ${theme.head}, ${theme.head}ee)`,
    color: theme.headText,
    borderBottom: `2px solid ${theme.border}`,
  };

  return (
    <section className="ut-section">
      <div className="ut-section-header">
        <div className="ut-section-heading">
          <h2 className="ut-section-title" style={{ color: theme.title }}>
            {label}
          </h2>
          <span className="ut-section-count" style={{ color: theme.count }}>
            {rows.length} record{rows.length !== 1 ? "s" : ""}
          </span>
        </div>
        {totalPages > 1 && (
          <div className="ut-pagination">
            <button
              className="ut-page-btn"
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
            <span className="ut-page-label">
              {page} / {totalPages}
            </span>
            <button
              className="ut-page-btn"
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
      </div>

      <div style={panelStyle}>
        <div
          className="ut-top-scroll"
          ref={topScrollRef}
          onScroll={handleTopScroll}
          style={{
            borderBottom: `1px solid ${theme.border}`,
            borderRadius: "14px 14px 0 0",
          }}
        >
          <div style={{ width: tableWidth, height: 1 }} />
        </div>
        <div
          className={`ut-scroll-area${isScrolled ? " ut-scroll-area--scrolled" : ""}`}
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ borderRadius: "0 0 14px 14px" }}
        >
          <table className="ut-table" ref={tableRef}>
            <thead>
              <tr>
                <th
                  className="ut-th ut-th-sticky"
                  style={{
                    ...thStyle,
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
                    className={`ut-th${def.sticky ? " ut-th-sticky" : ""}${def.sticky === 2 ? " ut-sticky-shadow" : ""}`}
                    style={
                      def.sticky
                        ? {
                            ...thStyle,
                            left: STICKY_COL_LEFT[def.sticky],
                            width: STICKY_COL_WIDTH[def.sticky],
                            minWidth: STICKY_COL_WIDTH[def.sticky],
                          }
                        : thStyle
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
                  className="ut-tr"
                  key={`${r.accident_id}-${idx}`}
                  onClick={() => onRowClick(r)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View full details for ${r.accident_id}`}
                  style={{
                    "--hover-bg": theme.hover,
                    "--row-border": theme.rowBorder,
                    "--sticky-bg": "#fff",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(r);
                    }
                  }}
                >
                  <td
                    className="ut-td ut-td-sticky"
                    data-label="No."
                    style={{
                      left: STICKY_COL_LEFT[0],
                      width: STICKY_COL_WIDTH[0],
                      minWidth: STICKY_COL_WIDTH[0],
                      background: "var(--sticky-bg, #fff)",
                    }}
                  >
                    <span className="ut-row-no">
                      {(page - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  {FIELD_DEFS.map((def) => {
                    const isList = def.isList;
                    const listValue = isList ? r[def.key] : null;
                    const displayValue = fieldDisplayValue(r, def);
                    return (
                      <td
                        key={def.key}
                        className={`ut-td${def.sticky ? " ut-td-sticky" : ""}${def.sticky === 2 ? " ut-sticky-shadow" : ""}${def.isDate || def.isTime || def.key === "prepared_by" ? " ut-ts" : ""}`}
                        data-label={def.label}
                        title={!isList && !def.badge ? displayValue : undefined}
                        style={
                          def.sticky
                            ? {
                                left: STICKY_COL_LEFT[def.sticky],
                                width: STICKY_COL_WIDTH[def.sticky],
                                minWidth: STICKY_COL_WIDTH[def.sticky],
                                background: "var(--sticky-bg, #fff)",
                              }
                            : undefined
                        }
                      >
                        {isList ? (
                          listValue.length > 0 ? (
                            <div
                              className="ut-tag-row"
                              title={joinList(listValue)}
                            >
                              {listValue.map((v, i) => (
                                <span
                                  className={`ut-tag${def.tag === "injury" ? " ut-tag--injury" : ""}`}
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
                          <span className="ut-dept-badge">{displayValue}</span>
                        ) : def.sticky ? (
                          <span
                            className={`ut-truncate${def.sticky === 1 ? " ut-acid" : " ut-truncate--name"}`}
                            style={{
                              maxWidth: STICKY_COL_WIDTH[def.sticky] - 28,
                            }}
                          >
                            {displayValue}
                          </span>
                        ) : (
                          <span
                            className={`ut-truncate${def.key === "employee_name" ? " ut-truncate--name" : ""}`}
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
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */

export default function UndergroundTable({ filters }) {
  const [locationRows, setLocationRows] = useState([]);
  const [pdRows, setPdRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const resolveFullName = async (username) => {
    if (!username || username === "—") return username;
    try {
      const res = await axios.get(
        `${config.baseApi}/auth/get-user-by-username`,
        { params: { user_name: username } },
      );
      const user = Array.isArray(res.data) ? res.data[0] : res.data;
      const fullName = user
        ? `${user.emp_firstname || ""} ${user.emp_lastname || ""}`.trim()
        : "";
      return fullName || username;
    } catch {
      return username;
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
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

        const locationRowsRaw = await Promise.all(
          withSections.flatMap(({ accident_id, section1, section3 }) => {
            if (!Array.isArray(section1)) return [];
            return section1.map(async (s1) => {
              const { key: location_key, label: location_label } =
                normalizeLocation(s1.location);
              const fullName = await resolveFullName(s1.prepared_by);
              return {
                _source: "location",
                accident_id,
                location_key,
                location_label,
                employee_name: s1.name || "—",
                chapa_number: s1.chapa_number || "—",
                date_of_event: s1.date_of_event || null,
                time_of_event: s1.time_of_event || null,
                job_designation: s1.job_designation || "—",
                subtypes: parseNatureOfInjury(
                  section3?.mechanism_of_injury || "",
                ).filter((v) => !v.toLowerCase().startsWith("other")),
                specific_location: s1.specific_location || "—",
                level: s1.level || "—",
                date_reported: s1.date_reported || null,
                time_reported: s1.time_reported || null,
                shift: s1.shift || "—",
                department_head: s1.department_head || "—",
                section_head: s1.section_head || "—",
                supervisor_reported_to: s1.supervisor_reported_to || "—",
                nature_of_injury: parseSubtypes(
                  s1.accident_incident_subtype || s1.subtype || "",
                ),
                ongoing_activity: s1.incident_accident_brief_description || "—",
                safety_inspector_on_duty: fullName || "—",
                group: s1.group || "—",
                department: s1.department || "—",
                section: s1.section || "—",
                prepared_by: fullName || "—",
              };
            });
          }),
        );
        setLocationRows(locationRowsRaw);

        const pdFlat = [];
        withSections.forEach(({ accident_id, section1, section3 }) => {
          if (!Array.isArray(section1)) return;
          section1.forEach((s1) => {
            const subtypes = parseSubtypes(
              s1.accident_incident_subtype || s1.subtype || "",
            );
            if (!isPropertyDamage(subtypes)) return;
            pdFlat.push({
              _source: "property-damage",
              location_key: "property-damage",
              location_label: "Property Damage",
              accident_id,
              employee_name: s1.name || "—",
              chapa_number: s1.chapa_number || "—",
              date_of_event: s1.date_of_event || null,
              time_of_event: s1.time_of_event || null,
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
              group: s1.group || "—",
              department: s1.department || "—",
              section: s1.section || "—",
              prepared_by: s1.prepared_by || "—",
            });
          });
        });
        setPdRows(pdFlat);
      } catch (err) {
        console.log("UNABLE TO FETCH REPORTS:", err);
        setError("Failed to load reports. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const matchesSearch = (r, q) =>
    !q ||
    r.accident_id?.toLowerCase().includes(q) ||
    r.employee_name?.toLowerCase().includes(q) ||
    r.chapa_number?.toLowerCase().includes(q) ||
    r.department?.toLowerCase().includes(q) ||
    r.group?.toLowerCase().includes(q) ||
    r.section?.toLowerCase().includes(q) ||
    r.prepared_by?.toLowerCase().includes(q);

  const sortRows = (arr) =>
    [...arr].sort((a, b) => {
      const av = `${a.date_of_event || ""}T${a.time_of_event || ""}`;
      const bv = `${b.date_of_event || ""}T${b.time_of_event || ""}`;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  const groupedLocationRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const groups = new Map();
    locationRows.forEach((r) => {
      if (!matchesSearch(r, q)) return;
      if (!matchesDateFilter(r.date_of_event, filters)) return;
      if (!groups.has(r.location_key))
        groups.set(r.location_key, {
          key: r.location_key,
          label: r.location_label,
          rows: [],
        });
      groups.get(r.location_key).rows.push(r);
    });
    return [...groups.values()]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((g) => ({ ...g, rows: sortRows(g.rows) }));
  }, [locationRows, search, sortDir, filters]);

  const filteredPdRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sortRows(
      pdRows.filter(
        (r) =>
          matchesSearch(r, q) && matchesDateFilter(r.date_of_event, filters),
      ),
    );
  }, [pdRows, search, sortDir, filters]);

  const totalCount =
    groupedLocationRows.reduce((sum, g) => sum + g.rows.length, 0) +
    filteredPdRows.length;

  const totalLocations =
    groupedLocationRows.length + (filteredPdRows.length > 0 ? 1 : 0);

  return (
    <div className="ut-shell">
      <style>{STYLE_SHEET}</style>

      <div className="ut-header">
        <div>
          <h1 className="ut-title">Incident By Location</h1>
          <p className="ut-sub">
            {totalCount} record{totalCount !== 1 ? "s" : ""} · {totalLocations}{" "}
            section{totalLocations !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="ut-header-controls">
          <div className="ut-sort-wrap">
            <span className="ut-sort-label">
              Sort by Date &amp; Time of Event
            </span>
            <button
              className={`ut-sort-pill${sortDir ? " ut-sort-pill--active" : ""}`}
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
          <div className="ut-search-wrap">
            <svg className="ut-search-icon" viewBox="0 0 16 16" fill="none">
              <circle
                cx="6.5"
                cy="6.5"
                r="4.5"
                stroke="#5B7290"
                strokeWidth="1.4"
              />
              <line
                x1="10"
                y1="10"
                x2="14"
                y2="14"
                stroke="#5B7290"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <input
              className="ut-search-input"
              placeholder="Search by name, ID, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {!loading && !error && totalCount > 0 && (
        <div className="ut-scroll-hint">
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

      {loading ? (
        <div className="ut-panel-bare">
          <div className="ut-empty">Loading reports…</div>
        </div>
      ) : error ? (
        <div className="ut-panel-bare">
          <div className="ut-empty ut-empty--error">{error}</div>
        </div>
      ) : totalCount === 0 ? (
        <div className="ut-panel-bare">
          <div className="ut-empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              No reports found
            </div>
            <div style={{ fontSize: 12 }}>
              {locationRows.length === 0 && pdRows.length === 0
                ? "There are no reports yet."
                : "Try a different search or date range."}
            </div>
          </div>
        </div>
      ) : (
        <>
          {groupedLocationRows.map((g, i) => (
            <LocationSection
              key={g.key}
              label={g.label}
              rows={g.rows}
              onRowClick={setExpandedRow}
              colorIndex={i}
            />
          ))}
          {filteredPdRows.length > 0 && (
            <LocationSection
              key="property-damage"
              label="Property Damage"
              rows={filteredPdRows}
              onRowClick={setExpandedRow}
              isPropertyDamageSection={true}
            />
          )}
        </>
      )}

      <RowDrawer row={expandedRow} onClose={() => setExpandedRow(null)} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET — Occupation design language applied to UndergroundTable
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

.ut-shell,
.ut-shell * { box-sizing: border-box; }
.ut-shell {
  font-family: 'Inter', sans-serif;
  color: #0B1F3A;
  padding: 32px 36px 60px;
  background: #F5F8FC;
  min-height: 100vh;
}

/* ── Header ── */
.ut-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
  padding-bottom: 18px;
  position: relative;
  flex-wrap: wrap;
  gap: 14px;
}
.ut-header::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, #14487A 0%, #1E88A8 45%, #2FB68C 75%, transparent 100%);
  border-radius: 3px;
}
.ut-title {
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
.ut-sub {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #14487A;
  letter-spacing: 0.04em;
  margin: 6px 0 0;
  opacity: 0.85;
}

/* ── Header controls ── */
.ut-header-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.ut-sort-wrap { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.ut-sort-label { font-size: 11.5px; font-weight: 600; color: #5B7290; white-space: nowrap; }
.ut-sort-pill {
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
.ut-sort-pill:hover { background: #E9F1FB; border-color: #1E88A8; }
.ut-sort-pill--active { background: #14487A; border-color: #14487A; color: #fff; font-weight: 600; }
.ut-sort-pill--active:hover { background: #0F3560; }

/* ── Search ── */
.ut-search-wrap { position: relative; }
.ut-search-icon {
  position: absolute; left: 12px; top: 50%;
  transform: translateY(-50%);
  width: 15px; height: 15px; pointer-events: none;
}
.ut-search-input {
  padding: 9px 12px 9px 34px;
  border: 1.5px solid #C9D6E8;
  border-radius: 9px;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  background: #fff;
  color: #0B1F3A;
  width: 300px; height: 38px;
  box-shadow: 0 1px 2px rgba(11,31,58,0.05);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ut-search-input:focus {
  border-color: #1E88A8;
  box-shadow: 0 0 0 4px rgba(30,136,168,0.15);
}

/* ── Panel (bare — for loading/error/empty only) ── */
.ut-panel-bare {
  background: #fff;
  border: 1px solid #DCE4F0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(11,31,58,0.07), 0 1px 3px rgba(11,31,58,0.04);
}

/* ── Scroll hint ── */
.ut-scroll-hint {
  display: none;
  align-items: center;
  gap: 6px;
  color: #5B7290;
  font-size: 11.5px;
  font-weight: 500;
  margin-bottom: 10px;
}

/* ── Section layout ── */
.ut-section { margin-bottom: 28px; }
.ut-section:last-child { margin-bottom: 0; }

.ut-section-header {
  display: flex; align-items: center;
  justify-content: space-between;
  gap: 12px; margin-bottom: 10px;
  flex-wrap: wrap;
}
.ut-section-heading { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.ut-section-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700; font-size: 20px;
  margin: 0; letter-spacing: 0.01em;
}
.ut-section-count { font-family: 'IBM Plex Mono', monospace; font-size: 11px; }

/* ── Pagination ── */
.ut-pagination {
  display: flex; align-items: center; gap: 4px;
  background: #fff;
  border: 1.5px solid #C9D6E8;
  border-radius: 9px;
  padding: 4px;
  box-shadow: 0 1px 2px rgba(11,31,58,0.05);
}
.ut-page-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: none; border-radius: 6px;
  background: transparent; color: #14487A;
  cursor: pointer; padding: 0;
  transition: background 0.13s, color 0.13s;
}
.ut-page-btn:hover:not(:disabled) { background: #14487A; color: #fff; }
.ut-page-btn:disabled { opacity: 0.3; cursor: default; }
.ut-page-label {
  font-family: 'IBM Plex Mono', monospace; font-size: 11px;
  color: #5B7290; padding: 0 6px;
  min-width: 44px; text-align: center;
}

/* ── Table ── */
.ut-scroll-area {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 72vh;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.ut-scroll-area::-webkit-scrollbar { display: none; }
.ut-top-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  will-change: scroll-position;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #C9D6E8 transparent;
}
/* Clip last row bottom corners to match panel border-radius */
.ut-tr:last-child .ut-td:first-child { border-bottom-left-radius: 14px; }
.ut-tr:last-child .ut-td:last-child { border-bottom-right-radius: 14px; }
.ut-top-scroll::-webkit-scrollbar { height: 6px; }
.ut-top-scroll::-webkit-scrollbar-thumb { background: #C9D6E8; border-radius: 3px; }
.ut-top-scroll::-webkit-scrollbar-track { background: transparent; }

.ut-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 3600px; }

.ut-th {
  position: sticky; top: 0; z-index: 2;
  padding: 13px 18px;
  text-align: left;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  white-space: nowrap;
  line-height: 1.3; vertical-align: bottom;
}
.ut-th-sticky { z-index: 3; }

.ut-td {
  padding: 12px 18px;
  font-size: 12.5px;
  border-bottom: 1px solid #EEF2F8;
  vertical-align: middle;
  white-space: nowrap;
  background: #fff;
  transition: background 0.12s;
}
.ut-tr { cursor: pointer; }
.ut-tr:hover .ut-td { background: var(--hover-bg, #E9F1FB); }
.ut-tr:hover { --sticky-bg: var(--hover-bg, #E9F1FB); }
.ut-tr:last-child .ut-td { border-bottom: none; }
.ut-tr:focus-visible { outline: 2px solid #1E88A8; outline-offset: -2px; }

.ut-th-sticky, .ut-td-sticky { position: sticky; }
.ut-td-sticky { z-index: 1; }
/* Prevent sticky cells from blocking scroll gestures on touch devices */
.ut-scroll-area, .ut-top-scroll { touch-action: pan-x pan-y; }

.ut-th.ut-sticky-shadow,
.ut-td.ut-sticky-shadow { box-shadow: none; transition: box-shadow 0.15s ease; }
.ut-scroll-area--scrolled .ut-th.ut-sticky-shadow,
.ut-scroll-area--scrolled .ut-td.ut-sticky-shadow { box-shadow: 6px 0 10px -6px rgba(11,31,58,0.22); }

.ut-acid {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px; font-weight: 600; color: #1E88A8;
}
.ut-ts { color: #5B7290; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
.ut-row-no { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; color: #5B7290; }

.ut-truncate { display: block; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ut-truncate--name { max-width: 300px; font-weight: 500; }

.ut-dept-badge {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 5px;
  font-size: 11px; font-weight: 600;
  background: #E9F1FB; color: #14487A;
  white-space: nowrap;
}

.ut-tag-row { display: flex; flex-wrap: wrap; gap: 3px; white-space: normal; max-width: 280px; }
.ut-tag-row--drawer { max-width: none; }
.ut-tag {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 999px;
  font-size: 11px; font-weight: 600;
  background: #E9F1FB; color: #14487A;
  white-space: nowrap;
}
.ut-tag--injury { background: #FBE6E3; color: #C0392B; }

.ut-empty { padding: 70px 20px; text-align: center; color: #5B7290; font-size: 13px; }
.ut-empty--error { color: #C0392B; }

/* ── Drawer ── */
.ut-drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(11, 31, 58, 0.35);
  opacity: 0; pointer-events: none;
  transition: opacity 0.2s ease; z-index: 40;
}
.ut-drawer-backdrop--open { opacity: 1; pointer-events: auto; }

.ut-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(420px, 100vw);
  background: #fff;
  border-left: 1px solid #DCE4F0;
  box-shadow: -12px 0 30px -10px rgba(11,31,58,0.2);
  transform: translateX(100%);
  transition: transform 0.25s ease;
  z-index: 41;
  display: flex; flex-direction: column;
  font-family: 'Inter', sans-serif; color: #0B1F3A;
}
.ut-drawer--open { transform: translateX(0); }

.ut-drawer-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 22px 16px;
  border-bottom: 2px solid #DCE4F0;
  flex-shrink: 0;
}
.ut-drawer-eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.1em;
  text-transform: uppercase; color: #5B7290; margin-bottom: 4px;
}
.ut-drawer-acid {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 17px; font-weight: 600; color: #1E88A8;
}
.ut-drawer-close {
  border: none; background: #EDF2F9; color: #14487A;
  width: 30px; height: 30px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background 0.15s;
}
.ut-drawer-close:hover { background: #DCE4F0; }
.ut-drawer-body { overflow-y: auto; padding: 6px 22px 24px; flex: 1; }

.ut-kv { padding: 12px 0; border-bottom: 1px solid #EEF2F8; }
.ut-kv:last-child { border-bottom: none; }
.ut-kv-label {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: #5B7290; margin-bottom: 5px;
}
.ut-kv-value { font-size: 13.5px; line-height: 1.45; word-break: break-word; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .ut-shell { padding: 24px 20px 50px; }
  .ut-scroll-hint { display: flex; }
}
@media (max-width: 640px) {
  .ut-shell { padding: 18px 14px 40px; }
  .ut-header { flex-direction: column; align-items: flex-start; }
  .ut-title { font-size: 24px; }
  .ut-search-wrap { width: 100%; }
  .ut-search-input { width: 100%; }
  .ut-drawer { width: 100vw; }
  .ut-scroll-hint { display: none; }
  .ut-header-controls { width: 100%; flex-direction: column; align-items: flex-start; }
  .ut-sort-wrap { width: 100%; }

  .ut-table, .ut-table thead, .ut-table tbody, .ut-table tr, .ut-table td { display: block; width: 100% !important; }
  .ut-table { min-width: 0; }
  .ut-table thead { display: none; }
  .ut-scroll-area { max-height: none; overflow: visible; }

  .ut-tr {
    border: 1px solid #DCE4F0; border-radius: 10px;
    margin-bottom: 12px; padding: 4px 14px; background: #fff;
  }
  .ut-tr:hover { background: #fff; }
  .ut-tr:hover .ut-td { background: #fff; }
  .ut-panel-bare { border: none; background: transparent; }

  .ut-td, .ut-td-sticky {
    position: static; display: flex; align-items: flex-start;
    justify-content: space-between; gap: 12px;
    padding: 9px 0; border-bottom: 1px solid #EEF2F8;
    white-space: normal; text-align: right;
    box-shadow: none !important; min-width: 0 !important;
  }
  .ut-tr .ut-td:last-child { border-bottom: none; }
  .ut-td::before {
    content: attr(data-label); flex-shrink: 0; max-width: 46%;
    text-align: left; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em; color: #5B7290;
  }
  .ut-truncate, .ut-truncate--name { max-width: none !important; white-space: normal; text-align: right; }
  .ut-tag-row { justify-content: flex-end; max-width: none; }
  .ut-td[data-label="SAIRI Reference No."] { padding: 12px 0 9px; }
  .ut-td[data-label="SAIRI Reference No."]::before { display: none; }
  .ut-td[data-label="SAIRI Reference No."] .ut-acid { font-size: 14px; }
  .ut-section-header { flex-direction: column; align-items: flex-start; }
  .ut-pagination { align-self: flex-end; }
}
`;

// //-------------------------------------------------------------------------table/dashboard
// import { useEffect, useRef, useState, useMemo, useCallback } from "react";
// import axios from "axios";
// import config from "config";
// import { matchesDateFilter } from "./dateFilter";

// /* ════════════════════════════════════════════════════════════════════════
//    HELPERS  (shared between both views)
//    ════════════════════════════════════════════════════════════════════════ */

// const parseSubtypes = (raw) => {
//   if (!raw) return [];
//   if (Array.isArray(raw)) return raw;
//   return raw
//     .split(",")
//     .map((s) => s.trim())
//     .filter(Boolean);
// };

// const parseNatureOfInjury = (raw) => {
//   if (!raw) return [];
//   const delimiter = raw.includes("|") ? "|" : ",";
//   return raw
//     .split(delimiter)
//     .map((s) => s.trim())
//     .filter(Boolean);
// };

// const formatDate = (dateString) => {
//   if (!dateString) return "—";
//   const date = new Date(dateString);
//   if (isNaN(date)) return "—";
//   return date.toLocaleDateString("en-US", {
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//   });
// };

// const formatTime = (timeString) => {
//   if (!timeString) return "—";
//   const str = String(timeString).trim();
//   const plainMatch = str.match(/^(\d{2}):(\d{2})/);
//   let hh, mm;
//   if (plainMatch && !str.includes("T")) {
//     hh = plainMatch[1];
//     mm = plainMatch[2];
//   } else {
//     const isoMatch =
//       str.match(/T(\d{2}):(\d{2})/) || str.match(/\s(\d{2}):(\d{2})/);
//     if (isoMatch) {
//       hh = isoMatch[1];
//       mm = isoMatch[2];
//     } else {
//       const d = new Date(str);
//       if (isNaN(d.getTime())) return "—";
//       hh = String(d.getHours()).padStart(2, "0");
//       mm = String(d.getMinutes()).padStart(2, "0");
//     }
//   }
//   const h = parseInt(hh, 10);
//   const period = h >= 12 ? "PM" : "AM";
//   const h12 = h % 12 === 0 ? 12 : h % 12;
//   return `${h12}:${mm} ${period}`;
// };

// const joinList = (arr) => (arr && arr.length > 0 ? arr.join(", ") : "—");

// const normalizeLocation = (raw) => {
//   const trimmed = (raw || "").trim();
//   if (!trimmed) return { key: "unspecified", label: "Unspecified" };
//   const key = trimmed.toLowerCase().replace(/\s+/g, " ");
//   const label = key.replace(/\b\w/g, (c) => c.toUpperCase());
//   return { key, label };
// };

// const isPropertyDamage = (subtypes) =>
//   subtypes.some((s) => s.toLowerCase() === "property damage");

// /* ════════════════════════════════════════════════════════════════════════
//    FIELD DEFINITIONS  (table view)
//    ════════════════════════════════════════════════════════════════════════ */

// const FIELD_DEFS = [
//   { key: "accident_id", label: "SAIRI Reference No.", sticky: 1 },
//   {
//     key: "employee_name",
//     label: "Name of Person Injured / Damaged Property",
//     sticky: 2,
//   },
//   { key: "chapa_number", label: "CN / Unit #" },
//   { key: "job_designation", label: "Occupation / Designation" },
//   { key: "subtypes", label: "Type of Incident", isList: true, tag: "default" },
//   { key: "specific_location", label: "Work Place / Area" },
//   { key: "level", label: "Level" },
//   { key: "date_reported", label: "Date", isDate: true },
//   { key: "time_reported", label: "Time", isTime: true },
//   { key: "shift", label: "Shift" },
//   { key: "department_head", label: "Dept Head" },
//   { key: "section_head", label: "Section Head" },
//   { key: "supervisor_reported_to", label: "Immediate Supervisor" },
//   {
//     key: "nature_of_injury",
//     label: "Nature of Injury",
//     isList: true,
//     tag: "injury",
//   },
//   { key: "ongoing_activity", label: "On-going Activity" },
//   { key: "safety_inspector_on_duty", label: "Safety Inspector on Duty" },
//   { key: "group", label: "Group", badge: true },
//   { key: "department", label: "Department", badge: true },
//   { key: "section", label: "Section" },
//   { key: "prepared_by", label: "Recorded By" },
// ];

// const NUMBER_COL_WIDTH = 54;
// const STICKY_COL_WIDTH = { 0: NUMBER_COL_WIDTH, 1: 175, 2: 250 };
// const STICKY_COL_LEFT = {
//   0: 0,
//   1: NUMBER_COL_WIDTH,
//   2: NUMBER_COL_WIDTH + STICKY_COL_WIDTH[1],
// };

// const fieldDisplayValue = (row, def) => {
//   const raw = row[def.key];
//   if (def.isDate) return formatDate(raw);
//   if (def.isTime) return formatTime(raw);
//   if (def.isList) return joinList(raw);
//   return raw || "—";
// };

// /* ════════════════════════════════════════════════════════════════════════
//    SECTION COLOR THEMES
//    ════════════════════════════════════════════════════════════════════════ */

// const SECTION_COLORS = [
//   {
//     border: "#93C5FD",
//     head: "#EFF6FF",
//     headText: "#1D4ED8",
//     rowBorder: "#DBEAFE",
//     hover: "#DBEAFE",
//     title: "#1E40AF",
//     count: "#3B82F6",
//   },
//   {
//     border: "#6EE7B7",
//     head: "#F0FDF4",
//     headText: "#15803D",
//     rowBorder: "#D1FAE5",
//     hover: "#D1FAE5",
//     title: "#14532D",
//     count: "#22C55E",
//   },
//   {
//     border: "#C4B5FD",
//     head: "#F5F3FF",
//     headText: "#6D28D9",
//     rowBorder: "#EDE9FE",
//     hover: "#EDE9FE",
//     title: "#4C1D95",
//     count: "#8B5CF6",
//   },
//   {
//     border: "#FCA5A5",
//     head: "#FFF7ED",
//     headText: "#C2410C",
//     rowBorder: "#FEE2E2",
//     hover: "#FEE2E2",
//     title: "#9A3412",
//     count: "#F97316",
//   },
//   {
//     border: "#5EEAD4",
//     head: "#F0FDFA",
//     headText: "#0F766E",
//     rowBorder: "#CCFBF1",
//     hover: "#CCFBF1",
//     title: "#134E4A",
//     count: "#14B8A6",
//   },
//   {
//     border: "#FDA4AF",
//     head: "#FFF1F2",
//     headText: "#BE123C",
//     rowBorder: "#FFE4E6",
//     hover: "#FFE4E6",
//     title: "#881337",
//     count: "#F43F5E",
//   },
// ];

// const PD_COLOR = {
//   border: "#FCA5A5",
//   head: "#FFF7ED",
//   headText: "#C2410C",
//   rowBorder: "#FEE2E2",
//   hover: "#FEE2E2",
//   title: "#9A3412",
//   count: "#F97316",
// };

// /* ════════════════════════════════════════════════════════════════════════
//    ROW DETAIL DRAWER
//    ════════════════════════════════════════════════════════════════════════ */

// function RowDrawer({ row, onClose }) {
//   const isOpen = !!row;

//   useEffect(() => {
//     if (!isOpen) return;
//     const onKeyDown = (e) => {
//       if (e.key === "Escape") onClose();
//     };
//     window.addEventListener("keydown", onKeyDown);
//     return () => window.removeEventListener("keydown", onKeyDown);
//   }, [isOpen, onClose]);

//   return (
//     <>
//       <div
//         className={`ut-drawer-backdrop${isOpen ? " ut-drawer-backdrop--open" : ""}`}
//         onClick={onClose}
//         aria-hidden={!isOpen}
//       />
//       <aside
//         className={`ut-drawer${isOpen ? " ut-drawer--open" : ""}`}
//         role="dialog"
//         aria-modal="true"
//         aria-label="Incident record detail"
//       >
//         {row && (
//           <>
//             <div className="ut-drawer-header">
//               <div>
//                 <div className="ut-drawer-eyebrow">
//                   {row._source === "property-damage"
//                     ? "Property Damage Record"
//                     : "Incident Record"}
//                 </div>
//                 <div className="ut-drawer-acid">{row.accident_id}</div>
//               </div>
//               <button
//                 className="ut-drawer-close"
//                 onClick={onClose}
//                 aria-label="Close detail panel"
//               >
//                 <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//                   <path
//                     d="M3 3l10 10M13 3L3 13"
//                     stroke="currentColor"
//                     strokeWidth="1.6"
//                     strokeLinecap="round"
//                   />
//                 </svg>
//               </button>
//             </div>
//             <div className="ut-drawer-body">
//               {FIELD_DEFS.map((def) => {
//                 const value = fieldDisplayValue(row, def);
//                 const listValue = def.isList ? row[def.key] : null;
//                 return (
//                   <div className="ut-kv" key={def.key}>
//                     <div className="ut-kv-label">{def.label}</div>
//                     {listValue && listValue.length > 0 ? (
//                       <div className="ut-tag-row ut-tag-row--drawer">
//                         {listValue.map((v, i) => (
//                           <span
//                             className={`ut-tag${def.tag === "injury" ? " ut-tag--injury" : ""}`}
//                             key={i}
//                           >
//                             {v}
//                           </span>
//                         ))}
//                       </div>
//                     ) : def.badge && value !== "—" ? (
//                       <span className="ut-dept-badge">{value}</span>
//                     ) : (
//                       <div className="ut-kv-value">{value}</div>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           </>
//         )}
//       </aside>
//     </>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    LOCATION SECTION  (table view)
//    ════════════════════════════════════════════════════════════════════════ */

// function LocationSection({
//   label,
//   rows,
//   onRowClick,
//   pageSize = 10,
//   isPropertyDamageSection = false,
//   colorIndex = 0,
// }) {
//   const [isScrolled, setIsScrolled] = useState(false);
//   const [page, setPage] = useState(1);
//   const [tableWidth, setTableWidth] = useState(3600);
//   const scrollRef = useRef(null);
//   const topScrollRef = useRef(null);
//   const tableRef = useRef(null);
//   const isSyncing = useRef(false);

//   useEffect(() => {
//     if (!tableRef.current) return;
//     const obs = new ResizeObserver(() => {
//       if (tableRef.current) setTableWidth(tableRef.current.scrollWidth);
//     });
//     obs.observe(tableRef.current);
//     return () => obs.disconnect();
//   }, []);

//   useEffect(() => {
//     setPage(1);
//   }, [rows]);

//   const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
//   const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
//   const theme = isPropertyDamageSection
//     ? PD_COLOR
//     : SECTION_COLORS[colorIndex % SECTION_COLORS.length];

//   const syncScroll = (source, target) => {
//     if (!source || !target || isSyncing.current) return;
//     isSyncing.current = true;
//     target.scrollLeft = source.scrollLeft;
//     requestAnimationFrame(() => {
//       isSyncing.current = false;
//     });
//   };

//   const handleTopScroll = () => {
//     setIsScrolled((topScrollRef.current?.scrollLeft ?? 0) > 0);
//     syncScroll(topScrollRef.current, scrollRef.current);
//   };

//   const handleScroll = () => {
//     setIsScrolled((scrollRef.current?.scrollLeft ?? 0) > 0);
//     syncScroll(scrollRef.current, topScrollRef.current);
//   };

//   const panelStyle = {
//     border: `1px solid ${theme.border}`,
//     borderRadius: 14,
//     background: "#fff",
//     boxShadow: "0 8px 24px rgba(11,31,58,0.07), 0 1px 3px rgba(11,31,58,0.04)",
//   };

//   const thStyle = {
//     background: `linear-gradient(180deg, ${theme.head}, ${theme.head}ee)`,
//     color: theme.headText,
//     borderBottom: `2px solid ${theme.border}`,
//   };

//   return (
//     <section className="ut-section">
//       <div className="ut-section-header">
//         <div className="ut-section-heading">
//           <h2 className="ut-section-title" style={{ color: theme.title }}>
//             {label}
//           </h2>
//           <span className="ut-section-count" style={{ color: theme.count }}>
//             {rows.length} record{rows.length !== 1 ? "s" : ""}
//           </span>
//         </div>
//         {totalPages > 1 && (
//           <div className="ut-pagination">
//             <button
//               className="ut-page-btn"
//               onClick={() => setPage((p) => Math.max(1, p - 1))}
//               disabled={page === 1}
//               aria-label="Previous page"
//             >
//               <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
//                 <path
//                   d="M10 3L5 8l5 5"
//                   stroke="currentColor"
//                   strokeWidth="1.6"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//               </svg>
//             </button>
//             <span className="ut-page-label">
//               {page} / {totalPages}
//             </span>
//             <button
//               className="ut-page-btn"
//               onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
//               disabled={page === totalPages}
//               aria-label="Next page"
//             >
//               <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
//                 <path
//                   d="M6 3l5 5-5 5"
//                   stroke="currentColor"
//                   strokeWidth="1.6"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//               </svg>
//             </button>
//           </div>
//         )}
//       </div>

//       <div style={panelStyle}>
//         <div
//           className="ut-top-scroll"
//           ref={topScrollRef}
//           onScroll={handleTopScroll}
//           style={{
//             borderBottom: `1px solid ${theme.border}`,
//             borderRadius: "14px 14px 0 0",
//           }}
//         >
//           <div style={{ width: tableWidth, height: 1 }} />
//         </div>
//         <div
//           className={`ut-scroll-area${isScrolled ? " ut-scroll-area--scrolled" : ""}`}
//           ref={scrollRef}
//           onScroll={handleScroll}
//           style={{ borderRadius: "0 0 14px 14px" }}
//         >
//           <table className="ut-table" ref={tableRef}>
//             <thead>
//               <tr>
//                 <th
//                   className="ut-th ut-th-sticky"
//                   style={{
//                     ...thStyle,
//                     left: STICKY_COL_LEFT[0],
//                     width: STICKY_COL_WIDTH[0],
//                     minWidth: STICKY_COL_WIDTH[0],
//                   }}
//                 >
//                   No.
//                 </th>
//                 {FIELD_DEFS.map((def) => (
//                   <th
//                     key={def.key}
//                     className={`ut-th${def.sticky ? " ut-th-sticky" : ""}${def.sticky === 2 ? " ut-sticky-shadow" : ""}`}
//                     style={
//                       def.sticky
//                         ? {
//                             ...thStyle,
//                             left: STICKY_COL_LEFT[def.sticky],
//                             width: STICKY_COL_WIDTH[def.sticky],
//                             minWidth: STICKY_COL_WIDTH[def.sticky],
//                           }
//                         : thStyle
//                     }
//                   >
//                     {def.label}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {pagedRows.map((r, idx) => (
//                 <tr
//                   className="ut-tr"
//                   key={`${r.accident_id}-${idx}`}
//                   onClick={() => onRowClick(r)}
//                   tabIndex={0}
//                   role="button"
//                   aria-label={`View full details for ${r.accident_id}`}
//                   style={{
//                     "--hover-bg": theme.hover,
//                     "--row-border": theme.rowBorder,
//                     "--sticky-bg": "#fff",
//                   }}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter" || e.key === " ") {
//                       e.preventDefault();
//                       onRowClick(r);
//                     }
//                   }}
//                 >
//                   <td
//                     className="ut-td ut-td-sticky"
//                     data-label="No."
//                     style={{
//                       left: STICKY_COL_LEFT[0],
//                       width: STICKY_COL_WIDTH[0],
//                       minWidth: STICKY_COL_WIDTH[0],
//                       background: "var(--sticky-bg, #fff)",
//                     }}
//                   >
//                     <span className="ut-row-no">
//                       {(page - 1) * pageSize + idx + 1}
//                     </span>
//                   </td>
//                   {FIELD_DEFS.map((def) => {
//                     const isList = def.isList;
//                     const listValue = isList ? r[def.key] : null;
//                     const displayValue = fieldDisplayValue(r, def);
//                     return (
//                       <td
//                         key={def.key}
//                         className={`ut-td${def.sticky ? " ut-td-sticky" : ""}${def.sticky === 2 ? " ut-sticky-shadow" : ""}${def.isDate || def.isTime || def.key === "prepared_by" ? " ut-ts" : ""}`}
//                         data-label={def.label}
//                         title={!isList && !def.badge ? displayValue : undefined}
//                         style={
//                           def.sticky
//                             ? {
//                                 left: STICKY_COL_LEFT[def.sticky],
//                                 width: STICKY_COL_WIDTH[def.sticky],
//                                 minWidth: STICKY_COL_WIDTH[def.sticky],
//                                 background: "var(--sticky-bg, #fff)",
//                               }
//                             : undefined
//                         }
//                       >
//                         {isList ? (
//                           listValue.length > 0 ? (
//                             <div
//                               className="ut-tag-row"
//                               title={joinList(listValue)}
//                             >
//                               {listValue.map((v, i) => (
//                                 <span
//                                   className={`ut-tag${def.tag === "injury" ? " ut-tag--injury" : ""}`}
//                                   key={i}
//                                 >
//                                   {v}
//                                 </span>
//                               ))}
//                             </div>
//                           ) : (
//                             "—"
//                           )
//                         ) : def.badge ? (
//                           <span className="ut-dept-badge">{displayValue}</span>
//                         ) : def.sticky ? (
//                           <span
//                             className={`ut-truncate${def.sticky === 1 ? " ut-acid" : " ut-truncate--name"}`}
//                             style={{
//                               maxWidth: STICKY_COL_WIDTH[def.sticky] - 28,
//                             }}
//                           >
//                             {displayValue}
//                           </span>
//                         ) : (
//                           <span
//                             className={`ut-truncate${def.key === "employee_name" ? " ut-truncate--name" : ""}`}
//                           >
//                             {displayValue}
//                           </span>
//                         )}
//                       </td>
//                     );
//                   })}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </section>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    MINI HORIZONTAL BAR  (dashboard)
//    ════════════════════════════════════════════════════════════════════════ */

// function HBar({ label, value, max, color = "#185FA5", count }) {
//   const pct = max > 0 ? Math.round((value / max) * 100) : 0;
//   return (
//     <div className="db-bar-row">
//       <span className="db-bar-label" title={label}>
//         {label}
//       </span>
//       <div className="db-bar-track">
//         <div
//           className="db-bar-fill"
//           style={{ width: `${pct}%`, background: color }}
//         />
//       </div>
//       <span className="db-bar-count">{count ?? value}</span>
//     </div>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    DONUT CHART  (dashboard)
//    ════════════════════════════════════════════════════════════════════════ */

// function Donut({ segments, size = 110 }) {
//   const cx = size / 2;
//   const cy = size / 2;
//   const r = 38;
//   const strokeW = 16;
//   const circ = 2 * Math.PI * r;

//   // Coerce every count to a safe integer — guards against undefined / null / NaN
//   const safe = (segments || []).map((seg) => ({
//     ...seg,
//     n: Math.max(0, parseInt(seg.count, 10) || 0),
//   }));
//   const total = safe.reduce((acc, seg) => acc + seg.n, 0);

//   // Compute arc geometry
//   let cumDash = 0;
//   const arcs = safe.map((seg) => {
//     const dash = total > 0 ? (seg.n / total) * circ : 0;
//     const gap = circ - dash;
//     // circ/4 offsets the start to 12-o'clock (SVG arcs begin at 3-o'clock)
//     const offset = circ / 4 - cumDash;
//     cumDash += dash;
//     return { color: seg.color, dash, gap, offset };
//   });

//   const displayTotal = total > 0 ? String(total) : "0";

//   return (
//     <svg
//       width={size}
//       height={size}
//       viewBox={`0 0 ${size} ${size}`}
//       aria-hidden="true"
//       style={{ overflow: "visible" }}
//     >
//       {/* Background ring */}
//       <circle
//         cx={cx}
//         cy={cy}
//         r={r}
//         fill="none"
//         stroke="#EEF2F8"
//         strokeWidth={strokeW}
//       />
//       {/* Coloured arcs */}
//       {arcs.map((arc, i) =>
//         arc.dash > 0.01 ? (
//           <circle
//             key={i}
//             cx={cx}
//             cy={cy}
//             r={r}
//             fill="none"
//             stroke={arc.color}
//             strokeWidth={strokeW}
//             strokeDasharray={`${arc.dash} ${arc.gap}`}
//             strokeDashoffset={arc.offset}
//           />
//         ) : null,
//       )}
//       {/* Centre total — use foreignObject so React handles the string, not SVG text */}
//       <text
//         x={cx}
//         y={cy + 5}
//         textAnchor="middle"
//         fontSize="15"
//         fontWeight="700"
//         fill="#0B1F3A"
//         fontFamily="IBM Plex Mono, monospace"
//       >
//         {displayTotal}
//       </text>
//     </svg>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    SPARKLINE  (monthly trend)
//    ════════════════════════════════════════════════════════════════════════ */

// function Sparkline({ data }) {
//   const max = Math.max(...data.map((d) => d.count), 1);
//   return (
//     <div className="db-spark">
//       {data.map((d, i) => (
//         <div key={i} className="db-spark-col">
//           <div className="db-spark-bar-wrap">
//             <div
//               className="db-spark-bar"
//               style={{ height: `${Math.round((d.count / max) * 100)}%` }}
//               title={`${d.label}: ${d.count}`}
//             />
//           </div>
//           <div className="db-spark-label">{d.label}</div>
//         </div>
//       ))}
//     </div>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    DASHBOARD ICONS
//    ════════════════════════════════════════════════════════════════════════ */

// function IconChip({ color, bg, children }) {
//   return (
//     <span className="db-icon-chip" style={{ color, background: bg }}>
//       {children}
//     </span>
//   );
// }

// const ICONS = {
//   total: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <path
//         d="M2 13.5V6.5M6.5 13.5V2.5M11 13.5V9M15 13.5V4.5"
//         stroke="currentColor"
//         strokeWidth="1.7"
//         strokeLinecap="round"
//       />
//     </svg>
//   ),
//   injury: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <path
//         d="M8 14s-5.5-3.36-5.5-7.2C2.5 4.4 4.4 2.8 6.4 2.8c.9 0 1.76.4 2.35 1.06.6-.66 1.45-1.06 2.35-1.06 2 0 3.9 1.6 3.9 4 0 3.84-5.5 7.2-5.5 7.2h-1z"
//         stroke="currentColor"
//         strokeWidth="1.5"
//         strokeLinejoin="round"
//       />
//     </svg>
//   ),
//   damage: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <path
//         d="M2 8l3-5 2 3 1.5-2.5L11 8l3-5 .5 10.5h-13L2 8z"
//         stroke="currentColor"
//         strokeWidth="1.5"
//         strokeLinejoin="round"
//         strokeLinecap="round"
//       />
//     </svg>
//   ),
//   location: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <path
//         d="M8 15s5-4.7 5-8.7A5 5 0 003 6.3C3 10.3 8 15 8 15z"
//         stroke="currentColor"
//         strokeWidth="1.5"
//         strokeLinejoin="round"
//       />
//       <circle cx="8" cy="6.3" r="1.8" stroke="currentColor" strokeWidth="1.5" />
//     </svg>
//   ),
//   shifts: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.5" />
//       <path
//         d="M8 4.5V8l2.6 1.5"
//         stroke="currentColor"
//         strokeWidth="1.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   ),
//   chart: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <path
//         d="M2 13.5V6.5M6.5 13.5V2.5M11 13.5V9M15 13.5V4.5"
//         stroke="currentColor"
//         strokeWidth="1.7"
//         strokeLinecap="round"
//       />
//     </svg>
//   ),
//   donut: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2.6" />
//     </svg>
//   ),
//   trend: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <path
//         d="M1.5 12.5l4-4.5 3 2.5 5.5-7"
//         stroke="currentColor"
//         strokeWidth="1.6"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M11 3.5h3v3"
//         stroke="currentColor"
//         strokeWidth="1.6"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   ),
//   dept: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <rect
//         x="2.5"
//         y="2"
//         width="6"
//         height="12"
//         stroke="currentColor"
//         strokeWidth="1.5"
//       />
//       <rect
//         x="8.5"
//         y="6"
//         width="5"
//         height="8"
//         stroke="currentColor"
//         strokeWidth="1.5"
//       />
//       <path
//         d="M4.5 4.5h2M4.5 7h2M4.5 9.5h2"
//         stroke="currentColor"
//         strokeWidth="1.3"
//         strokeLinecap="round"
//       />
//     </svg>
//   ),
//   clock: (
//     <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//       <circle cx="8" cy="8.5" r="5.7" stroke="currentColor" strokeWidth="1.5" />
//       <path
//         d="M8 5.3V8.5l2.2 1.3"
//         stroke="currentColor"
//         strokeWidth="1.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M6 1.5h4"
//         stroke="currentColor"
//         strokeWidth="1.5"
//         strokeLinecap="round"
//       />
//     </svg>
//   ),
// };

// /* ════════════════════════════════════════════════════════════════════════
//    DASHBOARD VIEW
//    ════════════════════════════════════════════════════════════════════════ */

// function DashboardView({ allRows, filters }) {
//   const stats = useMemo(() => {
//     const filtered = allRows.filter((r) =>
//       matchesDateFilter(r.date_of_event, filters),
//     );

//     const total = filtered.length;
//     const pdCount = filtered.filter(
//       (r) => r._source === "property-damage",
//     ).length;
//     const injuryCount = filtered.filter(
//       (r) =>
//         r.nature_of_injury &&
//         r.nature_of_injury.length > 0 &&
//         r._source !== "property-damage",
//     ).length;

//     // Unique locations
//     const locationSet = new Set(
//       filtered.map((r) => r.location_key).filter(Boolean),
//     );
//     const activeLocations = locationSet.size;

//     // By location (top 6)
//     const locMap = new Map();
//     filtered.forEach((r) => {
//       const lbl = r.location_label || "Unspecified";
//       locMap.set(lbl, (locMap.get(lbl) || 0) + 1);
//     });
//     const byLocation = [...locMap.entries()]
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 6)
//       .map(([label, count]) => ({ label, count }));

//     // By shift
//     const shiftMap = new Map();
//     filtered.forEach((r) => {
//       const s = r.shift && r.shift !== "—" ? r.shift : "Unspecified";
//       shiftMap.set(s, (shiftMap.get(s) || 0) + 1);
//     });
//     const byShift = [...shiftMap.entries()]
//       .sort((a, b) => b[1] - a[1])
//       .map(([label, count]) => ({ label, count }));

//     // By department (top 5)
//     const deptMap = new Map();
//     filtered.forEach((r) => {
//       const d =
//         r.department && r.department !== "—" ? r.department : "Unspecified";
//       deptMap.set(d, (deptMap.get(d) || 0) + 1);
//     });
//     const byDept = [...deptMap.entries()]
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 5)
//       .map(([label, count]) => ({ label, count }));

//     // Nature of injury breakdown (top 5 for donut)
//     const injMap = new Map();
//     filtered.forEach((r) => {
//       (r.nature_of_injury || []).forEach((inj) => {
//         if (inj && inj !== "—") injMap.set(inj, (injMap.get(inj) || 0) + 1);
//       });
//     });
//     const injColors = ["#185FA5", "#E24B4A", "#EF9F27", "#22C55E", "#8B5CF6"];
//     const byInjury = [...injMap.entries()]
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 5)
//       .map(([label, rawCount], i) => ({
//         label,
//         count: Number(rawCount) || 0,
//         color: injColors[i % injColors.length],
//       }));

//     // Monthly trend — last 12 months
//     const now = new Date();
//     const monthBuckets = Array.from({ length: 12 }, (_, i) => {
//       const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
//       return {
//         key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
//         label: d.toLocaleString("en-US", { month: "short" }),
//         count: 0,
//       };
//     });
//     filtered.forEach((r) => {
//       if (!r.date_of_event) return;
//       const d = new Date(r.date_of_event);
//       if (isNaN(d)) return;
//       const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
//       const bucket = monthBuckets.find((b) => b.key === key);
//       if (bucket) bucket.count++;
//     });

//     // Recent 10 rows (newest first)
//     const recent = [...filtered]
//       .filter((r) => r.date_of_event)
//       .sort((a, b) => new Date(b.date_of_event) - new Date(a.date_of_event))
//       .slice(0, 10);

//     return {
//       total,
//       pdCount,
//       injuryCount,
//       activeLocations,
//       byLocation,
//       byShift,
//       byDept,
//       byInjury,
//       monthBuckets,
//       recent,
//     };
//   }, [allRows, filters]);

//   const maxLoc = stats.byLocation[0]?.count || 1;
//   const maxShift = stats.byShift[0]?.count || 1;
//   const maxDept = stats.byDept[0]?.count || 1;

//   const shiftColors = ["#185FA5", "#378ADD", "#85B7EB", "#B5D4F4"];

//   return (
//     <div className="db-shell">
//       {/* ── KPI Row ── */}
//       <div className="db-kpi-row">
//         <div className="db-kpi" style={{ "--kpi-accent": "#185FA5" }}>
//           <div className="db-kpi-top">
//             <div className="db-kpi-label">Total incidents</div>
//             <IconChip color="#185FA5" bg="#E9F1FB">
//               {ICONS.total}
//             </IconChip>
//           </div>
//           <div className="db-kpi-value">{stats.total}</div>
//           <div className="db-kpi-foot">all reported records</div>
//         </div>
//         <div className="db-kpi" style={{ "--kpi-accent": "#C0392B" }}>
//           <div className="db-kpi-top">
//             <div className="db-kpi-label">Injury cases</div>
//             <IconChip color="#C0392B" bg="#FBE6E3">
//               {ICONS.injury}
//             </IconChip>
//           </div>
//           <div className="db-kpi-value" style={{ color: "#C0392B" }}>
//             {stats.injuryCount}
//           </div>
//           <div className="db-kpi-foot">
//             {stats.total > 0
//               ? Math.round((stats.injuryCount / stats.total) * 100)
//               : 0}
//             % of total
//           </div>
//         </div>
//         <div className="db-kpi" style={{ "--kpi-accent": "#854F0B" }}>
//           <div className="db-kpi-top">
//             <div className="db-kpi-label">Property damage</div>
//             <IconChip color="#854F0B" bg="#FEF3C7">
//               {ICONS.damage}
//             </IconChip>
//           </div>
//           <div className="db-kpi-value" style={{ color: "#854F0B" }}>
//             {stats.pdCount}
//           </div>
//           <div className="db-kpi-foot">
//             {stats.total > 0
//               ? Math.round((stats.pdCount / stats.total) * 100)
//               : 0}
//             % of total
//           </div>
//         </div>
//         <div className="db-kpi" style={{ "--kpi-accent": "#14487A" }}>
//           <div className="db-kpi-top">
//             <div className="db-kpi-label">Active locations</div>
//             <IconChip color="#14487A" bg="#E9F1FB">
//               {ICONS.location}
//             </IconChip>
//           </div>
//           <div className="db-kpi-value" style={{ color: "#14487A" }}>
//             {stats.activeLocations}
//           </div>
//           <div className="db-kpi-foot">work areas with reports</div>
//         </div>
//         <div className="db-kpi" style={{ "--kpi-accent": "#0F766E" }}>
//           <div className="db-kpi-top">
//             <div className="db-kpi-label">Shifts recorded</div>
//             <IconChip color="#0F766E" bg="#CCFBF1">
//               {ICONS.shifts}
//             </IconChip>
//           </div>
//           <div className="db-kpi-value" style={{ color: "#0F766E" }}>
//             {stats.byShift.length}
//           </div>
//           <div className="db-kpi-foot">distinct shift groups</div>
//         </div>
//       </div>

//       {/* ── Mid row: location bars + nature of injury donut ── */}
//       <div className="db-mid">
//         <div className="db-card" style={{ "--card-accent": "#185FA5" }}>
//           <div className="db-card-title">
//             <IconChip color="#185FA5" bg="#E9F1FB">
//               {ICONS.location}
//             </IconChip>
//             Incidents by location
//             <span className="db-card-sub">top {stats.byLocation.length}</span>
//           </div>
//           {stats.byLocation.length === 0 ? (
//             <div className="db-empty-note">No data for this period.</div>
//           ) : (
//             stats.byLocation.map((item) => (
//               <HBar
//                 key={item.label}
//                 label={item.label}
//                 value={item.count}
//                 max={maxLoc}
//                 count={item.count}
//               />
//             ))
//           )}
//         </div>

//         <div className="db-card" style={{ "--card-accent": "#E24B4A" }}>
//           <div className="db-card-title">
//             <IconChip color="#E24B4A" bg="#FBE6E3">
//               {ICONS.donut}
//             </IconChip>
//             Nature of injury
//           </div>
//           {stats.byInjury.length === 0 ? (
//             <div className="db-empty-note">No injury data for this period.</div>
//           ) : (
//             <div className="db-donut-wrap">
//               <Donut segments={stats.byInjury} />
//               <div className="db-legend">
//                 {stats.byInjury.map((item) => (
//                   <div key={item.label} className="db-legend-item">
//                     <span
//                       className="db-legend-dot"
//                       style={{ background: item.color }}
//                     />
//                     <span className="db-legend-text">{item.label}</span>
//                     <span className="db-legend-count">{item.count}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── Mid row 2: monthly trend + shift + dept ── */}
//       <div className="db-mid">
//         <div className="db-card" style={{ "--card-accent": "#1D9E75" }}>
//           <div className="db-card-title">
//             <IconChip color="#1D9E75" bg="#D8F5EA">
//               {ICONS.trend}
//             </IconChip>
//             Monthly trend
//             <span className="db-card-sub">last 12 months</span>
//           </div>
//           <Sparkline data={stats.monthBuckets} />
//         </div>

//         <div className="db-card" style={{ "--card-accent": "#8B5CF6" }}>
//           <div className="db-card-title">
//             <IconChip color="#8B5CF6" bg="#EDE9FE">
//               {ICONS.clock}
//             </IconChip>
//             By shift
//           </div>
//           {stats.byShift.length === 0 ? (
//             <div className="db-empty-note">No shift data.</div>
//           ) : (
//             stats.byShift.map((item, i) => (
//               <HBar
//                 key={item.label}
//                 label={item.label}
//                 value={item.count}
//                 max={maxShift}
//                 color={shiftColors[i % shiftColors.length]}
//                 count={item.count}
//               />
//             ))
//           )}
//         </div>
//       </div>

//       {/* ── Department breakdown ── */}
//       <div
//         className="db-card db-card--full"
//         style={{ "--card-accent": "#14487A" }}
//       >
//         <div className="db-card-title">
//           <IconChip color="#14487A" bg="#E9F1FB">
//             {ICONS.dept}
//           </IconChip>
//           By department
//           <span className="db-card-sub">top {stats.byDept.length}</span>
//         </div>
//         <div className="db-dept-grid">
//           {stats.byDept.length === 0 ? (
//             <div className="db-empty-note">No department data.</div>
//           ) : (
//             stats.byDept.map((item, i) => (
//               <HBar
//                 key={item.label}
//                 label={item.label}
//                 value={item.count}
//                 max={maxDept}
//                 color={
//                   ["#185FA5", "#378ADD", "#85B7EB", "#1D9E75", "#8B5CF6"][i % 5]
//                 }
//                 count={item.count}
//               />
//             ))
//           )}
//         </div>
//       </div>

//       {/* ── Recent incidents table ── */}
//       <div
//         className="db-card db-card--full"
//         style={{ "--card-accent": "#0B1F3A" }}
//       >
//         <div className="db-card-title">
//           <IconChip color="#0B1F3A" bg="#E9EDF4">
//             {ICONS.chart}
//           </IconChip>
//           Recent incidents
//           <span className="db-card-sub">newest {stats.recent.length}</span>
//         </div>
//         {stats.recent.length === 0 ? (
//           <div className="db-empty-note">No incidents for this period.</div>
//         ) : (
//           <div className="db-recent-scroll">
//             <table className="db-recent-tbl">
//               <thead>
//                 <tr>
//                   <th>Ref no.</th>
//                   <th>Name</th>
//                   <th>Location</th>
//                   <th>Type</th>
//                   <th>Date</th>
//                   <th>Shift</th>
//                   <th>Department</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {stats.recent.map((r, i) => {
//                   const isPd = r._source === "property-damage";
//                   return (
//                     <tr key={`${r.accident_id}-${i}`}>
//                       <td className="db-acid">{r.accident_id}</td>
//                       <td className="db-name">{r.employee_name}</td>
//                       <td>{r.location_label || "—"}</td>
//                       <td>
//                         {isPd ? (
//                           <span className="db-badge db-badge--amber">
//                             Property damage
//                           </span>
//                         ) : r.nature_of_injury?.length > 0 ? (
//                           <span className="db-badge db-badge--red">
//                             {r.nature_of_injury[0]}
//                           </span>
//                         ) : (
//                           <span className="db-badge db-badge--blue">
//                             Near miss
//                           </span>
//                         )}
//                       </td>
//                       <td className="db-mono">{formatDate(r.date_of_event)}</td>
//                       <td>{r.shift !== "—" ? r.shift : "—"}</td>
//                       <td>
//                         {r.department !== "—" ? (
//                           <span className="db-badge db-badge--blue">
//                             {r.department}
//                           </span>
//                         ) : (
//                           "—"
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    MAIN COMPONENT  — unified shell with view toggle
//    ════════════════════════════════════════════════════════════════════════ */

// export default function IncidentDashboard({ filters }) {
//   const [locationRows, setLocationRows] = useState([]);
//   const [pdRows, setPdRows] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [search, setSearch] = useState("");
//   const [expandedRow, setExpandedRow] = useState(null);
//   const [sortDir, setSortDir] = useState("asc");
//   const [view, setView] = useState("dashboard"); // "dashboard" | "table"

//   const resolveFullName = async (username) => {
//     if (!username || username === "—") return username;
//     try {
//       const res = await axios.get(
//         `${config.baseApi}/auth/get-user-by-username`,
//         {
//           params: { user_name: username },
//         },
//       );
//       const user = Array.isArray(res.data) ? res.data[0] : res.data;
//       const fullName = user
//         ? `${user.emp_firstname || ""} ${user.emp_lastname || ""}`.trim()
//         : "";
//       return fullName || username;
//     } catch {
//       return username;
//     }
//   };

//   useEffect(() => {
//     const fetchAll = async () => {
//       try {
//         setLoading(true);
//         setError(null);

//         const reportRes = await axios.get(
//           `${config.baseApi}/accident/get-all-report`,
//         );

//         const withSections = await Promise.all(
//           reportRes.data.map(async (report) => {
//             try {
//               const [section1Res, section3Res] = await Promise.all([
//                 axios.get(`${config.baseApi}/accident/get-section1-by-id`, {
//                   params: { accident_id: report.accident_id },
//                 }),
//                 axios
//                   .get(`${config.baseApi}/accident/get-section3-by-id`, {
//                     params: { accident_id: report.accident_id },
//                   })
//                   .catch(() => ({ data: null })),
//               ]);
//               return {
//                 accident_id: report.accident_id,
//                 section1: section1Res.data,
//                 section3: section3Res.data,
//               };
//             } catch {
//               return {
//                 accident_id: report.accident_id,
//                 section1: [],
//                 section3: null,
//               };
//             }
//           }),
//         );

//         const locationRowsRaw = await Promise.all(
//           withSections.flatMap(({ accident_id, section1, section3 }) => {
//             if (!Array.isArray(section1)) return [];
//             return section1.map(async (s1) => {
//               const { key: location_key, label: location_label } =
//                 normalizeLocation(s1.location);
//               const fullName = await resolveFullName(s1.prepared_by);
//               return {
//                 _source: "location",
//                 accident_id,
//                 location_key,
//                 location_label,
//                 employee_name: s1.name || "—",
//                 chapa_number: s1.chapa_number || "—",
//                 date_of_event: s1.date_of_event || null,
//                 time_of_event: s1.time_of_event || null,
//                 job_designation: s1.job_designation || "—",
//                 subtypes: parseNatureOfInjury(
//                   section3?.mechanism_of_injury || "",
//                 ).filter((v) => !v.toLowerCase().startsWith("other")),
//                 specific_location: s1.specific_location || "—",
//                 level: s1.level || "—",
//                 date_reported: s1.date_reported || null,
//                 time_reported: s1.time_reported || null,
//                 shift: s1.shift || "—",
//                 department_head: s1.department_head || "—",
//                 section_head: s1.section_head || "—",
//                 supervisor_reported_to: s1.supervisor_reported_to || "—",
//                 nature_of_injury: parseSubtypes(
//                   s1.accident_incident_subtype || s1.subtype || "",
//                 ),
//                 ongoing_activity: s1.incident_accident_brief_description || "—",
//                 safety_inspector_on_duty: fullName || "—",
//                 group: s1.group || "—",
//                 department: s1.department || "—",
//                 section: s1.section || "—",
//                 prepared_by: fullName || "—",
//               };
//             });
//           }),
//         );
//         setLocationRows(locationRowsRaw);

//         const pdFlat = [];
//         withSections.forEach(({ accident_id, section1, section3 }) => {
//           if (!Array.isArray(section1)) return;
//           section1.forEach((s1) => {
//             const subtypes = parseSubtypes(
//               s1.accident_incident_subtype || s1.subtype || "",
//             );
//             if (!isPropertyDamage(subtypes)) return;
//             pdFlat.push({
//               _source: "property-damage",
//               location_key: "property-damage",
//               location_label: "Property Damage",
//               accident_id,
//               employee_name: s1.name || "—",
//               chapa_number: s1.chapa_number || "—",
//               date_of_event: s1.date_of_event || null,
//               time_of_event: s1.time_of_event || null,
//               job_designation: s1.job_designation || "—",
//               subtypes,
//               specific_location: s1.specific_location || "—",
//               level: s1.level || "—",
//               date_reported: s1.date_reported || null,
//               time_reported: s1.time_reported || null,
//               shift: s1.shift || "—",
//               department_head: s1.department_head || "—",
//               section_head: s1.section_head || "—",
//               supervisor_reported_to: s1.supervisor_reported_to || "—",
//               nature_of_injury: parseNatureOfInjury(
//                 section3?.nature_of_injury || "",
//               ),
//               ongoing_activity: s1.ongoing_activity || "—",
//               safety_inspector_on_duty: s1.safety_inspector_on_duty || "—",
//               group: s1.group || "—",
//               department: s1.department || "—",
//               section: s1.section || "—",
//               prepared_by: s1.prepared_by || "—",
//             });
//           });
//         });
//         setPdRows(pdFlat);
//       } catch (err) {
//         console.log("UNABLE TO FETCH REPORTS:", err);
//         setError("Failed to load reports. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAll();
//   }, []);

//   const allRows = useMemo(
//     () => [...locationRows, ...pdRows],
//     [locationRows, pdRows],
//   );

//   const matchesSearch = (r, q) =>
//     !q ||
//     r.accident_id?.toLowerCase().includes(q) ||
//     r.employee_name?.toLowerCase().includes(q) ||
//     r.chapa_number?.toLowerCase().includes(q) ||
//     r.department?.toLowerCase().includes(q) ||
//     r.group?.toLowerCase().includes(q) ||
//     r.section?.toLowerCase().includes(q) ||
//     r.prepared_by?.toLowerCase().includes(q);

//   const sortRows = useCallback(
//     (arr) =>
//       [...arr].sort((a, b) => {
//         const av = `${a.date_of_event || ""}T${a.time_of_event || ""}`;
//         const bv = `${b.date_of_event || ""}T${b.time_of_event || ""}`;
//         const cmp = av < bv ? -1 : av > bv ? 1 : 0;
//         return sortDir === "asc" ? cmp : -cmp;
//       }),
//     [sortDir],
//   );

//   const groupedLocationRows = useMemo(() => {
//     const q = search.toLowerCase().trim();
//     const groups = new Map();
//     locationRows.forEach((r) => {
//       if (!matchesSearch(r, q)) return;
//       if (!matchesDateFilter(r.date_of_event, filters)) return;
//       if (!groups.has(r.location_key))
//         groups.set(r.location_key, {
//           key: r.location_key,
//           label: r.location_label,
//           rows: [],
//         });
//       groups.get(r.location_key).rows.push(r);
//     });
//     return [...groups.values()]
//       .sort((a, b) => a.label.localeCompare(b.label))
//       .map((g) => ({ ...g, rows: sortRows(g.rows) }));
//   }, [locationRows, search, sortDir, filters]);

//   const filteredPdRows = useMemo(() => {
//     const q = search.toLowerCase().trim();
//     return sortRows(
//       pdRows.filter(
//         (r) =>
//           matchesSearch(r, q) && matchesDateFilter(r.date_of_event, filters),
//       ),
//     );
//   }, [pdRows, search, sortDir, filters]);

//   const totalCount =
//     groupedLocationRows.reduce((sum, g) => sum + g.rows.length, 0) +
//     filteredPdRows.length;
//   const totalLocations =
//     groupedLocationRows.length + (filteredPdRows.length > 0 ? 1 : 0);

//   return (
//     <div className="ut-shell">
//       <style>{STYLE_SHEET}</style>

//       {/* ── Unified header ── */}
//       <div className="ut-header">
//         <div>
//           <h1 className="ut-title">
//             {view === "dashboard"
//               ? "Incident Analytics"
//               : "Incidents by Location"}
//           </h1>
//           <p className="ut-sub">
//             {totalCount} record{totalCount !== 1 ? "s" : ""}
//             {view === "table" &&
//               ` · ${totalLocations} section${totalLocations !== 1 ? "s" : ""}`}
//           </p>
//         </div>

//         <div className="ut-header-controls">
//           {/* ── VIEW TOGGLE ── */}
//           <div className="ut-view-toggle" role="group" aria-label="Switch view">
//             <button
//               className={`ut-toggle-btn${view === "dashboard" ? " ut-toggle-btn--active" : ""}`}
//               onClick={() => setView("dashboard")}
//               aria-pressed={view === "dashboard"}
//             >
//               <svg
//                 width="14"
//                 height="14"
//                 viewBox="0 0 16 16"
//                 fill="none"
//                 aria-hidden="true"
//               >
//                 <rect
//                   x="1"
//                   y="1"
//                   width="6"
//                   height="6"
//                   rx="1.5"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                 />
//                 <rect
//                   x="9"
//                   y="1"
//                   width="6"
//                   height="6"
//                   rx="1.5"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                 />
//                 <rect
//                   x="1"
//                   y="9"
//                   width="6"
//                   height="6"
//                   rx="1.5"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                 />
//                 <rect
//                   x="9"
//                   y="9"
//                   width="6"
//                   height="6"
//                   rx="1.5"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                 />
//               </svg>
//               Dashboard
//             </button>
//             <button
//               className={`ut-toggle-btn${view === "table" ? " ut-toggle-btn--active" : ""}`}
//               onClick={() => setView("table")}
//               aria-pressed={view === "table"}
//             >
//               <svg
//                 width="14"
//                 height="14"
//                 viewBox="0 0 16 16"
//                 fill="none"
//                 aria-hidden="true"
//               >
//                 <rect
//                   x="1"
//                   y="1"
//                   width="14"
//                   height="3"
//                   rx="1"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                 />
//                 <rect
//                   x="1"
//                   y="6.5"
//                   width="14"
//                   height="3"
//                   rx="1"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                 />
//                 <rect
//                   x="1"
//                   y="12"
//                   width="14"
//                   height="3"
//                   rx="1"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                 />
//               </svg>
//               Table
//             </button>
//           </div>

//           {/* Table-only controls */}
//           {view === "table" && (
//             <>
//               <div className="ut-sort-wrap">
//                 <span className="ut-sort-label">Sort by date &amp; time</span>
//                 <button
//                   className={`ut-sort-pill${sortDir ? " ut-sort-pill--active" : ""}`}
//                   onClick={() =>
//                     setSortDir((d) => (d === "asc" ? "desc" : "asc"))
//                   }
//                 >
//                   {sortDir === "asc" ? "Oldest first" : "Newest first"}
//                   <svg
//                     width="10"
//                     height="10"
//                     viewBox="0 0 10 10"
//                     fill="none"
//                     style={{
//                       marginLeft: 4,
//                       flexShrink: 0,
//                       transform: sortDir === "desc" ? "rotate(180deg)" : "none",
//                       transition: "transform 0.15s",
//                     }}
//                   >
//                     <path
//                       d="M2 4l3-3 3 3M5 1v8"
//                       stroke="currentColor"
//                       strokeWidth="1.4"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     />
//                   </svg>
//                 </button>
//               </div>
//               <div className="ut-search-wrap">
//                 <svg className="ut-search-icon" viewBox="0 0 16 16" fill="none">
//                   <circle
//                     cx="6.5"
//                     cy="6.5"
//                     r="4.5"
//                     stroke="#5B7290"
//                     strokeWidth="1.4"
//                   />
//                   <line
//                     x1="10"
//                     y1="10"
//                     x2="14"
//                     y2="14"
//                     stroke="#5B7290"
//                     strokeWidth="1.4"
//                     strokeLinecap="round"
//                   />
//                 </svg>
//                 <input
//                   className="ut-search-input"
//                   placeholder="Search by name, ID, department…"
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                 />
//               </div>
//             </>
//           )}
//         </div>
//       </div>

//       {/* ── Body ── */}
//       {loading ? (
//         <div className="ut-panel-bare">
//           <div className="ut-empty">Loading reports…</div>
//         </div>
//       ) : error ? (
//         <div className="ut-panel-bare">
//           <div className="ut-empty ut-empty--error">{error}</div>
//         </div>
//       ) : view === "dashboard" ? (
//         <DashboardView allRows={allRows} filters={filters} />
//       ) : (
//         <>
//           {totalCount === 0 ? (
//             <div className="ut-panel-bare">
//               <div className="ut-empty">
//                 <div style={{ fontWeight: 600, marginBottom: 4 }}>
//                   No reports found
//                 </div>
//                 <div style={{ fontSize: 12 }}>
//                   {locationRows.length === 0 && pdRows.length === 0
//                     ? "There are no reports yet."
//                     : "Try a different search or date range."}
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <>
//               {totalCount > 0 && (
//                 <div className="ut-scroll-hint">
//                   <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
//                     <path
//                       d="M2 8h12M2 8l3-3M2 8l3 3M14 8l-3-3M14 8l-3 3"
//                       stroke="currentColor"
//                       strokeWidth="1.4"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     />
//                   </svg>
//                   Swipe to see more columns · Tap a row for full details
//                 </div>
//               )}
//               {groupedLocationRows.map((g, i) => (
//                 <LocationSection
//                   key={g.key}
//                   label={g.label}
//                   rows={g.rows}
//                   onRowClick={setExpandedRow}
//                   colorIndex={i}
//                 />
//               ))}
//               {filteredPdRows.length > 0 && (
//                 <LocationSection
//                   key="property-damage"
//                   label="Property Damage"
//                   rows={filteredPdRows}
//                   onRowClick={setExpandedRow}
//                   isPropertyDamageSection={true}
//                 />
//               )}
//             </>
//           )}
//         </>
//       )}

//       <RowDrawer row={expandedRow} onClose={() => setExpandedRow(null)} />
//     </div>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    STYLESHEET
//    ════════════════════════════════════════════════════════════════════════ */

// const STYLE_SHEET = `
// @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

// .ut-shell, .ut-shell * { box-sizing: border-box; }
// .ut-shell {
//   font-family: 'Inter', sans-serif;
//   color: #0B1F3A;
//   padding: 32px 36px 60px;
//   background: #F5F8FC;
//   min-height: 100vh;
// }

// /* ── Header ── */
// .ut-header {
//   display: flex; align-items: flex-end; justify-content: space-between;
//   margin-bottom: 22px; padding-bottom: 18px;
//   position: relative; flex-wrap: wrap; gap: 14px;
// }
// .ut-header::after {
//   content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
//   background: linear-gradient(90deg, #14487A 0%, #1E88A8 45%, #2FB68C 75%, transparent 100%);
//   border-radius: 3px;
// }
// .ut-title {
//   font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 32px;
//   margin: 0; letter-spacing: 0.01em;
//   background: linear-gradient(90deg, #0B1F3A, #14487A 60%, #1E88A8);
//   -webkit-background-clip: text; background-clip: text; color: transparent;
// }
// .ut-sub {
//   font-family: 'IBM Plex Mono', monospace; font-size: 11px;
//   color: #14487A; letter-spacing: 0.04em; margin: 6px 0 0; opacity: 0.85;
// }

// /* ── Header controls ── */
// .ut-header-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
// .ut-sort-wrap { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
// .ut-sort-label { font-size: 11.5px; font-weight: 600; color: #5B7290; white-space: nowrap; }
// .ut-sort-pill {
//   display: inline-flex; align-items: center; padding: 5px 12px;
//   border: 1.5px solid #C9D6E8; border-radius: 999px;
//   background: #fff; color: #2C4A6E; font-size: 11.5px; font-weight: 500;
//   font-family: 'Inter', sans-serif; cursor: pointer;
//   box-shadow: 0 1px 2px rgba(11,31,58,0.05);
//   transition: background 0.13s, border-color 0.13s, color 0.13s; white-space: nowrap;
// }
// .ut-sort-pill:hover { background: #E9F1FB; border-color: #1E88A8; }
// .ut-sort-pill--active { background: #14487A; border-color: #14487A; color: #fff; font-weight: 600; }
// .ut-sort-pill--active:hover { background: #0F3560; }

// /* ── View toggle ── */
// .ut-view-toggle {
//   display: inline-flex; border: 1.5px solid #C9D6E8; border-radius: 10px;
//   overflow: hidden; background: #fff;
//   box-shadow: 0 1px 2px rgba(11,31,58,0.05);
// }
// .ut-toggle-btn {
//   display: inline-flex; align-items: center; gap: 6px;
//   padding: 6px 14px; border: none; background: transparent;
//   font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500;
//   color: #5B7290; cursor: pointer;
//   transition: background 0.13s, color 0.13s;
// }
// .ut-toggle-btn:hover { background: #E9F1FB; color: #14487A; }
// .ut-toggle-btn--active { background: #14487A; color: #fff; }
// .ut-toggle-btn--active:hover { background: #0F3560; }
// .ut-toggle-btn + .ut-toggle-btn { border-left: 1.5px solid #C9D6E8; }
// .ut-toggle-btn--active + .ut-toggle-btn { border-left-color: #14487A; }

// /* ── Search ── */
// .ut-search-wrap { position: relative; }
// .ut-search-icon {
//   position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
//   width: 15px; height: 15px; pointer-events: none;
// }
// .ut-search-input {
//   padding: 9px 12px 9px 34px; border: 1.5px solid #C9D6E8; border-radius: 9px;
//   font-size: 13px; font-family: 'Inter', sans-serif;
//   background: #fff; color: #0B1F3A; width: 300px; height: 38px;
//   box-shadow: 0 1px 2px rgba(11,31,58,0.05); outline: none;
//   transition: border-color 0.15s, box-shadow 0.15s;
// }
// .ut-search-input:focus { border-color: #1E88A8; box-shadow: 0 0 0 4px rgba(30,136,168,0.15); }

// /* ── Panel bare ── */
// .ut-panel-bare {
//   background: #fff; border: 1px solid #DCE4F0; border-radius: 14px; overflow: hidden;
//   box-shadow: 0 8px 24px rgba(11,31,58,0.07), 0 1px 3px rgba(11,31,58,0.04);
// }
// .ut-scroll-hint {
//   display: none; align-items: center; gap: 6px;
//   color: #5B7290; font-size: 11.5px; font-weight: 500; margin-bottom: 10px;
// }

// /* ── TABLE VIEW: section + table ── */
// .ut-section { margin-bottom: 28px; }
// .ut-section:last-child { margin-bottom: 0; }
// .ut-section-header {
//   display: flex; align-items: center; justify-content: space-between;
//   gap: 12px; margin-bottom: 10px; flex-wrap: wrap;
// }
// .ut-section-heading { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
// .ut-section-title { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 20px; margin: 0; letter-spacing: 0.01em; }
// .ut-section-count { font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
// .ut-pagination {
//   display: flex; align-items: center; gap: 4px; background: #fff;
//   border: 1.5px solid #C9D6E8; border-radius: 9px; padding: 4px;
//   box-shadow: 0 1px 2px rgba(11,31,58,0.05);
// }
// .ut-page-btn {
//   display: inline-flex; align-items: center; justify-content: center;
//   width: 28px; height: 28px; border: none; border-radius: 6px;
//   background: transparent; color: #14487A; cursor: pointer; padding: 0;
//   transition: background 0.13s, color 0.13s;
// }
// .ut-page-btn:hover:not(:disabled) { background: #14487A; color: #fff; }
// .ut-page-btn:disabled { opacity: 0.3; cursor: default; }
// .ut-page-label {
//   font-family: 'IBM Plex Mono', monospace; font-size: 11px;
//   color: #5B7290; padding: 0 6px; min-width: 44px; text-align: center;
// }
// .ut-scroll-area {
//   overflow-x: auto; overflow-y: auto; max-height: 72vh;
//   -webkit-overflow-scrolling: touch; scrollbar-width: none;
// }
// .ut-scroll-area::-webkit-scrollbar { display: none; }
// .ut-top-scroll {
//   overflow-x: auto; overflow-y: hidden; will-change: scroll-position;
//   -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: #C9D6E8 transparent;
// }
// .ut-tr:last-child .ut-td:first-child { border-bottom-left-radius: 14px; }
// .ut-tr:last-child .ut-td:last-child { border-bottom-right-radius: 14px; }
// .ut-top-scroll::-webkit-scrollbar { height: 6px; }
// .ut-top-scroll::-webkit-scrollbar-thumb { background: #C9D6E8; border-radius: 3px; }
// .ut-top-scroll::-webkit-scrollbar-track { background: transparent; }
// .ut-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 3600px; }
// .ut-th {
//   position: sticky; top: 0; z-index: 2; padding: 13px 18px; text-align: left;
//   font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
//   white-space: nowrap; line-height: 1.3; vertical-align: bottom;
// }
// .ut-th-sticky { z-index: 3; }
// .ut-td {
//   padding: 12px 18px; font-size: 12.5px; border-bottom: 1px solid #EEF2F8;
//   vertical-align: middle; white-space: nowrap; background: #fff; transition: background 0.12s;
// }
// .ut-tr { cursor: pointer; }
// .ut-tr:hover .ut-td { background: var(--hover-bg, #E9F1FB); }
// .ut-tr:hover { --sticky-bg: var(--hover-bg, #E9F1FB); }
// .ut-tr:last-child .ut-td { border-bottom: none; }
// .ut-tr:focus-visible { outline: 2px solid #1E88A8; outline-offset: -2px; }
// .ut-th-sticky, .ut-td-sticky { position: sticky; }
// .ut-td-sticky { z-index: 1; }
// .ut-scroll-area, .ut-top-scroll { touch-action: pan-x pan-y; }
// .ut-th.ut-sticky-shadow, .ut-td.ut-sticky-shadow { box-shadow: none; transition: box-shadow 0.15s ease; }
// .ut-scroll-area--scrolled .ut-th.ut-sticky-shadow,
// .ut-scroll-area--scrolled .ut-td.ut-sticky-shadow { box-shadow: 6px 0 10px -6px rgba(11,31,58,0.22); }
// .ut-acid { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; color: #1E88A8; }
// .ut-ts { color: #5B7290; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
// .ut-row-no { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; color: #5B7290; }
// .ut-truncate { display: block; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
// .ut-truncate--name { max-width: 300px; font-weight: 500; }
// .ut-dept-badge {
//   display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 5px;
//   font-size: 11px; font-weight: 600; background: #E9F1FB; color: #14487A; white-space: nowrap;
// }
// .ut-tag-row { display: flex; flex-wrap: wrap; gap: 3px; white-space: normal; max-width: 280px; }
// .ut-tag-row--drawer { max-width: none; }
// .ut-tag {
//   display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px;
//   font-size: 11px; font-weight: 600; background: #E9F1FB; color: #14487A; white-space: nowrap;
// }
// .ut-tag--injury { background: #FBE6E3; color: #C0392B; }
// .ut-empty { padding: 70px 20px; text-align: center; color: #5B7290; font-size: 13px; }
// .ut-empty--error { color: #C0392B; }

// /* ── Drawer ── */
// .ut-drawer-backdrop {
//   position: fixed; inset: 0; background: rgba(11, 31, 58, 0.35);
//   opacity: 0; pointer-events: none; transition: opacity 0.2s ease; z-index: 40;
// }
// .ut-drawer-backdrop--open { opacity: 1; pointer-events: auto; }
// .ut-drawer {
//   position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 100vw);
//   background: #fff; border-left: 1px solid #DCE4F0;
//   box-shadow: -12px 0 30px -10px rgba(11,31,58,0.2);
//   transform: translateX(100%); transition: transform 0.25s ease; z-index: 41;
//   display: flex; flex-direction: column; font-family: 'Inter', sans-serif; color: #0B1F3A;
// }
// .ut-drawer--open { transform: translateX(0); }
// .ut-drawer-header {
//   display: flex; align-items: flex-start; justify-content: space-between;
//   padding: 20px 22px 16px; border-bottom: 2px solid #DCE4F0; flex-shrink: 0;
// }
// .ut-drawer-eyebrow {
//   font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: 0.1em;
//   text-transform: uppercase; color: #5B7290; margin-bottom: 4px;
// }
// .ut-drawer-acid { font-family: 'IBM Plex Mono', monospace; font-size: 17px; font-weight: 600; color: #1E88A8; }
// .ut-drawer-close {
//   border: none; background: #EDF2F9; color: #14487A; width: 30px; height: 30px;
//   border-radius: 7px; display: flex; align-items: center; justify-content: center;
//   cursor: pointer; flex-shrink: 0; transition: background 0.15s;
// }
// .ut-drawer-close:hover { background: #DCE4F0; }
// .ut-drawer-body { overflow-y: auto; padding: 6px 22px 24px; flex: 1; }
// .ut-kv { padding: 12px 0; border-bottom: 1px solid #EEF2F8; }
// .ut-kv:last-child { border-bottom: none; }
// .ut-kv-label {
//   font-size: 10.5px; font-weight: 700; text-transform: uppercase;
//   letter-spacing: 0.05em; color: #5B7290; margin-bottom: 5px;
// }
// .ut-kv-value { font-size: 13.5px; line-height: 1.45; word-break: break-word; }

// /* ════ DASHBOARD VIEW ════ */
// .db-shell { display: flex; flex-direction: column; gap: 20px; }

// .db-icon-chip {
//   display: inline-flex; align-items: center; justify-content: center;
//   width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
// }

// .db-kpi-row {
//   display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px;
// }
// .db-kpi {
//   position: relative; overflow: hidden;
//   background: linear-gradient(160deg, #ffffff 0%, #F7FAFD 100%);
//   border: 1px solid #DCE4F0; border-radius: 13px;
//   padding: 16px 18px 15px;
//   box-shadow: 0 2px 10px rgba(11,31,58,0.06);
//   transition: transform 0.15s ease, box-shadow 0.15s ease;
// }
// .db-kpi::before {
//   content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3.5px;
//   background: var(--kpi-accent, #185FA5);
// }
// .db-kpi:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(11,31,58,0.11); }
// .db-kpi-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
// .db-kpi-label {
//   font-size: 11px; font-weight: 600; color: #5B7290;
//   text-transform: uppercase; letter-spacing: 0.05em;
// }
// .db-kpi-value {
//   font-family: 'Barlow Condensed', sans-serif; font-size: 34px; font-weight: 700;
//   color: #0B1F3A; line-height: 1;
// }
// .db-kpi-foot {
//   font-size: 10.5px; color: #8194AB; margin-top: 7px; font-weight: 500;
// }

// .db-mid {
//   display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
// }
// .db-card {
//   position: relative;
//   background: linear-gradient(180deg, #ffffff 0%, #FBFCFE 100%);
//   border: 1px solid #DCE4F0;
//   border-top: 3px solid var(--card-accent, #185FA5);
//   border-radius: 14px;
//   padding: 20px 22px 22px;
//   box-shadow: 0 2px 10px rgba(11,31,58,0.06);
// }
// .db-card--full { grid-column: 1 / -1; }
// .db-card-title {
//   font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 700;
//   color: #0B1F3A; margin-bottom: 18px; letter-spacing: 0.01em;
//   display: flex; align-items: center; gap: 10px;
//   padding-bottom: 14px; border-bottom: 1px solid #EEF2F8;
// }
// .db-card-sub {
//   font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #5B7290;
//   font-weight: 500; margin-left: auto;
//   background: #F0F4FA; padding: 2px 9px; border-radius: 999px;
// }
// .db-empty-note { font-size: 12.5px; color: #5B7290; padding: 16px 0; }

// /* Bar rows */
// .db-bar-row {
//   display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
// }
// .db-bar-row:last-child { margin-bottom: 0; }
// .db-bar-label {
//   font-size: 12px; color: #2C4A6E; width: 120px; flex-shrink: 0; font-weight: 500;
//   overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
// }
// .db-bar-track {
//   flex: 1; height: 9px; background: #EEF2F8; border-radius: 5px; overflow: hidden;
//   border: 1px solid #E3E9F2;
// }
// .db-bar-fill { height: 100%; border-radius: 5px; transition: width 0.4s ease; }
// .db-bar-count {
//   font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; color: #5B7290;
//   min-width: 26px; text-align: right;
//   background: #F0F4FA; border-radius: 5px; padding: 1px 5px;
// }

// /* Donut */
// .db-donut-wrap { display: flex; align-items: center; gap: 22px; }
// .db-legend { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; }
// .db-legend-item {
//   display: flex; align-items: center; gap: 8px; font-size: 12px; color: #2C4A6E;
//   padding: 6px 9px; background: #F7FAFD; border: 1px solid #EEF2F8; border-radius: 8px;
// }
// .db-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
// .db-legend-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
// .db-legend-count { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; color: #5B7290; flex-shrink: 0; }

// /* Sparkline */
// .db-spark {
//   display: flex; align-items: flex-end; gap: 6px; height: 90px;
//   padding: 10px 8px 0; background: #F7FAFD; border: 1px solid #EEF2F8; border-radius: 10px;
// }
// .db-spark-col { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
// .db-spark-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
// .db-spark-bar {
//   width: 100%; background: linear-gradient(180deg, #1E88A8, #185FA5); border-radius: 4px 4px 0 0;
//   min-height: 3px; transition: height 0.3s, background 0.15s;
// }
// .db-spark-bar:hover { background: linear-gradient(180deg, #2FB68C, #1D9E75); }
// .db-spark-label {
//   font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #5B7290;
//   margin-top: 5px; text-align: center;
// }

// /* Dept grid */
// .db-dept-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 32px; }

// /* Recent table */
// .db-recent-scroll {
//   overflow-x: auto; border: 1px solid #EEF2F8; border-radius: 10px;
// }
// .db-recent-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
// .db-recent-tbl thead th {
//   padding: 10px 12px; text-align: left;
//   font-size: 10px; font-weight: 700; text-transform: uppercase;
//   letter-spacing: 0.05em; color: #5B7290; white-space: nowrap;
//   background: #F7FAFD; border-bottom: 2px solid #EEF2F8;
// }
// .db-recent-tbl tbody tr { border-bottom: 1px solid #EEF2F8; }
// .db-recent-tbl tbody tr:last-child { border-bottom: none; }
// .db-recent-tbl tbody tr:nth-child(even) td { background: #FBFCFE; }
// .db-recent-tbl tbody tr:hover td { background: #EAF2FC; }
// .db-recent-tbl td { padding: 10px 12px; vertical-align: middle; white-space: nowrap; transition: background 0.12s; }
// .db-acid { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; color: #1E88A8; }
// .db-name { font-weight: 500; }
// .db-mono { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: #5B7290; }
// .db-badge {
//   display: inline-flex; align-items: center; padding: 2px 9px;
//   border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap;
// }
// .db-badge--blue { background: #E9F1FB; color: #14487A; border: 1px solid #C9D6E8; }
// .db-badge--red { background: #FBE6E3; color: #C0392B; border: 1px solid #F3C6BE; }
// .db-badge--amber { background: #FEF3C7; color: #854F0B; border: 1px solid #FBE1A0; }

// /* ── Responsive ── */
// @media (max-width: 1024px) {
//   .ut-shell { padding: 24px 20px 50px; }
//   .ut-scroll-hint { display: flex; }
// }
// @media (max-width: 768px) {
//   .db-mid { grid-template-columns: 1fr; }
//   .db-dept-grid { grid-template-columns: 1fr; }
// }
// @media (max-width: 640px) {
//   .ut-shell { padding: 18px 14px 40px; }
//   .ut-header { flex-direction: column; align-items: flex-start; }
//   .ut-title { font-size: 24px; }
//   .ut-search-wrap { width: 100%; }
//   .ut-search-input { width: 100%; }
//   .ut-drawer { width: 100vw; }
//   .ut-scroll-hint { display: none; }
//   .ut-header-controls { width: 100%; flex-direction: column; align-items: flex-start; }
//   .ut-sort-wrap { width: 100%; }
//   .ut-table, .ut-table thead, .ut-table tbody, .ut-table tr, .ut-table td { display: block; width: 100% !important; }
//   .ut-table { min-width: 0; }
//   .ut-table thead { display: none; }
//   .ut-scroll-area { max-height: none; overflow: visible; }
//   .ut-tr {
//     border: 1px solid #DCE4F0; border-radius: 10px;
//     margin-bottom: 12px; padding: 4px 14px; background: #fff;
//   }
//   .ut-tr:hover { background: #fff; }
//   .ut-tr:hover .ut-td { background: #fff; }
//   .ut-panel-bare { border: none; background: transparent; }
//   .ut-td, .ut-td-sticky {
//     position: static; display: flex; align-items: flex-start;
//     justify-content: space-between; gap: 12px; padding: 9px 0;
//     border-bottom: 1px solid #EEF2F8; white-space: normal;
//     text-align: right; box-shadow: none !important; min-width: 0 !important;
//   }
//   .ut-tr .ut-td:last-child { border-bottom: none; }
//   .ut-td::before {
//     content: attr(data-label); flex-shrink: 0; max-width: 46%; text-align: left;
//     font-size: 10px; font-weight: 700; text-transform: uppercase;
//     letter-spacing: 0.05em; color: #5B7290;
//   }
//   .ut-truncate, .ut-truncate--name { max-width: none !important; white-space: normal; text-align: right; }
//   .ut-tag-row { justify-content: flex-end; max-width: none; }
//   .ut-td[data-label="SAIRI Reference No."] { padding: 12px 0 9px; }
//   .ut-td[data-label="SAIRI Reference No."]::before { display: none; }
//   .ut-td[data-label="SAIRI Reference No."] .ut-acid { font-size: 14px; }
//   .ut-section-header { flex-direction: column; align-items: flex-start; }
//   .ut-pagination { align-self: flex-end; }
//   .db-kpi-row { grid-template-columns: repeat(2, 1fr); }
//   .db-bar-label { width: 80px; }
// }
// `;
