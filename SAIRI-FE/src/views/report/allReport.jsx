// import { useEffect, useState, useMemo, useRef } from "react";
// import axios from "axios";
// import config from "config";
// import { useNavigate } from "react-router-dom";
// import FeatherIcon from "feather-icons-react";

// /* ════════════════════════════════════════════════════════════════════════
//    CONSTANTS
//    ════════════════════════════════════════════════════════════════════════ */

// const SUBTYPE_STYLES = {
//   Injury: { bg: "#FAE8E8", color: "#7A1F1F" },
//   "Property Damage": { bg: "#FFF3DC", color: "#7A4900" },
//   "Near Miss": { bg: "#E8F0FA", color: "#1A3A6B" },
//   "High Potential Near Miss": { bg: "#E8F0FA", color: "#1A3A6B" },
//   Illnesses: { bg: "#F0E8FA", color: "#4A1A7A" },
// };

// const DEFAULT_SUBTYPE_STYLE = { bg: "#F0F4F2", color: "#2C4A3E" };

// const LOCATION_COLORS = {
//   underground: "#A78BFA",
//   surface: "#34D399",
// };

// /* ════════════════════════════════════════════════════════════════════════
//    HELPERS
//    ════════════════════════════════════════════════════════════════════════ */

// const formatDate = (dateString) => {
//   if (!dateString) return "N/A";
//   const date = new Date(dateString);
//   if (isNaN(date)) return "N/A";
//   return date.toLocaleString("en-US", {
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// };

// const parseSubtypes = (raw) => {
//   if (!raw) return [];
//   if (Array.isArray(raw)) return raw;
//   return raw
//     .split(",")
//     .map((s) => s.trim())
//     .filter(Boolean);
// };
// const isFalsyFlag = (v) => !v;
// const isTrueFlag = (v) => v === true || v === 1 || v === "1";
// const CORRECTIVE_PREVENTIVE_STATUS = "pending corrective and preventive";

// const isPendingForRole = (row, position, empDepartment, empGroup) => {
//   if (row.ac_status?.toLowerCase().trim() === CORRECTIVE_PREVENTIVE_STATUS) {
//     return true;
//   }
//   const normalized = position
//     ?.toLowerCase()
//     .trim()
//     .replace(/[-\s]+/g, "_");
//   const {
//     is_safety_personnel,
//     is_concerned_department,
//     is_group_manager,
//     is_safety_dh,
//   } = row;

//   switch (normalized) {
//     case "safety_reviewer":
//       return (
//         isFalsyFlag(is_safety_personnel) &&
//         isFalsyFlag(is_concerned_department) &&
//         isFalsyFlag(is_group_manager) &&
//         isFalsyFlag(is_safety_dh)
//       );
//     case "department_reviewer":
//       return (
//         row.ac_status?.toLowerCase().trim() === "pending department closure" ||
//         (
//           isTrueFlag(is_safety_personnel) &&
//           isFalsyFlag(is_concerned_department) &&
//           isFalsyFlag(is_group_manager) &&
//           isFalsyFlag(is_safety_dh) &&
//           row.department?.toLowerCase().trim() ===
//           empDepartment?.toLowerCase().trim()
//         )
//       );
//     case "group_reviewer":
//       return (
//         row.ac_status?.toLowerCase().trim() === "pending group closure" ||
//         (
//           isTrueFlag(is_safety_personnel) &&
//           isTrueFlag(is_concerned_department) &&
//           isFalsyFlag(is_group_manager) &&
//           isFalsyFlag(is_safety_dh) &&
//           row.group?.toLowerCase().trim() === empGroup?.toLowerCase().trim()
//         )
//       );
//     case "safety_head":
//       return (
//         row.ac_status?.toLowerCase().trim() === "pending safety dh closure" ||
//         (
//           isTrueFlag(is_safety_personnel) &&
//           isTrueFlag(is_concerned_department) &&
//           isTrueFlag(is_group_manager) &&
//           isFalsyFlag(is_safety_dh)
//         )
//       );
//     default:
//       return false;
//   }
// };
// const isPending = (row, isSection3Approver, position, empDepartment, empGroup) => {
//   if (isSection3Approver) {
//     return !row.attending_physician || row.attending_physician.trim() === "";
//   }

//   if (row.ac_status?.toLowerCase().trim() === CORRECTIVE_PREVENTIVE_STATUS) {
//     return true;
//   }

//   return isPendingForRole(row, position, empDepartment, empGroup);
// };
// /* ════════════════════════════════════════════════════════════════════════
//    SUB-COMPONENTS
//    ════════════════════════════════════════════════════════════════════════ */

// function SubtypeTag({ label }) {
//   const style = SUBTYPE_STYLES[label] || DEFAULT_SUBTYPE_STYLE;
//   return (
//     <span
//       style={{
//         display: "inline-flex",
//         alignItems: "center",
//         padding: "2px 8px",
//         borderRadius: "999px",
//         fontSize: "11px",
//         fontWeight: 600,
//         background: style.bg,
//         color: style.color,
//         marginRight: "3px",
//         marginBottom: "2px",
//         whiteSpace: "nowrap",
//       }}
//     >
//       {label}
//     </span>
//   );
// }

// function StatCard({ label, value, delta, deltaType, bc, bg, c }) {
//   const deltaColor = deltaType === "warn" ? "#B07000" : "#1B5E44";
//   return (
//     <div
//       style={{
//         background: bg,
//         border: `2px solid ${bc}`,
//         borderRadius: "8px",
//         padding: "14px 18px",
//       }}
//     >
//       <div
//         style={{
//           fontSize: "11px",
//           fontWeight: 700,
//           color: c,
//           textTransform: "uppercase",
//           letterSpacing: "0.05em",
//           marginBottom: "6px",
//         }}
//       >
//         {label}
//       </div>
//       <div
//         style={{
//           fontFamily: "'Barlow Condensed', sans-serif",
//           fontSize: "28px",
//           fontWeight: 700,
//           color: "#0D1B2A",
//           lineHeight: 1,
//         }}
//       >
//         {value}
//       </div>
//       {delta && (
//         <div style={{ fontSize: "11px", marginTop: "4px", color: deltaColor }}>
//           {delta}
//         </div>
//       )}
//     </div>
//   );
// }

// /* ─── Custom Location Dropdown ─── */
// function LocationDropdown({ value, onChange, options, counts, totalCount }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef(null);

//   // Close on outside click
//   useEffect(() => {
//     const handler = (e) => {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   const selectedColor = value ? LOCATION_COLORS[value] || "#5E7A6E" : null;
//   const displayLabel = value || "All Locations";

//   return (
//     <div className="ld-root" ref={ref}>
//       {/* Trigger */}
//       <button
//         className={`ld-trigger${open ? " ld-trigger--open" : ""}${value ? " ld-trigger--active" : ""}`}
//         onClick={() => setOpen((o) => !o)}
//         type="button"
//       >
//         <span className="ld-trigger-left">
//           {/* Filter icon */}
//           <svg
//             width="13"
//             height="13"
//             viewBox="0 0 16 16"
//             fill="none"
//             className="ld-filter-svg"
//           >
//             <path
//               d="M2 4h12M4.5 8h7M7 12h2"
//               stroke="currentColor"
//               strokeWidth="1.6"
//               strokeLinecap="round"
//             />
//           </svg>
//           {value && (
//             <span
//               className="ld-trigger-dot"
//               style={{ background: selectedColor }}
//             />
//           )}
//           <span className="ld-trigger-label">{displayLabel}</span>
//         </span>
//         <span className="ld-trigger-right">
//           {value && (
//             <span
//               className="ld-clear-btn"
//               role="button"
//               tabIndex={0}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onChange("");
//               }}
//               onKeyDown={(e) =>
//                 e.key === "Enter" && (e.stopPropagation(), onChange(""))
//               }
//               title="Clear filter"
//             >
//               <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
//                 <path
//                   d="M1.5 1.5l7 7M8.5 1.5l-7 7"
//                   stroke="currentColor"
//                   strokeWidth="1.5"
//                   strokeLinecap="round"
//                 />
//               </svg>
//             </span>
//           )}
//           <svg
//             width="10"
//             height="10"
//             viewBox="0 0 10 6"
//             fill="none"
//             className={`ld-chevron${open ? " ld-chevron--up" : ""}`}
//           >
//             <path
//               d="M1 1l4 4 4-4"
//               stroke="currentColor"
//               strokeWidth="1.5"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             />
//           </svg>
//         </span>
//       </button>

//       {/* Dropdown panel */}
//       {open && (
//         <div className="ld-panel">
//           <div className="ld-panel-header">Filter by location</div>

//           {/* All option */}
//           <button
//             className={`ld-option${!value ? " ld-option--selected" : ""}`}
//             onClick={() => {
//               onChange("");
//               setOpen(false);
//             }}
//             type="button"
//           >
//             <span className="ld-option-left">
//               <span
//                 className="ld-option-dot"
//                 style={{ background: "#5E7A6E" }}
//               />
//               <span className="ld-option-name">All Locations</span>
//             </span>
//             <span className="ld-option-count">{totalCount}</span>
//           </button>

//           <div className="ld-divider" />

//           {options.map((loc) => {
//             const color = LOCATION_COLORS[loc] || "#5E7A6E";
//             const isSelected = value === loc;
//             return (
//               <button
//                 key={loc}
//                 className={`ld-option${isSelected ? " ld-option--selected" : ""}`}
//                 onClick={() => {
//                   onChange(loc);
//                   setOpen(false);
//                 }}
//                 type="button"
//               >
//                 <span className="ld-option-left">
//                   <span
//                     className="ld-option-dot"
//                     style={{ background: color }}
//                   />
//                   <span className="ld-option-name">{loc}</span>
//                 </span>
//                 <span className="ld-option-count">{counts[loc] ?? 0}</span>
//               </button>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// /* ══════ ADD THIS NEW COMPONENT ══════ */
// const REPORT_FILTER_OPTIONS = [
//   { value: "all", label: "All Reports", dot: "#029616" },
//   { value: "pending", label: "Pending", dot: "#ffae00" },
// ];

// function ReportFilterDropdown({ value, onChange, allCount, pendingCount }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef(null);

//   useEffect(() => {
//     const handler = (e) => {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   const counts = { all: allCount, pending: pendingCount };
//   const current =
//     REPORT_FILTER_OPTIONS.find((o) => o.value === value) ||
//     REPORT_FILTER_OPTIONS[0];
//   const isActive = value === "pending";

//   return (
//     <div className="ld-root" ref={ref}>
//       <button
//         className={`ld-trigger${open ? " ld-trigger--open" : ""}${isActive ? " ld-trigger--active" : ""}`}
//         onClick={() => setOpen((o) => !o)}
//         type="button"
//       >
//         <span className="ld-trigger-left">
//           <svg
//             width="13"
//             height="13"
//             viewBox="0 0 16 16"
//             fill="none"
//             className="ld-filter-svg"
//           >
//             <path
//               d="M2 4h12M4.5 8h7M7 12h2"
//               stroke="currentColor"
//               strokeWidth="1.6"
//               strokeLinecap="round"
//             />
//           </svg>
//           <span
//             className="ld-trigger-dot"
//             style={{ background: current.dot }}
//           />
//           <span className="ld-trigger-label">{current.label}</span>
//         </span>
//         <span className="ld-trigger-right">
//           <svg
//             width="10"
//             height="10"
//             viewBox="0 0 10 6"
//             fill="none"
//             className={`ld-chevron${open ? " ld-chevron--up" : ""}`}
//           >
//             <path
//               d="M1 1l4 4 4-4"
//               stroke="currentColor"
//               strokeWidth="1.5"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             />
//           </svg>
//         </span>
//       </button>

//       {open && (
//         <div className="ld-panel">
//           <div className="ld-panel-header">Filter by status</div>
//           {REPORT_FILTER_OPTIONS.map((opt) => {
//             const isSelected = value === opt.value;
//             return (
//               <button
//                 key={opt.value}
//                 className={`ld-option${isSelected ? " ld-option--selected" : ""}`}
//                 onClick={() => {
//                   onChange(opt.value);
//                   setOpen(false);
//                 }}
//                 type="button"
//               >
//                 <span className="ld-option-left">
//                   <span
//                     className="ld-option-dot"
//                     style={{ background: opt.dot }}
//                   />
//                   <span className="ld-option-name">{opt.label}</span>
//                 </span>
//                 <span className="ld-option-count">{counts[opt.value]}</span>
//               </button>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// function DateRangeDropdown({ from, to, onChange }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef(null);

//   useEffect(() => {
//     const handler = (e) => {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   const hasFilter = !!(from || to);

//   const formatShort = (iso) => {
//     if (!iso) return null;
//     const d = new Date(iso + "T00:00:00");
//     return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
//   };

//   let label = "Any Date";
//   if (from && to) label = `${formatShort(from)} – ${formatShort(to)}`;
//   else if (from) label = `From ${formatShort(from)}`;
//   else if (to) label = `Until ${formatShort(to)}`;

//   const presets = [
//     {
//       label: "Last 7 days",
//       apply: () => {
//         const t = new Date();
//         const f = new Date();
//         f.setDate(f.getDate() - 6);
//         onChange(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10));
//       },
//     },
//     {
//       label: "Last 30 days",
//       apply: () => {
//         const t = new Date();
//         const f = new Date();
//         f.setDate(f.getDate() - 29);
//         onChange(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10));
//       },
//     },
//     {
//       label: "This month",
//       apply: () => {
//         const now = new Date();
//         const f = new Date(now.getFullYear(), now.getMonth(), 1);
//         onChange(f.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
//       },
//     },
//   ];

//   return (
//     <div className="ld-root" ref={ref}>
//       <button
//         className={`ld-trigger${open ? " ld-trigger--open" : ""}${hasFilter ? " ld-trigger--active" : ""}`}
//         onClick={() => setOpen((o) => !o)}
//         type="button"
//       >
//         <span className="ld-trigger-left">
//           <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="ld-filter-svg">
//             <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
//             <path d="M2 6.5h12M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
//           </svg>
//           <span className="ld-trigger-label">{label}</span>
//         </span>
//         <span className="ld-trigger-right">
//           {hasFilter && (
//             <span
//               className="ld-clear-btn"
//               role="button"
//               tabIndex={0}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onChange("", "");
//               }}
//               onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onChange("", ""))}
//               title="Clear date filter"
//             >
//               <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
//                 <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
//               </svg>
//             </span>
//           )}
//           <svg width="10" height="10" viewBox="0 0 10 6" fill="none" className={`ld-chevron${open ? " ld-chevron--up" : ""}`}>
//             <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//           </svg>
//         </span>
//       </button>

//       {open && (
//         <div className="ld-panel ld-panel--date">
//           <div className="ld-panel-header">Filter by date</div>

//           <div className="dr-presets">
//             {presets.map((p) => (
//               <button key={p.label} className="dr-preset-btn" type="button" onClick={p.apply}>
//                 {p.label}
//               </button>
//             ))}
//           </div>

//           <div className="ld-divider" />

//           <div className="dr-fields">
//             <label className="dr-field">
//               <span className="dr-field-label">From</span>
//               <input
//                 type="date"
//                 className="dr-field-input"
//                 value={from}
//                 max={to || undefined}
//                 onChange={(e) => onChange(e.target.value, to)}
//               />
//             </label>
//             <label className="dr-field">
//               <span className="dr-field-label">To</span>
//               <input
//                 type="date"
//                 className="dr-field-input"
//                 value={to}
//                 min={from || undefined}
//                 onChange={(e) => onChange(from, e.target.value)}
//               />
//             </label>
//           </div>

//           <div className="dr-actions">
//             <button
//               className="dr-clear-all"
//               type="button"
//               onClick={() => onChange("", "")}
//               disabled={!hasFilter}
//             >
//               Clear
//             </button>
//             <button className="dr-done" type="button" onClick={() => setOpen(false)}>
//               Done
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    MAIN COMPONENT
//    ════════════════════════════════════════════════════════════════════════ */

// export default function AllReport() {
//   const [flattenedData, setFlattenedData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [search, setSearch] = useState("");
//   const [sortField, setSortField] = useState("date_and_time");
//   const [sortDir, setSortDir] = useState("desc");
//   const [page, setPage] = useState(1);
//   const [locationFilter, setLocationFilter] = useState("");
//   const [reportFilter, setReportFilter] = useState("pending");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [empInfo, setEmpInfo] = useState({});

//   // ← declare these BEFORE the useMemos that depend on them
//   const [section3Approval, setSection3Approval] = useState({
//     departmentIds: [],
//     positions: [],
//   });
//   const [groupList, setGroupList] = useState([]);

//   const normalizePosition = (p) =>
//     p
//       ?.toLowerCase()
//       .trim()
//       .replace(/[-\s]+/g, "_");
//   const empPosition = normalizePosition(empInfo.emp_position);
//   const empDeptName = empInfo.emp_department;
//   const empGroupName = empInfo.emp_group;

//   const empDeptId = useMemo(() => {
//     if (!empDeptName) return null;
//     const norm = (s) => s?.toLowerCase().trim();
//     for (const g of groupList) {
//       if (empGroupName && norm(g.group) !== norm(empGroupName)) continue;
//       const match = g.departments.find(
//         (d) => norm(d.department) === norm(empDeptName),
//       );
//       if (match) return match.id;
//     }
//     return null;
//   }, [groupList, empDeptName, empGroupName]);

//   const isSection3Approver = useMemo(() => {
//     return (
//       !!empPosition &&
//       empDeptId !== null &&
//       section3Approval.departmentIds.includes(empDeptId) &&
//       section3Approval.positions.some(
//         (p) => normalizePosition(p) === empPosition,
//       )
//     );
//   }, [empPosition, empDeptId, section3Approval]);

//   useEffect(() => {
//     if (isSection3Approver) {
//       console.log("HAS ACCESS TO THE SECTION 3", {
//         empPosition,
//         empDeptId,
//         empDeptName,
//         section3ApprovalDeptIds: section3Approval.departmentIds,
//         section3ApprovalPositions: section3Approval.positions,
//       });
//     }
//   }, [isSection3Approver]);

//   useEffect(() => {
//     const multiLocationRoles = [
//       "department_reviewer",
//       "group_reviewer",
//       "safety_head",
//     ];
//     const isMultiLocation = multiLocationRoles.includes(
//       normalizePosition(empInfo.emp_position),
//     );

//     if (isSection3Approver || isMultiLocation) {
//       setLocationFilter(""); // all locations
//     } else {
//       setLocationFilter(empInfo.emp_location || "");
//     }
//   }, [isSection3Approver, empInfo.emp_position, empInfo.emp_location]);

//   const PAGE_SIZE = 10;

//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchAllReports = async () => {
//       const empData = JSON.parse(localStorage.getItem("user")) || {};
//       console.log(empData);
//       setEmpInfo(empData);

//       try {
//         setLoading(true);
//         setError(null);
//         const ReportRes = await axios.get(
//           `${config.baseApi}/accident/get-all-report`,
//         );

//         const reportsWithSection1 = await Promise.all(
//           ReportRes.data.map(async (report) => {
//             try {
//               const [
//                 section1Res,
//                 section3Res,
//                 section46Res,
//                 section7Res,
//                 section8Res,
//               ] = await Promise.all([
//                 axios.get(`${config.baseApi}/accident/get-section1-by-id`, {
//                   params: { accident_id: report.accident_id },
//                 }),
//                 axios
//                   .get(`${config.baseApi}/accident/get-section3-by-id`, {
//                     params: { accident_id: report.accident_id },
//                   })
//                   .catch(() => ({ data: null })),
//                 axios
//                   .get(`${config.baseApi}/accident/get-section46-by-id`, {
//                     params: { accident_id: report.accident_id },
//                   })
//                   .catch(() => ({ data: null })),
//                 axios
//                   .get(`${config.baseApi}/accident/get-section7-by-id`, {
//                     params: { accident_id: report.accident_id },
//                   })
//                   .catch(() => ({ data: null })),
//                 axios
//                   .get(`${config.baseApi}/accident/get-section8-by-id`, {
//                     params: { accident_id: report.accident_id },
//                   })
//                   .catch(() => ({ data: null })),
//               ]);
//               return {
//                 ...report,
//                 section1: section1Res.data,
//                 section3: section3Res.data,
//               };
//             } catch {
//               return { ...report, section1: [], section3: null };
//             }
//           }),
//         );

//         const flat = [];
//         reportsWithSection1.forEach((report) => {
//           if (report.section1?.length > 0) {
//             report.section1.forEach((section) => {
//               flat.push({
//                 accident_id: report.accident_id,
//                 ac_status: report.ac_status || null,
//                 is_safety_personnel: report.is_safety_personnel,
//                 is_concerned_department: report.is_concerned_department,
//                 is_group_manager: report.is_group_manager,
//                 is_safety_dh: report.is_safety_dh,
//                 attending_physician:
//                   report.section3?.attending_physicians_name_and_signature ??
//                   null, // ← add this line

//                 name: section.name || "N/A",
//                 department: section.department || "N/A",
//                 group: section.group || "N/A",
//                 prepared_by: section.prepared_by || "N/A",
//                 date_and_time: section.date_and_time || null,
//                 subtypes: parseSubtypes(
//                   section.subtypes || section.subtype || "",
//                 ),
//                 location: section.location || "N/A",
//                 specific_location: section.specific_location || "N/A",
//               });
//             });
//           }
//         });

//         setFlattenedData(flat);
//       } catch {
//         setError("Failed to load reports. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAllReports();
//   }, []);
//   useEffect(() => {
//     const fetchSetup = async () => {
//       try {
//         const [approversRes, groupsRes] = await Promise.all([
//           axios.get(
//             `${config.baseApi}/setup/permissions/section_three_approvers`,
//           ),
//           axios.get(`${config.baseApi}/setup/all`),
//         ]);
//         if (approversRes.data.message === "success") {
//           setSection3Approval(approversRes.data.data);
//         }
//         if (groupsRes.data.message === "success") {
//           setGroupList(groupsRes.data.data);
//         }
//       } catch (err) {
//         console.error("Failed to fetch setup data:", err);
//       }
//     };
//     fetchSetup();
//   }, []);

//   /* ─── Derived stats ─── */
//   const stats = useMemo(() => {
//     const total = flattenedData.length;
//     const open = flattenedData.filter(
//       (r) => r.ac_status?.toLowerCase() === "open",
//     ).length;
//     const resolved = flattenedData.filter(
//       (r) => r.ac_status?.toLowerCase() === "resolved",
//     ).length;
//     return { total, open, resolved };
//   }, [flattenedData]);

//   /* ─── Location options + per-location counts ─── */
//   const locationOptions = useMemo(() => {
//     const locs = flattenedData
//       .map((r) => r.location)
//       .filter((l) => l && l !== "N/A");
//     return [...new Set(locs)].sort();
//   }, [flattenedData]);

//   const locationCounts = useMemo(() => {
//     const counts = {};
//     flattenedData.forEach((r) => {
//       if (r.location && r.location !== "N/A")
//         counts[r.location] = (counts[r.location] || 0) + 1;
//     });
//     return counts;
//   }, [flattenedData]);
//   useEffect(() => {
//     if (flattenedData.length > 0 && empInfo.emp_position) {
//       console.log("=== DEBUG ===");
//       console.log("emp_position raw:", empInfo.emp_position);
//       console.log(
//         "emp_position normalized:",
//         normalizePosition(empInfo.emp_position),
//       );
//       console.log("isSection3Approver:", isSection3Approver);
//       console.log("Sample row flags:", flattenedData[0]);

//       const pending = flattenedData.filter((r) =>
//         isPendingForRole(r, empInfo.emp_position),
//       );
//       console.log("Pending count:", pending.length);
//       console.log(
//         "Rows where is_safety_personnel === true:",
//         flattenedData.filter((r) => r.is_safety_personnel === true).length,
//       );
//       console.log(
//         "Rows where is_concerned_department is falsy:",
//         flattenedData.filter((r) => isFalsyFlag(r.is_concerned_department))
//           .length,
//       );
//       console.log(
//         "Rows matching dept-reviewer rule:",
//         flattenedData.filter(
//           (r) =>
//             r.is_safety_personnel === true &&
//             isFalsyFlag(r.is_concerned_department) &&
//             isFalsyFlag(r.is_group_manager) &&
//             isFalsyFlag(r.is_safety_dh),
//         ).length,
//       );
//     }
//   }, [flattenedData, empInfo.emp_position, isSection3Approver]);

//   const pendingCount = useMemo(() => {
//     return flattenedData.filter((r) =>
//       isPending(
//         r,
//         isSection3Approver,
//         empInfo.emp_position,
//         empInfo.emp_department,
//         empInfo.emp_group,
//       ),
//     ).length;
//   }, [
//     flattenedData,
//     empInfo.emp_position,
//     empInfo.emp_department,
//     empInfo.emp_group,
//     isSection3Approver,
//   ]);

//   /* ─── Filtered + sorted ─── */
//   const filtered = useMemo(() => {
//     const q = search.toLowerCase();
//     const fromTime = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
//     const toTime = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

//     return flattenedData
//       .filter((r) => {
//         const matchesSearch =
//           !q ||
//           r.accident_id?.toLowerCase().includes(q) ||
//           r.name?.toLowerCase().includes(q) ||
//           r.department?.toLowerCase().includes(q) ||
//           r.group?.toLowerCase().includes(q) ||
//           r.prepared_by?.toLowerCase().includes(q);
//         const matchesLocation =
//           !locationFilter || r.location === locationFilter;
//         const matchesReportFilter =
//           reportFilter === "all" ||
//           isPending(
//             r,
//             isSection3Approver,
//             empInfo.emp_position,
//             empInfo.emp_department,
//             empInfo.emp_group,
//           );

//         let matchesDate = true;
//         if (fromTime !== null || toTime !== null) {
//           const rowTime = r.date_and_time ? new Date(r.date_and_time).getTime() : NaN;
//           if (isNaN(rowTime)) {
//             matchesDate = false;
//           } else {
//             if (fromTime !== null && rowTime < fromTime) matchesDate = false;
//             if (toTime !== null && rowTime > toTime) matchesDate = false;
//           }
//         }

//         return matchesSearch && matchesLocation && matchesReportFilter && matchesDate;
//       })
//       .sort((a, b) => {
//         const aVal = a[sortField] || "";
//         const bVal = b[sortField] || "";
//         const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
//         return sortDir === "asc" ? cmp : -cmp;
//       });
//   }, [
//     flattenedData,
//     search,
//     sortField,
//     sortDir,
//     locationFilter,
//     reportFilter,
//     dateFrom,
//     dateTo,
//     empInfo.emp_position,
//     empInfo.emp_department,
//     empInfo.emp_group,
//     isSection3Approver,
//   ]);
//   const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
//   const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

//   const handleSort = (field) => {
//     if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
//     else {
//       setSortField(field);
//       setSortDir("asc");
//     }
//     setPage(1);
//   };
//   useEffect(() => {
//     setPage(1);
//   }, [dateFrom, dateTo]);

//   const SortIcon = ({ field }) => {
//     if (sortField !== field)
//       return <span style={{ opacity: 0.4, marginLeft: 4 }}>⇅</span>;
//     return (
//       <span style={{ marginLeft: 4, color: "#1B8C60" }}>
//         {sortDir === "asc" ? "↑" : "↓"}
//       </span>
//     );
//   };

//   /* ─── Loading / Error ─── */
//   if (loading) {
//     return (
//       <div style={S.shell}>
//         {STYLE_TAG}
//         {TOP_BAR(navigate)}
//         <div
//           style={{
//             padding: "60px 32px",
//             textAlign: "center",
//             color: "#5E7A6E",
//             fontFamily: "'Inter', sans-serif",
//           }}
//         >
//           <div style={{ fontSize: "13px" }}>Loading reports…</div>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div style={S.shell}>
//         {STYLE_TAG}
//         {TOP_BAR(navigate)}
//         <div style={{ padding: "40px 32px" }}>
//           <div
//             style={{
//               background: "#FAE8E8",
//               border: "1px solid #B02020",
//               color: "#7A1F1F",
//               padding: "14px 18px",
//               borderRadius: "6px",
//               fontSize: "13px",
//               fontFamily: "'Inter', sans-serif",
//             }}
//           >
//             {error}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={S.shell}>
//       {STYLE_TAG}

//       {/* ─── TOP HEADER BAR ─── */}
//       <div className="ar-topbar-outer">
//         <div className="ar-topbar-brand">
//           <div className="ar-brand-left">
//             <button
//               className="ar-back-btn"
//               onClick={() => window.history.back()}
//             >
//               ← Back
//             </button>
//             <div className="ar-divider" />
//             <div>
//               <span className="ar-brand-title">SAIRI</span>
//               <span className="ar-brand-sub">
//                 Safety Accident / Incident Report and Investigation
//               </span>
//             </div>
//           </div>
//           <div className="ar-topbar-actions">
//             <button className="ar-btn ar-btn--ghost-dark">Export CSV</button>
//             <button
//               className="ar-btn ar-btn--primary"
//               onClick={() => navigate("/admin/add-report")}
//             >
//               + New Report
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* ─── MAIN CONTENT ─── */}
//       <main className="ar-main">
//         {/* Page header */}
//         <div className="ar-page-header">
//           <div>
//             <h1 className="ar-page-title">All Reports</h1>
//             <p className="ar-page-sub">
//               REPORT.INDEX — {filtered.length} record
//               {filtered.length !== 1 ? "s" : ""}
//             </p>
//           </div>
//           <div className="ar-header-right">
//             <button
//               className="ar-btn ar-btn--reload"
//               onClick={() => window.location.reload()}
//               title="Reload reports"
//             >

//               <FeatherIcon icon="refresh-ccw" size={15} />
//             </button>
//             <ReportFilterDropdown
//               value={reportFilter}
//               onChange={(val) => {
//                 setReportFilter(val);
//                 setPage(1);
//               }}
//               allCount={flattenedData.length}
//               pendingCount={pendingCount}
//             />

//             {/* Location dropdown */}
//             <LocationDropdown
//               value={locationFilter}
//               onChange={(val) => {
//                 setLocationFilter(val);
//                 setPage(1);
//               }}
//               options={locationOptions}
//               counts={locationCounts}
//               totalCount={flattenedData.length}
//             />

//             {/* Search */}
//             <div className="ar-search-wrap">
//               <svg className="ar-search-icon" viewBox="0 0 16 16" fill="none">
//                 <circle
//                   cx="6.5"
//                   cy="6.5"
//                   r="4.5"
//                   stroke="#5E7A6E"
//                   strokeWidth="1.4"
//                 />
//                 <line
//                   x1="10"
//                   y1="10"
//                   x2="14"
//                   y2="14"
//                   stroke="#5E7A6E"
//                   strokeWidth="1.4"
//                   strokeLinecap="round"
//                 />
//               </svg>
//               <input
//                 className="ar-search-input"
//                 placeholder="Search by name, ID, department…"
//                 value={search}
//                 onChange={(e) => {
//                   setSearch(e.target.value);
//                   setPage(1);
//                 }}
//               />
//             </div>

//             <DateRangeDropdown
//               from={dateFrom}
//               to={dateTo}
//               onChange={(f, t) => {
//                 setDateFrom(f);
//                 setDateTo(t);
//                 setPage(1);
//               }}
//             />
//           </div>
//         </div>

//         {/* Stat cards */}
//         <div className="ar-stats-row">
//           <StatCard
//             label="Total Reports"
//             value={stats.total}
//             delta="all records"
//             deltaType="up"
//             bc="#6300e4"
//             bg="#572bd156"
//             c="#261157"
//           />
//           <StatCard
//             label="Open"
//             value={stats.open}
//             delta={`${stats.open} require attention`}
//             deltaType="warn"
//             bc="#ce5302"
//             bg="#d1842b56"
//             c="#573911"
//           />
//           <StatCard
//             label="Resolved"
//             value={stats.resolved}
//             delta={`${stats.resolved} closed out`}
//             deltaType="up"
//             bc="#c50903"
//             bg="#d1442b56"
//             c="#571911"
//           />
//         </div>

//         {/* Plate */}
//         <div className="ar-plate">
//           <span className="ar-plate-code"></span>
//           <span className="ar-plate-title">All Accident / Incident</span>
//           <span
//             className="ar-plate-note"
//             style={{ color: "#37d172", fontFamily: "monospace" }}
//           >
//             Click any row to open full report
//           </span>
//         </div>

//         {/* Panel */}
//         <div className="ar-panel">
//           {flattenedData.length === 0 ? (
//             <div className="ar-empty">
//               <div
//                 style={{ fontSize: "32px", marginBottom: "10px", opacity: 0.3 }}
//               >
//                 ⚑
//               </div>
//               <div style={{ fontWeight: 600, marginBottom: "4px" }}>
//                 No reports yet
//               </div>
//               <div style={{ fontSize: "12px" }}>
//                 Create the first report to get started.
//               </div>
//             </div>
//           ) : filtered.length === 0 ? (
//             <div className="ar-empty">
//               <div style={{ fontWeight: 600, marginBottom: "4px" }}>
//                 No results
//               </div>
//               <div style={{ fontSize: "12px" }}>
//                 Try a different search or filter.
//               </div>
//             </div>
//           ) : (
//             <>
//               <div style={{ overflowX: "auto" }}>
//                 <table className="ar-table">
//                   <thead>
//                     <tr>
//                       <th
//                         className="ar-th ar-th--sort"
//                         onClick={() => handleSort("accident_id")}
//                       >
//                         Accident ID <SortIcon field="accident_id" />
//                       </th>
//                       <th className="ar-th">Status</th>
//                       <th className="ar-th">Name</th>
//                       <th className="ar-th">Department</th>
//                       <th
//                         className="ar-th ar-th--sort"
//                         onClick={() => handleSort("group")}
//                       >
//                         Group <SortIcon field="group" />
//                       </th>
//                       <th
//                         className="ar-th ar-th--sort"
//                         onClick={() => handleSort("location")}
//                       >
//                         Location <SortIcon field="location" />
//                       </th>
//                       <th className="ar-th">Subtype</th>
//                       <th className="ar-th">Prepared By</th>
//                       <th
//                         className="ar-th ar-th--sort"
//                         onClick={() => handleSort("date_and_time")}
//                       >
//                         Date & Time <SortIcon field="date_and_time" />
//                       </th>
//                       <th className="ar-th" />
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {paginated.map((item, index) => (
//                       <tr
//                         key={`${item.accident_id}-${index}`}
//                         className="ar-tr"
//                         onClick={() =>
//                           navigate(
//                             `/admin/view-report?ACID=${item.accident_id}`,
//                           )
//                         }
//                       >
//                         <td className="ar-td">
//                           <span className="ar-acid">{item.accident_id}</span>
//                         </td>
//                         <td className="ar-td">
//                           <StatusBadge status={item.ac_status} />
//                         </td>
//                         <td className="ar-td" style={{ fontWeight: 500 }}>
//                           {item.name}
//                         </td>
//                         <td className="ar-td">
//                           <span className="ar-dept-badge">
//                             {item.department}
//                           </span>
//                         </td>
//                         <td className="ar-td">
//                           <span className="ar-dept-badge">{item.group}</span>
//                         </td>
//                         <td className="ar-td">
//                           <LocationBadge location={item.location} />
//                         </td>
//                         <td className="ar-td">
//                           <div
//                             style={{
//                               display: "flex",
//                               flexWrap: "wrap",
//                               gap: "2px",
//                             }}
//                           >
//                             {item.subtypes.length > 0 ? (
//                               item.subtypes.map((s, i) => (
//                                 <SubtypeTag key={i} label={s} />
//                               ))
//                             ) : (
//                               <span
//                                 style={{ color: "#5E7A6E", fontSize: "12px" }}
//                               >
//                                 —
//                               </span>
//                             )}
//                           </div>
//                         </td>
//                         <td className="ar-td ar-ts">{item.prepared_by}</td>
//                         <td className="ar-td ar-ts">
//                           {formatDate(item.date_and_time)}
//                         </td>
//                         <td className="ar-td">
//                           <span className="ar-row-action">View →</span>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               {/* Pagination */}
//               <div className="ar-pagination">
//                 <span className="ar-pag-info">
//                   Showing{" "}
//                   {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
//                   {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
//                   {filtered.length} records
//                 </span>
//                 <div className="ar-pag-btns">
//                   <button
//                     className="ar-pag-btn"
//                     disabled={page === 1}
//                     onClick={() => setPage((p) => p - 1)}
//                   >
//                     ‹ Prev
//                   </button>
//                   {Array.from({ length: totalPages }, (_, i) => i + 1)
//                     .filter(
//                       (p) =>
//                         p === 1 || p === totalPages || Math.abs(p - page) <= 1,
//                     )
//                     .reduce((acc, p, i, arr) => {
//                       if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
//                       acc.push(p);
//                       return acc;
//                     }, [])
//                     .map((p, i) =>
//                       p === "…" ? (
//                         <span key={`e-${i}`} className="ar-pag-ellipsis">
//                           …
//                         </span>
//                       ) : (
//                         <button
//                           key={p}
//                           className={`ar-pag-btn${page === p ? " ar-pag-btn--active" : ""}`}
//                           onClick={() => setPage(p)}
//                         >
//                           {p}
//                         </button>
//                       ),
//                     )}
//                   <button
//                     className="ar-pag-btn"
//                     disabled={page === totalPages}
//                     onClick={() => setPage((p) => p + 1)}
//                   >
//                     Next ›
//                   </button>
//                 </div>
//               </div>
//             </>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    STATUS BADGE
//    ════════════════════════════════════════════════════════════════════════ */

// const STATUS_STYLES = {
//   // "open": { bg: "#FFF3DC", color: "#7A4900", dot: "#E09000" },
//   // "resolved": { bg: "#D4EDE5", color: "#0F3D2B", dot: "#1B8C60" },
//   "pending review for safety/medical": { bg: "#faf4e8", color: "#7a561f", dot: "#ff9900" },
//   "pending review for safety": { bg: "#f9fae8", color: "#575c12", dot: "#b6b328" },
//   "pending review for department": { bg: "#ddf1fd", color: "#154961", dot: "#0270b9" },
//   "pending review for group manager": { bg: "#ecddfd", color: "#291561", dot: "#4202b9" },
//   "pending review for safety dh": { bg: "#dcfaff", color: "#005358", dot: "#008394" },
//   "pending corrective and preventive": { bg: "#FAE8E8", color: "#7A1F1F", dot: "#C0392B" },
//   "pending department closure": { bg: "#E8F0FA", color: "#1A3A6B", dot: "#2E6FD9" },
//   "pending group closure": { bg: "#F0E8FA", color: "#4A1A7A", dot: "#8E44AD" },
//   "pending safety dh closure": { bg: "#FDE8F5", color: "#7A1A5A", dot: "#D6338C" },
//   "pending safety dh closure": { bg: "#FDE8F5", color: "#7A1A5A", dot: "#D6338C" },
//   "completed": { bg: "#ceffc7", color: "#125f12", dot: "#33d656" },
//   // "closed": { bg: "#E4E9E7", color: "#33463E", dot: "#5E7A6E" },
//   // "rejected": { bg: "#F5D9D9", color: "#5C1414", dot: "#A93226" },
// };

// const DEFAULT_STATUS_STYLE = { bg: "#F0F4F2", color: "#2C4A3E", dot: "#5E7A6E" };

// function StatusBadge({ status }) {
//   if (!status)
//     return <span style={{ color: "#5E7A6E", fontSize: "12px" }}>—</span>;
//   const normalized = status.toLowerCase().trim();
//   const s = STATUS_STYLES[normalized] || DEFAULT_STATUS_STYLE;
//   const label = status
//     .split(" ")
//     .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//     .join(" ");
//   return (
//     <span
//       style={{
//         display: "inline-flex",
//         alignItems: "center",
//         gap: "5px",
//         padding: "3px 9px",
//         borderRadius: "999px",
//         fontSize: "11px",
//         fontWeight: 600,
//         background: s.bg,
//         color: s.color,
//         border: `2px solid ${s.dot}`,
//         whiteSpace: "nowrap",
//       }}
//     >
//       <span
//         style={{
//           width: "6px",
//           height: "6px",
//           borderRadius: "50%",
//           background: s.dot,
//           flexShrink: 0,
//         }}
//       />
//       {label}
//     </span>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    LOCATION BADGE
//    ════════════════════════════════════════════════════════════════════════ */

// function LocationBadge({ location }) {
//   if (!location || location === "N/A")
//     return <span style={{ color: "#5E7A6E", fontSize: "12px" }}>—</span>;
//   const dot = LOCATION_COLORS[location] || "#5E7A6E";
//   return (
//     <span
//       style={{
//         display: "inline-flex",
//         alignItems: "center",
//         gap: "6px",
//         padding: "3px 9px",
//         borderRadius: "4px",
//         fontSize: "11px",
//         fontWeight: 600,
//         background: "#F0F4F2",
//         color: "#2C4A3E",
//         whiteSpace: "nowrap",
//       }}
//     >
//       <span
//         style={{
//           width: "7px",
//           height: "7px",
//           borderRadius: "50%",
//           background: dot,
//           flexShrink: 0,
//         }}
//       />
//       {location}
//     </span>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    INLINE STYLE OBJECT
//    ════════════════════════════════════════════════════════════════════════ */

// const S = {
//   shell: { minHeight: "100vh", display: "flex", flexDirection: "column" },
// };

// /* ════════════════════════════════════════════════════════════════════════
//    TOP BAR
//    ════════════════════════════════════════════════════════════════════════ */

// function TOP_BAR(navigate) {
//   return (
//     <div className="ar-topbar-outer">
//       <div className="ar-topbar-brand">
//         <div className="ar-brand-left">
//           <button className="ar-back-btn" onClick={() => window.history.back()}>
//             ← Back
//           </button>
//           <div className="ar-divider" />
//           <div>
//             <span className="ar-brand-title">SAIRI</span>
//             <span className="ar-brand-sub">
//               Safety Accident / Incident Report and Investigation
//             </span>
//           </div>
//         </div>
//         <div className="ar-topbar-actions">
//           <button
//             className="ar-btn ar-btn--primary"
//             onClick={() => navigate("/admin/add-report")}
//           >
//             + New Report
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    STYLESHEET
//    ════════════════════════════════════════════════════════════════════════ */

// const STYLE_TAG = (
//   <style>{`
// @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

// :root {
//   --ar-ink:         #0D1B2A;
//   --ar-ink-soft:    #2C4A3E;
//   --ar-muted:       #5E7A6E;
//   --ar-paper:       #FFFFFF;
//   --ar-paper-alt:   #F0F4F2;
//   --ar-line:        #C8D8D1;
//   --ar-line-strong: #9DBCB0;
//   --ar-amber:       #1B5E44;
//   --ar-amber-deep:  #0F3D2B;
//   --ar-amber-soft:  #D4EDE5;
//   --ar-accent:      #1B8C60;
//   --ar-danger:      #B02020;
//   --font-display:   'Barlow Condensed', sans-serif;
//   --font-body:      'Inter', sans-serif;
//   --font-mono:      'IBM Plex Mono', monospace;
// }

// /* ═══ BASE ═══ */
// * { box-sizing: border-box; }

// /* ═══ TOPBAR ═══ */
// .ar-topbar-outer {
//   background: #0D1B2A;
//   position: sticky; top: 0; z-index: 100;
//   border-bottom: 1px solid rgba(255,255,255,0.06);
// }
// .ar-topbar-brand {
//   display: flex; align-items: center; justify-content: space-between;
//   padding: 12px 32px; flex-wrap: wrap; gap: 12px;
// }
// .ar-brand-left { display: flex; align-items: center; gap: 16px; }
// .ar-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.1); }
// .ar-brand-title { font-family: var(--font-display); font-weight: 700; font-size: 18px; color: #E8F4EF; letter-spacing: 0.05em; display: block; }
// .ar-brand-sub   { font-size: 10px; color: #4A6B84; text-transform: uppercase; letter-spacing: 0.08em; display: block; }
// .ar-back-btn {
//   display: flex; align-items: center; gap: 6px;
//   background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #8AA4B8;
//   padding: 6px 14px; border-radius: 6px; font-size: 12px; font-family: var(--font-body); cursor: pointer;
//   transition: border-color 0.15s, color 0.15s;
// }
// .ar-back-btn:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
// .ar-topbar-actions { display: flex; gap: 10px; align-items: center; }

// /* ═══ BUTTONS ═══ */
// .ar-btn { font-family: var(--font-body); font-size: 12.5px; font-weight: 600; padding: 9px 18px; border-radius: 6px; cursor: pointer; border: 1.5px solid transparent; }
// .ar-btn--primary { background: var(--ar-accent); color: #fff; border-color: var(--ar-amber-deep); }
// .ar-btn--primary:hover { background: var(--ar-amber-deep); }
// .ar-btn--ghost-dark { background: transparent; color: #8AA4B8; border-color: rgba(255,255,255,0.1); }
// .ar-btn--ghost-dark:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

// /* ═══ MAIN ═══ */
// .ar-main { flex: 1; padding: 28px 40px 80px; min-width: 0; }

// /* ═══ PAGE HEADER ═══ */
// .ar-page-header {
//   display: flex; align-items: flex-end; justify-content: space-between;
//   margin-bottom: 22px; padding-bottom: 18px; border-bottom: 2px solid var(--ar-line);
//   flex-wrap: wrap; gap: 14px;
// }
// .ar-page-title { font-family: var(--font-display); font-weight: 700; font-size: 32px; margin: 0; letter-spacing: 0.01em; color: var(--ar-ink); }
// .ar-page-sub   { font-family: var(--font-mono); font-size: 11px; color: var(--ar-amber); letter-spacing: 0.1em; margin: 2px 0 0; }
// .ar-header-right { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

// /* ═══ REPORT TABS ═══ */
// .ar-tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 2px solid var(--ar-line); }
// .ar-tab {
//   display: flex; align-items: center; gap: 7px;
//   padding: 9px 16px; margin-bottom: -2px;
//   background: transparent; border: none; border-bottom: 2px solid transparent;
//   font-family: var(--font-body); font-size: 13px; font-weight: 600;
//   color: var(--ar-muted); cursor: pointer;
//   transition: color 0.15s, border-color 0.15s;
// }
// .ar-tab:hover { color: var(--ar-ink-soft); }
// .ar-tab--active { color: var(--ar-amber-deep); border-bottom-color: var(--ar-accent); }
// .ar-tab-count {
//   font-family: var(--font-mono); font-size: 10.5px; font-weight: 700;
//   background: var(--ar-paper-alt); color: var(--ar-muted);
//   border: 1px solid var(--ar-line); border-radius: 999px;
//   padding: 1px 7px;
// }
// .ar-tab--active .ar-tab-count { background: rgba(27,140,96,0.1); border-color: rgba(27,140,96,0.25); color: var(--ar-accent); }
// .ar-tab-count--warn { background: #FFF3DC; border-color: #F0C878; color: #B07000; }
// .ar-tab--active .ar-tab-count--warn { background: #FFEBB0; border-color: #E0A030; color: #7A4900; }

// /* ═══ CUSTOM LOCATION DROPDOWN ═══ */
// .ld-root { position: relative; }

// .ld-trigger {
//   display: inline-flex; align-items: center; justify-content: space-between;
//   gap: 10px; min-width: 190px;
//   padding: 0 12px; height: 36px;
//   background: var(--ar-paper);
//   border: 1.5px solid var(--ar-line-strong);
//   border-radius: 7px;
//   font-family: var(--font-body); font-size: 13px; font-weight: 500;
//   color: var(--ar-ink-soft);
//   cursor: pointer;
//   transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
//   user-select: none;
//   white-space: nowrap;
// }
// .ld-trigger:hover {
//   border-color: var(--ar-accent);
//   box-shadow: 0 0 0 3px rgba(27,140,96,0.08);
// }
// .ld-trigger--open {
//   border-color: var(--ar-accent);
//   box-shadow: 0 0 0 3px rgba(27,140,96,0.12);
// }
// .ld-trigger--active {
//   border-color: var(--ar-accent);
//   background: #EDF7F3;
//   color: var(--ar-amber-deep);
//   font-weight: 600;
// }

// .ld-trigger-left  { display: flex; align-items: center; gap: 7px; }
// .ld-trigger-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

// .ld-filter-svg { color: var(--ar-muted); flex-shrink: 0; }
// .ld-trigger--active .ld-filter-svg { color: var(--ar-accent); }

// .ld-trigger-dot {
//   width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
// }

// .ld-trigger-label { max-width: 130px; overflow: hidden; text-overflow: ellipsis; }

// .ld-clear-btn {
//   display: inline-flex; align-items: center; justify-content: center;
//   width: 16px; height: 16px; border-radius: 50%;
//   background: rgba(0,0,0,0.07); color: var(--ar-muted);
//   cursor: pointer; transition: background 0.12s, color 0.12s;
//   flex-shrink: 0;
// }
// .ld-clear-btn:hover { background: #FAE8E8; color: var(--ar-danger); }

// .ld-chevron { color: var(--ar-muted); transition: transform 0.18s ease; flex-shrink: 0; }
// .ld-chevron--up { transform: rotate(180deg); }

// /* ─── Dropdown panel ─── */
// .ld-panel.ld-panel--date {
//   min-width: 280px;
//   padding-bottom: 4px;
//   left: auto;
//   right: 0;
// }
// .dr-presets {
//   display: flex;
//   flex-wrap: wrap;
//   gap: 6px;
//   padding: 10px 14px 4px;
// }
// .dr-preset-btn {
//   padding: 5px 10px;
//   border-radius: 999px;
//   border: 1.5px solid var(--ar-line);
//   background: var(--ar-paper-alt);
//   color: var(--ar-ink-soft);
//   font-family: var(--font-body);
//   font-size: 11.5px;
//   font-weight: 600;
//   cursor: pointer;
//   transition: border-color 0.12s, background 0.12s, color 0.12s;
// }
// .dr-preset-btn:hover {
//   border-color: var(--ar-accent);
//   background: #EDF7F3;
//   color: var(--ar-amber-deep);
// }

// .dr-fields {
//   display: flex;
//   gap: 10px;
//   padding: 10px 14px;
// }
// .dr-field {
//   flex: 1;
//   display: flex;
//   flex-direction: column;
//   gap: 4px;
// }
// .dr-field-label {
//   font-family: var(--font-mono);
//   font-size: 9.5px;
//   font-weight: 600;
//   color: var(--ar-muted);
//   text-transform: uppercase;
//   letter-spacing: 0.08em;
// }
// .dr-field-input {
//   border: 1.5px solid var(--ar-line-strong);
//   border-radius: 6px;
//   padding: 6px 8px;
//   font-family: var(--font-body);
//   font-size: 12.5px;
//   color: var(--ar-ink-soft);
//   background: var(--ar-paper);
//   outline: none;
//   transition: border-color 0.12s, box-shadow 0.12s;
// }
// .dr-field-input:focus {
//   border-color: var(--ar-accent);
//   box-shadow: 0 0 0 3px rgba(27,140,96,0.1);
// }

// .dr-actions {
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
//   padding: 8px 14px 12px;
//   border-top: 1px solid var(--ar-line);
//   margin-top: 4px;
// }
// .dr-clear-all {
//   background: transparent;
//   border: none;
//   color: var(--ar-muted);
//   font-family: var(--font-body);
//   font-size: 12px;
//   font-weight: 600;
//   cursor: pointer;
//   padding: 4px 6px;
// }
// .dr-clear-all:hover:not(:disabled) { color: var(--ar-danger); }
// .dr-clear-all:disabled { opacity: 0.4; cursor: not-allowed; }

// .dr-done {
//   background: var(--ar-accent);
//   color: #fff;
//   border: none;
//   border-radius: 6px;
//   padding: 6px 16px;
//   font-family: var(--font-body);
//   font-size: 12px;
//   font-weight: 600;
//   cursor: pointer;
// }
// .dr-done:hover { background: var(--ar-amber-deep); }
// .ld-panel {
//   position: absolute;
//   top: calc(100% + 6px);
//   left: 0;
//   min-width: 230px;
//   background: var(--ar-paper);
//   border: 1.5px solid var(--ar-line);
//   border-radius: 9px;
//   box-shadow: 0 8px 24px rgba(13,27,42,0.12), 0 2px 6px rgba(13,27,42,0.06);
//   z-index: 200;
//   overflow: hidden;
//   animation: ld-in 0.14s ease;
// }

// @keyframes ld-in {
//   from { opacity: 0; transform: translateY(-4px); }
//   to   { opacity: 1; transform: translateY(0); }
// }

// .ld-panel-header {
//   padding: 9px 14px 7px;
//   font-family: var(--font-mono);
//   font-size: 9.5px;
//   font-weight: 600;
//   color: var(--ar-muted);
//   letter-spacing: 0.1em;
//   text-transform: uppercase;
//   border-bottom: 1px solid var(--ar-line);
//   background: #F8FAF9;
// }

// .ld-divider { height: 1px; background: var(--ar-line); margin: 3px 0; }

// .ld-option {
//   display: flex; align-items: center; justify-content: space-between;
//   width: 100%; padding: 8px 14px;
//   background: transparent; border: none;
//   font-family: var(--font-body); font-size: 13px; font-weight: 400;
//   color: var(--ar-ink-soft);
//   cursor: pointer; text-align: left;
//   transition: background 0.1s, color 0.1s;
//   gap: 10px;
// }
// .ld-option:hover { background: var(--ar-paper-alt); color: var(--ar-ink); }
// .ld-option--selected {
//   background: #EDF7F3;
//   color: var(--ar-amber-deep);
//   font-weight: 600;
// }
// .ld-option--selected:hover { background: #D4EDE5; }

// .ld-option-left  { display: flex; align-items: center; gap: 9px; }
// .ld-option-dot   { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
// .ld-option-name  { font-size: 13px; }

// .ld-option-count {
//   font-family: var(--font-mono);
//   font-size: 10.5px;
//   font-weight: 700;
//   color: var(--ar-muted);
//   background: var(--ar-paper-alt);
//   border: 1px solid var(--ar-line);
//   border-radius: 4px;
//   padding: 1px 6px;
//   flex-shrink: 0;
// }
// .ld-option--selected .ld-option-count {
//   background: rgba(27,140,96,0.1);
//   border-color: rgba(27,140,96,0.25);
//   color: var(--ar-accent);
// }

// /* ═══ SEARCH ═══ */
// .ar-search-wrap { position: relative; }
// .ar-search-icon {
//   position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
//   width: 15px; height: 15px; pointer-events: none;
// }
// .ar-search-input {
//   padding: 8px 10px 8px 32px;
//   border: 1.5px solid var(--ar-line-strong); border-radius: 7px;
//   font-size: 13px; font-family: var(--font-body);
//   background: var(--ar-paper); color: var(--ar-ink);
//   width: 300px; outline: none;
//   transition: border-color 0.15s, box-shadow 0.15s;
//   height: 36px;
// }
// .ar-search-input:focus { border-color: var(--ar-amber); box-shadow: 0 0 0 3px rgba(27,94,68,0.12); }
// .ar-search-input::placeholder { color: var(--ar-muted); }

// /* ═══ STAT CARDS ═══ */
// .ar-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 22px; }
// @media (max-width: 900px) { .ar-stats-row { grid-template-columns: repeat(2, 1fr); } }
// @media (max-width: 540px) { .ar-stats-row { grid-template-columns: 1fr; } }

// /* ═══ PLATE ═══ */
// .ar-plate {
//   display: flex; align-items: baseline; gap: 12px;
//   background: var(--ar-ink); color: #fff;
//   border-left: 5px solid var(--ar-accent);
//   padding: 10px 18px; border-radius: 5px; margin-bottom: 18px;
// }
// .ar-plate-code  { font-family: var(--font-mono); font-size: 11px; color: var(--ar-accent); letter-spacing: 0.08em; }
// .ar-plate-title { font-family: var(--font-display); font-weight: 600; font-size: 19px; letter-spacing: 0.01em; }
// .ar-plate-note  { font-size: 12px; color: #6A8FA8; font-style: italic; margin-left: auto; }

// /* ═══ PANEL ═══ */
// .ar-panel { background: var(--ar-paper); border: 1px solid var(--ar-line); border-radius: 8px; overflow: hidden; }

// /* ═══ TABLE ═══ */
// .ar-table { width: 100%; border-collapse: collapse; min-width: 700px; }
// .ar-th {
//   padding: 10px 16px; text-align: left; font-size: 10.5px; font-weight: 700;
//   color: var(--ar-muted); text-transform: uppercase; letter-spacing: 0.06em;
//   background: #F8FAF9; border-bottom: 2px solid var(--ar-line); white-space: nowrap;
// }
// .ar-th--sort { cursor: pointer; user-select: none; }
// .ar-th--sort:hover { color: var(--ar-amber); }
// .ar-td { padding: 11px 16px; font-size: 13px; border-bottom: 1px solid var(--ar-line); vertical-align: middle; }
// .ar-tr { cursor: pointer; transition: background 0.1s; }
// .ar-tr:hover { background: var(--ar-amber-soft); }
// .ar-tr:last-child .ar-td { border-bottom: none; }
// .ar-acid { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--ar-accent); }
// .ar-dept-badge {
//   display: inline-flex; align-items: center; padding: 2px 8px;
//   border-radius: 4px; font-size: 11px; font-weight: 600;
//   background: var(--ar-amber-soft); color: var(--ar-amber-deep); white-space: nowrap;
// }
// .ar-ts { font-size: 12px; color: var(--ar-muted); }
// .ar-row-action { opacity: 0; color: var(--ar-accent); font-size: 12px; font-weight: 600; transition: opacity 0.15s; white-space: nowrap; }
// .ar-tr:hover .ar-row-action { opacity: 1; }

// /* ═══ EMPTY STATE ═══ */
// .ar-empty { padding: 60px 20px; text-align: center; color: var(--ar-muted); font-size: 13px; font-family: var(--font-body); }

// /* ═══ PAGINATION ═══ */
// .ar-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--ar-line); flex-wrap: wrap; gap: 10px; }
// .ar-pag-info   { font-size: 12px; color: var(--ar-muted); font-family: var(--font-body); }
// .ar-pag-btns   { display: flex; gap: 4px; align-items: center; }
// .ar-pag-btn {
//   padding: 5px 10px; border: 1.5px solid var(--ar-line-strong); border-radius: 5px;
//   background: var(--ar-paper); font-size: 12px; font-family: var(--font-body);
//   cursor: pointer; color: var(--ar-ink-soft); transition: border-color 0.1s, background 0.1s;
// }
// .ar-pag-btn:hover:not(:disabled) { border-color: var(--ar-amber); background: var(--ar-amber-soft); }
// .ar-pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
// .ar-pag-btn--active { background: var(--ar-accent); color: #fff; border-color: var(--ar-amber-deep); }
// .ar-pag-btn--active:hover { background: var(--ar-amber-deep); }
// .ar-pag-ellipsis { font-size: 12px; color: var(--ar-muted); padding: 0 4px; }

// /* ═══ RESPONSIVE ═══ */
// @media (max-width: 768px) {
//   .ar-topbar-brand { padding: 10px 16px; }
//   .ar-main { padding: 20px 16px 60px; }
//   .ar-plate-note { display: none; }
//   .ar-search-input { width: 200px; }
//   .ar-page-header { flex-direction: column; align-items: flex-start; }
//   .ar-header-right { width: 100%; }
//   .ld-trigger { min-width: 160px; }
//   .ld-panel { min-width: 200px; }
// }
//   .ar-btn--reload {
//   background: var(--ar-paper);
//   color: var(--ar-ink-soft);
//   border-color: var(--ar-line-strong);
//   display: inline-flex;
//   align-items: center;
// }
// .ar-btn--reload:hover {
//   border-color: var(--ar-accent);
//   color: var(--ar-accent);
//   background: #EDF7F3;
// }

// /* ═══ DATE RANGE FILTER ═══ */
// .ar-date-range {
//   display: inline-flex;
//   align-items: center;
//   gap: 6px;
//   height: 36px;
//   padding: 0 10px;
//   background: var(--ar-paper);
//   border: 1.5px solid var(--ar-line-strong);
//   border-radius: 7px;
// }
// .ar-date-input {
//   border: none;
//   outline: none;
//   background: transparent;
//   font-family: var(--font-body);
//   font-size: 12.5px;
//   color: var(--ar-ink-soft);
//   height: 100%;
//   padding: 0 2px;
// }
// .ar-date-sep {
//   font-size: 11px;
//   color: var(--ar-muted);
//   font-family: var(--font-body);
// }
// .ar-date-clear {
//   display: inline-flex;
//   align-items: center;
//   justify-content: center;
//   width: 16px;
//   height: 16px;
//   border-radius: 50%;
//   background: rgba(0,0,0,0.07);
//   color: var(--ar-muted);
//   cursor: pointer;
//   border: none;
//   flex-shrink: 0;
//   transition: background 0.12s, color 0.12s;
// }
// .ar-date-clear:hover {
//   background: #FAE8E8;
//   color: var(--ar-danger);
// }
// `}</style>
// );

import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import config from "config";
import { useNavigate } from "react-router-dom";
import FeatherIcon from "feather-icons-react";

/* ════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════════════ */

const SUBTYPE_STYLES = {
  Injury: { bg: "#FAE8E8", color: "#7A1F1F" },
  "Property Damage": { bg: "#FFF3DC", color: "#7A4900" },
  "Near Miss": { bg: "#E8F0FA", color: "#1A3A6B" },
  "High Potential Near Miss": { bg: "#E8F0FA", color: "#1A3A6B" },
  Illnesses: { bg: "#F0E8FA", color: "#4A1A7A" },
};

const DEFAULT_SUBTYPE_STYLE = { bg: "#F0F4F2", color: "#2C4A3E" };

const LOCATION_COLORS = {
  underground: "#A78BFA",
  surface: "#34D399",
};

/* ════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════ */

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date)) return "N/A";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const parseSubtypes = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};
const isFalsyFlag = (v) => !v;
const isTrueFlag = (v) => v === true || v === 1 || v === "1";
const CORRECTIVE_PREVENTIVE_STATUS = "pending corrective and preventive";

const isPendingForRole = (row, position, empDepartment, empGroup) => {
  if (row.ac_status?.toLowerCase().trim() === CORRECTIVE_PREVENTIVE_STATUS) {
    return true;
  }
  const normalized = position
    ?.toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "_");
  const {
    is_safety_personnel,
    is_concerned_department,
    is_group_manager,
    is_safety_dh,
  } = row;

  switch (normalized) {
    case "safety_reviewer":
      return (
        isFalsyFlag(is_safety_personnel) &&
        isFalsyFlag(is_concerned_department) &&
        isFalsyFlag(is_group_manager) &&
        isFalsyFlag(is_safety_dh)
      );
    case "department_reviewer":
      return (
        row.ac_status?.toLowerCase().trim() === "pending department closure" ||
        (isTrueFlag(is_safety_personnel) &&
          isFalsyFlag(is_concerned_department) &&
          isFalsyFlag(is_group_manager) &&
          isFalsyFlag(is_safety_dh) &&
          row.department?.toLowerCase().trim() ===
            empDepartment?.toLowerCase().trim())
      );
    case "group_reviewer":
      return (
        row.ac_status?.toLowerCase().trim() === "pending group closure" ||
        (isTrueFlag(is_safety_personnel) &&
          isTrueFlag(is_concerned_department) &&
          isFalsyFlag(is_group_manager) &&
          isFalsyFlag(is_safety_dh) &&
          row.group?.toLowerCase().trim() === empGroup?.toLowerCase().trim())
      );
    case "safety_head":
      return (
        row.ac_status?.toLowerCase().trim() === "pending safety dh closure" ||
        (isTrueFlag(is_safety_personnel) &&
          isTrueFlag(is_concerned_department) &&
          isTrueFlag(is_group_manager) &&
          isFalsyFlag(is_safety_dh))
      );
    default:
      return false;
  }
};
const isPending = (
  row,
  isSection3Approver,
  position,
  empDepartment,
  empGroup,
) => {
  if (isSection3Approver) {
    return !row.attending_physician || row.attending_physician.trim() === "";
  }

  if (row.ac_status?.toLowerCase().trim() === CORRECTIVE_PREVENTIVE_STATUS) {
    return true;
  }

  return isPendingForRole(row, position, empDepartment, empGroup);
};
/* ════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════════════ */

function SubtypeTag({ label }) {
  const style = SUBTYPE_STYLES[label] || DEFAULT_SUBTYPE_STYLE;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        marginRight: "3px",
        marginBottom: "2px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function StatCard({ label, value, delta, deltaType, bc, bg, c }) {
  const deltaColor = deltaType === "warn" ? "#B07000" : "#1B5E44";
  return (
    <div
      style={{
        background: bg,
        border: `2px solid ${bc}`,
        borderRadius: "8px",
        padding: "14px 18px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: c,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "28px",
          fontWeight: 700,
          color: "#0D1B2A",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {delta && (
        <div style={{ fontSize: "11px", marginTop: "4px", color: deltaColor }}>
          {delta}
        </div>
      )}
    </div>
  );
}

/* ─── Custom Location Dropdown ─── */
function LocationDropdown({ value, onChange, options, counts, totalCount }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedColor = value ? LOCATION_COLORS[value] || "#5E7A6E" : null;
  const displayLabel = value || "All Locations";

  return (
    <div className="ld-root" ref={ref}>
      {/* Trigger */}
      <button
        className={`ld-trigger${open ? " ld-trigger--open" : ""}${value ? " ld-trigger--active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="ld-trigger-left">
          {/* Filter icon */}
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            className="ld-filter-svg"
          >
            <path
              d="M2 4h12M4.5 8h7M7 12h2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          {value && (
            <span
              className="ld-trigger-dot"
              style={{ background: selectedColor }}
            />
          )}
          <span className="ld-trigger-label">{displayLabel}</span>
        </span>
        <span className="ld-trigger-right">
          {value && (
            <span
              className="ld-clear-btn"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.stopPropagation(), onChange(""))
              }
              title="Clear filter"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 1.5l7 7M8.5 1.5l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 6"
            fill="none"
            className={`ld-chevron${open ? " ld-chevron--up" : ""}`}
          >
            <path
              d="M1 1l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="ld-panel">
          <div className="ld-panel-header">Filter by location</div>

          {/* All option */}
          <button
            className={`ld-option${!value ? " ld-option--selected" : ""}`}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            type="button"
          >
            <span className="ld-option-left">
              <span
                className="ld-option-dot"
                style={{ background: "#5E7A6E" }}
              />
              <span className="ld-option-name">All Locations</span>
            </span>
            <span className="ld-option-count">{totalCount}</span>
          </button>

          <div className="ld-divider" />

          {options.map((loc) => {
            const color = LOCATION_COLORS[loc] || "#5E7A6E";
            const isSelected = value === loc;
            return (
              <button
                key={loc}
                className={`ld-option${isSelected ? " ld-option--selected" : ""}`}
                onClick={() => {
                  onChange(loc);
                  setOpen(false);
                }}
                type="button"
              >
                <span className="ld-option-left">
                  <span
                    className="ld-option-dot"
                    style={{ background: color }}
                  />
                  <span className="ld-option-name">{loc}</span>
                </span>
                <span className="ld-option-count">{counts[loc] ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════ ADD THIS NEW COMPONENT ══════ */
const REPORT_FILTER_OPTIONS = [
  { value: "all", label: "All Reports", dot: "#029616" },
  { value: "pending", label: "Pending", dot: "#ffae00" },
];

function ReportFilterDropdown({ value, onChange, allCount, pendingCount }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const counts = { all: allCount, pending: pendingCount };
  const current =
    REPORT_FILTER_OPTIONS.find((o) => o.value === value) ||
    REPORT_FILTER_OPTIONS[0];
  const isActive = value === "pending";

  return (
    <div className="ld-root" ref={ref}>
      <button
        className={`ld-trigger${open ? " ld-trigger--open" : ""}${isActive ? " ld-trigger--active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="ld-trigger-left">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            className="ld-filter-svg"
          >
            <path
              d="M2 4h12M4.5 8h7M7 12h2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span
            className="ld-trigger-dot"
            style={{ background: current.dot }}
          />
          <span className="ld-trigger-label">{current.label}</span>
        </span>
        <span className="ld-trigger-right">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 6"
            fill="none"
            className={`ld-chevron${open ? " ld-chevron--up" : ""}`}
          >
            <path
              d="M1 1l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="ld-panel">
          <div className="ld-panel-header">Filter by status</div>
          {REPORT_FILTER_OPTIONS.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                className={`ld-option${isSelected ? " ld-option--selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                type="button"
              >
                <span className="ld-option-left">
                  <span
                    className="ld-option-dot"
                    style={{ background: opt.dot }}
                  />
                  <span className="ld-option-name">{opt.label}</span>
                </span>
                <span className="ld-option-count">{counts[opt.value]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateRangeDropdown({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasFilter = !!(from || to);

  const formatShort = (iso) => {
    if (!iso) return null;
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  let label = "Any Date";
  if (from && to) label = `${formatShort(from)} – ${formatShort(to)}`;
  else if (from) label = `From ${formatShort(from)}`;
  else if (to) label = `Until ${formatShort(to)}`;

  const presets = [
    {
      label: "Last 7 days",
      apply: () => {
        const t = new Date();
        const f = new Date();
        f.setDate(f.getDate() - 6);
        onChange(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10));
      },
    },
    {
      label: "Last 30 days",
      apply: () => {
        const t = new Date();
        const f = new Date();
        f.setDate(f.getDate() - 29);
        onChange(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10));
      },
    },
    {
      label: "This month",
      apply: () => {
        const now = new Date();
        const f = new Date(now.getFullYear(), now.getMonth(), 1);
        onChange(f.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
      },
    },
  ];

  return (
    <div className="ld-root" ref={ref}>
      <button
        className={`ld-trigger${open ? " ld-trigger--open" : ""}${hasFilter ? " ld-trigger--active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="ld-trigger-left">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            className="ld-filter-svg"
          >
            <rect
              x="2"
              y="3"
              width="12"
              height="11"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M2 6.5h12M5 1.5v3M11 1.5v3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="ld-trigger-label">{label}</span>
        </span>
        <span className="ld-trigger-right">
          {hasFilter && (
            <span
              className="ld-clear-btn"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("", "");
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.stopPropagation(), onChange("", ""))
              }
              title="Clear date filter"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 1.5l7 7M8.5 1.5l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 6"
            fill="none"
            className={`ld-chevron${open ? " ld-chevron--up" : ""}`}
          >
            <path
              d="M1 1l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="ld-panel ld-panel--date">
          <div className="ld-panel-header">Filter by date</div>

          <div className="dr-presets">
            {presets.map((p) => (
              <button
                key={p.label}
                className="dr-preset-btn"
                type="button"
                onClick={p.apply}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="ld-divider" />

          <div className="dr-fields">
            <label className="dr-field">
              <span className="dr-field-label">From</span>
              <input
                type="date"
                className="dr-field-input"
                value={from}
                max={to || undefined}
                onChange={(e) => onChange(e.target.value, to)}
              />
            </label>
            <label className="dr-field">
              <span className="dr-field-label">To</span>
              <input
                type="date"
                className="dr-field-input"
                value={to}
                min={from || undefined}
                onChange={(e) => onChange(from, e.target.value)}
              />
            </label>
          </div>

          <div className="dr-actions">
            <button
              className="dr-clear-all"
              type="button"
              onClick={() => onChange("", "")}
              disabled={!hasFilter}
            >
              Clear
            </button>
            <button
              className="dr-done"
              type="button"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const WORK_RELATED_OPTIONS = [
  { value: "all", label: "All", dot: "#5E7A6E" },
  { value: "work_related", label: "Work Related", dot: "#1B8C60" },
  { value: "not_work_related", label: "Not Work Related", dot: "#C0392B" },
];

function WorkRelatedFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current =
    WORK_RELATED_OPTIONS.find((o) => o.value === value) ||
    WORK_RELATED_OPTIONS[0];
  const isActive = value !== "all";

  return (
    <div className="ld-root" ref={ref}>
      <button
        className={`ld-trigger${open ? " ld-trigger--open" : ""}${isActive ? " ld-trigger--active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="ld-trigger-left">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            className="ld-filter-svg"
          >
            <path
              d="M2 4h12M4.5 8h7M7 12h2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span
            className="ld-trigger-dot"
            style={{ background: current.dot }}
          />
          <span className="ld-trigger-label">{current.label}</span>
        </span>
        <span className="ld-trigger-right">
          {isActive && (
            <span
              className="ld-clear-btn"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("all");
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.stopPropagation(), onChange("all"))
              }
              title="Clear filter"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 1.5l7 7M8.5 1.5l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 6"
            fill="none"
            className={`ld-chevron${open ? " ld-chevron--up" : ""}`}
          >
            <path
              d="M1 1l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="ld-panel">
          <div className="ld-panel-header">Filter by work related</div>
          {WORK_RELATED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`ld-option${value === opt.value ? " ld-option--selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              type="button"
            >
              <span className="ld-option-left">
                <span
                  className="ld-option-dot"
                  style={{ background: opt.dot }}
                />
                <span className="ld-option-name">{opt.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */

export default function AllReport() {
  const [flattenedData, setFlattenedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("date_and_time");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [locationFilter, setLocationFilter] = useState("");
  const [reportFilter, setReportFilter] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [empInfo, setEmpInfo] = useState({});
  const [workRelatedFilter, setWorkRelatedFilter] = useState("all");
  // ← declare these BEFORE the useMemos that depend on them
  const [section3Approval, setSection3Approval] = useState({
    departmentIds: [],
    positions: [],
  });
  const [groupList, setGroupList] = useState([]);

  const normalizePosition = (p) =>
    p
      ?.toLowerCase()
      .trim()
      .replace(/[-\s]+/g, "_");
  const empPosition = normalizePosition(empInfo.emp_position);
  const empDeptName = empInfo.emp_department;
  const empGroupName = empInfo.emp_group;

  const empDeptId = useMemo(() => {
    if (!empDeptName) return null;
    const norm = (s) => s?.toLowerCase().trim();
    for (const g of groupList) {
      if (empGroupName && norm(g.group) !== norm(empGroupName)) continue;
      const match = g.departments.find(
        (d) => norm(d.department) === norm(empDeptName),
      );
      if (match) return match.id;
    }
    return null;
  }, [groupList, empDeptName, empGroupName]);

  const isSection3Approver = useMemo(() => {
    return (
      !!empPosition &&
      empDeptId !== null &&
      section3Approval.departmentIds.includes(empDeptId) &&
      section3Approval.positions.some(
        (p) => normalizePosition(p) === empPosition,
      )
    );
  }, [empPosition, empDeptId, section3Approval]);

  useEffect(() => {
    if (isSection3Approver) {
      console.log("HAS ACCESS TO THE SECTION 3", {
        empPosition,
        empDeptId,
        empDeptName,
        section3ApprovalDeptIds: section3Approval.departmentIds,
        section3ApprovalPositions: section3Approval.positions,
      });
    }
  }, [isSection3Approver]);

  useEffect(() => {
    const multiLocationRoles = [
      "department_reviewer",
      "group_reviewer",
      "safety_head",
    ];
    const isMultiLocation = multiLocationRoles.includes(
      normalizePosition(empInfo.emp_position),
    );

    if (isSection3Approver || isMultiLocation) {
      setLocationFilter(""); // all locations
    } else {
      setLocationFilter(empInfo.emp_location || "");
    }
  }, [isSection3Approver, empInfo.emp_position, empInfo.emp_location]);

  const PAGE_SIZE = 10;

  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllReports = async () => {
      const empData = JSON.parse(localStorage.getItem("user")) || {};
      console.log(empData);
      setEmpInfo(empData);

      try {
        setLoading(true);
        setError(null);
        const ReportRes = await axios.get(
          `${config.baseApi}/accident/get-all-report`,
        );

        const reportsWithSection1 = await Promise.all(
          ReportRes.data.map(async (report) => {
            try {
              const [
                section1Res,
                section3Res,
                section46Res,
                section7Res,
                section8Res,
              ] = await Promise.all([
                axios.get(`${config.baseApi}/accident/get-section1-by-id`, {
                  params: { accident_id: report.accident_id },
                }),
                axios
                  .get(`${config.baseApi}/accident/get-section3-by-id`, {
                    params: { accident_id: report.accident_id },
                  })
                  .catch(() => ({ data: null })),
                axios
                  .get(`${config.baseApi}/accident/get-section46-by-id`, {
                    params: { accident_id: report.accident_id },
                  })
                  .catch(() => ({ data: null })),
                axios
                  .get(`${config.baseApi}/accident/get-section7-by-id`, {
                    params: { accident_id: report.accident_id },
                  })
                  .catch(() => ({ data: null })),
                axios
                  .get(`${config.baseApi}/accident/get-section8-by-id`, {
                    params: { accident_id: report.accident_id },
                  })
                  .catch(() => ({ data: null })),
              ]);
              return {
                ...report,
                section1: section1Res.data,
                section3: section3Res.data,
              };
            } catch {
              return { ...report, section1: [], section3: null };
            }
          }),
        );

        const flat = [];
        reportsWithSection1.forEach((report) => {
          if (report.section1?.length > 0) {
            report.section1.forEach((section) => {
              flat.push({
                accident_id: report.accident_id,
                ac_status: report.ac_status || null,
                is_safety_personnel: report.is_safety_personnel,
                is_concerned_department: report.is_concerned_department,
                is_group_manager: report.is_group_manager,
                is_safety_dh: report.is_safety_dh,
                attending_physician:
                  report.section3?.attending_physicians_name_and_signature ??
                  null, // ← add this line
                work_related: section.work_related ?? null,

                name: section.name || "N/A",
                department: section.department || "N/A",
                group: section.group || "N/A",
                prepared_by: section.prepared_by || "N/A",
                date_and_time: section.date_and_time || null,
                subtypes: parseSubtypes(
                  section.subtypes || section.subtype || "",
                ),
                location: section.location || "N/A",
                specific_location: section.specific_location || "N/A",
              });
            });
          }
        });

        setFlattenedData(flat);
      } catch {
        setError("Failed to load reports. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllReports();
  }, []);
  useEffect(() => {
    const fetchSetup = async () => {
      try {
        const [approversRes, groupsRes] = await Promise.all([
          axios.get(
            `${config.baseApi}/setup/permissions/section_three_approvers`,
          ),
          axios.get(`${config.baseApi}/setup/all`),
        ]);
        if (approversRes.data.message === "success") {
          setSection3Approval(approversRes.data.data);
        }
        if (groupsRes.data.message === "success") {
          setGroupList(groupsRes.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch setup data:", err);
      }
    };
    fetchSetup();
  }, []);

  /* ─── Count reports by exact ac_status ─── */
  const statusCounts = useMemo(() => {
    const counts = {};
    flattenedData.forEach((r) => {
      const status = r.ac_status?.toLowerCase().trim();
      if (status) counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [flattenedData]);

  /* ─── Location options + per-location counts ─── */
  const locationOptions = useMemo(() => {
    const locs = flattenedData
      .map((r) => r.location)
      .filter((l) => l && l !== "N/A");
    return [...new Set(locs)].sort();
  }, [flattenedData]);

  const locationCounts = useMemo(() => {
    const counts = {};
    flattenedData.forEach((r) => {
      if (r.location && r.location !== "N/A")
        counts[r.location] = (counts[r.location] || 0) + 1;
    });
    return counts;
  }, [flattenedData]);
  useEffect(() => {
    if (flattenedData.length > 0 && empInfo.emp_position) {
      console.log("=== DEBUG ===");
      console.log("emp_position raw:", empInfo.emp_position);
      console.log(
        "emp_position normalized:",
        normalizePosition(empInfo.emp_position),
      );
      console.log("isSection3Approver:", isSection3Approver);
      console.log("Sample row flags:", flattenedData[0]);

      const pending = flattenedData.filter((r) =>
        isPendingForRole(r, empInfo.emp_position),
      );
      console.log("Pending count:", pending.length);
      console.log(
        "Rows where is_safety_personnel === true:",
        flattenedData.filter((r) => r.is_safety_personnel === true).length,
      );
      console.log(
        "Rows where is_concerned_department is falsy:",
        flattenedData.filter((r) => isFalsyFlag(r.is_concerned_department))
          .length,
      );
      console.log(
        "Rows matching dept-reviewer rule:",
        flattenedData.filter(
          (r) =>
            r.is_safety_personnel === true &&
            isFalsyFlag(r.is_concerned_department) &&
            isFalsyFlag(r.is_group_manager) &&
            isFalsyFlag(r.is_safety_dh),
        ).length,
      );
    }
  }, [flattenedData, empInfo.emp_position, isSection3Approver]);

  const pendingCount = useMemo(() => {
    return flattenedData.filter((r) =>
      isPending(
        r,
        isSection3Approver,
        empInfo.emp_position,
        empInfo.emp_department,
        empInfo.emp_group,
      ),
    ).length;
  }, [
    flattenedData,
    empInfo.emp_position,
    empInfo.emp_department,
    empInfo.emp_group,
    isSection3Approver,
  ]);

  /* ─── Role-specific pending cards ─── */
  const roleCards = useMemo(() => {
    const sc = (key) => statusCounts[key] || 0;
    const cpp = sc(CORRECTIVE_PREVENTIVE_STATUS);

    if (isSection3Approver) {
      return [
        {
          label: "All Pending Report",
          value: pendingCount,
          bc: "#6300e4",
          bg: "#572bd156",
          c: "#261157",
        },
        {
          label: "Pending Review Medical",
          value: sc("pending review for safety/medical"),
          bc: "#ff9900",
          bg: "#faf4e856",
          c: "#7a561f",
        },
      ];
    }

    switch (empPosition) {
      case "safety_reviewer":
        return [
          {
            label: "All Pending Report",
            value: pendingCount,
            bc: "#6300e4",
            bg: "#572bd156",
            c: "#261157",
          },
          {
            label: "Pending Safety Reports",
            value: sc("pending review for safety"),
            bc: "#b6b328",
            bg: "#f9fae856",
            c: "#575c12",
          },
          {
            label: "Pending Corrective And Preventive",
            value: cpp,
            bc: "#c0392b",
            bg: "#fae8e856",
            c: "#7a1f1f",
          },
          {
            label: "Pending Medical Review",
            value: sc("pending review for safety/medical"),
            bc: "#ff9900",
            bg: "#faf4e856",
            c: "#7a561f",
          },
        ];
      case "department_reviewer":
        return [
          {
            label: "All Pending Report",
            value: pendingCount,
            bc: "#6300e4",
            bg: "#572bd156",
            c: "#261157",
          },
          {
            label: "Pending Review For Department",
            value: sc("pending review for department"),
            bc: "#0270b9",
            bg: "#ddf1fd56",
            c: "#154961",
          },
          {
            label: "Pending Department Closure",
            value: sc("pending department closure"),
            bc: "#2e6fd9",
            bg: "#e8f0fa56",
            c: "#1a3a6b",
          },
          {
            label: "Pending Corrective And Preventive",
            value: cpp,
            bc: "#c0392b",
            bg: "#fae8e856",
            c: "#7a1f1f",
          },
        ];
      case "group_reviewer":
        return [
          {
            label: "All Pending Report",
            value: pendingCount,
            bc: "#6300e4",
            bg: "#572bd156",
            c: "#261157",
          },
          {
            label: "Pending Review For Group Manager",
            value: sc("pending review for group manager"),
            bc: "#4202b9",
            bg: "#ecddfd56",
            c: "#291561",
          },
          {
            label: "Pending Corrective And Preventive",
            value: cpp,
            bc: "#c0392b",
            bg: "#fae8e856",
            c: "#7a1f1f",
          },
          {
            label: "Pending Group Closure",
            value: sc("pending group closure"),
            bc: "#8e44ad",
            bg: "#f0e8fa56",
            c: "#4a1a7a",
          },
        ];
      case "safety_head":
        return [
          {
            label: "All Pending Report",
            value: pendingCount,
            bc: "#6300e4",
            bg: "#572bd156",
            c: "#261157",
          },
          {
            label: "Pending Review Safety DH",
            value: sc("pending review for safety dh"),
            bc: "#008394",
            bg: "#dcfaff56",
            c: "#005358",
          },
          {
            label: "Pending Safety DH Closure",
            value: sc("pending safety dh closure"),
            bc: "#d6338c",
            bg: "#fde8f556",
            c: "#7a1a5a",
          },
          {
            label: "Pending Corrective And Preventive",
            value: cpp,
            bc: "#c0392b",
            bg: "#fae8e856",
            c: "#7a1f1f",
          },
        ];
      default:
        return [
          {
            label: "All Pending Report",
            value: pendingCount,
            bc: "#6300e4",
            bg: "#572bd156",
            c: "#261157",
          },
        ];
    }
  }, [empPosition, statusCounts, pendingCount, isSection3Approver]);

  /* ─── Filtered + sorted ─── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const fromTime = dateFrom
      ? new Date(dateFrom + "T00:00:00").getTime()
      : null;
    const toTime = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return flattenedData
      .filter((r) => {
        const matchesSearch =
          !q ||
          r.accident_id?.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q) ||
          r.department?.toLowerCase().includes(q) ||
          r.group?.toLowerCase().includes(q) ||
          r.prepared_by?.toLowerCase().includes(q);

        const matchesLocation =
          !locationFilter || r.location === locationFilter;

        const matchesReportFilter =
          reportFilter === "all" ||
          isPending(
            r,
            isSection3Approver,
            empInfo.emp_position,
            empInfo.emp_department,
            empInfo.emp_group,
          );

        let matchesDate = true;
        if (fromTime !== null || toTime !== null) {
          const rowTime = r.date_and_time
            ? new Date(r.date_and_time).getTime()
            : NaN;
          if (isNaN(rowTime)) {
            matchesDate = false;
          } else {
            if (fromTime !== null && rowTime < fromTime) matchesDate = false;
            if (toTime !== null && rowTime > toTime) matchesDate = false;
          }
        }

        const matchesWorkRelated =
          workRelatedFilter === "all" || r.work_related === workRelatedFilter;

        // ── Role-scope filter

        let matchesRoleScope = true;
        if (empPosition === "department_reviewer") {
          const norm = (s) => s?.toLowerCase().trim();
          matchesRoleScope =
            norm(r.group) === norm(empInfo.emp_group) &&
            norm(r.department) === norm(empInfo.emp_department);
        } else if (empPosition === "group_reviewer") {
          const norm = (s) => s?.toLowerCase().trim();
          matchesRoleScope = norm(r.group) === norm(empInfo.emp_group);
        }

        return (
          matchesSearch &&
          matchesLocation &&
          matchesReportFilter &&
          matchesDate &&
          matchesWorkRelated &&
          matchesRoleScope // ← add this
        );
      })
      .sort((a, b) => {
        const aVal = a[sortField] || "";
        const bVal = b[sortField] || "";
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [
    flattenedData,
    search,
    sortField,
    sortDir,
    locationFilter,
    reportFilter,
    dateFrom,
    dateTo,
    empInfo.emp_position,
    empInfo.emp_department,
    empInfo.emp_group,
    isSection3Approver,
    workRelatedFilter,
    empPosition, // ← add this (it's derived from empInfo but used directly)
  ]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };
  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo]);

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <span style={{ opacity: 0.4, marginLeft: 4 }}>⇅</span>;
    return (
      <span style={{ marginLeft: 4, color: "#1B8C60" }}>
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  /* ─── Loading / Error ─── */
  if (loading) {
    return (
      <div style={S.shell}>
        {STYLE_TAG}
        {TOP_BAR(navigate)}
        <div
          style={{
            padding: "60px 32px",
            textAlign: "center",
            color: "#5E7A6E",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div style={{ fontSize: "13px" }}>Loading reports…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.shell}>
        {STYLE_TAG}
        {TOP_BAR(navigate)}
        <div style={{ padding: "40px 32px" }}>
          <div
            style={{
              background: "#FAE8E8",
              border: "1px solid #B02020",
              color: "#7A1F1F",
              padding: "14px 18px",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.shell}>
      {STYLE_TAG}

      {/* ─── TOP HEADER BAR ─── */}
      <div className="ar-topbar-outer">
        <div className="ar-topbar-brand">
          <div className="ar-brand-left">
            <button
              className="ar-back-btn"
              onClick={() => window.history.back()}
            >
              ← Back
            </button>
            <div className="ar-divider" />
            <div>
              <span className="ar-brand-title">SAIRI</span>
              <span className="ar-brand-sub">
                Safety Accident / Incident Report and Investigation
              </span>
            </div>
          </div>
          <div className="ar-topbar-actions">
            {/* <button className="ar-btn ar-btn--ghost-dark">Export CSV</button> */}
            <button
              className="ar-btn ar-btn--primary"
              onClick={() => navigate("/admin/add-report")}
            >
              + New Report
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="ar-main">
        {/* Page header — title only now; filters live in the toolbar above the table */}
        <div className="ar-page-header">
          <div>
            <h1 className="ar-page-title">All Reports</h1>
            <p className="ar-page-sub">
              REPORT.INDEX — {filtered.length} record
              {filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="ar-header-right"></div>
        </div>

        {/* Stat cards — pending per approval stage */}
        {/* Stat cards — role-specific pending counts */}
        <div
          className={`ar-stats-row${roleCards.length === 4 ? " ar-stats-row--4" : ""}`}
        >
          {roleCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              delta={card.value === 1 ? "1 item" : `${card.value} items`}
              deltaType="warn"
              bc={card.bc}
              bg={card.bg}
              c={card.c}
            />
          ))}
        </div>
        {/* Plate */}
        <div className="ar-plate">
          <span className="ar-plate-code"></span>
          <span className="ar-plate-title">All Accident / Incident</span>
          <span
            className="ar-plate-note"
            style={{ color: "#37d172", fontFamily: "monospace" }}
          >
            Click any row to open full report
          </span>
        </div>

        {/* ─── FILTER TOOLBAR — now sits directly above the table ─── */}
        <div className="ar-toolbar">
          <ReportFilterDropdown
            value={reportFilter}
            onChange={(val) => {
              setReportFilter(val);
              setPage(1);
            }}
            allCount={flattenedData.length}
            pendingCount={pendingCount}
          />

          <LocationDropdown
            value={locationFilter}
            onChange={(val) => {
              setLocationFilter(val);
              setPage(1);
            }}
            options={locationOptions}
            counts={locationCounts}
            totalCount={flattenedData.length}
          />
          <WorkRelatedFilter
            value={workRelatedFilter}
            onChange={(val) => {
              setWorkRelatedFilter(val);
              setPage(1);
            }}
          />

          <DateRangeDropdown
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
              setPage(1);
            }}
          />

          <div className="ar-search-wrap ar-toolbar-search">
            <svg className="ar-search-icon" viewBox="0 0 16 16" fill="none">
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
              className="ar-search-input"
              placeholder="Search by name, ID, department…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            className="ar-btn ar-btn--reload"
            onClick={() => window.location.reload()}
            title="Reload reports"
          >
            <FeatherIcon icon="refresh-ccw" size={15} />
          </button>
        </div>

        {/* Panel */}
        <div className="ar-panel">
          {flattenedData.length === 0 ? (
            <div className="ar-empty">
              <div
                style={{ fontSize: "32px", marginBottom: "10px", opacity: 0.3 }}
              >
                ⚑
              </div>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                No reports yet
              </div>
              <div style={{ fontSize: "12px" }}>
                Create the first report to get started.
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ar-empty">
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                No results
              </div>
              <div style={{ fontSize: "12px" }}>
                Try a different search or filter.
              </div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="ar-table">
                  <thead>
                    <tr>
                      <th
                        className="ar-th ar-th--sort"
                        onClick={() => handleSort("accident_id")}
                      >
                        Accident ID <SortIcon field="accident_id" />
                      </th>
                      <th className="ar-th">Status</th>
                      <th className="ar-th">Name</th>
                      <th className="ar-th">Department</th>
                      <th
                        className="ar-th ar-th--sort"
                        onClick={() => handleSort("group")}
                      >
                        Group <SortIcon field="group" />
                      </th>
                      <th
                        className="ar-th ar-th--sort"
                        onClick={() => handleSort("location")}
                      >
                        Location <SortIcon field="location" />
                      </th>
                      <th className="ar-th">Work Related</th>
                      {/* <th className="ar-th">Subtype</th> */}
                      <th className="ar-th">Prepared By</th>
                      <th
                        className="ar-th ar-th--sort"
                        onClick={() => handleSort("date_and_time")}
                      >
                        Date & Time <SortIcon field="date_and_time" />
                      </th>
                      <th className="ar-th" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((item, index) => (
                      <tr
                        key={`${item.accident_id}-${index}`}
                        className="ar-tr"
                        onClick={() =>
                          navigate(
                            `/admin/view-report?ACID=${item.accident_id}`,
                          )
                        }
                      >
                        <td className="ar-td">
                          <span className="ar-acid">{item.accident_id}</span>
                        </td>
                        <td className="ar-td">
                          <StatusBadge status={item.ac_status} />
                        </td>
                        <td className="ar-td" style={{ fontWeight: 500 }}>
                          {item.name}
                        </td>
                        <td className="ar-td">
                          <span className="ar-dept-badge">
                            {item.department}
                          </span>
                        </td>
                        <td className="ar-td">
                          <span className="ar-dept-badge">{item.group}</span>
                        </td>
                        <td className="ar-td">
                          <LocationBadge location={item.location} />
                        </td>
                        <td className="ar-td">
                          {item.work_related === "work_related" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 9px",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: "#D4EDE5",
                                color: "#0F3D2B",
                                border: "2px solid #1B8C60",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#1B8C60",
                                }}
                              />
                              Yes
                            </span>
                          ) : item.work_related === "not_work_related" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 9px",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: "#FAE8E8",
                                color: "#7A1F1F",
                                border: "2px solid #C0392B",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#C0392B",
                                }}
                              />
                              No
                            </span>
                          ) : (
                            <span
                              style={{ color: "#5E7A6E", fontSize: "12px" }}
                            >
                              —
                            </span>
                          )}
                        </td>
                        {/* <td className="ar-td">
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "2px",
                            }}
                          >
                            {item.subtypes.length > 0 ? (
                              item.subtypes.map((s, i) => (
                                <SubtypeTag key={i} label={s} />
                              ))
                            ) : (
                              <span
                                style={{ color: "#5E7A6E", fontSize: "12px" }}
                              >
                                —
                              </span>
                            )}
                          </div>
                        </td> */}
                        <td className="ar-td ar-ts">{item.prepared_by}</td>
                        <td className="ar-td ar-ts">
                          {formatDate(item.date_and_time)}
                        </td>
                        <td className="ar-td">
                          <span className="ar-row-action">View →</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="ar-pagination">
                <span className="ar-pag-info">
                  Showing{" "}
                  {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
                  {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length} records
                </span>
                <div className="ar-pag-btns">
                  <button
                    className="ar-pag-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹ Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                    )
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`e-${i}`} className="ar-pag-ellipsis">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          className={`ar-pag-btn${page === p ? " ar-pag-btn--active" : ""}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  <button
                    className="ar-pag-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STATUS BADGE
   ════════════════════════════════════════════════════════════════════════ */

const STATUS_STYLES = {
  // "open": { bg: "#FFF3DC", color: "#7A4900", dot: "#E09000" },
  // "resolved": { bg: "#D4EDE5", color: "#0F3D2B", dot: "#1B8C60" },
  "pending review for safety/medical": {
    bg: "#faf4e8",
    color: "#7a561f",
    dot: "#ff9900",
  },
  "pending review for safety": {
    bg: "#f9fae8",
    color: "#575c12",
    dot: "#b6b328",
  },
  "pending review for department": {
    bg: "#ddf1fd",
    color: "#154961",
    dot: "#0270b9",
  },
  "pending review for group manager": {
    bg: "#ecddfd",
    color: "#291561",
    dot: "#4202b9",
  },
  "pending review for safety dh": {
    bg: "#dcfaff",
    color: "#005358",
    dot: "#008394",
  },
  "pending corrective and preventive": {
    bg: "#FAE8E8",
    color: "#7A1F1F",
    dot: "#C0392B",
  },
  "pending department closure": {
    bg: "#E8F0FA",
    color: "#1A3A6B",
    dot: "#2E6FD9",
  },
  "pending group closure": { bg: "#F0E8FA", color: "#4A1A7A", dot: "#8E44AD" },
  "pending safety dh closure": {
    bg: "#FDE8F5",
    color: "#7A1A5A",
    dot: "#D6338C",
  },
  "pending safety dh closure": {
    bg: "#FDE8F5",
    color: "#7A1A5A",
    dot: "#D6338C",
  },
  complete: { bg: "#ceffc7", color: "#125f12", dot: "#33d656" },
  // "closed": { bg: "#E4E9E7", color: "#33463E", dot: "#5E7A6E" },
  // "rejected": { bg: "#F5D9D9", color: "#5C1414", dot: "#A93226" },
};

const DEFAULT_STATUS_STYLE = {
  bg: "#F0F4F2",
  color: "#2C4A3E",
  dot: "#5E7A6E",
};

function StatusBadge({ status }) {
  if (!status)
    return <span style={{ color: "#5E7A6E", fontSize: "12px" }}>—</span>;
  const normalized = status.toLowerCase().trim();
  const s = STATUS_STYLES[normalized] || DEFAULT_STATUS_STYLE;
  const label = status
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 9px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        border: `2px solid ${s.dot}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   LOCATION BADGE
   ════════════════════════════════════════════════════════════════════════ */

function LocationBadge({ location }) {
  if (!location || location === "N/A")
    return <span style={{ color: "#5E7A6E", fontSize: "12px" }}>—</span>;
  const dot = LOCATION_COLORS[location] || "#5E7A6E";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 9px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        background: "#F0F4F2",
        color: "#2C4A3E",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
        }}
      />
      {location}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   INLINE STYLE OBJECT
   ════════════════════════════════════════════════════════════════════════ */

const S = {
  shell: { minHeight: "100vh", display: "flex", flexDirection: "column" },
};

/* ════════════════════════════════════════════════════════════════════════
   TOP BAR
   ════════════════════════════════════════════════════════════════════════ */

function TOP_BAR(navigate) {
  return (
    <div className="ar-topbar-outer">
      <div className="ar-topbar-brand">
        <div className="ar-brand-left">
          <button className="ar-back-btn" onClick={() => window.history.back()}>
            ← Back
          </button>
          <div className="ar-divider" />
          <div>
            <span className="ar-brand-title">SAIRI</span>
            <span className="ar-brand-sub">
              Safety Accident / Incident Report and Investigation
            </span>
          </div>
        </div>
        <div className="ar-topbar-actions">
          <button
            className="ar-btn ar-btn--primary"
            onClick={() => navigate("/admin/add-report")}
          >
            + New Report
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_TAG = (
  <style>{`
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --ar-ink:         #0D1B2A;
  --ar-ink-soft:    #2C4A3E;
  --ar-muted:       #5E7A6E;
  --ar-paper:       #FFFFFF;
  --ar-paper-alt:   #F0F4F2;
  --ar-line:        #C8D8D1;
  --ar-line-strong: #9DBCB0;
  --ar-amber:       #1B5E44;
  --ar-amber-deep:  #0F3D2B;
  --ar-amber-soft:  #D4EDE5;
  --ar-accent:      #1B8C60;
  --ar-danger:      #B02020;
  --font-display:   'Barlow Condensed', sans-serif;
  --font-body:      'Inter', sans-serif;
  --font-mono:      'IBM Plex Mono', monospace;
}

/* ═══ BASE ═══ */
* { box-sizing: border-box; }

/* ═══ TOPBAR ═══ */
.ar-topbar-outer {
  background: #0D1B2A;
  position: sticky; top: 0; z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ar-topbar-brand {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 32px; flex-wrap: wrap; gap: 12px;
}
.ar-brand-left { display: flex; align-items: center; gap: 16px; }
.ar-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.1); }
.ar-brand-title { font-family: var(--font-display); font-weight: 700; font-size: 18px; color: #E8F4EF; letter-spacing: 0.05em; display: block; }
.ar-brand-sub   { font-size: 10px; color: #4A6B84; text-transform: uppercase; letter-spacing: 0.08em; display: block; }
.ar-back-btn {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #8AA4B8;
  padding: 6px 14px; border-radius: 6px; font-size: 12px; font-family: var(--font-body); cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.ar-back-btn:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
.ar-topbar-actions { display: flex; gap: 10px; align-items: center; }

/* ═══ BUTTONS ═══ */
.ar-btn { font-family: var(--font-body); font-size: 12.5px; font-weight: 600; padding: 9px 18px; border-radius: 6px; cursor: pointer; border: 1.5px solid transparent; }
.ar-btn--primary { background: var(--ar-accent); color: #fff; border-color: var(--ar-amber-deep); }
.ar-btn--primary:hover { background: var(--ar-amber-deep); }
.ar-btn--ghost-dark { background: transparent; color: #8AA4B8; border-color: rgba(255,255,255,0.1); }
.ar-btn--ghost-dark:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

/* ═══ MAIN ═══ */
.ar-main { flex: 1; padding: 28px 40px 80px; min-width: 0; }

/* ═══ PAGE HEADER ═══ */
.ar-page-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 22px; padding-bottom: 18px; border-bottom: 2px solid var(--ar-line);
  flex-wrap: wrap; gap: 14px;
}
.ar-page-title { font-family: var(--font-display); font-weight: 700; font-size: 32px; margin: 0; letter-spacing: 0.01em; color: var(--ar-ink); }
.ar-page-sub   { font-family: var(--font-mono); font-size: 11px; color: var(--ar-amber); letter-spacing: 0.1em; margin: 2px 0 0; }
.ar-header-right { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

/* ═══ FILTER TOOLBAR (above table) ═══ */
.ar-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.ar-toolbar-search { flex: 1 1 220px; }
.ar-toolbar-search .ar-search-input { width: 100%; }

/* ═══ REPORT TABS ═══ */
.ar-tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 2px solid var(--ar-line); }
.ar-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 16px; margin-bottom: -2px;
  background: transparent; border: none; border-bottom: 2px solid transparent;
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  color: var(--ar-muted); cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.ar-tab:hover { color: var(--ar-ink-soft); }
.ar-tab--active { color: var(--ar-amber-deep); border-bottom-color: var(--ar-accent); }
.ar-tab-count {
  font-family: var(--font-mono); font-size: 10.5px; font-weight: 700;
  background: var(--ar-paper-alt); color: var(--ar-muted);
  border: 1px solid var(--ar-line); border-radius: 999px;
  padding: 1px 7px;
}
.ar-tab--active .ar-tab-count { background: rgba(27,140,96,0.1); border-color: rgba(27,140,96,0.25); color: var(--ar-accent); }
.ar-tab-count--warn { background: #FFF3DC; border-color: #F0C878; color: #B07000; }
.ar-tab--active .ar-tab-count--warn { background: #FFEBB0; border-color: #E0A030; color: #7A4900; }

/* ═══ CUSTOM LOCATION DROPDOWN ═══ */
.ld-root { position: relative; }

.ld-trigger {
  display: inline-flex; align-items: center; justify-content: space-between;
  gap: 10px; min-width: 190px;
  padding: 0 12px; height: 36px;
  background: var(--ar-paper);
  border: 1.5px solid var(--ar-line-strong);
  border-radius: 7px;
  font-family: var(--font-body); font-size: 13px; font-weight: 500;
  color: var(--ar-ink-soft);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  user-select: none;
  white-space: nowrap;
}
.ld-trigger:hover {
  border-color: var(--ar-accent);
  box-shadow: 0 0 0 3px rgba(27,140,96,0.08);
}
.ld-trigger--open {
  border-color: var(--ar-accent);
  box-shadow: 0 0 0 3px rgba(27,140,96,0.12);
}
.ld-trigger--active {
  border-color: var(--ar-accent);
  background: #EDF7F3;
  color: var(--ar-amber-deep);
  font-weight: 600;
}

.ld-trigger-left  { display: flex; align-items: center; gap: 7px; }
.ld-trigger-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.ld-filter-svg { color: var(--ar-muted); flex-shrink: 0; }
.ld-trigger--active .ld-filter-svg { color: var(--ar-accent); }

.ld-trigger-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}

.ld-trigger-label { max-width: 130px; overflow: hidden; text-overflow: ellipsis; }

.ld-clear-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(0,0,0,0.07); color: var(--ar-muted);
  cursor: pointer; transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}
.ld-clear-btn:hover { background: #FAE8E8; color: var(--ar-danger); }

.ld-chevron { color: var(--ar-muted); transition: transform 0.18s ease; flex-shrink: 0; }
.ld-chevron--up { transform: rotate(180deg); }

/* ─── Dropdown panel ─── */
.ld-panel.ld-panel--date {
  min-width: 280px;
  padding-bottom: 4px;
  left: auto;
  right: 0;
}
.dr-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px 4px;
}
.dr-preset-btn {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1.5px solid var(--ar-line);
  background: var(--ar-paper-alt);
  color: var(--ar-ink-soft);
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.dr-preset-btn:hover {
  border-color: var(--ar-accent);
  background: #EDF7F3;
  color: var(--ar-amber-deep);
}

.dr-fields {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
}
.dr-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dr-field-label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 600;
  color: var(--ar-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.dr-field-input {
  border: 1.5px solid var(--ar-line-strong);
  border-radius: 6px;
  padding: 6px 8px;
  font-family: var(--font-body);
  font-size: 12.5px;
  color: var(--ar-ink-soft);
  background: var(--ar-paper);
  outline: none;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.dr-field-input:focus {
  border-color: var(--ar-accent);
  box-shadow: 0 0 0 3px rgba(27,140,96,0.1);
}

.dr-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px 12px;
  border-top: 1px solid var(--ar-line);
  margin-top: 4px;
}
.dr-clear-all {
  background: transparent;
  border: none;
  color: var(--ar-muted);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
}
.dr-clear-all:hover:not(:disabled) { color: var(--ar-danger); }
.dr-clear-all:disabled { opacity: 0.4; cursor: not-allowed; }

.dr-done {
  background: var(--ar-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.dr-done:hover { background: var(--ar-amber-deep); }
.ld-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 230px;
  background: var(--ar-paper);
  border: 1.5px solid var(--ar-line);
  border-radius: 9px;
  box-shadow: 0 8px 24px rgba(13,27,42,0.12), 0 2px 6px rgba(13,27,42,0.06);
  z-index: 200;
  overflow: hidden;
  animation: ld-in 0.14s ease;
}

@keyframes ld-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ld-panel-header {
  padding: 9px 14px 7px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 600;
  color: var(--ar-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--ar-line);
  background: #F8FAF9;
}

.ld-divider { height: 1px; background: var(--ar-line); margin: 3px 0; }

.ld-option {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 8px 14px;
  background: transparent; border: none;
  font-family: var(--font-body); font-size: 13px; font-weight: 400;
  color: var(--ar-ink-soft);
  cursor: pointer; text-align: left;
  transition: background 0.1s, color 0.1s;
  gap: 10px;
}
.ld-option:hover { background: var(--ar-paper-alt); color: var(--ar-ink); }
.ld-option--selected {
  background: #EDF7F3;
  color: var(--ar-amber-deep);
  font-weight: 600;
}
.ld-option--selected:hover { background: #D4EDE5; }

.ld-option-left  { display: flex; align-items: center; gap: 9px; }
.ld-option-dot   { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.ld-option-name  { font-size: 13px; }

.ld-option-count {
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ar-muted);
  background: var(--ar-paper-alt);
  border: 1px solid var(--ar-line);
  border-radius: 4px;
  padding: 1px 6px;
  flex-shrink: 0;
}
.ld-option--selected .ld-option-count {
  background: rgba(27,140,96,0.1);
  border-color: rgba(27,140,96,0.25);
  color: var(--ar-accent);
}

/* ═══ SEARCH ═══ */
.ar-search-wrap { position: relative; }
.ar-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  width: 15px; height: 15px; pointer-events: none;
}
.ar-search-input {
  padding: 8px 10px 8px 32px;
  border: 1.5px solid var(--ar-line-strong); border-radius: 7px;
  font-size: 13px; font-family: var(--font-body);
  background: var(--ar-paper); color: var(--ar-ink);
  width: 300px; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  height: 36px;
}
.ar-search-input:focus { border-color: var(--ar-amber); box-shadow: 0 0 0 3px rgba(27,94,68,0.12); }
.ar-search-input::placeholder { color: var(--ar-muted); }

/* ═══ STAT CARDS ═══ */
.ar-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 22px; }
@media (max-width: 900px) { .ar-stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px) { .ar-stats-row { grid-template-columns: 1fr; } }

/* ═══ PLATE ═══ */
.ar-plate {
  display: flex; align-items: baseline; gap: 12px;
  background: var(--ar-ink); color: #fff;
  border-left: 5px solid var(--ar-accent);
  padding: 10px 18px; border-radius: 5px; margin-bottom: 18px;
}
.ar-plate-code  { font-family: var(--font-mono); font-size: 11px; color: var(--ar-accent); letter-spacing: 0.08em; }
.ar-plate-title { font-family: var(--font-display); font-weight: 600; font-size: 19px; letter-spacing: 0.01em; }
.ar-plate-note  { font-size: 12px; color: #6A8FA8; font-style: italic; margin-left: auto; }

/* ═══ PANEL ═══ */
.ar-panel { background: var(--ar-paper); border: 1px solid var(--ar-line); border-radius: 8px; overflow: hidden; }

/* ═══ TABLE ═══ */
.ar-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.ar-th {
  padding: 10px 16px; text-align: left; font-size: 10.5px; font-weight: 700;
  color: var(--ar-muted); text-transform: uppercase; letter-spacing: 0.06em;
  background: #F8FAF9; border-bottom: 2px solid var(--ar-line); white-space: nowrap;
}
.ar-th--sort { cursor: pointer; user-select: none; }
.ar-th--sort:hover { color: var(--ar-amber); }
.ar-td { padding: 11px 16px; font-size: 13px; border-bottom: 1px solid var(--ar-line); vertical-align: middle; }
.ar-tr { cursor: pointer; transition: background 0.1s; }
.ar-tr:hover { background: var(--ar-amber-soft); }
.ar-tr:last-child .ar-td { border-bottom: none; }
.ar-acid { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--ar-accent); }
.ar-dept-badge {
  display: inline-flex; align-items: center; padding: 2px 8px;
  border-radius: 4px; font-size: 11px; font-weight: 600;
  background: var(--ar-amber-soft); color: var(--ar-amber-deep); white-space: nowrap;
}
.ar-ts { font-size: 12px; color: var(--ar-muted); }
.ar-row-action { opacity: 0; color: var(--ar-accent); font-size: 12px; font-weight: 600; transition: opacity 0.15s; white-space: nowrap; }
.ar-tr:hover .ar-row-action { opacity: 1; }

/* ═══ EMPTY STATE ═══ */
.ar-empty { padding: 60px 20px; text-align: center; color: var(--ar-muted); font-size: 13px; font-family: var(--font-body); }

/* ═══ PAGINATION ═══ */
.ar-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--ar-line); flex-wrap: wrap; gap: 10px; }
.ar-pag-info   { font-size: 12px; color: var(--ar-muted); font-family: var(--font-body); }
.ar-pag-btns   { display: flex; gap: 4px; align-items: center; }
.ar-pag-btn {
  padding: 5px 10px; border: 1.5px solid var(--ar-line-strong); border-radius: 5px;
  background: var(--ar-paper); font-size: 12px; font-family: var(--font-body);
  cursor: pointer; color: var(--ar-ink-soft); transition: border-color 0.1s, background 0.1s;
}
.ar-pag-btn:hover:not(:disabled) { border-color: var(--ar-amber); background: var(--ar-amber-soft); }
.ar-pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ar-pag-btn--active { background: var(--ar-accent); color: #fff; border-color: var(--ar-amber-deep); }
.ar-pag-btn--active:hover { background: var(--ar-amber-deep); }
.ar-pag-ellipsis { font-size: 12px; color: var(--ar-muted); padding: 0 4px; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  .ar-topbar-brand { padding: 10px 16px; }
  .ar-main { padding: 20px 16px 60px; }
  .ar-plate-note { display: none; }
  .ar-search-input { width: 200px; }
  .ar-page-header { flex-direction: column; align-items: flex-start; }
  .ar-header-right { width: 100%; }
  .ld-trigger { min-width: 160px; }
  .ld-panel { min-width: 200px; }
  .ar-toolbar { flex-direction: column; align-items: stretch; }
  .ar-toolbar-search { flex: 1 1 auto; }
}
  .ar-btn--reload {
  background: var(--ar-paper);
  color: var(--ar-ink-soft);
  border-color: var(--ar-line-strong);
  display: inline-flex;
  align-items: center;
}
.ar-btn--reload:hover {
  border-color: var(--ar-accent);
  color: var(--ar-accent);
  background: #EDF7F3;
}

/* ═══ DATE RANGE FILTER ═══ */
.ar-date-range {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  background: var(--ar-paper);
  border: 1.5px solid var(--ar-line-strong);
  border-radius: 7px;
}
.ar-date-input {
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 12.5px;
  color: var(--ar-ink-soft);
  height: 100%;
  padding: 0 2px;
}
.ar-date-sep {
  font-size: 11px;
  color: var(--ar-muted);
  font-family: var(--font-body);
}
.ar-date-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(0,0,0,0.07);
  color: var(--ar-muted);
  cursor: pointer;
  border: none;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}
.ar-date-clear:hover {
  background: #FAE8E8;
  color: var(--ar-danger);
}
  .ar-stats-row--4 { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 900px) { .ar-stats-row--4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px) { .ar-stats-row--4 { grid-template-columns: 1fr; } }
`}</style>
);
