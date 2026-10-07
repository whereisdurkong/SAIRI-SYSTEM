import { useEffect, useState, useRef } from "react";
import { useNotification } from "components/Safetynotification.jsx";
import axios from "axios";
import config from "config";
import LoadingSpinner from "components/LoadingComponent";

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
const isValidNumber = (v) =>
  v !== "" && v !== null && v !== undefined && !isNaN(Number(v));

const isNotOic = (u) =>
  u.is_oic === "0" ||
  u.is_oic === 0 ||
  u.is_oic === null ||
  u.is_oic === undefined ||
  u.is_oic === "";

let participantIdCounter = 1;
const makeParticipant = () => ({
  id: participantIdCounter++,
  name: "",
  department: "",
  involvementType: "",
});

/* ════════════════════════════════════════════════════════════════════════
   VALIDATION
   ════════════════════════════════════════════════════════════════════════ */

function validateForm1(form) {
  const errors = {};
  const req = (field, label) => {
    if (isEmpty(form[field])) errors[field] = `${label} is required.`;
  };

  req("siriRefType", "SIRI Reference Type");
  req("dataFor", "Data For");
  req("workRelated", "Work Related field");
  req("govtNotification", "Government notification field");
  if (form.subtypes.length === 0)
    errors.subtypes = "Select at least one accident/incident subtype.";
  req("employer", "Employer");
  req("name", "Name");
  req("chapaNo", "Chapa No.");
  req("jobDesignation", "Job Designation");

  req("dateOfEvent", "Date of Event");
  if (form.dateOfEvent && isFutureDate(form.dateOfEvent))
    errors.dateOfEvent = "Date of Event cannot be in the future.";
  req("timeOfEvent", "Time of Event");
  req("shift", "Shift");

  req("dateReported", "Date Reported");
  if (form.dateReported && isFutureDate(form.dateReported))
    errors.dateReported = "Date Reported cannot be in the future.";
  if (
    form.dateReported &&
    form.dateOfEvent &&
    new Date(form.dateReported) < new Date(form.dateOfEvent)
  ) {
    errors.dateReported = "Date Reported cannot be before the Date of Event.";
  }
  req("timeReported", "Time Reported");

  req("location", "Location");
  req("specificLocation", "Specific Location");
  req("reportedBy", "Reported By");
  req("reportedTo", "Supervisor Reported To");

  req("group", "Group");
  req("department", "Department");
  req("section", "Section");
  req("groupHead", "Group Head");
  req("departmentHead", "Department Head");

  req("dateHired", "Date Hired");
  if (form.dateHired && isFutureDate(form.dateHired))
    errors.dateHired = "Date Hired cannot be in the future.";

  req("dateOfBirth", "Date of Birth");
  if (form.dateOfBirth) {
    if (isFutureDate(form.dateOfBirth)) {
      errors.dateOfBirth = "Date of Birth cannot be in the future.";
    } else if (form.age && Number(form.age) < 18) {
      errors.dateOfBirth = "Employee must be at least 18 years old.";
    }
  }

  req("homeAddress", "Home Address");
  req("status", "Status");

  if (isEmpty(form.noOfDependents)) {
    errors.noOfDependents = "No. of Dependents is required.";
  } else if (
    !isValidNumber(form.noOfDependents) ||
    Number(form.noOfDependents) < 0
  ) {
    errors.noOfDependents = "Enter a valid number (0 or more).";
  }

  req("lengthOfService", "Length of Service");
  req("experienceAtOccupation", "Experience at Occupation");

  if (form.workingAreas.length === 0)
    errors.workingAreas = "Select at least one working area.";
  if (form.workingAreas.includes("Others") && isEmpty(form.othersArea)) {
    errors.othersArea = "Please specify the other working area.";
  }

  if (isEmpty(form.incidentDescription)) {
    errors.incidentDescription = "Please describe what happened.";
  } else if (form.incidentDescription.trim().length < 15) {
    errors.incidentDescription =
      "Please provide more detail (at least 15 characters).";
  }

  req("immediateActions", "Immediate actions taken");

  return errors;
}

function validateParticipants(form) {
  const errors = { rows: {} };
  form.participants.forEach((p) => {
    const hasAny = p.name || p.department || p.involvementType;
    if (hasAny) {
      const rowErr = {};
      if (isEmpty(p.name)) rowErr.name = "Required";
      if (isEmpty(p.department)) rowErr.department = "Required";
      if (isEmpty(p.involvementType)) rowErr.involvementType = "Required";
      if (Object.keys(rowErr).length) errors.rows[p.id] = rowErr;
    }
  });

  if (isEmpty(form.immediateSupervisorOnDuty))
    errors.immediateSupervisorOnDuty =
      "Immediate Supervisor on Duty is required.";

  if (isEmpty(form.preparedByDateTime))
    errors.preparedByDateTime = "Date & time is required.";
  else if (isFutureDate(form.preparedByDateTime))
    errors.preparedByDateTime = "Cannot be in the future.";
  return errors;
}

const hasAnyErrors = (errObj) => {
  if (!errObj) return false;
  for (const k in errObj) {
    const v = errObj[k];
    if (v && typeof v === "object") {
      if (Object.keys(v).length > 0) return true;
    } else if (v) return true;
  }
  return false;
};

const describeErrors = (...errObjs) => {
  const msgs = [];
  const walk = (obj) => {
    if (!obj) return;
    for (const k in obj) {
      const v = obj[k];
      if (v && typeof v === "object") {
        walk(v);
      } else if (v) {
        msgs.push(v);
      }
    }
  };
  errObjs.forEach(walk);
  if (msgs.length === 0) return "";
  const shown = msgs.slice(0, 3).join(" ");
  const remaining = msgs.length - 3;
  return remaining > 0
    ? `${shown} (+${remaining} more field${remaining > 1 ? "s" : ""} need attention.)`
    : shown;
};

const makeFormDefault = () => ({
  siriRefType: "",
  dataFor: "",
  workRelated: "",
  govtNotification: "",
  subtypes: [],
  employer: "",
  name: "",
  chapaNo: "",
  jobDesignation: "",
  dateOfEvent: "",
  timeOfEvent: "",
  shift: "",
  dateReported: "",
  timeReported: "",
  location: "",
  specificLocation: "",
  level: "",
  reportedBy: "",
  reportedTo: "",
  group: "",
  department: "",
  section: "",
  groupHead: "",
  departmentHead: "",
  sectionHead: "",
  dateHired: "",
  dateOfBirth: "",
  age: "",
  homeAddress: "",
  status: "",
  noOfDependents: "",
  lengthOfService: "",
  experienceAtOccupation: "",
  workingAreas: [],
  othersArea: "",
  incidentDescription: "",
  immediateActions: "",
  participants: [makeParticipant(), makeParticipant(), makeParticipant()],
  immediateSupervisorOnDuty: "",
  preparedByName: "",
  preparedByDateTime: "",
});

/* ════════════════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES  — identical tokens to ViewReport.jsx
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

function Panel({ title, error, children }) {
  return (
    <div className="sr-panel">
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

function Check({ checked, onChange, label }) {
  return (
    <label className="sr-check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="sr-check-box" />
      <span className="sr-check-label">{label}</span>
    </label>
  );
}

function Radio({ checked, onChange, name, label }) {
  return (
    <label className="sr-radio">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span className="sr-radio-dot" />
      <span className="sr-radio-text">
        <span className="sr-radio-label">{label}</span>
      </span>
    </label>
  );
}

const OTHER_VALUE = "__OTHER__";

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
  const filtered = users
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
  const filtered = users
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
  const filtered = users
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

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */

export default function AddReport() {
  const notify = useNotification();
  const empInfo = JSON.parse(localStorage.getItem("user")) || {};
  const [form, setForm] = useState(() => ({
    ...makeFormDefault(),
    preparedByName: empInfo.user_name || "",
  }));
  const [errors1, setErrors1] = useState({});
  const [errorsP, setErrorsP] = useState({ rows: {} });
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [userData, setUserData] = useState(null);

  const [groupList, setGroupList] = useState([]);
  const [deptList, setDeptList] = useState([]);
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
    const fetchGroups = async () => {
      try {
        const res = await axios.get(`${config.baseApi}/setup/all`);
        if (res.data.message === "success") {
          setGroupList(res.data.data); // [{gd_id, group, departments:[{id, department}]}]
        }
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      }
    };
    fetchGroups();
  }, []);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${config.baseApi}/auth/get-all-users`);
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(
          `${config.baseApi}/auth/get-user-by-username`,
          {
            params: { user_name: empInfo.user_name },
          },
        );
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        setUserData(data);
        // No more setForm here — displayName is derived from userData directly
      } catch (err) {
        console.log("Unable to fetch user data: ", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (form.siriRefType === "underground") {
      set("location", "underground");
    } else if (form.siriRefType === "surface") {
      set("location", "surface");
    } else {
      set("location", "");
    }
  }, [form.siriRefType]);

  useEffect(() => {
    if (!form.group || !form.department) {
      setForm((f) => ({
        ...f,
        departmentHead: "",
        sectionHead: "",
        reportedTo: "",
      }));
      return;
    }

    const groupAssignment = savedAssignments[form.group];
    const deptAssignment = groupAssignment?.departments?.[form.department];

    setForm((f) => ({
      ...f,
      departmentHead: deptAssignment?.dept_head || "",
      sectionHead: deptAssignment?.section_head || "",
      reportedTo: deptAssignment?.supervisor || "",
    }));
  }, [form.department, form.group, savedAssignments]);

  useEffect(() => {
    if (!form.group) {
      setForm((f) => ({ ...f, groupHead: "" }));
      return;
    }

    const groupAssignment = savedAssignments[form.group];
    setForm((f) => ({
      ...f,
      groupHead: groupAssignment?.group_head || "",
    }));
  }, [form.group, savedAssignments]);

  // Display name from fetched userData (purely for showing in the field)
  const displayName = userData
    ? `${userData.emp_firstname || ""} ${userData.emp_lastname || ""}`.trim()
    : empInfo.user_name || "";

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toggle = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }));

  const handleDOB = (dob) => {
    set("dateOfBirth", dob);
    if (dob) {
      const age = Math.floor(
        (Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000),
      );
      set("age", String(age));
    }
  };

  const setParticipant = (id, field, value) =>
    setForm((f) => ({
      ...f,
      participants: f.participants.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    }));

  const addParticipantRow = () =>
    setForm((f) => ({
      ...f,
      participants: [...f.participants, makeParticipant()],
    }));

  const removeParticipantRow = (id) =>
    setForm((f) => ({
      ...f,
      participants:
        f.participants.length > 1
          ? f.participants.filter((p) => p.id !== id)
          : f.participants,
    }));

  if (loading) return <LoadingSpinner label="Fetching data" />;
  const handleGroupChange = (gdId) => {
    const selected = groupList.find((g) => String(g.gd_id) === String(gdId));
    setDeptList(selected ? selected.departments : []);
    setForm((f) => ({
      ...f,
      group: gdId,
      department: "",
      groupHead: "",
      departmentHead: "",
      sectionHead: "",
      reportedTo: "",
    }));
  };

  const selectedGroupObj = groupList.find(
    (g) => String(g.gd_id) === String(form.group),
  );
  const selectedDeptObj = deptList.find(
    (d) => String(d.id) === String(form.department),
  );

  const handleSave = async () => {
    const e1 = validateForm1(form);
    const eP = validateParticipants(form);
    setErrors1(e1);
    setErrorsP(eP);
    setAttempted(true);
    setLoading(true);

    const invalid = hasAnyErrors(e1) || hasAnyErrors(eP);
    if (invalid) {
      setLoading(false);
      notify.error("VALIDATION FAILED", describeErrors(e1, eP));
      return;
    }

    const formatDateForAPI = (dateStr) => {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
      return null;
    };

    const formatTimeForAPI = (timeStr) => {
      if (!timeStr) return null;
      if (/^\d{2}:\d{2}$/.test(timeStr)) return `${timeStr}:00`;
      if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr;
      return null;
    };

    const formatDateTimeForAPI = (datetimeStr) => {
      if (!datetimeStr) return null;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(datetimeStr))
        return datetimeStr.replace("T", " ");
      const date = new Date(datetimeStr);
      if (!isNaN(date.getTime()))
        return date.toISOString().replace("T", " ").substring(0, 19);
      return null;
    };

    const formattedParticipants = form.participants
      .filter(
        (p) =>
          p.name?.trim() || p.department?.trim() || p.involvementType?.trim(),
      )
      .map((p) => ({
        name: p.name || "",
        department: p.department || "",
        involvementType: p.involvementType || "",
      }));
    const selectedGroup = groupList.find(
      (g) => String(g.gd_id) === String(form.group),
    );
    const selectedDept = deptList.find(
      (d) => String(d.id) === String(form.department),
    );
    const payload = {
      siriRefType: form.siriRefType,
      dataFor: form.dataFor,
      workRelated: form.workRelated,
      govtNotification: form.govtNotification,
      subtypes: form.subtypes.join(","),
      employer: form.employer,
      name: form.name,
      chapaNo: form.chapaNo,
      jobDesignation: form.jobDesignation,
      dateOfEvent: formatDateForAPI(form.dateOfEvent),
      timeOfEvent: formatTimeForAPI(form.timeOfEvent),
      shift: form.shift,
      dateReported: formatDateForAPI(form.dateReported),
      timeReported: formatTimeForAPI(form.timeReported),
      location: form.location,
      specificLocation: form.specificLocation,
      level: form.level,
      reportedBy: form.reportedBy,
      reportedTo: form.reportedTo,
      group: selectedGroup?.group || "",
      department: selectedDept?.department || "",
      section: form.section,
      group_head: form.groupHead,
      department_head: form.departmentHead,
      section_head: form.sectionHead,
      immediateSupervisorOnDuty: form.immediateSupervisorOnDuty,
      dateHired: formatDateForAPI(form.dateHired),
      dateOfBirth: formatDateForAPI(form.dateOfBirth),
      age: form.age,
      homeAddress: form.homeAddress,
      status: form.status,
      noOfDependents: form.noOfDependents,
      lengthOfService: form.lengthOfService,
      experienceAtOccupation: form.experienceAtOccupation,
      workingAreas: form.workingAreas.join(","),
      othersArea: form.othersArea,
      incidentDescription: form.incidentDescription,
      immediateActions: form.immediateActions,
      participants: formattedParticipants,
      preparedBy: empInfo.user_name,
      preparedDateTime: formatDateTimeForAPI(form.preparedByDateTime),
      created_by: empInfo.user_name,
      created_by_position: empInfo.emp_position,
    };

    console.log(
      "SAIRI FORM DATA (Section 1 & 2):",
      JSON.stringify(payload, null, 2),
    );

    try {
      const res = await axios.post(
        `${config.baseApi}/accident/add-report`,
        payload,
      );
      if (res.data.message === "success") {
        setTimeout(() => {
          setLoading(false);
          notify.success("SUCCESS", "Section 1 & 2 saved successfully!");
          participantIdCounter = 1;
          setForm(makeFormDefault());
          setErrors1({});
          setErrorsP({ rows: {} });
          setAttempted(false);

          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }, 2000);
      }
    } catch (err) {
      console.error("Save error:", err);
      notify.error(
        "SAVE FAILED",
        err.response?.data?.details ||
          "An error occurred while saving the form. Please try again.",
      );
    }
  };

  const handleClear = () => {
    participantIdCounter = 1;
    setForm({ ...makeFormDefault(), preparedByName: empInfo.user_name || "" });
    setErrors1({});
    setErrorsP({ rows: {} });
    setAttempted(false);
  };

  const e1 = attempted ? errors1 : {};
  const eP = attempted ? errorsP : { rows: {} };

  const areaZones = [
    ["Zone A", WORKING_AREAS_COL1],
    ["Zone B", WORKING_AREAS_COL2],
    ["Zone C", WORKING_AREAS_COL3],
    ["Zone D", WORKING_AREAS_COL4],
  ];

  const filledParticipants = form.participants.filter(
    (p) => p.name.trim() || p.department.trim() || p.involvementType.trim(),
  );
  const participantsFilled = filledParticipants.length > 0;

  const styleBlock = <style>{STYLE_SHEET}</style>;

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
            <div>
              <span className="sr-topbar-title">SAIRI</span>
              <span className="sr-topbar-sub">
                New Safety Accident / Incident Report and Investigation Form
              </span>
            </div>
          </div>
          <div className="sr-topbar-actions">
            <button className="sr-btn sr-btn--ghost" onClick={handleClear}>
              Clear
            </button>
            <button className="sr-btn sr-btn--primary" onClick={handleSave}>
              Save Report
            </button>
          </div>
        </div>

        {/* ─── SECTION INDICATOR STRIP ─── */}
        <div className="sr-section-strip">
          <div className="sr-section-strip-item sr-section-strip-item--active">
            <span className="sr-section-strip-num">1</span>
            <span className="sr-section-strip-label">General Info</span>
          </div>
          <div className="sr-section-strip-divider" />
          <div
            className={`sr-section-strip-item${participantsFilled ? " sr-section-strip-item--filled" : ""}`}
          >
            <span
              className={`sr-section-strip-num${participantsFilled ? " sr-section-strip-num--filled" : ""}`}
            >
              {participantsFilled ? "✓" : "2"}
            </span>
            <span className="sr-section-strip-label">Participants</span>
            {participantsFilled && (
              <span className="sr-section-strip-badge">
                {filledParticipants.length}
              </span>
            )}
          </div>
          <div className="sr-section-strip-note">
            Sections 1 &amp; 2 — completed by reporting person or immediate
            supervisor
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="sr-main">
        {/* Section header row */}
        <div className="sr-section-header">
          <div>
            <h1 className="sr-section-title">General Information</h1>
            <p className="sr-section-sub">SECTION.01–02</p>
          </div>
        </div>

        <div className="sr-content">
          {attempted && (hasAnyErrors(errors1) || hasAnyErrors(errorsP)) && (
            <div className="sr-banner">
              Please fix the highlighted fields before saving.
            </div>
          )}

          <div className="sr-stack">
            <div className="sr-notice">
              To be completed by the person reporting the occurrence or
              immediate supervisor of the department involved. Sections 1 &amp;
              2 (general information and participants) must reach the relevant
              department heads within the shift; the remaining sections are
              completed within 24 hours.
            </div>

            <Plate code="SECTION.01" title="General Information" />

            <Panel>
              <div className="sr-grid sr-grid--4">
                <Field
                  label="SIRI Reference Type"
                  required
                  error={e1.siriRefType}
                  hint="Safety Dept. generates this number when the event is logged — SUG-AIRI-XXX (Underground) / SSF-AIRI-XXX (Surface)."
                >
                  <Select
                    value={form.siriRefType}
                    onChange={(e) => set("siriRefType", e.target.value)}
                    error={e1.siriRefType}
                  >
                    <option value="">— Select —</option>
                    <option value="underground">Underground</option>
                    <option value="surface">Surface</option>
                  </Select>
                </Field>
                <Field label="Data For?" required error={e1.dataFor}>
                  <Select
                    value={form.dataFor}
                    onChange={(e) => set("dataFor", e.target.value)}
                    error={e1.dataFor}
                  >
                    <option value="">— Select —</option>
                    <option value="active_data">Active Data</option>
                    <option value="historical">Historical</option>
                  </Select>
                </Field>
                <Field label="Work Related?" required error={e1.workRelated}>
                  <Select
                    value={form.workRelated}
                    onChange={(e) => set("workRelated", e.target.value)}
                    error={e1.workRelated}
                  >
                    <option value="">— Select —</option>
                    <option value="work_related">Work Related</option>
                    <option value="not_work_related">Not Work Related</option>
                  </Select>
                </Field>
                <Field
                  label="Government Notification Required?"
                  required
                  error={e1.govtNotification}
                >
                  <div className="sr-radio-row">
                    <Radio
                      name="govtNotification"
                      label="Yes"
                      checked={form.govtNotification === "YES"}
                      onChange={() => set("govtNotification", "YES")}
                    />
                    <Radio
                      name="govtNotification"
                      label="No"
                      checked={form.govtNotification === "NO"}
                      onChange={() => set("govtNotification", "NO")}
                    />
                  </div>
                </Field>
              </div>
            </Panel>

            <Panel title="Accident/Incident Subtype" error={e1.subtypes}>
              <Field label="Subtype" required error={e1.subtypes}>
                <Select
                  value={form.subtypes[0] || ""}
                  onChange={(e) =>
                    set("subtypes", e.target.value ? [e.target.value] : [])
                  }
                  error={e1.subtypes}
                >
                  <option value="">— Select —</option>
                  <option value="Injury-LTA-F">
                    Injury - Lost Time Accident - Fatal Accident(LTA-F)
                  </option>
                  <option value="Injury-LTA-NF">
                    Injury - Lost Time Accident - Non-Fatal Accident (LTA - NF)
                  </option>
                  <option value="Injury-NLTA">
                    Injury - Non-Loss Time Accident (NLTA)
                  </option>
                  <option value="Injury-FAC">
                    Injury - First Aid Case (FAC)
                  </option>
                  <option value="OI">Occupational Illness (OI)</option>
                  <option value="Property Damage">Property Damage (PD)</option>
                  <option value="Near Miss">Near Miss(NM)</option>
                </Select>
              </Field>
            </Panel>

            <Panel>
              <Field
                label="Employer"
                required
                error={e1.employer}
                hint="Please specify what company/contract."
              >
                <TextInput
                  value={form.employer}
                  onChange={(e) => set("employer", e.target.value)}
                  error={e1.employer}
                />
              </Field>
              <div className="sr-grid sr-grid--3">
                <Field label="Name" required error={e1.name}>
                  <TextInput
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    error={e1.name}
                  />
                </Field>
                <Field label="Chapa No." required error={e1.chapaNo}>
                  <TextInput
                    value={form.chapaNo}
                    onChange={(e) => set("chapaNo", e.target.value)}
                    error={e1.chapaNo}
                  />
                </Field>
                <Field
                  label="Job Designation"
                  required
                  error={e1.jobDesignation}
                >
                  <TextInput
                    value={form.jobDesignation}
                    onChange={(e) => set("jobDesignation", e.target.value)}
                    error={e1.jobDesignation}
                  />
                </Field>
              </div>
              <div className="sr-grid sr-grid--3">
                <Field label="Date of Event" required error={e1.dateOfEvent}>
                  <TextInput
                    type="date"
                    value={form.dateOfEvent}
                    onChange={(e) => set("dateOfEvent", e.target.value)}
                    error={e1.dateOfEvent}
                  />
                </Field>
                <Field label="Time of Event" required error={e1.timeOfEvent}>
                  <TextInput
                    type="time"
                    value={form.timeOfEvent}
                    onChange={(e) => set("timeOfEvent", e.target.value)}
                    error={e1.timeOfEvent}
                  />
                </Field>

                <Field label="Shift" required error={e1.shift}>
                  <Select
                    value={form.shift}
                    onChange={(e) => set("shift", e.target.value)}
                    error={e1.shift}
                  >
                    <option value="">— Select —</option>
                    <option value="1st Shift">1st Shift</option>
                    <option value="2nd Shift">2nd Shift</option>
                    <option value="3rd Shift">3rd Shift</option>
                  </Select>
                </Field>
              </div>
              <div className="sr-grid sr-grid--2">
                <Field label="Date Reported" required error={e1.dateReported}>
                  <TextInput
                    type="date"
                    value={form.dateReported}
                    onChange={(e) => set("dateReported", e.target.value)}
                    error={e1.dateReported}
                  />
                </Field>
                <Field label="Time Reported" required error={e1.timeReported}>
                  <TextInput
                    type="time"
                    value={form.timeReported}
                    onChange={(e) => set("timeReported", e.target.value)}
                    error={e1.timeReported}
                  />
                </Field>
              </div>
              <div className="sr-grid sr-grid--3">
                <Field
                  label="Location"
                  required
                  error={e1.location}
                  hint="Auto-set from SIRI Reference Type above."
                >
                  <TextInput
                    value={
                      form.location || "— Select SIRI Reference Type first —"
                    }
                    readOnly
                    style={{
                      background: "var(--sr-paper-alt)",
                      color: "var(--sr-muted)",
                      cursor: "not-allowed",
                    }}
                  />
                </Field>
                <Field
                  label="Specific Location"
                  required
                  error={e1.specificLocation}
                >
                  <TextInput
                    value={form.specificLocation}
                    onChange={(e) => set("specificLocation", e.target.value)}
                    error={e1.specificLocation}
                  />
                </Field>
                <Field label="Level">
                  <TextInput
                    value={form.level}
                    onChange={(e) => set("level", e.target.value)}
                  />
                </Field>
              </div>
              <div className="sr-grid sr-grid--2">
                <Field label="Reported By" required error={e1.reportedBy}>
                  <div className="sr-radio-row">
                    <Radio
                      name="reportedBy"
                      label="Victim"
                      checked={form.reportedBy === "Victim"}
                      onChange={() => set("reportedBy", "Victim")}
                    />
                    <Radio
                      name="reportedBy"
                      label="Witness"
                      checked={form.reportedBy === "Witness"}
                      onChange={() => set("reportedBy", "Witness")}
                    />
                  </div>
                </Field>

                <Field label="Group" required error={e1.group}>
                  <Select
                    value={form.group}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    error={e1.group}
                  >
                    <option value="">— Select —</option>
                    {groupList.map((g) => (
                      <option key={g.gd_id} value={g.gd_id}>
                        {g.group}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="sr-grid sr-grid--3">
                <Field label="Department" required error={e1.department}>
                  <Select
                    value={form.department}
                    onChange={(e) => set("department", e.target.value)}
                    error={e1.department}
                    disabled={!form.group}
                  >
                    <option value="">
                      {form.group ? "— Select —" : "Select a group first"}
                    </option>
                    {deptList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.department}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Section" required error={e1.section}>
                  <TextInput
                    value={form.section}
                    onChange={(e) => set("section", e.target.value)}
                    error={e1.section}
                  />
                </Field>
                <Field
                  label="Supervisor Reported To"
                  required
                  error={e1.reportedTo}
                >
                  <StaffPicker
                    value={form.reportedTo}
                    onChange={(v) => set("reportedTo", v)}
                    error={e1.reportedTo}
                    placeholder={
                      !form.group || !form.department
                        ? "Select group & department first"
                        : "Assign supervisor…"
                    }
                    users={users}
                    selectedGroupObj={selectedGroupObj}
                    selectedDeptObj={selectedDeptObj}
                    disabled={!form.group || !form.department}
                  />
                </Field>
              </div>
              <div className="sr-grid sr-grid--3">
                <Field label="Group Head" required error={e1.groupHead}>
                  <GroupHeadPicker
                    value={form.groupHead}
                    onChange={(v) => set("groupHead", v)}
                    error={e1.groupHead}
                    users={users}
                    selectedGroupObj={selectedGroupObj}
                    disabled={!form.group}
                  />
                </Field>

                <Field
                  label="Department Head"
                  required
                  error={e1.departmentHead}
                >
                  <DeptHeadPicker
                    value={form.departmentHead}
                    onChange={(v) => set("departmentHead", v)}
                    error={e1.departmentHead}
                    users={users}
                    selectedGroupObj={selectedGroupObj}
                    selectedDeptObj={selectedDeptObj}
                    disabled={!form.group || !form.department}
                  />
                </Field>

                <Field label="Section Head" error={e1.sectionHead}>
                  <StaffPicker
                    value={form.sectionHead}
                    onChange={(v) => set("sectionHead", v)}
                    error={e1.sectionHead}
                    placeholder={
                      !form.group || !form.department
                        ? "Select group & department first"
                        : "Assign section head…"
                    }
                    users={users}
                    selectedGroupObj={selectedGroupObj}
                    selectedDeptObj={selectedDeptObj}
                    disabled={!form.group || !form.department}
                  />
                </Field>
              </div>
              <div className="sr-grid sr-grid--3">
                <Field label="Date Hired" required error={e1.dateHired}>
                  <TextInput
                    type="date"
                    value={form.dateHired}
                    onChange={(e) => set("dateHired", e.target.value)}
                    error={e1.dateHired}
                  />
                </Field>
                <Field label="Date of Birth" required error={e1.dateOfBirth}>
                  <TextInput
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => handleDOB(e.target.value)}
                    error={e1.dateOfBirth}
                  />
                </Field>
                <Field label="Age">
                  <TextInput
                    type="number"
                    min="0"
                    value={form.age}
                    onChange={(e) => set("age", e.target.value)}
                  />
                </Field>
              </div>
              <div className="sr-grid sr-grid--3">
                <Field label="Home Address" required error={e1.homeAddress}>
                  <TextInput
                    value={form.homeAddress}
                    onChange={(e) => set("homeAddress", e.target.value)}
                    error={e1.homeAddress}
                  />
                </Field>
                <Field label="Status" required error={e1.status}>
                  <Select
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                    error={e1.status}
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
                  error={e1.noOfDependents}
                >
                  <TextInput
                    type="number"
                    min="0"
                    value={form.noOfDependents}
                    onChange={(e) => set("noOfDependents", e.target.value)}
                    error={e1.noOfDependents}
                  />
                </Field>
              </div>
              <div className="sr-grid sr-grid--2">
                <Field
                  label="Length of Service"
                  required
                  error={e1.lengthOfService}
                >
                  <TextInput
                    value={form.lengthOfService}
                    onChange={(e) => set("lengthOfService", e.target.value)}
                    error={e1.lengthOfService}
                  />
                </Field>
                <Field
                  label="Experience at Occupation"
                  required
                  error={e1.experienceAtOccupation}
                >
                  <TextInput
                    value={form.experienceAtOccupation}
                    onChange={(e) =>
                      set("experienceAtOccupation", e.target.value)
                    }
                    error={e1.experienceAtOccupation}
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Working Area" error={e1.workingAreas}>
              <div className="sr-area-grid">
                {areaZones.map(([zone, areas]) => (
                  <div key={zone} className="sr-area-col">
                    {/* <span className="sr-area-zone">{zone}</span> */}
                    <div className="sr-check-grid sr-check-grid--col">
                      {areas.map((a) => (
                        <Check
                          key={a}
                          checked={form.workingAreas.includes(a)}
                          onChange={() => toggle("workingAreas", a)}
                          label={a}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="sr-area-col">
                  <span className="sr-area-zone">Other</span>
                  <div className="sr-other">
                    <Check
                      checked={form.workingAreas.includes("Others")}
                      onChange={() => toggle("workingAreas", "Others")}
                      label="Others:"
                    />
                    <input
                      className={`sr-other-input${e1.othersArea ? " sr-input--err" : ""}`}
                      value={form.othersArea}
                      onChange={(e) => set("othersArea", e.target.value)}
                    />
                    <ErrorText msg={e1.othersArea} />
                  </div>
                </div>
              </div>
            </Panel>

            <Panel
              title="Incident / Accident Brief Description"
              error={e1.incidentDescription}
            >
              <p className="sr-help">
                What happened —{" "}
                <em>"Kasano iti panakapasamak ti aksidente/insidente?"</em> —
                provide sufficient detail.
              </p>
              <TextArea
                rows={7}
                value={form.incidentDescription}
                onChange={(e) => set("incidentDescription", e.target.value)}
                error={e1.incidentDescription}
              />
            </Panel>

            <Panel title="Immediate Actions Taken" error={e1.immediateActions}>
              <p className="sr-help">
                What did you do straight away —{" "}
                <em>
                  "Anya dagiti wagas nga inaramid mo idi kalpasan ti
                  aksidente/insidente?"
                </em>
              </p>
              <TextArea
                rows={5}
                value={form.immediateActions}
                onChange={(e) => set("immediateActions", e.target.value)}
                error={e1.immediateActions}
              />
            </Panel>

            <Plate code="SECTION.02" title="Participants" />

            <Panel>
              <p className="sr-help">
                Please list any other people involved in, or witness to, the
                incident. Statement forms shall be accomplished.
              </p>
              <div className="sr-action-list">
                {form.participants.map((p, idx) => {
                  const rowErr = eP.rows[p.id] || {};
                  return (
                    <div className="sr-action-card" key={p.id}>
                      <div className="sr-action-head">
                        <span className="sr-action-num">
                          PARTICIPANT {String(idx + 1).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          className="sr-action-remove"
                          disabled={form.participants.length === 1}
                          onClick={() => removeParticipantRow(p.id)}
                          title="Remove participant"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="sr-grid sr-grid--3">
                        <Field
                          label="Name of Person Involved"
                          error={rowErr.name}
                        >
                          <TextInput
                            value={p.name}
                            onChange={(e) =>
                              setParticipant(p.id, "name", e.target.value)
                            }
                            error={rowErr.name}
                          />
                        </Field>
                        <Field label="Department" error={rowErr.department}>
                          <TextInput
                            value={p.department}
                            onChange={(e) =>
                              setParticipant(p.id, "department", e.target.value)
                            }
                            error={rowErr.department}
                          />
                        </Field>
                        <Field
                          label="Involvement Type"
                          error={rowErr.involvementType}
                        >
                          <TextInput
                            value={p.involvementType}
                            onChange={(e) =>
                              setParticipant(
                                p.id,
                                "involvementType",
                                e.target.value,
                              )
                            }
                            error={rowErr.involvementType}
                          />
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="sr-btn sr-btn--ghost"
                style={{ marginTop: "4px" }}
                onClick={addParticipantRow}
              >
                + Add Participant
              </button>
            </Panel>

            <Panel title="Prepared By">
              <div className="sr-grid sr-grid--3">
                <Field
                  label="Safety Officer"
                  required
                  error={eP.preparedByName}
                >
                  <TextInput
                    value={displayName}
                    readOnly
                    style={{
                      background: "var(--sr-paper-alt)",
                      color: "var(--sr-muted)",
                      cursor: "not-allowed",
                    }}
                  />
                </Field>
                <Field
                  label="Immediate Supervisor on Duty"
                  required
                  error={eP.immediateSupervisorOnDuty}
                >
                  <TextInput
                    value={form.immediateSupervisorOnDuty}
                    onChange={(e) =>
                      set("immediateSupervisorOnDuty", e.target.value)
                    }
                  />
                </Field>
                <Field
                  label="Date & Time"
                  required
                  error={eP.preparedByDateTime}
                >
                  <TextInput
                    type="datetime-local"
                    value={form.preparedByDateTime}
                    onChange={(e) => set("preparedByDateTime", e.target.value)}
                    error={eP.preparedByDateTime}
                  />
                </Field>
              </div>
              <p className="sr-help" style={{ marginTop: 0 }}>
                Safety Officer and Immediate Supervisor on Duty (Name and
                Signature)
              </p>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET — copied from ViewReport.jsx design system
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

/* ═══ BASE ═══ */
.sr-shell * { box-sizing: border-box; }
.sr-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--sr-paper-alt);
  font-family: var(--font-body);
  color: var(--sr-ink);
}

/* ═══ TOP HEADER BAR ═══ */
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
  flex-wrap: wrap;
  gap: 12px;
}

.sr-topbar-brand-left {
  display: flex;
  align-items: center;
  gap: 16px;
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

.sr-topbar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
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

/* ═══ SECTION STRIP (replaces tab strip for single-page form) ═══ */
.sr-section-strip {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 32px;
  border-bottom: none;
  overflow-x: auto;
  scrollbar-width: none;
}
.sr-section-strip::-webkit-scrollbar { display: none; }

.sr-section-strip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  color: #4A6B84;
  font-size: 12px;
  white-space: nowrap;
}
.sr-section-strip-item--active { color: #E8F4EF; }

.sr-section-strip-num {
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-family: var(--font-mono); flex-shrink: 0;
}
.sr-section-strip-item--active .sr-section-strip-num {
  background: #1B8C60; color: #fff;
}

.sr-section-strip-label { font-weight: 500; }
.sr-section-strip-divider {
  width: 20px; height: 1px; background: rgba(255,255,255,0.1);
}
.sr-section-strip-note {
  margin-left: auto;
  font-size: 10px;
  color: #4A6B84;
  font-style: italic;
  padding: 11px 0;
  white-space: nowrap;
}

/* Participants filled state */
.sr-section-strip-item--filled {
  color: #A8D5C4;
}
.sr-section-strip-num--filled {
  background: #1B8C60;
  color: #fff;
  font-size: 10px;
}
.sr-section-strip-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px; height: 16px;
  background: #1B8C60;
  color: #fff;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 0 4px;
  letter-spacing: 0;
  margin-left: 2px;
}

/* ═══ MAIN CONTENT ═══ */
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

/* ═══ PLATE ═══ */
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

/* ═══ PANEL ═══ */
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
.sr-panel-body {
  display: flex; flex-direction: column; gap: 16px;
}
.sr-help {
  font-size: 12px; color: var(--sr-muted); font-style: italic; margin: 0;
}

/* ═══ GRID ═══ */
.sr-grid { display: grid; gap: 16px; }
.sr-grid--2 { grid-template-columns: repeat(2, 1fr); }
.sr-grid--3 { grid-template-columns: repeat(3, 1fr); }
.sr-grid--4 { grid-template-columns: repeat(4, 1fr); }   /* ← add this */
@media (max-width: 900px) {
  .sr-grid--2, .sr-grid--3, .sr-grid--4 { grid-template-columns: 1fr; }
}
/* ═══ FIELDS ═══ */
.sr-field { display: flex; flex-direction: column; gap: 6px; }
.sr-label {
  font-size: 11.5px; font-weight: 600; color: var(--sr-ink-soft);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.sr-req { color: var(--sr-danger); margin-left: 3px; }
.sr-hint { font-size: 11px; color: var(--sr-muted); font-style: italic; }

.sr-input, .sr-textarea, .sr-select {
  font-family: var(--font-body); font-size: 13.5px; color: var(--sr-ink);
  background: var(--sr-paper-alt);
  border: 1.5px solid var(--sr-line-strong);
  border-radius: 5px; padding: 8px 10px; outline: none; width: 100%;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sr-select { cursor: pointer; }
.sr-input:focus, .sr-textarea:focus, .sr-select:focus {
  border-color: var(--sr-amber);
  box-shadow: 0 0 0 3px rgba(27,94,68,0.15);
  background: #fff;
}
.sr-input--err { border-color: var(--sr-danger); background: var(--sr-danger-soft); }
.sr-textarea { resize: vertical; font-family: var(--font-body); }

.sr-error-text {
  color: var(--sr-danger); font-size: 11px; font-weight: 600;
  margin-top: 3px; line-height: 1.4;
}
.sr-banner {
  background: var(--sr-danger-soft); border: 1px solid var(--sr-danger);
  color: #7A1F1F; font-size: 13px; font-weight: 600;
  padding: 10px 14px; border-radius: 6px;
}

/* ═══ CHECKBOX / RADIO ═══ */
.sr-check-grid { display: flex; flex-wrap: wrap; gap: 10px 20px; }
.sr-check-grid--col { flex-direction: column; gap: 8px; flex-wrap: nowrap; }

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
.sr-radio {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; cursor: pointer; color: var(--sr-ink-soft);
  padding: 6px; border-radius: 5px;
}
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

.sr-other { display: flex; flex-direction: column; gap: 6px; }
.sr-other-input {
  border: none; border-bottom: 1.5px solid var(--sr-line-strong);
  background: transparent; font-size: 13px; padding: 3px 2px;
  outline: none; color: var(--sr-ink);
}
.sr-other-input:focus { border-color: var(--sr-amber); }
.sr-other-input.sr-input--err { border-color: var(--sr-danger); }

/* ═══ WORKING AREA GRID ═══ */
.sr-area-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
@media (max-width: 1000px) { .sr-area-grid { grid-template-columns: repeat(2, 1fr); } }
.sr-area-col { display: flex; flex-direction: column; gap: 6px; }
.sr-area-zone {
  font-size: 10.5px; font-weight: 700; color: var(--sr-amber);
  text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;
}

/* ═══ NOTICE BANNER ═══ */
.sr-notice {
  background: var(--sr-amber-soft);
  border: 1px solid var(--sr-amber);
  color: var(--sr-amber-deep);
  font-size: 12px; padding: 10px 14px; border-radius: 6px; line-height: 1.5;
}

/* ═══ PARTICIPANT CARDS ═══ */
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

/* ═══ BUTTONS ═══ */
.sr-btn {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
  padding: 9px 18px; border-radius: 6px; cursor: pointer; border: 1.5px solid transparent;
}
.sr-btn--primary {
  background: var(--sr-amber); color: #fff; border-color: var(--sr-amber-deep);
}
.sr-btn--primary:hover { background: var(--sr-amber-deep); }
.sr-btn--ghost {
  background: #fff; color: var(--sr-ink-soft); border-color: var(--sr-line-strong);
}
.sr-btn--ghost:hover { border-color: var(--sr-ink-soft); background: var(--sr-paper-alt); }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  .sr-topbar-brand { padding: 10px 16px; }
  .sr-section-strip { padding: 0 16px; }
  .sr-section-strip-note { display: none; }
  .sr-main { padding: 20px 16px 60px; }
  .sr-topbar-actions { gap: 8px; }
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
`;
