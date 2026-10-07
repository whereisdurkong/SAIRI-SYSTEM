import { useEffect, useState } from "react";

const WORKING_AREAS_COL1 = ["Breast Hole", "Cuddy", "Chute", "Change Room", "Compressor"];
const WORKING_AREAS_COL2 = ["Development", "Hoist Room", "Mainline", "Magazine (Bodega)", "Mill Area"];
const WORKING_AREAS_COL3 = ["Office", "Raise", "Rock Drill Machine (RDM) Repair Shop", "Shaft Station", "Sill Out"];
const WORKING_AREAS_COL4 = ["Tailings Storage Facility (TSF)", "Washing Bay", "Warehouse"];

const ACCIDENT_SUBTYPES = ["Injury", "Illnesses", "Near Miss", "Property Damage", "Environmental", "Fire/Explosion", "Vehicle Incident"];
const INVOLVEMENT_TYPES = ["Witness", "Injured Person", "First Responder", "Supervisor", "Other"];

let participantIdCounter = 1;
const makeParticipant = (p = {}) => ({
    id: participantIdCounter++,
    name: p.name || "",
    department: p.department || "",
    involvementType: p.involvementType || "",
});

const toTimeInputValue = (val) => {
    if (!val) return "";
    const str = String(val).trim();

    // Already HH:MM or HH:MM:SS
    const plainTimeMatch = str.match(/^(\d{2}):(\d{2})(:\d{2})?/);
    if (plainTimeMatch && !str.includes("T") && str.length <= 12) {
        return `${plainTimeMatch[1]}:${plainTimeMatch[2]}`;
    }

    // Full ISO datetime, e.g. "1970-01-01T14:30:00.000Z" or "2025-08-07 14:30:00"
    const isoMatch = str.match(/T(\d{2}):(\d{2})/) || str.match(/\s(\d{2}):(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;

    // Fallback: try Date parsing
    try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            return `${hh}:${mm}`;
        }
    } catch { /* noop */ }

    return "";
};
function Req() { return <span className="sr-req">＊</span>; }

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
                    {label}{required && <Req />}
                </span>
            )}
            {children}
            {hint && <span className="sr-hint">{hint}</span>}
            <ErrorText msg={error} />
        </label>
    );
}

function TextInput({ error, ...props }) {
    return <input className={`sr-input${error ? " sr-input--err" : ""}`} {...props} />;
}

function TextArea({ error, ...props }) {
    return <textarea className={`sr-textarea${error ? " sr-input--err" : ""}`} {...props} />;
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

function Radio({ checked, onChange, name, label, desc }) {
    return (
        <label className={`sr-radio${desc ? " sr-radio--desc" : ""}`}>
            <input type="radio" name={name} checked={checked} onChange={onChange} />
            <span className="sr-radio-dot" />
            <span className="sr-radio-text">
                <span className="sr-radio-label">{label}</span>
                {desc && <span className="sr-radio-desc">{desc}</span>}
            </span>
        </label>
    );
}

function OtherInput({ checked, onToggle, value, onChange, error, label = "Other" }) {
    return (
        <div className="sr-other">
            <Check checked={checked} onChange={onToggle} label={`${label}:`} />
            <input className={`sr-other-input${error ? " sr-input--err" : ""}`} value={value} onChange={onChange} />
            <ErrorText msg={error} />
        </div>
    );
}


const parseArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return value.split(',').filter(v => v.trim());
        }
    }
    return [];
};


const getWorkingAreas = (data) => {
    const allWorkingAreas = [...WORKING_AREAS_COL1, ...WORKING_AREAS_COL2, ...WORKING_AREAS_COL3, ...WORKING_AREAS_COL4];
    if (typeof data?.working_area === 'string' && data.working_area.trim()) {
        const value = data.working_area.trim();
        if (allWorkingAreas.includes(value)) return { matched: [value], other: null };
        return { matched: [], other: value };
    }
    const parsed = parseArray(data?.workingAreas);
    if (parsed.length > 0) {
        const matched = [];
        let other = null;
        parsed.forEach(val => {
            if (allWorkingAreas.includes(val)) matched.push(val);
            else other = val;
        });
        return { matched, other };
    }
    return { matched: [], other: null };
};

// Builds an editable form1 object out of the fetched (read-only) section1Data row
function makeSection1(d) {
    if (!d) return null;

    const { matched: matchedWorkingAreas, other: otherWorkingArea } = getWorkingAreas(d);

    let subtypes = [];
    try {
        const raw = d.subtypes ?? d.accident_incident_subtype;
        if (typeof raw === 'string') subtypes = raw.split(',').map(s => s.trim()).filter(Boolean);
        else if (Array.isArray(raw)) subtypes = raw.map(s => String(s).trim()).filter(Boolean);
    } catch { subtypes = []; }

    let participants = [];
    try {
        if (typeof d.participants === 'string') participants = JSON.parse(d.participants);
        else if (Array.isArray(d.participants)) participants = d.participants;
    } catch { participants = []; }

    return {
        goverment_notification_required: d.goverment_notification_required === true ? "YES" : (d.goverment_notification_required === false ? "NO" : ""),
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
        incident_accident_brief_description: d.incident_accident_brief_description || "",
        immediate_actions_taken: d.immediate_actions_taken || "",
        participants: participants.map(p => makeParticipant(p)),
        prepared_by: d.prepared_by || "",
        date_and_time: d.date_and_time ? String(d.date_and_time).slice(0, 16) : "",
    };
}



export default function Section1({ form, setForm, errors }) {
    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
    const toggle = (field, value) =>
        setForm(f => ({ ...f, [field]: f[field].includes(value) ? f[field].filter(v => v !== value) : [...f[field], value] }));
    const toggleArea = (area) => toggle("workingAreas", area);
    const setParticipant = (id, field, value) =>
        setForm(f => ({ ...f, participants: f.participants.map(p => (p.id === id ? { ...p, [field]: value } : p)) }));
    const addParticipant = () => setForm(f => ({ ...f, participants: [...f.participants, makeParticipant()] }));
    const removeParticipant = (id) => setForm(f => ({ ...f, participants: f.participants.filter(p => p.id !== id) }));

    const allAreas = [
        ["Zone A", WORKING_AREAS_COL1], ["Zone B", WORKING_AREAS_COL2],
        ["Zone C", WORKING_AREAS_COL3], ["Zone D", WORKING_AREAS_COL4],
    ];

    return (
        <div className="sr-stack">
            <div className="sr-notice">
                To be completed by the person reporting the occurrence or immediate supervisor of the department involved.
                Sections 1 &amp; 2 (general information and participants) must reach the relevant department heads within the shift;
                the remaining sections are completed within 24 hours.
            </div>

            <Plate code="SECTION.01" title="General Information" />

            <Panel>
                <div className="sr-grid sr-grid--2">
                    <Field label="Government Notification Required" required error={errors.goverment_notification_required}>
                        <div className="sr-radio-row">
                            <Radio name="govNotif" label="Yes" checked={form.goverment_notification_required === "YES"} onChange={() => set("goverment_notification_required", "YES")} />
                            <Radio name="govNotif" label="No" checked={form.goverment_notification_required === "NO"} onChange={() => set("goverment_notification_required", "NO")} />
                        </div>
                    </Field>
                    <Field label="Employer" required error={errors.employer}>
                        <TextInput value={form.employer} onChange={e => set("employer", e.target.value)} error={errors.employer} />
                    </Field>
                </div>
            </Panel>

            <Panel title="Accident / Incident Subtype ＊" error={errors.accident_incident_subtype}>
                <div className="sr-check-grid">
                    {ACCIDENT_SUBTYPES.map(v => (
                        <Check key={v} checked={form.accident_incident_subtype.includes(v)} onChange={() => toggle("accident_incident_subtype", v)} label={v} />
                    ))}
                </div>

            </Panel>

            <Panel>
                <div className="sr-grid sr-grid--3">
                    <Field label="Name" required error={errors.name}>
                        <TextInput value={form.name} onChange={e => set("name", e.target.value)} error={errors.name} />
                    </Field>
                    <Field label="Chapa No." required error={errors.chapa_number}>
                        <TextInput value={form.chapa_number} onChange={e => set("chapa_number", e.target.value)} error={errors.chapa_number} />
                    </Field>
                    <Field label="Job Designation" required error={errors.job_designation}>
                        <TextInput value={form.job_designation} onChange={e => set("job_designation", e.target.value)} error={errors.job_designation} />
                    </Field>
                    <Field label="Date of Event" required error={errors.date_of_event}>
                        <TextInput type="date" value={form.date_of_event} onChange={e => set("date_of_event", e.target.value)} error={errors.date_of_event} />
                    </Field>
                    <Field label="Time of Event" required error={errors.time_of_event}>
                        <TextInput type="time" value={toTimeInputValue(form.time_of_event)} onChange={e => set("time_of_event", e.target.value)} error={errors.time_of_event} />
                    </Field>
                    <Field label="Shift" required error={errors.shift}>
                        <TextInput value={form.shift} onChange={e => set("shift", e.target.value)} error={errors.shift} />
                    </Field>
                    <Field label="Date Reported" required error={errors.date_reported}>
                        <TextInput type="date" value={form.date_reported} onChange={e => set("date_reported", e.target.value)} error={errors.date_reported} />
                    </Field>
                    <Field label="Time Reported" required error={errors.time_reported}>
                        <TextInput type="time" value={toTimeInputValue(form.time_reported)} onChange={e => set("time_reported", e.target.value)} error={errors.time_reported} />
                    </Field>
                </div>
            </Panel>

            <Panel>
                <div className="sr-grid sr-grid--3">
                    <Field label="Location" required error={errors.location}>
                        <TextInput value={form.location} onChange={e => set("location", e.target.value)} error={errors.location} />
                    </Field>
                    <Field label="Specific Location" required error={errors.specific_location}>
                        <TextInput value={form.specific_location} onChange={e => set("specific_location", e.target.value)} error={errors.specific_location} />
                    </Field>
                    <Field label="Level" required error={errors.level}>
                        <TextInput value={form.level} onChange={e => set("level", e.target.value)} error={errors.level} />
                    </Field>
                    <Field label="Reported By" required error={errors.reported_by}>
                        <TextInput value={form.reported_by} onChange={e => set("reported_by", e.target.value)} error={errors.reported_by} />
                    </Field>
                    <Field label="Supervisor Reported To" required error={errors.supervisor_reported_to}>
                        <TextInput value={form.supervisor_reported_to} onChange={e => set("supervisor_reported_to", e.target.value)} error={errors.supervisor_reported_to} />
                    </Field>
                </div>
            </Panel>

            <Panel>
                <div className="sr-grid sr-grid--3">
                    <Field label="Group" required error={errors.group}>
                        <TextInput value={form.group} onChange={e => set("group", e.target.value)} error={errors.group} />
                    </Field>
                    <Field label="Department" required error={errors.department}>
                        <TextInput value={form.department} onChange={e => set("department", e.target.value)} error={errors.department} />
                    </Field>
                    <Field label="Section" required error={errors.section}>
                        <TextInput value={form.section} onChange={e => set("section", e.target.value)} error={errors.section} />
                    </Field>
                    <Field label="Date Hired" required error={errors.date_hired}>
                        <TextInput type="date" value={form.date_hired} onChange={e => set("date_hired", e.target.value)} error={errors.date_hired} />
                    </Field>
                    <Field label="Date of Birth" required error={errors.date_of_birth}>
                        <TextInput type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} error={errors.date_of_birth} />
                    </Field>
                    <Field label="Age" required error={errors.age}>
                        <TextInput value={form.age} onChange={e => set("age", e.target.value)} error={errors.age} />
                    </Field>
                </div>
            </Panel>

            <Panel>
                <div className="sr-grid sr-grid--3">
                    <Field label="Home Address" required error={errors.home_address}>
                        <TextInput value={form.home_address} onChange={e => set("home_address", e.target.value)} error={errors.home_address} />
                    </Field>
                    <Field label="Status" required error={errors.status}>
                        <TextInput value={form.status} onChange={e => set("status", e.target.value)} error={errors.status} />
                    </Field>
                    <Field label="No. of Dependents" required error={errors.number_of_dependents}>
                        <TextInput value={form.number_of_dependents} onChange={e => set("number_of_dependents", e.target.value)} error={errors.number_of_dependents} />
                    </Field>
                    <Field label="Length of Service" required error={errors.length_of_service}>
                        <TextInput value={form.length_of_service} onChange={e => set("length_of_service", e.target.value)} error={errors.length_of_service} />
                    </Field>
                    <Field label="Experience at Occupation" required error={errors.expereince_at_occupation}>
                        <TextInput value={form.expereince_at_occupation} onChange={e => set("expereince_at_occupation", e.target.value)} error={errors.expereince_at_occupation} />
                    </Field>
                </div>
            </Panel>

            <Panel title="Working Area ＊" error={errors.workingAreas}>
                <div className="sr-area-grid">
                    {allAreas.map(([zone, areas]) => (
                        <div key={zone} className="sr-area-col">
                            {/* <span className="sr-area-zone">{zone}</span> */}
                            {areas.map(a => (
                                <Check key={a} checked={form.workingAreas.includes(a)} onChange={() => toggleArea(a)} label={a} />
                            ))}
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: "14px" }}>
                    <OtherInput
                        checked={form.othersAreaChecked}
                        onToggle={() => set("othersAreaChecked", !form.othersAreaChecked)}
                        value={form.others_area}
                        onChange={e => set("others_area", e.target.value)}
                        error={errors.others_area}
                    />
                </div>
            </Panel>

            <Panel title="Incident / Accident Brief Description ＊" error={errors.incident_accident_brief_description} hint='"Kasano iti panakapasamak ti aksidente/insidente?"'>
                <TextArea rows={5} value={form.incident_accident_brief_description} onChange={e => set("incident_accident_brief_description", e.target.value)} error={errors.incident_accident_brief_description} />
            </Panel>

            <Panel title="Immediate Actions Taken ＊" error={errors.immediate_actions_taken} hint='"Anya dagiti wagas nga inaramid mo idi kalpasan ti aksidente/insidente?"'>
                <TextArea rows={5} value={form.immediate_actions_taken} onChange={e => set("immediate_actions_taken", e.target.value)} error={errors.immediate_actions_taken} />
            </Panel>

            <Plate code="SECTION.02" title="Participants" />
            <Panel>
                <p className="sr-help">Any other people involved in, or witness to, the incident.</p>
                <div className="sr-action-list">
                    {form.participants.map((p) => {
                        const rowErr = errors.participants[p.id] || {};
                        return (
                            <div className="sr-action-card" key={p.id}>
                                <div className="sr-action-head">
                                    <span className="sr-action-num">PARTICIPANT</span>
                                    <button type="button" className="sr-action-remove" onClick={() => removeParticipant(p.id)}>Remove</button>
                                </div>
                                <div className="sr-grid sr-grid--3">
                                    <Field label="Name" required error={rowErr.name}>
                                        <TextInput value={p.name} onChange={e => setParticipant(p.id, "name", e.target.value)} error={rowErr.name} />
                                    </Field>
                                    <Field label="Department" required error={rowErr.department}>
                                        <TextInput value={p.department} onChange={e => setParticipant(p.id, "department", e.target.value)} error={rowErr.department} />
                                    </Field>
                                    <Field label="Involvement Type" required error={rowErr.involvementType}>
                                        <select className={`sr-input${rowErr.involvementType ? " sr-input--err" : ""}`} value={p.involvementType} onChange={e => setParticipant(p.id, "involvementType", e.target.value)}>
                                            <option value="">Select…</option>
                                            {INVOLVEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </Field>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button type="button" className="sr-btn sr-btn--ghost1" style={{ marginTop: "12px" }} onClick={addParticipant}>+ Add Participant</button>
            </Panel>

            <Panel title="Prepared By">
                <div className="sr-grid sr-grid--2">
                    <Field label="Prepared By" required error={errors.prepared_by}>
                        <TextInput value={form.prepared_by} onChange={e => set("prepared_by", e.target.value)} error={errors.prepared_by} />
                    </Field>
                    <Field label="Date & Time" required error={errors.date_and_time}>
                        <TextInput type="datetime-local" value={form.date_and_time} onChange={e => set("date_and_time", e.target.value)} error={errors.date_and_time} />
                    </Field>
                </div>
                <div className="sr-hint" style={{ marginTop: "8px" }}>Role: Safety Officer &amp; Immediate Supervisor on Duty</div>
            </Panel>
        </div>
    );
}