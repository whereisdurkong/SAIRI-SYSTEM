// /* ════════════════════════════════════════════════════════════════════════
//    dateFilter.jsx
//    Shared date-reported filter for the AMR report tabs.

//    - EMPTY_FILTERS / isFilterActive / matchesDateFilter: pure helpers used
//      by every report component.
//    - DateFilterBar: the UI (Year, From, To, Clear) rendered once in AMR.

//    Filters are compared against Section 1's `date_reported`.
//    ════════════════════════════════════════════════════════════════════════ */

// export const EMPTY_FILTERS = { year: "", dateFrom: "", dateTo: "" };

// /**
//  * Normalise whatever the API returns for a date into "YYYY-MM-DD".
//  * Plain dates are used as-is. Timestamps are converted to the viewer's local
//  * date, so the filter agrees with what formatDate() shows in the table.
//  */
// export const toYMD = (value) => {
//   if (!value) return "";
//   const str = String(value).trim();

//   // Already YYYY-MM-DD
//   if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

//   // ISO timestamp: "2026-09-01T14:10:00.000Z" → extract date part directly
//   // avoids timezone shifting the date by one day
//   if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0, 10);

//   // MM/DD/YYYY (PH locale from date pickers)
//   const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
//   if (mdyMatch) {
//     const [, mm, dd, yyyy] = mdyMatch;
//     return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
//   }

//   // Numeric Unix timestamp (milliseconds)
//   if (/^\d+$/.test(str)) {
//     const d = new Date(Number(str));
//     if (!isNaN(d.getTime())) {
//       const y = d.getFullYear();
//       const m = String(d.getMonth() + 1).padStart(2, "0");
//       const day = String(d.getDate()).padStart(2, "0");
//       return `${y}-${m}-${day}`;
//     }
//   }

//   // Last resort: let the browser parse it
//   const d = new Date(str);
//   if (isNaN(d.getTime())) return "";
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   const day = String(d.getDate()).padStart(2, "0");
//   return `${y}-${m}-${day}`;
// };

// export const isFilterActive = (filters) =>
//   !!(filters && (filters.year || filters.dateFrom || filters.dateTo));

// /**
//  * True when the report's date_reported passes every active filter
//  * (year, from and to are combined with AND).
//  * With no filter active everything passes; with a filter active, a report
//  * that has no usable date_reported is excluded.
//  */
// export const matchesDateFilter = (dateReported, filters) => {
//   if (!isFilterActive(filters)) return true;
//   const ymd = toYMD(dateReported);
//   if (!ymd) return false;
//   if (filters.year && ymd.slice(0, 4) !== String(filters.year)) return false;
//   if (filters.dateFrom && ymd < filters.dateFrom) return false;
//   if (filters.dateTo && ymd > filters.dateTo) return false;
//   return true;
// };

// /* ════════════════════════════════════════════════════════════════════════
//    FILTER BAR
//    ════════════════════════════════════════════════════════════════════════ */

// export function DateFilterBar({
//   filters,
//   onChange,
//   years = [],
//   compact = false,
// }) {
//   const set = (patch) => onChange({ ...filters, ...patch });

//   // Keep a selected year visible even if it's not in the fetched list.
//   const yearOptions =
//     filters.year && !years.includes(filters.year)
//       ? [filters.year, ...years].sort((a, b) => b.localeCompare(a))
//       : years;

//   return (
//     <div className={`df-bar${compact ? " df-bar--topbar" : ""}`}>
//       <style>{STYLE_SHEET}</style>

//       <span className="df-title">Date filter</span>

//       <div className="df-row">
//         <label className="df-field">
//           <span className="df-label">Year</span>
//           <select
//             className="df-input"
//             value={filters.year}
//             onChange={(e) => set({ year: e.target.value })}
//           >
//             <option value="">All years</option>
//             {yearOptions.map((y) => (
//               <option key={y} value={y}>
//                 {y}
//               </option>
//             ))}
//           </select>
//         </label>

//         <label className="df-field">
//           <span className="df-label">From</span>
//           <input
//             type="date"
//             className="df-input"
//             value={filters.dateFrom}
//             max={filters.dateTo || undefined}
//             onChange={(e) => set({ dateFrom: e.target.value })}
//           />
//         </label>

//         <label className="df-field">
//           <span className="df-label">To</span>
//           <input
//             type="date"
//             className="df-input"
//             value={filters.dateTo}
//             min={filters.dateFrom || undefined}
//             onChange={(e) => set({ dateTo: e.target.value })}
//           />
//         </label>

//         {/* Only shown once a year, From date or To date has been picked */}
//         {isFilterActive(filters) && (
//           <button
//             type="button"
//             className="df-clear"
//             onClick={() => onChange(EMPTY_FILTERS)}
//           >
//             Clear
//           </button>
//         )}
//       </div>

//       {!compact && (
//         <span className="df-hint">
//           Applies to every tab, using the Section 1 date reported.
//         </span>
//       )}
//     </div>
//   );
// }

// /* ════════════════════════════════════════════════════════════════════════
//    STYLESHEET
//    ════════════════════════════════════════════════════════════════════════ */

// const STYLE_SHEET = `
// .df-bar {
//   display: flex;
//   flex-wrap: wrap;
//   align-items: flex-end;
//   gap: 12px 16px;
//   padding: 12px 16px;
//   margin: 0 16px 4px;
//   background: #fff;
//   border: 1px solid #C8D8D1;
//   border-radius: 8px;
//   font-family: 'Inter', sans-serif;
//   color: #0D1B2A;
// }
// .df-title {
//   align-self: start;
//   font-size: 13px;
//   font-weight: 600;
//   margin-right: 4px;
// }
// .df-field { display: flex; flex-direction: column; gap: 4px; }
// .df-label { font-size: 11.5px; font-weight: 600; color: #5E7A6E; }
// .df-input {
//   height: 34px;
//   padding: 0 10px;
//   border: 1.5px solid #9DBCB0;
//   border-radius: 7px;
//   font-size: 13px;
//   font-family: inherit;
//   background: #fff;
//   color: #0D1B2A;
//   outline: none;
//   transition: border-color 0.15s, box-shadow 0.15s;
// }
// .df-input:focus {
//   border-color: #1B5E44;
//   box-shadow: 0 0 0 3px rgba(27,94,68,0.12);
// }
// .df-clear {
//   height: 34px;
//   padding: 0 14px;
//   border: 1.5px solid #9DBCB0;
//   border-radius: 7px;
//   background: #fff;
//   color: #1B5E44;
//   font-family: inherit;
//   font-size: 12.5px;
//   font-weight: 600;
//   cursor: pointer;
//   transition: background 0.13s, border-color 0.13s;
// }
// .df-clear:hover { background: #D4EDE5; border-color: #1B5E44; }
// .df-clear:focus-visible { outline: 2px solid #1B8C60; outline-offset: 2px; }
// .df-hint {
//   align-self: center;
//   margin-left: auto;
//   font-size: 11.5px;
//   color: #5E7A6E;
// }

// @media (max-width: 640px) {
//   .df-bar { margin: 0 4px 4px; padding: 12px; }
//   .df-field { flex: 1 1 130px; }
//   .df-input { width: 100%; }
//   .df-hint { margin-left: 0; width: 100%; }
// }

// /* ── Compact variant for the dark top bar ── */
// .df-bar--topbar {
//   margin: 0;
//   padding: 0;
//   background: transparent;
//   border: none;
//   border-radius: 0;
//   gap: 10px 12px;
//   color: #E8F4EF;
// }
// .df-bar--topbar .df-title { font-size: 12px; color: #8AA4B8; margin-right: 0; }
// .df-bar--topbar .df-label { font-size: 10.5px; color: #8AA4B8; }
// .df-bar--topbar .df-input {
//   height: 30px;
//   padding: 0 8px;
//   font-size: 12px;
//   border: 1px solid rgba(255,255,255,0.14);
//   border-radius: 6px;
//   background: rgba(255,255,255,0.06);
//   color: #E8F4EF;
//   color-scheme: dark;
// }
// .df-bar--topbar select.df-input option { background: #0D1B2A; color: #E8F4EF; }
// .df-bar--topbar .df-input:focus {
//   border-color: #1B8C60;
//   box-shadow: 0 0 0 3px rgba(27,140,96,0.25);
// }
// .df-bar--topbar .df-clear {
//   height: 30px;
//   padding: 0 12px;
//   border: 2px solid rgba(255,255,255,0.14);
//   border-radius: 6px;
//   background: transparent;
//   color: #8AA4B8;
//   font-size: 12px;
// }
// .df-bar--topbar .df-clear:hover { border-color: rgba(255,255,255,0.35); color: #fff; background: #086100; }

// /* Labels sit beside their fields, everything centered on one line */
// .df-bar--topbar { align-items: center; flex-wrap: wrap; gap: 8px 16px; }
// .df-bar--topbar .df-title { font-weight: 600; color: #E8F4EF; font-size: 12.5px; }
// .df-bar--topbar .df-field { flex-direction: row; align-items: center; gap: 6px; }
// .df-bar--topbar .df-label { font-size: 12px; color: #8AA4B8; white-space: nowrap; }
// .df-bar--topbar .df-label::after { content: ":"; }

// /* Title on top, fields on the row below */
// .df-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 16px; }
// .df-bar--topbar { flex-direction: column; align-items: flex-start; flex-wrap: nowrap; gap: 6px; }
// .df-bar--topbar .df-row { align-items: center; gap: 8px 16px; }

// /* Alignment fix: the app's global styles can add margins to <label>/<button>,
//    which pushed the Clear button below the inputs. Reset them and lock heights. */
// .df-bar .df-field,
// .df-bar .df-label,
// .df-bar .df-title,
// .df-bar .df-input,
// .df-bar .df-clear { margin: 0; }
// .df-bar--topbar .df-input,
// .df-bar--topbar .df-clear {
//   box-sizing: border-box;
//   height: 30px;
//   line-height: 1.2;
// }
// .df-bar--topbar .df-clear { align-self: center; display: inline-flex; align-items: center; }

// @media (max-width: 640px) {
//   .df-bar--topbar { margin: 0; padding: 0; width: 100%; }
//   .df-bar--topbar .df-field { flex: 1 1 140px; }
//   .df-bar--topbar .df-field .df-input { flex: 1; min-width: 0; }
// }
// `;
/* ════════════════════════════════════════════════════════════════════════
   dateFilter.jsx
   Shared date-reported filter for the AMR report tabs.

   - EMPTY_FILTERS / isFilterActive / matchesDateFilter: pure helpers used
     by every report component.
   - DateFilterBar: the UI (Year, Month, From, To, Clear) rendered once in AMR.

   Filters are compared against Section 1's `date_reported`.
   ════════════════════════════════════════════════════════════════════════ */
export const EMPTY_FILTERS = { year: "", month: "", dateFrom: "", dateTo: "" };

const MONTH_FULL_NAMES = [
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

/**
 * Normalise whatever the API returns for a date into "YYYY-MM-DD".
 * Plain dates are used as-is. Timestamps are converted to the viewer's local
 * date, so the filter agrees with what formatDate() shows in the table.
 */
export const toYMD = (value) => {
  if (!value) return "";
  const str = String(value).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // ISO timestamp: "2026-09-01T14:10:00.000Z" → extract date part directly
  // avoids timezone shifting the date by one day
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0, 10);

  // MM/DD/YYYY (PH locale from date pickers)
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const [, mm, dd, yyyy] = mdyMatch;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Numeric Unix timestamp (milliseconds)
  if (/^\d+$/.test(str)) {
    const d = new Date(Number(str));
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }

  // Last resort: let the browser parse it
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const isFilterActive = (filters) =>
  !!(
    filters &&
    (filters.year || filters.month || filters.dateFrom || filters.dateTo)
  );

/**
 * True when the report's date_reported passes every active filter
 * (year, month, from and to are combined with AND).
 * With no filter active everything passes; with a filter active, a report
 * that has no usable date_reported is excluded.
 */
export const matchesDateFilter = (dateReported, filters) => {
  if (!isFilterActive(filters)) return true;
  const ymd = toYMD(dateReported);
  if (!ymd) return false;
  if (filters.year && ymd.slice(0, 4) !== String(filters.year)) return false;
  if (
    filters.month &&
    ymd.slice(5, 7) !== String(filters.month).padStart(2, "0")
  )
    return false;
  if (filters.dateFrom && ymd < filters.dateFrom) return false;
  if (filters.dateTo && ymd > filters.dateTo) return false;
  return true;
};

/* ════════════════════════════════════════════════════════════════════════
   FILTER BAR
   ════════════════════════════════════════════════════════════════════════ */

const MONTH_NAMES = [
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

export function DateFilterBar({
  filters,
  onChange,
  years = [],
  months = [],
  compact = false,
}) {
  const set = (patch) => onChange({ ...filters, ...patch });

  // Keep a selected year visible even if it's not in the fetched list.
  const yearOptions =
    filters.year && !years.includes(filters.year)
      ? [filters.year, ...years].sort((a, b) => b.localeCompare(a))
      : years;

  return (
    <div className={`df-bar${compact ? " df-bar--topbar" : ""}`}>
      <style>{STYLE_SHEET}</style>

      <span className="df-title">Date filter</span>

      <div className="df-row">
        {/* ── Year ── */}
        <label className="df-field">
          <span className="df-label">Year</span>
          <select
            className="df-input"
            value={filters.year}
            onChange={(e) => set({ year: e.target.value })}
          >
            <option value="">All years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {/* ── Month ── */}
        <label className="df-field">
          <span className="df-label">Month</span>
          <select
            className="df-input"
            value={filters.month}
            onChange={(e) => set({ month: e.target.value })}
          >
            <option value="">All months</option>
            {months.map((m) => (
              <option key={m} value={Number(m)}>
                {MONTH_FULL_NAMES[Number(m) - 1]}
              </option>
            ))}
          </select>
        </label>

        {/* ── From ── */}
        <label className="df-field">
          <span className="df-label">From</span>
          <input
            type="date"
            className="df-input"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => set({ dateFrom: e.target.value })}
          />
        </label>

        {/* ── To ── */}
        <label className="df-field">
          <span className="df-label">To</span>
          <input
            type="date"
            className="df-input"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => set({ dateTo: e.target.value })}
          />
        </label>

        {/* Only shown once a year, month, From date or To date has been picked */}
        {isFilterActive(filters) && (
          <button
            type="button"
            className="df-clear"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Clear
          </button>
        )}
      </div>

      {!compact && (
        <span className="df-hint">
          Applies to every tab, using the Section 1 date reported.
        </span>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_SHEET = `
.df-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
  padding: 12px 16px;
  margin: 0 16px 4px;
  background: #fff;
  border: 1px solid #C8D8D1;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  color: #0D1B2A;
}
.df-title {
  align-self: start;
  font-size: 13px;
  font-weight: 600;
  margin-right: 4px;
}
.df-field { display: flex; flex-direction: column; gap: 4px; }
.df-label { font-size: 11.5px; font-weight: 600; color: #5E7A6E; }
.df-input {
  height: 34px;
  padding: 0 10px;
  border: 1.5px solid #9DBCB0;
  border-radius: 7px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  color: #0D1B2A;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.df-input:focus {
  border-color: #1B5E44;
  box-shadow: 0 0 0 3px rgba(27,94,68,0.12);
}
.df-clear {
  height: 34px;
  padding: 0 14px;
  border: 1.5px solid #9DBCB0;
  border-radius: 7px;
  background: #fff;
  color: #1B5E44;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.13s, border-color 0.13s;
}
.df-clear:hover { background: #D4EDE5; border-color: #1B5E44; }
.df-clear:focus-visible { outline: 2px solid #1B8C60; outline-offset: 2px; }
.df-hint {
  align-self: center;
  margin-left: auto;
  font-size: 11.5px;
  color: #5E7A6E;
}

@media (max-width: 640px) {
  .df-bar { margin: 0 4px 4px; padding: 12px; }
  .df-field { flex: 1 1 130px; }
  .df-input { width: 100%; }
  .df-hint { margin-left: 0; width: 100%; }
}

/* ── Compact variant for the dark top bar ── */
.df-bar--topbar {
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  gap: 10px 12px;
  color: #E8F4EF;
}
.df-bar--topbar .df-title { font-size: 12px; color: #8AA4B8; margin-right: 0; }
.df-bar--topbar .df-label { font-size: 10.5px; color: #8AA4B8; }
.df-bar--topbar .df-input {
  height: 30px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 6px;
  background: rgba(255,255,255,0.06);
  color: #E8F4EF;
  color-scheme: dark;
}
.df-bar--topbar select.df-input option { background: #0D1B2A; color: #E8F4EF; }
.df-bar--topbar .df-input:focus {
  border-color: #1B8C60;
  box-shadow: 0 0 0 3px rgba(27,140,96,0.25);
}
.df-bar--topbar .df-clear {
  height: 30px;
  padding: 0 12px;
  border: 2px solid rgba(255,255,255,0.14);
  border-radius: 6px;
  background: transparent;
  color: #8AA4B8;
  font-size: 12px;
}
.df-bar--topbar .df-clear:hover { border-color: rgba(255,255,255,0.35); color: #fff; background: #086100; }

/* Labels sit beside their fields, everything centered on one line */
.df-bar--topbar { align-items: center; flex-wrap: wrap; gap: 8px 16px; }
.df-bar--topbar .df-title { font-weight: 600; color: #E8F4EF; font-size: 12.5px; }
.df-bar--topbar .df-field { flex-direction: row; align-items: center; gap: 6px; }
.df-bar--topbar .df-label { font-size: 12px; color: #8AA4B8; white-space: nowrap; }
.df-bar--topbar .df-label::after { content: ":"; }

/* Title on top, fields on the row below */
.df-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 16px; }
.df-bar--topbar { flex-direction: column; align-items: flex-start; flex-wrap: nowrap; gap: 6px; }
.df-bar--topbar .df-row { align-items: center; gap: 8px 16px; }

/* Alignment fix: the app's global styles can add margins to <label>/<button>,
   which pushed the Clear button below the inputs. Reset them and lock heights. */
.df-bar .df-field,
.df-bar .df-label,
.df-bar .df-title,
.df-bar .df-input,
.df-bar .df-clear { margin: 0; }
.df-bar--topbar .df-input
.df-bar--topbar .df-clear {
  box-sizing: border-box;
  height: 30px;
  line-height: 1.2;
}
.df-bar--topbar .df-clear { align-self: center; display: inline-flex; align-items: center; }

@media (max-width: 640px) {
  .df-bar--topbar { margin: 0; padding: 0; width: 100%; }
  .df-bar--topbar .df-field { flex: 1 1 140px; }
  .df-bar--topbar .df-field .df-input { flex: 1; min-width: 0; }
}
`;
