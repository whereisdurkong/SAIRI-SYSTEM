/* ════════════════════════════════════════════════════════════════════════
   amrExport.js  –  builds one sheet per month, matching the AMR_2026 template
   ════════════════════════════════════════════════════════════════════════ */

import ExcelJS from "exceljs";
import axios from "axios";
import config from "config";
import {
  CLASSES,
  MONTHS,
  buildRecords,
  selectRecords,
  describePeriod,
  filenameFor,
} from "./amrExportData";

/* ─────────────────────── palette (matches template) ──────────────────── */
const FONT_NAME = "Calibri";
const SZ = 9;

const FILLS = {
  title: "4472C4",
  header: "BDD7EE",
  total: "C6E0B4",
  label: "F2F2F2",
  odd: "FFFFFF",
  even: "EBF3FB",
};

const thin = { style: "thin", color: { argb: "FF808080" } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

const cl = (n) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

function cell(
  ws,
  r,
  c,
  value,
  {
    bold = false,
    italic = false,
    sz = SZ,
    fill,
    color,
    align = "center",
    valign = "middle",
    wrap = false,
    numFmt,
    border = true,
    font = FONT_NAME,
  } = {},
) {
  const ce = ws.getCell(r, c);
  ce.value = value;
  ce.font = {
    name: font,
    size: sz,
    bold,
    italic,
    ...(color ? { color: { argb: `FF${color}` } } : {}),
  };
  if (fill)
    ce.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${fill}` },
    };
  ce.alignment = { horizontal: align, vertical: valign, wrapText: wrap };
  if (border) ce.border = BORDER;
  if (numFmt) ce.numFmt = numFmt;
  return ce;
}

const mg = (ws, r1, c1, r2, c2) => {
  if (r1 !== r2 || c1 !== c2) ws.mergeCells(r1, c1, r2, c2);
};

const LC0 = 4;
const LCK = 8;
const LCT = LC0 + LCK;
const LCP = LCT + 1;
const RC0 = 17;
const RCT = RC0 + LCK;
const RCP = RCT + 1;

const TCOLS = [
  { key: "ltaFatal", abbr: "LTA-F" },
  { key: "ltaNonFatal", abbr: "LTA-NF" },
  { key: "nlta", abbr: "NLTA" },
  { key: "firstAid", abbr: "FAC" },
  { key: "nearMiss", abbr: "NM" },
  { key: "illness", abbr: "OI" },
  { key: "propertyDamage", abbr: "PD" },
  { key: "emergency", abbr: "EI" },
];

const zeros8 = () => new Array(8).fill(0);
const sumArr = (a) => a.reduce((x, y) => x + y, 0);

function classCounts(classes) {
  return TCOLS.map((tc) => (classes.includes(tc.key) ? 1 : 0));
}

/* ──────────────────── aggregate one month's records ──────────────────── */
function aggregateMonth(recs) {
  const occMap = new Map();
  const mechMap = new Map();
  const shiftMap = new Map();
  const areaMap = new Map();

  recs.forEach((r) => {
    const cc = classCounts(r.classes);
    const occ = r.occupation || "(not specified)";
    if (!occMap.has(occ)) occMap.set(occ, zeros8());
    cc.forEach((v, i) => {
      occMap.get(occ)[i] += v;
    });

    (r.mechanisms?.length ? r.mechanisms : ["Unspecified"]).forEach((mech) => {
      if (!mechMap.has(mech)) mechMap.set(mech, zeros8());
      cc.forEach((v, i) => {
        mechMap.get(mech)[i] += v;
      });
    });

    const sh = r.shift || "Unspecified";
    if (!shiftMap.has(sh)) shiftMap.set(sh, zeros8());
    cc.forEach((v, i) => {
      shiftMap.get(sh)[i] += v;
    });

    (r.areas?.length ? r.areas : ["Unspecified"]).forEach((a) => {
      if (!areaMap.has(a)) areaMap.set(a, zeros8());
      cc.forEach((v, i) => {
        areaMap.get(a)[i] += v;
      });
    });
  });

  const toRows = (map) =>
    [...map]
      .map(([label, counts]) => ({ label, counts }))
      .sort(
        (a, b) =>
          sumArr(b.counts) - sumArr(a.counts) || a.label.localeCompare(b.label),
      );

  const SHIFT_ORDER = ["first", "second", "third"];
  const shiftRows = [...shiftMap]
    .map(([label, counts]) => ({ label, counts }))
    .sort((a, b) => {
      const ia = SHIFT_ORDER.indexOf(a.label.toLowerCase());
      const ib = SHIFT_ORDER.indexOf(b.label.toLowerCase());
      return (
        (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) ||
        a.label.localeCompare(b.label)
      );
    });

  return {
    occupations: toRows(occMap),
    mechanisms: toRows(mechMap),
    shifts: shiftRows,
    areas: toRows(areaMap),
  };
}

/* ══════════════════ INCIDENT DETAILS SECTION (defined BEFORE writeMonthSheet) ══════════════════ */
function writeIncidentDetailsSection(ws, recs, startRow) {
  /* ── Section title ── */
  ws.getRow(startRow).height = 20;
  cell(ws, startRow, 2, "INCIDENT DETAILS", {
    bold: true,
    sz: 11,
    fill: FILLS.title,
    color: "FFFFFF",
    align: "left",
    border: false,
  });
  mg(ws, startRow, 2, startRow, 26);

  /* ── Group header row ── */
  const groupRow = startRow + 1;
  ws.getRow(groupRow).height = 18;

  cell(ws, groupRow, 2, "#", { bold: true, fill: FILLS.header });
  cell(ws, groupRow, 3, "Reference", { bold: true, fill: FILLS.header });
  mg(ws, groupRow, 3, groupRow, 4);

  cell(ws, groupRow, 5, "BRIEF DESCRIPTION OF INCIDENT(S)", {
    bold: true,
    fill: FILLS.header,
    align: "center",
    sz: 9,
  });
  mg(ws, groupRow, 5, groupRow, 14);

  cell(
    ws,
    groupRow,
    15,
    "IMMEDIATE ACTION / FINDINGS / OBSERVATIONS / CORRECTIVE ACTIONS",
    {
      bold: true,
      fill: FILLS.header,
      align: "center",
      sz: 9,
      wrap: true,
    },
  );
  mg(ws, groupRow, 15, groupRow, 26);

  /* ── Column sub-headers ── */
  // const detailHeaderRow = startRow + 2;
  // ws.getRow(detailHeaderRow).height = 30;

  // cell(ws, detailHeaderRow, 2, "#", {
  //   bold: true,
  //   fill: FILLS.header,
  //   wrap: true,
  //   sz: 9,
  // });

  // cell(ws, detailHeaderRow, 3, "Reference", {
  //   bold: true,
  //   fill: FILLS.header,
  //   wrap: true,
  //   sz: 9,
  // });
  // mg(ws, detailHeaderRow, 3, detailHeaderRow, 4);

  // cell(ws, detailHeaderRow, 5, "Name / Mechanism of Injury / Working Area", {
  //   bold: true,
  //   fill: FILLS.header,
  //   wrap: true,
  //   sz: 9,
  // });
  // mg(ws, detailHeaderRow, 5, detailHeaderRow, 9);

  // cell(ws, detailHeaderRow, 10, "Incident / Accident Brief Description", {
  //   bold: true,
  //   fill: FILLS.header,
  //   wrap: true,
  //   sz: 9,
  // });
  // mg(ws, detailHeaderRow, 10, detailHeaderRow, 14);

  // cell(
  //   ws,
  //   detailHeaderRow,
  //   15,
  //   "Immediate Action Taken / Findings / Corrective & Preventive Action Plan (CPAP)",
  //   {
  //     bold: true,
  //     fill: FILLS.header,
  //     wrap: true,
  //     sz: 9,
  //   },
  // );
  // mg(ws, detailHeaderRow, 15, detailHeaderRow, 26);

  /* ── Empty fallback ── */
  if (recs.length === 0) {
    const emptyRow = groupRow + 1;
    cell(ws, emptyRow, 2, "— no incidents —", {
      italic: true,
      align: "left",
      fill: FILLS.label,
    });
    mg(ws, emptyRow, 2, emptyRow, 26);
    return;
  }

  const calcLines = (text, colWidth) => {
    if (!text) return 1;
    return text.split("\n").reduce((acc, line) => {
      return acc + Math.max(1, Math.ceil((line.length || 1) / colWidth));
    }, 0);
  };

  recs.forEach((r, idx) => {
    const rowNum = groupRow + 1 + idx;
    const rowFill = idx % 2 === 0 ? FILLS.odd : FILLS.even;

    // # (col 2)
    cell(ws, rowNum, 2, idx + 1, { fill: rowFill, align: "center" });

    // Reference (cols 3–4)
    cell(ws, rowNum, 3, r.id, { fill: rowFill, align: "left" });
    mg(ws, rowNum, 3, rowNum, 4);

    // Name / Mechanism / Working Area (cols 5–9)
    const nameBlock = [
      `Name: ${r.name || "—"}`,
      `Mechanism: ${(r.mechanisms || []).filter((m) => m !== "Unspecified").join(", ") || "—"}`,
      `Working Area: ${(r.areas || []).filter((a) => a !== "Unspecified").join(", ") || "—"}`,
    ].join("\n");
    cell(ws, rowNum, 5, nameBlock, {
      fill: rowFill,
      align: "left",
      wrap: true,
    });
    mg(ws, rowNum, 5, rowNum, 14);

    // Actions block (cols 15–26)
    const cpapItems = Array.isArray(r.correctiveItems) ? r.correctiveItems : [];
    const cpapText =
      cpapItems.length === 0
        ? r.corrective || "—"
        : cpapItems
            .map((it, i) => {
              const rec = it.recommendation || "—";
              const closed =
                it.status?.toLowerCase() === "completed"
                  ? `\n   ✓ CASE CLOSED ${it.completion_date || ""}`.trim()
                  : "";
              return `${i + 1}. ${rec}${closed}`;
            })
            .join("\n");

    const actionsBlock = [
      `Immediate Action:\n${r.activity || "—"}`,
      `\nFindings / Observations:\n${r.findings || "—"}`,
      `\nCorrective & Preventive Action Plan (CPAP):\n${cpapText}`,
    ].join("\n");

    cell(ws, rowNum, 15, actionsBlock, {
      fill: rowFill,
      align: "left",
      wrap: true,
    });
    mg(ws, rowNum, 15, rowNum, 26);

    // Auto row height
    const nameLines = calcLines(nameBlock, 25);
    const actLines = calcLines(actionsBlock, 60);
    const maxLines = Math.max(nameLines, actLines, 4);
    ws.getRow(rowNum).height = Math.min(Math.max(maxLines * 13, 52), 600);
  });
}
/* ══════════════════════════ write one month sheet ══════════════════════ */
function writeMonthSheet(wb, monthName, monthIdx, year, recs, filters) {
  const ws = wb.addWorksheet(monthName);

  /* ── column widths ── */
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 4;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 40;
  ws.getColumn(7).width = 40;
  ws.getColumn(8).width = 40;
  ws.getColumn(9).width = 6;
  ws.getColumn(10).width = 10;
  ws.getColumn(11).width = 4;
  ws.getColumn(12).width = 8;
  ws.getColumn(13).width = 10;
  ws.getColumn(14).width = 28;
  ws.getColumn(15).width = 10;
  ws.getColumn(16).width = 10;
  ws.getColumn(17).width = 14;
  ws.getColumn(18).width = 6;
  ws.getColumn(19).width = 6;
  ws.getColumn(20).width = 10;
  ws.getColumn(21).width = 6;
  ws.getColumn(22).width = 12;
  ws.getColumn(23).width = 12;
  ws.getColumn(24).width = 4;
  ws.getColumn(25).width = 8;
  ws.getColumn(26).width = 12;

  /* ── Row 1: Title ── */
  ws.getRow(1).height = 20;
  cell(ws, 1, 2, "ACCIDENT MONITORING REPORT", {
    bold: true,
    sz: 14,
    fill: "FFF2CC", // yellow background
    color: "000000", // black text
    align: "center", // centered
    border: false,
  });
  mg(ws, 1, 2, 1, 26);

  /* ── Row 2: Month + Year ── */
  ws.getRow(2).height = 16;
  cell(ws, 2, 2, `${monthName.toUpperCase()},  ${year}`, {
    bold: true,
    fill: "C6E0B4",
    color: "000000", // black text
    align: "center", // centered
    sz: 12,
    fill: FILLS.header,
    border: false,
  });
  mg(ws, 2, 2, 2, 26);

  /* ── Row 3: Register column headers ── */
  ws.getRow(3).height = 36;
  const regHeaders = [
    [2, 3, "Name of Person Injured / Damaged Property"],
    [4, 4, "CN / Unit #"],
    [5, 5, "Occupation / Designation"],
    [6, 7, "Type of Incident"],
    [8, 8, "Work Place / Area"],
    [9, 9, "Level"],
    [10, 11, "Date"],
    [12, 13, "Time"],
    [14, 14, "Shift"],
    [15, 15, "Dep't Head"],
    [16, 16, "Section Head"],
    [17, 17, "Immediate Supervisor"],
    [18, 18, "Nature of Injury"],
    [19, 19, "On-Going Activity"],
    [20, 21, "Safety Inspector On-duty"],
    [22, 22, "Group"],
    [23, 24, "Department"],
    [25, 25, "Section"],
    [26, 26, "Recorded By"],
  ];
  regHeaders.forEach(([c1, c2, label]) => {
    cell(ws, 3, c1, label, {
      bold: true,
      fill: FILLS.header,
      wrap: true,
      sz: 8,
    });
    if (c1 !== c2) mg(ws, 3, c1, 3, c2);
  });

  /* ── incident register rows (grouped by area type) ── */
  const AREA_LABELS = {
    underground: "UNDERGROUND:",
    surface: "SURFACE:",
    property: "PROPERTY DAMAGE:",
    emergency: "EMERGENCY INCIDENT",
  };

  const byAreaType = {
    underground: [],
    surface: [],
    property: [],
    emergency: [],
  };
  recs.forEach((r) => {
    const areas = (r.areas || []).map((a) => a.toLowerCase());
    const isUG = areas.some(
      (a) =>
        a.includes("underground") ||
        a.includes("ug") ||
        a.includes("stope") ||
        a.includes("development") ||
        a.includes("raise") ||
        a.includes("ramp") ||
        a.includes("conveyor") ||
        a.includes("shaft") ||
        a.includes("cuddy") ||
        a.includes("crusher"),
    );
    const isPD = r.classes.includes("propertyDamage");
    const isEI = r.classes.includes("emergency");
    if (isPD) byAreaType.property.push(r);
    else if (isEI) byAreaType.emergency.push(r);
    else if (isUG) byAreaType.underground.push(r);
    else byAreaType.surface.push(r);
  });

  let curRow = 4;
  const regCols = [
    { src: "name", c1: 2, c2: 3 },
    { src: "cnUnit", c1: 4, c2: 4 },
    { src: "occupation", c1: 5, c2: 5 },
    { src: "classes", c1: 6, c2: 7 },
    { src: "areas", c1: 8, c2: 8 },
    { src: "level", c1: 9, c2: 9 },
    { src: "date", c1: 10, c2: 11 },
    { src: "time", c1: 12, c2: 13 },
    { src: "shift", c1: 14, c2: 14 },
    { src: "deptHead", c1: 15, c2: 15 },
    { src: "sectionHead", c1: 16, c2: 16 },
    { src: "supervisor", c1: 17, c2: 17 },
    { src: "nature", c1: 18, c2: 18 },
    { src: "activity", c1: 19, c2: 19 },
    { src: "inspector", c1: 20, c2: 21 },
    { src: "group", c1: 22, c2: 22 },
    { src: "department", c1: 23, c2: 24 },
    { src: "section", c1: 25, c2: 25 },
    { src: "recordedBy", c1: 26, c2: 26 },
  ];

  const writeGroup = (groupKey) => {
    cell(ws, curRow, 2, AREA_LABELS[groupKey], {
      bold: true,
      fill: FILLS.header,
      align: "left",
      sz: 9,
    });
    mg(ws, curRow, 2, curRow, 26);
    curRow += 1;

    const groupRecs = byAreaType[groupKey];
    if (groupRecs.length === 0) {
      cell(ws, curRow, 2, "— no incidents —", {
        italic: true,
        align: "left",
        fill: FILLS.label,
      });
      mg(ws, curRow, 2, curRow, 26);
      curRow += 1;
      return;
    }

    groupRecs.forEach((r, ri) => {
      const rowFill = ri % 2 === 0 ? FILLS.odd : FILLS.even;
      ws.getRow(curRow).height = 14;
      const getValue = (src) => {
        switch (src) {
          case "name":
            return r.name || "";
          case "cnUnit":
            return r.cnUnit || "";
          case "occupation":
            return r.occupation || "";
          case "classes":
            return (r.classes || []).join(", ");
          case "areas":
            return (r.areas || []).join(", ");
          case "level":
            return r.level || "";
          case "date":
            return r.date || "";
          case "time":
            return r.time || "";
          case "shift":
            return r.shift || "";
          case "deptHead":
            return r.deptHead || "";
          case "sectionHead":
            return r.sectionHead || "";
          case "supervisor":
            return r.supervisor || "";
          case "nature":
            return r.nature || "";
          case "activity":
            return r.activity || "";
          case "inspector":
            return r.inspector || "";
          case "group":
            return r.group || "";
          case "department":
            return r.department || "";
          case "section":
            return r.section || "";
          case "recordedBy":
            return r.recordedBy || "";
          default:
            return "";
        }
      };
      regCols.forEach(({ src, c1, c2 }) => {
        cell(ws, curRow, c1, getValue(src), {
          fill: rowFill,
          align: "left",
          sz: 8,
        });
        if (c1 !== c2) mg(ws, curRow, c1, curRow, c2);
      });
      curRow += 1;
    });
  };

  writeGroup("underground");
  writeGroup("surface");
  writeGroup("property");
  writeGroup("emergency");
  curRow += 1; // blank row

  /* ════════════ STATISTICS SECTION ════════════ */
  const agg = aggregateMonth(recs);
  const leftRows = agg.occupations;
  const rightRows = agg.mechanisms;
  const maxStatRows = Math.max(leftRows.length, rightRows.length, 1);

  const statsHeaderRow = curRow;
  ws.getRow(statsHeaderRow).height = 20;

  cell(ws, statsHeaderRow, 2, "Occupation/ Equipment", {
    bold: true,
    fill: FILLS.header,
    align: "left",
  });
  mg(ws, statsHeaderRow, 2, statsHeaderRow, 3);
  TCOLS.forEach((tc, i) => {
    cell(ws, statsHeaderRow, LC0 + i, tc.abbr, {
      bold: true,
      fill: FILLS.header,
    });
  });
  cell(ws, statsHeaderRow, LCT, "Total", { bold: true, fill: FILLS.total });
  cell(ws, statsHeaderRow, LCP, "% Distribution", {
    bold: true,
    fill: FILLS.header,
    wrap: true,
  });

  cell(ws, statsHeaderRow, 14, "Type of Incident", {
    bold: true,
    fill: FILLS.header,
    align: "left",
  });
  mg(ws, statsHeaderRow, 14, statsHeaderRow, 16);
  TCOLS.forEach((tc, i) => {
    cell(ws, statsHeaderRow, RC0 + i, tc.abbr, {
      bold: true,
      fill: FILLS.header,
    });
  });
  cell(ws, statsHeaderRow, RCT, "Total", { bold: true, fill: FILLS.total });
  cell(ws, statsHeaderRow, RCP, "% Distribution", {
    bold: true,
    fill: FILLS.header,
    wrap: true,
  });

  curRow += 1;
  const statsDataStart = curRow;

  for (let i = 0; i < maxStatRows; i++) {
    const r = curRow + i;
    const rowFill = i % 2 === 0 ? FILLS.odd : FILLS.even;
    if (i < leftRows.length) {
      const lr = leftRows[i];
      cell(ws, r, 2, lr.label, { fill: FILLS.label, align: "left" });
      mg(ws, r, 2, r, 3);
      lr.counts.forEach((n, ci) => {
        cell(ws, r, LC0 + ci, n > 0 ? n : null, { fill: rowFill });
      });
      cell(
        ws,
        r,
        LCT,
        { formula: `SUM(${cl(LC0)}${r}:${cl(LC0 + LCK - 1)}${r})` },
        { bold: true, fill: FILLS.total },
      );
    } else {
      mg(ws, r, 2, r, 3);
    }
    if (i < rightRows.length) {
      const rr = rightRows[i];
      cell(ws, r, 14, rr.label, { fill: FILLS.label, align: "left" });
      mg(ws, r, 14, r, 16);
      rr.counts.forEach((n, ci) => {
        cell(ws, r, RC0 + ci, n > 0 ? n : null, { fill: rowFill });
      });
      cell(
        ws,
        r,
        RCT,
        { formula: `SUM(${cl(RC0)}${r}:${cl(RC0 + LCK - 1)}${r})` },
        { bold: true, fill: FILLS.total },
      );
    } else {
      mg(ws, r, 14, r, 16);
    }
  }

  curRow += maxStatRows;
  const statsTotalRow = curRow;
  ws.getRow(statsTotalRow).height = 14;

  cell(ws, statsTotalRow, 2, "TOTAL", {
    bold: true,
    fill: FILLS.total,
    align: "right",
  });
  mg(ws, statsTotalRow, 2, statsTotalRow, 3);
  for (let ci = 0; ci < LCK; ci++) {
    const L = cl(LC0 + ci);
    cell(
      ws,
      statsTotalRow,
      LC0 + ci,
      { formula: `SUM(${L}${statsDataStart}:${L}${statsTotalRow - 1})` },
      { bold: true, fill: FILLS.total },
    );
  }
  cell(
    ws,
    statsTotalRow,
    LCT,
    {
      formula: `SUM(${cl(LCT)}${statsDataStart}:${cl(LCT)}${statsTotalRow - 1})`,
    },
    { bold: true, fill: FILLS.total },
  );
  cell(
    ws,
    statsTotalRow,
    LCP,
    {
      formula: `SUM(${cl(LCP)}${statsDataStart}:${cl(LCP)}${statsTotalRow - 1})`,
    },
    { bold: true, fill: FILLS.total, numFmt: "0.0%" },
  );

  cell(ws, statsTotalRow, 14, "TOTAL", {
    bold: true,
    fill: FILLS.total,
    align: "right",
  });
  mg(ws, statsTotalRow, 14, statsTotalRow, 16);
  for (let ci = 0; ci < LCK; ci++) {
    const L = cl(RC0 + ci);
    cell(
      ws,
      statsTotalRow,
      RC0 + ci,
      { formula: `SUM(${L}${statsDataStart}:${L}${statsTotalRow - 1})` },
      { bold: true, fill: FILLS.total },
    );
  }
  cell(
    ws,
    statsTotalRow,
    RCT,
    {
      formula: `SUM(${cl(RCT)}${statsDataStart}:${cl(RCT)}${statsTotalRow - 1})`,
    },
    { bold: true, fill: FILLS.total },
  );
  cell(
    ws,
    statsTotalRow,
    RCP,
    {
      formula: `SUM(${cl(RCP)}${statsDataStart}:${cl(RCP)}${statsTotalRow - 1})`,
    },
    { bold: true, fill: FILLS.total, numFmt: "0.0%" },
  );

  for (let i = 0; i < maxStatRows; i++) {
    const r = statsDataStart + i;
    if (i < leftRows.length)
      cell(
        ws,
        r,
        LCP,
        {
          formula: `IF(${cl(LCT)}${statsTotalRow}=0,0,${cl(LCT)}${r}/${cl(LCT)}${statsTotalRow})`,
        },
        { numFmt: "0.0%" },
      );
    if (i < rightRows.length)
      cell(
        ws,
        r,
        RCP,
        {
          formula: `IF(${cl(RCT)}${statsTotalRow}=0,0,${cl(RCT)}${r}/${cl(RCT)}${statsTotalRow})`,
        },
        { numFmt: "0.0%" },
      );
  }

  curRow += 2; // blank row

  /* ════════════ SHIFT / WORK PLACE SECTION ════════════ */
  const shiftRows = agg.shifts;
  const areaRows = agg.areas;
  const maxShiftRows = Math.max(shiftRows.length, areaRows.length, 1);

  const shiftHeaderRow = curRow;
  ws.getRow(shiftHeaderRow).height = 20;

  cell(ws, shiftHeaderRow, 2, "Shift of Incident", {
    bold: true,
    fill: FILLS.header,
    align: "left",
  });
  mg(ws, shiftHeaderRow, 2, shiftHeaderRow, 3);
  TCOLS.forEach((tc, i) => {
    cell(ws, shiftHeaderRow, LC0 + i, tc.abbr, {
      bold: true,
      fill: FILLS.header,
    });
  });
  cell(ws, shiftHeaderRow, LCT, "Total", { bold: true, fill: FILLS.total });
  cell(ws, shiftHeaderRow, LCP, "% Distribution", {
    bold: true,
    fill: FILLS.header,
    wrap: true,
  });

  cell(ws, shiftHeaderRow, 14, "Work Place / Area", {
    bold: true,
    fill: FILLS.header,
    align: "left",
  });
  mg(ws, shiftHeaderRow, 14, shiftHeaderRow, 16);
  TCOLS.forEach((tc, i) => {
    cell(ws, shiftHeaderRow, RC0 + i, tc.abbr, {
      bold: true,
      fill: FILLS.header,
    });
  });
  cell(ws, shiftHeaderRow, RCT, "Total", { bold: true, fill: FILLS.total });
  cell(ws, shiftHeaderRow, RCP, "% Distribution", {
    bold: true,
    fill: FILLS.header,
    wrap: true,
  });

  curRow += 1;
  const shiftDataStart = curRow;

  for (let i = 0; i < maxShiftRows; i++) {
    const r = curRow + i;
    const rowFill = i % 2 === 0 ? FILLS.odd : FILLS.even;
    if (i < shiftRows.length) {
      const sr = shiftRows[i];
      cell(ws, r, 2, sr.label, { fill: FILLS.label, align: "left" });
      mg(ws, r, 2, r, 3);
      sr.counts.forEach((n, ci) => {
        cell(ws, r, LC0 + ci, n > 0 ? n : null, { fill: rowFill });
      });
      cell(
        ws,
        r,
        LCT,
        { formula: `SUM(${cl(LC0)}${r}:${cl(LC0 + LCK - 1)}${r})` },
        { bold: true, fill: FILLS.total },
      );
    } else {
      mg(ws, r, 2, r, 3);
    }
    if (i < areaRows.length) {
      const ar = areaRows[i];
      cell(ws, r, 14, ar.label, { fill: FILLS.label, align: "left" });
      mg(ws, r, 14, r, 16);
      ar.counts.forEach((n, ci) => {
        cell(ws, r, RC0 + ci, n > 0 ? n : null, { fill: rowFill });
      });
      cell(
        ws,
        r,
        RCT,
        { formula: `SUM(${cl(RC0)}${r}:${cl(RC0 + LCK - 1)}${r})` },
        { bold: true, fill: FILLS.total },
      );
    } else {
      mg(ws, r, 14, r, 16);
    }
  }

  curRow += maxShiftRows;
  const shiftTotalRow = curRow;
  ws.getRow(shiftTotalRow).height = 14;

  cell(ws, shiftTotalRow, 2, "TOTAL", {
    bold: true,
    fill: FILLS.total,
    align: "right",
  });
  mg(ws, shiftTotalRow, 2, shiftTotalRow, 3);
  for (let ci = 0; ci < LCK; ci++) {
    const L = cl(LC0 + ci);
    cell(
      ws,
      shiftTotalRow,
      LC0 + ci,
      { formula: `SUM(${L}${shiftDataStart}:${L}${shiftTotalRow - 1})` },
      { bold: true, fill: FILLS.total },
    );
  }
  cell(
    ws,
    shiftTotalRow,
    LCT,
    {
      formula: `SUM(${cl(LCT)}${shiftDataStart}:${cl(LCT)}${shiftTotalRow - 1})`,
    },
    { bold: true, fill: FILLS.total },
  );
  cell(
    ws,
    shiftTotalRow,
    LCP,
    {
      formula: `SUM(${cl(LCP)}${shiftDataStart}:${cl(LCP)}${shiftTotalRow - 1})`,
    },
    { bold: true, fill: FILLS.total, numFmt: "0.0%" },
  );

  cell(ws, shiftTotalRow, 14, "TOTAL", {
    bold: true,
    fill: FILLS.total,
    align: "right",
  });
  mg(ws, shiftTotalRow, 14, shiftTotalRow, 16);
  for (let ci = 0; ci < LCK; ci++) {
    const L = cl(RC0 + ci);
    cell(
      ws,
      shiftTotalRow,
      RC0 + ci,
      { formula: `SUM(${L}${shiftDataStart}:${L}${shiftTotalRow - 1})` },
      { bold: true, fill: FILLS.total },
    );
  }
  cell(
    ws,
    shiftTotalRow,
    RCT,
    {
      formula: `SUM(${cl(RCT)}${shiftDataStart}:${cl(RCT)}${shiftTotalRow - 1})`,
    },
    { bold: true, fill: FILLS.total },
  );
  cell(
    ws,
    shiftTotalRow,
    RCP,
    {
      formula: `SUM(${cl(RCP)}${shiftDataStart}:${cl(RCP)}${shiftTotalRow - 1})`,
    },
    { bold: true, fill: FILLS.total, numFmt: "0.0%" },
  );

  for (let i = 0; i < maxShiftRows; i++) {
    const r = shiftDataStart + i;
    if (i < shiftRows.length)
      cell(
        ws,
        r,
        LCP,
        {
          formula: `IF(${cl(LCT)}${shiftTotalRow}=0,0,${cl(LCT)}${r}/${cl(LCT)}${shiftTotalRow})`,
        },
        { numFmt: "0.0%" },
      );
    if (i < areaRows.length)
      cell(
        ws,
        r,
        RCP,
        {
          formula: `IF(${cl(RCT)}${shiftTotalRow}=0,0,${cl(RCT)}${r}/${cl(RCT)}${shiftTotalRow})`,
        },
        { numFmt: "0.0%" },
      );
  }

  /* ════════════ INCIDENT DETAILS SECTION ════════════ */
  // This is the LAST thing in writeMonthSheet, after ALL stats and shift/area sections are done
  const detailsStartRow = shiftTotalRow + 3;
  writeIncidentDetailsSection(ws, recs, detailsStartRow);
} // ← END of writeMonthSheet

/* ═══════════════════════ public entry points ════════════════════════ */
export function buildWorkbook(kept, filters, skippedNoDate = 0) {
  const years = [...new Set(kept.map((r) => r.date.slice(0, 4)))].sort();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Accident & Incident Reports";
  wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };

  years.forEach((y) => {
    MONTHS.forEach((monthName, mi) => {
      const mm = String(mi + 1).padStart(2, "0");
      const monthRecs = kept.filter(
        (r) => r.date.slice(0, 4) === y && r.date.slice(5, 7) === mm,
      );
      if (monthRecs.length === 0) return;
      const sheetName =
        years.length > 1 ? `${monthName.slice(0, 3)} ${y}` : monthName;
      writeMonthSheet(wb, sheetName, mi, y, monthRecs, filters);
    });
  });

  return { wb, years };
}

function download(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportAmrExcel(filters) {
  const arr = (d) => (Array.isArray(d) ? d : []);

  // ── Step 1: fetch S1, S3, equipment in parallel ──
  const [s1, s3, eq] = await Promise.all([
    axios.get(`${config.baseApi}/accident/get-all-section1`),
    axios.get(`${config.baseApi}/accident/get-all-section3`),
    axios
      .get(`${config.baseApi}/accident/get-all-section46-equipment`)
      .catch(() => ({ data: [] })),
  ]);

  const ids = arr(s1.data).map((r) => r.accident_id);

  // ── Step 2: fetch S7 and S8 per ID (no bulk endpoint exists) ──
  const [s7Results, s8Results] = await Promise.all([
    Promise.allSettled(
      ids.map((id) =>
        axios
          .get(`${config.baseApi}/accident/get-section7-by-id`, {
            params: { accident_id: id },
          })
          .then((r) => (r.data ? { accident_id: id, ...r.data } : null))
          .catch(() => null),
      ),
    ),
    Promise.allSettled(
      ids.map((id) =>
        axios
          .get(`${config.baseApi}/accident/get-section8-by-id`, {
            params: { accident_id: id },
          })
          .then((r) => (r.data ? { accident_id: id, ...r.data } : null))
          .catch(() => null),
      ),
    ),
  ]);

  const s7 = {
    data: s7Results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value),
  };
  const s8 = {
    data: s8Results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value),
  };

  // ── Step 3: build records ──
  const records = buildRecords({
    section1: arr(s1.data),
    section3: arr(s3.data),
    equipment: arr(eq.data),
    section7: arr(s7.data),
    section8: arr(s8.data),
  });

  const { kept, skippedNoDate } = selectRecords(records, filters);
  if (kept.length === 0) {
    const note =
      skippedNoDate > 0
        ? ` (${skippedNoDate} record(s) excluded – missing dates)`
        : "";
    throw new Error(`No reports match the selected date filter.${note}`);
  }

  const { wb, years } = buildWorkbook(kept, filters, skippedNoDate);
  const buffer = await wb.xlsx.writeBuffer();
  download(buffer, filenameFor(filters, years));
  return { years, reports: kept.length };
}
