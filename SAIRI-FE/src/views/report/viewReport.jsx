import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import config from "config";
import { useNotification } from "components/Safetynotification.jsx";
import LoadingSpinner from "components/LoadingComponent";
import AuditLogPanel from "components/auditLogPanel";
import SafetyAlertModal from "components/alertModal";

/* ════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════════════ */

const WORKING_AREAS_COL1 = [
  "Breast Hole",
  "Cuddy",
  "Chute",
  "Change Room",
  "Compressor",
];
const WORKING_AREAS_COL2 = [
  "Development",
  "Hoist Room",
  "Mainline",
  "Magazine (Bodega)",
  "Mill Area",
];
const WORKING_AREAS_COL3 = [
  "Office",
  "Raise",
  "Rock Drill Machine (RDM) Repair Shop",
  "Shaft Station",
  "Sill Out",
];
const WORKING_AREAS_COL4 = [
  "Tailings Storage Facility (TSF)",
  "Washing Bay",
  "Warehouse",
];

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === "";
const isFutureDate = (d) => {
  if (!d) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return new Date(d) > today;
};
const toYesNo = (val) =>
  ["1", 1, true, "true", "YES", "yes"].includes(val) ? "YES" : "NO";
const isValidNumber = (v) =>
  v !== "" && v !== null && v !== undefined && !isNaN(Number(v));

const toTimeInputValue = (val) => {
  if (!val) return "";
  const str = String(val).trim();

  // Already HH:MM or HH:MM:SS
  const plainTimeMatch = str.match(/^(\d{2}):(\d{2})(:\d{2})?/);
  if (plainTimeMatch && !str.includes("T") && str.length <= 12) {
    return `${plainTimeMatch[1]}:${plainTimeMatch[2]}`;
  }

  // Full ISO datetime, e.g. "1970-01-01T14:30:00.000Z" or "2025-08-07 14:30:00"
  const isoMatch =
    str.match(/T(\d{2}):(\d{2})/) || str.match(/\s(\d{2}):(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;

  // Fallback: try Date parsing
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  } catch {
    /* noop */
  }

  return "";
};

const toLocalDatetimeInputValue = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const parseArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(",").filter((v) => v.trim());
    }
  }
  return [];
};

const fromCSV = (str) => {
  if (!str) return [];
  // Use pipe if present (new format), fall back to comma (legacy)
  const delimiter = str.includes("|") ? "|" : ",";
  return str
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
};

const NATURE_OF_INJURY_VALUES = [
  "Disease",
  "Amputation",
  "Digestive System",
  "Skin",
  "Infectious or Parasitic",
  "Musculoskeletal System",
  "Nervous System",
  "Circulatory System",
  "Respiratory System",
  "Fracture",
  "Nerves or Spinal Cord",
  "Superficial Injury",
  "Bruising or Crushing",
  "Dislocation",
  "Head Injury",
  "Open Wound",
  "Tumor (Malignant or Benign)",
  "Burns",
  "Fatal (Nature)",
  "Internal Injury of Trunk",
  "Poisoning or Toxic Effect",
  "Foreign Body",
  "Mental Disorder",
  "Fracture of Spine",
  "Multiple Injuries",
  "Sprain or Strain",
  "Others (Nature)",
];
const MECHANISM_OF_INJURY_VALUES = [
  "Struck Against",
  "Struck By (Hit by a moving object)",
  "Fall to lower level",
  "Fall on the same level (Slip & Fall/ Trip over)",
  "Caught In (Pinch/ Nip point)",
  "Caught On (Snug/ Hung)",
  "Caught between or under",
  "Pinned between or under",
  "Over stress or Overexertion",
  "Motor Vehicle Accidents",
  "Other (Mechanism)",
];
const CONTACT_EXPOSURE_VALUES = [
  "Biological Factors",
  "Mental Stress Factors",
  "Chemical/Substance (Short Term)",
  "Chemical/Substance (Long Term)",
  "Noise (Sudden/Sharp)",
  "Noise (Long Term)",
  "COLD",
  "HOT",
  "Pressure",
  "Electricity",
  "Radiation",
  "Other (Contact)",
];
const AGENCY_OF_INJURY_VALUES = [
  "Rock or Debris",
  "Virus or Bacteria",
  "Mobile Equipment",
  "Non-Mobile Equipment",
  "Powered equipment, tools or appliances",
  "Environmental Exposure (e.g., dust, gas, chemicals)",
  "Other (Agency)",
];
const PARTS_BODY_INJURED_VALUES = [
  "Eye",
  "Shoulders and Arms",
  "Ear",
  "Hands and Fingers",
  "Face",
  "Hips and Legs",
  "Head",
  "Feet and Toes",
  "Neck",
  "Internal Organs",
  "Back",
  "Multiple Locations",
  "Trunk",
  "Others (Body)",
];
function splitCsvWithOther(raw, knownValues, forceDelimiter) {
  if (!raw) return { selected: [], otherText: "" };

  const delimiter = forceDelimiter
    ? forceDelimiter
    : raw.includes("|")
      ? "|"
      : ",";

  const values = raw
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
  const selected = values.filter((v) => knownValues.includes(v));
  const otherText = values.filter((v) => !knownValues.includes(v)).join(", ");
  return { selected, otherText };
}

function splitUnsafeActs(raw) {
  const values = fromCSV(raw);
  const selected = [];
  let sopOther = "";
  let trafficOther = "";
  let other = "";
  values.forEach((v) => {
    if (UNSAFE_ACTS.includes(v)) {
      selected.push(v);
    } else if (v.startsWith("Not following SOP: ")) {
      sopOther = v.slice("Not following SOP: ".length);
    } else if (v.startsWith("Not following Traffic Rules: ")) {
      trafficOther = v.slice("Not following Traffic Rules: ".length);
    } else {
      other = other ? `${other}, ${v}` : v;
    }
  });
  return { selected, sopOther, trafficOther, other };
}

const getWorkingAreas = (data) => {
  const allWorkingAreas = [
    ...WORKING_AREAS_COL1,
    ...WORKING_AREAS_COL2,
    ...WORKING_AREAS_COL3,
    ...WORKING_AREAS_COL4,
  ];

  if (typeof data?.working_area === "string" && data.working_area.trim()) {
    const values = data.working_area
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const matched = [];
    const otherValues = [];
    values.forEach((val) => {
      if (allWorkingAreas.includes(val)) matched.push(val);
      else otherValues.push(val);
    });
    return { matched, other: otherValues.join(", ") || null };
  }

  const parsed = parseArray(data?.workingAreas);
  if (parsed.length > 0) {
    const matched = [];
    let other = null;
    parsed.forEach((val) => {
      if (allWorkingAreas.includes(val)) matched.push(val);
      else other = val;
    });
    return { matched, other };
  }

  return { matched: [], other: null };
};

const hasAnyErrors = (errObj) => {
  if (!errObj) return false;
  for (const k in errObj) {
    const v = errObj[k];
    if (v && typeof v === "object") {
      // recursively check nested error objects
      if (hasAnyErrors(v)) return true;
    } else if (v) return true;
  }
  return false;
};

/* ════════════════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════ */

function Req() {
  return <span className="sr-req">＊</span>;
}

function ErrorText({ msg }) {
  if (!msg) return null;
  return <div className="sr-error-text">{msg}</div>;
}

function Plate({ code, title, note }) {
  return (
    <div className="sr-plate">
      <span className="sr-plate-code">{code}</span>
      <span className="sr-plate-title">{title}</span>
      {note && <span className="sr-plate-note">{note}</span>}
    </div>
  );
}

function Panel({ title, error, children, span }) {
  return (
    <div className={`sr-panel${span ? ` sr-panel--${span}` : ""}`}>
      {title && (
        <div className="sr-panel-title">
          {title}
          {error && <ErrorText msg={error} />}
        </div>
      )}
      <div className="sr-panel-body">{children}</div>
    </div>
  );
}

function Field({ label, required, error, children, hint }) {
  return (
    <label className="sr-field">
      {label && (
        <span className="sr-label">
          {label}
          {required && <Req />}
        </span>
      )}
      {children}
      {hint && <span className="sr-hint">{hint}</span>}
      <ErrorText msg={error} />
    </label>
  );
}

function TextInput({ error, ...props }) {
  return (
    <input className={`sr-input${error ? " sr-input--err" : ""}`} {...props} />
  );
}

function TextArea({ error, ...props }) {
  return (
    <textarea
      className={`sr-textarea${error ? " sr-input--err" : ""}`}
      {...props}
    />
  );
}

function Check({ checked, onChange, label, disabled }) {
  return (
    <label className={`sr-check${disabled ? " sr-check--disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="sr-check-box" />
      <span className="sr-check-label">{label}</span>
    </label>
  );
}

function Radio({ checked, onChange, name, label, desc, disabled }) {
  return (
    <label
      className={`sr-radio${desc ? " sr-radio--desc" : ""}${disabled ? " sr-radio--disabled" : ""}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="sr-radio-dot" />
      <span className="sr-radio-text">
        <span className="sr-radio-label">{label}</span>
        {desc && <span className="sr-radio-desc">{desc}</span>}
      </span>
    </label>
  );
}

function Select({ error, children, ...props }) {
  return (
    <select
      className={`sr-input sr-select${error ? " sr-input--err" : ""}`}
      {...props}
    >
      {children}
    </select>
  );
}

function OtherInput({
  checked,
  onToggle,
  value,
  onChange,
  error,
  label = "Other",
  disabled,
}) {
  return (
    <div className="sr-other">
      <Check
        checked={checked}
        onChange={onToggle}
        label={`${label}:`}
        disabled={disabled}
      />
      <input
        className={`sr-other-input...`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      <ErrorText msg={error} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 1-2 — GENERAL INFORMATION & PARTICIPANTS
   ════════════════════════════════════════════════════════════════════════ */

let participantIdCounter = 1;
const makeParticipant = (p = {}) => ({
  id: participantIdCounter++,
  name: p.name || "",
  department: p.department || "",
  involvementType: p.involvementType || "",
});

// Builds an editable form1 object out of the fetched (read-only) section1Data row
function makeSection1(d) {
  if (!d) return null;

  const { matched: matchedWorkingAreas, other: otherWorkingArea } =
    getWorkingAreas(d);

  let subtypes = [];
  try {
    const raw =
      d.subtypes ??
      d.accident_incident_subtype ??
      d.subtype ??
      d.incident_subtype ??
      "";
    if (typeof raw === "string") {
      subtypes = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (Array.isArray(raw)) {
      subtypes = raw.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    subtypes = [];
  }

  let participants = [];
  try {
    if (typeof d.participants === "string")
      participants = JSON.parse(d.participants);
    else if (Array.isArray(d.participants)) participants = d.participants;
  } catch {
    participants = [];
  }

  return {
    goverment_notification_required:
      d.goverment_notification_required === true
        ? "YES"
        : d.goverment_notification_required === false
          ? "NO"
          : "",
    data_for: d.data_for || "",
    work_related: d.work_related || "",
    accident_incident_subtype: subtypes,
    employer: d.employer || "",
    name: d.name || "",
    chapa_number: d.chapa_number || "",
    job_designation: d.job_designation || "",
    date_of_event: d.date_of_event ? String(d.date_of_event).slice(0, 10) : "",
    time_of_event: d.time_of_event ? toTimeInputValue(d.time_of_event) : "",
    shift: d.shift || "",
    date_reported: d.date_reported ? String(d.date_reported).slice(0, 10) : "",
    time_reported: d.time_reported ? toTimeInputValue(d.time_reported) : "",
    location: d.location || "",
    specific_location: d.specific_location || "",
    level: d.level || "",
    reported_by: d.reported_by || "",
    supervisor_reported_to: d.supervisor_reported_to || "",
    group: d.group || "",
    department: d.department || "",
    section: d.section || "",
    date_hired: d.date_hired ? String(d.date_hired).slice(0, 10) : "",
    date_of_birth: d.date_of_birth ? String(d.date_of_birth).slice(0, 10) : "",
    age: d.age || "",
    home_address: d.home_address || "",
    status: d.status || "",
    number_of_dependents: d.number_of_dependents || "",
    length_of_service: d.length_of_service || "",
    expereince_at_occupation: d.expereince_at_occupation || "",
    workingAreas: matchedWorkingAreas,
    othersAreaChecked: !!otherWorkingArea || !!d.others_area,
    others_area: otherWorkingArea || d.others_area || "",
    incident_accident_brief_description:
      d.incident_accident_brief_description || "",
    immediate_actions_taken: d.immediate_actions_taken || "",
    participants: participants.map((p) => makeParticipant(p)),
    prepared_by: d.prepared_by || "",
    date_and_time: d.date_and_time
      ? toLocalDatetimeInputValue(d.date_and_time)
      : "",
    immediate_supervisor: d.immediate_supervisor || "",
    group_head: d.group_head || "",
    department_head: d.department_head || "",
    section_head: d.section_head || "",
  };
}

function validateSection1(form) {
  const errors = { participants: {} };
  if (!form) return errors;
  if (isEmpty(form.goverment_notification_required))
    errors.goverment_notification_required =
      "Please indicate whether government notification is required.";
  if (isEmpty(form.data_for)) errors.data_for = "Data For is required.";
  if (isEmpty(form.work_related))
    errors.work_related = "Work Related is required.";
  if (form.accident_incident_subtype.length === 0)
    errors.accident_incident_subtype = "Select or add at least one subtype.";
  if (isEmpty(form.employer)) errors.employer = "Employer is required.";
  if (isEmpty(form.name)) errors.name = "Name is required.";
  if (isEmpty(form.chapa_number))
    errors.chapa_number = "Chapa No. is required.";
  if (isEmpty(form.job_designation))
    errors.job_designation = "Job designation is required.";
  if (isEmpty(form.date_of_event))
    errors.date_of_event = "Date of event is required.";
  else if (isFutureDate(form.date_of_event))
    errors.date_of_event = "Cannot be in the future.";
  if (isEmpty(form.time_of_event))
    errors.time_of_event = "Time of event is required.";
  if (isEmpty(form.shift)) errors.shift = "Shift is required.";
  if (isEmpty(form.date_reported))
    errors.date_reported = "Date reported is required.";
  if (isEmpty(form.time_reported))
    errors.time_reported = "Time reported is required.";
  if (isEmpty(form.location)) errors.location = "Location is required.";
  if (isEmpty(form.specific_location))
    errors.specific_location = "Specific location is required.";
  if (isEmpty(form.level)) errors.level = "Level is required.";
  if (isEmpty(form.reported_by))
    errors.reported_by = "Reported by is required.";
  if (isEmpty(form.section_head))
    errors.section_head = "Section Head to is required.";
  if (isEmpty(form.supervisor_reported_to))
    errors.supervisor_reported_to = "Supervisor reported to is required.";
  if (isEmpty(form.group)) errors.group = "Group is required.";
  if (isEmpty(form.department)) errors.department = "Department is required.";
  if (isEmpty(form.section)) errors.section = "Section is required.";
  if (isEmpty(form.group_head)) errors.group_head = "Group head is required.";
  if (isEmpty(form.department_head))
    errors.department_head = "Department head is required.";
  if (isEmpty(form.date_hired)) errors.date_hired = "Date hired is required.";
  if (isEmpty(form.date_of_birth))
    errors.date_of_birth = "Date of birth is required.";
  if (isEmpty(form.age) || !isValidNumber(form.age))
    errors.age = "Valid age is required.";
  if (isEmpty(form.home_address))
    errors.home_address = "Home address is required.";
  if (isEmpty(form.status)) errors.status = "Status is required.";
  if (
    isEmpty(form.number_of_dependents) ||
    !isValidNumber(form.number_of_dependents)
  )
    errors.number_of_dependents = "Valid number is required.";
  if (isEmpty(form.length_of_service))
    errors.length_of_service = "Length of service is required.";
  if (isEmpty(form.expereince_at_occupation))
    errors.expereince_at_occupation = "Experience at occupation is required.";
  if (form.workingAreas.length === 0 && !form.othersAreaChecked)
    errors.workingAreas = "Select at least one working area.";
  if (form.othersAreaChecked && isEmpty(form.others_area))
    errors.others_area = "Please specify the other working area.";
  if (isEmpty(form.incident_accident_brief_description))
    errors.incident_accident_brief_description =
      "Brief description is required.";
  if (isEmpty(form.immediate_actions_taken))
    errors.immediate_actions_taken = "Immediate actions taken is required.";
  form.participants.forEach((p) => {
    const hasAny = p.name || p.department || p.involvementType;
    if (hasAny) {
      const rowErr = {};
      if (isEmpty(p.name)) rowErr.name = "Required";
      if (isEmpty(p.department)) rowErr.department = "Required";
      if (isEmpty(p.involvementType)) rowErr.involvementType = "Required";
      if (Object.keys(rowErr).length) errors.participants[p.id] = rowErr;
    }
  });
  if (isEmpty(form.prepared_by))
    errors.prepared_by = "Prepared by is required.";
  if (isEmpty(form.immediate_supervisor))
    errors.immediate_supervisor = "Immediate Supervisor on Duty is required.";
  if (isEmpty(form.date_and_time))
    errors.date_and_time = "Date & time is required.";
  return errors;
}

const ACCIDENT_SUBTYPES = [
  {
    value: "Injury-LTA-F",
    label: "Injury - Lost Time Accident - Fatal Accident (LTA-F)",
  },
  {
    value: "Injury-LTA-NF",
    label: "Injury - Lost Time Accident - Non-Fatal Accident (LTA-NF)",
  },
  { value: "Injury-NLTA", label: "Injury - Non-Loss Time Accident (NLTA)" },
  { value: "Injury-FAC", label: "Injury - First Aid Case (FAC)" },
  { value: "OI", label: "Occupational Illness (OI)" },
  { value: "Property Damage", label: "Property Damage (PD)" },
  { value: "Near Miss", label: "Near Miss (NM)" },
];

const INVOLVEMENT_TYPES = [
  "Witness",
  "Injured Person",
  "First Responder",
  "Supervisor",
  "Other",
];

const isNotOic = (u) =>
  u.is_oic === "0" ||
  u.is_oic === 0 ||
  u.is_oic === null ||
  u.is_oic === undefined ||
  u.is_oic === "";

function ComboBox({ value, onChange, options, error, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        className={`sr-input sr-combobox${error ? " sr-input--err" : ""}${disabled ? " sr-combobox--disabled" : ""}`}
        value={disabled ? "" : query}
        placeholder={placeholder || "— Select or type —"}
        disabled={disabled}
        onChange={(e) => {
          if (disabled) return;
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
      />
      {open && !disabled && (
        <div className="sr-combo-drop">
          {filtered.length > 0 ? (
            filtered.map((o) => (
              <div
                key={o}
                className={`sr-combo-opt${o === value ? " sr-combo-opt--active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o);
                  setQuery(o);
                  setOpen(false);
                }}
              >
                {o}
              </div>
            ))
          ) : (
            <div className="sr-combo-empty">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupHeadPicker({
  value,
  onChange,
  error,
  users,
  selectedGroupObj,
  disabled,
}) {
  const groupName = selectedGroupObj?.group;
  const filtered = (users || [])
    .filter(
      (u) =>
        isNotOic(u) &&
        u.emp_position === "group-reviewer" &&
        u.emp_group === groupName,
    )
    .map((u) => u.user_name);
  return (
    <ComboBox
      value={value}
      onChange={onChange}
      options={filtered}
      error={error}
      placeholder={groupName ? "— Select or type —" : "Select a group first"}
      disabled={disabled}
    />
  );
}

function DeptHeadPicker({
  value,
  onChange,
  error,
  users,
  selectedGroupObj,
  selectedDeptObj,
  disabled,
}) {
  const groupName = selectedGroupObj?.group;
  const deptName = selectedDeptObj?.department;
  const filtered = (users || [])
    .filter(
      (u) =>
        isNotOic(u) &&
        u.emp_position === "department-reviewer" &&
        u.emp_group === groupName &&
        u.emp_department === deptName,
    )
    .map((u) => u.user_name);
  return (
    <ComboBox
      value={value}
      onChange={onChange}
      options={filtered}
      error={error}
      placeholder={
        deptName ? "— Select or type —" : "Select a department first"
      }
      disabled={disabled}
    />
  );
}

function StaffPicker({
  value,
  onChange,
  error,
  placeholder,
  users,
  selectedGroupObj,
  selectedDeptObj,
  disabled,
}) {
  const groupName = selectedGroupObj?.group;
  const deptName = selectedDeptObj?.department;
  const filtered = (users || [])
    .filter(
      (u) =>
        u.emp_group === groupName &&
        u.emp_department === deptName &&
        u.emp_position !== "group-reviewer" &&
        u.emp_position !== "department-reviewer" &&
        u.emp_position !== "safety-head",
    )
    .map((u) => u.user_name);
  return (
    <ComboBox
      value={value}
      onChange={onChange}
      options={filtered}
      error={error}
      placeholder={placeholder || "— Select or type —"}
      disabled={disabled}
    />
  );
}

function Section1({
  form,
  setForm,
  errors,
  displayName,
  groupList,
  readOnly,
  users,
  savedAssignments,
}) {
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toggle = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }));
  const toggleArea = (area) => toggle("workingAreas", area);
  const setParticipant = (id, field, value) =>
    setForm((f) => ({
      ...f,
      participants: f.participants.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    }));
  const addParticipant = () =>
    setForm((f) => ({
      ...f,
      participants: [...f.participants, makeParticipant()],
    }));
  const removeParticipant = (id) =>
    setForm((f) => ({
      ...f,
      participants: f.participants.filter((p) => p.id !== id),
    }));

  // Find departments for the currently selected group (matched by name, since form.group is stored as text)
  const selectedGroupObj = groupList.find((g) => g.group === form.group);
  const deptList = selectedGroupObj ? selectedGroupObj.departments : [];

  const handleGroupChange = (groupName) => {
    const gdId = groupList.find((g) => g.group === groupName)?.gd_id;
    const groupAssignment = savedAssignments[gdId];

    setForm((f) => ({
      ...f,
      group: groupName,
      department: "",
      group_head: groupAssignment?.group_head || "",
      department_head: "",
      section_head: "",
      supervisor_reported_to: "",
    }));
  };

  const handleDepartmentChange = (deptName) => {
    const selectedGroup = groupList.find((g) => g.group === form.group);
    const gdId = selectedGroup?.gd_id;
    const deptId = selectedGroup?.departments?.find(
      (d) => d.department === deptName,
    )?.id;

    const groupAssignment = savedAssignments[gdId];
    const deptAssignment = groupAssignment?.departments?.[deptId];

    setForm((f) => ({
      ...f,
      department: deptName,
      department_head: deptAssignment?.dept_head || "",
      section_head: deptAssignment?.section_head || "",
      supervisor_reported_to: deptAssignment?.supervisor || "",
    }));
  };

  const allAreas = [
    ["Zone A", WORKING_AREAS_COL1],
    ["Zone B", WORKING_AREAS_COL2],
    ["Zone C", WORKING_AREAS_COL3],
    ["Zone D", WORKING_AREAS_COL4],
  ];

  return (
    <div className="sr-stack">
      <div className="sr-notice">
        To be completed by the person reporting the occurrence or immediate
        supervisor of the department involved. Sections 1 &amp; 2 (general
        information and participants) must reach the relevant department heads
        within the shift; the remaining sections are completed within 24 hours.
      </div>

      <Plate code="SECTION.01" title="General Information" />

      <Panel>
        <div className="sr-grid sr-grid--4">
          <Field
            label="Government Notification Required"
            required
            error={errors.goverment_notification_required}
          >
            <div className="sr-radio-row">
              <Radio
                name="govNotif"
                label="Yes"
                checked={form.goverment_notification_required === "YES"}
                onChange={() => set("goverment_notification_required", "YES")}
                disabled={readOnly}
              />
              <Radio
                name="govNotif"
                label="No"
                checked={form.goverment_notification_required === "NO"}
                onChange={() => set("goverment_notification_required", "NO")}
                disabled={readOnly}
              />
            </div>
          </Field>
          <Field label="Data For?" required error={errors.data_for}>
            <Select
              value={form.data_for}
              onChange={(e) => set("data_for", e.target.value)}
              error={errors.data_for}
              disabled={readOnly}
            >
              <option value="">— Select —</option>
              <option value="active_data">Active Data</option>
              <option value="historical">Historical</option>
            </Select>
          </Field>
          <Field label="Work Related?" required error={errors.work_related}>
            <Select
              value={form.work_related}
              onChange={(e) => set("work_related", e.target.value)}
              error={errors.work_related}
              disabled={readOnly}
            >
              <option value="">— Select —</option>
              <option value="work_related">Work Related</option>
              <option value="not_work_related">Not Work Related</option>
            </Select>
          </Field>
          <Field label="Employer" required error={errors.employer}>
            <TextInput
              value={form.employer}
              onChange={(e) => set("employer", e.target.value)}
              error={errors.employer}
              disabled={readOnly}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Accident / Incident Subtype ＊"
        error={errors.accident_incident_subtype}
      >
        <Field
          label="Subtype"
          required
          error={errors.accident_incident_subtype}
        >
          <Select
            value={form.accident_incident_subtype[0] || ""}
            onChange={(e) =>
              set(
                "accident_incident_subtype",
                e.target.value ? [e.target.value] : [],
              )
            }
            error={errors.accident_incident_subtype}
            disabled={readOnly}
          >
            <option value="">— Select —</option>
            {ACCIDENT_SUBTYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </Panel>
      <Panel>
        <div className="sr-grid sr-grid--3">
          <Field label="Name" required error={errors.name}>
            <TextInput
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={errors.name}
              disabled={readOnly}
            />
          </Field>
          <Field label="Chapa No." required error={errors.chapa_number}>
            <TextInput
              value={form.chapa_number}
              onChange={(e) => set("chapa_number", e.target.value)}
              error={errors.chapa_number}
              disabled={readOnly}
            />
          </Field>
          <Field
            label="Job Designation"
            required
            error={errors.job_designation}
          >
            <TextInput
              value={form.job_designation}
              onChange={(e) => set("job_designation", e.target.value)}
              error={errors.job_designation}
              disabled={readOnly}
            />
          </Field>
          <Field label="Date of Event" required error={errors.date_of_event}>
            <TextInput
              type="date"
              value={form.date_of_event}
              onChange={(e) => set("date_of_event", e.target.value)}
              error={errors.date_of_event}
              disabled={readOnly}
            />
          </Field>
          <Field label="Time of Event" required error={errors.time_of_event}>
            <TextInput
              type="time"
              value={toTimeInputValue(form.time_of_event)}
              onChange={(e) => set("time_of_event", e.target.value)}
              error={errors.time_of_event}
              disabled={readOnly}
            />
          </Field>
          <Field label="Shift" required error={errors.shift}>
            <Select
              value={form.shift}
              onChange={(e) => set("shift", e.target.value)}
              error={errors.shift}
              disabled={readOnly}
            >
              <option value="">— Select —</option>
              <option value="1st Shift">1st Shift</option>
              <option value="2nd Shift">2nd Shift</option>
              <option value="3rd Shift">3rd Shift</option>
            </Select>
          </Field>
          <Field label="Date Reported" required error={errors.date_reported}>
            <TextInput
              type="date"
              value={form.date_reported}
              onChange={(e) => set("date_reported", e.target.value)}
              error={errors.date_reported}
              disabled={readOnly}
            />
          </Field>
          <Field label="Time Reported" required error={errors.time_reported}>
            <TextInput
              type="time"
              value={toTimeInputValue(form.time_reported)}
              onChange={(e) => set("time_reported", e.target.value)}
              error={errors.time_reported}
              disabled={readOnly}
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <div className="sr-grid sr-grid--3">
          <Field label="Location" required error={errors.location}>
            <Select
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              error={errors.location}
              disabled
            >
              <option value="">— Select —</option>
              <option value="surface">Surface</option>
              <option value="underground">Underground</option>
            </Select>
          </Field>
          <Field
            label="Specific Location"
            required
            error={errors.specific_location}
          >
            <TextInput
              value={form.specific_location}
              onChange={(e) => set("specific_location", e.target.value)}
              error={errors.specific_location}
              disabled={readOnly}
            />
          </Field>
          <Field label="Level" required error={errors.level}>
            <TextInput
              value={form.level}
              onChange={(e) => set("level", e.target.value)}
              error={errors.level}
              disabled={readOnly}
            />
          </Field>
          <Field label="Reported By" required error={errors.reported_by}>
            <Select
              value={form.reported_by}
              onChange={(e) => set("reported_by", e.target.value)}
              error={errors.reported_by}
              disabled={readOnly}
            >
              <option value="">— Select —</option>
              <option value="Witness">Witness</option>
              <option value="Victim">Victim</option>
            </Select>
            {/* <TextInput
              value={form.reported_by}
              onChange={(e) => set("reported_by", e.target.value)}
              error={errors.reported_by}
              disabled={readOnly}
            /> */}
          </Field>
        </div>
      </Panel>

      <Panel>
        <div className="sr-grid sr-grid--4">
          <Field label="Group" required error={errors.group}>
            <Select
              value={form.group}
              onChange={(e) => handleGroupChange(e.target.value)}
              error={errors.group}
              disabled={readOnly}
            >
              <option value="">— Select —</option>
              {/* keep the saved value visible even if it's no longer in the setup list */}
              {form.group && !groupList.some((g) => g.group === form.group) && (
                <option value={form.group}>{form.group}</option>
              )}
              {groupList.map((g) => (
                <option key={g.gd_id} value={g.group}>
                  {g.group}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department" required error={errors.department}>
            <Select
              value={form.department}
              onChange={(e) => handleDepartmentChange(e.target.value)} // ← changed
              error={errors.department}
              disabled={!form.group || readOnly}
            >
              <option value="">
                {form.group ? "— Select —" : "Select a group first"}
              </option>
              {/* keep the saved value visible even if it's no longer in the setup list */}
              {form.department &&
                !deptList.some((d) => d.department === form.department) && (
                  <option value={form.department}>{form.department}</option>
                )}
              {deptList.map((d) => (
                <option key={d.id} value={d.department}>
                  {d.department}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" required error={errors.section}>
            <TextInput
              value={form.section}
              onChange={(e) => set("section", e.target.value)}
              error={errors.section}
              disabled={readOnly}
            />
          </Field>

          <Field label="Group Head" required error={errors.group_head}>
            <GroupHeadPicker
              value={form.group_head}
              onChange={(v) => set("group_head", v)}
              error={errors.group_head}
              users={users}
              selectedGroupObj={groupList.find((g) => g.group === form.group)}
              disabled={readOnly || !form.group}
            />
          </Field>

          <Field
            label="Department Head"
            required
            error={errors.department_head}
          >
            <DeptHeadPicker
              value={form.department_head}
              onChange={(v) => set("department_head", v)}
              error={errors.department_head}
              users={users}
              selectedGroupObj={groupList.find((g) => g.group === form.group)}
              selectedDeptObj={groupList
                .find((g) => g.group === form.group)
                ?.departments?.find((d) => d.department === form.department)}
              disabled={readOnly || !form.group || !form.department}
            />
          </Field>

          <Field label="Section Head" error={errors.section_head} required>
            <StaffPicker
              value={form.section_head}
              onChange={(v) => set("section_head", v)}
              error={errors.section_head}
              users={users}
              selectedGroupObj={groupList.find((g) => g.group === form.group)}
              selectedDeptObj={groupList
                .find((g) => g.group === form.group)
                ?.departments?.find((d) => d.department === form.department)}
              disabled={readOnly || !form.group || !form.department}
              placeholder="Assign section head…"
            />
          </Field>

          <Field
            label="Supervisor Reported To"
            required
            error={errors.supervisor_reported_to}
          >
            <StaffPicker
              value={form.supervisor_reported_to}
              onChange={(v) => set("supervisor_reported_to", v)}
              error={errors.supervisor_reported_to}
              users={users}
              selectedGroupObj={groupList.find((g) => g.group === form.group)}
              selectedDeptObj={groupList
                .find((g) => g.group === form.group)
                ?.departments?.find((d) => d.department === form.department)}
              disabled={readOnly || !form.group || !form.department}
              placeholder="Assign supervisor…"
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <div className="sr-grid sr-grid--3">
          <Field label="Date Hired" required error={errors.date_hired}>
            <TextInput
              type="date"
              value={form.date_hired}
              onChange={(e) => set("date_hired", e.target.value)}
              error={errors.date_hired}
              disabled={readOnly}
            />
          </Field>
          <Field label="Date of Birth" required error={errors.date_of_birth}>
            <TextInput
              type="date"
              value={form.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
              error={errors.date_of_birth}
              disabled={readOnly}
            />
          </Field>
          <Field label="Age" required error={errors.age}>
            <TextInput
              type="number"
              min="0"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              error={errors.age}
              disabled={readOnly}
            />
          </Field>
          <Field label="Home Address" required error={errors.home_address}>
            <TextInput
              value={form.home_address}
              onChange={(e) => set("home_address", e.target.value)}
              error={errors.home_address}
              disabled={readOnly}
            />
          </Field>
          <Field label="Status" required error={errors.status}>
            <Select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              error={errors.status}
              disabled={readOnly}
            >
              <option value="">— Select —</option>
              <option>Single</option>
              <option>Married</option>
              <option>Widowed</option>
              <option>Separated</option>
            </Select>
          </Field>
          <Field
            label="No. of Dependents"
            required
            error={errors.number_of_dependents}
          >
            <TextInput
              type="number"
              min="0"
              value={form.number_of_dependents}
              onChange={(e) => set("number_of_dependents", e.target.value)}
              error={errors.number_of_dependents}
              disabled={readOnly}
            />
          </Field>
          <Field
            label="Length of Service"
            required
            error={errors.length_of_service}
          >
            <TextInput
              value={form.length_of_service}
              onChange={(e) => set("length_of_service", e.target.value)}
              error={errors.length_of_service}
              disabled={readOnly}
            />
          </Field>
          <Field
            label="Experience at Occupation"
            required
            error={errors.expereince_at_occupation}
          >
            <TextInput
              value={form.expereince_at_occupation}
              onChange={(e) => set("expereince_at_occupation", e.target.value)}
              error={errors.expereince_at_occupation}
              disabled={readOnly}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Working Area ＊" error={errors.workingAreas}>
        <div className="sr-area-grid">
          {allAreas.map(([zone, areas]) => (
            <div key={zone} className="sr-area-col">
              {/* <span className="sr-area-zone">{zone}</span> */}
              {areas.map((a) => (
                <Check
                  key={a}
                  checked={form.workingAreas.includes(a)}
                  onChange={() => toggleArea(a)}
                  label={a}
                  disabled={readOnly}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ marginTop: "14px" }}>
          <div style={{ marginTop: "14px" }}>
            <OtherInput
              checked={form.othersAreaChecked}
              onToggle={() => {
                const isChecked = form.othersAreaChecked;
                setForm((f) => ({
                  ...f,
                  othersAreaChecked: !isChecked,
                  // Clear the text field when unchecking
                  others_area: isChecked ? "" : f.others_area,
                }));
              }}
              value={form.others_area}
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => {
                  if (val.trim() && !f.othersAreaChecked) {
                    return { ...f, others_area: val, othersAreaChecked: true };
                  }
                  if (!val.trim() && f.othersAreaChecked) {
                    return { ...f, others_area: val, othersAreaChecked: false };
                  }
                  return { ...f, others_area: val };
                });
              }}
              error={errors.others_area}
              disabled={readOnly}
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="Incident / Accident Brief Description ＊"
        error={errors.incident_accident_brief_description}
        hint='"Kasano iti panakapasamak ti aksidente/insidente?"'
      >
        <TextArea
          rows={5}
          value={form.incident_accident_brief_description}
          onChange={(e) =>
            set("incident_accident_brief_description", e.target.value)
          }
          error={errors.incident_accident_brief_description}
          disabled={readOnly}
        />
      </Panel>

      <Panel
        title="Immediate Actions Taken ＊"
        error={errors.immediate_actions_taken}
        hint='"Anya dagiti wagas nga inaramid mo idi kalpasan ti aksidente/insidente?"'
      >
        <TextArea
          rows={5}
          value={form.immediate_actions_taken}
          onChange={(e) => set("immediate_actions_taken", e.target.value)}
          error={errors.immediate_actions_taken}
          disabled={readOnly}
        />
      </Panel>

      <Plate code="SECTION.02" title="Participants" />
      <Panel>
        <p className="sr-help">
          Any other people involved in, or witness to, the incident.
        </p>
        <div className="sr-action-list">
          {form.participants.map((p) => {
            const rowErr = errors.participants[p.id] || {};
            return (
              <div className="sr-action-card" key={p.id}>
                <div className="sr-action-head">
                  <span className="sr-action-num">PARTICIPANT</span>
                  <button
                    type="button"
                    className="sr-action-remove"
                    disabled={readOnly}
                    onClick={() => removeParticipant(p.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="sr-grid sr-grid--3">
                  <Field label="Name" required error={rowErr.name}>
                    <TextInput
                      value={p.name}
                      onChange={(e) =>
                        setParticipant(p.id, "name", e.target.value)
                      }
                      error={rowErr.name}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Department" required error={rowErr.department}>
                    <TextInput
                      value={p.department}
                      onChange={(e) =>
                        setParticipant(p.id, "department", e.target.value)
                      }
                      error={rowErr.department}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field
                    label="Involvement Type"
                    required
                    error={rowErr.involvementType}
                  >
                    <TextInput
                      value={p.involvementType}
                      onChange={(e) =>
                        setParticipant(p.id, "involvementType", e.target.value)
                      }
                      error={rowErr.involvementType}
                      disabled={readOnly}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="sr-btn sr-btn--ghost1"
          style={{ marginTop: "12px" }}
          onClick={addParticipant}
          disabled={readOnly}
        >
          + Add Participant
        </button>
      </Panel>

      <Panel title="Prepared By">
        <div className="sr-grid sr-grid--3">
          <Field label="Prepared By" required error={errors.prepared_by}>
            <TextInput
              value={displayName}
              onChange={() => {}}
              style={{
                background: "var(--sr-paper-alt)",
                color: "var(--sr-muted)",
                cursor: "not-allowed",
              }}
              disabled={readOnly}
            />
          </Field>
          <Field
            label="Immediate Supervisor on Duty"
            required
            error={errors.immediate_supervisor}
          >
            <TextInput
              value={form.immediate_supervisor}
              onChange={(e) => set("immediate_supervisor", e.target.value)}
              error={errors.immediate_supervisor}
              disabled={readOnly}
            />
          </Field>
          <Field label="Date & Time" required error={errors.date_and_time}>
            <TextInput
              type="datetime-local"
              value={form.date_and_time}
              onChange={(e) => set("date_and_time", e.target.value)}
              error={errors.date_and_time}
              disabled={readOnly}
            />
          </Field>
        </div>
        <div className="sr-hint" style={{ marginTop: "8px" }}>
          Role: Safety Officer &amp; Immediate Supervisor on Duty
        </div>
      </Panel>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 3 — INJURY & MEDICAL EVALUATION
   ════════════════════════════════════════════════════════════════════════ */

const makeSection3 = () => ({
  recurrentInjury: "",
  dateTimeProvided: "",
  extentOfDisability: [],
  natureOfInjury: [],
  natureOfInjuryOther: "",
  mechanismOfInjury: [],
  mechanismOfInjuryOther: "",
  contactExposure: [],
  contactExposureOther: "",
  agencyOfInjury: [],
  agencyOfInjuryOther: "",
  partsBodyInjured: [],
  partsBodyInjuredOther: "",
  medicalDiagnosis: "",
  vitals: {
    temperature: "",
    bloodPressure: "",
    pulseRate: "",
    bloodAlcohol: "",
  },
  rehabilitationPlan: [],
  rehabLightWorkDays: "",
  rehabFurtherEval: "",
  detailsOfTreatment: "",
  attendingPhysician: "",
  dateTime: "",
  treatmentFiles: [], // ← NEW
});

function validateSection3(form) {
  const errors = {};
  if (isEmpty(form.recurrentInjury))
    errors.recurrentInjury =
      "Please indicate whether this is a recurrent injury/illness.";
  if (isEmpty(form.dateTimeProvided))
    errors.dateTimeProvided =
      "Date and time treatment was provided is required.";
  else if (isFutureDate(form.dateTimeProvided))
    errors.dateTimeProvided = "Cannot be in the future.";
  if (form.extentOfDisability.length === 0)
    errors.extentOfDisability = "Select at least one extent of disability.";
  if (form.natureOfInjury.length === 0)
    errors.natureOfInjury = "Select at least one nature of injury.";
  if (
    form.natureOfInjury.includes("Others (Nature)") &&
    isEmpty(form.natureOfInjuryOther)
  )
    errors.natureOfInjuryOther = "Please specify.";
  if (form.mechanismOfInjury.length === 0)
    errors.mechanismOfInjury = "Select at least one mechanism of injury.";
  if (
    form.mechanismOfInjury.includes("Other (Mechanism)") &&
    isEmpty(form.mechanismOfInjuryOther)
  )
    errors.mechanismOfInjuryOther = "Please specify.";
  if (form.contactExposure.length === 0)
    errors.contactExposure = "Select at least one contact/exposure type.";
  if (
    form.contactExposure.includes("Other (Contact)") &&
    isEmpty(form.contactExposureOther)
  )
    errors.contactExposureOther = "Please specify.";
  if (form.agencyOfInjury.length === 0)
    errors.agencyOfInjury = "Select at least one agency of injury.";
  if (
    form.agencyOfInjury.includes("Other (Agency)") &&
    isEmpty(form.agencyOfInjuryOther)
  )
    errors.agencyOfInjuryOther = "Please specify.";
  if (form.partsBodyInjured.length === 0)
    errors.partsBodyInjured = "Select at least one body part injured.";
  if (
    form.partsBodyInjured.includes("Others (Body)") &&
    isEmpty(form.partsBodyInjuredOther)
  )
    errors.partsBodyInjuredOther = "Please specify.";
  if (isEmpty(form.medicalDiagnosis))
    errors.medicalDiagnosis = "Medical diagnosis is required.";
  if (isEmpty(form.vitals.temperature)) errors.vitalsTemperature = "Required.";
  if (isEmpty(form.vitals.bloodPressure))
    errors.vitalsBloodPressure = "Required.";
  if (isEmpty(form.vitals.pulseRate)) errors.vitalsPulseRate = "Required.";
  if (isEmpty(form.vitals.bloodAlcohol))
    errors.vitalsBloodAlcohol = "Required.";
  if (form.rehabilitationPlan.length === 0)
    errors.rehabilitationPlan = "Select a rehabilitation plan.";
  if (
    form.rehabilitationPlan.includes("Recommended for Light Works") &&
    (isEmpty(form.rehabLightWorkDays) ||
      !isValidNumber(form.rehabLightWorkDays) ||
      Number(form.rehabLightWorkDays) <= 0)
  ) {
    errors.rehabLightWorkDays = "Enter a valid number of days.";
  }
  if (
    form.rehabilitationPlan.includes("For further medical evaluation") &&
    isEmpty(form.rehabFurtherEval)
  ) {
    errors.rehabFurtherEval = "Please specify the evaluation needed.";
  }
  if (isEmpty(form.detailsOfTreatment))
    errors.detailsOfTreatment = "Treatment details are required.";
  if (isEmpty(form.attendingPhysician))
    errors.attendingPhysician = "Attending physician's approval is required.";
  if (isEmpty(form.dateTime)) errors.dateTime = "Date/Time is required.";
  else if (isFutureDate(form.dateTime))
    errors.dateTime = "Cannot be in the future.";
  return errors;
}

function TreatmentFileUpload({
  accidentId,
  currentUser,
  files,
  onUploaded,
  onDeleted,
  readOnly,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const inputRef = useRef(null);

  const notify = useNotification();

  const EXT_META = {
    pdf: {
      icon: "ti-file-type-pdf",
      bg: "#FEE2E2",
      color: "#991B1B",
      label: "PDF",
    },
    doc: {
      icon: "ti-file-type-doc",
      bg: "#DBEAFE",
      color: "#1E3A8A",
      label: "DOC",
    },
    docx: {
      icon: "ti-file-type-doc",
      bg: "#DBEAFE",
      color: "#1E3A8A",
      label: "DOC",
    },
    xls: {
      icon: "ti-file-type-xls",
      bg: "#D1FAE5",
      color: "#064E3B",
      label: "XLS",
    },
    xlsx: {
      icon: "ti-file-type-xls",
      bg: "#D1FAE5",
      color: "#064E3B",
      label: "XLS",
    },
    jpg: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
    jpeg: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
    png: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
    gif: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
    webp: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
  };

  const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

  const getExt = (name = "") => name.split(".").pop().toLowerCase();
  const getMeta = (name) =>
    EXT_META[getExt(name)] ?? {
      icon: "ti-file",
      bg: "#F3F4F6",
      color: "#374151",
      label: getExt(name).toUpperCase(),
    };
  const isImage = (name) => IMAGE_EXTS.has(getExt(name));
  const isPdf = (name) => getExt(name) === "pdf";

  // Build the URL your backend serves files from
  const getFileUrl = (f) =>
    `${config.baseApi}/accident/treatment-file/${f.file_name}`;

  const handleView = (f) => {
    const url = getFileUrl(f);
    const name = f.original_name || f.file_name;

    if (isImage(name) || isPdf(name)) {
      // Show inline preview modal
      setPreviewFile({ url, name, type: isImage(name) ? "image" : "pdf" });
    } else {
      // For doc/xls etc, just download — browsers can't preview them inline
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError("");

    const MIN_SPINNER_MS = 5000;
    const minDelay = new Promise((resolve) =>
      setTimeout(resolve, MIN_SPINNER_MS),
    );

    try {
      const uploads = files.map((file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("accident_id", accidentId);
        formData.append("uploaded_by", currentUser || "");

        return axios.post(
          `${config.baseApi}/accident/upload-treatment-file`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
      });

      const [results] = await Promise.all([Promise.all(uploads), minDelay]);

      onUploaded(results.map((res) => res.data.file));

      notify.success("Uploaded ", "File uploaded successfully.", 2000);
    } catch (err) {
      await minDelay;
      setUploadError(
        err.response?.data?.error || "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      {/* ── Header row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "var(--sr-ink-soft)",
              }}
            >
              Supporting Documents
            </div>
            <div
              style={{
                fontSize: "10.5px",
                color: "var(--sr-muted)",
                marginTop: "1px",
              }}
            >
              PDF, Word, Excel, or image · max 20 MB
            </div>
          </div>
        </div>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 14px",
            background: uploading ? "var(--sr-paper-alt)" : "#0F3D2B",
            border: `1.5px solid ${uploading ? "var(--sr-line-strong)" : "#1B5E44"}`,
            borderRadius: "7px",
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading || readOnly ? 0.45 : 1,
            pointerEvents: uploading || readOnly ? "none" : "auto",
            fontSize: "12px",
            fontWeight: 600,
            color: uploading ? "var(--sr-muted)" : "#fff",
            letterSpacing: "0.02em",
            transition: "background 0.15s, border-color 0.15s",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "13px" }}>{uploading ? "⏳" : "↑"}</span>
          {uploading ? "Uploading…" : "Attach File"}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
            multiple
            style={{ display: "none" }}
            onChange={handleUpload}
            disabled={uploading || readOnly}
          />
        </label>
      </div>

      {uploading && (
        <div style={{ marginTop: "10px" }}>
          <LoadingSpinner label="Uploading file, please wait…" />
        </div>
      )}

      {/* ── Error banner ── */}
      {uploadError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 13px",
            marginBottom: "10px",
            background: "var(--sr-danger-soft)",
            border: "1px solid var(--sr-danger)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "var(--sr-danger)",
            fontWeight: 600,
          }}
        >
          <span>⚠</span>
          {uploadError}
        </div>
      )}

      {/* ── File list ── */}
      {files.length > 0 ? (
        <div
          style={{
            border: "1px solid var(--sr-line)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {files.map((f, idx) => {
            const meta = getMeta(f.original_name || f.file_name);
            const name = f.original_name || f.file_name;
            const canPreview = isImage(name) || isPdf(name);

            return (
              <div
                key={f.file_name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  background:
                    idx % 2 === 0 ? "var(--sr-paper)" : "var(--sr-paper-alt)",
                  borderTop: idx === 0 ? "none" : "1px solid var(--sr-line)",
                }}
              >
                {/* File type badge */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: meta.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "8px",
                      fontWeight: 700,
                      color: meta.color,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {meta.label}
                  </span>
                </div>

                {/* Clickable file name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    onClick={() => handleView(f)}
                    title={
                      canPreview ? "Click to preview" : "Click to download"
                    }
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--sr-amber)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textDecorationStyle: "dotted",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    {name}
                  </div>
                  {f.uploaded_at && (
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "var(--sr-muted)",
                        marginTop: "1px",
                      }}
                    >
                      Uploaded{" "}
                      {new Date(f.uploaded_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>

                {/* View / Download button */}
                <button
                  type="button"
                  onClick={() => handleView(f)}
                  title={canPreview ? "Preview file" : "Download file"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    height: "26px",
                    flexShrink: 0,
                    background: "transparent",
                    border: "1px solid var(--sr-line-strong)",
                    borderRadius: "5px",
                    color: "var(--sr-ink-soft)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition:
                      "border-color 0.12s, color 0.12s, background 0.12s",
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--sr-amber)";
                    e.currentTarget.style.color = "var(--sr-amber)";
                    e.currentTarget.style.background = "var(--sr-amber-soft)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--sr-line-strong)";
                    e.currentTarget.style.color = "var(--sr-ink-soft)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {canPreview ? "👁 View" : "↓ Download"}
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onDeleted(f.file_name)}
                  title="Remove file"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "26px",
                    height: "26px",
                    flexShrink: 0,
                    background: "transparent",
                    border: "1px solid var(--sr-line-strong)",
                    borderRadius: "5px",
                    color: "var(--sr-muted)",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition:
                      "border-color 0.12s, color 0.12s, background 0.12s",
                    opacity: readOnly ? 0.4 : 1,
                    pointerEvents: readOnly ? "none" : "auto",
                  }}
                  disabled={readOnly}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--sr-danger)";
                    e.currentTarget.style.color = "var(--sr-danger)";
                    e.currentTarget.style.background = "var(--sr-danger-soft)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--sr-line-strong)";
                    e.currentTarget.style.color = "var(--sr-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            border: "1.5px dashed var(--sr-line-strong)",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            background: "var(--sr-paper-alt)",
          }}
        >
          <div style={{ fontSize: "22px", marginBottom: "6px", opacity: 0.4 }}>
            📄
          </div>
          <div style={{ fontSize: "12px", color: "var(--sr-muted)" }}>
            No documents attached yet
          </div>
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          {/* Modal panel — stop click propagation so clicking inside doesn't close */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1A2A38",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#E8F4EF",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {previewFile.name}
              </span>

              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                {/* Open in new tab */}
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    background: "#0F3D2B",
                    border: "1px solid #1B5E44",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  ↗ Open in new tab
                </a>
                {/* Close */}
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "6px",
                    color: "#8AA4B8",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflow: "auto", background: "#111C27" }}>
              {previewFile.type === "image" ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    margin: "auto",
                    padding: "16px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                // PDF — use iframe; works in all modern browsers
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  style={{
                    width: "100%",
                    height: "75vh",
                    border: "none",
                    display: "block",
                  }}
                />
              )}
            </div>
          </div>

          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "11px",
              marginTop: "10px",
            }}
          >
            Click outside to close
          </p>
        </div>
      )}
    </div>
  );
}

function Section3({
  form,
  setForm,
  errors,
  accidentId,
  currentUser,
  isApprover,
  setErrors3,
  setSaveAttempted,
  readOnly,
  currentUserFullName,
  onAutoSave,
}) {
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setVital = (field, value) =>
    setForm((f) => ({ ...f, vitals: { ...f.vitals, [field]: value } }));
  const toggle = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }));

  const notify = useNotification();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);

  const [attendingPhysicianDisplay, setAttendingPhysicianDisplay] =
    useState("");

  // ← ADD THESE TWO
  const handleTreatmentFileUploaded = useCallback(
    (newFiles) => {
      const filesToAdd = Array.isArray(newFiles) ? newFiles : [newFiles];
      setForm((f) => ({
        ...f,
        treatmentFiles: [...(f.treatmentFiles || []), ...filesToAdd],
      }));
    },
    [setForm],
  );

  const handleTreatmentFileDeleted = useCallback((fileName) => {
    setConfirmDelete(fileName);
  }, []);

  useEffect(() => {
    const username = form.attendingPhysician;
    if (!username) {
      setAttendingPhysicianDisplay("");
      return;
    }

    let cancelled = false;
    axios
      .get(`${config.baseApi}/auth/get-user-by-username`, {
        params: { user_name: username },
      })
      .then((res) => {
        if (cancelled) return;
        const user = Array.isArray(res.data) ? res.data[0] : res.data;
        const fullName = user
          ? `${user.emp_firstname || ""} ${user.emp_lastname || ""}`.trim()
          : "";
        setAttendingPhysicianDisplay(fullName || username);
      })
      .catch(() => {
        if (!cancelled) setAttendingPhysicianDisplay(username);
      });

    return () => {
      cancelled = true;
    };
  }, [form.attendingPhysician]);

  const handleApprove = () => {
    setSaveAttempted(true);
    const validationErrors = validateSection3(form);
    delete validationErrors.attendingPhysician;
    delete validationErrors.dateTime;
    setErrors3(validationErrors);
    if (hasAnyErrors(validationErrors)) {
      notify.error(
        "INCOMPLETE REPORT",
        "Please fix errors in: Medical Evaluation (Section 3).",
      );
      return;
    }
    setConfirmApproveOpen(true);
  };

  const handleApproveConfirmed = () => {
    const now = new Date().toISOString().slice(0, 16);

    const updated = {
      ...form,
      attendingPhysician: currentUser,
      dateTime: now,
    };

    setForm(() => updated);

    notify.success(
      "APPROVED",
      "Section 3 approved. Saving automatically…",
      2000,
    );

    setConfirmApproveOpen(false);

    if (onAutoSave) onAutoSave(updated);
  };

  const handleDeleteConfirmed = async () => {
    try {
      await axios.delete(`${config.baseApi}/accident/delete-treatment-file`, {
        data: {
          accident_id: accidentId,
          file_name: confirmDelete,
          deleted_by: currentUser,
        },
      });

      set(
        "treatmentFiles",
        form.treatmentFiles.filter((f) => f.file_name !== confirmDelete),
      );

      notify.success("Deleted ", "File deleted successfully.", 2000);
    } catch (err) {
      notify.error("Error", "Failed to delete file. Please try again.");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="sr-stack">
      <Panel>
        <div className="sr-grid sr-grid--2">
          <Field
            label="Recurrent Injury/Illness"
            required
            error={errors.recurrentInjury}
          >
            <div className="sr-radio-row">
              <Radio
                name="recurrent"
                label="Yes"
                checked={form.recurrentInjury === "YES"}
                onChange={() => set("recurrentInjury", "YES")}
                disabled={readOnly}
              />
              <Radio
                name="recurrent"
                label="No"
                checked={form.recurrentInjury === "NO"}
                onChange={() => set("recurrentInjury", "NO")}
                disabled={readOnly}
              />
            </div>
          </Field>
          <Field
            label="Date &amp; Time Treatment Provided"
            required
            error={errors.dateTimeProvided}
          >
            <TextInput
              type="datetime-local"
              value={form.dateTimeProvided}
              onChange={(e) => set("dateTimeProvided", e.target.value)}
              error={errors.dateTimeProvided}
              disabled={readOnly}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Extent of Disability ＊" error={errors.extentOfDisability}>
        <div className="sr-check-grid">
          {[
            "Fatal",
            "Permanent Total",
            "Permanent Partial",
            "Temporary Total",
            "Medical Treatment",
          ].map((v) => (
            <Check
              key={v}
              checked={form.extentOfDisability.includes(v)}
              onChange={() => toggle("extentOfDisability", v)}
              label={v}
              disabled={readOnly}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Nature of Injury ＊" error={errors.natureOfInjury}>
        <div className="sr-grid sr-grid--3">
          <div className="sr-check-grid sr-check-grid--col">
            <div className="sr-indent">
              <Check
                checked={form.natureOfInjury.includes("Disease")}
                onChange={() => toggle("natureOfInjury", "Disease")}
                label="Disease"
                disabled={readOnly}
              />
              <Check
                checked={form.natureOfInjury.includes("Amputation")}
                onChange={() => toggle("natureOfInjury", "Amputation")}
                label="Amputation"
                disabled={readOnly}
              />
              {[
                "Digestive System",
                "Skin",
                "Infectious or Parasitic",
                "Musculoskeletal System",
                "Nervous System",
                "Circulatory System",
                "Respiratory System",
              ].map((v) => (
                <Check
                  key={v}
                  checked={form.natureOfInjury.includes(v)}
                  onChange={() => toggle("natureOfInjury", v)}
                  label={v}
                  disabled={readOnly}
                />
              ))}
            </div>
          </div>
          <div className="sr-check-grid sr-check-grid--col">
            {[
              "Fracture",
              "Nerves or Spinal Cord",
              "Superficial Injury",
              "Bruising or Crushing",
              "Dislocation",
              "Head Injury",
              "Open Wound",
              "Tumor (Malignant or Benign)",
              "Burns",
            ].map((v) => (
              <Check
                key={v}
                checked={form.natureOfInjury.includes(v)}
                onChange={() => toggle("natureOfInjury", v)}
                label={v}
                disabled={readOnly}
              />
            ))}
          </div>
          <div className="sr-check-grid sr-check-grid--col">
            <Check
              checked={form.natureOfInjury.includes("Fatal (Nature)")}
              onChange={() => toggle("natureOfInjury", "Fatal (Nature)")}
              label="Fatal"
              disabled={readOnly}
            />
            {[
              "Internal Injury of Trunk",
              "Poisoning or Toxic Effect",
              "Foreign Body",
              "Mental Disorder",
              "Fracture of Spine",
              "Multiple Injuries",
              "Sprain or Strain",
            ].map((v) => (
              <Check
                key={v}
                checked={form.natureOfInjury.includes(v)}
                onChange={() => toggle("natureOfInjury", v)}
                label={v}
                disabled={readOnly}
              />
            ))}
            <OtherInput
              label="Others"
              checked={form.natureOfInjury.includes("Others (Nature)")}
              onToggle={() => {
                const isChecked =
                  form.natureOfInjury.includes("Others (Nature)");
                setForm((f) => ({
                  ...f,
                  natureOfInjury: isChecked
                    ? f.natureOfInjury.filter((v) => v !== "Others (Nature)")
                    : [...f.natureOfInjury, "Others (Nature)"],
                  // Clear the text field when unchecking
                  natureOfInjuryOther: isChecked ? "" : f.natureOfInjuryOther,
                }));
              }}
              value={form.natureOfInjuryOther}
              onChange={(e) => {
                const val = e.target.value;
                set("natureOfInjuryOther", val);
                setForm((f) => {
                  const alreadyChecked =
                    f.natureOfInjury.includes("Others (Nature)");
                  if (val.trim() && !alreadyChecked) {
                    return {
                      ...f,
                      natureOfInjury: [...f.natureOfInjury, "Others (Nature)"],
                    };
                  }
                  if (!val.trim() && alreadyChecked) {
                    return {
                      ...f,
                      natureOfInjury: f.natureOfInjury.filter(
                        (v) => v !== "Others (Nature)",
                      ),
                    };
                  }
                  return f;
                });
              }}
              error={errors.natureOfInjuryOther}
              disabled={readOnly}
            />
          </div>
        </div>
      </Panel>

      <div className="sr-grid sr-grid--2">
        <Panel title="Mechanism of Injury ＊" error={errors.mechanismOfInjury}>
          <div className="sr-check-grid sr-check-grid--col">
            {[
              "Struck Against",
              "Struck By (Hit by a moving object)",
              "Fall to lower level",
              "Fall on the same level (Slip & Fall/ Trip over)",
              "Caught In (Pinch/ Nip point)",
              "Caught On (Snug/ Hung)",
              "Caught between or under",
              "Pinned between or under",
              "Over stress or Overexertion",
              "Motor Vehicle Accidents",
            ].map((v) => (
              <Check
                key={v}
                checked={form.mechanismOfInjury.includes(v)}
                onChange={() => toggle("mechanismOfInjury", v)}
                label={v}
                disabled={readOnly}
              />
            ))}
            <OtherInput
              checked={form.mechanismOfInjury.includes("Other (Mechanism)")}
              onToggle={() => {
                const isChecked =
                  form.mechanismOfInjury.includes("Other (Mechanism)");
                setForm((f) => ({
                  ...f,
                  mechanismOfInjury: isChecked
                    ? f.mechanismOfInjury.filter(
                        (v) => v !== "Other (Mechanism)",
                      )
                    : [...f.mechanismOfInjury, "Other (Mechanism)"],
                  mechanismOfInjuryOther: isChecked
                    ? ""
                    : f.mechanismOfInjuryOther,
                }));
              }}
              value={form.mechanismOfInjuryOther}
              onChange={(e) => {
                const val = e.target.value;
                set("mechanismOfInjuryOther", val);
                setForm((f) => {
                  const alreadyChecked =
                    f.mechanismOfInjury.includes("Other (Mechanism)");
                  if (val.trim() && !alreadyChecked) {
                    return {
                      ...f,
                      mechanismOfInjury: [
                        ...f.mechanismOfInjury,
                        "Other (Mechanism)",
                      ],
                    };
                  }
                  if (!val.trim() && alreadyChecked) {
                    return {
                      ...f,
                      mechanismOfInjury: f.mechanismOfInjury.filter(
                        (v) => v !== "Other (Mechanism)",
                      ),
                    };
                  }
                  return f;
                });
              }}
              error={errors.mechanismOfInjuryOther}
              disabled={readOnly}
            />
          </div>
        </Panel>
        <Panel
          title="Contact With / Exposure To ＊"
          error={errors.contactExposure}
        >
          <div className="sr-check-grid sr-check-grid--col">
            {[
              "Biological Factors",
              "Mental Stress Factors",
              "Chemical/Substance (Short Term)",
              "Chemical/Substance (Long Term)",
              "Noise (Sudden/Sharp)",
              "Noise (Long Term)",
            ].map((v) => (
              <Check
                key={v}
                checked={form.contactExposure.includes(v)}
                onChange={() => toggle("contactExposure", v)}
                label={v}
                disabled={readOnly}
              />
            ))}
            <div className="sr-radio-row">
              <Check
                checked={form.contactExposure.includes("COLD")}
                onChange={() => toggle("contactExposure", "COLD")}
                label="Cold"
                disabled={readOnly}
              />
              <Check
                checked={form.contactExposure.includes("HOT")}
                onChange={() => toggle("contactExposure", "HOT")}
                label="Hot"
                disabled={readOnly}
              />
            </div>
            {["Pressure", "Electricity", "Radiation"].map((v) => (
              <Check
                key={v}
                checked={form.contactExposure.includes(v)}
                onChange={() => toggle("contactExposure", v)}
                label={v}
                disabled={readOnly}
              />
            ))}
            <OtherInput
              checked={form.contactExposure.includes("Other (Contact)")}
              onToggle={() => {
                const isChecked =
                  form.contactExposure.includes("Other (Contact)");
                setForm((f) => ({
                  ...f,
                  contactExposure: isChecked
                    ? f.contactExposure.filter((v) => v !== "Other (Contact)")
                    : [...f.contactExposure, "Other (Contact)"],
                  contactExposureOther: isChecked ? "" : f.contactExposureOther,
                }));
              }}
              value={form.contactExposureOther}
              onChange={(e) => {
                const val = e.target.value;
                set("contactExposureOther", val);
                setForm((f) => {
                  const alreadyChecked =
                    f.contactExposure.includes("Other (Contact)");
                  if (val.trim() && !alreadyChecked) {
                    return {
                      ...f,
                      contactExposure: [
                        ...f.contactExposure,
                        "Other (Contact)",
                      ],
                    };
                  }
                  if (!val.trim() && alreadyChecked) {
                    return {
                      ...f,
                      contactExposure: f.contactExposure.filter(
                        (v) => v !== "Other (Contact)",
                      ),
                    };
                  }
                  return f;
                });
              }}
              error={errors.contactExposureOther}
              disabled={readOnly}
            />
          </div>
        </Panel>
      </div>

      <div className="sr-grid sr-grid--2">
        <Panel title="Agency of Injury ＊" error={errors.agencyOfInjury}>
          <div className="sr-check-grid sr-check-grid--col">
            {[
              "Rock or Debris",
              "Virus or Bacteria",
              "Mobile Equipment",
              "Non-Mobile Equipment",
              "Powered equipment, tools or appliances",
              "Environmental Exposure (e.g., dust, gas, chemicals)",
            ].map((v) => (
              <Check
                key={v}
                checked={form.agencyOfInjury.includes(v)}
                onChange={() => toggle("agencyOfInjury", v)}
                label={v}
                disabled={readOnly}
              />
            ))}
            <OtherInput
              checked={form.agencyOfInjury.includes("Other (Agency)")}
              onToggle={() => {
                const isChecked =
                  form.agencyOfInjury.includes("Other (Agency)");
                setForm((f) => ({
                  ...f,
                  agencyOfInjury: isChecked
                    ? f.agencyOfInjury.filter((v) => v !== "Other (Agency)")
                    : [...f.agencyOfInjury, "Other (Agency)"],
                  agencyOfInjuryOther: isChecked ? "" : f.agencyOfInjuryOther,
                }));
              }}
              value={form.agencyOfInjuryOther}
              onChange={(e) => {
                const val = e.target.value;
                set("agencyOfInjuryOther", val);
                setForm((f) => {
                  const alreadyChecked =
                    f.agencyOfInjury.includes("Other (Agency)");
                  if (val.trim() && !alreadyChecked) {
                    return {
                      ...f,
                      agencyOfInjury: [...f.agencyOfInjury, "Other (Agency)"],
                    };
                  }
                  if (!val.trim() && alreadyChecked) {
                    return {
                      ...f,
                      agencyOfInjury: f.agencyOfInjury.filter(
                        (v) => v !== "Other (Agency)",
                      ),
                    };
                  }
                  return f;
                });
              }}
              error={errors.agencyOfInjuryOther}
              disabled={readOnly}
            />
          </div>
        </Panel>
        <Panel
          title="Parts of the Body Injured ＊"
          error={errors.partsBodyInjured}
        >
          <div className="sr-check-grid sr-check-grid--2col">
            {[
              "Eye",
              "Shoulders and Arms",
              "Ear",
              "Hands and Fingers",
              "Face",
              "Hips and Legs",
              "Head",
              "Feet and Toes",
              "Neck",
              "Internal Organs",
              "Back",
              "Multiple Locations",
              "Trunk",
            ].map((v) => (
              <Check
                key={v}
                checked={form.partsBodyInjured.includes(v)}
                onChange={() => toggle("partsBodyInjured", v)}
                label={v}
                disabled={readOnly}
              />
            ))}
          </div>
          <OtherInput
            label="Others"
            checked={form.partsBodyInjured.includes("Others (Body)")}
            onToggle={() => {
              const isChecked = form.partsBodyInjured.includes("Others (Body)");
              setForm((f) => ({
                ...f,
                partsBodyInjured: isChecked
                  ? f.partsBodyInjured.filter((v) => v !== "Others (Body)")
                  : [...f.partsBodyInjured, "Others (Body)"],
                partsBodyInjuredOther: isChecked ? "" : f.partsBodyInjuredOther,
              }));
            }}
            value={form.partsBodyInjuredOther}
            onChange={(e) => {
              const val = e.target.value;
              set("partsBodyInjuredOther", val);
              setForm((f) => {
                const alreadyChecked =
                  f.partsBodyInjured.includes("Others (Body)");
                if (val.trim() && !alreadyChecked) {
                  return {
                    ...f,
                    partsBodyInjured: [...f.partsBodyInjured, "Others (Body)"],
                  };
                }
                if (!val.trim() && alreadyChecked) {
                  return {
                    ...f,
                    partsBodyInjured: f.partsBodyInjured.filter(
                      (v) => v !== "Others (Body)",
                    ),
                  };
                }
                return f;
              });
            }}
            error={errors.partsBodyInjuredOther}
            disabled={readOnly}
          />
        </Panel>
      </div>

      <div className="sr-grid sr-grid--2">
        <Panel title="Medical Diagnosis ＊" error={errors.medicalDiagnosis}>
          <TextArea
            rows={3}
            value={form.medicalDiagnosis}
            onChange={(e) => set("medicalDiagnosis", e.target.value)}
            error={errors.medicalDiagnosis}
            disabled={readOnly}
          />
          <div className="sr-vitals">
            <div className="sr-vitals-head">Vital Signs</div>
            {[
              ["Temperature", "temperature", "vitalsTemperature"],
              ["Blood Pressure", "bloodPressure", "vitalsBloodPressure"],
              ["Pulse Rate", "pulseRate", "vitalsPulseRate"],
              [
                "Blood / Urine Alcohol Concentration",
                "bloodAlcohol",
                "vitalsBloodAlcohol",
              ],
            ].map(([label, key, errKey]) => (
              <div className="sr-vitals-row" key={key}>
                <span className="sr-vitals-label">
                  {label}
                  <Req />
                </span>
                <TextInput
                  value={form.vitals[key]}
                  onChange={(e) => setVital(key, e.target.value)}
                  error={errKey && errors[errKey]}
                  disabled={readOnly}
                />
                {errKey && <ErrorText msg={errors[errKey]} />}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Rehabilitation Plan ＊" error={errors.rehabilitationPlan}>
          <Check
            checked={form.rehabilitationPlan.includes("Fit to Work")}
            onChange={() => toggle("rehabilitationPlan", "Fit to Work")}
            label="Fit to Work"
            disabled={readOnly}
          />
          <div className="sr-sub">
            <Check
              checked={form.rehabilitationPlan.includes(
                "Recommended for Light Works",
              )}
              onChange={() =>
                toggle("rehabilitationPlan", "Recommended for Light Works")
              }
              label="Recommended for Light Works"
              disabled={readOnly}
            />
            <div className="sr-inline-field">
              <span>No. of Days</span>
              <TextInput
                type="number"
                min="0"
                value={form.rehabLightWorkDays}
                onChange={(e) => set("rehabLightWorkDays", e.target.value)}
                error={errors.rehabLightWorkDays}
                disabled={readOnly}
              />
            </div>
            <ErrorText msg={errors.rehabLightWorkDays} />
          </div>
          <Check
            checked={form.rehabilitationPlan.includes(
              "For further medical evaluation",
            )}
            onChange={() =>
              toggle("rehabilitationPlan", "For further medical evaluation")
            }
            label="For further medical evaluation (specify)"
            disabled={readOnly}
          />
          <TextArea
            rows={3}
            value={form.rehabFurtherEval}
            onChange={(e) => set("rehabFurtherEval", e.target.value)}
            error={errors.rehabFurtherEval}
            disabled={readOnly}
          />
        </Panel>
      </div>

      <Panel
        title="Details of Treatment Provided ＊"
        error={errors.detailsOfTreatment}
      >
        <TextArea
          rows={5}
          value={form.detailsOfTreatment}
          onChange={(e) => set("detailsOfTreatment", e.target.value)}
          error={errors.detailsOfTreatment}
          disabled={readOnly}
        />

        {/* ── FILE UPLOAD ── */}
        <TreatmentFileUpload
          accidentId={accidentId}
          currentUser={currentUser}
          files={form.treatmentFiles}
          onUploaded={handleTreatmentFileUploaded}
          onDeleted={handleTreatmentFileDeleted}
          readOnly={readOnly}
        />
      </Panel>
      <div className="sr-grid sr-grid--2">
        <Field
          label="Attending Physician's Name"
          required
          error={errors.attendingPhysician}
        >
          <div style={{ position: "relative" }}>
            <TextInput
              value={attendingPhysicianDisplay}
              disabled={readOnly}
              error={errors.attendingPhysician}
              placeholder={
                isApprover ? "Click Approve to sign" : "Pending approval"
              }
              style={{
                paddingRight: isApprover ? "84px" : undefined,
                background: "var(--sr-paper-alt)",
                color: "var(--sr-muted)",
                cursor: "not-allowed",
              }}
            />
            {isApprover && !readOnly && (
              <button
                type="button"
                onClick={handleApprove}
                style={{
                  position: "absolute",
                  right: "5px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#fff",
                  background: "#1B5E44",
                  border: "1px solid #0F3D2B",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Approve
              </button>
            )}
          </div>
        </Field>
        <Field label="Date/Time" required error={errors.dateTime}>
          <TextInput
            type="datetime-local"
            value={form.dateTime}
            onChange={(e) => set("dateTime", e.target.value)}
            error={errors.dateTime}
            disabled={readOnly}
          />
        </Field>
      </div>

      {confirmDelete && (
        <SafetyAlertModal
          open={!!confirmDelete}
          variant="danger"
          title="Remove this file?"
          message={`"${confirmDelete}" will be permanently deleted and cannot be recovered.`}
          confirmLabel="Yes, remove"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmApproveOpen && (
        <SafetyAlertModal
          open={confirmApproveOpen}
          variant="success"
          title="Approve this report?"
          message="Are you sure you want to approve this report? This will sign the Attending Physician's Name and Signature field with your name and the current date/time."
          confirmLabel="Yes, approve"
          cancelLabel="Cancel"
          onConfirm={handleApproveConfirmed}
          onCancel={() => setConfirmApproveOpen(false)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 4-6 — CLASSIFICATION & RISK ASSESSMENT
   ════════════════════════════════════════════════════════════════════════ */

const makeSection4 = () => ({
  injurySubType: [],
  illnesses: [],
  equipmentApplicable: [],
  equipmentName: "",
  operatorName: "",
  equipmentId: "",
  damageCost: "",
  remarks: "",
  severity: "",
  likelihood: "",
});

function validateSection4(form) {
  const errors = {};
  if (form.injurySubType.length === 0)
    errors.injurySubType = "Select at least one injury sub type.";
  if (form.illnesses.length === 0)
    errors.illnesses = "Select at least one illness classification.";
  if (form.equipmentApplicable.length === 0)
    errors.equipmentApplicable =
      "Select at least one equipment type (or indicate not applicable).";

  const equipmentIsApplicable =
    form.equipmentApplicable.length > 0 &&
    !form.equipmentApplicable.includes("Not Applicable");

  if (equipmentIsApplicable) {
    if (isEmpty(form.equipmentName))
      errors.equipmentName = "Equipment name is required.";
    if (isEmpty(form.operatorName))
      errors.operatorName = "Operator name is required.";
    if (isEmpty(form.equipmentId))
      errors.equipmentId = "Equipment ID is required.";
    if (isEmpty(form.damageCost)) {
      errors.damageCost = "Damage cost is required (enter 0 if none).";
    } else if (!isValidNumber(form.damageCost) || Number(form.damageCost) < 0) {
      errors.damageCost = "Enter a valid, non-negative amount.";
    }
    if (isEmpty(form.remarks)) errors.remarks = "Remarks are required.";
  }

  if (isEmpty(form.severity)) errors.severity = "Select a severity level.";
  if (isEmpty(form.likelihood))
    errors.likelihood = "Select a likelihood level.";
  return errors;
}

const SEVERITY_LEVELS = [
  {
    value: "5",
    label: "Catastrophic (5)",
    desc: "Fatality or Permanent Disability or Stoppage of Process/ Operation or Property Damage Cost Amounting to >Php500,000.00",
  },
  {
    value: "4",
    label: "Major (4)",
    desc: "Major Injury/ Illnesses or Property Damage Cost between > Php50,000.00 to Php500,000.00",
  },
  {
    value: "3",
    label: "Moderate (3)",
    desc: "Temporary Disability or Lost Time Accident or Property Damage Cost between > Php20,000.00 to Php50,000.00",
  },
  {
    value: "2",
    label: "Minor (2)",
    desc: "Minor/ First Aid Injury or Non-Lost Time Accident or Property Damage Cost between ≥ Php5,000.00 to Php20,000.00",
  },
  {
    value: "1",
    label: "Insignificant (1)",
    desc: "No injury/illness or Property Damage Cost less than Php5,000.00",
  },
];

const LIKELIHOOD_LEVELS = [
  {
    value: "5",
    label: "Almost Certain (5)",
    desc: "Will happen or recur at least daily.",
  },
  {
    value: "4",
    label: "Likely (4)",
    desc: "Will probably happen or recur at least weekly.",
  },
  {
    value: "3",
    label: "Occasionally (3)",
    desc: "Will happen or recur at least monthly.",
  },
  {
    value: "2",
    label: "Unlikely (2)",
    desc: "Will happen or recur at least annually.",
  },
  {
    value: "1",
    label: "Rare (1)",
    desc: "Will probably never happen or recur for years.",
  },
];

const RISK_CATEGORIES = [
  {
    key: "EXTREME",
    range: "20–25",
    min: 20,
    max: 25,
    desc: "Unacceptable risk which requires urgent action to control the hazard; activity will be stopped until hazard is corrected.",
  },
  {
    key: "HIGH",
    range: "12–16",
    min: 12,
    max: 16,
    desc: "Unacceptable risk which requires immediate action to control the hazard.",
  },
  {
    key: "MODERATE",
    range: "6–10",
    min: 6,
    max: 10,
    desc: "Tolerable risk which requires a further planned approach in controlling the hazards; risks need to be reviewed periodically.",
  },
  {
    key: "LOW",
    range: "3–5",
    min: 3,
    max: 5,
    desc: "May be considered as acceptable risk. If it can be resolved quickly and efficiently, control measures should be implemented. Reviewed periodically.",
  },
  {
    key: "NEGLIGIBLE",
    range: "1–2",
    min: 1,
    max: 2,
    desc: "Acceptable risk — control may not be necessary.",
  },
];

function getRiskCategoryKey(score) {
  if (!score) return null;
  const cat = RISK_CATEGORIES.find((c) => score >= c.min && score <= c.max);
  return cat ? cat.key : null;
}
function Section4({ form, setForm, errors, readOnly }) {
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toggle = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }));

  const score =
    form.severity && form.likelihood
      ? Number(form.severity) * Number(form.likelihood)
      : null;
  const activeCategory = getRiskCategoryKey(score);
  const equipmentSectionApplies = form.equipmentApplicable.length > 0;

  return (
    <div className="sr-stack">
      <Plate
        code="SECTION.04"
        title="Accident / Incident & Illness Classification"
      />
      <Panel title="Injury Sub Type ＊" error={errors.injurySubType}>
        <div className="sr-grid sr-grid--3">
          <div>
            <div className="sr-eyebrow">Lost Time Accident (LTA)</div>
            <div className="sr-check-grid">
              <Check
                checked={form.injurySubType.includes("Fatal Accident")}
                onChange={() => toggle("injurySubType", "Fatal Accident")}
                label="Fatal Accident"
                disabled={readOnly}
              />
              <Check
                checked={form.injurySubType.includes("Non-Fatal Accident")}
                onChange={() => toggle("injurySubType", "Non-Fatal Accident")}
                label="Non-Fatal Accident"
                disabled={readOnly}
              />
            </div>
          </div>
          <div>
            <div className="sr-eyebrow">Non-Lost Time Accident</div>
            <div className="sr-check-grid">
              <Check
                checked={form.injurySubType.includes("Minor Injury")}
                onChange={() => toggle("injurySubType", "Minor Injury")}
                label="Minor Injury"
                disabled={readOnly}
              />
            </div>
          </div>
          <div>
            <div className="sr-eyebrow">First Aid</div>
            <div className="sr-check-grid">
              <Check
                checked={form.injurySubType.includes("First Aid Case")}
                onChange={() => toggle("injurySubType", "First Aid Case")}
                label="First Aid Case"
                disabled={readOnly}
              />
            </div>
          </div>
        </div>
      </Panel>
      <Panel title="Illnesses ＊" error={errors.illnesses}>
        <div className="sr-check-grid">
          <Check
            checked={form.illnesses.includes("Work Related")}
            onChange={() => toggle("illnesses", "Work Related")}
            label="Work Related"
            disabled={readOnly}
          />
          <Check
            checked={form.illnesses.includes(
              "Non-Work Related (Personal/Health/Mental Factors)",
            )}
            onChange={() =>
              toggle(
                "illnesses",
                "Non-Work Related (Personal/Health/Mental Factors)",
              )
            }
            label="Non-Work Related (Personal/Health/Mental Factors)"
            disabled={readOnly}
          />
        </div>
      </Panel>

      <Plate
        code="SECTION.05"
        title="Equipment"
        note="Mechanical / Electrical — Required"
      />
      <Panel error={errors.equipmentApplicable}>
        <div className="sr-check-grid">
          <Check
            checked={form.equipmentApplicable.includes("Non-Mobile Equipment")}
            onChange={() =>
              toggle("equipmentApplicable", "Non-Mobile Equipment")
            }
            label="Non-Mobile Equipment"
            disabled={readOnly}
          />
          <Check
            checked={form.equipmentApplicable.includes("Mobile Equipment")}
            onChange={() => toggle("equipmentApplicable", "Mobile Equipment")}
            label="Mobile Equipment"
            disabled={readOnly}
          />
          <Check
            checked={form.equipmentApplicable.includes("Not Applicable")}
            onChange={() => toggle("equipmentApplicable", "Not Applicable")}
            label="Not Applicable"
            disabled={readOnly}
          />
        </div>
        <div className="sr-grid sr-grid--2" style={{ marginTop: "14px" }}>
          <Field
            label="Equipment Name"
            required={
              equipmentSectionApplies &&
              !form.equipmentApplicable.includes("Not Applicable")
            }
            error={errors.equipmentName}
          >
            <TextInput
              value={form.equipmentName}
              onChange={(e) => set("equipmentName", e.target.value)}
              error={errors.equipmentName}
              disabled={
                form.equipmentApplicable.includes("Not Applicable") || readOnly
              }
            />
          </Field>
          <Field
            label="Operator Name"
            required={
              equipmentSectionApplies &&
              !form.equipmentApplicable.includes("Not Applicable")
            }
            error={errors.operatorName}
          >
            <TextInput
              value={form.operatorName}
              onChange={(e) => set("operatorName", e.target.value)}
              error={errors.operatorName}
              disabled={
                form.equipmentApplicable.includes("Not Applicable") || readOnly
              }
            />
          </Field>
          <Field
            label="Equipment ID"
            required={
              equipmentSectionApplies &&
              !form.equipmentApplicable.includes("Not Applicable")
            }
            error={errors.equipmentId}
          >
            <TextInput
              value={form.equipmentId}
              onChange={(e) => set("equipmentId", e.target.value)}
              error={errors.equipmentId}
              disabled={
                form.equipmentApplicable.includes("Not Applicable") || readOnly
              }
            />
          </Field>
          <Field
            label="Damage Cost (PhP)"
            required={
              equipmentSectionApplies &&
              !form.equipmentApplicable.includes("Not Applicable")
            }
            error={errors.damageCost}
          >
            <TextInput
              type="number"
              min="0"
              value={form.damageCost}
              onChange={(e) => set("damageCost", e.target.value)}
              error={errors.damageCost}
              disabled={
                form.equipmentApplicable.includes("Not Applicable") || readOnly
              }
            />
          </Field>
          <Field
            label="Remarks"
            required={
              equipmentSectionApplies &&
              !form.equipmentApplicable.includes("Not Applicable")
            }
            error={errors.remarks}
          >
            <TextInput
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              error={errors.remarks}
              disabled={
                form.equipmentApplicable.includes("Not Applicable") || readOnly
              }
            />
          </Field>
        </div>
      </Panel>

      <Plate code="SECTION.06" title="Risk Assessment" note="Before control" />
      <div className="sr-grid sr-grid--2">
        <Panel title="Severity ＊" error={errors.severity}>
          <div className="sr-radio-list">
            {SEVERITY_LEVELS.map((lvl) => (
              <Radio
                key={lvl.value}
                name="severity"
                checked={form.severity === lvl.value}
                onChange={() => set("severity", lvl.value)}
                label={lvl.label}
                desc={lvl.desc}
                disabled={readOnly}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Likelihood ＊" error={errors.likelihood}>
          <div className="sr-radio-list">
            {LIKELIHOOD_LEVELS.map((lvl) => (
              <Radio
                key={lvl.value}
                name="likelihood"
                checked={form.likelihood === lvl.value}
                onChange={() => set("likelihood", lvl.value)}
                label={lvl.label}
                desc={lvl.desc}
                disabled={readOnly}
              />
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title={`Risk Rating Category (Severity × Likelihood)${score ? ` — Score: ${score}` : ""}`}
      >
        <div className="sr-risk-grid">
          {RISK_CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className={`sr-risk-row sr-risk-row--${cat.key.toLowerCase()}${activeCategory === cat.key ? " sr-risk-row--active" : ""}`}
            >
              <span className="sr-risk-range">{cat.range}</span>
              <span className="sr-risk-key">{cat.key}</span>
              <span className="sr-risk-desc">{cat.desc}</span>
              {activeCategory === cat.key && (
                <span className="sr-risk-flag">CURRENT</span>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 7 — INVESTIGATION
   ════════════════════════════════════════════════════════════════════════ */

const makeSection7 = () => ({
  teamLeader: "",
  startDate: "",
  closeOutDate: "",
  sequenceOfEvents: "",
  factsAndFindings: "",
  personalFactors: [],
  personalFactorsOther: "",
  jobFactors: [],
  jobFactorsOther: "",
  unsafeActs: [],
  unsafeActsSopOther: "",
  unsafeActsTrafficOther: "",
  unsafeActsOther: "",
  unsafeConditions: [],
  unsafeConditionsOther: "",
});

function validateSection7(form) {
  const errors = {};
  if (isEmpty(form.teamLeader))
    errors.teamLeader = "Team leader (investigator) is required.";
  if (isEmpty(form.startDate)) errors.startDate = "Start date is required.";
  else if (isFutureDate(form.startDate))
    errors.startDate = "Cannot be in the future.";
  if (isEmpty(form.closeOutDate))
    errors.closeOutDate = "Close out date is required.";
  else if (
    !isEmpty(form.startDate) &&
    new Date(form.closeOutDate) < new Date(form.startDate)
  ) {
    errors.closeOutDate = "Close out date cannot be before the start date.";
  }
  if (isEmpty(form.sequenceOfEvents))
    errors.sequenceOfEvents = "Sequence of events is required.";
  if (isEmpty(form.factsAndFindings))
    errors.factsAndFindings = "Facts and findings are required.";
  if (form.personalFactors.length === 0 && isEmpty(form.personalFactorsOther))
    errors.personalFactors = "Select at least one personal factor.";
  if (form.jobFactors.length === 0 && isEmpty(form.jobFactorsOther))
    errors.jobFactors = "Select at least one job factor.";
  if (
    form.unsafeActs.length === 0 &&
    isEmpty(form.unsafeActsSopOther) &&
    isEmpty(form.unsafeActsTrafficOther) &&
    isEmpty(form.unsafeActsOther)
  ) {
    errors.unsafeActs = "Select or specify at least one unsafe act.";
  }
  if (
    form.unsafeConditions.length === 0 &&
    isEmpty(form.unsafeConditionsOther)
  ) {
    errors.unsafeConditions =
      "Select or specify at least one unsafe condition.";
  }
  return errors;
}

const PERSONAL_FACTORS = [
  "Inadequate Physical/ Physiological Capability",
  "Inadequate mental/ Psychological Capability",
  "Physical or Physiological Stress",
  "Mental or Psychological Stress",
  "Lack of Knowledge",
  "Lack of Motivation",
  "Lack of skill",
];
const JOB_FACTORS = [
  "Inadequate Leadership and/or Supervision",
  "Inadequate Engineering",
  "Inadequate Maintenance",
  "Inadequate Tools and Equipment",
  "Inadequate Work Standards and/or Risk Assessment",
  "Inadequate Purchasing",
  "Abuse or Misuse",
  "Exercise Wear and Tear",
];
const UNSAFE_ACTS = [
  "Operating equipment without authority",
  "Failure to warn",
  "Failure to secure personal safety",
  "Operating at improper speed",
  "Making safety devices inoperative",
  "Using defective equipment",
  "Failure to use PPE properly",
  "Improper Loading",
  "Improper position for task",
  "Improper Placement",
  "Servicing equipment in operation",
  "Horseplay",
  "Lack of Hazard Assessment",
  "Under Influence of Alcohol and/or Other Drugs",
  "Not following Covid Protocols",
];
const UNSAFE_CONDITIONS = [
  "Inadequate guards or barriers",
  "Inadequate or improper protective equipment",
  "Defective tools or equipment or materials",
  "Congestion or restricted action",
  "Inadequate warning system (signages, signals)",
  "Fire and explosion hazards",
  "Poor housekeeping/ disorder",
  "Radiation Exposure",
  "Noise Exposure",
  "Temperature extremes (extreme heat/cold)",
  "Inadequate or excess illumination",
  "Inadequate Ventilation",
  "Hazardous environmental conditions",
  "Poorly maintained haul roads",
  "Inadequate Berms",
];

function Section7({ form, setForm, errors, readOnly }) {
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toggle = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }));

  return (
    <div className="sr-stack">
      <Panel>
        <div className="sr-grid sr-grid--3">
          <Field
            label="Team Leader (Investigator)"
            required
            error={errors.teamLeader}
          >
            <TextInput
              value={form.teamLeader}
              onChange={(e) => set("teamLeader", e.target.value)}
              error={errors.teamLeader}
              disabled={readOnly}
            />
          </Field>
          <Field label="Start Date" required error={errors.startDate}>
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              error={errors.startDate}
              disabled={readOnly}
            />
          </Field>
          <Field label="Close Out Date" required error={errors.closeOutDate}>
            <TextInput
              type="date"
              value={form.closeOutDate}
              onChange={(e) => set("closeOutDate", e.target.value)}
              error={errors.closeOutDate}
              disabled={readOnly}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Sequence of Events ＊" error={errors.sequenceOfEvents}>
        <TextArea
          rows={7}
          value={form.sequenceOfEvents}
          onChange={(e) => set("sequenceOfEvents", e.target.value)}
          error={errors.sequenceOfEvents}
          disabled={readOnly}
        />
      </Panel>

      <Panel title="Facts and Findings ＊" error={errors.factsAndFindings}>
        <TextArea
          rows={7}
          value={form.factsAndFindings}
          onChange={(e) => set("factsAndFindings", e.target.value)}
          error={errors.factsAndFindings}
          disabled={readOnly}
        />
      </Panel>

      <Panel title="Findings — Basic Cause / Contributing Factors">
        <div className="sr-grid sr-grid--2">
          <div>
            <div className="sr-eyebrow">Personal Factors ＊</div>
            {errors.personalFactors && (
              <ErrorText msg={errors.personalFactors} />
            )}
            <div className="sr-check-grid sr-check-grid--col">
              {PERSONAL_FACTORS.map((v) => (
                <Check
                  key={v}
                  checked={form.personalFactors.includes(v)}
                  onChange={() => toggle("personalFactors", v)}
                  label={v}
                  disabled={readOnly}
                />
              ))}
              <OtherInput
                label="Others"
                checked={!isEmpty(form.personalFactorsOther)}
                onToggle={() => {}}
                value={form.personalFactorsOther}
                onChange={(e) => set("personalFactorsOther", e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
          <div>
            <div className="sr-eyebrow">Job Factors ＊</div>
            {errors.jobFactors && <ErrorText msg={errors.jobFactors} />}
            <div className="sr-check-grid sr-check-grid--col">
              {JOB_FACTORS.map((v) => (
                <Check
                  key={v}
                  checked={form.jobFactors.includes(v)}
                  onChange={() => toggle("jobFactors", v)}
                  label={v}
                  disabled={readOnly}
                />
              ))}
              <OtherInput
                label="Others"
                checked={!isEmpty(form.jobFactorsOther)}
                onToggle={() => {}}
                value={form.jobFactorsOther}
                onChange={(e) => set("jobFactorsOther", e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Findings — Direct Cause">
        <div className="sr-grid sr-grid--2">
          <div>
            <div className="sr-eyebrow">Substandard / Unsafe Acts ＊</div>
            {errors.unsafeActs && <ErrorText msg={errors.unsafeActs} />}
            <div className="sr-check-grid sr-check-grid--col">
              {UNSAFE_ACTS.map((v) => (
                <Check
                  key={v}
                  checked={form.unsafeActs.includes(v)}
                  onChange={() => toggle("unsafeActs", v)}
                  label={v}
                  disabled={readOnly}
                />
              ))}
              <OtherInput
                label="Not following SOP (specify)"
                checked={!isEmpty(form.unsafeActsSopOther)}
                onToggle={() => {}}
                value={form.unsafeActsSopOther}
                onChange={(e) => set("unsafeActsSopOther", e.target.value)}
                disabled={readOnly}
              />
              <OtherInput
                label="Not following Traffic Rules (specify)"
                checked={!isEmpty(form.unsafeActsTrafficOther)}
                onToggle={() => {}}
                value={form.unsafeActsTrafficOther}
                onChange={(e) => set("unsafeActsTrafficOther", e.target.value)}
                disabled={readOnly}
              />
              <OtherInput
                label="Others (specify)"
                checked={!isEmpty(form.unsafeActsOther)}
                onToggle={() => {}}
                value={form.unsafeActsOther}
                onChange={(e) => set("unsafeActsOther", e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
          <div>
            <div className="sr-eyebrow">Substandard / Unsafe Conditions ＊</div>
            {errors.unsafeConditions && (
              <ErrorText msg={errors.unsafeConditions} />
            )}
            <div className="sr-check-grid sr-check-grid--col">
              {UNSAFE_CONDITIONS.map((v) => (
                <Check
                  key={v}
                  checked={form.unsafeConditions.includes(v)}
                  onChange={() => toggle("unsafeConditions", v)}
                  label={v}
                  disabled={readOnly}
                />
              ))}
              <OtherInput
                label="Others (specify)"
                checked={!isEmpty(form.unsafeConditionsOther)}
                onToggle={() => {}}
                value={form.unsafeConditionsOther}
                onChange={(e) => set("unsafeConditionsOther", e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 8 — CORRECTIVE & PREVENTATIVE ACTION PLAN
   ════════════════════════════════════════════════════════════════════════ */

let actionItemIdCounter = 1;
const makeActionItem = () => ({
  id: actionItemIdCounter++,
  recommendation: "",
  responsibleDept: "",
  responsiblePerson: "",
  dueDate: "",
  completionDate: "",
  status: "Open",
  proofAttachments: [],
  remarks: "",
  extensionRequests: [],
  extensionRequestDate: "", // ← ADD
  extensionRequestRemarks: "", // ← ADD
});

const makeSection8 = () => ({
  actionItems: [
    makeActionItem(),
    makeActionItem(),
    makeActionItem(),
    makeActionItem(),
    makeActionItem(),
  ],
  concernedDeptName: "",
  concernedDeptSignature: "",
  concernedDeptDate: "",
  concernedDeptRemarks: "",
  groupManagerName: "",
  groupManagerSignature: "",
  groupManagerDate: "",
  groupManagerRemarks: "",
  safetyManagerName: "",
  safetyManagerSignature: "",
  safetyManagerDate: "",
  safetyManagerRemarks: "",
  dataManagement: [],
  attachments: [],
  additionalNotes: "",
  attachmentFiles: [],
});
function validateSection8(form) {
  const errors = { items: {} };
  const filledItems = form.actionItems.filter(
    (it) =>
      it.recommendation ||
      it.responsibleDept ||
      it.responsiblePerson ||
      it.dueDate ||
      it.remarks,
  );
  if (filledItems.length === 0)
    errors.actionItems =
      "Add at least one corrective/preventative action item.";

  const allCancelled =
    filledItems.length > 0 &&
    filledItems.every(
      (it) => String(it.status || "").toLowerCase() === "cancelled",
    );
  if (allCancelled)
    errors.actionItems =
      "There should be at least one Open or Completed item — Cancelled is not allowed if one item or all items are cancelled.";

  form.actionItems.forEach((it) => {
    const hasAny =
      it.recommendation ||
      it.responsibleDept ||
      it.responsiblePerson ||
      it.dueDate ||
      it.remarks;
    if (hasAny) {
      const rowErr = {};
      if (isEmpty(it.recommendation)) rowErr.recommendation = "Required";
      if (isEmpty(it.responsibleDept)) rowErr.responsibleDept = "Required";
      if (isEmpty(it.responsiblePerson)) rowErr.responsiblePerson = "Required";
      if (isEmpty(it.dueDate)) rowErr.dueDate = "Required";
      if (Object.keys(rowErr).length) errors.items[it.id] = rowErr;
    }

    // Completed items must have proof of completion and remarks
    // Completed items must have proof of completion and remarks
    if (it.status === "completed") {
      const completionErr = errors.items[it.id] || {};
      if (!it.proofAttachments || it.proofAttachments.length === 0) {
        completionErr.proofAttachments =
          "Proof of completion is required before marking this item as completed.";
      }
      if (isEmpty(it.remarks)) {
        completionErr.remarks =
          "Remarks are required before marking this item as completed.";
      }
      if (Object.keys(completionErr).length)
        errors.items[it.id] = completionErr;
    }

    // Cancelled items must have remarks explaining the cancellation
    if (it.status === "cancelled") {
      const cancelErr = errors.items[it.id] || {};
      if (isEmpty(it.remarks)) {
        cancelErr.remarks =
          "Remarks are required before marking this item as cancelled.";
      }
      if (Object.keys(cancelErr).length) errors.items[it.id] = cancelErr;
    }
  });

  if (form.dataManagement.length === 0)
    errors.dataManagement = "Select at least one data management action.";

  if (!form.attachments || form.attachments.length === 0)
    errors.attachments = "Select at least one attachment type.";

  if (!form.attachmentFiles || form.attachmentFiles.length === 0)
    errors.attachmentFiles = "At least one supporting file must be uploaded.";

  return errors;
}

function AttachmentFileUpload({
  accidentId,
  currentUser,
  files = [],
  onUploaded,
  onDeleted,
  readOnly,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const inputRef = useRef(null);
  const notify = useNotification();
  const EXT_META = {
    pdf: {
      icon: "ti-file-type-pdf",
      bg: "#FEE2E2",
      color: "#991B1B",
      label: "PDF",
    },
    doc: {
      icon: "ti-file-type-doc",
      bg: "#DBEAFE",
      color: "#1E3A8A",
      label: "DOC",
    },
    docx: {
      icon: "ti-file-type-doc",
      bg: "#DBEAFE",
      color: "#1E3A8A",
      label: "DOC",
    },
    xls: {
      icon: "ti-file-type-xls",
      bg: "#D1FAE5",
      color: "#064E3B",
      label: "XLS",
    },
    xlsx: {
      icon: "ti-file-type-xls",
      bg: "#D1FAE5",
      color: "#064E3B",
      label: "XLS",
    },
    jpg: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
    jpeg: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
    png: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
    gif: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
    webp: { icon: "ti-photo", bg: "#FEF9C3", color: "#78350F", label: "IMG" },
  };

  const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

  const getExt = (name = "") => name.split(".").pop().toLowerCase();
  const getMeta = (name) =>
    EXT_META[getExt(name)] ?? {
      icon: "ti-file",
      bg: "#F3F4F6",
      color: "#374151",
      label: getExt(name).toUpperCase(),
    };
  const isImage = (name) => IMAGE_EXTS.has(getExt(name));
  const isPdf = (name) => getExt(name) === "pdf";

  const getFileUrl = (f) =>
    `${config.baseApi}/accident/attachment-file/${f.file_name}`;

  const handleView = (f) => {
    const url = getFileUrl(f);
    const name = f.original_name || f.file_name;

    if (isImage(name) || isPdf(name)) {
      setPreviewFile({ url, name, type: isImage(name) ? "image" : "pdf" });
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
  };

  //attachment file uplaod

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadError("");
    setUploading(true);

    const MIN_SPINNER_MS = 5000;
    const minDelay = new Promise((resolve) =>
      setTimeout(resolve, MIN_SPINNER_MS),
    );

    try {
      const uploads = files.map((file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("accident_id", accidentId);
        formData.append("uploaded_by", currentUser || "");

        return axios.post(
          `${config.baseApi}/accident/upload-attachment-file`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      });

      const [results] = await Promise.all([Promise.all(uploads), minDelay]);

      onUploaded(results.map((res) => res.data.file));

      notify.success("Uploaded ", "File uploaded successfully.", 2000);
    } catch (err) {
      await minDelay;
      setUploadError(
        err.response?.data?.error || "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--sr-ink-soft)",
            }}
          >
            Attachments
          </div>
          <div
            style={{
              fontSize: "10.5px",
              color: "var(--sr-muted)",
              marginTop: "1px",
            }}
          >
            PDF, Word, Excel, or image · max 20 MB
          </div>
        </div>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 14px",
            background: uploading ? "var(--sr-paper-alt)" : "#0F3D2B",
            border: `1.5px solid ${uploading ? "var(--sr-line-strong)" : "#1B5E44"}`,
            borderRadius: "7px",
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading || readOnly ? 0.45 : 1,
            pointerEvents: readOnly ? "none" : "auto",
            fontSize: "12px",
            fontWeight: 600,
            color: uploading ? "var(--sr-muted)" : "#fff",
            letterSpacing: "0.02em",
            transition: "background 0.15s, border-color 0.15s",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "13px" }}>{uploading ? "⏳" : "↑"}</span>
          {uploading ? "Uploading…" : "Attach File"}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
            style={{ display: "none" }}
            multiple
            onChange={handleUpload}
            disabled={uploading || readOnly}
          />
        </label>
      </div>
      {uploading && (
        <div style={{ marginTop: "10px" }}>
          <LoadingSpinner label="Uploading file, please wait…" />
        </div>
      )}

      {uploadError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 13px",
            marginBottom: "10px",
            background: "var(--sr-danger-soft)",
            border: "1px solid var(--sr-danger)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "var(--sr-danger)",
            fontWeight: 600,
          }}
        >
          <span>⚠</span>
          {uploadError}
        </div>
      )}

      {files.length > 0 ? (
        <div
          style={{
            border: "1px solid var(--sr-line)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {files.map((f, idx) => {
            const meta = getMeta(f.original_name || f.file_name);
            const name = f.original_name || f.file_name;
            const canPreview = isImage(name) || isPdf(name);

            return (
              <div
                key={f.file_name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  background:
                    idx % 2 === 0 ? "var(--sr-paper)" : "var(--sr-paper-alt)",
                  borderTop: idx === 0 ? "none" : "1px solid var(--sr-line)",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: meta.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "8px",
                      fontWeight: 700,
                      color: meta.color,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {meta.label}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    onClick={() => handleView(f)}
                    title={
                      canPreview ? "Click to preview" : "Click to download"
                    }
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--sr-amber)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textDecorationStyle: "dotted",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    {name}
                  </div>
                  {f.uploaded_at && (
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "var(--sr-muted)",
                        marginTop: "1px",
                      }}
                    >
                      Uploaded{" "}
                      {new Date(f.uploaded_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleView(f)}
                  title={canPreview ? "Preview file" : "Download file"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    height: "26px",
                    flexShrink: 0,
                    background: "transparent",
                    border: "1px solid var(--sr-line-strong)",
                    borderRadius: "5px",
                    color: "var(--sr-ink-soft)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition:
                      "border-color 0.12s, color 0.12s, background 0.12s",
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--sr-amber)";
                    e.currentTarget.style.color = "var(--sr-amber)";
                    e.currentTarget.style.background = "var(--sr-amber-soft)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--sr-line-strong)";
                    e.currentTarget.style.color = "var(--sr-ink-soft)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {canPreview ? "👁 View" : "↓ Download"}
                </button>

                <button
                  type="button"
                  onClick={() => onDeleted(f.file_name)}
                  title="Remove file"
                  disabled={readOnly}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "26px",
                    height: "26px",
                    flexShrink: 0,
                    background: "transparent",
                    border: "1px solid var(--sr-line-strong)",
                    borderRadius: "5px",
                    color: "var(--sr-muted)",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition:
                      "border-color 0.12s, color 0.12s, background 0.12s",
                    opacity: readOnly ? 0.4 : 1,
                    pointerEvents: readOnly ? "none" : "auto",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--sr-danger)";
                    e.currentTarget.style.color = "var(--sr-danger)";
                    e.currentTarget.style.background = "var(--sr-danger-soft)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--sr-line-strong)";
                    e.currentTarget.style.color = "var(--sr-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            border: "1.5px dashed var(--sr-line-strong)",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            background: "var(--sr-paper-alt)",
          }}
        >
          <div style={{ fontSize: "22px", marginBottom: "6px", opacity: 0.4 }}>
            📄
          </div>
          <div style={{ fontSize: "12px", color: "var(--sr-muted)" }}>
            No attachments yet
          </div>
        </div>
      )}

      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1A2A38",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#E8F4EF",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {previewFile.name}
              </span>

              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    background: "#0F3D2B",
                    border: "1px solid #1B5E44",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  ↗ Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "6px",
                    color: "#8AA4B8",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: "auto", background: "#111C27" }}>
              {previewFile.type === "image" ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    margin: "auto",
                    padding: "16px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  style={{
                    width: "100%",
                    height: "75vh",
                    border: "none",
                    display: "block",
                  }}
                />
              )}
            </div>
          </div>

          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "11px",
              marginTop: "10px",
            }}
          >
            Click outside to close
          </p>
        </div>
      )}
    </div>
  );
}

const DATA_MANAGEMENT_ITEMS = [
  "Investigation information entered to Database",
  "Copy forwarded to affected person and/or originator",
];
const ATTACHMENT_ITEMS = [
  "Involved Person(s)/ Witness Statement",
  "Photo Documentations",
  "Re-enactment",
  "Medical/ Laboratory Test Results",
  "Equipment Report/ Assessment",
  "Industrial Accident Injury Slip",
];

function ProofAttachmentUpload({
  accidentId,
  currentUser,
  itemIndex,
  files = [],
  onUploaded,
  onDeleted,
  readOnly,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const [confirmDelete, setConfirmDelete] = useState(null); // file_name pending deletion, or null
  const inputRef = useRef(null);
  const notify = useNotification();

  const getExt = (name = "") => name.split(".").pop().toLowerCase();
  const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
  const isImage = (name) => IMAGE_EXTS.has(getExt(name));
  const isPdf = (name) => getExt(name) === "pdf";

  const getFileUrl = (f) =>
    `${config.baseApi}/accident/proof-attachment-file/${f.file_name}`;

  const handleView = (f) => {
    const url = getFileUrl(f);
    const name = f.original_name || f.file_name;

    if (isImage(name) || isPdf(name)) {
      setPreviewFile({ url, name, type: isImage(name) ? "image" : "pdf" });
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadError("");
    setUploading(true);

    const MIN_SPINNER_MS = 5000;
    const minDelay = new Promise((resolve) =>
      setTimeout(resolve, MIN_SPINNER_MS),
    );

    try {
      const uploads = files.map((file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("accident_id", accidentId);
        formData.append("uploaded_by", currentUser || "");
        return axios.post(
          `${config.baseApi}/accident/upload-proof-attachment-file`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
      });

      const [results] = await Promise.all([Promise.all(uploads), minDelay]);
      onUploaded(results.map((res) => res.data.file));

      notify.success("Uploaded ", "File uploaded successfully.", 2000);
    } catch (err) {
      await minDelay;
      setUploadError(
        err.response?.data?.error || "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDeleteConfirmed = async () => {
    const fileName = confirmDelete;
    try {
      await axios.delete(
        `${config.baseApi}/accident/delete-proof-attachment-file`,
        {
          data: {
            accident_id: accidentId,
            file_name: fileName,
            deleted_by: currentUser,
          },
        },
      );
      onDeleted(fileName);

      notify.success("Deleted ", "File deleted successfully.", 2000);
    } catch {
      notify.error("Error", "Failed to delete file. Please try again.");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--sr-ink-soft)",
          }}
        >
          Proof of Completion
        </span>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            background: uploading ? "var(--sr-paper-alt)" : "#0F3D2B",
            border: `1px solid ${uploading ? "var(--sr-line-strong)" : "#1B5E44"}`,
            opacity: uploading || readOnly ? 0.45 : 1,
            pointerEvents: readOnly ? "none" : "auto",
            borderRadius: "5px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "11px",
            fontWeight: 600,
            color: uploading ? "var(--sr-muted)" : "#fff",
          }}
        >
          {uploading ? "Uploading…" : "＋ Attach Proof"}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
            multiple
            style={{ display: "none" }}
            onChange={handleUpload}
            disabled={uploading || readOnly}
          />
        </label>
      </div>

      {uploading && (
        <div style={{ marginTop: "8px" }}>
          <LoadingSpinner label="Uploading proof, please wait…" />
        </div>
      )}

      {uploadError && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--sr-danger)",
            marginBottom: "8px",
          }}
        >
          {uploadError}
        </div>
      )}

      {files.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {files.map((f) => (
            <div
              key={f.file_name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 8px",
                background: "var(--sr-paper-alt)",
                border: "1px solid var(--sr-line)",
                borderRadius: "5px",
              }}
            >
              <span
                onClick={() => handleView(f)}
                style={{
                  flex: 1,
                  fontSize: "12px",
                  color: "var(--sr-amber)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                  textUnderlineOffset: "3px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={
                  isImage(f.original_name || f.file_name) ||
                  isPdf(f.original_name || f.file_name)
                    ? "Click to preview"
                    : "Click to download"
                }
              >
                {f.original_name || f.file_name}
              </span>
              <button
                type="button"
                onClick={() => handleView(f)}
                title={
                  isImage(f.original_name || f.file_name) ||
                  isPdf(f.original_name || f.file_name)
                    ? "Preview file"
                    : "Download file"
                }
                style={{
                  background: "transparent",
                  border: "1px solid var(--sr-line-strong)",
                  borderRadius: "4px",
                  color: "var(--sr-ink-soft)",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  cursor: "pointer",
                }}
              >
                {isImage(f.original_name || f.file_name) ||
                isPdf(f.original_name || f.file_name)
                  ? "👁 View"
                  : "↓ Download"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(f.file_name)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--sr-line-strong)",
                  borderRadius: "4px",
                  color: "var(--sr-muted)",
                  fontSize: "11px",
                  padding: "2px 7px",
                  cursor: "pointer",
                }}
                disabled={uploading || readOnly}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            fontSize: "11px",
            color: "var(--sr-muted)",
            fontStyle: "italic",
          }}
        >
          No proof attached yet.
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1A2A38",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#E8F4EF",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {previewFile.name}
              </span>

              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    background: "#0F3D2B",
                    border: "1px solid #1B5E44",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  ↗ Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "6px",
                    color: "#8AA4B8",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: "auto", background: "#111C27" }}>
              {previewFile.type === "image" ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    margin: "auto",
                    padding: "16px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  style={{
                    width: "100%",
                    height: "75vh",
                    border: "none",
                    display: "block",
                  }}
                />
              )}
            </div>
          </div>

          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "11px",
              marginTop: "10px",
            }}
          >
            Click outside to close
          </p>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {confirmDelete && (
        <SafetyAlertModal
          open={!!confirmDelete}
          variant="danger"
          title="Remove this proof attachment?"
          message={`"${confirmDelete}" will be permanently deleted from this corrective action item and cannot be recovered.`}
          confirmLabel="Yes, remove"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   EXTENSION REQUEST MODAL
   ============================================================ */
function ExtensionRequestModal({
  open,
  onClose,
  onConfirm,
  currentDueDate,
  itemTitle,
  loading,
}) {
  const [newDueDate, setNewDueDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNewDueDate("");
      setReason("");
      setError("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (!newDueDate) {
      setError("Please select a new due date.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for the extension.");
      return;
    }
    if (currentDueDate && new Date(newDueDate) <= new Date(currentDueDate)) {
      setError("New due date must be after the current due date.");
      return;
    }
    onConfirm({ newDueDate, reason });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: open ? "flex" : "none",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0D1B2A",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "520px",
          overflow: "hidden",
          fontFamily: "var(--font-body)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            borderLeft: "5px solid #006b05",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#E8F4EF" }}>
            Request Extension
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#8AA4B8",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "#fff",
          }}
        >
          {itemTitle && (
            <div
              style={{
                fontSize: "13px",
                color: "var(--sr-ink-soft)",
                fontWeight: 500,
              }}
            >
              For: <span style={{ color: "var(--sr-ink)" }}>{itemTitle}</span>
            </div>
          )}

          <div style={{ fontSize: "12px", color: "var(--sr-muted)" }}>
            Current due date:{" "}
            <strong style={{ color: "var(--sr-ink)" }}>
              {currentDueDate
                ? new Date(currentDueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Not set"}
            </strong>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#002c19",
                marginBottom: "4px",
              }}
            >
              New Due Date <span style={{ color: "var(--sr-danger)" }}>*</span>
            </label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              style={{
                width: "100%",
                fontFamily: "var(--font-body)",
                fontSize: "13.5px",
                color: "var(--sr-ink)",
                background: "var(--sr-paper-alt)",
                border: "1.5px solid var(--sr-line-strong)",
                borderRadius: "5px",
                padding: "8px 10px",
                outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#002c19",
                marginBottom: "4px",
              }}
            >
              Reason for Extension{" "}
              <span style={{ color: "var(--sr-danger)" }}>*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Explain why an extension is needed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                background: "var(--sr-paper-alt)",
                border: "1.5px solid var(--sr-line-strong)",
                borderRadius: "6px",
                padding: "9px 11px",
                fontSize: "13px",
                color: "var(--sr-ink)",
                fontFamily: "var(--font-body)",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                color: "var(--sr-danger)",
                fontSize: "12px",
                fontWeight: 600,
                background: "var(--sr-danger-soft)",
                padding: "8px 12px",
                borderRadius: "4px",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "flex-end",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "7px 16px",
                background: "transparent",
                border: "1.5px solid rgba(0,0,0,0.12)",
                borderRadius: "6px",
                color: "var(--sr-muted)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                opacity: loading ? 0.45 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: "7px 18px",
                background: "#003f0a",
                border: "1.5px solid #2f662f",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-body)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Submitting…" : "Request Extension"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApproveWithRemarksModal({ open, onClose, onConfirm, title, loading }) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setRemarks("");
      setError("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (!remarks.trim()) {
      setError("Please provide close out remarks.");
      return;
    }
    onConfirm(remarks);
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0D1B2A",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "520px",
          overflow: "hidden",
          fontFamily: "var(--font-body)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            borderLeft: "5px solid #1B5E44",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#E8F4EF" }}>
            Approve Close Out
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#8AA4B8",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "#fff",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12.5px",
              color: "#4a4a4b",
              lineHeight: 1.6,
            }}
          >
            <span style={{ fontWeight: "bold" }}>
              Are you sure you want to approve this report?{" "}
            </span>
            This will sign off {title} with your name and the current date.
          </p>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#002c19",
                marginBottom: "6px",
              }}
            >
              Concerned Department Close Out Remarks{" "}
              <span style={{ color: "var(--sr-danger)" }}>*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Enter close out remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                background: "var(--sr-paper-alt)",
                border: "1.5px solid var(--sr-line-strong)",
                borderRadius: "6px",
                padding: "9px 11px",
                fontSize: "13px",
                color: "var(--sr-ink)",
                fontFamily: "var(--font-body)",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                color: "var(--sr-danger)",
                fontSize: "12px",
                fontWeight: 600,
                background: "var(--sr-danger-soft)",
                padding: "8px 12px",
                borderRadius: "4px",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "7px 16px",
                background: "transparent",
                border: "1.5px solid rgba(0,0,0,0.12)",
                borderRadius: "6px",
                color: "var(--sr-muted)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                opacity: loading ? 0.45 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: "7px 18px",
                background: "#0F3D2B",
                border: "1.5px solid #1B5E44",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-body)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Approving…" : "Yes, approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 8 COMPONENT
   ════════════════════════════════════════════════════════════════════════ */
function Section8({
  form,
  setForm,
  errors,
  accidentId,
  currentUser,
  readOnly,
  groupList,
  form1,
  empPosition,
  empDepartment,
  restrictAdminFields,
  empGroup,
  currentUserFullName,
  onApproveSignOff,
  approveSubmitting,
  savedAllItemsDone, // ← NEW: locks the corrective table after save
}) {
  const notify = useNotification();
  const [deptUsers, setDeptUsers] = useState({});
  const [extensionModal, setExtensionModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [signOffDisplayNames, setSignOffDisplayNames] = useState({});
  const selectedGroupObj = groupList.find((g) => g.group === form1?.group);
  const deptList = selectedGroupObj ? selectedGroupObj.departments : [];

  // Only a department_reviewer whose department matches the report's
  // department may approve the "Concerned Department" close-out sign-off.
  const canApproveConcernedDept =
    empPosition === "department_reviewer" &&
    !isEmpty(empDepartment) &&
    !isEmpty(form1?.department) &&
    empDepartment === form1?.department;

  const canApproveGroupManager =
    empPosition === "group_reviewer" &&
    !isEmpty(empGroup) &&
    !isEmpty(form1?.group) &&
    empGroup === form1?.group;

  const canApproveSafetyManager = empPosition === "safety_head";

  const canEditStatusForItem = (item) => {
    if (empPosition === "safety_reviewer" || empPosition === "safety_head")
      return true;
    if (
      empDepartment &&
      item.responsibleDept &&
      empDepartment === item.responsibleDept
    )
      return true;
    if (
      currentUserFullName &&
      item.responsiblePerson &&
      currentUserFullName === item.responsiblePerson
    )
      return true;
    return false;
  };

  // Fetch users whenever any item's responsibleDept changes
  useEffect(() => {
    const fields = [
      "concernedDeptName",
      "groupManagerName",
      "safetyManagerName",
    ];
    let cancelled = false;

    const fetchNames = async () => {
      const updates = {};
      await Promise.all(
        fields.map(async (field) => {
          const username = form[field];
          if (!username) {
            updates[field] = "";
            return;
          }
          try {
            const res = await axios.get(
              `${config.baseApi}/auth/get-user-by-username`,
              {
                params: { user_name: username },
              },
            );
            const user = Array.isArray(res.data) ? res.data[0] : res.data;
            const fullName = user
              ? `${user.emp_firstname || ""} ${user.emp_lastname || ""}`.trim()
              : "";
            updates[field] = fullName || username;
          } catch {
            updates[field] = username;
          }
        }),
      );
      if (!cancelled)
        setSignOffDisplayNames((prev) => ({ ...prev, ...updates }));
    };
    fetchNames();

    return () => {
      cancelled = true;
    };
  }, [form.concernedDeptName, form.groupManagerName, form.safetyManagerName]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // Lock the corrective action table once all items are completed/cancelled
  // and the report has been saved (savedAllItemsDone comes from savedRef).
  const tableReadOnly = readOnly || savedAllItemsDone;

  const toggle = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }));
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDeleteConfirmed = async () => {
    try {
      await axios.delete(`${config.baseApi}/accident/delete-attachment-file`, {
        data: {
          accident_id: accidentId,
          file_name: confirmDelete,
          deleted_by: currentUser,
        },
      });
      set(
        "attachmentFiles",
        form.attachmentFiles.filter((f) => f.file_name !== confirmDelete),
      );

      notify.success("Deleted ", "File deleted successfully.", 2000);
    } catch (err) {
      notify.error("Error", "Failed to delete file. Please try again.");
    } finally {
      setConfirmDelete(null);
    }
  };

  const setItem = (id, field, value) =>
    setForm((f) => ({
      ...f,
      actionItems: f.actionItems.map((it) =>
        it.id === id ? { ...it, [field]: value } : it,
      ),
    }));
  const setItems = (id, fields) =>
    setForm((f) => ({
      ...f,
      actionItems: f.actionItems.map((it) =>
        it.id === id ? { ...it, ...fields } : it,
      ),
    }));
  const addItem = () =>
    setForm((f) => ({
      ...f,
      actionItems: [...f.actionItems, makeActionItem()],
    }));
  const removeItem = (id) =>
    setForm((f) => ({
      ...f,
      actionItems:
        f.actionItems.length > 1
          ? f.actionItems.filter((it) => it.id !== id)
          : f.actionItems,
    }));

  const handleExtensionRequest = (itemId, currentDueDate, itemTitle) => {
    setExtensionModal({ itemId, currentDueDate, itemTitle });
  };

  const confirmExtension = async ({ newDueDate, reason }) => {
    const itemId = extensionModal.itemId;
    const itemIndex = form.actionItems.findIndex((it) => it.id === itemId);
    const item = form.actionItems[itemIndex];

    try {
      // Persist to DB and log
      await axios.put(`${config.baseApi}/accident/request-extension`, {
        accident_id: accidentId,
        item_index: itemIndex,
        new_due_date: newDueDate,
        reason,
        requested_by: currentUser,
      });

      // Update local state
      const extensionEntry = {
        requestedAt: new Date().toISOString(),
        requestedBy: currentUser,
        originalDueDate: extensionModal.currentDueDate,
        newDueDate,
        reason,
        status: "pending",
      };

      setItems(itemId, {
        extensionRequests: [...(item?.extensionRequests || []), extensionEntry],
        extensionRequestDate: newDueDate,
        extensionRequestRemarks: reason,
      });

      notify.success(
        "EXTENSION REQUESTED",
        "Your extension request has been saved and logged.",
      );
      setExtensionModal(null);
    } catch (err) {
      notify.error(
        "Error",
        err.response?.data?.error ||
          "Failed to request extension. Please try again.",
      );
    }
  };

  const handleDeptChange = (id, dept) => {
    setItems(id, { responsibleDept: dept, responsiblePerson: "" });
    if (!dept || !form1?.group) {
      setDeptUsers((prev) => ({ ...prev, [id]: [] }));
      return;
    }
    axios
      .get(`${config.baseApi}/auth/get-users-by-group-and-department`, {
        params: { emp_group: form1.group, emp_department: dept },
      })
      .then((res) =>
        setDeptUsers((prev) => ({
          ...prev,
          [id]: Array.isArray(res.data) ? res.data : [],
        })),
      )
      .catch(() => setDeptUsers((prev) => ({ ...prev, [id]: [] })));
  };

  const signOff = (
    label,
    nameField,
    dateField,
    remarksField,
    nameErr,
    dateErr,
    canApprove,
    requireRemarks,
  ) => {
    const handleApprove = () => {
      // YYYYYYYYY
      if (nameField === "concernedDeptName") {
        console.log("LATIN KINGS");
      } else if (nameField === "groupManagerName") {
        console.log("BLOODBOUND");
      } else if (nameField === "safetyManagerName") {
        console.log("KINGS CARTEL");
      }

      if (requireRemarks) {
        setApproveModal({ nameField, dateField, remarksField, label });
        return;
      }
      set(nameField, currentUser || "");
      set(dateField, new Date().toISOString().slice(0, 10));
      notify.success("APPROVED", `${label} has been signed off.`);
    };
    return (
      <Panel
        title={
          <>
            <span>{label}</span>
            {canApprove && !readOnly && (
              <button
                type="button"
                onClick={handleApprove}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontFamily: "var(--font-body)", // ← add
                  textTransform: "none", // ← add
                  letterSpacing: "normal", // ← add
                  fontWeight: 600,
                  color: "#fff",
                  background: "#0F3D2B",
                  border: "1.5px solid #1B5E44",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition:
                    "background 0.15s, border-color 0.15s, color 0.15s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1B5E44";
                  e.currentTarget.style.borderColor = "#0F3D2B";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#0F3D2B";
                  e.currentTarget.style.borderColor = "#1B5E44";
                }}
              >
                Approve
              </button>
            )}
          </>
        }
      >
        <div className="sr-grid sr-grid--2">
          <Field label="Name" error={nameErr}>
            <TextInput
              value={signOffDisplayNames[nameField] ?? form[nameField]}
              onChange={(e) => set(nameField, e.target.value)}
              error={nameErr}
              disabled
            />
          </Field>
          <Field label="Date" error={dateErr}>
            <TextInput
              type="date"
              value={form[dateField]}
              onChange={(e) => set(dateField, e.target.value)}
              error={dateErr}
              disabled
            />
          </Field>
        </div>
        <Field label="Remarks" style={{ marginTop: "10px" }}>
          <TextArea
            rows={2}
            value={form[remarksField]}
            onChange={(e) => set(remarksField, e.target.value)}
            disabled
          />
        </Field>
      </Panel>
    );
  };

  return (
    <div className="sr-stack">
      {errors.actionItems && (
        <div className="sr-error-text sr-error-text--block">
          {errors.actionItems}
        </div>
      )}
      <div className="sr-action-list">
        {form.actionItems.map((it, idx) => {
          const rowErr = errors.items[it.id] || {};

          // ── Due date check ──
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let dueDateDiffDays = null;
          if (it.dueDate) {
            const due = new Date(it.dueDate);
            due.setHours(0, 0, 0, 0);
            dueDateDiffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

            if (dueDateDiffDays < 0) {
              console.log(
                `Item ${idx + 1} (${it.recommendation || "no title"}) — OVERDUE by ${Math.abs(dueDateDiffDays)} day(s)`,
              );
            } else if (dueDateDiffDays === 0) {
              console.log(
                `Item ${idx + 1} (${it.recommendation || "no title"}) — DUE TODAY`,
              );
            } else {
              console.log(
                `Item ${idx + 1} (${it.recommendation || "no title"}) — NOT DUE: ${dueDateDiffDays} day(s) before due date`,
              );
            }
          }

          const dueDateStatusLabel = (() => {
            if (dueDateDiffDays === null) return null;
            // if (it.status === 'completed' || it.status === 'cancelled') return null;
            if (dueDateDiffDays < 0) {
              return {
                text: `Overdue by ${Math.abs(dueDateDiffDays)} day${Math.abs(dueDateDiffDays) === 1 ? "" : "s"}`,
                tone: "overdue",
              };
            }
            if (dueDateDiffDays === 0) {
              return { text: "Due today", tone: "today" };
            }
            return {
              text: `Due in ${dueDateDiffDays} day${dueDateDiffDays === 1 ? "" : "s"}`,
              tone: "upcoming",
            };
          })();

          const otherItems = form.actionItems.filter(
            (other) => other.id !== it.id,
          );
          const allOthersCancelled =
            otherItems.length > 0 &&
            otherItems.every(
              (other) =>
                String(other.status || "").toLowerCase() === "cancelled",
            );
          const isSelfNotCancelled =
            String(it.status || "").toLowerCase() !== "cancelled";
          const disableCancelled = allOthersCancelled && isSelfNotCancelled;

          // ADD THIS ↓

          return (
            <div className="sr-action-card" key={it.id}>
              <div className="sr-action-head">
                <span className="sr-action-num">
                  ITEM {String(idx + 1).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  className="sr-action-remove"
                  disabled={
                    form.actionItems.length === 1 || readOnly || tableReadOnly
                  }
                  onClick={() => removeItem(it.id)}
                  title="Remove item"
                >
                  Remove
                </button>
              </div>
              <div className="sr-grid sr-grid--2">
                <Field label="Status" required>
                  <Select
                    value={it.status || "Open"}
                    onChange={(e) => setItem(it.id, "status", e.target.value)}
                    disabled={tableReadOnly}
                  >
                    <option value="open">Open</option>
                    <option value="completed">Completed</option>
                    <option
                      value="cancelled"
                      disabled={disableCancelled}
                      title={
                        disableCancelled
                          ? "Cannot cancel — at least one item must remain Open or Completed"
                          : undefined
                      }
                    >
                      Cancelled
                    </option>
                  </Select>
                </Field>

                <Field
                  label={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        Due Date <span className="sr-req">＊</span>
                      </span>
                      {!readOnly ||
                        (!tableReadOnly && (
                          <div
                            className="sr-label-extention"
                            onClick={() =>
                              handleExtensionRequest(
                                it.id,
                                it.dueDate,
                                it.recommendation || `Item ${idx + 1}`,
                              )
                            }
                          >
                            Request Extension
                          </div>
                        ))}
                    </div>
                  }
                  required={false}
                  error={rowErr.dueDate}
                >
                  <div style={{ position: "relative" }}>
                    <input
                      type="date"
                      className="sr-date-input-iconleft"
                      value={it.dueDate}
                      onChange={(e) =>
                        setItem(it.id, "dueDate", e.target.value)
                      }
                      style={{
                        width: "100%",
                        fontFamily: "var(--font-body)",
                        fontSize: "13.5px",
                        color: "var(--sr-ink)",
                        background: "var(--sr-paper-alt)",
                        border: "1.5px solid var(--sr-line-strong)",
                        borderRadius: "5px",
                        padding: "8px 10px",
                        paddingRight: dueDateStatusLabel ? "112px" : "10px",
                        outline: "none",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                        position: "relative",
                      }}
                      disabled={tableReadOnly}
                    />
                    {dueDateStatusLabel && (
                      <span
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          pointerEvents: "none",
                          color:
                            dueDateStatusLabel.tone === "overdue"
                              ? "#B02020"
                              : dueDateStatusLabel.tone === "today"
                                ? "#92400E"
                                : "#1B5E44",
                          background:
                            dueDateStatusLabel.tone === "overdue"
                              ? "var(--sr-danger-soft)"
                              : dueDateStatusLabel.tone === "today"
                                ? "#FEF3C7"
                                : "var(--sr-amber-soft)",
                        }}
                      >
                        {dueDateStatusLabel.tone === "overdue"
                          ? "⚠ "
                          : dueDateStatusLabel.tone === "today"
                            ? "● "
                            : ""}
                        {dueDateStatusLabel.text}
                      </span>
                    )}
                  </div>
                </Field>
              </div>
              <Field
                label="Recommendation(s)"
                required
                error={rowErr.recommendation}
                hint="Refer to inside cover for Hierarchy of Controls"
              >
                <TextArea
                  rows={2}
                  value={it.recommendation}
                  onChange={(e) =>
                    setItem(it.id, "recommendation", e.target.value)
                  }
                  error={rowErr.recommendation}
                  disabled={tableReadOnly}
                />
              </Field>
              <div className="sr-grid sr-grid--3">
                <Field
                  label="Responsible Department"
                  required
                  error={rowErr.responsibleDept}
                >
                  <Select
                    value={it.responsibleDept}
                    onChange={(e) => handleDeptChange(it.id, e.target.value)}
                    error={rowErr.responsibleDept}
                    disabled={tableReadOnly}
                  >
                    <option value="">— Select Department —</option>
                    {it.responsibleDept &&
                      !deptList.some(
                        (d) => d.department === it.responsibleDept,
                      ) && (
                        <option value={it.responsibleDept}>
                          {it.responsibleDept}
                        </option>
                      )}
                    {deptList.map((d) => (
                      <option key={d.id} value={d.department}>
                        {d.department}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Responsible Person"
                  required
                  error={rowErr.responsiblePerson}
                >
                  <Select
                    value={it.responsiblePerson}
                    onChange={(e) =>
                      setItem(it.id, "responsiblePerson", e.target.value)
                    }
                    error={rowErr.responsiblePerson}
                    disabled={readOnly || !it.responsibleDept || tableReadOnly}
                  >
                    <option value="">
                      {!it.responsibleDept
                        ? "Select a department first"
                        : "— Select Person —"}
                    </option>
                    {it.responsiblePerson &&
                      !(deptUsers[it.id] || []).some(
                        (u) =>
                          `${u.emp_firstname} ${u.emp_lastname}`.trim() ===
                          it.responsiblePerson,
                      ) && (
                        <option value={it.responsiblePerson}>
                          {it.responsiblePerson}
                        </option>
                      )}
                    {(deptUsers[it.id] || []).map((u) => {
                      const fullName =
                        `${u.emp_firstname} ${u.emp_lastname}`.trim();
                      return (
                        <option key={u.user_name} value={fullName}>
                          {fullName}
                        </option>
                      );
                    })}
                  </Select>
                </Field>
                <Field label="Completion Date">
                  <TextInput
                    type="date"
                    value={it.completionDate}
                    onChange={(e) =>
                      setItem(it.id, "completionDate", e.target.value)
                    }
                    disabled
                  />
                </Field>
              </div>

              <ProofAttachmentUpload
                accidentId={accidentId}
                currentUser={currentUser}
                itemIndex={idx}
                files={it.proofAttachments || []}
                onUploaded={(newFiles) => {
                  const filesToAdd = Array.isArray(newFiles)
                    ? newFiles
                    : [newFiles];
                  setItem(it.id, "proofAttachments", [
                    ...(it.proofAttachments || []),
                    ...filesToAdd,
                  ]);
                }}
                onDeleted={(fileName) =>
                  setItem(
                    it.id,
                    "proofAttachments",
                    (it.proofAttachments || []).filter(
                      (f) => f.file_name !== fileName,
                    ),
                  )
                }
                readOnly={readOnly || tableReadOnly}
              />
              <ErrorText msg={rowErr.proofAttachments} />

              <Field label="Remarks" error={rowErr.remarks}>
                <textarea
                  rows={2}
                  value={it.remarks}
                  onChange={(e) => setItem(it.id, "remarks", e.target.value)}
                  disabled={readOnly || tableReadOnly}
                  style={{
                    width: "100%",
                    fontFamily: "var(--font-body)",
                    fontSize: "13.5px",
                    color: "var(--sr-ink)",
                    background: "var(--sr-paper-alt)",
                    border: `1.5px solid ${rowErr.remarks ? "var(--sr-danger)" : "var(--sr-line-strong)"}`,
                    borderRadius: "5px",
                    padding: "8px 10px",
                    outline: "none",
                    resize: "vertical",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    opacity: readOnly ? 0.4 : 1,
                    cursor: readOnly ? "not-allowed" : "text",
                  }}
                />
              </Field>

              {/* Extension history display */}
              {(it.extensionRequestDate || it.extensionRequestRemarks) && (
                <div
                  style={{
                    marginTop: "4px",
                    padding: "8px 12px",
                    background: "#dfffe1",
                    border: "1px solid #064600",
                    borderRadius: "4px",
                    fontSize: "11px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#004b00" }}>
                    Extension Requested
                  </div>
                  {it.extensionRequestDate && (
                    <div style={{ color: "#004b00" }}>
                      <strong>Requested Date:</strong>{" "}
                      {new Date(it.extensionRequestDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </div>
                  )}
                  {it.extensionRequestRemarks && (
                    <div style={{ color: "#004b00" }}>
                      <strong>Reason:</strong> {it.extensionRequestRemarks}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="sr-btn sr-btn--ghost1"
        disabled={readOnly || tableReadOnly}
        onClick={addItem}
      >
        + Add Action Item
      </button>

      {(() => {
        const concernedFilled = !isEmpty(form.concernedDeptName);
        const groupFilled = !isEmpty(form.groupManagerName);
        const safetyFilled = !isEmpty(form.safetyManagerName);

        // Only show Close Out approve buttons when every action item is
        // either "completed" or "cancelled" — hide if any are still "open".
        const allItemsDone =
          form.actionItems.length > 0 &&
          form.actionItems.every((it) => {
            const s = String(it.status || "").toLowerCase();
            return s === "completed" || s === "cancelled";
          });

        const showConcernedApprove =
          allItemsDone && !concernedFilled && canApproveConcernedDept;
        const showGroupApprove =
          allItemsDone &&
          concernedFilled &&
          !groupFilled &&
          canApproveGroupManager;
        const showSafetyApprove =
          allItemsDone &&
          concernedFilled &&
          groupFilled &&
          !safetyFilled &&
          canApproveSafetyManager;

        return (
          <>
            {signOff(
              "Concerned Department for Close Out of Event",
              "concernedDeptName",
              "concernedDeptDate",
              "concernedDeptRemarks",
              errors.concernedDeptName,
              errors.concernedDeptDate,
              false, // ← changed
              true,
            )}
            {signOff(
              "Group Manager for Close Out of Event",
              "groupManagerName",
              "groupManagerDate",
              "groupManagerRemarks",
              errors.groupManagerName,
              errors.groupManagerDate,
              false, // ← changed
              true,
            )}
            {signOff(
              "Safety Manager's Close Out of Event",
              "safetyManagerName",
              "safetyManagerDate",
              "safetyManagerRemarks",
              errors.safetyManagerName,
              errors.safetyManagerDate,
              false, // ← changed
              true,
            )}
          </>
        );
      })()}

      <Panel title="Data Management ＊" error={errors.dataManagement}>
        <div className="sr-check-grid">
          {DATA_MANAGEMENT_ITEMS.map((v) => (
            <Check
              key={v}
              checked={form.dataManagement.includes(v)}
              onChange={() => toggle("dataManagement", v)}
              label={v}
              disabled={readOnly || restrictAdminFields}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Others — Attachments" error={errors.attachments}>
        <div className="sr-check-grid">
          {ATTACHMENT_ITEMS.map((v) => (
            <Check
              key={v}
              checked={form.attachments?.includes(v)}
              onChange={() => toggle("attachments", v)}
              label={v}
              disabled={readOnly || restrictAdminFields}
            />
          ))}
        </div>
        <AttachmentFileUpload
          accidentId={accidentId}
          currentUser={currentUser}
          files={form.attachmentFiles || []}
          onUploaded={(newFiles) => {
            const filesToAdd = Array.isArray(newFiles) ? newFiles : [newFiles];
            set("attachmentFiles", [
              ...(form.attachmentFiles || []),
              ...filesToAdd,
            ]);
          }}
          onDeleted={(fileName) => setConfirmDelete(fileName)}
          readOnly={readOnly || restrictAdminFields}
        />
        <ErrorText msg={errors.attachmentFiles} />
      </Panel>
      <Panel title="Additional Notes " error={errors.additionalNotes}>
        <TextArea
          rows={8}
          placeholder="Attach or note additional documentation here…"
          value={form.additionalNotes}
          onChange={(e) => set("additionalNotes", e.target.value)}
          error={errors.additionalNotes}
          disabled={readOnly || restrictAdminFields}
        />
      </Panel>

      {confirmDelete && (
        <SafetyAlertModal
          open={!!confirmDelete}
          variant="danger"
          title="Remove this attachment?"
          message={`"${confirmDelete}" will be permanently deleted and cannot be recovered.`}
          confirmLabel="Yes, remove"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {/* Extension Request Modal */}
      <ExtensionRequestModal
        open={!!extensionModal}
        onClose={() => setExtensionModal(null)}
        onConfirm={confirmExtension}
        currentDueDate={extensionModal?.currentDueDate}
        itemTitle={extensionModal?.itemTitle}
        loading={false}
      />

      <ApproveWithRemarksModal
        open={!!approveModal}
        onClose={() => setApproveModal(null)}
        loading={approveSubmitting}
        title={approveModal?.label}
        onConfirm={async (remarksText) => {
          const success = await onApproveSignOff({
            nameField: approveModal.nameField,
            dateField: approveModal.dateField,
            remarksField: approveModal.remarksField,
            remarksText,
          });
          if (success) {
            setApproveModal(null);
          }
          // if it fails, leave the modal open so they can retry
        }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════
REVIEW & APPROVAL STRIP
════════════════════════════════════════════════════════════════════════ */

function ReviewStatusBadge({ status }) {
  if (!status)
    return (
      <span style={{ color: "var(--sr-muted)", fontSize: "12px" }}>—</span>
    );
  const isDone = status === "done";
  return (
    <span
      className={`sr-review-badge${isDone ? " sr-review-badge--done" : ""}`}
    >
      {isDone ? "Done" : "Ongoing"}
    </span>
  );
}

function RemarksCell({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <td data-label="Remarks">—</td>;

  const isLong = text.length > 80;
  return (
    <td data-label="Remarks" style={{ whiteSpace: "pre-wrap", maxWidth: 260 }}>
      {expanded || !isLong ? text : text.slice(0, 80) + "…"}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{
            marginLeft: 6,
            fontSize: 11,
            color: "var(--sr-amber)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </td>
  );
}

function ReviewApprovalStrip({
  open,
  onToggle,
  reviewers,
  submitRowRole,
  canSubmit,
  onSubmitClick,
}) {
  const doneCount = reviewers.filter((r) => r.status === "done").length;

  return (
    <div className="sr-review-wrap">
      <button type="button" className="sr-review-trigger" onClick={onToggle}>
        <span className="sr-review-trigger-left">
          <span className="sr-review-trigger-title">Review &amp; Approval</span>
          <span className="sr-review-trigger-count">
            {doneCount}/{reviewers.length} done
          </span>
        </span>
        <span
          className={`sr-review-chevron${open ? " sr-review-chevron--open" : ""}`}
        >
          ▼
        </span>
      </button>

      <div className={`sr-review-panel${open ? " sr-review-panel--open" : ""}`}>
        <div className="sr-review-table-wrap">
          <table className="sr-review-table">
            <thead>
              <tr>
                <th>Reviewers</th>
                <th>Name</th> {/* ← ADD */}
                <th>Status</th>
                <th>Date/Time</th>
                <th>Remarks</th>
                {submitRowRole && <th style={{ textAlign: "left" }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {reviewers.map((r) => (
                <tr key={r.role}>
                  <td data-label="Reviewers">{r.role}</td>
                  <td data-label="Name">{r.name || "—"}</td> {/* ← ADD */}
                  <td data-label="Status">
                    <ReviewStatusBadge status={r.status} />
                  </td>
                  <td data-label="Date/Time">
                    {r.dateTime ? new Date(r.dateTime).toLocaleString() : "—"}
                  </td>
                  <RemarksCell text={r.remarks} />
                  {submitRowRole && (
                    <td
                      data-label="Action"
                      style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}
                    >
                      {r.role === submitRowRole && (
                        <button
                          type="button"
                          className="sr-btn sr-btn--submit sr-btn--sm"
                          disabled={!canSubmit}
                          onClick={onSubmitClick}
                          title={
                            !canSubmit
                              ? "Report must be complete and saved before submitting"
                              : undefined
                          }
                        >
                          Resubmit a Review
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/*============================================================================
    SUBMIT REVIEW ANF APPROVAL
=============================================================================*/

function SubmitReviewModal({
  onConfirm,
  onCancel,
  remarks,
  setRemarks,
  loading,
  accidentId,
  accidentMaster,
  empPosition,
}) {
  const m = accidentMaster;
  const isSafetyDone =
    m?.is_safety_personnel === true ||
    m?.is_safety_personnel === 1 ||
    m?.is_safety_personnel === "1";
  const hasSafetyRemarks = !isEmpty(m?.safety_personnel_remarks);
  const isConcernedDone =
    m?.is_concerned_department === true ||
    m?.is_concerned_department === 1 ||
    m?.is_concerned_department === "1";
  const hasConcernedRemarks = !isEmpty(m?.concerned_department_remarks);

  const isGroupDone =
    m?.is_group_manager === true ||
    m?.is_group_manager === 1 ||
    m?.is_group_manager === "1";
  const hasGroupRemarks = !isEmpty(m?.group_manager_remarks);

  const isSafetyDHDone =
    m?.is_safety_dh === true ||
    m?.is_safety_dh === 1 ||
    m?.is_safety_dh === "1";
  const hasSafetyDHRemarks = !isEmpty(m?.safety_dh_remarks);

  console.log(isSafetyDHDone, hasSafetyDHRemarks);
  // Safety reviewer is re-submitting after already having submitted once
  const isSafetyReviewerUpdatingRemarks =
    empPosition === "safety_reviewer" && isSafetyDone && hasSafetyRemarks;

  // Department reviewer is re-submitting after already having submitted once
  const isDeptReviewerUpdatingRemarks =
    empPosition === "department_reviewer" &&
    isConcernedDone &&
    hasConcernedRemarks;

  const isGroupreviewerUpdatingRemarks =
    empPosition === "group_reviewer" && isGroupDone && hasGroupRemarks;

  const isSafetyDHUpdatingRemarks =
    empPosition === "safety_head" && isSafetyDHDone && hasSafetyDHRemarks;

  const getModalMessage = () => {
    if (isSafetyReviewerUpdatingRemarks) {
      return (
        <>
          <span style={{ fontWeight: "bold" }}>
            Are you sure you want to submit this report for review?{" "}
          </span>
          Remarks have already been submitted. Once submitted, this will update
          the safety personnel remarks and the concerned department will be
          notified.
        </>
      );
    }

    if (isDeptReviewerUpdatingRemarks) {
      return (
        <>
          <span style={{ fontWeight: "bold" }}>
            Are you sure you want to submit this report for review?{" "}
          </span>
          Remarks have already been submitted. Once submitted, this will update
          the concerned department remarks and the group manager will be
          notified.
        </>
      );
    }

    if (isGroupreviewerUpdatingRemarks) {
      return (
        <>
          <span style={{ fontWeight: "bold" }}>
            Are you sure you want to submit this report for review?{" "}
          </span>
          Remarks have already been submitted. Once submitted, this will update
          the group manager remarks and the safety department head will be
          notified.
        </>
      );
    }

    if (isSafetyDHUpdatingRemarks) {
      return (
        <>
          <span style={{ fontWeight: "bold" }}>
            Are you sure you want to submit this report for review?{" "}
          </span>
          Remarks have already been submitted. Once submitted, this will update
          the safety department head remarks and all of the reviewers will be
          notified.
        </>
      );
    }

    // Default: first-time submission — work out who gets notified next
    const nextNotifyTarget =
      empPosition === "safety_head"
        ? "all reviewers"
        : empPosition === "group_reviewer"
          ? "safety department head"
          : empPosition === "department_reviewer"
            ? "group manager"
            : "concerned department";
    return (
      <>
        <span style={{ fontWeight: "bold" }}>
          Are you sure you want to submit this report for review?{" "}
        </span>
        Once submitted, the {nextNotifyTarget} will be notified and the report
        will be locked for editing.
      </>
    );
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0D1B2A",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "660px",
          overflow: "hidden",
          fontFamily: "var(--font-body)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            borderLeft: "5px solid rgb(0, 58, 14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#E8F4EF" }}>
            Submit for Remarks
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "#1B8C60",
              background: "rgba(27,140,96,0.12)",
              padding: "3px 8px",
              borderRadius: "4px",
            }}
          >
            {accidentId}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "#fff",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12.5px",
              color: "#4a4a4b",
              lineHeight: 1.6,
            }}
          >
            {getModalMessage()}
          </p>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#002c19",
                marginBottom: "6px",
              }}
            >
              Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Add any notes for the reviewer…"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                background: "#dfdfdf",
                border: "1.5px solid rgba(255,255,255,0.12)",
                borderRadius: "6px",
                padding: "9px 11px",
                fontSize: "13px",
                color: "#1f1f1f",
                fontFamily: "var(--font-body)",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div
            style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: "7px 16px",
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.12)",
                borderRadius: "6px",
                color: "#8AA4B8",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                opacity: loading ? 0.45 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              style={{
                padding: "7px 18px",
                background: "#1B5E44",
                border: "1.5px solid #0F3D2B",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-body)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Submitting…" : "Submit for Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { code: "SECTION.01–02", title: "General Info", short: "General Info" },
  { code: "SECTION.03", title: "Medical Evaluation", short: "Medical Eval." },
  {
    code: "SECTION.04–06",
    title: "Classification & Risk",
    short: "Classification",
  },
  { code: "SECTION.07", title: "Investigation", short: "Investigation" },
  {
    code: "SECTION.08",
    title: "Corrective Actions",
    short: "Corrective Actions",
  },
];

const SECTION_LABELS = {
  1: "General Info (Sections 1–2)",
  3: "Medical Evaluation (Section 3)",
  4: "Classification & Risk (Sections 4–6)",
  7: "Investigation (Section 7)",
  8: "Corrective Actions (Section 8)",
};

export default function ViewReport() {
  const [reviewerNames, setReviewerNames] = useState({});
  const empInfo = JSON.parse(localStorage.getItem("user")) || {};
  const accident_id = new URLSearchParams(window.location.search).get("ACID");
  const [activeTab, setActiveTab] = useState(1);
  const [loading, setLoading] = useState(true);
  const [section1Data, setSection1Data] = useState(null);
  const [accidentMaster, setAccidentMaster] = useState(null);
  const notify = useNotification();
  const styleBlock = <style>{STYLE_SHEET}</style>;

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitRemarks, setSubmitRemarks] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [groupList, setGroupList] = useState([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [form1, setForm1] = useState(null);
  const [form3, setForm3] = useState(makeSection3());
  const [form4, setForm4] = useState(makeSection4());
  const [form7, setForm7] = useState(makeSection7());
  const [form8, setForm8] = useState(makeSection8());
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [topbarApproveModal, setTopbarApproveModal] = useState(null);
  const [userData, setUserData] = useState(null);
  const [section3Approval, setSection3Approval] = useState({
    departmentIds: [],
    positions: [],
  });

  const [logsOpen, setLogsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [existingSection1, setExistingSection1] = useState(false);
  const [existingSection3, setExistingSection3] = useState(false);
  const [existingSection4, setExistingSection4] = useState(false);
  const [existingSection7, setExistingSection7] = useState(false);
  const [existingSection8, setExistingSection8] = useState(false);
  const [isReportComplete, setIsReportComplete] = useState(false);
  const [users, setUsers] = useState([]);
  const [savedAssignments, setSavedAssignments] = useState({});

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await axios.get(`${config.baseApi}/setup/assign-heads/all`);
        setSavedAssignments(res.data.data || {});
      } catch (err) {
        console.error("Failed to fetch head assignments:", err);
      }
    };
    fetchAssignments();
  }, []);

  useEffect(() => {
    axios
      .get(`${config.baseApi}/auth/get-all-users`)
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("Failed to fetch users:", err));
  }, []);

  // ════════════════════════════════════════════════════════════════
  // ACCESS CONTROL
  // ════════════════════════════════════════════════════════════════
  //
  // Three independent ways to earn edit rights on this report — any
  // ONE of them is sufficient, they are not mutually exclusive:
  //
  //   1. LOCATION MATCH — the user's assigned site (`emp_location`)
  //      matches the site this report belongs to (derived from the
  //      accident_id prefix: "SUG-AIRI..." = Underground / "SSF-AIRI..."
  //      = Surface). Grants FULL access to every section.
  //
  //   2. SAFETY PERSONNEL / REVIEWER — position is `safety_personnel`
  //      or `safety-reviewer`. Can edit every report regardless of
  //      site. Grants FULL access to every section.
  //
  //   3. SECTION 3 APPROVER — position + department are on the
  //      configured "section_three_approvers" list. By default this
  //      ONLY unlocks Section 3 (Medical Evaluation). If the approver's
  //      position is ALSO `department-reviewer`, they get promoted to
  //      FULL access (see hasFullAccess below).
  //
  // Everyone else gets read-only access to the whole report.
  //
  // NOTE: this is UI-level gating only. The save/update endpoints must
  // enforce the same rules server-side — disabling inputs client-side
  // does not stop a direct API call.

  // ════════════════════════════════════════════════════════════════
  // ACCESS CONTROL — stage-gated by review/approval progress
  // ════════════════════════════════════════════════════════════════
  //
  // The report's accidentMaster flags (is_safety_personnel,
  // is_concerned_department, is_group_manager, is_safety_dh) define what
  // stage the report is in. Each stage cumulatively opens edit access to
  // one more reviewer position, on top of that position's usual
  // location/group/department match requirement (unchanged from before):
  //
  //   Stage 1 (all flags falsy/empty)                  → safety_reviewer only
  //   Stage 2 (is_safety_personnel truthy, rest falsy)  → + department_reviewer
  //   Stage 3 (+ is_concerned_department truthy)        → + group_reviewer
  //   Stage 4/5 (+ is_group_manager truthy)             → all three keep access;
  //                                                        is_safety_dh does not remove access
  //
  // The safety_personnel and safety_head POSITIONS (distinct from the
  // is_safety_personnel / is_safety_dh FLAGS above) always get full
  // access, at every stage, regardless of location/group/department match.
  //
  // NOTE: UI-level gating only (readOnly on inputs) — the report itself
  // stays viewable to everyone. Save/update endpoints must enforce the
  // same rules server-side.

  const normalizePosition = (p) =>
    p
      ?.toLowerCase()
      .trim()
      .replace(/[-\s]+/g, "_");

  const accidentSite = accident_id?.startsWith("SUG-AIRI")
    ? "SUG"
    : accident_id?.startsWith("SSF-AIRI")
      ? "SSF"
      : null;

  const empLocation = empInfo.emp_location?.toLowerCase();
  const empPosition = normalizePosition(empInfo.emp_position);

  // Rule 1: site/location match (required for safety_reviewer)
  const hasAccess =
    (empLocation === "surface" && accidentSite === "SSF") ||
    (empLocation === "underground" && accidentSite === "SUG");

  // Resolve the setup "department id" for the current user, so it can
  // be compared against section3Approval.departmentIds (ids, not names).
  const empDeptId = (() => {
    const deptName = userData?.emp_department || empInfo.emp_department;
    const groupName = userData?.emp_group || empInfo.emp_group;
    if (!deptName) return null;

    const norm = (s) => s?.toLowerCase().trim();

    for (const g of groupList) {
      if (groupName && norm(g.group) !== norm(groupName)) continue;
      const match = g.departments.find(
        (d) => norm(d.department) === norm(deptName),
      );
      if (match) return match.id;
    }
    return null;
  })();

  // Rule 3: Section 3 approver.
  const isDepartmentReviewer = empPosition === "department_reviewer";
  const isGroupReviewer = empPosition === "group_reviewer";
  const isSafetyHead = empPosition === "safety_head";

  const isSection3Approver =
    !!empPosition &&
    empDeptId !== null &&
    section3Approval.departmentIds.includes(empDeptId) &&
    section3Approval.positions.some(
      (p) => normalizePosition(p) === empPosition,
    );

  const isSection3ApproverDept =
    empDeptId !== null && section3Approval.departmentIds.includes(empDeptId);

  const empDepartment = userData?.emp_department || empInfo.emp_department;
  const empGroup = userData?.emp_group || empInfo.emp_group;

  const isDeptReviewerDeptOnlyMatch =
    isDepartmentReviewer && isSection3Approver && empGroup !== form1?.group;

  const hasGroupMatch =
    !isEmpty(empInfo.emp_group) && empInfo.emp_group === form1?.group;

  const hasGroupDeptMatch =
    hasGroupMatch &&
    !isEmpty(empInfo.emp_department) &&
    empInfo.emp_department === form1?.department;

  const isSafetyPersonnel = empPosition === "safety_personnel";
  const isSafetyReviewer = empPosition === "safety_reviewer";
  const isSafetyPersonnelOrReviewer = isSafetyPersonnel || isSafetyReviewer;

  // Stage gate — which reviewer positions the report's current review
  // progress has unlocked. safety_head isn't listed here because it
  // always has full access (see hasFullAccess below), independent of stage.
  const truthy = (v) => v === true || v === 1 || v === "1";
  const flagSafetyPersonnel = truthy(accidentMaster?.is_safety_personnel);
  const flagConcernedDept = truthy(accidentMaster?.is_concerned_department);
  const flagGroupManager = truthy(accidentMaster?.is_group_manager);

  const stageAllowedPositions = (() => {
    const allowed = ["safety_reviewer"];
    if (flagSafetyPersonnel) allowed.push("department_reviewer");
    if (flagConcernedDept) allowed.push("group_reviewer");
    return allowed;
  })();

  const isLockedBySafetyDH = truthy(accidentMaster?.is_safety_dh);

  const hasFullAccess =
    !isLockedBySafetyDH &&
    (isSafetyPersonnel ||
      (isSafetyHead && flagGroupManager) ||
      (isSafetyReviewer &&
        stageAllowedPositions.includes("safety_reviewer") &&
        hasAccess) ||
      (isDepartmentReviewer &&
        stageAllowedPositions.includes("department_reviewer") &&
        hasGroupDeptMatch) ||
      (isGroupReviewer &&
        stageAllowedPositions.includes("group_reviewer") &&
        hasGroupMatch));
  const isSafetyPersonnelDone =
    accidentMaster?.is_safety_personnel === true ||
    accidentMaster?.is_safety_personnel === 1 ||
    accidentMaster?.is_safety_personnel === "1";

  const isConcernedDeptDone =
    accidentMaster?.is_concerned_department === true ||
    accidentMaster?.is_concerned_department === 1 ||
    accidentMaster?.is_concerned_department === "1";

  const isGroupManagerDone =
    accidentMaster?.is_group_manager === true ||
    accidentMaster?.is_group_manager === 1 ||
    accidentMaster?.is_group_manager === "1";

  const isSafetyDHDone =
    accidentMaster?.is_safety_dh === true ||
    accidentMaster?.is_safety_dh === 1 ||
    accidentMaster?.is_safety_dh === "1";

  // Which reviewer role (if any) the current user holds, and whether
  // THEIR stage is already marked done — this decides topbar vs. table placement.
  const isReviewerRole =
    isSafetyReviewer || isDepartmentReviewer || isGroupReviewer || isSafetyHead;
  const ownStageDone =
    (isSafetyReviewer && isSafetyPersonnelDone) ||
    (isDepartmentReviewer && isConcernedDeptDone) ||
    (isGroupReviewer && isGroupManagerDone) ||
    (isSafetyHead && isSafetyDHDone);

  // Which row in the Review & Approval table gets the inline submit button.
  const submitRowRole =
    isSafetyReviewer && isSafetyPersonnelDone
      ? "Safety Personnel"
      : isDepartmentReviewer && isConcernedDeptDone
        ? "Concerned Department"
        : isGroupReviewer && isGroupManagerDone
          ? "Concerned Group Manager"
          : isSafetyHead && isSafetyDHDone
            ? "Safety Department Head"
            : null;
  // section3 only: dept_reviewer who matches section3 approver dept
  // but does NOT match the section's group+dept (or isn't isDeptReviewerFullAccess)
  const canAccessSection3 =
    !isLockedBySafetyDH &&
    (hasFullAccess ||
      isSection3Approver ||
      isSection3ApproverDept ||
      isDeptReviewerDeptOnlyMatch);

  useEffect(() => {
    if (loading || !groupsLoaded) return;
    if (!hasFullAccess && canAccessSection3) {
      setActiveTab(2);
    }

    if (isSafetyDHDone) {
      setActiveTab(5);
    }
  }, [loading, groupsLoaded, hasFullAccess, canAccessSection3, isSafetyDHDone]);

  // ← ADD THIS
  if (canAccessSection3) {
    console.log("HAS ACCESS ON SECTION #3, THIS USER IS A MEDICAL USER", {
      canAccessSection3,
      hasFullAccess,
      isSection3Approver,
      isSection3ApproverDept,
      isDeptReviewerDeptOnlyMatch,
      empPosition,
      empDeptId,
      section3ApprovalDeptIds: section3Approval.departmentIds,
      section3ApprovalPositions: section3Approval.positions,
    });
  }
  const allCorrectiveActionsDone =
    isSafetyDHDone &&
    form8.actionItems.length > 0 &&
    form8.actionItems.every((it) => {
      const s = String(it.status || "").toLowerCase();
      return s === "completed" || s === "cancelled";
    });

  const accessWarningShown = useRef(false);
  useEffect(() => {
    if (
      !loading &&
      accidentSite &&
      !hasFullAccess &&
      !isSection3Approver &&
      !accessWarningShown.current
    ) {
      accessWarningShown.current = true;
      if (isLockedBySafetyDH && allCorrectiveActionsDone) {
        notify.error(
          "For Closure",
          "This report is now for closure. All corrective actions have been completed or cancelled.",
        );
      } else if (isLockedBySafetyDH) {
        notify.error(
          "Limited Access",
          "You are only allowed to access corrective and prevention action plan",
        );
      } else {
        notify.error("No Access", "You are not allowed to edit on this report");
      }
    }
  }, [
    loading,
    hasFullAccess,
    isSection3Approver,
    accidentSite,
    isLockedBySafetyDH,
    allCorrectiveActionsDone,
  ]);

  // ────────────────────────────────────────────────────────────────

  const [errors1, setErrors1] = useState({ participants: {} });
  const [errors3, setErrors3] = useState({});
  const [errors4, setErrors4] = useState({});
  const [errors7, setErrors7] = useState({});
  const [errors8, setErrors8] = useState({ items: {} });

  const [saveAttempted, setSaveAttempted] = useState(false);
  const savedRef = useRef(null);

  const dirtyRef = useRef({
    s1: false,
    s3: false,
    s4: false,
    s7: false,
    s8: false,
  });
  const setForm1Dirty = (updater) => {
    dirtyRef.current.s1 = true;
    setForm1(updater);
  };
  const setForm3Dirty = (updater) => {
    dirtyRef.current.s3 = true;
    setForm3(updater);
  };
  const setForm4Dirty = (updater) => {
    dirtyRef.current.s4 = true;
    setForm4(updater);
  };
  const setForm7Dirty = (updater) => {
    dirtyRef.current.s7 = true;
    setForm7(updater);
  };
  const setForm8Dirty = (updater) => {
    dirtyRef.current.s8 = true;
    setForm8(updater);
  };

  const isDirty = useMemo(() => {
    if (!savedRef.current) return false;
    return (
      JSON.stringify(form1) !== JSON.stringify(savedRef.current.s1) ||
      JSON.stringify(form3) !== JSON.stringify(savedRef.current.s3) ||
      JSON.stringify(form4) !== JSON.stringify(savedRef.current.s4) ||
      JSON.stringify(form7) !== JSON.stringify(savedRef.current.s7) ||
      JSON.stringify(form8) !== JSON.stringify(savedRef.current.s8)
    );
  }, [form1, form3, form4, form7, form8]);

  const hydrateSection3 = (d) => {
    console.log("RAW SECTION3 DATA:", {
      nature: d.nature_of_injury,
      mechanism: d.mechanism_of_injury,
      contact: d.contact_with_or_exposure_to,
      agency: d.agency_of_injury,
      body: d.parts_of_the_body_injured,
    });
    const nature = splitCsvWithOther(
      d.nature_of_injury,
      NATURE_OF_INJURY_VALUES,
      "|",
    );
    const mechanism = splitCsvWithOther(
      d.mechanism_of_injury,
      MECHANISM_OF_INJURY_VALUES,
      "|",
    );
    const contact = splitCsvWithOther(
      d.contact_with_or_exposure_to,
      CONTACT_EXPOSURE_VALUES,
      "|",
    );
    const agency = splitCsvWithOther(
      d.agency_of_injury,
      AGENCY_OF_INJURY_VALUES,
      "|",
    );
    const body = splitCsvWithOther(
      d.parts_of_the_body_injured,
      PARTS_BODY_INJURED_VALUES,
      "|",
    );

    return {
      recurrentInjury: toYesNo(d.recurrent_injury_illness),
      dateTimeProvided: d.date_and_time_treatment_provided
        ? String(d.date_and_time_treatment_provided).slice(0, 16)
        : "",
      extentOfDisability: fromCSV(d.extent_of_disability),

      natureOfInjury: nature.selected,
      natureOfInjuryOther: nature.otherText,

      mechanismOfInjury: mechanism.selected,
      mechanismOfInjuryOther: mechanism.otherText,

      contactExposure: contact.selected,
      contactExposureOther: contact.otherText,

      agencyOfInjury: agency.selected,
      agencyOfInjuryOther: agency.otherText,

      partsBodyInjured: body.selected,
      partsBodyInjuredOther: body.otherText,

      medicalDiagnosis: d.medical_diagnosis || "",
      vitals: {
        temperature: d.vital_signs_temperature || "",
        bloodPressure: d.blood_preassure || "",
        pulseRate: d.pulse_rate || "",
        bloodAlcohol: d.blood_urine_alcohol_concentration_level || "",
      },
      rehabilitationPlan: fromCSV(d.rehabilitation_plan),
      rehabLightWorkDays: (() => {
        const match = (d.rehabilitation_plan || "").match(
          /Light Work:\s*(\d+)\s*days/,
        );
        return match ? match[1] : "";
      })(),
      rehabFurtherEval: (() => {
        const match = (d.rehabilitation_plan || "").match(
          /Further Evaluation:\s*(.+?)(?:,|$)/,
        );
        return match ? match[1].trim() : "";
      })(),
      detailsOfTreatment: d.details_of_treatment_provided || "",
      attendingPhysician: d.attending_physicians_name_and_signature || "",
      dateTime: d.date_and_time ? String(d.date_and_time).slice(0, 16) : "",
      treatmentFiles: (() => {
        try {
          return d.files_of_treatment_provided
            ? JSON.parse(d.files_of_treatment_provided)
            : [];
        } catch {
          return [];
        }
      })(),
    };
  };

  const hydrateSection4 = (d) => {
    const lta = fromCSV(d.lost_time_accident);
    const nonLta = fromCSV(d.non_lost_time_accident);
    return {
      injurySubType: [...lta, ...nonLta],
      illnesses: fromCSV(d.illnesses),
      equipmentApplicable: fromCSV(d.equipment),
      equipmentName: d.equipment_name || "",
      operatorName: d.operator_name || "",
      equipmentId: d.equipment_id || "",
      damageCost: d.damage_cost_php || "",
      remarks: d.remarks || "",
      severity: d.severity || "",
      likelihood: d.likelihood || "",
    };
  };
  const hydrateSection7 = (d) => {
    const personal = splitCsvWithOther(d.personal_factors, PERSONAL_FACTORS);
    const job = splitCsvWithOther(d.job_factors, JOB_FACTORS);
    const conditions = splitCsvWithOther(
      d.substandard_unsafe_conditions,
      UNSAFE_CONDITIONS,
    );
    const acts = splitUnsafeActs(d.substandard_unsafe_acts);

    return {
      teamLeader: d.team_leader || "",
      startDate: d.start_date ? String(d.start_date).slice(0, 10) : "",
      closeOutDate: d.close_out_date
        ? String(d.close_out_date).slice(0, 10)
        : "",
      sequenceOfEvents: d.sequence_of_events || "",
      factsAndFindings: d.facts_and_findings || "",

      personalFactors: personal.selected,
      personalFactorsOther: personal.otherText,

      jobFactors: job.selected,
      jobFactorsOther: job.otherText,

      unsafeActs: acts.selected,
      unsafeActsSopOther: acts.sopOther,
      unsafeActsTrafficOther: acts.trafficOther,
      unsafeActsOther: acts.other,

      unsafeConditions: conditions.selected,
      unsafeConditionsOther: conditions.otherText,
    };
  };

  const hydrateSection8 = (d) => {
    let actionItems = [];
    try {
      const parsed = JSON.parse(d.corrective_table);
      if (Array.isArray(parsed) && parsed.length > 0) {
        actionItems = parsed.map((it) => ({
          id: actionItemIdCounter++,
          recommendation: it.recommendation || "",
          responsibleDept: it.responsible_department || "",
          responsiblePerson: it.responsible_person || "",
          dueDate: it.due_date || "",
          completionDate: it.completion_date || "",
          status: it.status || "Open",
          proofAttachments: it.proof_attachments || [],
          remarks: it.remarks || "",
          extensionRequests: it.extension_requests || [],
          extensionRequestDate: it.extension_request_date || "", // ← ADD
          extensionRequestRemarks: it.extension_request_remarks || "", // ← ADD
        }));
      } else {
        actionItems = [
          makeActionItem(),
          makeActionItem(),
          makeActionItem(),
          makeActionItem(),
          makeActionItem(),
        ];
      }
    } catch {
      actionItems = [
        makeActionItem(),
        makeActionItem(),
        makeActionItem(),
        makeActionItem(),
        makeActionItem(),
      ];
    }

    let attachmentFiles = [];
    try {
      const parsed = JSON.parse(d.other_attachements);
      attachmentFiles = parsed.filter((entry) => entry.file_name);
    } catch {
      /* keep empty */
    }

    return {
      actionItems,
      concernedDeptName: d.concerned_department_name || "",
      concernedDeptSignature: d.concerned_signature || "",
      concernedDeptDate: d.concerned_date
        ? String(d.concerned_date).slice(0, 10)
        : "",
      groupManagerName: d.group_manager_name || "",
      groupManagerSignature: d.group_manager_signature || "",
      groupManagerDate: d.group_manager_date
        ? String(d.group_manager_date).slice(0, 10)
        : "",
      safetyManagerName: d.safety_manager_name || "",
      safetyManagerSignature: d.safety_manager_signature || "",
      safetyManagerDate: d.safety_manager_date
        ? String(d.safety_manager_date).slice(0, 10)
        : "",
      concernedDeptRemarks: d.concerned_department_remarks || "",
      groupManagerRemarks: d.group_manager_remarks || "",
      safetyManagerRemarks: d.safety_manager_remarks || "",
      dataManagement: fromCSV(d.data_management),
      attachments: fromCSV(d.attachment_checklist),
      additionalNotes: d.additional_notes || "",
      attachmentFiles,
    };
  };

  useEffect(() => {
    if (!form1) return;
    const v1 = validateSection1(form1);
    const v3 = validateSection3(form3);
    const v4 = validateSection4(form4);
    const v7 = validateSection7(form7);
    const v8 = validateSection8(form8);
    setIsReportComplete(
      !hasAnyErrors(v1) &&
        !hasAnyErrors(v3) &&
        !hasAnyErrors(v4) &&
        !hasAnyErrors(v7) &&
        !hasAnyErrors(v8),
    );
  }, [form1, form3, form4, form7, form8]);

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        const res = await axios.get(
          `${config.baseApi}/setup/permissions/section_three_approvers`,
        );
        if (res.data.message === "success") {
          setSection3Approval(res.data.data);
        }
      } catch (err) {
        setSection3Approval({ departmentIds: [], positions: [] });
      }
    };
    fetchApprovers();
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get(`${config.baseApi}/setup/all`);
        if (res.data.message === "success") {
          setGroupList(res.data.data);
        }

        const res1 = await axios.get(
          `${config.baseApi}/auth/get-user-by-username`,
          {
            params: { user_name: empInfo.user_name },
          },
        );
        const data = Array.isArray(res1.data) ? res1.data[0] : res1.data;
        setUserData(data);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      } finally {
        setGroupsLoaded(true);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!accidentMaster) return;

    const usernameMap = {
      safety_personnel: accidentMaster.safety_personnel,
      concerned_department: accidentMaster.concerned_department,
      group_manager: accidentMaster.group_manager,
      safety_dh: accidentMaster.safety_dh,
    };

    const fetchNames = async () => {
      const results = {};
      await Promise.all(
        Object.entries(usernameMap).map(async ([key, username]) => {
          if (!username) return;
          try {
            const res = await axios.get(
              `${config.baseApi}/auth/get-user-by-username`,
              {
                params: { user_name: username },
              },
            );
            // handle both single object and array responses
            const user = Array.isArray(res.data) ? res.data[0] : res.data;
            const fullName = user
              ? `${user.emp_firstname || ""} ${user.emp_lastname || ""}`.trim()
              : "";
            results[key] = fullName || username; // fall back to username if name fields are empty
          } catch {
            results[key] = username; // fall back to username on error
          }
        }),
      );
      setReviewerNames(results);
    };

    fetchNames();
  }, [accidentMaster]);

  const reviewers = useMemo(() => {
    const m = accidentMaster;

    const safetyDone =
      m?.is_safety_personnel === true ||
      m?.is_safety_personnel === 1 ||
      m?.is_safety_personnel === "1";
    const concernedDone =
      m?.is_concerned_department === true ||
      m?.is_concerned_department === 1 ||
      m?.is_concerned_department === "1";
    const groupMgrDone =
      m?.is_group_manager === true ||
      m?.is_group_manager === 1 ||
      m?.is_group_manager === "1";
    const safetyDhDone =
      m?.is_safety_dh === true ||
      m?.is_safety_dh === 1 ||
      m?.is_safety_dh === "1";

    const concernedStatus = !safetyDone
      ? ""
      : concernedDone
        ? "done"
        : "ongoing";
    const groupMgrStatus = !concernedDone
      ? ""
      : groupMgrDone
        ? "done"
        : "ongoing";
    const safetyDhStatus = !groupMgrDone
      ? ""
      : safetyDhDone
        ? "done"
        : "ongoing";

    return [
      {
        role: "Safety Personnel",
        name: reviewerNames.safety_personnel || "—",
        status: safetyDone ? "done" : "ongoing",
        dateTime: m?.safety_personnel_at
          ? new Date(m.safety_personnel_at).toLocaleString()
          : "",
        remarks: m?.safety_personnel_remarks || "",
      },
      {
        role: "Concerned Department",
        name: reviewerNames.concerned_department || "—",
        status: concernedStatus,
        dateTime: m?.concerned_department_at
          ? new Date(m.concerned_department_at).toLocaleString()
          : "",
        remarks: m?.concerned_department_remarks || "",
      },
      {
        role: "Concerned Group Manager",
        name: reviewerNames.group_manager || "—",
        status: groupMgrStatus,
        dateTime: m?.group_manager_at
          ? new Date(m.group_manager_at).toLocaleString()
          : "",
        remarks: m?.group_manager_remarks || "",
      },
      {
        role: "Safety Department Head",
        name: reviewerNames.safety_dh || "—",
        status: safetyDhStatus,
        dateTime: m?.safety_dh_at
          ? new Date(m.safety_dh_at).toLocaleString()
          : "",
        remarks: m?.safety_dh_remarks || "",
      },
    ];
  }, [accidentMaster, reviewerNames]); // ← add reviewerNames to deps

  const displayName = userData
    ? `${userData.emp_firstname || ""} ${userData.emp_lastname || ""}`.trim()
    : form1?.prepared_by || "";

  // ← ADD THESE RIGHT HERE
  const [preparedByDisplay, setPreparedByDisplay] = useState("");
  useEffect(() => {
    const username = form1?.prepared_by;
    if (!username) {
      setPreparedByDisplay("");
      return;
    }
    let cancelled = false;
    axios
      .get(`${config.baseApi}/auth/get-user-by-username`, {
        params: { user_name: username },
      })
      .then((res) => {
        if (cancelled) return;
        const user = Array.isArray(res.data) ? res.data[0] : res.data;
        const fullName = user
          ? `${user.emp_firstname || ""} ${user.emp_lastname || ""}`.trim()
          : "";
        setPreparedByDisplay(fullName || username);
      })
      .catch(() => {
        if (!cancelled) setPreparedByDisplay(username);
      });
    return () => {
      cancelled = true;
    };
  }, [form1?.prepared_by]);

  //fetch-all
  const fetchAll = async () => {
    try {
      const accidentRes1 = await axios.get(
        `${config.baseApi}/accident/get-section-by-review-approval-by-id`,
        { params: { accident_id } },
      );
      setAccidentMaster(accidentRes1.data || null);
      if (
        accidentRes1.data?.is_safety_dh === true ||
        accidentRes1.data?.is_safety_dh === 1 ||
        accidentRes1.data?.is_safety_dh === "1"
      ) {
        console.log("@@@@@@@@@@@@@");
      }
      const res1 = await axios.get(
        `${config.baseApi}/accident/get-section1-by-id`,
        {
          params: { accident_id },
        },
      );
      const data1 = res1.data[0] || null;
      setSection1Data(data1);

      const section1Form = makeSection1(data1);
      setForm1(section1Form);

      const [res3, res46, res7, res8] = await Promise.allSettled([
        axios.get(`${config.baseApi}/accident/get-section3-by-id`, {
          params: { accident_id },
        }),
        axios.get(`${config.baseApi}/accident/get-section46-by-id`, {
          params: { accident_id },
        }),
        axios.get(`${config.baseApi}/accident/get-section7-by-id`, {
          params: { accident_id },
        }),
        axios.get(`${config.baseApi}/accident/get-section8-by-id`, {
          params: { accident_id },
        }),
      ]);

      if (data1) setExistingSection1(true);

      const s3 =
        res3.status === "fulfilled" && res3.value.data
          ? hydrateSection3(res3.value.data)
          : makeSection3();
      const s4 =
        res46.status === "fulfilled" && res46.value.data
          ? hydrateSection4(res46.value.data)
          : makeSection4();
      const s7 =
        res7.status === "fulfilled" && res7.value.data
          ? hydrateSection7(res7.value.data)
          : makeSection7();
      const s8 =
        res8.status === "fulfilled" && res8.value.data
          ? hydrateSection8(res8.value.data)
          : makeSection8();

      const failedSections = [
        res3.status === "rejected" && SECTION_LABELS[3],
        res46.status === "rejected" && SECTION_LABELS[4],
        res7.status === "rejected" && SECTION_LABELS[7],
        res8.status === "rejected" && SECTION_LABELS[8],
      ].filter(Boolean);
      if (failedSections.length > 0) {
        notify.error(
          "LOAD ERROR",
          `Failed to load: ${failedSections.join("; ")}. Data shown may be incomplete.`,
        );
      }

      if (res3.status === "fulfilled" && res3.value.data) {
        setForm3(s3);
        setExistingSection3(true);
      }
      if (res46.status === "fulfilled" && res46.value.data) {
        setForm4(s4);
        setExistingSection4(true);
      }
      if (res7.status === "fulfilled" && res7.value.data) {
        setForm7(s7);
        setExistingSection7(true);
      }
      if (res8.status === "fulfilled" && res8.value.data) {
        setForm8(s8);
        setExistingSection8(true);
      }

      savedRef.current = { s1: section1Form, s3, s4, s7, s8 };

      const v1 = validateSection1(section1Form);
      const v3s =
        res3.status === "fulfilled" && res3.value.data
          ? validateSection3(s3)
          : validateSection3(makeSection3());
      const v4s =
        res46.status === "fulfilled" && res46.value.data
          ? validateSection4(s4)
          : validateSection4(makeSection4());
      const v7s =
        res7.status === "fulfilled" && res7.value.data
          ? validateSection7(s7)
          : validateSection7(makeSection7());
      const v8s =
        res8.status === "fulfilled" && res8.value.data
          ? validateSection8(s8)
          : validateSection8(makeSection8());
      setIsReportComplete(
        !hasAnyErrors(v1) &&
          !hasAnyErrors(v3s) &&
          !hasAnyErrors(v4s) &&
          !hasAnyErrors(v7s) &&
          !hasAnyErrors(v8s),
      );
    } catch (err) {
      console.log("Unable to fetch report data:", err);
      notify.error(
        "LOAD ERROR",
        "Some report data may not have loaded correctly. Please refresh.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchAll();
    };
    document.addEventListener("visibilitychange", onVisible);

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") fetchAll();
    }, 60000); // refresh every 60s while tab is open/visible

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(intervalId);
    };
  }, [accident_id]);

  // Single source of truth for the loading UI — used for both initial fetch and save-in-progress.
  if (loading || !groupsLoaded) return <LoadingSpinner label="Fetching data" />;
  console.table({
    accident_id,
    accidentSite,
    empLocation,
    empPosition,
    hasAccess,
    isSafetyPersonnelOrReviewer,
    isDepartmentReviewer,
    isSection3Approver,
    hasFullAccess,
    canAccessSection3,
    empDeptId,
    section3ApprovalDeptIds: JSON.stringify(section3Approval.departmentIds),
    section3ApprovalPositions: JSON.stringify(section3Approval.positions),
    hasGroupDeptMatch,
    empGroup: empInfo.emp_group,
    empDept: empInfo.emp_department,
    form1Group: form1?.group,
    form1Dept: form1?.department,
    isSection3ApproverDept,
  });

  // ──────────────────────────────────────────────────────────────
  // 🔥 HISTORICAL FLAG
  // ──────────────────────────────────────────────────────────────
  const isHistorical = form1?.data_for === "historical";

  const handleSaveAll = async () => {
    setSaveAttempted(true);

    const anyDirty = Object.values(dirtyRef.current).some(Boolean);

    if (!anyDirty) {
      notify.error("NO CHANGES", "No changes were made.");
      return;
    }

    // Auto-stamp completion date for items marked completed once they've
    // passed validation (proof + remarks present). Only fills it in if it
    // isn't already set, so re-saving later edits doesn't overwrite the
    // original completion date.
    const todayStr = new Date().toISOString().slice(0, 10);

    // Log each item's status right before it gets saved.
    // Log each item's status right before it gets saved.

    const v8 = validateSection8(form8);
    setErrors8(v8);

    const isAllCancelledError =
      v8.actionItems && v8.actionItems.toLowerCase().includes("cancelled");

    if (dirtyRef.current.s8 && isAllCancelledError && !isHistorical) {
      setSaveAttempted(true);
      notify.error(
        "INCOMPLETE REPORT",
        "There should be at least one Open or Completed item — Cancelled is not allowed if one item or all items are cancelled.",
      );
      return;
    }

    const form8ToSave = {
      ...form8,
      actionItems: form8.actionItems.map((it) => {
        if (it.status === "completed") {
          return { ...it, completionDate: todayStr };
        }
        if (it.status === "open") {
          return { ...it, completionDate: "" };
        }
        if (it.status === "cancelled") {
          return { ...it, completionDate: todayStr };
        }
        return it; // e.g. "cancelled" — leave completionDate untouched
      }),
    };

    try {
      const requests = [
        dirtyRef.current.s1 && {
          label: SECTION_LABELS[1],
          call: () =>
            existingSection1
              ? axios.put(`${config.baseApi}/accident/update-section1-report`, {
                  accident_id,
                  ...form1,
                  updated_by: empInfo.user_name,
                })
              : Promise.resolve(),
        },
        dirtyRef.current.s3 && {
          label: SECTION_LABELS[3],
          call: () =>
            existingSection3
              ? axios.put(`${config.baseApi}/accident/update-section3-report`, {
                  accident_id,
                  ...form3,
                  updated_by: empInfo.user_name,
                })
              : axios.post(`${config.baseApi}/accident/add-section3-report`, {
                  accident_id,
                  ...form3,
                  created_by: empInfo.user_name,
                }),
        },
        dirtyRef.current.s4 && {
          label: SECTION_LABELS[4],
          call: () =>
            existingSection4
              ? axios.put(
                  `${config.baseApi}/accident/update-section46-report`,
                  { accident_id, ...form4, updated_by: empInfo.user_name },
                )
              : axios.post(`${config.baseApi}/accident/add-section46-report`, {
                  accident_id,
                  ...form4,
                  created_by: empInfo.user_name,
                }),
        },
        dirtyRef.current.s7 && {
          label: SECTION_LABELS[7],
          call: () =>
            existingSection7
              ? axios.put(`${config.baseApi}/accident/update-section7-report`, {
                  accident_id,
                  ...form7,
                  updated_by: empInfo.user_name,
                })
              : axios.post(`${config.baseApi}/accident/add-section7-report`, {
                  accident_id,
                  ...form7,
                  created_by: empInfo.user_name,
                }),
        },
        dirtyRef.current.s8 && {
          label: SECTION_LABELS[8],
          call: () =>
            existingSection8
              ? axios.put(`${config.baseApi}/accident/update-section8-report`, {
                  accident_id,
                  ...form8ToSave,
                  updated_by: empInfo.user_name,
                })
              : axios.post(`${config.baseApi}/accident/add-section8-report`, {
                  accident_id,
                  ...form8ToSave,
                  created_by: empInfo.user_name,
                }),
        },
      ].filter(Boolean);

      const results = await Promise.allSettled(requests.map((r) => r.call()));
      const serverErrors = results
        .map((result, i) =>
          result.status === "rejected" ? requests[i].label : null,
        )
        .filter(Boolean);

      if (serverErrors.length > 0) {
        notify.error(
          "SAVE FAILED",
          `Failed to save: ${serverErrors.join("; ")}. Please try again.`,
        );
        return;
      }

      // ── Only run status‑changing API calls if NOT historical ──
      if (!isHistorical) {
        const statuses = form8.actionItems.map((it) =>
          String(it.status || "").toLowerCase(),
        );
        const isDH =
          accidentMaster?.is_safety_dh === true ||
          accidentMaster?.is_safety_dh === 1 ||
          accidentMaster?.is_safety_dh === "1";

        const hasOpenItems = form8.actionItems.some(
          (it) => String(it.status || "").toLowerCase() === "open",
        );

        if (isDH && hasOpenItems) {
          try {
            await axios.put(`${config.baseApi}/accident/change-for-closure`, {
              accident_id: accident_id,
              updated_by: empInfo.user_name,
              status: "Pending Corrective and Preventive",
              resetSectionEightSignoffs: true,
            });
          } catch (err) {
            notify.error("Error", "Something went wrong!");
          }
        }

        const allCompleted = statuses.every((s) => s === "completed");
        const allCancelled = statuses.every((s) => s === "cancelled");
        const allOpen = statuses.every((s) => s === "open");
        const allTerminal =
          statuses.length > 0 &&
          statuses.every((s) => s === "completed" || s === "cancelled");

        try {
          if (isDH && allCompleted) {
            await axios.put(`${config.baseApi}/accident/change-for-closure`, {
              accident_id: accident_id,
              updated_by: empInfo.user_name,
              status: "Pending Department Closure",
            });
          } else if (isDH && allCancelled) {
            await axios.put(`${config.baseApi}/accident/change-for-closure`, {
              accident_id: accident_id,
              updated_by: empInfo.user_name,
              status: "Pending Department Closure",
            });
          } else if (isDH && allTerminal) {
            await axios.put(`${config.baseApi}/accident/change-for-closure`, {
              accident_id: accident_id,
              updated_by: empInfo.user_name,
              status: "Pending Department Closure",
            });
          } else if (isDH && allOpen) {
            await axios.put(`${config.baseApi}/accident/change-for-closure`, {
              accident_id: accident_id,
              updated_by: empInfo.user_name,
              status: "Pending Corrective and Preventive",
              resetSectionEightSignoffs: true,
            });
          } else {
            // mixed statuses – do nothing or handle as needed
          }
        } catch (err) {
          notify.error("Error", "Something went wrong! ");
        }
      } // end !isHistorical

      dirtyRef.current = {
        s1: false,
        s3: false,
        s4: false,
        s7: false,
        s8: false,
      };

      const v11c = validateSection1(form1);
      const v31c = validateSection3(form3);
      const v41c = validateSection4(form4);
      const v71c = validateSection7(form7);
      const v81c = validateSection8(form8);

      if (
        !hasAnyErrors(v11c) &&
        !hasAnyErrors(v31c) &&
        !hasAnyErrors(v41c) &&
        !hasAnyErrors(v71c) &&
        !hasAnyErrors(v81c) &&
        !flagSafetyPersonnel
      ) {
        console.log("IIRRRROOONNMAAAAANNNN");

        await axios.post(`${config.baseApi}/accident/notify-all-sr-complete`, {
          accident_id,
          created_by: empInfo.user_name,
        });
      }

      // Reflect the stamped completion date in local state and in the
      // dirty-check baseline, so the UI shows it without a refetch.
      setForm8(form8ToSave);
      savedRef.current = {
        s1: form1,
        s3: form3,
        s4: form4,
        s7: form7,
        s8: form8ToSave,
      };

      const v1c = validateSection1(form1);
      const v3c = validateSection3(form3);
      const v4c = validateSection4(form4);
      const v7c = validateSection7(form7);
      const v8c = validateSection8(form8);
      setIsReportComplete(
        !hasAnyErrors(v1c) &&
          !hasAnyErrors(v3c) &&
          !hasAnyErrors(v4c) &&
          !hasAnyErrors(v7c) &&
          !hasAnyErrors(v8c),
      );

      setExistingSection1(true);
      setExistingSection3(true);
      setExistingSection4(true);
      setExistingSection7(true);
      setExistingSection8(true);

      notify.success("SAVED", "All changes saved successfully!");
      setLoading(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Unexpected error saving report:", err);
      notify.error("ERROR", "An unexpected error occurred. Please try again.");
    }
  };

  const handleSaveSection3Only = async (updatedForm3) => {
    try {
      const payload = {
        accident_id,
        ...updatedForm3,
        treatmentFilesJson: JSON.stringify(updatedForm3.treatmentFiles || []),
        updated_by: empInfo.user_name,
      };

      if (existingSection3) {
        await axios.put(
          `${config.baseApi}/accident/update-section3-report`,
          payload,
        );
      } else {
        await axios.post(`${config.baseApi}/accident/add-section3-report`, {
          ...payload,
          created_by: empInfo.user_name,
        });
        setExistingSection3(true);
      }

      savedRef.current = { ...savedRef.current, s3: updatedForm3 };
      dirtyRef.current.s3 = false;

      notify.success("SAVED", "Section 3 approved and saved successfully!");
      setLoading(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      notify.error("ERROR", "Failed to save after approval. Please try again.");
    }
  };

  const handleApproveSectionEightSignOff = async ({
    nameField,
    dateField,
    remarksField,
    remarksText,
  }) => {
    const updatedForm8 = {
      ...form8,
      [nameField]: empInfo.user_name,
      [dateField]: new Date().toISOString().slice(0, 10),
      [remarksField]: remarksText,
    };

    setApproveSubmitting(true);
    try {
      setLoading(true);
      if (existingSection8) {
        await axios.put(`${config.baseApi}/accident/update-section8-report`, {
          accident_id,
          ...updatedForm8,
          updated_by: empInfo.user_name,
        });
      } else {
        await axios.post(`${config.baseApi}/accident/add-section8-report`, {
          accident_id,
          ...updatedForm8,
          created_by: empInfo.user_name,
        });
        setExistingSection8(true);
      }

      // Sync local state + dirty tracking so it reflects what's now saved
      setForm8(updatedForm8);
      savedRef.current = { ...savedRef.current, s8: updatedForm8 };
      dirtyRef.current.s8 = false;

      // Only update closure status if NOT historical
      if (!isHistorical) {
        if (nameField === "concernedDeptName") {
          await axios.put(`${config.baseApi}/accident/change-closure-status`, {
            accident_id,
            status: "Pending Group Closure",
            updated_by: empInfo.user_name,
          });
        } else if (nameField === "groupManagerName") {
          await axios.put(`${config.baseApi}/accident/change-closure-status`, {
            accident_id,
            status: "Pending Safety DH Closure",
            updated_by: empInfo.user_name,
          });
        } else if (nameField === "safetyManagerName") {
          await axios.put(`${config.baseApi}/accident/change-closure-status`, {
            accident_id,
            status: "Complete",
            updated_by: empInfo.user_name,
          });
        }
      }

      notify.success("APPROVED", "Sign-off saved successfully.");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      return true;
    } catch (err) {
      notify.error(
        "ERROR",
        err.response?.data?.error ||
          "Failed to save sign-off. Please try again.",
      );
      return false;
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (empPosition === "safety_head") {
      const v1 = validateSection1(form1);
      const v3 = validateSection3(form3);
      const v4 = validateSection4(form4);
      const v7 = validateSection7(form7);
      const v8 = validateSection8(form8);

      setErrors1(v1);
      setErrors3(v3);
      setErrors4(v4);
      setErrors7(v7);
      setErrors8(v8);
      setSaveAttempted(true);

      const incompleteSections = [];
      if (hasAnyErrors(v1)) incompleteSections.push(SECTION_LABELS[1]);
      if (hasAnyErrors(v3)) incompleteSections.push(SECTION_LABELS[3]);
      if (hasAnyErrors(v4)) incompleteSections.push(SECTION_LABELS[4]);
      if (hasAnyErrors(v7)) incompleteSections.push(SECTION_LABELS[7]);
      if (hasAnyErrors(v8)) incompleteSections.push(SECTION_LABELS[8]);

      if (incompleteSections.length > 0) {
        notify.error(
          "INCOMPLETE REPORT",
          `All sections must be complete before the Safety Head can submit. Please fix: ${incompleteSections.join("; ")}.`,
        );
        return;
      }
    }
    const m = accidentMaster;
    const isSafetyDone =
      m?.is_safety_personnel === true ||
      m?.is_safety_personnel === 1 ||
      m?.is_safety_personnel === "1";
    const hasSafetyRemarks = !isEmpty(m?.safety_personnel_remarks);
    const isConcernedDone =
      m?.is_concerned_department === true ||
      m?.is_concerned_department === 1 ||
      m?.is_concerned_department === "1";
    const isGroupManagerDone =
      m?.is_group_manager === true ||
      m?.is_group_manager === 1 ||
      m?.is_group_manager === "1";

    const empDepartment = userData?.emp_department || empInfo.emp_department;
    const sectionOneDepartment = form1?.department;
    const empGroup = userData?.emp_group || empInfo.emp_group;
    const sectionOneGroup = form1?.group;

    if (!isSafetyDone) {
      if (empPosition !== "safety_reviewer") {
        notify.error(
          "NOT ALLOWED",
          "Only a Safety Reviewer can submit this report at this stage.",
        );
        return;
      }
    } else if (isConcernedDone && !isGroupManagerDone) {
      if (!sectionOneGroup || empGroup !== sectionOneGroup) {
        notify.error(
          "NOT ALLOWED",
          "You can only submit remarks for reports belonging to your own group.",
        );
        return;
      }
    }

    setSubmitLoading(true);
    try {
      await axios.put(`${config.baseApi}/accident/submit-for-review`, {
        accident_id,
        safety_personnel: empInfo.user_name,
        remarks: submitRemarks.trim(),
        role: empPosition,
      });

      setSubmitModalOpen(false);
      setSubmitRemarks("");
      notify.success("SUBMITTED", "Report submitted successfully.");
      setLoading(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      notify.error(
        "ERROR",
        err.response?.data?.error || "Failed to submit. Please try again.",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleClearAll = () => {
    setForm1(makeSection1(section1Data));
    setForm3(makeSection3());
    setForm4(makeSection4());
    setForm7(makeSection7());
    setForm8(makeSection8());
    setErrors1({ participants: {} });
    setErrors3({});
    setErrors4({});
    setErrors7({});
    setErrors8({ items: {} });
    setSaveAttempted(false);
  };

  const checkReportCompleteness = () => {
    const v1 = validateSection1(form1);
    const v3 = validateSection3(form3);
    const v4 = validateSection4(form4);
    const v7 = validateSection7(form7);
    const v8 = validateSection8(form8);

    setErrors1(v1);
    setErrors3(v3);
    setErrors4(v4);
    setErrors7(v7);
    setErrors8(v8);

    setSaveAttempted(true);

    const incompleteSections = [];
    if (hasAnyErrors(v1)) incompleteSections.push(SECTION_LABELS[1]);
    if (hasAnyErrors(v3)) incompleteSections.push(SECTION_LABELS[3]);
    if (hasAnyErrors(v4)) incompleteSections.push(SECTION_LABELS[4]);
    if (hasAnyErrors(v7)) incompleteSections.push(SECTION_LABELS[7]);
    if (hasAnyErrors(v8)) incompleteSections.push(SECTION_LABELS[8]);

    if (incompleteSections.length === 0) {
      notify.success(
        "COMPLETE",
        "This report is complete and ready for review/approval.",
      );
    } else {
      notify.error(
        "INCOMPLETE REPORT",
        `Please fix errors in: ${incompleteSections.join("; ")}.`,
      );
    }

    return incompleteSections.length === 0;
  };

  const e1 = saveAttempted ? errors1 : { participants: {} };
  const e3 = saveAttempted ? errors3 : {};
  const e4 = saveAttempted ? errors4 : {};
  const e7 = saveAttempted ? errors7 : {};
  const e8 = saveAttempted ? errors8 : { items: {} };

  if (!section1Data || !form1) {
    return (
      <div className="sr-shell sr-shell--center">
        {styleBlock}
        <div>No report data found.</div>
      </div>
    );
  }

  const tabHasError = {
    1: saveAttempted && hasAnyErrors(errors1),
    2: saveAttempted && hasAnyErrors(errors3),
    3: saveAttempted && hasAnyErrors(errors4),
    4: saveAttempted && hasAnyErrors(errors7),
    5: saveAttempted && hasAnyErrors(errors8),
  };

  const allItemsDone =
    form8.actionItems.length > 0 &&
    form8.actionItems.every((it) => {
      const s = String(it.status || "").toLowerCase();
      return s === "completed" || s === "cancelled";
    }) &&
    isSafetyDHDone;

  return (
    <div className="sr-shell">
      {styleBlock}

      {/* ─── TOP HEADER BAR ─── */}
      <div className="sr-topbar-outer">
        <div className="sr-topbar-brand">
          <div className="sr-topbar-brand-left">
            <button
              className="sr-btn-back-inline"
              onClick={() => window.history.back()}
            >
              ← Back to reports
            </button>

            <div className="sr-topbar-divider" />
            <div className="sr-topbar-ref">
              <span className="sr-topbar-ref-label">Reference</span>
              <span className="sr-topbar-ref-val">
                {section1Data.accident_id || "—"}
              </span>
            </div>
            <div>
              <span className="sr-topbar-title">SAIRI</span>
              <span className="sr-topbar-sub">
                Safety Accident / Incident Report and Investigation Form
              </span>
            </div>
          </div>

          <div className="sr-topbar-right">
            <div className="sr-topbar-actions">
              {!isHistorical && (
                <button
                  className="sr-btn sr-btn--ghost sr-btn--sm"
                  onClick={() => setReviewOpen((o) => !o)}
                >
                  Review &amp; Approval
                </button>
              )}
              <button
                className="sr-btn sr-btn--ghost sr-btn--sm"
                onClick={() => setLogsOpen(true)}
              >
                Audit Log
              </button>
              {!isHistorical && (
                <button
                  className="sr-btn sr-btn--ghost sr-btn--sm"
                  onClick={checkReportCompleteness}
                >
                  Check Completeness
                </button>
              )}

              {(hasFullAccess ||
                isSection3Approver ||
                isLockedBySafetyDH ||
                isHistorical) &&
                isDirty && (
                  <button
                    className="sr-btn sr-btn--primary sr-btn--sm"
                    style={{ animation: "sr-pulse 2s infinite" }}
                    onClick={handleSaveAll}
                  >
                    Save Report
                  </button>
                )}
              {!isHistorical &&
                ((hasFullAccess && !isReviewerRole) ||
                  (isReviewerRole && hasFullAccess && !ownStageDone)) &&
                isReportComplete &&
                !isDirty && (
                  <button
                    className="sr-btn sr-btn--submit sr-btn--sm"
                    style={{ animation: "sr-pulse 2s infinite" }}
                    onClick={() => setSubmitModalOpen(true)}
                  >
                    ✓ Submit for Review
                  </button>
                )}

              {!isHistorical &&
                (() => {
                  const allItemsDoneForApproval =
                    form8.actionItems.length > 0 &&
                    form8.actionItems.every((it) => {
                      const s = String(it.status || "").toLowerCase();
                      return s === "completed" || s === "cancelled";
                    });

                  const concernedFilled = !isEmpty(form8.concernedDeptName);
                  const groupFilled = !isEmpty(form8.groupManagerName);
                  const safetyFilled = !isEmpty(form8.safetyManagerName);

                  const showConcernedApprove =
                    allItemsDoneForApproval &&
                    !concernedFilled &&
                    empPosition === "department_reviewer" &&
                    !isEmpty(empDepartment) &&
                    !isEmpty(form1?.department) &&
                    empDepartment === form1?.department;

                  const showGroupApprove =
                    allItemsDoneForApproval &&
                    concernedFilled &&
                    !groupFilled &&
                    empPosition === "group_reviewer" &&
                    !isEmpty(empGroup) &&
                    !isEmpty(form1?.group) &&
                    empGroup === form1?.group;

                  const showSafetyApprove =
                    allItemsDoneForApproval &&
                    concernedFilled &&
                    groupFilled &&
                    !safetyFilled &&
                    empPosition === "safety_head";

                  const whichField = showConcernedApprove
                    ? {
                        nameField: "concernedDeptName",
                        dateField: "concernedDeptDate",
                        remarksField: "concernedDeptRemarks",
                        label: "Concerned Department for Close Out of Event",
                      }
                    : showGroupApprove
                      ? {
                          nameField: "groupManagerName",
                          dateField: "groupManagerDate",
                          remarksField: "groupManagerRemarks",
                          label: "Group Manager for Close Out of Event",
                        }
                      : showSafetyApprove
                        ? {
                            nameField: "safetyManagerName",
                            dateField: "safetyManagerDate",
                            remarksField: "safetyManagerRemarks",
                            label: "Safety Manager's Close Out of Event",
                          }
                        : null;

                  if (!whichField) return null;

                  return (
                    <button
                      key="approve-closure"
                      className="sr-btn sr-btn--sm"
                      style={{
                        background: "#0F3D2B",
                        color: "#fff",
                        borderColor: "#1B5E44",
                        animation: "sr-pulse 2s infinite",
                      }}
                      onClick={() => setTopbarApproveModal(whichField)}
                    >
                      Approve for Closure
                    </button>
                  );
                })()}
            </div>
          </div>
        </div>

        {/* ─── TAB STRIP ─── */}
        <nav className="sr-tabs">
          {STEPS.map((step, i) => {
            const idx = i + 1;
            const hasErr = tabHasError[idx];
            return (
              <button
                key={idx}
                className={`sr-tab${activeTab === idx ? " sr-tab--active" : ""}${hasErr ? " sr-tab--error" : ""}`}
                onClick={() => setActiveTab(idx)}
              >
                <span className="sr-tab-num">{hasErr ? "!" : idx}</span>
                <span className="sr-tab-label">{step.short}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {!isHistorical && (
        <ReviewApprovalStrip
          open={reviewOpen}
          onToggle={() => setReviewOpen((o) => !o)}
          reviewers={reviewers}
          submitRowRole={submitRowRole}
          canSubmit={hasFullAccess && isReportComplete && !isDirty}
          onSubmitClick={() => setSubmitModalOpen(true)}
        />
      )}

      {!hasFullAccess && accidentSite && !isHistorical && (
        <div
          style={{
            background: "#FEF3C7",
            borderBottom: "1px solid #FDE68A",
            padding: "10px 32px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#92400E",
          }}
        >
          {isLockedBySafetyDH ? (
            <>
              {allCorrectiveActionsDone
                ? "⚠ This report is now for closure. All corrective actions have been completed or cancelled."
                : "⚠ Report was validated by the reviewer and is now on the Corrective & Preventative Action Plan."}
            </>
          ) : isGroupReviewer &&
            hasGroupMatch &&
            !stageAllowedPositions.includes("group_reviewer") ? (
            <>
              ⚠ You are viewing this report in read-only mode. This report
              hasn't reached your review stage yet.
            </>
          ) : isDepartmentReviewer &&
            hasGroupDeptMatch &&
            !stageAllowedPositions.includes("department_reviewer") ? (
            <>
              ⚠ You are viewing this report in read-only mode. This report
              hasn't reached your review stage yet.
            </>
          ) : isSafetyReviewer ? (
            <>
              ⚠ You are viewing this report in read-only mode. Your location
              does not have edit access to{" "}
              {accidentSite === "SSF" ? "Surface" : "Underground"} reports.
            </>
          ) : isDeptReviewerDeptOnlyMatch ? (
            <>
              ⚠ You are viewing this report in read-only mode. Your group does
              not match this report — you can only edit Section 3 Medical
              Evaluation.
            </>
          ) : isSection3Approver ? (
            <>
              ⚠ You are viewing this report in read-only mode. You are only
              allowed to edit Section 3 Medical Evaluation.
            </>
          ) : isDepartmentReviewer && !hasGroupDeptMatch ? (
            <>
              ⚠ You are viewing this report in read-only mode. Your department
              does not match this report.
            </>
          ) : isGroupReviewer && !hasGroupMatch ? (
            <>
              ⚠ You are viewing this report in read-only mode. Your group does
              not match this report.
            </>
          ) : (
            <>
              ⚠ You are viewing this report in read-only mode. You do not have
              edit access to this report.
            </>
          )}
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <main className="sr-main">
        <div className="sr-section-header">
          <div>
            <h1 className="sr-section-title">{STEPS[activeTab - 1].title}</h1>
            <p className="sr-section-sub">{STEPS[activeTab - 1].code}</p>
          </div>
        </div>

        <div className="sr-content">
          {activeTab === 1 && (
            <>
              {saveAttempted && hasAnyErrors(errors1) && (
                <div className="sr-banner">
                  This section has errors — please fix the highlighted fields
                  before saving the report.
                </div>
              )}
              <Section1
                form={form1}
                setForm={setForm1Dirty}
                errors={e1}
                displayName={preparedByDisplay}
                groupList={groupList}
                readOnly={isHistorical ? false : !hasFullAccess}
                users={users}
                savedAssignments={savedAssignments}
              />
            </>
          )}

          {activeTab === 2 && (
            <>
              {saveAttempted && hasAnyErrors(errors3) && (
                <div className="sr-banner">
                  This section has errors — please fix the highlighted fields
                  before saving the report.
                </div>
              )}
              <Plate
                code="SECTION.03"
                title="Injury & Medical Evaluation"
                note="Company Doctor / Nurse to complete"
              />
              <Section3
                form={form3}
                setForm={setForm3Dirty}
                errors={e3}
                accidentId={accident_id}
                currentUser={empInfo.user_name}
                isApprover={
                  !isHistorical &&
                  (isSection3Approver || isSection3ApproverDept)
                }
                setErrors3={setErrors3}
                setSaveAttempted={setSaveAttempted}
                readOnly={isHistorical ? false : !canAccessSection3}
                currentUserFullName={displayName}
                onAutoSave={handleSaveSection3Only}
              />
            </>
          )}

          {activeTab === 3 && (
            <>
              {saveAttempted && hasAnyErrors(errors4) && (
                <div className="sr-banner">
                  This section has errors — please fix the highlighted fields
                  before saving the report.
                </div>
              )}
              <Section4
                form={form4}
                setForm={setForm4Dirty}
                errors={e4}
                readOnly={isHistorical ? false : !hasFullAccess}
              />
            </>
          )}

          {activeTab === 4 && (
            <>
              {saveAttempted && hasAnyErrors(errors7) && (
                <div className="sr-banner">
                  This section has errors — please fix the highlighted fields
                  before saving the report.
                </div>
              )}
              <Plate code="SECTION.07" title="Investigation" />
              <Section7
                form={form7}
                setForm={setForm7Dirty}
                errors={e7}
                readOnly={isHistorical ? false : !hasFullAccess}
              />
            </>
          )}

          {activeTab === 5 && (
            <>
              {saveAttempted && hasAnyErrors(errors8) && (
                <div className="sr-banner">
                  This section has errors — please fix the highlighted fields
                  before saving the report.
                </div>
              )}
              <Plate
                code="SECTION.08"
                title="Corrective & Preventative Action Plan"
              />

              <Section8
                form={form8}
                setForm={setForm8Dirty}
                errors={e8}
                accidentId={accident_id}
                currentUser={empInfo.user_name}
                readOnly={
                  isHistorical
                    ? false
                    : isLockedBySafetyDH
                      ? false
                      : !hasFullAccess
                }
                restrictAdminFields={isLockedBySafetyDH}
                groupList={groupList}
                savedAllItemsDone={allItemsDone}
                form1={form1}
                empPosition={empPosition}
                empDepartment={
                  userData?.emp_department || empInfo.emp_department
                }
                empGroup={userData?.emp_group || empInfo.emp_group}
                currentUserFullName={displayName}
                onApproveSignOff={handleApproveSectionEightSignOff}
                approveSubmitting={approveSubmitting}
              />
            </>
          )}
        </div>
      </main>

      {submitModalOpen && !isHistorical && (
        <SubmitReviewModal
          onConfirm={handleSubmitReview}
          onCancel={() => {
            setSubmitModalOpen(false);
            setSubmitRemarks("");
          }}
          remarks={submitRemarks}
          setRemarks={setSubmitRemarks}
          loading={submitLoading}
          accidentId={accident_id}
          accidentMaster={accidentMaster}
          empPosition={empPosition}
        />
      )}
      {topbarApproveModal && (
        <ApproveWithRemarksModal
          open={!!topbarApproveModal}
          onClose={() => setTopbarApproveModal(null)}
          loading={approveSubmitting}
          title={topbarApproveModal?.label}
          onConfirm={async (remarksText) => {
            const success = await handleApproveSectionEightSignOff({
              ...topbarApproveModal,
              remarksText,
            });
            if (success) setTopbarApproveModal(null);
          }}
        />
      )}

      <AuditLogPanel
        accidentId={accident_id}
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET
   ════════════════════════════════════════════════════════════════════════ */

const STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --sr-ink:         #0D1B2A;
  --sr-ink-soft:    #2C4A3E;
  --sr-muted:       #5E7A6E;
  --sr-paper:       #FFFFFF;
  --sr-paper-alt:   #F0F4F2;
  --sr-line:        #C8D8D1;
  --sr-line-strong: #9DBCB0;
  --sr-amber:       #1B5E44;
  --sr-amber-deep:  #0F3D2B;
  --sr-amber-soft:  #D4EDE5;
  --sr-sidebar-accent: #1B8C60;
  --sr-sidebar-muted:  #4A6B84;
  --sr-danger:      #B02020;
  --sr-danger-soft: #FAE8E8;
  --sr-success:     #1B5E44;
  --sr-success-soft:#D4EDE5;
  --sr-mint:        #1A3A2E;
  --sr-mint-ink:    #A8D5C4;
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body:    'Inter', sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;
}

.sr-shell * { box-sizing: border-box; }
.sr-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--sr-paper-alt);
  font-family: var(--font-body);
  color: var(--sr-ink);
}
.sr-shell--center { align-items: center; justify-content: center; }

.sr-topbar-outer {
  background: #0D1B2A;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.sr-topbar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.sr-topbar-brand-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sr-topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sr-topbar-divider {
  width: 1px;
  height: 28px;
  background: rgba(255,255,255,0.1);
}

.sr-topbar-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: #E8F4EF;
  letter-spacing: 0.05em;
  display: block;
}

.sr-topbar-sub {
  font-size: 10px;
  color: #4A6B84;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: block;
}

.sr-topbar-ref {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 6px 14px;
}

.sr-topbar-ref-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4A6B84;
}

.sr-topbar-ref-val {
  font-family: var(--font-mono);
  font-size: 12px;
  color: #1B8C60;
}

.sr-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sr-btn-back-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: #8AA4B8;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.sr-btn-back-inline:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

.sr-tabs {
  display: flex;
  padding: 0 32px;
  overflow-x: auto;
  scrollbar-width: none;
}
.sr-tabs::-webkit-scrollbar { display: none; }

.sr-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  color: #4A6B84;
  font-family: var(--font-body);
  font-size: 12px;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.sr-tab:hover { color: #8AA4B8; background: rgba(255,255,255,0.04); }
.sr-tab--active { color: #E8F4EF; border-bottom-color: #1B8C60; }
.sr-tab--error { color: #E07070; }
.sr-tab--error.sr-tab--active { border-bottom-color: var(--sr-danger); }

.sr-tab-num {
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-family: var(--font-mono); flex-shrink: 0;
  transition: background 0.15s;
}
.sr-tab--active .sr-tab-num { background: #1B8C60; color: #fff; }
.sr-tab--error .sr-tab-num { background: var(--sr-danger); color: #fff; }
.sr-tab-label { font-weight: 400; }
.sr-tab--active .sr-tab-label { font-weight: 500; }

.sr-main { flex: 1; min-width: 0; padding: 28px 40px 80px; }

.sr-section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 2px solid var(--sr-line);
  flex-wrap: wrap;
  gap: 14px;
}

.sr-section-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: 32px; margin: 0; letter-spacing: 0.01em;
  color: var(--sr-ink);
}

.sr-section-sub {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--sr-amber); letter-spacing: 0.1em; margin: 2px 0 0;
}

.sr-content { display: flex; flex-direction: column; gap: 22px; }
.sr-stack  { display: flex; flex-direction: column; gap: 18px; }

.sr-plate {
  display: flex; align-items: baseline; gap: 12px;
  background: var(--sr-ink);
  color: #fff;
  border-left: 5px solid var(--sr-sidebar-accent);
  padding: 10px 18px; border-radius: 5px;
}
.sr-plate-code {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--sr-sidebar-accent); letter-spacing: 0.08em;
}
.sr-plate-title {
  font-family: var(--font-display); font-weight: 600;
  font-size: 19px; letter-spacing: 0.01em;
}
.sr-plate-note {
  font-size: 12px; color: #6A8FA8; font-style: italic; margin-left: auto;
}

.sr-panel {
  background: var(--sr-paper);
  border: 1px solid var(--sr-line);
  border-radius: 8px; padding: 18px 20px;
}
.sr-panel-title {
  font-family: var(--font-display); font-weight: 600;
  font-size: 15px; color: var(--sr-ink-soft);
  text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 12px; padding-bottom: 8px;
  border-bottom: 1px solid var(--sr-line);
  display: flex; align-items: center; justify-content: space-between;
}
.sr-eyebrow {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--sr-amber); margin-bottom: 8px;
}
.sr-help {
  font-size: 12px; color: var(--sr-muted); font-style: italic; margin: 0 0 12px;
}

.sr-grid { display: grid; gap: 16px; }
.sr-grid--2 { grid-template-columns: repeat(2, 1fr); }
.sr-grid--3 { grid-template-columns: repeat(3, 1fr); }
.sr-grid--4 { grid-template-columns: repeat(4, 1fr); }  
.sr-field { display: flex; flex-direction: column; gap: 6px; }
.sr-label {
  font-size: 11.5px; font-weight: 600; color: var(--sr-ink-soft);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.sr-req { color: var(--sr-danger); margin-left: 3px; }
.sr-hint { font-size: 11px; color: var(--sr-muted); font-style: italic; }

.sr-input, .sr-textarea {
  font-family: var(--font-body); font-size: 13.5px; color: var(--sr-ink);
  background: var(--sr-paper-alt);
  border: 1.5px solid var(--sr-line-strong);
  border-radius: 5px; padding: 8px 10px; outline: none; width: 100%;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sr-input:focus, .sr-textarea:focus {
  border-color: var(--sr-amber);
  box-shadow: 0 0 0 3px rgba(27,94,68,0.15);
  background: #fff;
}
.sr-input--err { border-color: var(--sr-danger); background: var(--sr-danger-soft); }
.sr-input:disabled { opacity: 0.4; cursor: not-allowed; }
.sr-textarea { resize: vertical; font-family: var(--font-body); }

.sr-error-text {
  color: var(--sr-danger); font-size: 11px; font-weight: 600;
  margin-top: 3px; line-height: 1.4;
}
.sr-error-text--block {
  background: var(--sr-danger-soft); border: 1px solid var(--sr-danger);
  border-radius: 6px; padding: 8px 12px;
}
.sr-banner {
  background: var(--sr-danger-soft); border: 1px solid var(--sr-danger);
  color: #7A1F1F; font-size: 13px; font-weight: 600;
  padding: 10px 14px; border-radius: 6px;
}

.sr-check-grid { display: flex; flex-wrap: wrap; gap: 10px 20px; }
.sr-check-grid--col { flex-direction: column; gap: 8px; flex-wrap: nowrap; }
.sr-check-grid--2col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; }

.sr-check {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 13px; cursor: pointer; color: var(--sr-ink-soft); line-height: 1.4;
}
.sr-check input { display: none; }
.sr-check-box {
  width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px;
  border: 1.5px solid var(--sr-line-strong); border-radius: 3px;
  background: #fff; position: relative; transition: all 0.12s;
}
.sr-check input:checked + .sr-check-box {
  background: var(--sr-amber); border-color: var(--sr-amber-deep);
}
.sr-check input:checked + .sr-check-box::after {
  content: ''; position: absolute; left: 4px; top: 1px;
  width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0;
  transform: rotate(40deg);
}

.sr-radio-row { display: flex; gap: 22px; }
.sr-radio-list { display: flex; flex-direction: column; gap: 4px; }
.sr-radio {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; cursor: pointer; color: var(--sr-ink-soft);
  padding: 6px; border-radius: 5px;
}
.sr-radio--desc { align-items: flex-start; }
.sr-radio:hover { background: var(--sr-paper-alt); }
.sr-radio input { display: none; }
.sr-radio-dot {
  width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px;
  border: 1.5px solid var(--sr-line-strong); border-radius: 50%; position: relative;
}
.sr-radio input:checked + .sr-radio-dot { border-color: var(--sr-amber-deep); }
.sr-radio input:checked + .sr-radio-dot::after {
  content: ''; position: absolute; inset: 3px;
  background: var(--sr-amber); border-radius: 50%;
}
.sr-radio-text { display: flex; flex-direction: column; gap: 2px; }
.sr-radio-label { font-weight: 600; color: var(--sr-ink); }
.sr-radio-desc { font-size: 11px; color: var(--sr-muted); line-height: 1.4; }

.sr-indent { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.sr-sub { background: var(--sr-paper-alt); border-radius: 6px; padding: 8px 10px; margin: 8px 0; }
.sr-inline-field {
  display: flex; align-items: center; gap: 8px;
  margin-top: 6px; font-size: 12px; color: var(--sr-ink-soft);
}
.sr-inline-field .sr-input { max-width: 100px; }

.sr-other { display: flex; flex-direction: column; gap: 6px; }
.sr-other-input {
  border: none; border-bottom: 1.5px solid var(--sr-line-strong);
  background: transparent; font-size: 13px; padding: 3px 2px;
  outline: none; color: var(--sr-ink);
}
.sr-other-input:focus { border-color: var(--sr-amber); }
.sr-other-input.sr-input--err { border-color: var(--sr-danger); }

.sr-vitals {
  margin-top: 14px; border: 1px solid var(--sr-line);
  border-radius: 6px; overflow: hidden;
}
.sr-vitals-head {
  background: var(--sr-ink);
  color: var(--sr-sidebar-accent);
  font-weight: 700; font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.08em; text-align: center; padding: 7px;
}
.sr-vitals-row {
  display: grid; grid-template-columns: 1fr 1fr;
  align-items: center; gap: 8px; padding: 6px 10px;
  border-top: 1px solid var(--sr-line);
}
.sr-vitals-label { font-size: 12px; color: var(--sr-ink-soft); font-weight: 500; }

.sr-risk-grid { display: flex; flex-direction: column; gap: 4px; }
.sr-risk-row {
  display: grid; grid-template-columns: 70px 130px 1fr auto;
  align-items: center; gap: 12px; padding: 8px 12px;
  border-radius: 6px; font-size: 12px; border: 1px solid transparent; opacity: 0.55;
}
.sr-risk-row--active {
  opacity: 1; border-color: var(--sr-ink);
  box-shadow: 0 1px 4px rgba(13,27,42,0.18);
}
.sr-risk-range { font-family: var(--font-mono); font-size: 12px; color: var(--sr-ink-soft); }
.sr-risk-key {
  font-weight: 700; text-align: center; padding: 4px 8px;
  border-radius: 4px; color: #fff; font-size: 11px; letter-spacing: 0.04em;
}
.sr-risk-row--extreme  .sr-risk-key { background: #B02020; }
.sr-risk-row--high     .sr-risk-key { background: #C06010; }
.sr-risk-row--moderate .sr-risk-key { background: #7A6E10; }
.sr-risk-row--low      .sr-risk-key { background: #1B5E44; }
.sr-risk-row--negligible .sr-risk-key { background: #2C4A5C; }
.sr-risk-desc { color: var(--sr-muted); line-height: 1.4; }
.sr-risk-flag {
  font-family: var(--font-mono); font-size: 10px;
  background: var(--sr-ink); color: var(--sr-sidebar-accent);
  padding: 3px 8px; border-radius: 4px; letter-spacing: 0.06em;
}
@media (max-width: 700px) { .sr-risk-row { grid-template-columns: 1fr; text-align: left; } }

.sr-action-list { display: flex; flex-direction: column; gap: 14px; }
.sr-action-card {
  background: var(--sr-paper);
  border: 1px solid var(--sr-line);
  border-left: 4px solid var(--sr-amber);
  border-radius: 8px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 12px;
}
.sr-action-head { display: flex; align-items: center; justify-content: space-between; }
.sr-action-num {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--sr-amber); letter-spacing: 0.08em;
}
.sr-action-remove {
  background: none; border: 1px solid var(--sr-danger);
  color: var(--sr-danger); font-size: 11px; padding: 3px 10px;
  border-radius: 4px; cursor: pointer;
}
.sr-action-remove:disabled { opacity: 0.35; cursor: not-allowed; }
.sr-action-completion { border-top: 1px dashed var(--sr-line); padding-top: 10px; }

.sr-btn {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
  padding: 9px 18px; border-radius: 6px; cursor: pointer; border: 1.5px solid transparent;
}
.sr-btn--sm { padding: 7px 16px; font-size: 12px; }
.sr-btn--primary {
  background: var(--sr-amber); color: #fff; border-color: var(--sr-amber-deep);
}
.sr-btn--primary:hover { background: var(--sr-amber-deep); }
.sr-btn--ghost {
  background: rgba(255,255,255,0.06); color: #8AA4B8; border-color: rgba(255,255,255,0.12);
}
.sr-btn--ghost:hover { border-color: rgba(255,255,255,0.28); color: #fff; background: rgba(255,255,255,0.1); }


.sr-btn--ghost1 {
  background: rgb(0, 61, 23); color: #ffffff; border-color: rgba(255,255,255,0.12);
}
.sr-btn--ghost1:hover { border-color: rgb(0, 78, 30); color: #0c240c; background: rgba(68, 116, 78, 0.06); }

.sr-label-extention {
color: var(--sr-ink-soft)
}

.sr-label-extention:hover {
color: #008528
}


.sr-notice {
  background: var(--sr-amber-soft);
  border: 1px solid var(--sr-amber);
  color: var(--sr-amber-deep);
  font-size: 12px; padding: 10px 14px; border-radius: 6px; line-height: 1.5;
}

.sr-area-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 900px) { .sr-area-grid { grid-template-columns: repeat(2, 1fr); } }
.sr-area-col { display: flex; flex-direction: column; gap: 6px; }

  .sr-select { cursor: pointer; }
  .sr-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
  .sr-btn--submit {
  background: #1B8C60;
  color: #fff;
  border-color: #0F6644;
  animation: sr-pulse 2s infinite;
}
.sr-btn--submit:hover { background: #0F6644; }
@keyframes sr-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(27,140,96,0.5); }
  50%       { box-shadow: 0 0 0 5px rgba(27,140,96,0); }
}

.sr-review-wrap { background: #0D1B2A; }
.sr-review-trigger { display: none; }
.sr-review-panel { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.sr-review-panel--open { max-height: 2000px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sr-review-table-wrap { padding: 18px 32px; overflow-x: auto; }
.sr-review-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 13px; background: var(--sr-paper); border-radius: 8px; overflow: hidden; }.sr-review-table thead tr { background: var(--sr-paper-alt); }
.sr-review-table th {
  text-align: left; padding: 10px 16px; font-weight: 700; font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.05em; color: var(--sr-ink-soft);
  border-bottom: 1px solid var(--sr-line);
}
.sr-review-table td {
  padding: 10px 16px; border-bottom: 1px solid var(--sr-line); color: var(--sr-ink);
  vertical-align: middle;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}
.sr-review-table th:nth-child(1), .sr-review-table td:nth-child(1) { width: 17%; }
.sr-review-table th:nth-child(2), .sr-review-table td:nth-child(2) { width: 15%; }
.sr-review-table th:nth-child(3), .sr-review-table td:nth-child(3) { width: 9%; }
.sr-review-table th:nth-child(4), .sr-review-table td:nth-child(4) { width: 16%; }
.sr-review-table th:nth-child(5), .sr-review-table td:nth-child(5) { width: 25%; }
.sr-review-table th:nth-child(6), .sr-review-table td:nth-child(6) { width: 18%; }
.sr-review-table tr:last-child td { border-bottom: none; }
.sr-review-badge {
  display: inline-block; padding: 3px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  color: #92400e; background: #fef3c7; border: 1px solid #fde68a;
}
.sr-review-badge--done { color: #166534; background: #dcfce7; border-color: #86efac; }
.sr-check--disabled,
.sr-radio--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

@media (max-width: 1024px) {
  .sr-grid--3 { grid-template-columns: repeat(2, 1fr); }
  .sr-grid--4 { grid-template-columns: repeat(4, 1fr); }  
  .sr-area-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 780px) {
  .sr-grid--2, .sr-grid--3 { grid-template-columns: 1fr; }
  .sr-grid--4 { grid-template-columns: repeat(4, 1fr); }  
  .sr-area-grid { grid-template-columns: repeat(2, 1fr); }
  .sr-vitals-row { grid-template-columns: 1fr; align-items: flex-start; }
  .sr-check-grid--2col { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .sr-topbar-brand {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px 16px;
  }
  .sr-topbar-brand-left { flex-wrap: wrap; row-gap: 8px; }
  .sr-topbar-divider { display: none; }
  .sr-topbar-right { width: 100%; }
  .sr-topbar-actions {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sr-topbar-actions .sr-btn {
    flex: 1 1 calc(50% - 4px);
    white-space: nowrap;
    text-align: center;
    min-width: 0;
  }
  .sr-tabs { padding: 0 16px; }
  .sr-tab { padding: 10px 12px; }
  .sr-tab-label { display: none; }
  .sr-tab-num { width: 22px; height: 22px; font-size: 11px; }
}
@media (max-width: 700px) {
  .sr-review-panel--open { max-height: none; }
  .sr-review-table-wrap {
    max-height: 70vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .sr-review-table thead { display: none; }
  .sr-review-table, .sr-review-table tbody, .sr-review-table tr, .sr-review-table td {
    display: block; width: 100% !important;
  }
  .sr-review-table tr {
    border: 1px solid var(--sr-line);
    border-radius: 10px;
    margin-bottom: 12px;
    padding: 12px 14px;
    background: var(--sr-paper);
  }
  .sr-review-table td {
    border-bottom: none !important;
    padding: 8px 12px;
  }

  .sr-review-table td[data-label="Action"] {
    padding-top: 12px;
  }
  .sr-review-table td[data-label="Action"] .sr-btn {
    width: 100%;
  }
  .sr-review-table td::before {
    content: attr(data-label);
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sr-muted);
    margin-bottom: 2px;
  }
}
@media (max-width: 600px) {
  .sr-section-title { font-size: 24px; }
  .sr-main { padding: 16px 12px 60px; }
  .sr-panel { padding: 14px 14px; }
  .sr-review-table-wrap { padding: 14px 12px; }
}
@media (max-width: 480px) {
  .sr-action-card { padding: 12px 12px; }
  .sr-inline-field { flex-wrap: wrap; }
}
  .sr-date-input-iconleft {
  padding-left: 30px !important;
}
.sr-date-input-iconleft::-webkit-calendar-picker-indicator {
  position: absolute;
  left: 6px;
  cursor: pointer;
}
.sr-date-input-iconleft::-webkit-datetime-edit {
  margin-left: 4px;
}
  .sr-combobox {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235E7A6E' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
  cursor: text;
}
.sr-combobox--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--sr-paper-alt);
}
.sr-combo-drop {
  position: absolute; top: calc(100% + 2px); left: 0; right: 0;
  background: var(--sr-paper); border: 1.5px solid var(--sr-line-strong);
  border-radius: 6px; box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  z-index: 200; max-height: 200px; overflow-y: auto;
}
.sr-combo-opt {
  padding: 9px 12px; font-size: 13.5px; cursor: pointer;
  color: var(--sr-ink); transition: background 0.1s;
}
.sr-combo-opt:hover { background: var(--sr-amber-soft); }
.sr-combo-opt--active { background: var(--sr-amber-soft); font-weight: 600; color: var(--sr-amber-deep); }
.sr-combo-empty { padding: 9px 12px; font-size: 13px; color: var(--sr-muted); font-style: italic; }
`;
