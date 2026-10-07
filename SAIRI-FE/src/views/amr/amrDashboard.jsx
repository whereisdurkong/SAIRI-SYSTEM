import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import config from "config";
import { DateFilterBar, EMPTY_FILTERS } from "./dateFilter";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { LineChart } from "@mui/x-charts/LineChart";

/* ═════════ HELPERS ═════════ */
const splitList = (raw) => {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(/[|,]/);
  return arr.map((s) => String(s).trim()).filter(Boolean);
};
const normalizeLocation = (raw) => {
  const t = (raw || "").trim();
  if (!t) return { key: "unspecified", label: "Unspecified" };
  const key = t.toLowerCase().replace(/\s+/g, " ");
  return { key, label: key.replace(/\b\w/g, (c) => c.toUpperCase()) };
};
const norm = (s) => (s || "").toString().toLowerCase();
const clean = (s) => (s || "").toString().trim();
const isPropertyDamage = (subs) =>
  subs.some((s) => s.toLowerCase() === "property damage");
const pad = (n) => String(n).padStart(2, "0");
const toYMD = (value) => {
  if (!value) return "";
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${pad(m[1])}-${pad(m[2])}`;
  const d = new Date(/^\d+$/.test(str) ? Number(str) : str);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const isFilterActive = (f) =>
  !!(f && (f.year || f.month || f.dateFrom || f.dateTo));
const matchesFilter = (date, f) => {
  if (!isFilterActive(f)) return true;
  const ymd = toYMD(date);
  if (!ymd) return false;
  if (f.year && ymd.slice(0, 4) !== String(f.year)) return false;
  if (f.month && ymd.slice(5, 7) !== pad(f.month)) return false;
  if (f.dateFrom && ymd < f.dateFrom) return false;
  if (f.dateTo && ymd > f.dateTo) return false;
  return true;
};

/* ═════════ CONSTANTS ═════════ */
const COUNT_COLUMNS = [
  {
    key: "ltaFatal",
    abbr: "LTA-F",
    label: "Lost time – fatal",
    color: "#B02020",
    match: (v) => norm(v) === "injury-lta-f",
  },
  {
    key: "ltaNonFatal",
    abbr: "LTA-NF",
    label: "Lost time – non-fatal",
    color: "#C06010",
    match: (v) => norm(v) === "injury-lta-nf",
  },
  {
    key: "nlta",
    abbr: "NLTA",
    label: "Non-lost time",
    color: "#7A6E10",
    match: (v) => norm(v) === "injury-nlta",
  },
  {
    key: "firstAid",
    abbr: "FAC",
    label: "First aid case",
    color: "#1B5E44",
    match: (v) => norm(v) === "injury-fac",
  },
  {
    key: "nearMiss",
    abbr: "NM",
    label: "High-potential near miss",
    color: "#2C4A5C",
    match: (v) => norm(v) === "near miss",
  },
  {
    key: "illness",
    abbr: "OI",
    label: "Occupational illness",
    color: "#5A4E90",
    match: (v) => norm(v) === "oi",
  },
  {
    key: "propertyDamage",
    abbr: "PD",
    label: "Property damage",
    color: "#3F8468",
    match: (v) => norm(v) === "property damage",
  },
];

const PIE_PALETTE = [
  "#1B5E44",
  "#C06010",
  "#2C4A5C",
  "#7A6E10",
  "#5A4E90",
  "#B02020",
  "#3F8468",
  "#0F3D2B",
];

const countBy = (list, pick) => {
  const map = new Map();
  list.forEach((r) => {
    const k = pick(r);
    if (k && k !== "Unspecified") map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
};
const breakdownBy = (list, pick) => {
  const map = new Map();
  list.forEach((r) => {
    const k = pick(r);
    if (!k || k === "Unspecified") return;
    if (!map.has(k)) {
      const e = { label: k, total: 0 };
      COUNT_COLUMNS.forEach((c) => (e[c.key] = 0));
      map.set(k, e);
    }
    const e = map.get(k);
    e.total += 1;
    COUNT_COLUMNS.forEach((c) => {
      if (r.subtypes.some(c.match)) e[c.key] += 1;
    });
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
};
const truncate = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);

/* ═════════ SHARED UI PIECES (matches Main Dashboard style) ═════════ */

function Kpi({ label, value, unit, hint, tone, icon }) {
  return (
    <div className={`amr-kpi${tone ? ` amr-kpi--${tone}` : ""}`}>
      <div className="amr-kpi-top">
        <div className="amr-kpi-label">{label}</div>
        {icon && <span className="amr-kpi-icon">{icon}</span>}
      </div>
      <div className="amr-kpi-value">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      {hint && <div className="amr-kpi-hint">{hint}</div>}
    </div>
  );
}

function Panel({ title, sub, accent = "#1B5E44", span = 6, empty, children }) {
  return (
    <section
      className="amr-panel"
      style={{ "--span": span, "--accent": accent }}
    >
      <header className="amr-panel-head">
        <h2 className="amr-panel-title">{title}</h2>
        {sub && <span className="amr-panel-sub">{sub}</span>}
      </header>
      {empty ? <div className="amr-empty-inline">{empty}</div> : children}
    </section>
  );
}

function LegendList({ items }) {
  const total = items.reduce((t, x) => t + x.count, 0) || 1;
  return (
    <ul className="amr-legend">
      {items.map((x) => (
        <li key={x.label}>
          <i style={{ background: x.color }} />
          <span title={x.label}>{x.label}</span>
          <b>{x.count}</b>
          <em>{Math.round((x.count / total) * 100)}%</em>
        </li>
      ))}
    </ul>
  );
}

function TypeKey() {
  return (
    <div className="amr-typekey">
      {COUNT_COLUMNS.map((t) => (
        <span key={t.key} title={t.label}>
          <i style={{ background: t.color }} />
          {t.abbr}
        </span>
      ))}
    </div>
  );
}

function StackedRank({ items }) {
  const series = COUNT_COLUMNS.map((c) => ({
    id: c.key,
    label: c.abbr,
    stack: "t",
    color: c.color,
    data: items.map((x) => x[c.key]),
  }));
  const margin = { left: 8, right: 16, top: 8, bottom: 8 };
  const yAxisCfg = [
    {
      scaleType: "band",
      data: items.map((x) => truncate(x.label, 24)),
      width: 170,
      disableLine: true,
      disableTicks: true,
    },
  ];

  return (
    <div className="amr-scroll-y">
      {/* scrolling bars (x-axis hidden) */}
      <BarChart
        layout="horizontal"
        height={items.length * 34 + 16}
        hideLegend
        margin={margin}
        yAxis={yAxisCfg}
        xAxis={[{ tickMinStep: 1, position: "none" }]}
        series={series}
        borderRadius={3}
        grid={{ vertical: true }}
      />

      {/* frozen axis pinned to the bottom of the scroll box */}
      <div className="amr-sticky-axis">
        <BarChart
          layout="horizontal"
          height={40}
          hideLegend
          margin={{ left: 8, right: 16, top: 0, bottom: 8 }}
          yAxis={yAxisCfg}
          xAxis={[{ tickMinStep: 1, height: 28 }]}
          series={series}
          sx={{
            pointerEvents: "none",
            "& .MuiBarElement-root": { display: "none" },
            "& .MuiChartsAxis-left": { display: "none" },
          }}
        />
      </div>
    </div>
  );
}

function ColumnRank({ items }) {
  const wide = items.length * 72 > 760;
  return (
    <div className="amr-scroll-x">
      <BarChart
        height={420}
        {...(wide ? { width: items.length * 72 } : {})}
        hideLegend
        margin={{ left: 8, right: 16, top: 12, bottom: 8 }}
        xAxis={[
          {
            scaleType: "band",
            data: items.map((x) => truncate(x.label, 22)),
            height: 130,
            tickLabelStyle: { angle: -40, textAnchor: "end", fontSize: 11 },
            tickLabelInterval: () => true,
          },
        ]}
        yAxis={[{ tickMinStep: 1 }]}
        series={COUNT_COLUMNS.map((c) => ({
          id: c.key,
          label: c.abbr,
          stack: "t",
          color: c.color,
          data: items.map((x) => x[c.key]),
        }))}
        borderRadius={3}
        grid={{ horizontal: true }}
      />
    </div>
  );
}

function HeatTable({ items, firstCol }) {
  const colMax = {};
  COUNT_COLUMNS.forEach((c) => {
    colMax[c.key] = Math.max(1, ...items.map((x) => x[c.key]));
  });
  const colTotals = COUNT_COLUMNS.map((c) =>
    items.reduce((s, x) => s + x[c.key], 0),
  );
  return (
    <div className="amr-tbl-wrap">
      <table className="amr-tbl">
        <thead>
          <tr>
            <th className="amr-tbl-first">{firstCol}</th>
            {COUNT_COLUMNS.map((c) => (
              <th key={c.key} title={c.label}>
                <i style={{ background: c.color }} />
                {c.abbr}
              </th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x.label}>
              <td className="amr-tbl-first" title={x.label}>
                {x.label}
              </td>
              {COUNT_COLUMNS.map((c) => {
                const v = x[c.key];
                const pct = Math.round((v / colMax[c.key]) * 55) + 8;
                return (
                  <td
                    key={c.key}
                    className={v ? "amr-cell" : "amr-cell amr-zero"}
                    style={
                      v
                        ? {
                            background: `color-mix(in srgb, ${c.color} ${pct}%, #fff)`,
                          }
                        : undefined
                    }
                  >
                    {v || "–"}
                  </td>
                );
              })}
              <td className="amr-tbl-total">{x.total}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="amr-tbl-first">All</td>
            {colTotals.map((v, i) => (
              <td key={i} className="amr-cell">
                {v}
              </td>
            ))}
            <td className="amr-tbl-total">
              {colTotals.reduce((a, b) => a + b, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ═════════ MAIN ═════════ */
export default function AMRDashboard({ filters: externalFilters }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localFilters, setLocalFilters] = useState(EMPTY_FILTERS);
  const [years, setYears] = useState([]);
  const navigate = useNavigate();
  const filters = externalFilters ?? localFilters;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    axios
      .get(`${config.baseApi}/accident/get-all-section1`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setYears(
          [
            ...new Set(
              data
                .map((r) => toYMD(r.date_of_event).slice(0, 4))
                .filter(Boolean),
            ),
          ].sort((a, b) => b.localeCompare(a)),
        );
        const flat = [];
        data.forEach((s1) => {
          const { key, label } = normalizeLocation(s1.location);
          const subtypes = splitList(
            s1.accident_incident_subtype || s1.subtype || "",
          );
          const areas = splitList(s1.working_area);
          if (!areas.length) areas.push("Unspecified");
          areas.forEach((area, idx) => {
            flat.push({
              location_key: key,
              location_label: label,
              date_of_event: s1.date_of_event || null,
              isPD: isPropertyDamage(subtypes),
              job: clean(s1.expereince_at_occupation) || "Unspecified",
              subtypes,
              shift: clean(s1.shift) || "Unspecified",
              area,
              supervisor: clean(s1.supervisor_reported_to) || "Unspecified",
              group: clean(s1.group),
              department: clean(s1.department),
              section: clean(s1.section),
              primary: idx === 0,
            });
          });
        });
        setRows(flat);
      })
      .catch(() => setError("Failed to load dashboard data. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const lastFatal = useMemo(() => {
    const fatal = rows.filter(
      (r) => r.primary && r.subtypes.some(COUNT_COLUMNS[0].match),
    );
    return (
      fatal
        .map((r) => toYMD(r.date_of_event))
        .filter(Boolean)
        .sort()
        .pop() || ""
    );
  }, [rows]);

  const safeHours = lastFatal
    ? Math.max(
        0,
        Math.floor(
          (now - new Date(`${lastFatal}T23:59:59`).getTime()) / 3600000,
        ),
      )
    : null;

  const primary = useMemo(
    () =>
      rows.filter((r) => r.primary && matchesFilter(r.date_of_event, filters)),
    [rows, filters],
  );

  const months = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (!r.primary) return;
      const ymd = toYMD(r.date_of_event);
      if (!ymd) return;
      if (filters.year && ymd.slice(0, 4) !== String(filters.year)) return;
      set.add(ymd.slice(5, 7));
    });
    return [...set].sort();
  }, [rows, filters.year]);

  const locations = useMemo(() => {
    const map = new Map();
    let pd = 0;
    primary.forEach((r) => {
      if (r.isPD) {
        pd += 1;
        return;
      }
      const e = map.get(r.location_key) || {
        label: r.location_label,
        count: 0,
      };
      e.count += 1;
      map.set(r.location_key, e);
    });
    const list = [...map.values()].sort((a, b) => b.count - a.count);
    if (pd) list.push({ label: "Property damage", count: pd });
    return list;
  }, [primary]);

  const grandTotal = locations.reduce((s, l) => s + l.count, 0);

  const types = useMemo(
    () =>
      COUNT_COLUMNS.map((c) => ({
        ...c,
        count: primary.filter((r) => r.subtypes.some(c.match)).length,
      })),
    [primary],
  );
  const typeTotal = types.reduce((s, t) => s + t.count, 0);
  const ltaCount = types
    .filter((t) => t.key === "ltaFatal" || t.key === "ltaNonFatal")
    .reduce((x, t) => x + t.count, 0);
  const nearMissCount = types.find((t) => t.key === "nearMiss")?.count ?? 0;

  const monthly = useMemo(() => {
    const counts = Array(12).fill(0);
    primary.forEach((r) => {
      const m = Number(toYMD(r.date_of_event).slice(5, 7));
      if (m) counts[m - 1] += 1;
    });
    return counts;
  }, [primary]);

  const shifts = useMemo(() => countBy(primary, (r) => r.shift), [primary]);
  const occupations = useMemo(
    () => breakdownBy(primary, (r) => r.job),
    [primary],
  );
  const supervisors = useMemo(
    () => breakdownBy(primary, (r) => r.supervisor),
    [primary],
  );
  const areas = useMemo(
    () =>
      breakdownBy(
        rows.filter((r) => matchesFilter(r.date_of_event, filters)),
        (r) => r.area,
      ),
    [rows, filters],
  );
  const groupRows = useMemo(
    () =>
      breakdownBy(primary, (r) =>
        [r.group, r.department, r.section].filter(Boolean).join(" · "),
      ).slice(0, 12),
    [primary],
  );

  const filterLabel = isFilterActive(filters)
    ? [
        filters.year,
        filters.month && MONTHS[filters.month - 1],
        filters.dateFrom && `from ${filters.dateFrom}`,
        filters.dateTo && `to ${filters.dateTo}`,
      ]
        .filter(Boolean)
        .join(", ")
    : "All dates";

  const sum = (arr) => arr.reduce((s, x) => s + (x.count ?? x.total), 0);

  const pieOf = (list) =>
    list.map((x, i) => ({
      id: i,
      value: x.count,
      label: x.label,
      color: PIE_PALETTE[i % PIE_PALETTE.length],
    }));
  const withColor = (list) =>
    list.map((x, i) => ({ ...x, color: PIE_PALETTE[i % PIE_PALETTE.length] }));

  return (
    <div className="amr-shell">
      <style>{STYLE_SHEET}</style>

      {/* ─── TOP BAR ─── */}
      {!externalFilters && (
        <div className="amr-topbar-outer">
          <div className="amr-topbar-brand">
            <div className="amr-topbar-brand-left">
              <button
                type="button"
                className="amr-btn-back"
                onClick={() => navigate("/admin/AMR")}
              >
                Switch to table
              </button>
              <div className="amr-topbar-divider" />
              <div>
                <span className="amr-topbar-title">
                  Accident Monitoring Report Dashboard
                </span>
                <span className="amr-topbar-sub">
                  Incident overview · by date of event
                </span>
              </div>
            </div>
            <div className="amr-topbar-right">
              <DateFilterBar
                compact
                filters={localFilters}
                onChange={setLocalFilters}
                years={years}
                months={months}
              />
            </div>
          </div>
        </div>
      )}

      <div className="amr-content">
        {externalFilters ? (
          <header className="amr-ext-header">
            <h1>Incident overview</h1>
            <p>{filterLabel} · by date of event</p>
          </header>
        ) : (
          <p className="amr-filter-note">{filterLabel}</p>
        )}

        {loading ? (
          <div className="amr-empty">Loading dashboard…</div>
        ) : error ? (
          <div className="amr-error">{error}</div>
        ) : grandTotal === 0 ? (
          <div className="amr-empty">
            No records for this period. Widen the date range or clear the
            filters.
          </div>
        ) : (
          <>
            {/* ─── KPIs ─── */}
            <section className="amr-kpis">
              <Kpi
                label="Lost-Time Incidents"
                value={ltaCount}
                tone="danger"
                hint={`${Math.round((ltaCount / grandTotal) * 100)}% of all records`}
              />
              <Kpi
                label="High-Potential Near Misses"
                value={nearMissCount}
                hint="Caught before harm occurred"
              />
              <Kpi
                label="Safety Man Hours"
                value={safeHours === null ? "—" : safeHours.toLocaleString()}
                unit={safeHours !== null ? " hrs" : ""}
                tone="ok"
                hint={
                  lastFatal
                    ? `Since last LTA-F on ${lastFatal} · ${Math.floor(safeHours / 24)} days`
                    : "No LTA-F on record"
                }
              />
            </section>

            {/* ─── CHARTS GRID ─── */}
            <div className="amr-grid">
              <Panel
                title="Monthly Trend"
                sub={`${grandTotal} records`}
                accent="#1B5E44"
                span={8}
              >
                <LineChart
                  height={270}
                  hideLegend
                  xAxis={[
                    {
                      scaleType: "point",
                      data: MONTHS.map((m) => m.slice(0, 3)),
                    },
                  ]}
                  yAxis={[{ tickMinStep: 1, min: 0 }]}
                  series={[
                    {
                      data: monthly,
                      area: true,
                      curve: "monotoneX",
                      color: "#1B5E44",
                      label: "Records",
                      showMark: true,
                    },
                  ]}
                  grid={{ horizontal: true }}
                  sx={{
                    "& .MuiAreaElement-root": { fillOpacity: 0.14 },
                    "& .MuiLineElement-root": { strokeWidth: 3 },
                  }}
                />
              </Panel>

              <Panel
                title="By Location"
                sub={`${grandTotal} records`}
                accent="#3F8468"
                span={4}
              >
                <div className="amr-donut-wrap">
                  <PieChart
                    width={200}
                    height={200}
                    hideLegend
                    margin={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    series={[
                      {
                        data: pieOf(locations),
                        innerRadius: 62,
                        outerRadius: 96,
                        paddingAngle: 2,
                        cornerRadius: 4,
                      },
                    ]}
                  />
                  <div className="amr-donut-center">
                    <b>{grandTotal}</b>
                    <span>records</span>
                  </div>
                </div>
                <LegendList items={withColor(locations)} />
              </Panel>

              <Panel
                title="By Incident Type"
                sub={`${typeTotal} records`}
                accent="#C06010"
                span={7}
                empty={!typeTotal && "No incident-type data for this period."}
              >
                <BarChart
                  height={260}
                  hideLegend
                  xAxis={[
                    {
                      scaleType: "band",
                      data: types.map((t) => t.abbr),
                      colorMap: {
                        type: "ordinal",
                        values: types.map((t) => t.abbr),
                        colors: types.map((t) => t.color),
                      },
                    },
                  ]}
                  yAxis={[{ tickMinStep: 1 }]}
                  series={[
                    { data: types.map((t) => t.count), label: "Records" },
                  ]}
                  borderRadius={6}
                  barLabel="value"
                  grid={{ horizontal: true }}
                />
                <p className="amr-note">
                  LTA = lost time · NLTA = non-lost time · FAC = first aid · NM
                  = near miss · OI = occupational illness · PD = property damage
                </p>
              </Panel>

              <Panel
                title="By Shift"
                sub={`${sum(shifts)} records`}
                accent="#2C4A5C"
                span={5}
                empty={!shifts.length && "No shift data for this period."}
              >
                <PieChart
                  height={170}
                  hideLegend
                  series={[
                    {
                      data: pieOf(shifts),
                      startAngle: -90,
                      endAngle: 90,
                      cx: "50%",
                      cy: "90%",
                      innerRadius: 70,
                      outerRadius: 110,
                      paddingAngle: 2,
                      cornerRadius: 4,
                    },
                  ]}
                />
                <LegendList items={withColor(shifts)} />
              </Panel>

              <Panel
                title="Occupation / Designation"
                sub={`${occupations.length} occupations · ${sum(occupations)} records`}
                accent="#7A6E10"
                span={6}
                empty={
                  !occupations.length && "No occupation data for this period."
                }
              >
                <TypeKey />
                <ColumnRank items={occupations} />
              </Panel>

              <Panel
                title="Supervisor of Injured Person / Damaged Area"
                sub={`${supervisors.length} supervisors · ${sum(supervisors)} records`}
                accent="#5A4E90"
                span={6}
                empty={
                  !supervisors.length && "No supervisor data for this period."
                }
              >
                <TypeKey />
                <StackedRank items={supervisors} />
              </Panel>

              <Panel
                title="Working Area"
                sub={`${areas.length} areas`}
                accent="#0F3D2B"
                span={6}
                empty={!areas.length && "No working-area data for this period."}
              >
                <HeatTable items={areas} firstCol="Area" />
              </Panel>

              <Panel
                title="Group / Dept. / Section"
                sub={`Top ${groupRows.length} by total`}
                accent="#3F8468"
                span={6}
                empty={
                  !groupRows.length &&
                  "No group, department or section data for this period."
                }
              >
                <HeatTable
                  items={groupRows}
                  firstCol="Group · Dept · Section"
                />
              </Panel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═════════ STYLES ═════════ */
const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

.amr-shell {
  --ink:#0D1B2A; --ink-soft:#2C4A3E; --muted:#5E7A6E; --paper:#fff; --paper-alt:#F0F4F2;
  --line:#C8D8D1; --line-strong:#9DBCB0; --green:#1B5E44; --green-deep:#0F3D2B; --green-soft:#D4EDE5;
  --danger:#B02020; --danger-soft:#FAE8E8; --amber:#C06010;
  --shadow-sm:0 1px 2px rgba(13,27,42,.05),0 4px 14px rgba(15,61,43,.07);
  --shadow-md:0 2px 4px rgba(13,27,42,.06),0 12px 28px rgba(15,61,43,.14);
  min-height:100vh; background:var(--paper-alt); color:var(--ink);
  font-family:'Inter',sans-serif; font-variant-numeric:tabular-nums;
}
.amr-shell * { box-sizing:border-box; }
.amr-shell svg text { font-family:'Inter',sans-serif !important; }

/* ── TOP BAR ── */
.amr-topbar-outer { position:sticky; top:0; z-index:10; background:#0D1B2A; border-bottom:1px solid rgba(255,255,255,.06); }
.amr-topbar-brand { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; max-width:1800px; margin:0 auto; padding:12px 32px; }
.amr-topbar-brand-left { display:flex; align-items:center; gap:16px; }
.amr-topbar-divider { width:1px; height:28px; background:rgba(255,255,255,.1); }
.amr-topbar-title { display:block; font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:18px; letter-spacing:.05em; color:#40aa52; }
.amr-topbar-sub { display:block; margin-top:3px; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:#7C9BB3; }
.amr-topbar-right { display:flex; align-items:flex-end; flex-wrap:wrap; gap:12px 16px; }
.amr-btn-back {
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
.amr-btn-back:hover { border:1px solid rgb(0, 97, 29); color: #fff; background: #14694a }

/* ── CONTENT ── */
.amr-content { max-width:1800px; margin:0 auto; padding:24px 32px 60px; }
.amr-filter-note { margin:0 0 14px; font-size:12.5px; color:var(--muted); }
.amr-ext-header { margin-bottom:16px; }
.amr-ext-header h1 { margin:0; font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:26px; letter-spacing:.02em; }
.amr-ext-header p { margin:4px 0 0; font-size:12.5px; color:var(--muted); }
.amr-empty { text-align:center; color:var(--muted); font-size:14px; padding:80px 20px; background:#fff; border:1px solid var(--line); border-radius:14px; }
.amr-error { background:var(--danger-soft); border:1px solid var(--danger); color:#7A1F1F; font-weight:600; font-size:13px; padding:10px 14px; border-radius:6px; margin-bottom:16px; }

/* ── KPIs ── */
.amr-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:18px; }
.amr-kpi {
  --accent:var(--green);
  position:relative; overflow:hidden;
  background:linear-gradient(145deg,#fff 40%,color-mix(in srgb,var(--accent) 12%,#fff));
  border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));
  border-radius:14px; padding:16px 18px 14px; box-shadow:var(--shadow-sm);
  transition:transform .18s ease,box-shadow .18s ease;
}
.amr-kpi::after { content:""; position:absolute; right:-26px; bottom:-34px; width:104px; height:104px; border-radius:50%; background:color-mix(in srgb,var(--accent) 11%,transparent); pointer-events:none; }
.amr-kpi > * { position:relative; z-index:1; }
.amr-kpi:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); }
.amr-kpi--danger { --accent:var(--danger); }
.amr-kpi--ok    { --accent:var(--green-deep); }
.amr-kpi--warn  { --accent:var(--amber); }
.amr-kpi-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
.amr-kpi-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-soft); }
.amr-kpi-value { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:38px; line-height:1.1; margin-top:4px; color:var(--accent); }
.amr-kpi-value small { font-family:'Inter',sans-serif; font-size:16px; font-weight:600; color:var(--muted); }
.amr-kpi-hint { font-size:11px; color:var(--muted); margin-top:2px; }

/* ── CHART GRID ── */
.amr-grid { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:14px; margin-bottom:18px; }
.amr-panel {
  --accent:var(--green);
  grid-column:span var(--span,6); min-width:0; overflow:hidden;
  background:var(--paper); border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));
  border-radius:14px; box-shadow:var(--shadow-sm);
  transition:box-shadow .18s ease,transform .18s ease,border-color .18s ease;
}
.amr-panel:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); border-color:color-mix(in srgb,var(--accent) 55%,var(--line)); }
.amr-panel-head { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:10px 16px; background:linear-gradient(115deg,var(--accent),color-mix(in srgb,var(--accent) 62%,#fff)); }
.amr-panel-title { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:15px; text-transform:uppercase; letter-spacing:.06em; color:#fff; margin:0; }
.amr-panel-sub { font-size:11px; color:rgba(255,255,255,.85); font-style:italic; }
.amr-panel > :not(.amr-panel-head) { padding:16px 18px 18px; }
.amr-empty-inline { text-align:center; color:var(--muted); font-size:12px; font-style:italic; padding:32px 4px; }
.amr-note { margin:8px 0 0; font-size:12px; color:var(--muted); line-height:1.5; }

/* ── DONUT ── */
.amr-donut-wrap { position:relative; width:200px; height:200px; margin:0 auto 12px; }
.amr-donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
.amr-donut-center b { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:34px; color:var(--ink); }
.amr-donut-center span { font-size:12px; color:var(--muted); }

/* ── LEGEND ── */
.amr-legend { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:2px; max-height:190px; overflow-y:auto; }
.amr-legend li { display:flex; align-items:center; gap:9px; padding:6px 4px; border-bottom:1px solid var(--line); font-size:13px; color:var(--ink-soft); }
.amr-legend i { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.amr-legend span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500; }
.amr-legend b { color:var(--ink); font-family:'IBM Plex Mono',monospace; }
.amr-legend em { font-style:normal; font-size:11px; color:var(--muted); min-width:36px; text-align:right; }

/* ── TYPE KEY ── */
.amr-typekey { display:flex; flex-wrap:wrap; gap:6px 14px; margin:0 0 6px; font-size:12px; color:var(--muted); }
.amr-typekey span { display:inline-flex; align-items:center; gap:5px; }
.amr-typekey i { width:9px; height:9px; border-radius:2px; }

/* ── SCROLL CONTAINERS ── */
.amr-scroll-x { overflow-x:auto; }
.amr-scroll-y { max-height:480px; overflow-y:auto; }

/* ── HEAT TABLE ── */
.amr-tbl-wrap { overflow:auto; max-height:440px; }
.amr-tbl { width:100%; border-collapse:separate; border-spacing:3px; font-size:12.5px; }
.amr-tbl th { position:sticky; top:0; z-index:1; background:color-mix(in srgb,var(--green) 8%,#fff); padding:6px 4px; font:600 11px 'Inter',sans-serif; color:var(--ink-soft); text-align:center; white-space:nowrap; text-transform:uppercase; letter-spacing:.04em; }
.amr-tbl th i { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:4px; }
.amr-tbl td { padding:8px 4px; text-align:center; border-radius:6px; background:#F0F4F2; font:600 12.5px 'IBM Plex Mono',monospace; }
.amr-tbl .amr-tbl-first { text-align:left; background:transparent; padding-left:4px; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ink-soft); font-family:'Inter',sans-serif; font-weight:500; }
.amr-tbl .amr-zero { color:#B8C4D0; font-weight:400; }
.amr-tbl .amr-tbl-total { background:var(--green-deep); color:#fff; }
.amr-tbl tfoot td { border-top:2px solid var(--line-strong); background:#D4EDE5; }
.amr-tbl tfoot .amr-tbl-first { background:transparent; }

/* ── RESPONSIVE ── */
@media (max-width:1100px) {
  .amr-panel { grid-column:span 12 !important; }
  .amr-kpis { grid-template-columns:1fr; }
}
@media (max-width:700px) {
  .amr-topbar-brand { padding:10px 16px; }
  .amr-topbar-title { font-size:16px; }
  .amr-content { padding:16px 12px 48px; }
}
@media (prefers-reduced-motion:reduce) {
  .amr-panel, .amr-kpi { transition:none; }
  .amr-panel:hover, .amr-kpi:hover { transform:none; }
}
.amr-sticky-axis { position:sticky; bottom:0; z-index:2; background:#fff; border-top:1px solid var(--line); }
`;
