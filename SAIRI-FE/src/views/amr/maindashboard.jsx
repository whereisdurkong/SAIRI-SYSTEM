import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "config";
import FeatherIcon from "feather-icons-react";
import LoadingSpinner from "components/LoadingComponent";

/* ════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════ */

const SUBTYPE_LABELS = {
    "Injury-LTA-F": "LTA – Fatal",
    "Injury-LTA-NF": "LTA – Non-Fatal",
    "Injury-NLTA": "Non-Loss Time (NLTA)",
    "Injury-FAC": "First Aid Case",
    OI: "Occupational Illness",
    "Property Damage": "Property Damage",
    "Near Miss": "Near Miss",
};

const STAGES = [
    { key: "medical", label: "Safety / Medical Review", color: "#9DBCB0" },
    { key: "department", label: "Department Review", color: "#6FA08B" },
    { key: "group", label: "Group Manager Review", color: "#3F8468" },
    { key: "safetydh", label: "Safety DH Review", color: "#1B5E44" },
    { key: "corrective", label: "Corrective & Preventive", color: "#C06010" },
    { key: "deptclose", label: "Department Closure", color: "#7A6E10" },
    { key: "groupclose", label: "Group Closure", color: "#5A4E90" },
    { key: "safetyclose", label: "Safety DH Closure", color: "#2C4A5C" },
    { key: "complete", label: "Complete", color: "#0F3D2B" },
];

const stageOf = (status) => {
    const s = String(status || "").toLowerCase();
    if (!s) return "medical";
    if (s.includes("complete") && !s.includes("pending")) return "complete";
    if (s.includes("safety dh closure")) return "safetyclose";
    if (s.includes("group closure")) return "groupclose";
    if (s.includes("department closure")) return "deptclose";
    if (s.includes("corrective")) return "corrective";
    if (s.includes("safety dh")) return "safetydh";
    if (s.includes("group manager")) return "group";
    if (s.includes("review for department")) return "department";
    return "medical";
};

const RISK_CATEGORIES = [
    { key: "Extreme", min: 20, color: "#B02020" },
    { key: "High", min: 12, color: "#C06010" },
    { key: "Moderate", min: 6, color: "#7A6E10" },
    { key: "Low", min: 3, color: "#1B5E44" },
    { key: "Negligible", min: 1, color: "#2C4A5C" },
];
const riskOf = (score) =>
    RISK_CATEGORIES.find((c) => score >= c.min) || RISK_CATEGORIES[4];

const splitList = (v, delim) =>
    String(v || "")
        .split(delim)
        .map((s) => s.trim())
        .filter(Boolean);

const parseDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

const monthKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const tally = (rows, getKeys) => {
    const map = new Map();
    rows.forEach((r) =>
        getKeys(r).forEach((k) => map.set(k, (map.get(k) || 0) + 1)),
    );
    return [...map.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
};

const fmtMoney = (n) =>
    "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });

/* ════════════════════════════════════════════════════════════════════════
   SMALL UI PIECES
   ════════════════════════════════════════════════════════════════════════ */

function Card({ title, sub, children, span, accent, icon }) {
    return (
        <div
            className={`db-card${span ? ` db-card--${span}` : ""}`}
            style={accent ? { "--accent": accent } : undefined}
        >
            {title && (
                <div className="db-card-head">
                    <span className="db-card-title">
                        {icon && (
                            <span className="db-card-icon">
                                <FeatherIcon icon={icon} size={14} />
                            </span>
                        )}
                        {title}
                    </span>
                    {sub && <span className="db-card-sub">{sub}</span>}
                </div>
            )}
            <div className="db-card-body">{children}</div>
        </div>
    );
}

function Kpi({ label, value, hint, tone, icon, onClick }) {
    return (
        <div
            className={`db-kpi${tone ? ` db-kpi--${tone}` : ""}${onClick ? " db-kpi--clickable" : ""}`}
            onClick={onClick}
            title={onClick ? `View ${label}` : undefined}
        >
            <div className="db-kpi-top">
                <div className="db-kpi-label">{label}</div>
                {icon && (
                    <span className="db-kpi-icon">
                        <FeatherIcon icon={icon} size={16} />
                    </span>
                )}
            </div>
            <div className="db-kpi-value">{value}</div>
            {hint && <div className="db-kpi-hint">{hint}</div>}
            {onClick && (
                <div className="db-kpi-cta">
                    <FeatherIcon icon="list" size={11} /> View reports
                </div>
            )}
        </div>
    );
}

function HBars({ data, limit = Infinity, color = "#1B5E44", empty = "No data", onRowClick }) {
    const rows = data.slice(0, limit);
    if (rows.length === 0) return <div className="db-empty">{empty}</div>;
    const max = Math.max(...rows.map((r) => r.value), 1);
    return (
        <div className="db-hbars-scroll">          {/* ← new wrapper */}
            <div className="db-hbars">
                {rows.map((r) => (
                    <div
                        className={`db-hbar${onRowClick ? " db-hbar--clickable" : ""}`}
                        key={r.label}
                        onClick={() => onRowClick?.(r.label)}
                        title={onRowClick ? `View reports: ${r.label}` : undefined}
                    >
                        <div className="db-hbar-label" title={r.label}>{r.label}</div>
                        <div className="db-hbar-track">
                            <div
                                className="db-hbar-fill"
                                style={{
                                    width: `${(r.value / max) * 100}%`,
                                    backgroundColor: r.color || color,
                                }}
                            />
                        </div>
                        <div className="db-hbar-val">{r.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TrendChart({ points }) {
    const W = 640, H = 200, P = { t: 14, r: 12, b: 28, l: 30 };
    const max = Math.max(...points.map((p) => p.value), 1);
    const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
    const bw = (W - P.l - P.r) / points.length;
    const y = (v) => P.t + (H - P.t - P.b) * (1 - v / niceMax);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="db-trend" role="img">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                const v = Math.round(niceMax * f);
                return (
                    <g key={f}>
                        <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#C8D8D1" strokeDasharray="3 3" />
                        <text x={P.l - 6} y={y(v) + 3} fontSize="9" textAnchor="end" fill="#5E7A6E">{v}</text>
                    </g>
                );
            })}
            {points.map((p, i) => {
                const x = P.l + i * bw + bw * 0.18;
                const w = bw * 0.64;
                return (
                    <g key={p.key}>
                        <rect x={x} y={y(p.value)} width={w} height={H - P.b - y(p.value)} rx="3" fill="#1B5E44">
                            <title>{`${p.label}: ${p.value}`}</title>
                        </rect>
                        {p.value > 0 && (
                            <text x={x + w / 2} y={y(p.value) - 4} fontSize="9" fontWeight="700" textAnchor="middle" fill="#0F3D2B">{p.value}</text>
                        )}
                        <text x={x + w / 2} y={H - 10} fontSize="9" textAnchor="middle" fill="#5E7A6E">{p.label}</text>
                    </g>
                );
            })}
        </svg>
    );
}

const PIE_COLORS = ["#1B5E44", "#C06010", "#2C4A5C", "#7A6E10", "#5A4E90", "#B02020"];

function PieChart({ data, colors = PIE_COLORS, empty = "No data", stacked = false, onSliceClick }) {
    const rows = data.filter((d) => d.value > 0);
    if (rows.length === 0) return <div className="db-empty">{empty}</div>;

    const total = rows.reduce((a, d) => a + d.value, 0);
    const C = 60, R = 54, r = 32;
    const pt = (angle, rad) => [C + rad * Math.cos(angle), C + rad * Math.sin(angle)];

    let acc = 0;
    const slices = rows.map((d, i) => {
        const start = (acc / total) * 2 * Math.PI - Math.PI / 2;
        acc += d.value;
        const end = (acc / total) * 2 * Math.PI - Math.PI / 2;
        const large = end - start > Math.PI ? 1 : 0;
        const [x1, y1] = pt(start, R);
        const [x2, y2] = pt(end, R);
        const [x3, y3] = pt(end, r);
        const [x4, y4] = pt(start, r);
        return {
            ...d,
            color: d.color || colors[i % colors.length],
            path: `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`,
        };
    });

    return (
        <div className={`db-pie${stacked ? " db-pie--stack" : ""}`}>
            <svg viewBox="0 0 120 120" className="db-pie-svg" role="img">
                {slices.length === 1 ? (
                    <circle
                        cx={C} cy={C} r={(R + r) / 2}
                        fill="none" stroke={slices[0].color} strokeWidth={R - r}
                        style={onSliceClick ? { cursor: "pointer" } : undefined}
                        onClick={() => onSliceClick?.(slices[0].label)}
                    >
                        <title>{`${slices[0].label}: ${slices[0].value}`}</title>
                    </circle>
                ) : (
                    slices.map((sl) => (
                        <path
                            key={sl.label} d={sl.path} fill={sl.color}
                            stroke="#fff" strokeWidth="1.5"
                            style={onSliceClick ? { cursor: "pointer" } : undefined}
                            onClick={() => onSliceClick?.(sl.label)}
                        >
                            <title>{`${sl.label}: ${sl.value} (${Math.round((sl.value / total) * 100)}%)`}</title>
                        </path>
                    ))
                )}
                <text x={C} y={C + 2} textAnchor="middle" fontSize="18" fontWeight="700" fill="#0F3D2B">{total}</text>
                <text x={C} y={C + 14} textAnchor="middle" fontSize="7" fill="#5E7A6E">total</text>
            </svg>
            <ul className="db-pie-legend">
                {slices.map((sl) => (
                    <li
                        key={sl.label}
                        style={onSliceClick ? { cursor: "pointer" } : undefined}
                        onClick={() => onSliceClick?.(sl.label)}
                    >
                        <span className="db-pie-dot" style={{ background: sl.color }} />
                        <span className="db-pie-name" title={sl.label}>{sl.label}</span>
                        <span className="db-pie-val">
                            {sl.value} <span className="db-muted">({Math.round((sl.value / total) * 100)}%)</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function RiskMatrix({ cells }) {
    return (
        <div className="db-matrix">
            <div className="db-matrix-y">Severity ↑</div>
            <div className="db-matrix-grid">
                {[5, 4, 3, 2, 1].map((sev) =>
                    [1, 2, 3, 4, 5].map((lik) => {
                        const count = cells[`${sev}-${lik}`] || 0;
                        const cat = riskOf(sev * lik);
                        return (
                            <div
                                key={`${sev}-${lik}`}
                                className="db-matrix-cell"
                                style={{
                                    background: cat.color,
                                    opacity: count ? 1 : 0.22,
                                }}
                                title={`Severity ${sev} × Likelihood ${lik} = ${sev * lik} (${cat.key})`}
                            >
                                {count || ""}
                            </div>
                        );
                    }),
                )}
            </div>
            <div className="db-matrix-x">Likelihood →</div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   KPI MODAL
   ════════════════════════════════════════════════════════════════════════ */

const MODAL_PAGE_SIZE = 10;

function KpiModal({ open, title, rows, color = "#1B5E44", onClose }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (open) {
            setSearch("");
            setPage(1);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    const stageMeta = (key) => STAGES.find((s) => s.key === key);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(
            (r) =>
                !q ||
                [r.accident_id, r.name, r.department, r.group, r.specific_location, r.chapa_number]
                    .join(" ")
                    .toLowerCase()
                    .includes(q),
        );
    }, [rows, search]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / MODAL_PAGE_SIZE));
    const pageRows = filtered.slice((page - 1) * MODAL_PAGE_SIZE, page * MODAL_PAGE_SIZE);

    useEffect(() => setPage(1), [search]);

    if (!open) return null;

    return (
        <div
            className="kpi-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="kpi-modal">
                {/* Header */}
                <div className="kpi-modal-head" style={{ background: color }}>
                    <span className="kpi-modal-title">
                        <FeatherIcon icon="list" size={14} />
                        {title}
                        <span className="kpi-modal-count">({filtered.length})</span>
                    </span>
                    <button className="kpi-modal-close" onClick={onClose}>
                        <FeatherIcon icon="x" size={14} /> Close
                    </button>
                </div>

                {/* Search */}
                <div className="kpi-modal-search-wrap">
                    <FeatherIcon icon="search" size={14} />
                    <input
                        className="kpi-modal-search"
                        placeholder="Search by ID, name, chapa no., department, group, location…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    {search && (
                        <button className="kpi-modal-search-clear" onClick={() => setSearch("")}>
                            <FeatherIcon icon="x" size={12} />
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="kpi-modal-body">
                    {filtered.length === 0 ? (
                        <div className="db-empty">No records match your search.</div>
                    ) : (
                        <div className="db-table-wrap">
                            <table className="db-table">
                                <thead>
                                    <tr>
                                        <th>Reference</th>
                                        <th>Date of Event</th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Group / Dept</th>
                                        <th>Location</th>
                                        <th>Risk</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((r) => {
                                        const st = stageMeta(r.stage);
                                        const risk = r.score ? riskOf(r.score) : null;
                                        return (
                                            <tr
                                                key={r.accident_id}
                                                onClick={() => (window.location.href = `/view-report?ACID=${r.accident_id}`)}
                                            >
                                                <td className="db-mono">{r.accident_id}</td>
                                                <td>
                                                    {r.date
                                                        ? r.date.toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })
                                                        : "—"}
                                                </td>
                                                <td>{r.name || "—"}</td>
                                                <td>
                                                    {r.subtypes
                                                        .map((s) => SUBTYPE_LABELS[s] || s)
                                                        .join(", ") || "—"}
                                                </td>
                                                <td>
                                                    {r.group || "—"}
                                                    <div className="db-muted">{r.department}</div>
                                                </td>
                                                <td>
                                                    {r.location || "—"}
                                                    <div className="db-muted">{r.specific_location}</div>
                                                </td>
                                                <td>
                                                    {risk ? (
                                                        <span
                                                            className="db-pill"
                                                            style={{ background: risk.color }}
                                                        >
                                                            {risk.key} ({r.score})
                                                        </span>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                                <td>
                                                    <span
                                                        className="db-pill db-pill--soft"
                                                        style={{
                                                            borderColor: st.color,
                                                            color: st.color,
                                                        }}
                                                    >
                                                        {st.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pageCount > 1 && (
                    <div className="kpi-modal-pager">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            <FeatherIcon icon="chevron-left" size={14} /> Prev
                        </button>
                        <span>Page {page} of {pageCount}</span>
                        <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                            Next <FeatherIcon icon="chevron-right" size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════════════════════════════════ */

const PAGE_SIZE = 10;

export default function MainDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [warnings, setWarnings] = useState([]);
    const [master, setMaster] = useState([]);
    const [s1, setS1] = useState([]);
    const [s3, setS3] = useState([]);
    const [equip, setEquip] = useState([]);
    const [s46, setS46] = useState([]);

    // filters
    const [fLocation, setFLocation] = useState("all");
    const [fYear, setFYear] = useState("all");
    const [fMonth, setFMonth] = useState("all");
    const [fData, setFData] = useState("all");
    const [fGroup, setFGroup] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // modal
    const [modal, setModal] = useState(null);
    const openModal = (title, rows, color) => setModal({ title, rows, color });
    const closeModal = () => setModal(null);

    useEffect(() => {
        const load = async () => {
            const base = `${config.baseApi}/accident`;
            const [a, b, c, d, e] = await Promise.allSettled([
                axios.get(`${base}/get-all-report`),
                axios.get(`${base}/get-all-section1`),
                axios.get(`${base}/get-all-section3`),
                axios.get(`${base}/get-all-section46-equipment`),
                axios.get(`${base}/get-all-section46`),
            ]);
            if (a.status === "rejected" || b.status === "rejected") {
                setError("Failed to load reports. Please refresh.");
            }
            const warn = [];
            if (c.status === "rejected") warn.push("Mechanism of Injury (get-all-section3)");
            if (d.status === "rejected") warn.push("Equipment Involved (get-all-section46-equipment)");
            if (e.status === "rejected") warn.push("Risk Matrix and Damage Cost (get-all-section46)");
            setWarnings(warn);
            if (a.status === "fulfilled") setMaster(a.value.data || []);
            if (b.status === "fulfilled") setS1(b.value.data || []);
            if (c.status === "fulfilled") setS3(c.value.data || []);
            if (d.status === "fulfilled") setEquip(d.value.data || []);
            if (e.status === "fulfilled") setS46(e.value.data || []);
            setLoading(false);
        };
        load();
    }, []);

    const rows = useMemo(() => {
        const m3 = new Map(s3.map((r) => [r.accident_id, r]));
        const mEq = new Map(equip.map((r) => [r.accident_id, r]));
        const m46 = new Map(s46.map((r) => [r.accident_id, r]));
        const mMaster = new Map(master.map((r) => [r.accident_id, r]));

        return s1
            .map((r) => {
                const ms = mMaster.get(r.accident_id);
                const sec46 = m46.get(r.accident_id);
                const date = parseDate(r.date_of_event) || parseDate(ms?.created_at);
                const sev = Number(sec46?.severity) || 0;
                const lik = Number(sec46?.likelihood) || 0;
                return {
                    ...r,
                    status: ms?.ac_status || "",
                    stage: stageOf(ms?.ac_status),
                    date,
                    subtypes: splitList(r.accident_incident_subtype, ","),
                    areas: splitList(r.working_area, ","),
                    mechanisms: splitList(m3.get(r.accident_id)?.mechanism_of_injury, "|"),
                    equipmentName: (mEq.get(r.accident_id)?.equipment_name || "").trim(),
                    equipmentTypes: splitList(mEq.get(r.accident_id)?.equipment, ",").filter(
                        (t) => t.toLowerCase() !== "not applicable",
                    ),
                    severity: sev,
                    likelihood: lik,
                    score: sev && lik ? sev * lik : 0,
                    damage: Number(sec46?.damage_cost_php) || 0,
                };
            })
            .filter((r) => ms_active(mMaster.get(r.accident_id)));
    }, [master, s1, s3, equip, s46]);

    const years = useMemo(
        () =>
            [...new Set(rows.map((r) => r.date?.getFullYear()).filter(Boolean))].sort(
                (a, b) => b - a,
            ),
        [rows],
    );
    const groups = useMemo(
        () => [...new Set(rows.map((r) => r.group).filter(Boolean))].sort(),
        [rows],
    );

    const filtered = useMemo(
        () =>
            rows.filter((r) => {
                if (fLocation !== "all" && String(r.location || "").toLowerCase() !== fLocation) return false;
                if (fYear !== "all" && r.date?.getFullYear() !== Number(fYear)) return false;
                if (fMonth !== "all" && r.date?.getMonth() !== Number(fMonth)) return false;
                if (fData !== "all" && r.data_for !== fData) return false;
                if (fGroup !== "all" && r.group !== fGroup) return false;
                return true;
            }),
        [rows, fLocation, fYear, fMonth, fData, fGroup],
    );

    useEffect(
        () => setPage(1),
        [fLocation, fYear, fMonth, fData, fGroup, search],
    );

    /* ── derived stats ── */
    const stats = useMemo(() => {
        const total = filtered.length;
        const complete = filtered.filter((r) => r.stage === "complete").length;
        const open = total - complete;
        const has = (r, code) => r.subtypes.includes(code);
        const lta = filtered.filter((r) => has(r, "Injury-LTA-F") || has(r, "Injury-LTA-NF")).length;
        const fatal = filtered.filter((r) => has(r, "Injury-LTA-F")).length;
        const nearMiss = filtered.filter((r) => has(r, "Near Miss")).length;
        const highRisk = filtered.filter((r) => r.score >= 12).length;
        const hasRisk = filtered.some((r) => r.score > 0);
        const damage = filtered.reduce((a, r) => a + r.damage, 0);

        const byStage = STAGES.map((s) => ({
            label: s.label,
            color: s.color,
            value: filtered.filter((r) => r.stage === s.key).length,
        }));

        const bySubtype = tally(filtered, (r) => r.subtypes).map((x) => ({
            ...x,
            label: SUBTYPE_LABELS[x.label] || x.label,
        }));

        const cells = {};
        filtered.forEach((r) => {
            if (r.score) cells[`${r.severity}-${r.likelihood}`] = (cells[`${r.severity}-${r.likelihood}`] || 0) + 1;
        });

        let points = [];
        if (fYear !== "all") {
            points = MONTHS.map((label, i) => ({
                key: `${fYear}-${String(i + 1).padStart(2, "0")}`,
                label,
                value: 0,
            }));
        } else {
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                points.push({
                    key: monthKey(d),
                    label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
                    value: 0,
                });
            }
        }
        filtered.forEach((r) => {
            if (!r.date) return;
            const p = points.find((x) => x.key === monthKey(r.date));
            if (p) p.value++;
        });

        return {
            total, complete, open, lta, fatal, nearMiss, highRisk, hasRisk, damage,
            byStage, bySubtype,
            byDept: tally(filtered, (r) => (r.department ? [r.department] : [])),
            byGroup: tally(filtered, (r) => (r.group ? [r.group] : [])),
            byShift: tally(filtered, (r) => (r.shift ? [r.shift] : [])),
            byArea: tally(filtered, (r) => r.areas),
            byMech: tally(filtered, (r) => r.mechanisms),
            byEquip: tally(filtered, (r) => (r.equipmentName ? [r.equipmentName] : r.equipmentTypes)),
            byLocation: tally(filtered, (r) => (r.location ? [r.location] : [])),
            cells, points,
        };
    }, [filtered, fYear]);

    /* ── chart drill-down helpers ── */
    const filterByStage = (stageLabel) => {
        const stage = STAGES.find((s) => s.label === stageLabel);
        return stage ? filtered.filter((r) => r.stage === stage.key) : [];
    };

    const filterBySubtype = (label) =>
        filtered.filter((r) =>
            r.subtypes.some((s) => (SUBTYPE_LABELS[s] || s) === label)
        );

    const filterBy = (field, value) =>
        filtered.filter((r) => (r[field] || "") === value);

    const filterByArea = (value) =>
        filtered.filter((r) => r.areas.includes(value));

    const filterByMech = (value) =>
        filtered.filter((r) => r.mechanisms.includes(value));

    const filterByLocation = (label) =>
        filtered.filter((r) => (r.location || "").toLowerCase() === label.toLowerCase());

    /* ── table ── */
    const tableRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return filtered
            .filter(
                (r) =>
                    !q ||
                    [r.accident_id, r.name, r.department, r.group, r.specific_location, r.chapa_number]
                        .join(" ")
                        .toLowerCase()
                        .includes(q),
            )
            .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    }, [filtered, search]);

    const pageCount = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
    const pageRows = tableRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (loading) return <LoadingSpinner label="Loading dashboard" />;

    const stageMeta = (key) => STAGES.find((s) => s.key === key);

    return (
        <div className="db-shell">
            <style>{STYLE_SHEET}</style>

            {/* ─── TOP BAR ─── */}
            <div className="db-topbar-outer">
                <div className="db-topbar-brand">
                    <div className="db-topbar-brand-left">
                        <button
                            type="button"
                            className="sr-btn-back-inline"
                            onClick={() => window.history.back()}
                        >
                            <FeatherIcon icon="arrow-left" size={14} />
                            Back to reports
                        </button>
                        <div className="db-topbar-divider" />
                        <div>
                            <span className="db-topbar-title">SAIRI Monitoring System Dashboard</span>
                            <span className="db-topbar-sub">
                                Safety Accident / Incident Reports — overview
                            </span>
                        </div>
                    </div>

                    <div className="db-topbar-right">
                        <select value={fLocation} onChange={(e) => setFLocation(e.target.value)}>
                            <option value="all">All locations</option>
                            <option value="surface">Surface</option>
                            <option value="underground">Underground</option>
                        </select>
                        <select value={fYear} onChange={(e) => setFYear(e.target.value)}>
                            <option value="all">All years</option>
                            {years.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <select value={fMonth} onChange={(e) => setFMonth(e.target.value)}>
                            <option value="all">All months</option>
                            {MONTHS.map((m, i) => (
                                <option key={m} value={i}>{m}</option>
                            ))}
                        </select>
                        <select value={fGroup} onChange={(e) => setFGroup(e.target.value)}>
                            <option value="all">All groups</option>
                            {groups.map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                        <select value={fData} onChange={(e) => setFData(e.target.value)}>
                            <option value="all">Active + Historical</option>
                            <option value="active_data">Active data</option>
                            <option value="historical">Historical</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="db-content">
                {error && (
                    <div className="db-error">
                        <FeatherIcon icon="alert-octagon" size={16} />
                        <span>{error}</span>
                    </div>
                )}
                {warnings.length > 0 && (
                    <div className="db-warn">
                        <FeatherIcon icon="alert-triangle" size={16} />
                        <span>Could not load: {warnings.join("; ")}.</span>
                    </div>
                )}

                {/* KPIs */}
                <section className="db-kpis">
                    <Kpi icon="file-text" label="Total Reports" value={stats.total} />
                    <Kpi
                        icon="clock"
                        label="Open"
                        value={stats.open}
                        tone="warn"
                        hint={stats.total ? `${Math.round((stats.open / stats.total) * 100)}% of total` : ""}
                        onClick={() => openModal("Open Reports", filtered.filter((r) => r.stage !== "complete"), "#C06010")}
                    />
                    <Kpi
                        icon="check-circle"
                        label="Completed"
                        value={stats.complete}
                        tone="ok"
                        hint={stats.total ? `${Math.round((stats.complete / stats.total) * 100)}% closure rate` : ""}
                        onClick={() => openModal("Completed Reports", filtered.filter((r) => r.stage === "complete"), "#0F3D2B")}
                    />
                    <Kpi
                        icon="alert-triangle"
                        label="Lost Time Accidents"
                        value={stats.lta}
                        tone="danger"
                        hint={`${stats.fatal} fatal`}
                        onClick={() =>
                            openModal(
                                "Lost Time Accidents",
                                filtered.filter((r) => r.subtypes.includes("Injury-LTA-F") || r.subtypes.includes("Injury-LTA-NF")),
                                "#B02020",
                            )
                        }
                    />
                    <Kpi
                        icon="eye"
                        label="Near Misses"
                        value={stats.nearMiss}
                        onClick={() =>
                            openModal(
                                "Near Miss Reports",
                                filtered.filter((r) => r.subtypes.includes("Near Miss")),
                                "#2C4A5C",
                            )
                        }
                    />
                    <Kpi
                        icon="shield-off"
                        label="High / Extreme Risk"
                        value={stats.hasRisk ? stats.highRisk : "—"}
                        tone={stats.highRisk ? "danger" : undefined}
                        hint={stats.hasRisk ? undefined : "needs /get-all-section46"}
                        onClick={
                            stats.hasRisk
                                ? () => openModal("High / Extreme Risk Reports", filtered.filter((r) => r.score >= 12), "#B02020")
                                : undefined
                        }
                    />
                    {stats.damage > 0 && (
                        <Kpi icon="dollar-sign" label="Damage Cost" value={fmtMoney(stats.damage)} />
                    )}
                </section>

                {/* Charts */}
                <section className="db-grid">
                    <Card icon="trending-up" title="Reports Over Time" sub={fYear === "all" ? "Last 12 months" : fYear} span="2" accent="#1B5E44">
                        <TrendChart points={stats.points} />
                    </Card>

                    <Card icon="layers" title="Review Pipeline" sub="Click a stage to view reports" accent="#3F8468">
                        <HBars
                            data={stats.byStage}
                            limit={9}
                            onRowClick={(label) => openModal(label, filterByStage(label), "#3F8468")}
                        />
                    </Card>

                    <Card icon="alert-triangle" title="Incident Type" sub="Click to view reports" accent="#C06010">
                        <HBars
                            data={stats.bySubtype}
                            color="#C06010"
                            onRowClick={(label) => openModal(label, filterBySubtype(label), "#C06010")}
                        />
                    </Card>

                    <Card icon="briefcase" title="By Department" sub="Scroll to view all — click to filter" accent="#1B5E44">


                        <HBars
                            data={stats.byDept}
                            onRowClick={(label) => openModal(`Department: ${label}`, filterBy("department", label), "#1B5E44")}
                        />
                    </Card>

                    <Card icon="users" title="By Group" sub="Click to view reports" accent="#3F8468">
                        <HBars
                            data={stats.byGroup}
                            color="#3F8468"
                            onRowClick={(label) => openModal(`Group: ${label}`, filterBy("group", label), "#3F8468")}
                        />
                    </Card>

                    <Card icon="map-pin" title="Working Area" sub="Scroll to view all — click to filter" accent="#7A6E10">

                        <HBars
                            data={stats.byArea}
                            color="#7A6E10"
                            onRowClick={(label) => openModal(`Working Area: ${label}`, filterByArea(label), "#7A6E10")}
                        />
                    </Card>

                    <Card icon="activity" title="Mechanism of Injury" sub="Scroll to view all — click to filter" accent="#B02020">

                        <HBars
                            data={stats.byMech}
                            color="#B02020"
                            empty="No Section 3 data yet"
                            onRowClick={(label) => openModal(`Mechanism: ${label}`, filterByMech(label), "#B02020")}
                        />
                    </Card>

                    <Card icon="clock" title="Shift" sub="Click to view reports" accent="#2C4A5C">
                        <PieChart
                            data={stats.byShift}
                            onSliceClick={(label) => openModal(`Shift: ${label}`, filterBy("shift", label), "#2C4A5C")}
                        />
                    </Card>

                    <Card icon="compass" title="Surface vs Underground" sub="Click to view reports" accent="#0F3D2B">
                        <PieChart
                            data={stats.byLocation}
                            colors={["#0F3D2B", "#C06010"]}
                            stacked
                            onSliceClick={(label) => openModal(label, filterByLocation(label), "#0F3D2B")}
                        />
                    </Card>

                    <Card icon="tool" title="Equipment Involved" sub="Scroll to view all" accent="#5A4E90">
                        <HBars data={stats.byEquip} color="#5A4E90" empty="No equipment recorded" />
                    </Card>

                    <Card icon="grid" title="Risk Matrix" sub="Before control" accent="#B02020">
                        {stats.hasRisk ? (
                            <RiskMatrix cells={stats.cells} />
                        ) : (
                            <div className="db-empty">
                                Add the optional <code>/get-all-section46</code> endpoint to see severity × likelihood.
                            </div>
                        )}
                    </Card>
                </section>

                {/* Table */}
                <Card
                    icon="list"
                    title="All Reports"
                    sub={`${tableRows.length} result${tableRows.length === 1 ? "" : "s"}`}
                    accent="#0F3D2B"
                >
                    <div className="db-search-wrap">
                        <FeatherIcon icon="search" size={15} />
                        <input
                            className="db-search"
                            placeholder="Search by ID, name, chapa no., department, group, location…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="db-table-wrap">
                        <table className="db-table">
                            <thead>
                                <tr>
                                    <th>Reference</th>
                                    <th>Date of Event</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Group / Dept</th>
                                    <th>Location</th>
                                    <th>Risk</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="db-empty">No reports match your filters.</td>
                                    </tr>
                                )}
                                {pageRows.map((r) => {
                                    const st = stageMeta(r.stage);
                                    const risk = r.score ? riskOf(r.score) : null;
                                    return (
                                        <tr
                                            key={r.accident_id}
                                            onClick={() => (window.location.href = `/view-report?ACID=${r.accident_id}`)}
                                        >
                                            <td className="db-mono">{r.accident_id}</td>
                                            <td>
                                                {r.date
                                                    ? r.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                    : "—"}
                                            </td>
                                            <td>{r.name || "—"}</td>
                                            <td>{r.subtypes.map((s) => SUBTYPE_LABELS[s] || s).join(", ") || "—"}</td>
                                            <td>
                                                {r.group || "—"}
                                                <div className="db-muted">{r.department}</div>
                                            </td>
                                            <td>
                                                {r.location || "—"}
                                                <div className="db-muted">{r.specific_location}</div>
                                            </td>
                                            <td>
                                                {risk ? (
                                                    <span className="db-pill" style={{ background: risk.color }}>
                                                        {risk.key} ({r.score})
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td>
                                                <span className="db-pill db-pill--soft" style={{ borderColor: st.color, color: st.color }}>
                                                    {st.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="db-pager">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            <FeatherIcon icon="chevron-left" size={14} />
                            Prev
                        </button>
                        <span>Page {page} of {pageCount}</span>
                        <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                            Next
                            <FeatherIcon icon="chevron-right" size={14} />
                        </button>
                    </div>
                </Card>
            </div>

            {/* KPI Modal */}
            <KpiModal
                open={!!modal}
                title={modal?.title}
                rows={modal?.rows || []}
                color={modal?.color}
                onClose={closeModal}
            />
        </div>
    );
}

function ms_active(m) {
    if (!m) return true;
    const v = m.is_active;
    return !(v === false || v === 0 || v === "0" || v === "false");
}

/* ════════════════════════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

.db-shell {
  --ink:#0D1B2A; --ink-soft:#2C4A3E; --muted:#5E7A6E; --paper:#fff; --paper-alt:#F0F4F2;
  --line:#C8D8D1; --line-strong:#9DBCB0; --green:#1B5E44; --green-deep:#0F3D2B; --green-soft:#D4EDE5;
  --danger:#B02020; --danger-soft:#FAE8E8; --amber:#C06010;
  --shadow-sm:0 1px 2px rgba(13,27,42,.05),0 4px 14px rgba(15,61,43,.07);
  --shadow-md:0 2px 4px rgba(13,27,42,.06),0 12px 28px rgba(15,61,43,.14);
  min-height:100vh; background:var(--paper-alt); color:var(--ink);
  font-family:'Inter',sans-serif; padding:0; box-sizing:border-box;
}
.db-shell *{box-sizing:border-box;}

/* ═══ TOP BAR ═══ */
.db-topbar-outer{position:sticky;top:0;z-index:10;background:#0D1B2A;
  border-bottom:1px solid rgba(255,255,255,.06);}
.db-topbar-brand{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;
  max-width:1800px;margin:0 auto;padding:12px 32px;}
.db-topbar-brand-left{display:flex;align-items:center;gap:16px;}
.db-topbar-divider{width:1px;height:28px;background:rgba(255,255,255,.1);}
.db-topbar-title{display:block;font-family:'Barlow Condensed',sans-serif;font-weight:700;
  font-size:18px;letter-spacing:.05em;color:#40aa52;}
.db-topbar-sub{display:block;margin-top:3px;font-family:'IBM Plex Mono',monospace;font-size:10px;
  letter-spacing:.08em;text-transform:uppercase;color:#7C9BB3;}
.db-topbar-right{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}

.sr-btn-back-inline{display:flex;align-items:center;gap:6px;background:transparent;
  border:1px solid rgba(255,255,255,.1);color:#8AA4B8;padding:6px 14px;border-radius:6px;
  font-size:12px;font-family:'Inter',sans-serif;cursor:pointer;transition:border-color .15s,color .15s;}
.sr-btn-back-inline:hover{border-color:rgba(255,255,255,.3);color:#fff;}

.db-topbar-right select{font-family:'Inter',sans-serif;font-size:12px;color:#E8F4EF;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:6px;
  height:30px;padding:0 10px;outline:none;}
.db-topbar-right select:focus{border-color:#1B8C60;}
.db-topbar-right select option{color:#0D1B2A;background:#fff;}

.db-content{max-width:1800px;margin:0 auto;padding:24px 32px 60px;}

.db-error{background:var(--danger-soft);border:1px solid var(--danger);color:#7A1F1F;font-weight:600;
  font-size:13px;padding:10px 14px;border-radius:6px;margin-bottom:16px;display:flex;align-items:center;gap:8px;}
.db-warn{background:#FFF4E5;border:1px solid var(--amber);color:#7A4A10;font-weight:600;
  font-size:13px;padding:10px 14px;border-radius:6px;margin-bottom:16px;display:flex;align-items:center;gap:8px;}

/* ═══ KPI CARDS ═══ */
.db-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:18px;}
.db-kpi{--accent:var(--green);position:relative;overflow:hidden;
  background:linear-gradient(145deg,#fff 40%,color-mix(in srgb,var(--accent) 12%,#fff));
  border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));
  border-radius:14px;padding:16px 18px 14px;box-shadow:var(--shadow-sm);
  transition:transform .18s ease,box-shadow .18s ease;}
.db-kpi::after{content:"";position:absolute;right:-26px;bottom:-34px;width:104px;height:104px;
  border-radius:50%;background:color-mix(in srgb,var(--accent) 11%,transparent);pointer-events:none;}
.db-kpi > *{position:relative;z-index:1;}
.db-kpi:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);}
.db-kpi--clickable{cursor:pointer;}
.db-kpi--clickable:hover{transform:translateY(-3px);box-shadow:var(--shadow-md);}
.db-kpi--warn{--accent:var(--amber);}
.db-kpi--danger{--accent:var(--danger);}
.db-kpi--ok{--accent:var(--green-deep);}
.db-kpi-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
.db-kpi-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);}
.db-kpi-value{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:38px;
  line-height:1.1;margin-top:4px;color:var(--accent);}
.db-kpi-hint{font-size:11px;color:var(--muted);margin-top:2px;}
.db-kpi-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;
  border-radius:10px;color:#fff;flex:0 0 auto;
  background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 60%,#fff));
  box-shadow:0 4px 10px color-mix(in srgb,var(--accent) 35%,transparent);}
.db-kpi-icon svg{display:block;}
.db-kpi-cta{display:inline-flex;align-items:center;gap:4px;margin-top:8px;font-size:10px;
  font-weight:700;text-transform:uppercase;letter-spacing:.06em;
  color:color-mix(in srgb,var(--accent) 80%,#000);opacity:.7;}

/* ═══ CHART CARDS ═══ */
.db-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px;}
.db-card{--accent:var(--green);position:relative;min-width:0;overflow:hidden;background:var(--paper);
  border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));
  border-radius:14px;box-shadow:var(--shadow-sm);
  transition:box-shadow .18s ease,transform .18s ease,border-color .18s ease;}
.db-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px);
  border-color:color-mix(in srgb,var(--accent) 55%,var(--line));}
.db-card--2{grid-column:span 2;}
.db-card-head{display:flex;justify-content:space-between;align-items:center;gap:8px;
  padding:10px 16px;color:#fff;
  background:linear-gradient(115deg,var(--accent),color-mix(in srgb,var(--accent) 62%,#fff));}
.db-card-body{padding:16px 18px 18px;}
.db-card-body:has(.db-hbars-scroll){padding-bottom:4px;}
.db-card-title{display:flex;align-items:center;gap:10px;font-family:'Barlow Condensed',sans-serif;
  font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:.06em;color:#fff;}
.db-card-icon{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;
  border-radius:8px;background:rgba(255,255,255,.22);color:#fff;flex:0 0 auto;}
.db-card-icon svg{display:block;}
.db-card-sub{font-size:11px;color:rgba(255,255,255,.85);font-style:italic;}
.db-empty{color:var(--muted);font-size:12px;font-style:italic;padding:14px 4px;text-align:center;}
.db-empty code{font-family:'IBM Plex Mono',monospace;font-style:normal;background:var(--paper-alt);padding:1px 4px;border-radius:3px;}

/* ═══ CHARTS ═══ */
.db-hbars{display:flex;flex-direction:column;gap:9px;}
.db-hbar{display:grid;grid-template-columns:minmax(90px,38%) 1fr 32px;align-items:center;gap:10px;font-size:12px;}
.db-hbar-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink-soft);font-weight:500;}
.db-hbar-track{height:11px;background:#E6EEEA;border-radius:5px;overflow:hidden;}
.db-hbar-fill{height:100%;border-radius:5px;transition:width .4s ease;}
.db-hbar-val{font-family:'IBM Plex Mono',monospace;font-weight:600;text-align:right;}
.db-hbar--clickable{cursor:pointer;border-radius:6px;padding:3px 4px;margin:0 -4px;transition:background .12s;}
.db-hbar--clickable:hover{background:var(--green-soft);}
.db-pie{display:flex;align-items:center;justify-content:center;gap:22px;flex-wrap:wrap;}
.db-pie-svg{width:min(100%,230px);height:auto;aspect-ratio:1;flex:0 0 auto;}
.db-pie--stack{flex-direction:column;gap:18px;}
.db-pie--stack .db-pie-svg{width:min(100%,320px);}
.db-pie--stack .db-pie-legend{width:100%;flex:none;font-size:14px;}
.db-pie-legend{flex:1;min-width:150px;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;font-size:13px;}
.db-pie-legend li{display:grid;grid-template-columns:10px 1fr auto;align-items:center;gap:8px;border-radius:6px;padding:3px 4px;margin:0 -4px;transition:background .12s;}
.db-pie-legend li[style*="pointer"]:hover{background:var(--green-soft);}
.db-pie-dot{width:10px;height:10px;border-radius:50%;}
.db-pie-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink-soft);font-weight:500;}
.db-pie-val{font-family:'IBM Plex Mono',monospace;font-weight:600;}
.db-trend{width:100%;height:auto;display:block;}
.db-matrix{display:grid;grid-template-columns:auto 1fr;grid-template-rows:1fr auto;gap:6px;align-items:center;}
.db-matrix-y{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px;font-weight:700;
  text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:center;}
.db-matrix-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;}
.db-matrix-cell{aspect-ratio:1.3;border-radius:4px;color:#fff;font-weight:700;font-size:13px;
  display:flex;align-items:center;justify-content:center;}
.db-matrix-x{grid-column:2;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;
  letter-spacing:.06em;color:var(--muted);}

/* ═══ TABLE ═══ */
.db-search-wrap{position:relative;margin-bottom:12px;}
.db-search-wrap svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;}
.db-search{width:100%;font-family:inherit;font-size:13px;color:var(--ink);background:var(--paper);
  border:1.5px solid var(--line-strong);border-radius:6px;padding:8px 10px 8px 34px;outline:none;}
.db-search:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(27,94,68,.15);}
.db-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;}
.db-table{width:100%;border-collapse:collapse;font-size:13px;}
.db-table th{background:color-mix(in srgb,var(--green) 8%,#fff);text-align:left;padding:10px 14px;
  font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
  color:var(--ink-soft);border-bottom:1px solid var(--line);white-space:nowrap;}
.db-table td{padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top;}
.db-table tbody tr{cursor:pointer;transition:background .12s;}
.db-table tbody tr:nth-child(even){background:#F7FAF8;}
.db-table tbody tr:hover{background:var(--green-soft);}
.db-table tr:last-child td{border-bottom:none;}
.db-mono{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--green);white-space:nowrap;}
.db-muted{font-size:11px;color:var(--muted);}
.db-pill{display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;color:#fff;white-space:nowrap;}
.db-pill--soft{background:transparent;border:1.5px solid;}
.db-pager{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:12px;font-size:12px;color:var(--muted);}
.db-pager button{font-family:inherit;font-size:12px;font-weight:600;padding:6px 14px;border-radius:6px;cursor:pointer;
  background:var(--green-deep);color:#fff;border:1.5px solid var(--green);
  display:inline-flex;align-items:center;gap:4px;}
.db-pager button:disabled{opacity:.4;cursor:not-allowed;}

/* ═══ KPI MODAL ═══ */
.kpi-modal-overlay{
  position:fixed;inset:0;z-index:1000;
  background:rgba(13,27,42,.6);
  display:flex;align-items:center;justify-content:center;
  padding:24px;
  animation:kpi-fade-in .15s ease;
}
@keyframes kpi-fade-in{from{opacity:0}to{opacity:1}}
.kpi-modal{
  background:#fff;border-radius:14px;width:100%;max-width:1100px;
  max-height:88vh;display:flex;flex-direction:column;
  box-shadow:0 24px 64px rgba(13,27,42,.35);
  border:1px solid var(--line);overflow:hidden;
  animation:kpi-slide-up .18s ease;
}
@keyframes kpi-slide-up{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
.kpi-modal-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 20px;flex:0 0 auto;
}
.kpi-modal-title{
  display:flex;align-items:center;gap:10px;
  font-family:'Barlow Condensed',sans-serif;font-weight:700;
  font-size:17px;text-transform:uppercase;letter-spacing:.06em;color:#fff;
}
.kpi-modal-title svg{display:block;flex:0 0 auto;}
.kpi-modal-count{opacity:.75;margin-left:2px;}
.kpi-modal-close{
  display:inline-flex;align-items:center;gap:6px;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
  color:#fff;border-radius:6px;padding:5px 14px;
  font-size:12px;font-family:'Inter',sans-serif;font-weight:600;cursor:pointer;
  transition:background .15s;
}
.kpi-modal-close:hover{background:rgba(255,255,255,.28);}
.kpi-modal-close svg{display:block;}
.kpi-modal-search-wrap{
  display:flex;align-items:center;gap:8px;
  padding:12px 20px;border-bottom:1px solid var(--line);
  flex:0 0 auto;background:var(--paper-alt);
  position:relative;
}
.kpi-modal-search-wrap > svg:first-child{color:var(--muted);flex:0 0 auto;}
.kpi-modal-search{
  flex:1;font-family:'Inter',sans-serif;font-size:13px;color:var(--ink);
  background:var(--paper);border:1.5px solid var(--line-strong);
  border-radius:6px;padding:7px 32px 7px 10px;outline:none;
}
.kpi-modal-search:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(27,94,68,.15);}
.kpi-modal-search-clear{
  position:absolute;right:28px;
  background:transparent;border:none;cursor:pointer;
  color:var(--muted);display:inline-flex;padding:4px;border-radius:4px;
}
.kpi-modal-search-clear:hover{color:var(--ink);}
.kpi-modal-body{overflow-y:auto;padding:16px 20px 20px;flex:1;}
.kpi-modal-pager{
  display:flex;justify-content:flex-end;align-items:center;gap:12px;
  padding:12px 20px;border-top:1px solid var(--line);
  font-size:12px;color:var(--muted);flex:0 0 auto;background:var(--paper-alt);
}
.kpi-modal-pager button{
  font-family:inherit;font-size:12px;font-weight:600;padding:6px 14px;border-radius:6px;cursor:pointer;
  background:var(--green-deep);color:#fff;border:1.5px solid var(--green);
  display:inline-flex;align-items:center;gap:4px;
}
.kpi-modal-pager button:disabled{opacity:.4;cursor:not-allowed;}

/* ═══ RESPONSIVE ═══ */
@media (max-width:1100px){.db-grid{grid-template-columns:repeat(2,1fr);} .db-card--2{grid-column:span 2;}}
@media (max-width:700px){
  .db-topbar-brand{padding:10px 16px;}
  .db-topbar-title{font-size:16px;}
  .db-topbar-right{width:100%;}
  .db-topbar-right select{flex:1 1 45%;}
  .db-content{padding:16px 12px 48px;}
  .db-grid{grid-template-columns:1fr;} .db-card--2{grid-column:span 1;}
  .kpi-modal-overlay{padding:12px;}
  .kpi-modal{max-height:95vh;}
}
@media (prefers-reduced-motion:reduce){
  .db-card,.db-kpi,.db-hbar-fill,.kpi-modal,.kpi-modal-overlay{transition:none;animation:none;}
  .db-card:hover,.db-kpi:hover{transform:none;}
}
.db-hbars-scroll {
  overflow-x: hidden;
  overflow-y: hidden;
  padding-right: 0;
}
.db-hbars-scroll:has(> .db-hbars > .db-hbar:nth-child(10)) {
  max-height: 360px;
  overflow-y: auto;
}
.db-hbars-scroll::-webkit-scrollbar { width: 4px; }
.db-hbars-scroll::-webkit-scrollbar-track { background: transparent; }
.db-hbars-scroll::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 4px; }
.db-hbars-scroll::-webkit-scrollbar-thumb:hover { background: var(--muted); }
`;