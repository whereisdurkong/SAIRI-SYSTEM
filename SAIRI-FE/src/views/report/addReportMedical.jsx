import { useState, useEffect } from "react";
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

/* ════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════ */
const isEmpty = (v) => v === undefined || v === null || String(v).trim() === "";
const isFutureDate = (d) => {
  if (!d) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return new Date(d) > today;
};
const isValidNumber = (v) =>
  v !== "" && v !== null && v !== undefined && !isNaN(Number(v));

let participantIdCounter = 1;
const makeParticipant = () => ({
  id: participantIdCounter++,
  name: "",
  department: "",
  involvementType: "",
});

/* ════════════════════════════════════════════════════════════════════════
   DEFAULT STATE
   ════════════════════════════════════════════════════════════════════════ */
const makeSection12 = () => ({
  siriRefType: "",
  dataFor: "",
  workRelated: "not_work_related",
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
  preparedByDateTime: "",
});

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
  dateTime: "",
});

/* ════════════════════════════════════════════════════════════════════════
   UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════ */
function Req() {
  return <span className="add-req">＊</span>;
}
function ErrorText({ msg }) {
  if (!msg) return null;
  return <div className="add-err">{msg}</div>;
}
function Field({ label, required, error, children, hint }) {
  return (
    <label className="add-field">
      {label && (
        <span className="add-label">
          {label}
          {required && <Req />}
        </span>
      )}
      {children}
      {hint && <span className="add-hint">{hint}</span>}
      <ErrorText msg={error} />
    </label>
  );
}
function Panel({ title, error, children }) {
  return (
    <div className="add-panel">
      {title && (
        <div className="add-panel-title">
          {title}
          {error && <ErrorText msg={error} />}
        </div>
      )}
      <div className="add-panel-body">{children}</div>
    </div>
  );
}
function Plate({ code, title, note }) {
  return (
    <div className="add-plate">
      <span className="add-plate-code">{code}</span>
      <span className="add-plate-title">{title}</span>
      {note && <span className="add-plate-note">{note}</span>}
    </div>
  );
}
function TextInput({ error, ...props }) {
  return (
    <input
      className={`add-input${error ? " add-input--err" : ""}`}
      {...props}
    />
  );
}
function TextArea({ error, ...props }) {
  return (
    <textarea
      className={`add-textarea${error ? " add-input--err" : ""}`}
      {...props}
    />
  );
}
function Select({ error, children, ...props }) {
  return (
    <select
      className={`add-input add-select${error ? " add-input--err" : ""}`}
      {...props}
    >
      {children}
    </select>
  );
}
function Check({ checked, onChange, label, disabled }) {
  return (
    <label className={`add-check${disabled ? " add-check--disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="add-check-box" />
      <span className="add-check-label">{label}</span>
    </label>
  );
}
function Radio({ checked, onChange, name, label, disabled }) {
  return (
    <label className="add-radio">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="add-radio-dot" />
      <span className="add-radio-label">{label}</span>
    </label>
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
    <div className="add-other">
      <Check
        checked={checked}
        onChange={onToggle}
        label={`${label}:`}
        disabled={disabled}
      />
      <input
        className={`add-other-input${error ? " add-input--err" : ""}`}
        value={value}
        onChange={onChange}
        disabled={!checked || disabled}
        placeholder="Specify…"
      />
      <ErrorText msg={error} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TABS CONFIG — now just 2
   ════════════════════════════════════════════════════════════════════════ */
const TABS = [
  {
    id: 1,
    code: "SECTION.01–02",
    label: "General Info",
    short: "General Info",
  },
  {
    id: 2,
    code: "SECTION.03",
    label: "Medical Evaluation",
    short: "Medical Eval.",
  },
];

/* ════════════════════════════════════════════════════════════════════════
   TAB 1 — GENERAL INFO (Sections 1 + 2 combined)
   ════════════════════════════════════════════════════════════════════════ */
function GeneralInfoTab({
  form,
  setForm,
  errors,
  groupList,
  deptList,
  onGroupChange,
  displayName,
}) {
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

  const areaZones = [
    ["Zone A", WORKING_AREAS_COL1],
    ["Zone B", WORKING_AREAS_COL2],
    ["Zone C", WORKING_AREAS_COL3],
    ["Zone D", WORKING_AREAS_COL4],
  ];

  const e = errors;

  return (
    <div className="add-stack">
      {/* ─── SECTION 1 ─── */}
      <Plate code="SECTION.01" title="General Information" />

      <Panel>
        <div className="add-grid add-grid--3">
          <Field
            label="SIRI Reference Type"
            required
            error={e.siriRefType}
            hint="Safety Dept. generates this number — SUG-AIRI-XXX (Underground) / SSF-AIRI-XXX (Surface)."
          >
            <Select
              value={form.siriRefType}
              onChange={(ev) => set("siriRefType", ev.target.value)}
              error={e.siriRefType}
            >
              <option value="">— Select —</option>
              <option value="underground">Underground</option>
              <option value="surface">Surface</option>
            </Select>
          </Field>
          <Field label="Data For?" required error={e.dataFor}>
            <Select
              value={form.dataFor}
              onChange={(ev) => set("dataFor", ev.target.value)}
              error={e.dataFor}
            >
              <option value="">— Select —</option>
              <option value="active_data">Active Data</option>
              <option value="historical">Historical</option>
            </Select>
          </Field>
          <Field label="Work Related?" hint="Fixed to Not Work Related.">
            <TextInput
              value="Not Work Related"
              readOnly
              style={{
                background: "var(--add-paper-alt)",
                color: "var(--add-muted)",
                cursor: "not-allowed",
              }}
            />
          </Field>
        </div>
        <Field
          label="Government Notification Required?"
          required
          error={e.govtNotification}
        >
          <div className="add-radio-row">
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
      </Panel>

      <Panel title="Accident/Incident Subtype" error={e.subtypes}>
        <Field label="Subtype" required error={e.subtypes}>
          <Select
            value={form.subtypes[0] || ""}
            onChange={(ev) =>
              set("subtypes", ev.target.value ? [ev.target.value] : [])
            }
            error={e.subtypes}
          >
            <option value="">— Select —</option>
            <option value="Injury">Injury</option>
            <option value="Property Damage">Property Damage</option>
            <option value="Illnesses">Illnesses</option>
            <option value="High Potential Near Miss">
              High Potential Near Miss
            </option>
          </Select>
        </Field>
      </Panel>

      <Panel>
        <Field
          label="Employer"
          required
          error={e.employer}
          hint="Please specify what company/contract."
        >
          <TextInput
            value={form.employer}
            onChange={(ev) => set("employer", ev.target.value)}
            error={e.employer}
          />
        </Field>
        <div className="add-grid add-grid--3">
          <Field label="Name" required error={e.name}>
            <TextInput
              value={form.name}
              onChange={(ev) => set("name", ev.target.value)}
              error={e.name}
            />
          </Field>
          <Field label="Chapa No." required error={e.chapaNo}>
            <TextInput
              value={form.chapaNo}
              onChange={(ev) => set("chapaNo", ev.target.value)}
              error={e.chapaNo}
            />
          </Field>
          <Field label="Job Designation" required error={e.jobDesignation}>
            <TextInput
              value={form.jobDesignation}
              onChange={(ev) => set("jobDesignation", ev.target.value)}
              error={e.jobDesignation}
            />
          </Field>
        </div>
        <div className="add-grid add-grid--3">
          <Field label="Date of Event" required error={e.dateOfEvent}>
            <TextInput
              type="date"
              value={form.dateOfEvent}
              onChange={(ev) => set("dateOfEvent", ev.target.value)}
              error={e.dateOfEvent}
            />
          </Field>
          <Field label="Time of Event" required error={e.timeOfEvent}>
            <TextInput
              type="time"
              value={form.timeOfEvent}
              onChange={(ev) => set("timeOfEvent", ev.target.value)}
              error={e.timeOfEvent}
            />
          </Field>
          <Field label="Shift" required error={e.shift}>
            <Select
              value={form.shift}
              onChange={(ev) => set("shift", ev.target.value)}
              error={e.shift}
            >
              <option value="">— Select —</option>
              <option value="1st Shift">1st Shift</option>
              <option value="2nd Shift">2nd Shift</option>
              <option value="3rd Shift">3rd Shift</option>
            </Select>
          </Field>
        </div>
        <div className="add-grid add-grid--2">
          <Field label="Date Reported" required error={e.dateReported}>
            <TextInput
              type="date"
              value={form.dateReported}
              onChange={(ev) => set("dateReported", ev.target.value)}
              error={e.dateReported}
            />
          </Field>
          <Field label="Time Reported" required error={e.timeReported}>
            <TextInput
              type="time"
              value={form.timeReported}
              onChange={(ev) => set("timeReported", ev.target.value)}
              error={e.timeReported}
            />
          </Field>
        </div>
        <div className="add-grid add-grid--3">
          <Field
            label="Location"
            required
            error={e.location}
            hint="Auto-set from SIRI Reference Type above."
          >
            <TextInput
              value={form.location || "— Select SIRI Reference Type first —"}
              readOnly
              style={{
                background: "var(--add-paper-alt)",
                color: "var(--add-muted)",
                cursor: "not-allowed",
              }}
            />
          </Field>
          <Field label="Specific Location" required error={e.specificLocation}>
            <TextInput
              value={form.specificLocation}
              onChange={(ev) => set("specificLocation", ev.target.value)}
              error={e.specificLocation}
            />
          </Field>
          <Field label="Level">
            <TextInput
              value={form.level}
              onChange={(ev) => set("level", ev.target.value)}
            />
          </Field>
        </div>
        <div className="add-grid add-grid--2">
          <Field label="Reported By" required error={e.reportedBy}>
            <div className="add-radio-row">
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
          <Field label="Supervisor Reported To" required error={e.reportedTo}>
            <TextInput
              value={form.reportedTo}
              onChange={(ev) => set("reportedTo", ev.target.value)}
              error={e.reportedTo}
            />
          </Field>
        </div>
        <div className="add-grid add-grid--3">
          <Field label="Group" required error={e.group}>
            <Select
              value={form.group}
              onChange={(ev) => onGroupChange(ev.target.value)}
              error={e.group}
            >
              <option value="">— Select —</option>
              {groupList.map((g) => (
                <option key={g.gd_id} value={g.gd_id}>
                  {g.group}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department" required error={e.department}>
            <Select
              value={form.department}
              onChange={(ev) => set("department", ev.target.value)}
              error={e.department}
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
          <Field label="Section" required error={e.section}>
            <TextInput
              value={form.section}
              onChange={(ev) => set("section", ev.target.value)}
              error={e.section}
            />
          </Field>
        </div>
        <div className="add-grid add-grid--3">
          <Field label="Date Hired" required error={e.dateHired}>
            <TextInput
              type="date"
              value={form.dateHired}
              onChange={(ev) => set("dateHired", ev.target.value)}
              error={e.dateHired}
            />
          </Field>
          <Field label="Date of Birth" required error={e.dateOfBirth}>
            <TextInput
              type="date"
              value={form.dateOfBirth}
              onChange={(ev) => handleDOB(ev.target.value)}
              error={e.dateOfBirth}
            />
          </Field>
          <Field label="Age">
            <TextInput
              type="number"
              min="0"
              value={form.age}
              onChange={(ev) => set("age", ev.target.value)}
            />
          </Field>
        </div>
        <div className="add-grid add-grid--3">
          <Field label="Home Address" required error={e.homeAddress}>
            <TextInput
              value={form.homeAddress}
              onChange={(ev) => set("homeAddress", ev.target.value)}
              error={e.homeAddress}
            />
          </Field>
          <Field label="Status" required error={e.status}>
            <Select
              value={form.status}
              onChange={(ev) => set("status", ev.target.value)}
              error={e.status}
            >
              <option value="">— Select —</option>
              <option>Single</option>
              <option>Married</option>
              <option>Widowed</option>
              <option>Separated</option>
            </Select>
          </Field>
          <Field label="No. of Dependents" required error={e.noOfDependents}>
            <TextInput
              type="number"
              min="0"
              value={form.noOfDependents}
              onChange={(ev) => set("noOfDependents", ev.target.value)}
              error={e.noOfDependents}
            />
          </Field>
        </div>
        <div className="add-grid add-grid--2">
          <Field label="Length of Service" required error={e.lengthOfService}>
            <TextInput
              value={form.lengthOfService}
              onChange={(ev) => set("lengthOfService", ev.target.value)}
              error={e.lengthOfService}
            />
          </Field>
          <Field
            label="Experience at Occupation"
            required
            error={e.experienceAtOccupation}
          >
            <TextInput
              value={form.experienceAtOccupation}
              onChange={(ev) => set("experienceAtOccupation", ev.target.value)}
              error={e.experienceAtOccupation}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Working Area" error={e.workingAreas}>
        <div className="add-area-grid">
          {areaZones.map(([zone, areas]) => (
            <div key={zone} className="add-check-col">
              {areas.map((a) => (
                <Check
                  key={a}
                  checked={form.workingAreas.includes(a)}
                  onChange={() => toggle("workingAreas", a)}
                  label={a}
                />
              ))}
            </div>
          ))}
          <div className="add-check-col">
            <Check
              checked={form.workingAreas.includes("Others")}
              onChange={() => toggle("workingAreas", "Others")}
              label="Others:"
            />
            <input
              className={`add-other-input${e.othersArea ? " add-input--err" : ""}`}
              value={form.othersArea}
              onChange={(ev) => set("othersArea", ev.target.value)}
            />
            <ErrorText msg={e.othersArea} />
          </div>
        </div>
      </Panel>

      <Panel
        title="Incident / Accident Brief Description"
        error={e.incidentDescription}
      >
        <p className="add-help">
          What happened —{" "}
          <em>"Kasano iti panakapasamak ti aksidente/insidente?"</em> — provide
          sufficient detail.
        </p>
        <TextArea
          rows={6}
          value={form.incidentDescription}
          onChange={(ev) => set("incidentDescription", ev.target.value)}
          error={e.incidentDescription}
        />
      </Panel>

      <Panel title="Immediate Actions Taken" error={e.immediateActions}>
        <p className="add-help">
          What did you do straight away —{" "}
          <em>
            "Anya dagiti wagas nga inaramid mo idi kalpasan ti
            aksidente/insidente?"
          </em>
        </p>
        <TextArea
          rows={4}
          value={form.immediateActions}
          onChange={(ev) => set("immediateActions", ev.target.value)}
          error={e.immediateActions}
        />
      </Panel>

      {/* ─── SECTION 2 ─── */}
      <Plate code="SECTION.02" title="Participants" />

      <Panel>
        <p className="add-help">
          Please list any other people involved in, or witness to, the incident.
          Statement forms shall be accomplished.
        </p>
        <div className="add-action-list">
          {form.participants.map((p, idx) => {
            const rowErr = (e.rows || {})[p.id] || {};
            return (
              <div className="add-action-card" key={p.id}>
                <div className="add-action-head">
                  <span className="add-action-num">
                    PARTICIPANT {String(idx + 1).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    className="add-action-remove"
                    disabled={form.participants.length === 1}
                    onClick={() => removeParticipantRow(p.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="add-grid add-grid--3">
                  <Field label="Name of Person Involved" error={rowErr.name}>
                    <TextInput
                      value={p.name}
                      onChange={(ev) =>
                        setParticipant(p.id, "name", ev.target.value)
                      }
                      error={rowErr.name}
                    />
                  </Field>
                  <Field label="Department" error={rowErr.department}>
                    <TextInput
                      value={p.department}
                      onChange={(ev) =>
                        setParticipant(p.id, "department", ev.target.value)
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
                      onChange={(ev) =>
                        setParticipant(p.id, "involvementType", ev.target.value)
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
          className="add-btn add-btn--ghost-dark"
          style={{ marginTop: "4px" }}
          onClick={addParticipantRow}
        >
          + Add Participant
        </button>
      </Panel>

      <Panel title="Prepared By">
        <div className="add-grid add-grid--2">
          <Field label="Name" required>
            <TextInput
              value={displayName}
              readOnly
              style={{
                background: "var(--add-paper-alt)",
                color: "var(--add-muted)",
                cursor: "not-allowed",
              }}
            />
          </Field>
          <Field label="Date & Time" required error={e.preparedByDateTime}>
            <TextInput
              type="datetime-local"
              value={form.preparedByDateTime}
              onChange={(ev) => set("preparedByDateTime", ev.target.value)}
              error={e.preparedByDateTime}
            />
          </Field>
        </div>
        <p className="add-help" style={{ marginTop: 0 }}>
          Safety Officer and Immediate Supervisor on Duty (Name and Signature)
        </p>
      </Panel>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TAB 2 — MEDICAL EVALUATION (Section 3)
   ════════════════════════════════════════════════════════════════════════ */
function MedicalEvalTab({ form, setForm, errors, displayName }) {
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

  const toggleOther = (listField, otherField, tag) => {
    const isChecked = form[listField].includes(tag);
    setForm((f) => ({
      ...f,
      [listField]: isChecked
        ? f[listField].filter((v) => v !== tag)
        : [...f[listField], tag],
      [otherField]: isChecked ? "" : f[otherField],
    }));
  };
  const handleOtherText = (listField, otherField, tag, val) => {
    setForm((f) => {
      const already = f[listField].includes(tag);
      if (val.trim() && !already)
        return { ...f, [otherField]: val, [listField]: [...f[listField], tag] };
      if (!val.trim() && already)
        return {
          ...f,
          [otherField]: val,
          [listField]: f[listField].filter((v) => v !== tag),
        };
      return { ...f, [otherField]: val };
    });
  };

  const e = errors;

  return (
    <div className="add-stack">
      <Plate
        code="SECTION.03"
        title="Injury & Medical Evaluation"
        note="Company Doctor / Nurse to complete"
      />

      <Panel>
        <div className="add-grid add-grid--2">
          <Field
            label="Recurrent Injury / Illness"
            required
            error={e.recurrentInjury}
          >
            <div className="add-radio-row">
              <Radio
                name="recurrent"
                label="Yes"
                checked={form.recurrentInjury === "YES"}
                onChange={() => set("recurrentInjury", "YES")}
              />
              <Radio
                name="recurrent"
                label="No"
                checked={form.recurrentInjury === "NO"}
                onChange={() => set("recurrentInjury", "NO")}
              />
            </div>
          </Field>
          <Field
            label="Date & Time Treatment Provided"
            required
            error={e.dateTimeProvided}
          >
            <TextInput
              type="datetime-local"
              value={form.dateTimeProvided}
              onChange={(ev) => set("dateTimeProvided", ev.target.value)}
              error={e.dateTimeProvided}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Extent of Disability ＊" error={e.extentOfDisability}>
        <div className="add-check-row">
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
            />
          ))}
        </div>
      </Panel>

      <Panel title="Nature of Injury ＊" error={e.natureOfInjury}>
        <div className="add-grid add-grid--3">
          <div className="add-check-col">
            {[
              "Disease",
              "Amputation",
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
              />
            ))}
          </div>
          <div className="add-check-col">
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
              />
            ))}
          </div>
          <div className="add-check-col">
            <Check
              checked={form.natureOfInjury.includes("Fatal (Nature)")}
              onChange={() => toggle("natureOfInjury", "Fatal (Nature)")}
              label="Fatal"
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
              />
            ))}
            <OtherInput
              label="Others"
              checked={form.natureOfInjury.includes("Others (Nature)")}
              onToggle={() =>
                toggleOther(
                  "natureOfInjury",
                  "natureOfInjuryOther",
                  "Others (Nature)",
                )
              }
              value={form.natureOfInjuryOther}
              onChange={(ev) =>
                handleOtherText(
                  "natureOfInjury",
                  "natureOfInjuryOther",
                  "Others (Nature)",
                  ev.target.value,
                )
              }
              error={e.natureOfInjuryOther}
            />
          </div>
        </div>
      </Panel>

      <div className="add-grid add-grid--2">
        <Panel title="Mechanism of Injury ＊" error={e.mechanismOfInjury}>
          <div className="add-check-col">
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
              />
            ))}
            <OtherInput
              checked={form.mechanismOfInjury.includes("Other (Mechanism)")}
              onToggle={() =>
                toggleOther(
                  "mechanismOfInjury",
                  "mechanismOfInjuryOther",
                  "Other (Mechanism)",
                )
              }
              value={form.mechanismOfInjuryOther}
              onChange={(ev) =>
                handleOtherText(
                  "mechanismOfInjury",
                  "mechanismOfInjuryOther",
                  "Other (Mechanism)",
                  ev.target.value,
                )
              }
              error={e.mechanismOfInjuryOther}
            />
          </div>
        </Panel>
        <Panel title="Contact With / Exposure To ＊" error={e.contactExposure}>
          <div className="add-check-col">
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
              />
            ))}
            <div className="add-check-row">
              <Check
                checked={form.contactExposure.includes("COLD")}
                onChange={() => toggle("contactExposure", "COLD")}
                label="Cold"
              />
              <Check
                checked={form.contactExposure.includes("HOT")}
                onChange={() => toggle("contactExposure", "HOT")}
                label="Hot"
              />
            </div>
            {["Pressure", "Electricity", "Radiation"].map((v) => (
              <Check
                key={v}
                checked={form.contactExposure.includes(v)}
                onChange={() => toggle("contactExposure", v)}
                label={v}
              />
            ))}
            <OtherInput
              checked={form.contactExposure.includes("Other (Contact)")}
              onToggle={() =>
                toggleOther(
                  "contactExposure",
                  "contactExposureOther",
                  "Other (Contact)",
                )
              }
              value={form.contactExposureOther}
              onChange={(ev) =>
                handleOtherText(
                  "contactExposure",
                  "contactExposureOther",
                  "Other (Contact)",
                  ev.target.value,
                )
              }
              error={e.contactExposureOther}
            />
          </div>
        </Panel>
      </div>

      <div className="add-grid add-grid--2">
        <Panel title="Agency of Injury ＊" error={e.agencyOfInjury}>
          <div className="add-check-col">
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
              />
            ))}
            <OtherInput
              checked={form.agencyOfInjury.includes("Other (Agency)")}
              onToggle={() =>
                toggleOther(
                  "agencyOfInjury",
                  "agencyOfInjuryOther",
                  "Other (Agency)",
                )
              }
              value={form.agencyOfInjuryOther}
              onChange={(ev) =>
                handleOtherText(
                  "agencyOfInjury",
                  "agencyOfInjuryOther",
                  "Other (Agency)",
                  ev.target.value,
                )
              }
              error={e.agencyOfInjuryOther}
            />
          </div>
        </Panel>
        <Panel title="Parts of the Body Injured ＊" error={e.partsBodyInjured}>
          <div className="add-check-grid-2col">
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
              />
            ))}
          </div>
          <OtherInput
            label="Others"
            checked={form.partsBodyInjured.includes("Others (Body)")}
            onToggle={() =>
              toggleOther(
                "partsBodyInjured",
                "partsBodyInjuredOther",
                "Others (Body)",
              )
            }
            value={form.partsBodyInjuredOther}
            onChange={(ev) =>
              handleOtherText(
                "partsBodyInjured",
                "partsBodyInjuredOther",
                "Others (Body)",
                ev.target.value,
              )
            }
            error={e.partsBodyInjuredOther}
          />
        </Panel>
      </div>

      <div className="add-grid add-grid--2">
        <Panel title="Medical Diagnosis ＊" error={e.medicalDiagnosis}>
          <TextArea
            rows={4}
            value={form.medicalDiagnosis}
            onChange={(ev) => set("medicalDiagnosis", ev.target.value)}
            error={e.medicalDiagnosis}
          />
          <div className="add-vitals">
            <div className="add-vitals-head">Vital Signs</div>
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
              <div className="add-vitals-row" key={key}>
                <span className="add-vitals-label">
                  {label}
                  <Req />
                </span>
                <div>
                  <TextInput
                    value={form.vitals[key]}
                    onChange={(ev) => setVital(key, ev.target.value)}
                    error={e[errKey]}
                  />
                  <ErrorText msg={e[errKey]} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Rehabilitation Plan ＊" error={e.rehabilitationPlan}>
          <div className="add-check-col">
            <Check
              checked={form.rehabilitationPlan.includes("Fit to Work")}
              onChange={() => toggle("rehabilitationPlan", "Fit to Work")}
              label="Fit to Work"
            />
            <div className="add-rehab-sub">
              <Check
                checked={form.rehabilitationPlan.includes(
                  "Recommended for Light Works",
                )}
                onChange={() =>
                  toggle("rehabilitationPlan", "Recommended for Light Works")
                }
                label="Recommended for Light Works"
              />
              <div className="add-inline-field">
                <span>No. of Days</span>
                <TextInput
                  type="number"
                  min="0"
                  value={form.rehabLightWorkDays}
                  onChange={(ev) => set("rehabLightWorkDays", ev.target.value)}
                  error={e.rehabLightWorkDays}
                />
              </div>
              <ErrorText msg={e.rehabLightWorkDays} />
            </div>
            <Check
              checked={form.rehabilitationPlan.includes(
                "For further medical evaluation",
              )}
              onChange={() =>
                toggle("rehabilitationPlan", "For further medical evaluation")
              }
              label="For further medical evaluation (specify)"
            />
            <TextArea
              rows={3}
              value={form.rehabFurtherEval}
              onChange={(ev) => set("rehabFurtherEval", ev.target.value)}
              error={e.rehabFurtherEval}
              placeholder="Describe the evaluation needed…"
            />
            <ErrorText msg={e.rehabFurtherEval} />
          </div>
        </Panel>
      </div>

      <Panel
        title="Details of Treatment Provided ＊"
        error={e.detailsOfTreatment}
      >
        <TextArea
          rows={5}
          value={form.detailsOfTreatment}
          onChange={(ev) => set("detailsOfTreatment", ev.target.value)}
          error={e.detailsOfTreatment}
          placeholder="Describe all treatment given…"
        />
      </Panel>

      <Panel>
        <div className="add-grid add-grid--2">
          <Field label="Attending Physician's Name" required>
            <TextInput
              value={displayName}
              readOnly
              style={{
                background: "var(--add-paper-alt)",
                color: "var(--add-muted)",
                cursor: "not-allowed",
              }}
            />
          </Field>
          <Field label="Date / Time" required error={e.dateTime}>
            <TextInput
              type="datetime-local"
              value={form.dateTime}
              onChange={(ev) => set("dateTime", ev.target.value)}
              error={e.dateTime}
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */
export default function AddSection3Report() {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState(1);
  const [form12, setForm12] = useState(makeSection12());
  const [form3, setForm3] = useState(makeSection3());
  const [saving, setSaving] = useState(false);

  const empInfo = JSON.parse(localStorage.getItem("user")) || {};
  const [userData, setUserData] = useState(null);
  const [groupList, setGroupList] = useState([]);
  const [deptList, setDeptList] = useState([]);

  useEffect(() => {
    axios
      .get(`${config.baseApi}/setup/all`)
      .then((res) => {
        if (res.data.message === "success") setGroupList(res.data.data);
      })
      .catch((err) => console.error("Failed to fetch groups:", err));
  }, []);

  useEffect(() => {
    axios
      .get(`${config.baseApi}/auth/get-user-by-username`, {
        params: { user_name: empInfo.user_name },
      })
      .then((res) =>
        setUserData(Array.isArray(res.data) ? res.data[0] : res.data),
      )
      .catch((err) => console.log("Unable to fetch user data:", err));
  }, []);

  useEffect(() => {
    if (form12.siriRefType === "underground")
      setForm12((f) => ({ ...f, location: "underground" }));
    else if (form12.siriRefType === "surface")
      setForm12((f) => ({ ...f, location: "surface" }));
    else setForm12((f) => ({ ...f, location: "" }));
  }, [form12.siriRefType]);

  const displayName = userData
    ? `${userData.emp_firstname || ""} ${userData.emp_lastname || ""}`.trim()
    : empInfo.user_name || "";

  const handleGroupChange = (gdId) => {
    const selected = groupList.find((g) => String(g.gd_id) === String(gdId));
    setDeptList(selected ? selected.departments : []);
    setForm12((f) => ({ ...f, group: gdId, department: "" }));
  };

  const validate12 = () => {
    const errs = { rows: {} };
    if (isEmpty(form12.siriRefType))
      errs.siriRefType = "SIRI Reference Type is required.";
    if (isEmpty(form12.dataFor)) errs.dataFor = "Data For is required.";
    if (isEmpty(form12.name)) errs.name = "Name is required.";
    return errs;
  };

  const [errors12, setErrors12] = useState({ rows: {} });

  const tabHasError = {
    1: !!(errors12.siriRefType || errors12.dataFor || errors12.name),
    2: false,
  };
  const e12 = errors12;
  const e3 = {};

  const handleSubmit = async () => {
    setSaving(true);
    const validationErrors = validate12();
    if (
      validationErrors.siriRefType ||
      validationErrors.dataFor ||
      validationErrors.name ||
      validationErrors.dateTimeProvided
    ) {
      setErrors12(validationErrors);
      setActiveTab(1);
      setSaving(false);
      return;
    }
    setErrors12({ rows: {} }); // clear errors on success

    const formatDate = (d) => {
      if (!d) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt.toISOString().split("T")[0];
    };
    const formatTime = (t) => {
      if (!t) return null;
      if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
      if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
      return null;
    };
    const formatDateTime = (dt) => {
      if (!dt) return null;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dt))
        return dt.replace("T", " ");
      const d = new Date(dt);
      return isNaN(d.getTime())
        ? null
        : d.toISOString().replace("T", " ").substring(0, 19);
    };

    const formattedParticipants = form12.participants
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
      (g) => String(g.gd_id) === String(form12.group),
    );
    const selectedDept = deptList.find(
      (d) => String(d.id) === String(form12.department),
    );

    const payload = {
      siriRefType: form12.siriRefType,
      dataFor: form12.dataFor,
      workRelated: "not_work_related",
      govtNotification: form12.govtNotification,
      subtypes: form12.subtypes.join(","),
      employer: form12.employer,
      name: form12.name,
      chapaNo: form12.chapaNo,
      jobDesignation: form12.jobDesignation,
      dateOfEvent: formatDate(form12.dateOfEvent),
      timeOfEvent: formatTime(form12.timeOfEvent),
      shift: form12.shift,
      dateReported: formatDate(form12.dateReported),
      timeReported: formatTime(form12.timeReported),
      location: form12.location,
      specificLocation: form12.specificLocation,
      level: form12.level,
      reportedBy: form12.reportedBy,
      reportedTo: form12.reportedTo,
      group: selectedGroup?.group || "",
      department: selectedDept?.department || "",
      section: form12.section,
      dateHired: formatDate(form12.dateHired),
      dateOfBirth: formatDate(form12.dateOfBirth),
      age: form12.age,
      homeAddress: form12.homeAddress,
      status: form12.status,
      noOfDependents: form12.noOfDependents,
      lengthOfService: form12.lengthOfService,
      experienceAtOccupation: form12.experienceAtOccupation,
      workingAreas: form12.workingAreas.join(","),
      othersArea: form12.othersArea,
      incidentDescription: form12.incidentDescription,
      immediateActions: form12.immediateActions,
      participants: formattedParticipants,
      preparedBy: empInfo.user_name,
      preparedDateTime: formatDateTime(form12.preparedByDateTime),
      recurrentInjury: form3.recurrentInjury,
      dateTimeProvided: formatDateTime(form3.dateTimeProvided),
      extentOfDisability: form3.extentOfDisability.join(","),
      natureOfInjury: form3.natureOfInjury.join(","),
      natureOfInjuryOther: form3.natureOfInjuryOther,
      mechanismOfInjury: form3.mechanismOfInjury.join(","),
      mechanismOfInjuryOther: form3.mechanismOfInjuryOther,
      contactExposure: form3.contactExposure.join(","),
      contactExposureOther: form3.contactExposureOther,
      agencyOfInjury: form3.agencyOfInjury.join(","),
      agencyOfInjuryOther: form3.agencyOfInjuryOther,
      partsBodyInjured: form3.partsBodyInjured.join(","),
      partsBodyInjuredOther: form3.partsBodyInjuredOther,
      medicalDiagnosis: form3.medicalDiagnosis,
      vitalsTemperature: form3.vitals.temperature,
      vitalsBloodPressure: form3.vitals.bloodPressure,
      vitalsPulseRate: form3.vitals.pulseRate,
      vitalsBloodAlcohol: form3.vitals.bloodAlcohol,
      rehabilitationPlan: form3.rehabilitationPlan.join(","),
      rehabLightWorkDays: form3.rehabLightWorkDays,
      rehabFurtherEval: form3.rehabFurtherEval,
      detailsOfTreatment: form3.detailsOfTreatment,
      attendingPhysician: empInfo.user_name,
      section3DateTime: formatDateTime(form3.dateTime),
      created_by: empInfo.user_name,
      created_by_position: empInfo.emp_position,
    };

    try {
      // NOTE: this form now posts to its own dedicated endpoint —
      // it does NOT reuse /accident/add-report or /accident/add-section3-report.
      await axios.post(
        `${config.baseApi}/accident/add-report-combined`,
        payload,
      );
      notify.success("SUCCESS", "Report saved successfully.");
      participantIdCounter = 1;
      setForm12(makeSection12());
      setForm3(makeSection3());
      setActiveTab(1);

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Save error:", err);
      notify.error(
        "SAVE FAILED",
        err.response?.data?.details ||
          "Something went wrong. Please try again.",
      );
    }
  };

  const handleReset = () => {
    participantIdCounter = 1;
    setForm12(makeSection12());
    setForm3(makeSection3());
    setActiveTab(1);
  };

  if (saving) return <LoadingSpinner label="Fetching data" />;

  return (
    <div className="add-shell">
      <style>{STYLES}</style>

      {/* ── TOP BAR ── */}
      <header className="add-topbar">
        <div className="add-topbar-left">
          <button
            className="add-back-btn"
            onClick={() => window.history.back()}
          >
            ← Back
          </button>
          <div className="add-topbar-divider" />
          <div>
            <span className="add-topbar-title">SAIRI</span>
            <span className="add-topbar-sub">
              Safety Accident / Incident Report and Investigation Form
            </span>
          </div>
        </div>
        <div className="add-topbar-right">
          <button
            className="add-btn add-btn--ghost"
            onClick={handleReset}
            disabled={saving}
          >
            Clear
          </button>
          <button
            className="add-btn add-btn--primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Report"}
          </button>
        </div>
      </header>

      {/* ── TAB STRIP ── */}
      <nav className="add-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`add-tab${activeTab === tab.id ? " add-tab--active" : ""}${tabHasError[tab.id] ? " add-tab--error" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="add-tab-num">
              {tabHasError[tab.id] ? "!" : tab.id}
            </span>
            <span className="add-tab-label">{tab.short}</span>
          </button>
        ))}
        <div className="add-tabs-note">
          General Info — reporting person / supervisor &nbsp;·&nbsp; Medical
          Eval. — Company Doctor / Nurse
        </div>
      </nav>

      {/* ── SECTION HEADER ── */}
      <div className="add-page-head">
        <div className="add-section-code">{TABS[activeTab - 1].code}</div>
        <h1 className="add-section-title">{TABS[activeTab - 1].label}</h1>
      </div>

      {/* ── MAIN ── */}
      <main className="add-main">
        {activeTab === 1 && (
          <GeneralInfoTab
            form={form12}
            setForm={setForm12}
            errors={e12}
            groupList={groupList}
            deptList={deptList}
            onGroupChange={handleGroupChange}
            displayName={displayName}
          />
        )}

        {activeTab === 2 && (
          <MedicalEvalTab
            form={form3}
            setForm={setForm3}
            errors={e3}
            displayName={displayName}
          />
        )}

        {/* ── BOTTOM NAV ── */}
        <div className="add-tab-nav">
          <button
            className="add-btn add-btn--ghost-dark"
            onClick={() => setActiveTab((t) => Math.max(1, t - 1))}
            disabled={activeTab === 1}
          >
            ← Previous
          </button>
          <span className="add-tab-nav-label">
            {activeTab} / {TABS.length}
          </span>
          {activeTab < TABS.length ? (
            <button
              className="add-btn add-btn--primary"
              onClick={() => setActiveTab((t) => t + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              className="add-btn add-btn--primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Report"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --add-ink:          #0D1B2A;
  --add-ink-soft:     #2C4A3E;
  --add-muted:        #5E7A6E;
  --add-paper:        #FFFFFF;
  --add-paper-alt:    #F0F4F2;
  --add-line:         #C8D8D1;
  --add-line-strong:  #9DBCB0;
  --add-green:        #1B5E44;
  --add-green-deep:   #0F3D2B;
  --add-green-soft:   #D4EDE5;
  --add-accent:       #1B8C60;
  --add-danger:       #B02020;
  --add-danger-soft:  #FAE8E8;
  --font-body:    'Inter', sans-serif;
  --font-display: 'Barlow Condensed', sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;
}

*, *::before, *::after { box-sizing: border-box; }

.add-shell {
  min-height: 100vh; background: var(--add-paper-alt);
  font-family: var(--font-body); color: var(--add-ink);
  display: flex; flex-direction: column;
}

/* ── Top bar ── */
.add-topbar {
  background: #0D1B2A; display: flex; align-items: center;
  justify-content: space-between; padding: 12px 32px;
  position: sticky; top: 0; z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.add-topbar-left  { display: flex; align-items: center; gap: 16px; }
.add-topbar-right { display: flex; align-items: center; gap: 10px; }
.add-topbar-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.1); }
.add-topbar-title { font-family: var(--font-display); font-weight: 700; font-size: 18px; color: #E8F4EF; letter-spacing: 0.05em; display: block; }
.add-topbar-sub   { font-size: 10px; color: #4A6B84; text-transform: uppercase; letter-spacing: 0.08em; display: block; }
.add-back-btn {
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: #8AA4B8; padding: 6px 14px; border-radius: 6px;
  font-size: 12px; font-family: var(--font-body); cursor: pointer;
  transition: border-color .15s, color .15s;
}
.add-back-btn:hover { border-color: rgba(255,255,255,.3); color: #fff; }

/* ── Tab strip ── */
.add-tabs {
  background: #0D1B2A; display: flex; align-items: center;
  padding: 0 32px; overflow-x: auto; scrollbar-width: none;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.add-tabs::-webkit-scrollbar { display: none; }
.add-tab {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 22px;
  border: none; border-bottom: 2px solid transparent;
  background: transparent; cursor: pointer; white-space: nowrap;
  color: #4A6B84; font-family: var(--font-body); font-size: 13px;
  font-weight: 500;
  transition: color 0.15s, border-color 0.15s;
}
.add-tab:hover { color: #8AA4B8; }
.add-tab--active { color: #E8F4EF; border-bottom-color: var(--add-accent); }
.add-tab--error  { color: #E07070; }
.add-tab--error.add-tab--active { border-bottom-color: var(--add-danger); }
.add-tab-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-family: var(--font-mono); flex-shrink: 0;
}
.add-tab--active .add-tab-num { background: var(--add-accent); color: #fff; }
.add-tab--error  .add-tab-num { background: var(--add-danger); color: #fff; }
.add-tabs-note {
  margin-left: auto; font-size: 10px; color: #4A6B84;
  font-style: italic; white-space: nowrap; padding-left: 20px;
}

/* ── Page heading ── */
.add-page-head {
  padding: 24px 40px 14px;
  border-bottom: 2px solid var(--add-line);
  margin-bottom: 24px;
}
.add-section-code { font-family: var(--font-mono); font-size: 11px; color: var(--add-green); letter-spacing: .1em; margin-bottom: 4px; }
.add-section-title { font-family: var(--font-display); font-weight: 700; font-size: 30px; margin: 0; color: var(--add-ink); }

/* ── Main ── */
.add-main { flex: 1; padding: 0 40px 100px; display: flex; flex-direction: column; gap: 18px; }
.add-stack { display: flex; flex-direction: column; gap: 18px; }

/* ── Error banner ── */
.add-banner {
  background: var(--add-danger-soft); border: 1px solid var(--add-danger);
  color: #7A1F1F; font-size: 13px; font-weight: 600;
  padding: 10px 14px; border-radius: 6px;
}

/* ── Plate ── */
.add-plate {
  display: flex; align-items: baseline; gap: 12px;
  background: var(--add-ink); color: #fff;
  border-left: 5px solid var(--add-accent);
  padding: 10px 18px; border-radius: 5px;
}
.add-plate-code  { font-family: var(--font-mono); font-size: 11px; color: var(--add-accent); letter-spacing: 0.08em; }
.add-plate-title { font-family: var(--font-display); font-weight: 600; font-size: 19px; }
.add-plate-note  { font-size: 12px; color: #6A8FA8; font-style: italic; margin-left: auto; }

/* ── Panel ── */
.add-panel { background: var(--add-paper); border: 1px solid var(--add-line); border-radius: 8px; padding: 18px 20px; }
.add-panel-title {
  font-family: var(--font-display); font-weight: 600; font-size: 15px;
  color: var(--add-ink-soft); text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--add-line);
  display: flex; align-items: center; justify-content: space-between;
}
.add-panel-body { display: flex; flex-direction: column; gap: 12px; }
.add-help { font-size: 12px; color: var(--add-muted); font-style: italic; margin: 0; }

/* ── Grid ── */
.add-grid { display: grid; gap: 16px; }
.add-grid--2 { grid-template-columns: repeat(2, 1fr); }
.add-grid--3 { grid-template-columns: repeat(3, 1fr); }

/* ── Field ── */
.add-field { display: flex; flex-direction: column; gap: 5px; }
.add-label { font-size: 11.5px; font-weight: 600; color: var(--add-ink-soft); text-transform: uppercase; letter-spacing: 0.04em; }
.add-req   { color: var(--add-danger); margin-left: 3px; }
.add-hint  { font-size: 11px; color: var(--add-muted); font-style: italic; }
.add-err   { color: var(--add-danger); font-size: 11px; font-weight: 600; margin-top: 2px; }

/* ── Input / Textarea / Select ── */
.add-input, .add-textarea {
  font-family: var(--font-body); font-size: 13.5px; color: var(--add-ink);
  background: var(--add-paper-alt); border: 1.5px solid var(--add-line-strong);
  border-radius: 5px; padding: 8px 10px; outline: none; width: 100%;
  transition: border-color .15s, box-shadow .15s;
}
.add-input:focus, .add-textarea:focus {
  border-color: var(--add-green); box-shadow: 0 0 0 3px rgba(27,94,68,.15); background: #fff;
}
.add-input--err { border-color: var(--add-danger); background: var(--add-danger-soft); }
.add-input:disabled { opacity: .4; cursor: not-allowed; }
.add-textarea { resize: vertical; }
.add-select { cursor: pointer; }

/* ── Checkbox ── */
.add-check { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; cursor: pointer; color: var(--add-ink-soft); line-height: 1.4; }
.add-check input { display: none; }
.add-check-box {
  width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px;
  border: 1.5px solid var(--add-line-strong); border-radius: 3px;
  background: #fff; position: relative; transition: all .12s;
}
.add-check input:checked + .add-check-box { background: var(--add-green); border-color: var(--add-green-deep); }
.add-check input:checked + .add-check-box::after {
  content: ''; position: absolute; left: 4px; top: 1px;
  width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0;
  transform: rotate(40deg);
}
.add-check--disabled { opacity: .5; cursor: not-allowed; pointer-events: none; }
.add-check-label { flex: 1; }

/* ── Radio ── */
.add-radio { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: var(--add-ink-soft); }
.add-radio input { display: none; }
.add-radio-dot { width: 15px; height: 15px; flex-shrink: 0; border: 1.5px solid var(--add-line-strong); border-radius: 50%; position: relative; }
.add-radio input:checked + .add-radio-dot { border-color: var(--add-green-deep); }
.add-radio input:checked + .add-radio-dot::after { content: ''; position: absolute; inset: 3px; background: var(--add-green); border-radius: 50%; }
.add-radio-label { font-weight: 500; color: var(--add-ink); }
.add-radio-row { display: flex; gap: 20px; flex-wrap: wrap; }

/* ── Check layouts ── */
.add-check-row { display: flex; flex-wrap: wrap; gap: 10px 20px; }
.add-check-col { display: flex; flex-direction: column; gap: 8px; }
.add-check-grid-2col { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px 16px; margin-bottom: 10px; }

/* ── Other input ── */
.add-other { display: flex; flex-direction: column; gap: 5px; }
.add-other-input {
  border: none; border-bottom: 1.5px solid var(--add-line-strong);
  background: transparent; font-size: 13px; padding: 3px 2px;
  outline: none; color: var(--add-ink); font-family: var(--font-body);
  transition: border-color .15s;
}
.add-other-input:focus { border-color: var(--add-green); }
.add-other-input:disabled { opacity: .4; cursor: not-allowed; }

/* ── Working area grid ── */
.add-area-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }

/* ── Vitals ── */
.add-vitals { margin-top: 14px; border: 1px solid var(--add-line); border-radius: 6px; overflow: hidden; }
.add-vitals-head { background: #0D1B2A; color: var(--add-accent); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; text-align: center; padding: 7px; }
.add-vitals-row { display: grid; grid-template-columns: 1fr 1fr; align-items: start; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--add-line); }
.add-vitals-label { font-size: 12px; color: var(--add-ink-soft); font-weight: 500; padding-top: 10px; }

/* ── Rehabilitation ── */
.add-rehab-sub { background: var(--add-paper-alt); border-radius: 6px; padding: 10px 12px; margin: 4px 0; display: flex; flex-direction: column; gap: 6px; }
.add-inline-field { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--add-ink-soft); }
.add-inline-field .add-input { max-width: 90px; }

/* ── Participant cards ── */
.add-action-list { display: flex; flex-direction: column; gap: 14px; }
.add-action-card {
  background: var(--add-paper); border: 1px solid var(--add-line);
  border-left: 4px solid var(--add-green);
  border-radius: 8px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 12px;
}
.add-action-head { display: flex; align-items: center; justify-content: space-between; }
.add-action-num { font-family: var(--font-mono); font-size: 11px; color: var(--add-green); letter-spacing: 0.08em; }
.add-action-remove {
  background: none; border: 1px solid var(--add-danger);
  color: var(--add-danger); font-size: 11px; padding: 3px 10px;
  border-radius: 4px; cursor: pointer;
}
.add-action-remove:disabled { opacity: 0.35; cursor: not-allowed; }

/* ── Buttons ── */
.add-btn {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
  padding: 9px 20px; border-radius: 6px; cursor: pointer; border: 1.5px solid transparent;
  transition: background .15s, border-color .15s, color .15s;
}
.add-btn:disabled { opacity: .45; cursor: not-allowed; }
.add-btn--primary { background: var(--add-green); color: #fff; border-color: var(--add-green-deep); }
.add-btn--primary:hover:not(:disabled) { background: var(--add-green-deep); }
.add-btn--ghost { background: rgba(255,255,255,.06); color: #8AA4B8; border-color: rgba(255,255,255,.15); }
.add-btn--ghost:hover:not(:disabled) { border-color: rgba(255,255,255,.3); color: #fff; }
.add-btn--ghost-dark { background: transparent; color: var(--add-muted); border-color: var(--add-line-strong); }
.add-btn--ghost-dark:hover:not(:disabled) { border-color: var(--add-green); color: var(--add-green); }

/* ── Bottom tab nav ── */
.add-tab-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 0 4px; border-top: 1px solid var(--add-line); margin-top: 8px;
}
.add-tab-nav-label { font-family: var(--font-mono); font-size: 12px; color: var(--add-muted); }

/* ── Responsive ── */
@media (max-width: 1000px) { .add-area-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px) {
  .add-topbar { padding: 10px 16px; flex-wrap: wrap; gap: 10px; }
  .add-tabs { padding: 0 16px; }
  .add-tabs-note { display: none; }
  .add-page-head { padding: 18px 16px 12px; }
  .add-main { padding: 0 16px 80px; }
  .add-grid--3 { grid-template-columns: repeat(2, 1fr); }
  .add-area-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .add-grid--2, .add-grid--3 { grid-template-columns: 1fr; }
  .add-check-grid-2col { grid-template-columns: 1fr; }
  .add-vitals-row { grid-template-columns: 1fr; }
  .add-section-title { font-size: 24px; }
  .add-area-grid { grid-template-columns: repeat(2, 1fr); }
}
`;
