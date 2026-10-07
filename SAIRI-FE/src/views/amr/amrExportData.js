/* ════════════════════════════════════════════════════════════════════════
   amrExportData.js
   Pure data layer for the AMR Excel export (no network, no Excel code).

   Turns the raw Section 1 / Section 3 / equipment rows into per-year,
   per-month counts. The counting rules deliberately mirror the on-screen
   tabs so the workbook agrees with what the user sees:

   - classification  : accident_incident_subtype  (LTA-F, LTA-NF, NLTA, FAC, NM, OI, PD)
   - occupation      : expereince_at_occupation, or equipment name for Property Damage
   - mechanism       : Section 3 mechanism_of_injury, split on "|"
   - working area    : Section 1 working_area, split on "," or "|"
   - date            : Section 1 date_reported  (same field the date filter uses)
   ════════════════════════════════════════════════════════════════════════ */

import { matchesDateFilter, toYMD, isFilterActive } from "./dateFilter";

export const MONTHS = [
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

const norm = (s) => (s || "").toString().toLowerCase();
const clean = (s) => (s || "").toString().trim();

// NEW: 24h "14:30" → "2:30 PM"
const to12Hour = (hhmm) => {
  const [hStr, m] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12; // 0 → 12, 13 → 1, etc.
  return `${h}:${m} ${suffix}`;
};

/** Same 7 classification columns as the on-screen tabs, in template order. */
export const CLASSES = [
  {
    key: "ltaFatal",
    abbr: "LTA-F",
    shiftLabel: "LTA-F",
    match: (v) => norm(v) === "injury-lta-f",
  },
  {
    key: "ltaNonFatal",
    abbr: "LTA-NF",
    shiftLabel: "LTA-NF",
    match: (v) => norm(v) === "injury-lta-nf",
  },
  {
    key: "nlta",
    abbr: "NLTA",
    shiftLabel: "NLTA",
    match: (v) => norm(v) === "injury-nlta",
  },
  {
    key: "firstAid",
    abbr: "FAC",
    shiftLabel: "FAC",
    match: (v) => norm(v) === "injury-fac",
  },
  {
    key: "nearMiss",
    abbr: "NM",
    shiftLabel: "NM",
    match: (v) => norm(v) === "near miss",
  },
  {
    key: "illness",
    abbr: "OI",
    shiftLabel: "Occupational Illness",
    match: (v) => norm(v) === "oi",
  },
  {
    key: "propertyDamage",
    abbr: "PD",
    shiftLabel: "Property Damage",
    match: (v) => norm(v) === "property damage",
  },
];

const splitOn = (raw, re) => {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(re);
  return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))];
};

/* ────────────────────────────── records ─────────────────────────────── */

/** One flat record per Section 1 row. */
export function buildRecords({
  section1 = [],
  section3 = [],
  equipment = [],
  section7 = [],
  section8 = [],
}) {
  const s3ById = new Map(section3.map((r) => [r.accident_id, r]));
  const s7ById = new Map(section7.map((r) => [r.accident_id, r]));
  const s8ById = new Map(section8.map((r) => [r.accident_id, r]));
  const equipById = new Map();
  equipment.forEach((r) => {
    const name = clean(r.equipment_name);
    if (name) equipById.set(r.accident_id, name);
  });

  return section1.map((row) => {
    // ── lookups first, before anything uses them ──
    const s3row = s3ById.get(row.accident_id);
    const s7row = s7ById.get(row.accident_id);
    const s8row = s8ById.get(row.accident_id);

    // ── corrective text (plain string for fallback) ──
    let correctiveText = "";
    try {
      const parsed = s8row?.corrective_table
        ? JSON.parse(s8row.corrective_table)
        : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        correctiveText = parsed
          .map((it, i) => `${i + 1}. ${it.recommendation || ""}`)
          .filter(Boolean)
          .join("\n");
      }
    } catch {
      correctiveText = "";
    }

    // ── corrective items (array for status check) ──
    let correctiveItems = [];
    try {
      const parsed = s8row?.corrective_table
        ? JSON.parse(s8row.corrective_table)
        : [];
      correctiveItems = Array.isArray(parsed) ? parsed : [];
    } catch {
      correctiveItems = [];
    }

    const subtypes = splitOn(row.accident_incident_subtype, /[|,]/);
    const classes = CLASSES.filter((c) => subtypes.some(c.match)).map(
      (c) => c.key,
    );
    const isPD = classes.includes("propertyDamage");

    const experience = clean(row.expereince_at_occupation) || "(not specified)";
    const equipName = equipById.get(row.accident_id);

    const mechanisms = splitOn(s3row?.mechanism_of_injury, /\|/);
    const areas = splitOn(row.working_area, /[|,]/);

    // ── time ──
    const rawTime = row.time_of_incident ?? row.time ?? row.time_of_event ?? "";
    let timeStr = "";
    if (rawTime) {
      const t = String(rawTime).trim();
      let hhmm = "";
      if (/^\d{1,2}:\d{2}/.test(t)) {
        hhmm = t.slice(0, 5);
      } else {
        const d = new Date(t);
        if (!isNaN(d.getTime())) {
          hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
      }
      if (hhmm) timeStr = to12Hour(hhmm);
    }

    return {
      id: row.accident_id,
      date: String(row.date_of_event ?? "").slice(0, 10),
      time: timeStr,
      name: clean(row.name ?? ""),
      cnUnit: clean(row.chapa_number ?? ""),
      occupation: isPD && equipName ? equipName : experience,
      level: clean(row.level ?? ""),
      shift: clean(row.shift) || "Unspecified",
      deptHead: clean(row.department_head ?? ""),
      sectionHead: clean(row.section_head ?? ""),
      supervisor: clean(row.supervisor_reported_to ?? ""),
      nature: "",
      activity: clean(row.immediate_actions_taken ?? ""),
      inspector: clean(row.prepared_by ?? ""),
      group: clean(row.group) || "Unspecified",
      department: clean(row.department) || "Unspecified",
      section: clean(row.section ?? ""),
      recordedBy: clean(row.prepared_by ?? ""),
      briefDescription: clean(row.incident_accident_brief_description ?? ""),
      findings: clean(s7row?.facts_and_findings ?? ""),
      corrective: correctiveText,
      correctiveItems,
      classes,
      areas: areas.length ? areas : ["Unspecified"],
      mechanisms: mechanisms.length ? mechanisms : ["Unspecified"],
    };
  });
}

/** Apply the date filter. Records with no usable date can't be placed in a month. */
export function selectRecords(records, filters) {
  const kept = [];
  let skippedNoDate = 0;

  records.forEach((r) => {
    // If no date, include anyway when no filter is active; skip only when a filter requires a date
    if (!r.date) {
      if (isFilterActive(filters)) {
        skippedNoDate += 1; // Can't match a date range with no date
        return;
      }
      // No filter active → include it with a placeholder date so it lands somewhere
      kept.push({
        ...r,
        date: `${new Date().getFullYear()}-01-01`,
        _noDate: true,
      });
      return;
    }
    if (!matchesDateFilter(r.date, filters)) return;
    kept.push(r);
  });

  return { kept, skippedNoDate };
}

/* ───────────────────────── period helpers ───────────────────────────── */

/** Is any day of this month inside the active filter? (used to grey out months) */
export function monthActive(year, monthIdx, filters) {
  if (!isFilterActive(filters)) return true;
  const mm = String(monthIdx + 1).padStart(2, "0");
  const lastDay = new Date(Number(year), monthIdx + 1, 0).getDate();
  const first = `${year}-${mm}-01`;
  const last = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  if (filters.year && String(filters.year) !== String(year)) return false;
  if (filters.dateFrom && last < filters.dateFrom) return false;
  if (filters.dateTo && first > filters.dateTo) return false;
  return true;
}

export function describePeriod(filters) {
  if (!isFilterActive(filters)) return "All dates";
  const parts = [];
  if (filters.year) parts.push(`Year ${filters.year}`);
  if (filters.dateFrom) parts.push(`from ${filters.dateFrom}`);
  if (filters.dateTo) parts.push(`to ${filters.dateTo}`);
  return parts.join(" · ");
}

export function filenameFor(filters, years) {
  const tail = "AMR_Consolidated_Report.xlsx";
  if (filters?.dateFrom || filters?.dateTo) {
    return `${filters.dateFrom || "start"}_to_${filters.dateTo || "latest"}_${tail}`;
  }
  if (filters?.year) return `${filters.year}_${tail}`;
  return `${years.length === 1 ? years[0] : "All-Years"}_${tail}`;
}

/* ─────────────────────────── aggregation ────────────────────────────── */

const zeros = () => new Array(12).fill(0);
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

const bump = (map, key, m) => {
  if (!map.has(key)) map.set(key, zeros());
  map.get(key)[m] += 1;
};
const bumpNested = (map, k1, k2, m) => {
  if (!map.has(k1)) map.set(k1, new Map());
  bump(map.get(k1), k2, m);
};

// "Unspecified" style buckets always sink to the bottom.
const isBlankBucket = (s) => /^(unspecified|\(not specified\))$/i.test(s);
const byTotalThenName = (a, b) =>
  isBlankBucket(a.label) - isBlankBucket(b.label) ||
  sum(b.counts) - sum(a.counts) ||
  a.label.localeCompare(b.label);

const SHIFT_ORDER = ["first", "second", "third"];

/**
 * Everything the workbook needs for one calendar year.
 * Every `counts` array has 12 entries (Jan..Dec).
 */
export function aggregateYear(records, year) {
  const yr = String(year);
  const recs = records.filter((r) => r.date.slice(0, 4) === yr);

  const mechClass = new Map(); // mechanism -> Map(classKey -> counts)
  const occClass = new Map(); // occupation -> Map(classKey -> counts)
  const shiftClass = new Map(); // shift -> Map(classKey -> counts)
  const oi = zeros(); // Occupational Illness, once per report
  const occ = new Map(); // occupation -> counts (once per report)
  const areas = new Map(); // area -> counts (once per report per area)
  const groups = new Map(); // group -> Map(department -> counts)

  recs.forEach((r) => {
    const m = parseInt(r.date.slice(5, 7), 10) - 1;
    if (!(m >= 0 && m < 12)) return;

    r.classes.forEach((ck) => {
      r.mechanisms.forEach((mech) => bumpNested(mechClass, mech, ck, m));
      bumpNested(occClass, r.occupation, ck, m);
      bumpNested(shiftClass, r.shift, ck, m);
    });
    if (r.classes.includes("illness")) oi[m] += 1;

    bump(occ, r.occupation, m);
    r.areas.forEach((a) => bump(areas, a, m));
    bumpNested(groups, r.group, r.department, m);
  });

  /* Type of Incident rows: "LTA-NF - Struck by Falling Rock", grouped by class */
  const types = [];
  CLASSES.forEach((c) => {
    if (c.key === "illness") {
      if (sum(oi) > 0)
        types.push({
          gid: c.key,
          label: "Occupational Illness / Pain",
          counts: oi,
        });
      return;
    }
    const rows = [];
    mechClass.forEach((byClass, mech) => {
      if (!byClass.has(c.key)) return;
      const label =
        c.key === "propertyDamage"
          ? mech === "Unspecified"
            ? "Property Damage"
            : `Property Damage - ${mech}`
          : `${c.abbr} - ${mech}`;
      rows.push({ gid: c.key, label, counts: byClass.get(c.key) });
    });
    rows.sort(
      (a, b) => sum(b.counts) - sum(a.counts) || a.label.localeCompare(b.label),
    );
    types.push(...rows);
  });

  const flat = (map) =>
    [...map]
      .map(([label, counts]) => ({ label, counts }))
      .sort(byTotalThenName);

  /* Shift → classification sub-rows */
  const shiftNames = [...shiftClass.keys()].sort((a, b) => {
    const ia = SHIFT_ORDER.indexOf(a.toLowerCase());
    const ib = SHIFT_ORDER.indexOf(b.toLowerCase());
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const shifts = [];
  shiftNames.forEach((shift) => {
    CLASSES.forEach((c) => {
      const counts = shiftClass.get(shift).get(c.key);
      if (counts)
        shifts.push({ gid: shift, group: shift, label: c.shiftLabel, counts });
    });
  });

  /* Group → department sub-rows */
  const groupRows = [];
  [...groups]
    .map(([g, depts]) => ({
      g,
      depts,
      total: sum([...depts.values()].map(sum)),
    }))
    .sort(
      (a, b) =>
        isBlankBucket(a.g) - isBlankBucket(b.g) ||
        b.total - a.total ||
        a.g.localeCompare(b.g),
    )
    .forEach(({ g, depts }) => {
      [...depts]
        .map(([label, counts]) => ({ label, counts }))
        .sort(byTotalThenName)
        .forEach((d) =>
          groupRows.push({
            gid: g,
            group: g,
            label: d.label,
            counts: d.counts,
          }),
        );
    });

  /* Compilation blocks: label + counts per classification */
  const compilation = (map) =>
    [...map]
      .map(([label, byClass]) => ({
        label,
        byClass: Object.fromEntries(byClass),
        total: sum([...byClass.values()].map(sum)),
      }))
      .sort(
        (a, b) =>
          isBlankBucket(a.label) - isBlankBucket(b.label) ||
          b.total - a.total ||
          a.label.localeCompare(b.label),
      );

  return {
    year: yr,
    reportCount: recs.length,
    types,
    occupations: flat(occ),
    shifts,
    areas: flat(areas),
    groups: groupRows,
    compTypes: compilation(mechClass),
    compOccupations: compilation(occClass),
  };
}
